from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import SoftwareAsset, SoftwareAssetAssignment


PERSONAL_PRODUCT_TEMPLATES = [
    {
        "name": "Cursor Pro",
        "vendor": "Cursor",
        "plan_name": "Pro",
        "record_type": "single_user_license",
        "provider_code": "cursor",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("20.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "Adobe Photoshop",
        "vendor": "Adobe",
        "plan_name": "Single App",
        "record_type": "desktop_license",
        "provider_code": "adobe",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("22.99"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "Figma Professional",
        "vendor": "Figma",
        "plan_name": "Professional",
        "record_type": "saas",
        "provider_code": "figma",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("15.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "GitHub Copilot Individual",
        "vendor": "GitHub",
        "plan_name": "Individual",
        "record_type": "saas",
        "provider_code": "github",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("10.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "Microsoft 365 Personal",
        "vendor": "Microsoft",
        "plan_name": "Personal",
        "record_type": "single_user_license",
        "provider_code": "microsoft",
        "billing_cycle": "yearly",
        "purchase_price": Decimal("99.99"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 365,
    },
    {
        "name": "ChatGPT Plus",
        "vendor": "OpenAI",
        "plan_name": "Plus",
        "record_type": "saas",
        "provider_code": "openai",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("20.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "JetBrains All Products Pack",
        "vendor": "JetBrains",
        "plan_name": "Individual Pack",
        "record_type": "desktop_license",
        "provider_code": "other",
        "billing_cycle": "yearly",
        "purchase_price": Decimal("289.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 365,
    },
    {
        "name": "Notion Plus",
        "vendor": "Notion",
        "plan_name": "Plus",
        "record_type": "saas",
        "provider_code": "other",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("10.00"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
    {
        "name": "TablePlus",
        "vendor": "TablePlus",
        "plan_name": "Annual License",
        "record_type": "desktop_license",
        "provider_code": "other",
        "billing_cycle": "yearly",
        "purchase_price": Decimal("79.00"),
        "currency": "USD",
        "auto_renew": False,
        "renewal_days": 365,
    },
    {
        "name": "1Password",
        "vendor": "1Password",
        "plan_name": "Individual",
        "record_type": "single_user_license",
        "provider_code": "other",
        "billing_cycle": "monthly",
        "purchase_price": Decimal("2.99"),
        "currency": "USD",
        "auto_renew": True,
        "renewal_days": 30,
    },
]


class Command(BaseCommand):
    help = "Seed at least one personal software asset for each user."

    def handle(self, *args, **options):
        users = list(User.objects.order_by("id"))
        if not users:
            self.stdout.write(self.style.WARNING("No users found."))
            return

        admin_user = (
            User.objects.filter(is_staff=True).order_by("id").first()
            or User.objects.filter(is_superuser=True).order_by("id").first()
            or users[0]
        )
        created_count = 0
        skipped_count = 0
        today = timezone.localdate()

        for index, user in enumerate(users):
            has_personal_asset = SoftwareAsset.objects.filter(
                license_mode="assigned",
                assignments__user=user,
                assignments__is_active=True,
            ).exists()
            if has_personal_asset:
                skipped_count += 1
                continue

            template = PERSONAL_PRODUCT_TEMPLATES[index % len(PERSONAL_PRODUCT_TEMPLATES)]
            renewal_days = int(template["renewal_days"])
            purchase_date = today - timedelta(days=max(renewal_days // 3, 7))
            renewal_date = today + timedelta(days=renewal_days)

            asset = SoftwareAsset.objects.create(
                name=template["name"],
                vendor=template["vendor"],
                plan_name=template["plan_name"],
                record_type=template["record_type"],
                license_mode="assigned",
                operational_status="active",
                provider_code=template["provider_code"],
                record_source="manual",
                account_email=user.email or "",
                billing_email=user.email or "",
                billing_cycle=template["billing_cycle"],
                department="Engineering",
                cost_center="PERSONAL-SW",
                purchase_date=purchase_date,
                renewal_date=renewal_date,
                auto_renew=template["auto_renew"],
                purchase_price=template["purchase_price"],
                currency=template["currency"],
                approved_by=admin_user,
                purchased_by=user,
                renewal_owner=user,
                extra_metadata={
                    "seed": "personal_software_assets",
                    "seed_version": 1,
                    "assigned_to": user.username,
                },
                notes=f"Personal software purchase seeded for {user.username}.",
                created_by=admin_user,
            )
            SoftwareAssetAssignment.objects.create(
                asset=asset,
                user=user,
                access_email=user.email or "",
                assigned_at=today,
                is_active=True,
            )
            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created personal asset '{asset.name}' for {user.username}."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} personal assets, skipped {skipped_count} users."
            )
        )
