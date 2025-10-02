# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a **React/TypeScript web application** for parking management, built with modern web technologies and deployed on Vercel.

**Tech Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Supabase for backend and database
- TailwindCSS for styling
- Deployed on Vercel

## Development Commands

### Web Application
```bash
# Development server (from root)
npm run dev

# Development server (from web-app directory)
cd web-app && npm run dev

# Build for production
npm run build
# or
cd web-app && npm run build

# Install dependencies
npm run install-deps
# or
cd web-app && npm install
```

### Project Structure
- **`/web-app/`**: React/Vite web application (main application)
- **`/database/`**: SQL schemas, migrations, and database functions
- **`/scripts/`**: Deployment and setup scripts
- **`/docs/`**: Technical documentation and architecture guides
- **`vercel.json`**: Deployment configuration

## Architecture Overview

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and optimized builds
- TailwindCSS for utility-first styling
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL database)
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data protection
- Serverless Edge Functions

**Deployment:**
- Vercel for hosting and CDN
- Automatic deployments from Git
- Environment variable management

### Key Features

**1. Real-time Data Synchronization**
- Supabase real-time subscriptions for live updates
- Optimistic UI updates for better UX
- Conflict resolution for concurrent updates

**2. Authentication & Authorization**
- Supabase Auth for user management
- Role-based access control (RBAC)
- Row Level Security policies

**3. Business Logic**
- Fee calculation based on vehicle type and duration
- Shift management with handover workflows
- Comprehensive reporting and analytics

## Development Guidelines

### Adding New Features
1. Design database schema in `/database/tables/`
2. Create migration scripts in `/database/migrations/`
3. Implement React components in `/web-app/src/components/`
4. Add API integration in `/web-app/src/services/`
5. Update routes in `/web-app/src/App.tsx`

### Database Changes
1. Create migration SQL file in `/database/migrations/`
2. Test migration locally using Supabase CLI
3. Deploy using deployment scripts in `/database/`
4. Update TypeScript types to match schema

### Component Development
- Follow React best practices and hooks patterns
- Use TypeScript for type safety
- Implement proper error boundaries
- Add loading states and error handling
- Ensure responsive design with TailwindCSS

## File Structure

### Root Directory
- `package.json`: Root package config with workspace scripts
- `vercel.json`: Vercel deployment configuration
- `tailwind.config.js`: TailwindCSS configuration

### Web App (`/web-app/`)
- `src/components/`: React UI components
- `src/services/`: API and business logic
- `src/pages/`: Page-level components
- `src/hooks/`: Custom React hooks
- `src/types/`: TypeScript type definitions

### Database (`/database/`)
- `tables/`: Table schema definitions
- `migrations/`: Database migration scripts
- `functions/`: PostgreSQL functions and triggers
- `deploy_*.sql`: Deployment scripts

### Documentation (`/docs/`)
- Architecture documentation
- API integration guides
- Migration strategies
- Testing procedures