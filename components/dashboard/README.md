# Dashboard Components

This directory contains React components for the real-time shift management dashboard with event-driven updates.

## Components Overview

### Core Dashboard Components

#### `ActiveShiftPanel`
- **Purpose**: Main dashboard component orchestrating shift management functionality
- **Features**: Real-time updates, duration tracking, revenue display, modal integration
- **Dependencies**: useShiftRealtime hook, all modal components
- **Accessibility**: ARIA labels, live regions, semantic HTML

#### `RealTimeStatistics`
- **Purpose**: Live statistics display for parking metrics and performance
- **Features**: Responsive grid layout, trend indicators, currency formatting
- **Data**: Vehicle counts, revenue, transaction averages, efficiency metrics
- **Accessibility**: Semantic regions, descriptive labels

#### `ConnectionStatus`
- **Purpose**: Real-time connection status indicator
- **Features**: Connection state display, last update timestamp, visual indicators
- **States**: Connected (green with animation), Disconnected (red with warning)
- **Accessibility**: Status indicators, descriptive text

### Modal Components

#### `ShiftHandoverModal`
- **Purpose**: Complete shift handover workflow
- **Features**: Employee selection, cash reconciliation, form validation
- **Integration**: /api/shifts/handover endpoint
- **Accessibility**: Form labels, error announcements, focus management

#### `ShiftReportModal`
- **Purpose**: Comprehensive shift report display
- **Features**: Financial summary, parking statistics, PDF export, print functionality
- **Data**: Shift overview, vehicle breakdown, performance metrics
- **Accessibility**: Structured content, descriptive headings

#### `EmergencyEndModal`
- **Purpose**: Emergency shift termination with authorization
- **Features**: Reason selection, supervisor authorization, password confirmation
- **Security**: Multi-step verification, audit trail
- **Accessibility**: Clear instructions, form validation announcements

#### `ShiftStartForm`
- **Purpose**: New shift initiation form
- **Features**: Employee selection, opening cash entry, form validation
- **Integration**: /api/shifts/start endpoint, employee lookup
- **Accessibility**: Form labels, error handling, helpful instructions

### Utility Components

#### `ErrorBoundary`
- **Purpose**: Error handling and recovery for dashboard components
- **Features**: User-friendly error messages, retry functionality, development details
- **Integration**: Can wrap any component or use as HOC
- **Accessibility**: Error announcements, recovery actions

## Integration Requirements

### Real-time Data Hook
All components integrate with the `useShiftRealtime` hook for live data:

```typescript
const {
  activeShift,
  shiftStatistics,
  dashboardData,
  isConnected,
  isLoading,
  error,
  lastUpdate,
  refreshActiveShift,
  onShiftStarted,
  onShiftEnded,
  onShiftHandover
} = useShiftRealtime({
  enableShiftUpdates: true,
  enableParkingUpdates: true,
  enableShiftEvents: true,
  enableDashboardUpdates: true
});
```

### API Endpoints
Components integrate with these backend endpoints:

- `GET /api/employees?status=active` - Employee lookup
- `POST /api/shifts/start` - Start new shift
- `POST /api/shifts/handover` - Shift handover
- `POST /api/shifts/emergency/[id]` - Emergency termination
- `POST /api/shifts/[id]/export` - Report export

### Type Definitions
Components use shared TypeScript interfaces:

- `ShiftSession` - Active shift data
- `ShiftStatistics` - Performance metrics
- `DashboardData` - Real-time dashboard data
- `ShiftReport` - Complete shift reports
- `Employee` - Employee information

## Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: ARIA labels, roles, and live regions
- **Color Contrast**: Minimum 4.5:1 ratio for all text
- **Focus Management**: Proper focus handling in modals and forms

### Responsive Design
- **Mobile-First**: Optimized for mobile devices with touch-friendly interfaces
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Grid Systems**: Flexible layouts adapting to screen size
- **Typography**: Scalable text with readable font sizes

### Error Handling
- **User-Friendly Messages**: Clear, non-technical error descriptions
- **Recovery Options**: Retry buttons, refresh functionality
- **Loading States**: Skeleton screens and progress indicators
- **Network Resilience**: Graceful degradation when offline

## Currency and Localization

### Indian Rupee (INR) Support
Components include built-in INR formatting:

```typescript
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
```

### Time Formatting
Consistent time display across all components:

```typescript
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
```

## Performance Optimization

### Bundle Size Management
- **Tree Shaking**: Components exported individually
- **Lazy Loading**: Modal components loaded on demand
- **Code Splitting**: Separate chunks for heavy components

### Real-time Updates
- **WebSocket Integration**: Efficient real-time data streaming
- **Selective Updates**: Components update only relevant data
- **Connection Resilience**: Automatic reconnection handling

### Caching Strategy
- **Employee Data**: Cached during component lifecycle
- **Statistics**: Cached with smart invalidation
- **Reports**: Cached for quick re-access

## Development Notes

### Component Structure
```
components/dashboard/
├── ActiveShiftPanel.tsx      # Main dashboard
├── ShiftHandoverModal.tsx    # Handover workflow
├── ShiftReportModal.tsx      # Report display
├── EmergencyEndModal.tsx     # Emergency termination
├── RealTimeStatistics.tsx    # Live statistics
├── ConnectionStatus.tsx      # Connection indicator
├── ShiftStartForm.tsx        # New shift form
├── ErrorBoundary.tsx         # Error handling
├── index.ts                  # Component exports
└── README.md                 # This documentation
```

### Testing Considerations
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction with hooks and APIs
- **Accessibility Tests**: Screen reader compatibility, keyboard navigation
- **Visual Tests**: Responsive layout across devices

### Browser Support
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Browsers**: iOS Safari 13+, Android Chrome 80+
- **Progressive Enhancement**: Graceful degradation for older browsers

## Usage Example

```typescript
import {
  ActiveShiftPanel,
  ErrorBoundary
} from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6">
        <ActiveShiftPanel className="max-w-7xl mx-auto" />
      </div>
    </ErrorBoundary>
  );
}
```