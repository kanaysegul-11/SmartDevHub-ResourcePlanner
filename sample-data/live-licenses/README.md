# Live License CSVs

This folder is the live source for per-user assigned software licenses.

- Each user has one CSV file named after their username.
- `asset_id` links an existing row back to the database.
- `asset_id` is not a row number. Leave it empty for every brand-new license row.
- Add a new row with an empty `asset_id` to create a new personal license.
- Edit an existing row to update that license in the app.
- Remove a row to archive that license record. Archived rows are hidden from the normal app list unless you explicitly filter for archived items.
- Personal assigned licenses that you add or update in the app are written back to the matching user CSV automatically.

Commands:

```powershell
cd backend
python manage.py export_user_license_csvs
python manage.py sync_live_license_csvs
python manage.py watch_live_license_csvs
```

Windows launcher:

```powershell
.\backend\start_live_license_csv_watcher.ps1
```

If the watcher is running correctly, the terminal stays open and prints sync messages.
