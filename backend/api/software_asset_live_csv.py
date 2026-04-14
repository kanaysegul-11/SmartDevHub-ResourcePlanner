import csv
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.contrib.auth.models import User
from django.utils import timezone

from .models import SoftwareAsset, SoftwareAssetAuditLog
from .serializers import SoftwareAssetSerializer


LIVE_LICENSE_CSV_HEADERS = [
    "asset_id",
    "name",
    "vendor",
    "plan_name",
    "record_type",
    "provider_code",
    "operational_status",
    "billing_cycle",
    "purchase_price",
    "currency",
    "purchase_date",
    "renewal_date",
    "auto_renew",
    "assigned_user",
    "account_email",
    "billing_email",
    "department",
    "cost_center",
    "notes",
    "external_id",
    "external_workspace_id",
]


@dataclass
class LiveCsvFileResult:
    source_file: str
    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    archived_count: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass
class LiveCsvSyncSummary:
    results: list[LiveCsvFileResult] = field(default_factory=list)

    @property
    def created_count(self):
        return sum(result.created_count for result in self.results)

    @property
    def updated_count(self):
        return sum(result.updated_count for result in self.results)

    @property
    def skipped_count(self):
        return sum(result.skipped_count for result in self.results)

    @property
    def archived_count(self):
        return sum(result.archived_count for result in self.results)

    @property
    def error_count(self):
        return sum(len(result.errors) for result in self.results)


def normalize_asset_identity_value(value):
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, str):
        return " ".join(value.strip().lower().split())
    return str(value).strip().lower()


def get_active_assigned_user_id(asset):
    return (
        asset.assignments.filter(is_active=True)
        .values_list("user_id", flat=True)
        .first()
    )


def build_asset_identity_signature(*, asset=None, data=None):
    if asset is None and data is None:
        return None

    source = data or {}
    license_mode = source.get("license_mode") if data is not None else asset.license_mode
    provider_code = source.get("provider_code") if data is not None else asset.provider_code
    external_id = normalize_asset_identity_value(
        source.get("external_id") if data is not None else asset.external_id
    )
    external_workspace_id = normalize_asset_identity_value(
        source.get("external_workspace_id") if data is not None else asset.external_workspace_id
    )

    if license_mode == "assigned":
        assigned_user_id = (
            int(source.get("assigned_user_id"))
            if data is not None and source.get("assigned_user_id") not in (None, "")
            else (get_active_assigned_user_id(asset) if asset is not None else None)
        )
        assignment_scope = ("assigned", int(assigned_user_id or 0))
    else:
        if data is not None:
            shared_user_ids = sorted(int(user_id) for user_id in (source.get("shared_user_ids") or []))
        else:
            shared_user_ids = sorted(
                asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
            )
        assignment_scope = ("shared", tuple(shared_user_ids))

    if external_id or external_workspace_id:
        return (
            "external",
            normalize_asset_identity_value(provider_code),
            normalize_asset_identity_value(license_mode),
            external_workspace_id,
            external_id,
            assignment_scope,
        )

    return (
        "product",
        normalize_asset_identity_value(source.get("name") if data is not None else asset.name),
        normalize_asset_identity_value(source.get("vendor") if data is not None else asset.vendor),
        normalize_asset_identity_value(
            source.get("plan_name") if data is not None else asset.plan_name
        ),
        normalize_asset_identity_value(
            source.get("record_type") if data is not None else asset.record_type
        ),
        normalize_asset_identity_value(license_mode),
        normalize_asset_identity_value(provider_code),
        assignment_scope,
    )


def resolve_user_reference(value, *, fallback_user=None):
    raw = str(value or "").strip()
    if not raw:
        return fallback_user

    if raw.isdigit():
        user = User.objects.filter(id=int(raw)).first()
        if user:
            return user

    user = User.objects.filter(username__iexact=raw).first()
    if user:
        return user

    return User.objects.filter(email__iexact=raw).first() or fallback_user


def parse_csv_decimal(value):
    raw = str(value or "").strip()
    if not raw:
        return None

    compact = raw.replace(" ", "")
    compact = compact.replace("$", "").replace("EUR", "").replace("USD", "").replace("TRY", "").replace("GBP", "")
    compact = compact.strip()
    if not compact:
        return None

    if compact.count(",") == 1 and compact.count(".") > 1:
        compact = compact.replace(".", "").replace(",", ".")
    elif compact.count(",") == 1 and compact.count(".") == 0:
        compact = compact.replace(",", ".")
    elif compact.count(",") > 1 and compact.count(".") == 1:
        compact = compact.replace(",", "")

    try:
        return Decimal(compact)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid purchase_price value: {value}") from exc


