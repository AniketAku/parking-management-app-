# Parking Management System

A modern web application for managing parking operations, built with React, TypeScript, and Supabase.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Deployment**: Vercel
- **Authentication**: Supabase Auth with RBAC

## 📋 Features

- **Real-time Vehicle Tracking**: Live updates for vehicle entries and exits
- **Shift Management**: Complete shift lifecycle with handover workflows
- **Fee Calculation**: Automated pricing based on vehicle type and duration
- **Analytics & Reporting**: Comprehensive dashboards and export capabilities
- **Role-based Access**: Admin, operator, and viewer roles with granular permissions
- **Responsive Design**: Mobile-first design that works on all devices

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and authentication)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd parking-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or from root
   npm run install-deps
   ```

3. **Set up environment variables**
   Create a `.env` file in the `web-app` directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   cd web-app && npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
# or
cd web-app && npm run build
```

## 📁 Project Structure

```
parking-app/
├── web-app/              # React web application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API and business logic
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── types/        # TypeScript definitions
│   └── package.json
├── database/             # Database schemas and migrations
│   ├── tables/           # Table definitions
│   ├── migrations/       # Migration scripts
│   └── functions/        # PostgreSQL functions
├── scripts/              # Deployment scripts
├── docs/                 # Documentation
└── package.json          # Root package (workspace)
```

## 🗄️ Database

The application uses Supabase (PostgreSQL) with:
- Row Level Security (RLS) policies
- Real-time subscriptions
- Automated triggers and functions
- Migration versioning

See [database/README.md](database/README.md) for detailed schema and deployment instructions.

## 🚢 Deployment

The application is configured for deployment on Vercel:

1. **Connect GitHub repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy** - Automatic deployments on push to main branch

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 📚 Documentation

- [CLAUDE.md](CLAUDE.md) - Development guide for Claude Code
- [Database Schema](database/README.md) - Database structure and migrations
- [Architecture](docs/) - System architecture and design decisions
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.
