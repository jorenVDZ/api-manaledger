# Automated Database Sync with GitHub Actions

This guide shows how to set up automated scheduled database syncs using GitHub Actions.

---

## Setup (5 minutes)

### 1. Add Secrets to GitHub Repository

Go to your GitHub repository:
- Navigate to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
- Add the following secrets:
  - **Name**: `SUPABASE_URL`  
    **Value**: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
  - **Name**: `SUPABASE_SECRET_KEY`  
    **Value**: Your Supabase service role key

### 2. Push the Workflow File

The workflow file is already included at `.github/workflows/sync-database.yml`. Simply push it to GitHub:

```bash
git add .github/workflows/sync-database.yml
git commit -m "Add automated database sync workflow"
git push
```

### 3. Verify It's Running

- Go to the `Actions` tab in your GitHub repository
- You should see the "Database Sync" workflow listed
- It will run automatically daily at 2:00 AM UTC
- You can also trigger it manually using the "Run workflow" button

---

## Customize Schedule

Edit `.github/workflows/sync-database.yml` to change the sync frequency:

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
    # or
    - cron: '0 0 * * 0'    # Weekly on Sunday at midnight
    # or
    - cron: '0 2 * * *'    # Daily at 2 AM UTC (default)
```

Use [crontab.guru](https://crontab.guru) to generate cron expressions.

**Note**: GitHub Actions has a minimum interval of 5 minutes between scheduled runs.

---

## Monitoring

### View Run History
- Go to the `Actions` tab in your GitHub repository
- Click on "Database Sync" workflow
- See all past runs with timestamps and status

### Check Logs
- Click on any workflow run to see detailed logs
- View real-time progress during execution
- Debug any issues with full stack traces

### Email Notifications
- GitHub automatically sends email notifications on workflow failures
- Configure notification settings: Profile → Settings → Notifications

---

## Manual Trigger

You can manually trigger a sync anytime:

1. Go to: `Actions` tab → `Database Sync` workflow
2. Click "Run workflow" button (top right)
3. Select the branch (usually `main`)
4. Click "Run workflow"

This is useful for:
- Testing the workflow
- Running an immediate sync outside the schedule
- Recovering from failed runs

---

## Features

✅ **Completely free** - 2,000 minutes/month on GitHub Free tier  
✅ **No server maintenance** - GitHub handles all infrastructure  
✅ **Built-in logging** - Full history and logs available  
✅ **Manual trigger** - Run on-demand when needed  
✅ **Long runtime** - Up to 6 hours execution time  
✅ **Automatic retries** - Failed runs can be re-triggered  
✅ **Email alerts** - Get notified on failures  

---

## Troubleshooting

### Workflow not appearing in Actions tab
- Make sure the workflow file is in `.github/workflows/` directory
- Ensure the file is named `sync-database.yml` (or any `.yml` extension)
- Push the file to your repository

### "Secret not found" error
- Verify you added both `SUPABASE_URL` and `SUPABASE_SECRET_KEY` secrets
- Check for typos in secret names (they're case-sensitive)
- Secrets can take a few seconds to propagate

### Workflow fails with timeout
- The workflow has a 30-minute timeout by default
- If syncs take longer, increase the timeout in the workflow file:
  ```yaml
  timeout-minutes: 60  # Increase to 60 minutes
  ```

### Scheduled run didn't trigger
- GitHub Actions scheduled workflows can be delayed by up to 15 minutes during high traffic
- The `main` branch must exist and have the workflow file
- If no runs occur after 60 days, scheduled workflows are automatically disabled

### Want to pause scheduled syncs
- Go to: `Actions` → `Database Sync` → `...` menu → `Disable workflow`
- Re-enable it anytime from the same menu

---

## Testing

Before relying on automated runs, test locally:

```bash
# Test full sync
npm run db:sync

# Test upsert mode (what the cron job uses)
npm run db:sync:upsert
```

Monitor the first few automated runs to ensure everything works correctly.

---

## What the Workflow Does

1. **Checks out your code** - Gets the latest version from GitHub
2. **Sets up Node.js** - Installs Node.js 20 with npm caching
3. **Installs dependencies** - Runs `npm ci` for clean install
4. **Runs the sync** - Executes `npm run db:sync:upsert` with your Supabase credentials
5. **Reports status** - Sends notifications if it fails

All environment variables are securely injected from your repository secrets.