def parse_csv_date(value):
    raw = str(value or "").strip()
    if not raw:
        return None

    for date_format in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, date_format).date()
        except ValueError:
            continue

    raise ValueError(f"Invalid date value: {value}")


def parse_csv_bool(value, default=False):
    raw = str(value or "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "evet", "on"}:
        return True
    if raw in {"0", "false", "no", "hayir", "hayır", "off"}:
        return False
    return default


def serialize_csv_value(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def get_live_csv_metadata(asset):
    metadata = asset.extra_metadata or {}
    live_csv = metadata.get("live_csv")
    return live_csv if isinstance(live_csv, dict) else {}


def build_live_csv_metadata(asset, *, source_file, username):
    metadata = dict(asset.extra_metadata or {})
    metadata["live_csv"] = {
        "managed": True,
        "source_file": source_file,
        "username": username,
        "last_synced_at": timezone.now().isoformat(),
    }
    return metadata


def asset_matches_live_csv_scope(asset, *, default_user, source_file):
    live_csv_metadata = get_live_csv_metadata(asset)
    managed_source_file = str(live_csv_metadata.get("source_file") or "").strip()
    if managed_source_file:
        return managed_source_file == source_file

    if default_user is None:
        return False

    return get_active_assigned_user_id(asset) == default_user.id


def log_live_csv_event(*, asset, actor, event_type, message, payload=None):
    SoftwareAssetAuditLog.objects.create(
        asset=asset,
        actor=actor,
        event_type=event_type,
        message=message,
        payload=payload or {},
    )


def serialize_asset_to_live_csv_row(asset):
    assignment = asset.assignments.select_related("user").filter(is_active=True).first()
    return {
        "asset_id": serialize_csv_value(asset.id),
        "name": serialize_csv_value(asset.name),
        "vendor": serialize_csv_value(asset.vendor),
        "plan_name": serialize_csv_value(asset.plan_name),
        "record_type": serialize_csv_value(asset.record_type),
        "provider_code": serialize_csv_value(asset.provider_code),
        "operational_status": serialize_csv_value(asset.operational_status),
        "billing_cycle": serialize_csv_value(asset.billing_cycle),
        "purchase_price": serialize_csv_value(asset.purchase_price),
        "currency": serialize_csv_value(asset.currency),
        "purchase_date": serialize_csv_value(asset.purchase_date),
        "renewal_date": serialize_csv_value(asset.renewal_date),
        "auto_renew": serialize_csv_value(asset.auto_renew),
        "assigned_user": serialize_csv_value(getattr(getattr(assignment, "user", None), "username", "")),
        "account_email": serialize_csv_value(asset.account_email),
        "billing_email": serialize_csv_value(asset.billing_email),
        "department": serialize_csv_value(asset.department),
        "cost_center": serialize_csv_value(asset.cost_center),
        "notes": serialize_csv_value(asset.notes),
        "external_id": serialize_csv_value(asset.external_id),
        "external_workspace_id": serialize_csv_value(asset.external_workspace_id),
    }


def get_default_live_license_directory():
    return Path(__file__).resolve().parents[2] / "sample-data" / "live-licenses"


def build_live_license_csv_filename(username):
    return f"{username}.csv"


def iter_live_license_csv_files(directory):
    return sorted(
        [path for path in Path(directory).glob("*.csv") if path.is_file()],
        key=lambda path: path.name.lower(),
    )


def read_live_license_csv_rows(csv_path):
    rows = []
    if not csv_path.exists():
        return rows

    with csv_path.open("r", encoding="utf-8-sig", newline="") as file_handle:
        reader = csv.DictReader(file_handle)
        for row in reader:
            normalized_row = {str(key or "").strip(): str(value or "").strip() for key, value in row.items()}
            if any(normalized_row.values()):
                rows.append(normalized_row)
    return rows


def write_live_license_csv_rows(csv_path, rows):
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
        writer = csv.DictWriter(file_handle, fieldnames=LIVE_LICENSE_CSV_HEADERS)
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header, "") for header in LIVE_LICENSE_CSV_HEADERS})


