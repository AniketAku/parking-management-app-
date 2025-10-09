# GitHub Secrets Setup

## Required Repository Secrets

To enable GitHub Actions CI/CD, you need to add these secrets to your repository.

### How to Add Secrets

1. Go to your GitHub repository: https://github.com/AniketAku/parking-management-app-
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

### Secrets to Add

#### 1. VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://jmckgqtjbezxhsqcfezu.supabase.co
```

#### 2. VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptY2tncXRqYmV6eGhzcWNmZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1ODkzNTQsImV4cCI6MjA1MDE2NTM1NH0.LUwT68i-MaDEwKgX7F0KpqjdSv__Pt1Iq0qQZ0JXVqE
```

## Verification

After adding secrets:

1. Create a test branch and push changes
2. Create a Pull Request
3. Check **Actions** tab to see workflow running
4. Workflow should pass if secrets are configured correctly

## Security Notes

- These secrets are used in GitHub Actions workflow
- They're encrypted and only accessible during workflow runs
- Never commit secrets to the repository
- Use different keys for development and production if possible

## Troubleshooting

### If workflow fails with "secrets not found":
1. Verify secrets are added in repository settings
2. Check secret names match exactly (case-sensitive)
3. Ensure you have admin access to repository

### If build fails with Supabase errors:
1. Verify Supabase URL is correct
2. Check that anon key is valid
3. Test the keys locally first
