# Deployment Guide

## Overview

This document describes the systematic deployment workflow for the Parking Management Application to avoid breaking the production app.

## Branch Strategy

### Main Branches
- **`main`** - Production branch (deployed to https://vanshtruckparking.vercel.app)
- **`staging`** - Pre-production testing branch (deployed to Vercel preview)

### Feature Branches
Create feature branches from `main`:
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/add-new-report
```

### 2. Make Changes
- Write code
- Add/update tests
- Update documentation

### 3. Local Testing
```bash
cd web-app

# Run tests
npm test

# Build locally
npm run build:deploy

# Preview build
npm run preview
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new report functionality"
```

### 5. Push to GitHub
```bash
git push origin feature/add-new-report
```

### 6. Create Pull Request
1. Go to GitHub repository
2. Click "New Pull Request"
3. Base: `main` ← Compare: `feature/add-new-report`
4. Fill out PR template
5. Submit PR

### 7. Automated Checks
- GitHub Actions runs tests automatically
- Vercel creates preview deployment
- Review preview URL in PR comments

### 8. Code Review
- Team reviews code
- Address feedback
- Update PR if needed

### 9. Merge to Main
- Once approved, merge PR to `main`
- Vercel automatically deploys to production

## Testing in Staging

### Deploy to Staging
```bash
git checkout staging
git merge main
git push origin staging
```

Vercel will create a staging deployment automatically.

### Staging Environment
- URL: Check Vercel dashboard for staging URL
- Use for testing before production
- Test with production-like data

## Environment Variables

### Required Variables (Set in Vercel Dashboard)
```
VITE_SUPABASE_URL=https://jmckgqtjbezxhsqcfezu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_ENVIRONMENT=production
```

### Adding New Variables
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add variable for Production, Preview, and Development
3. Redeploy to apply changes

## Rollback Strategies

### Option 1: Vercel Dashboard Rollback
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Option 2: Git Revert
```bash
# Find commit to revert
git log --oneline

# Revert specific commit
git revert <commit-hash>
git push origin main
```

### Option 3: Hotfix Branch
```bash
# Create hotfix from last working commit
git checkout -b hotfix/critical-fix <last-working-commit>

# Fix the issue
git add .
git commit -m "hotfix: resolve critical issue"

# Push and create PR
git push origin hotfix/critical-fix
```

## Deployment Checklist

### Before Merging
- [ ] All tests pass locally
- [ ] Build succeeds without errors
- [ ] Changes tested in Vercel preview
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Breaking changes documented

### After Deployment
- [ ] Verify production URL works
- [ ] Test critical user flows
- [ ] Monitor error logs (Vercel Dashboard)
- [ ] Check performance metrics
- [ ] Notify team of deployment

## Common Issues & Solutions

### Issue: 404 on Routes
**Solution**: Ensure `vercel.json` has SPA rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Issue: Build Fails on Vercel
**Check**:
1. Case sensitivity in imports (Linux is case-sensitive)
2. Environment variables are set
3. Dependencies are in package.json

### Issue: Preview Deployment Not Created
**Check**:
1. PR is from same repository (not fork)
2. Vercel is connected to repository
3. Branch protection rules allow deployments

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:components
npm run test:integration
npm run test:accessibility

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Monitoring

### Vercel Dashboard
- Monitor deployments: https://vercel.com/dashboard
- View logs for errors
- Check analytics and performance

### Application Health
- Check `/dashboard` route
- Verify real-time updates work
- Test entry/exit workflows
- Validate report generation

## Best Practices

1. **Always create feature branches** - Never commit directly to `main`
2. **Write tests** - Cover new functionality with tests
3. **Use meaningful commit messages** - Follow conventional commits
4. **Test preview deployments** - Always check Vercel preview before merging
5. **Document breaking changes** - Update docs and migration guides
6. **Monitor after deployment** - Watch for errors in first 30 minutes

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Review GitHub Actions workflow runs
3. Check this documentation
4. Contact team lead