def build_live_csv_payload(row, *, default_user):
    assigned_user_value = row.get("assigned_user") or row.get("assigned_user_id")
    assigned_user = resolve_user_reference(assigned_user_value, fallback_user=default_user)
    if not assigned_user:
        raise ValueError("Assigned user could not be resolved.")

    if default_user and assigned_user.id != default_user.id:
        raise ValueError("CSV row points to a different user than its file owner.")

    return {
        "name": row.get("name") or "",
        "vendor": row.get("vendor") or "",
        "plan_name": row.get("plan_name") or "",
        "record_type": row.get("record_type") or "single_user_license",
        "license_mode": "assigned",
        "operational_status": row.get("operational_status") or "active",
        "provider_code": row.get("provider_code") or "manual",
        "record_source": "manual",
        "account_email": row.get("account_email") or assigned_user.email or "",
        "billing_email": row.get("billing_email") or assigned_user.email or "",
        "billing_cycle": row.get("billing_cycle") or "monthly",
        "department": row.get("department") or "",
        "cost_center": row.get("cost_center") or "",
        "purchase_date": parse_csv_date(row.get("purchase_date")),
        "renewal_date": parse_csv_date(row.get("renewal_date")),
        "auto_renew": parse_csv_bool(row.get("auto_renew"), False),
        "purchase_price": parse_csv_decimal(row.get("purchase_price")),
        "currency": row.get("currency") or "USD",
        "vendor_contact": "",
        "support_link": "",
        "documentation_link": "",
        "external_id": row.get("external_id") or "",
        "external_workspace_id": row.get("external_workspace_id") or "",
        "notes": row.get("notes") or "",
        "assigned_user_id": assigned_user.id,
        "shared_user_ids": [],
    }


def sync_live_license_csv_file(csv_path, *, actor=None, base_dir=None):
    csv_path = Path(csv_path)
    base_dir = Path(base_dir or csv_path.parent)
    source_file = csv_path.relative_to(base_dir).as_posix() if csv_path.is_absolute() else csv_path.name
    result = LiveCsvFileResult(source_file=source_file)
    default_user = User.objects.filter(username__iexact=csv_path.stem).first()
    if not default_user:
        result.errors.append(f"No user matched CSV filename '{csv_path.stem}'.")
        return result

    rows = read_live_license_csv_rows(csv_path)
    assets = list(
        SoftwareAsset.objects.select_related("created_by", "approved_by", "purchased_by", "renewal_owner")
        .prefetch_related("assignments__user")
        .all()
    )
    assets_by_id = {asset.id: asset for asset in assets}
    signatures = {}
    for asset in assets:
        signature = build_asset_identity_signature(asset=asset)
        if signature is not None and signature not in signatures:
            signatures[signature] = asset

    normalized_rows = []
    active_asset_ids = set()
    has_errors = False

    for row_number, row in enumerate(rows, start=2):
        try:
            payload = build_live_csv_payload(row, default_user=default_user)
        except ValueError as exc:
            result.errors.append(f"Row {row_number}: {exc}")
            has_errors = True
            continue

        row_asset_id_raw = str(row.get("asset_id") or "").strip()
        target_asset = None
        if row_asset_id_raw:
            if not row_asset_id_raw.isdigit():
                result.errors.append(f"Row {row_number}: asset_id must be an integer.")
                has_errors = True
                continue
            target_asset = assets_by_id.get(int(row_asset_id_raw))
            if target_asset is None:
                result.errors.append(f"Row {row_number}: asset_id {row_asset_id_raw} was not found.")
                has_errors = True
                continue
            if not asset_matches_live_csv_scope(
                target_asset,
                default_user=default_user,
                source_file=source_file,
            ):
                result.errors.append(
                    f"Row {row_number}: asset_id {row_asset_id_raw} belongs to another live CSV record. "
                    "Leave asset_id empty to create a new license."
                )
                has_errors = True
                continue
        else:
            signature = build_asset_identity_signature(data=payload)
            target_asset = signatures.get(signature)

        if target_asset is None:
            serializer = SoftwareAssetSerializer(data=payload)
            if not serializer.is_valid():
                result.errors.append(f"Row {row_number}: {serializer.errors}")
                has_errors = True
                continue

            asset = serializer.save(created_by=actor)
            asset.extra_metadata = build_live_csv_metadata(
                asset,
                source_file=source_file,
                username=default_user.username,
            )
            asset.save(update_fields=["extra_metadata"])
            log_live_csv_event(
                asset=asset,
                actor=actor,
                event_type="imported",
                message=f"{asset.name} synced from live CSV.",
                payload={"source_file": source_file, "row": row_number},
            )
            result.created_count += 1
            assets_by_id[asset.id] = asset
            signatures[build_asset_identity_signature(asset=asset)] = asset
            normalized_rows.append(serialize_asset_to_live_csv_row(asset))
            active_asset_ids.add(asset.id)
            continue

        serializer = SoftwareAssetSerializer(instance=target_asset, data=payload)
        if not serializer.is_valid():
            result.errors.append(f"Row {row_number}: {serializer.errors}")
            has_errors = True
            continue

        before_signature = build_asset_identity_signature(asset=target_asset)
        asset = serializer.save()
        asset.extra_metadata = build_live_csv_metadata(
            asset,
            source_file=source_file,
            username=default_user.username,
        )
        asset.save(update_fields=["extra_metadata"])
        after_signature = build_asset_identity_signature(asset=asset)
        if before_signature != after_signature:
            signatures.pop(before_signature, None)
        signatures[after_signature] = asset
        assets_by_id[asset.id] = asset
        result.updated_count += 1
        log_live_csv_event(
            asset=asset,
            actor=actor,
            event_type="updated",
            message=f"{asset.name} updated from live CSV.",
            payload={"source_file": source_file, "row": row_number},
        )
        normalized_rows.append(serialize_asset_to_live_csv_row(asset))
        active_asset_ids.add(asset.id)

    managed_assets = [
        asset
        for asset in assets_by_id.values()
        if get_live_csv_metadata(asset).get("source_file") == source_file
    ]
    for asset in managed_assets:
        if asset.id in active_asset_ids or asset.operational_status == "archived":
            continue
        asset.operational_status = "archived"
        metadata = dict(asset.extra_metadata or {})
        live_csv_metadata = dict(get_live_csv_metadata(asset))
        live_csv_metadata["archived_at"] = timezone.now().isoformat()
        metadata["live_csv"] = live_csv_metadata
        asset.extra_metadata = metadata
        asset.save(update_fields=["operational_status", "extra_metadata"])
        result.archived_count += 1
        log_live_csv_event(
            asset=asset,
            actor=actor,
            event_type="updated",
            message=f"{asset.name} archived because it was removed from live CSV.",
            payload={"source_file": source_file},
        )

    if not has_errors:
        write_live_license_csv_rows(csv_path, normalized_rows)

    return result


