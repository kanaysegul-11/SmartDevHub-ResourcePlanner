# GitHub OAuth & Webhook Local Setup

Follow these steps to configure GitHub OAuth and webhook support for local development.

1. Create a GitHub OAuth App

- Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- Application name: SmartDevHub (or your choice)
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:5173/github-governance`
- Create the app and copy the **Client ID** and **Client Secret**.

2. Configure local environment

- Copy `.env.example` to `.env` in the repository root and fill values:
  - `GITHUB_CLIENT_ID` = Client ID from GitHub
  - `GITHUB_CLIENT_SECRET` = Client Secret from GitHub
  - `FRONTEND_APP_URL` = `http://localhost:5173`
  - `BACKEND_PUBLIC_URL` = `http://localhost:8000`
  - `GITHUB_WEBHOOK_SECRET` = a random secret string (used to verify webhook signatures)
  - `GITHUB_WEBHOOK_TARGET_URL` = `http://localhost:8000/api/github-webhooks/receive/`

- Example (PowerShell):

```powershell
PS> copy .env.example .env
# then edit .env with notepad or your editor
```

3. Restart the backend server

Stop and start the Django dev server so settings pick up the new env vars:

```powershell
python manage.py runserver
```

4. Verify in the app

- Open the governance page in the frontend: `http://localhost:5173/github-governance`
- The "Connect with GitHub" button should now be enabled if `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are present.

5. Webhook testing (optional)

- GitHub needs a publicly reachable webhook target. For local testing use a tunnel like `ngrok`:

```powershell
ngrok http 8000
# ngrok gives you a public URL like https://abcd1234.ngrok.io
# set GITHUB_WEBHOOK_TARGET_URL to https://abcd1234.ngrok.io/api/github-webhooks/receive/
```

- Update your repository's webhook config or let the app create/update the webhook when you sync repositories.

6. Security notes

- Never commit real client secrets or webhook secrets to the repository.
- Use `.env` for local dev; in production, set environment variables in your deployment pipeline or host provider.

If you want, I can:

- Create a `.env` locally with placeholder values (I won't add real secrets).
- Or walk you through creating the GitHub OAuth app and filling `.env` interactively.
