# Quick Start Guide

## For New Developers

### Initial Setup
```bash
# Clone repository
git clone https://github.com/AniketAku/parking-management-app-.git
cd parking-management-app-

# Install dependencies
npm run install-deps

# Start development server
npm run dev
```

### Environment Variables
Create `web-app/.env` file:
```
VITE_SUPABASE_URL=https://jmckgqtjbezxhsqcfezu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_ENVIRONMENT=development
```

## Making Changes

### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
```

### 2. Develop & Test
```bash
# Run tests
cd web-app && npm test

# Build to verify
npm run build:deploy
```

### 3. Push & Create PR
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature
```

Then create PR on GitHub.

### 4. Review Vercel Preview
- Vercel automatically creates preview deployment
- Test on preview URL before merging

### 5. Merge to Production
- Once PR approved, merge to `main`
- Production deploys automatically

## Testing

```bash
cd web-app

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Common Commands

```bash
# Development
npm run dev                 # Start dev server

# Building
npm run build              # Full build with TypeScript
npm run build:deploy       # Production build (used in Vercel)

# Testing
npm test                   # Run tests
npm run test:coverage      # With coverage report

# Linting
npm run lint               # Run ESLint
```

## URLs

- **Production**: https://vanshtruckparking.vercel.app
- **Staging**: Check Vercel dashboard for staging URL
- **Local Dev**: http://localhost:3000

## Key Files

- `web-app/src/` - React application source
- `vercel.json` - Deployment configuration
- `DEPLOYMENT.md` - Full deployment guide
- `.github/workflows/test.yml` - CI/CD configuration

## Getting Help

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed workflow
2. Review PR template for checklist
3. Contact team lead for support

## Rollback

If something breaks in production:

### Quick Rollback via Vercel
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Git Revert
```bash
git revert <bad-commit-hash>
git push origin main
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full rollback strategies.