def archive_missing_live_csv_sources(*, known_source_files, actor=None):
    result = LiveCsvFileResult(source_file="__missing_sources__")
    assets = SoftwareAsset.objects.prefetch_related("assignments").filter(license_mode="assigned")
    for asset in assets:
        metadata = get_live_csv_metadata(asset)
        source_file = metadata.get("source_file")
        if not metadata.get("managed") or not source_file or source_file in known_source_files:
            continue
        if asset.operational_status == "archived":
            continue
        asset.operational_status = "archived"
        metadata["archived_at"] = timezone.now().isoformat()
        extra_metadata = dict(asset.extra_metadata or {})
        extra_metadata["live_csv"] = metadata
        asset.extra_metadata = extra_metadata
        asset.save(update_fields=["operational_status", "extra_metadata"])
        result.archived_count += 1
        log_live_csv_event(
            asset=asset,
            actor=actor,
            event_type="updated",
            message=f"{asset.name} archived because its live CSV source no longer exists.",
            payload={"source_file": source_file},
        )
    return result


def sync_live_license_csv_directory(directory, *, actor=None):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    summary = LiveCsvSyncSummary()
    source_files = set()

    for csv_path in iter_live_license_csv_files(directory):
        source_files.add(csv_path.relative_to(directory).as_posix())
        summary.results.append(
            sync_live_license_csv_file(csv_path, actor=actor, base_dir=directory)
        )

    missing_source_result = archive_missing_live_csv_sources(
        known_source_files=source_files,
        actor=actor,
    )
    if missing_source_result.archived_count or missing_source_result.errors:
        summary.results.append(missing_source_result)

    return summary


def export_user_license_csv(user, directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    source_file = build_live_license_csv_filename(user.username)
    csv_path = directory / source_file
    assets = list(
        SoftwareAsset.objects.filter(
            license_mode="assigned",
            assignments__user=user,
            assignments__is_active=True,
        )
        .prefetch_related("assignments__user")
        .distinct()
        .order_by("name", "id")
    )
    rows = []
    for asset in assets:
        asset.extra_metadata = build_live_csv_metadata(
            asset,
            source_file=source_file,
            username=user.username,
        )
        asset.save(update_fields=["extra_metadata"])
        rows.append(serialize_asset_to_live_csv_row(asset))

    write_live_license_csv_rows(csv_path, rows)
    return len(rows)


def export_live_license_csvs_for_users(*, user_ids=None, directory=None):
    directory = Path(directory or get_default_live_license_directory())
    directory.mkdir(parents=True, exist_ok=True)

    users = User.objects.order_by("username")
    if user_ids is not None:
        normalized_user_ids = sorted({int(user_id) for user_id in user_ids if user_id})
        users = users.filter(id__in=normalized_user_ids)

    exported_count = 0
    for user in users:
        export_user_license_csv(user, directory)
        exported_count += 1
    return exported_count


def export_user_license_csvs(directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)

    users = list(User.objects.order_by("username"))
    for user in users:
        export_user_license_csv(user, directory)

    return len(users)
