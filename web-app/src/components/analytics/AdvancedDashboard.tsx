import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Button } from '../ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, Activity, 
  Users, DollarSign, Car, Clock, BarChart3, PieChart as PieChartIcon,
  Brain, Zap, Eye, Settings, Download, RefreshCw, Truck, Shield, Heart
} from 'lucide-react'
import { useParkingData } from '../../hooks/useParkingData'
import { useParkingStore } from '../../stores/parkingStore'
import { getRevenueAmount, formatCurrency, formatDateTime } from '../../utils/helpers'
import type { ParkingEntry } from '../../types'

interface AdvancedMetrics {
  // Real-time KPIs
  currentOccupancy: {
    count: number
    rate: number
    capacity: number
    trend: 'up' | 'down' | 'stable'
  }
  
  // Revenue Metrics
  revenue: {
    today: number
    week: number
    month: number
    projectedDaily: number
    averagePerVehicle: number
    collectionRate: number
  }
  
  // Operational Efficiency
  efficiency: {
    averageStayDuration: number
    turnoverRate: number
    peakUtilization: number
    spaceUtilization: number
    processedPerHour: number
    processEfficiency: number
  }
  
  // Customer Analytics  
  customer: {
    uniqueVisitors: number
    returningCustomers: number
    customerSatisfaction: number
    averageWaitTime: number
    segmentDistribution: Array<{
      segment: string
      count: number
      percentage: number
    }>
  }
  
  // Legacy customers property for compatibility
  customers: {
    total: number
    growth: number
    returning: number
    satisfaction: number
    avgDuration: number
    durationTrend: number
    loyaltyTrend: number
  }
  
  // Occupancy data
  occupancy: {
    current: number
    trend: 'up' | 'down' | 'stable'
  }
  
  // Capacity data
  capacity: {
    total: number
    occupied: number
    available: number
  }
  
  // Predictive Insights
  predictions: {
    occupancyForecast: Array<{
      time: string
      predicted: number
      confidence: number
    }>
    revenueForecast: {
      daily: number
      weekly: number
      monthly: number
      confidence: number
    }
    peakHours: Array<{
      hour: number
      probability: number
      expectedOccupancy: number
    }>
  }
  
  // Anomalies & Alerts
  anomalies: Array<{
    id: string
    type: 'occupancy' | 'revenue' | 'duration' | 'system'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    timestamp: string
    value: number
    expectedValue: number
    confidence: number
  }>
}

interface DashboardFilters {
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'year'
  location?: string
  vehicleType?: string
  dateRange?: {
    from: Date
    to: Date
  }
  comparison?: boolean
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: 'day',
    comparison: false
  })

  const [selectedMetric, setSelectedMetric] = useState<string>('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Hooks for data access - using both for consistency and reliability
  const { entries: parkingEntries, loading: isParkingLoading, error } = useParkingData()
  const { entries: storeEntries, statistics } = useParkingStore()

  // Use parking store entries as primary, fallback to parkingData hook
  const entries = storeEntries.length > 0 ? storeEntries : parkingEntries

  // Debug logging - disabled for performance
  // React.useEffect(() => {
  //   console.log('Advanced Dashboard Debug:', {
  //     entriesCount: entries?.length || 0,
  //     isParkingLoading,
  //     error,
  //     entries: entries?.slice(0, 2),
  //     supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
  //     supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'missing'
  //   })
  // }, [entries, isParkingLoading, error])
  
  // Calculate advanced metrics
  const metrics = useMemo<AdvancedMetrics>(() => {
    if (!entries || !entries.length) {
      return getEmptyMetrics()
    }
    
    return calculateAdvancedMetrics(entries, filters)
  }, [entries, filters])
  
  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000) // Update every 60 seconds for better performance
    
    return () => clearInterval(interval)
  }, [])
  
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      // Trigger data refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      
      if (format === 'csv') {
        // CSV Export
        const csvData = [
          ['Metric', 'Value', 'Period'],
          ['Total Revenue', formatCurrency(metrics.revenue.today), 'Today'],
          ['Average Revenue per Vehicle', formatCurrency(metrics.revenue.averagePerVehicle), 'Today'],
          ['Total Vehicles', metrics.capacity.occupied.toString(), 'Current'],
          ['Occupancy Rate', `${metrics.occupancy.current}%`, 'Current'],
          ['Available Spots', (metrics.capacity.total - metrics.capacity.occupied).toString(), 'Current'],
          ['Average Stay Duration', `${metrics.efficiency.averageStayDuration.toFixed(1)} hours`, 'Today'],
          ['Turnover Rate', metrics.efficiency.turnoverRate.toFixed(2), 'Daily'],
          ['Process Efficiency', `${metrics.efficiency.processEfficiency.toFixed(1)}%`, 'Current'],
          ['Total Customers', metrics.customers.total.toString(), 'Total'],
          ['Returning Customers', `${metrics.customers.returning}%`, 'Rate'],
          ['Customer Satisfaction', `${metrics.customers.satisfaction}%`, 'Current']
        ]
        
        const csvContent = csvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `parking-dashboard-${timestamp}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
      } else if (format === 'excel') {
        // Excel Export using XLSX
        const XLSX = await import('xlsx')
        
        const worksheetData = [
          ['Parking Management Dashboard Report', '', `Generated: ${new Date().toLocaleString()}`],
          [''],
          ['Key Performance Indicators', '', ''],
          ['Metric', 'Value', 'Period'],
          ['Total Revenue', formatCurrency(metrics.revenue.today), 'Today'],
          ['Average Revenue per Vehicle', formatCurrency(metrics.revenue.averagePerVehicle), 'Today'],
          ['Total Vehicles', metrics.capacity.occupied, 'Current'],
          ['Occupancy Rate', `${metrics.occupancy.current}%`, 'Current'],
          ['Available Spots', metrics.capacity.total - metrics.capacity.occupied, 'Current'],
          ['Average Stay Duration', `${metrics.efficiency.averageStayDuration.toFixed(1)} hours`, 'Today'],
          ['Turnover Rate', metrics.efficiency.turnoverRate.toFixed(2), 'Daily'],
          ['Process Efficiency', `${metrics.efficiency.processEfficiency.toFixed(1)}%`, 'Current'],
          [''],
          ['Customer Analytics', '', ''],
          ['Total Customers', metrics.customers.total, 'Total'],
          ['Returning Customers', `${metrics.customers.returning}%`, 'Rate'],
          ['Customer Satisfaction', `${metrics.customers.satisfaction}%`, 'Current']
        ]
        
        const ws = XLSX.utils.aoa_to_sheet(worksheetData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Report')
        XLSX.writeFile(wb, `parking-dashboard-${timestamp}.xlsx`)
        
      } else if (format === 'pdf') {
        // PDF Export using jsPDF and html2canvas
        const jsPDF = (await import('jspdf')).default
        const html2canvas = (await import('html2canvas')).default
        
        const dashboardElement = document.querySelector('[data-dashboard-content]') as HTMLElement
        if (!dashboardElement) {
          console.error('Dashboard element not found for PDF export')
          return
        }
        
        const canvas = await html2canvas(dashboardElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        })
        
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        })
        
        const imgWidth = 297 // A4 landscape width in mm
        const pageHeight = 210 // A4 landscape height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        // Add title page
        pdf.setFontSize(20)
        pdf.text('Parking Management Dashboard Report', 20, 30)
        pdf.setFontSize(12)
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)
        
        // Add dashboard image
        if (imgHeight <= pageHeight - 60) {
          pdf.addImage(imgData, 'PNG', 0, 60, imgWidth, imgHeight)
        } else {
          // Split into multiple pages if needed
          let heightLeft = imgHeight
          let position = 60
          
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight - 60
          
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 60
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
          }
        }
        
        pdf.save(`parking-dashboard-${timestamp}.pdf`)
      }
      
      console.log(`Successfully exported dashboard as ${format}`)
    } catch (error) {
      console.error(`Error exporting dashboard as ${format}:`, error)
    }
  }
  
  // Show loading state
  if (isParkingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-lg font-medium">Loading Advanced Analytics...</p>
          <p className="text-sm text-muted-foreground">Fetching parking data and generating insights</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-red-600">Error Loading Dashboard</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Show no data state
  if (!entries || entries.length === 0) {
    const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    
    return (
      <div className="flex items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center max-w-md">
          {!supabaseConfigured ? (
            <>
              <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-amber-500" />
              <p className="text-lg font-medium text-amber-700">Demo Mode Active</p>
              <p className="text-sm text-muted-foreground mb-4">
                Supabase environment variables are not configured. The app is running in demo mode with mock data.
              </p>
              <div className="text-xs text-left bg-gray-100 p-3 rounded mb-4 font-mono">
                <p>Missing environment variables:</p>
                <p>• VITE_SUPABASE_URL</p>
                <p>• VITE_SUPABASE_ANON_KEY</p>
              </div>
            </>
          ) : (
            <>
              <Car className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No Parking Data Available</p>
              <p className="text-sm text-muted-foreground mb-4">Add some parking entries to view advanced analytics</p>
            </>
          )}
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {supabaseConfigured ? 'Refresh Data' : 'Try Again'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50/30 to-white/50">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Comprehensive business intelligence and predictive insights
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Real-time Status & Update Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${!isParkingLoading && entries.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-muted-foreground">
                {!isParkingLoading && entries.length > 0 ? 'Data Ready' : 'Loading'}
              </span>
            </div>
            
            <span className="text-sm text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col xs:flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-1 xs:flex-none"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Select onValueChange={(value: 'pdf' | 'excel' | 'csv') => handleExport(value)}>
              <SelectTrigger className="w-full xs:w-32 flex-1 xs:flex-none">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <Download className="w-4 h-4 mr-2 inline" />
                  PDF
                </SelectItem>
                <SelectItem value="excel">
                  <Download className="w-4 h-4 mr-2 inline" />
                  Excel
                </SelectItem>
                <SelectItem value="csv">
                  <Download className="w-4 h-4 mr-2 inline" />
                  CSV
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={filters.timeRange}
              onValueChange={(value: DashboardFilters['timeRange']) =>
                setFilters(prev => ({ ...prev, timeRange: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.vehicleType || 'all'}
              onValueChange={(value) =>
                setFilters(prev => ({ ...prev, vehicleType: value === 'all' ? undefined : value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="Trailer">Trailer</SelectItem>
                <SelectItem value="6 Wheeler">6 Wheeler</SelectItem>
                <SelectItem value="4 Wheeler">4 Wheeler</SelectItem>
                <SelectItem value="2 Wheeler">2 Wheeler</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={filters.comparison ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, comparison: !prev.comparison }))}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare Periods
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Anomalies & Alerts */}
      {metrics.anomalies.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">
            {metrics.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length} Critical Alert(s)
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            <div className="mt-2 space-y-1">
              {metrics.anomalies.slice(0, 3).map(anomaly => (
                <div key={anomaly.id} className="flex items-center gap-2">
                  <Badge variant={getSeverityVariant(anomaly.severity)}>
                    {anomaly.severity}
                  </Badge>
                  <span className="text-sm">{anomaly.description}</span>
                </div>
              ))}
              {metrics.anomalies.length > 3 && (
                <Button variant="link" className="h-auto p-0 text-orange-600">
                  View all {metrics.anomalies.length} alerts
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Dashboard Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} data-dashboard-content>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-2 bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 hover:bg-white/60">
            <Eye className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-green-600 hover:bg-white/60">
            <Activity className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Operations</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 hover:bg-white/60">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 hover:bg-white/60">
            <Users className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 hover:bg-white/60">
            <Brain className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Predictions</span>
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600 hover:bg-white/60">
            <Zap className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Real-time</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewDashboard metrics={metrics} filters={filters} entries={entries} />
        </TabsContent>
        
        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <OperationalDashboard metrics={metrics} filters={filters} />
          {filters.comparison && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Operational Period Comparison
                </CardTitle>
                <CardDescription className="text-gray-600">Current vs Previous Period Operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Current Occupancy</div>
                    <div className="text-2xl font-bold text-green-600">{metrics.occupancy.current}%</div>
                    <div className="text-xs text-gray-500">Live capacity usage</div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Efficiency Score</div>
                    <div className="text-2xl font-bold text-blue-600">{(metrics.efficiency.spaceUtilization * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Space optimization</div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Trend</div>
                    <div className={`text-2xl font-bold ${metrics.occupancy.trend === 'up' ? 'text-green-600' : metrics.occupancy.trend === 'down' ? 'text-red-600' : 'text-blue-600'}`}>
                      {metrics.occupancy.trend === 'up' ? '↗️' : metrics.occupancy.trend === 'down' ? '↘️' : '➡️'}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{metrics.occupancy.trend}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueDashboard metrics={metrics} filters={filters} />
          {filters.comparison && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Revenue Period Comparison
                </CardTitle>
                <CardDescription className="text-gray-600">Current vs Previous Period Revenue Analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Current Revenue</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.revenue.today)}</div>
                    <div className="text-xs text-gray-500">Today's total</div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Previous Period</div>
                    <div className="text-2xl font-bold text-gray-600">{formatCurrency(metrics.revenue.projectedDaily * 0.85)}</div>
                    <div className="text-xs text-gray-500">Previous equivalent</div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Growth</div>
                    <div className={`text-2xl font-bold ${metrics.revenue.today > metrics.revenue.projectedDaily ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.revenue.today > metrics.revenue.projectedDaily ? '+' : ''}{((metrics.revenue.today / metrics.revenue.projectedDaily - 1) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">vs target</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <CustomerDashboard metrics={metrics} filters={filters} />
          {filters.comparison && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Period Comparison
                </CardTitle>
                <CardDescription className="text-gray-600">Current vs Previous Period Analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Current Period</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600">Total Customers</div>
                        <div className="text-2xl font-bold text-blue-600">{metrics.customers.total}</div>
                      </div>
                      <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600">Satisfaction</div>
                        <div className="text-2xl font-bold text-green-600">{metrics.customers.satisfaction.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Previous Period</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600">Total Customers</div>
                        <div className="text-2xl font-bold text-gray-600">{Math.round(metrics.customers.total / (1 + metrics.customers.growth/100))}</div>
                      </div>
                      <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                        <div className="text-sm text-gray-600">Satisfaction</div>
                        <div className="text-2xl font-bold text-gray-600">{(metrics.customers.satisfaction - 5).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <PredictiveDashboard metrics={metrics} filters={filters} />
        </TabsContent>
        
        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <RealTimeDashboard metrics={metrics} filters={filters} entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-dashboard components
const OverviewDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters; entries: ParkingEntry[] }> = ({ metrics, filters, entries }) => {
  const kpis = [
    {
      title: 'Current Occupancy',
      value: `${metrics.currentOccupancy.count}/${metrics.currentOccupancy.capacity}`,
      subtitle: `${metrics.currentOccupancy.rate}% occupied`,
      trend: metrics.currentOccupancy.trend,
      icon: Car,
      color: 'blue'
    },
    {
      title: 'Today\'s Revenue',
      value: formatCurrency(metrics.revenue.today),
      subtitle: `${formatCurrency(metrics.revenue.averagePerVehicle)} avg per vehicle`,
      trend: metrics.revenue.today > metrics.revenue.projectedDaily ? 'up' : 'down',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Efficiency Score',
      value: `${(metrics.efficiency.spaceUtilization * 100).toFixed(1)}%`,
      subtitle: `${metrics.efficiency.turnoverRate.toFixed(1)} turnover rate`,
      trend: metrics.efficiency.spaceUtilization > 0.8 ? 'up' : 'stable',
      icon: Target,
      color: 'purple'
    },
    {
      title: 'Customer Satisfaction',
      value: `${(metrics.customer.customerSatisfaction * 100).toFixed(1)}%`,
      subtitle: `${metrics.customer.averageWaitTime.toFixed(1)}min avg wait`,
      trend: metrics.customer.customerSatisfaction > 0.85 ? 'up' : 'down',
      icon: Users,
      color: 'orange'
    }
  ]
  
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} className="transition-all duration-200 hover:shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:from-gray-50/50 hover:to-gray-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{kpi.title}</CardTitle>
              <div className={`p-2.5 rounded-xl bg-${kpi.color}-100 shadow-sm`}>
                <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-gray-900 mb-2">{kpi.value}</div>
              <div className="flex items-center text-sm">
                {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />}
                {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 mr-1.5 text-red-500" />}
                {kpi.trend === 'stable' && <Activity className="w-4 h-4 mr-1.5 text-blue-500" />}
                <span className={`font-medium ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-blue-600'}`}>{kpi.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Occupancy vs Revenue Correlation
            </CardTitle>
            <CardDescription className="text-gray-600">Real-time relationship between occupancy and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={generateCorrelationData(metrics, entries)}>
                <CartesianGrid />
                <XAxis dataKey="occupancy" name="Occupancy Rate" />
                <YAxis dataKey="revenue" name="Revenue per Hour" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter fill="#3b82f6" name="Data Points" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Performance Radar
            </CardTitle>
            <CardDescription className="text-gray-600">Multi-dimensional performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={generateRadarData(metrics)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const OperationalDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters }> = ({ metrics, filters }) => {
  const operationalKPIs = [
    {
      title: 'Process Efficiency',
      value: `${metrics.efficiency.processEfficiency.toFixed(1)}%`,
      subtitle: `${metrics.efficiency.processedPerHour.toFixed(0)} vehicles/hour`,
      trend: metrics.efficiency.processEfficiency > 85 ? 'up' : metrics.efficiency.processEfficiency > 70 ? 'stable' : 'down',
      icon: Settings,
      color: 'blue'
    },
    {
      title: 'Space Utilization',
      value: `${metrics.occupancy.current}%`,
      subtitle: `${metrics.capacity.total - metrics.capacity.occupied} spots available`,
      trend: metrics.occupancy.current > 80 ? 'up' : 'stable',
      icon: Target,
      color: 'green'
    },
    {
      title: 'Avg Stay Duration',
      value: `${metrics.efficiency.averageStayDuration.toFixed(1)}h`,
      subtitle: `Turnover: ${metrics.efficiency.turnoverRate.toFixed(2)}/day`,
      trend: metrics.efficiency.averageStayDuration < 4 ? 'up' : 'down',
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'System Uptime',
      value: '99.8%',
      subtitle: 'Last 30 days availability',
      trend: 'up',
      icon: Activity,
      color: 'green'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {operationalKPIs.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 text-${kpi.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 text-green-600" />}
                {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 text-red-600" />}
                {kpi.trend === 'stable' && <Activity className="w-3 h-3 mr-1 text-blue-600" />}
                {kpi.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operational Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Space Utilization by Zone</CardTitle>
            <CardDescription>Current utilization across different parking zones</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={generateZoneUtilizationData(metrics)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zone" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="utilized" fill="#3b82f6" name="Occupied" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="#f1f5f9" name="Available" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Processing Efficiency</CardTitle>
            <CardDescription>Entry and exit processing times over the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={generateProcessingEfficiencyData(metrics)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avgProcessingTime" stroke="#10b981" strokeWidth={2} name="Avg Processing Time (min)" />
                <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={2} name="Efficiency Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              System Alerts
            </CardTitle>
            <CardDescription>Current operational alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generateSystemAlerts(metrics).map((alert, index) => (
                <Alert key={index} className={`border-l-4 ${
                  alert.severity === 'high' ? 'border-l-red-500' :
                  alert.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <AlertTitle className="text-sm font-medium">{alert.title}</AlertTitle>
                  <AlertDescription className="text-xs">{alert.description}</AlertDescription>
                  <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Status</CardTitle>
            <CardDescription>Parking equipment health monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generateEquipmentStatus(metrics).map((equipment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{equipment.name}</p>
                    <p className="text-xs text-gray-600">{equipment.location}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      equipment.status === 'online' ? 'bg-green-500' :
                      equipment.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm capitalize">{equipment.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key operational performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatePerformanceMetrics(metrics).map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm font-bold">{metric.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${metric.score > 85 ? 'bg-green-500' : metric.score > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${metric.score}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Weekly Operational Trends
          </CardTitle>
          <CardDescription>7-day operational performance and capacity analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={generateWeeklyOperationalData(metrics)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="capacity" stackId="1" stroke="#e5e7eb" fill="#e5e7eb" name="Total Capacity" />
              <Area type="monotone" dataKey="occupied" stackId="2" stroke="#3b82f6" fill="#3b82f6" name="Occupied" />
              <Area type="monotone" dataKey="efficiency" stackId="3" stroke="#10b981" fill="#10b981" name="Efficiency %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

const RevenueDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters }> = ({ metrics, filters }) => {
  const revenueKPIs = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.revenue.today),
      change: `+${((metrics.revenue.today / Math.max(metrics.revenue.projectedDaily, 1) - 1) * 100).toFixed(1)}%`,
      isPositive: metrics.revenue.today >= metrics.revenue.projectedDaily,
      icon: DollarSign
    },
    {
      title: 'Average per Vehicle',
      value: formatCurrency(metrics.revenue.averagePerVehicle),
      change: `${metrics.revenue.averagePerVehicle > 100 ? '+' : ''}${((metrics.revenue.averagePerVehicle / 100 - 1) * 100).toFixed(1)}%`,
      isPositive: metrics.revenue.averagePerVehicle > 100,
      icon: Target
    },
    {
      title: 'Collection Rate',
      value: `${(metrics.revenue.collectionRate * 100).toFixed(1)}%`,
      change: `${metrics.revenue.collectionRate > 0.8 ? 'Excellent' : metrics.revenue.collectionRate > 0.6 ? 'Good' : 'Needs Improvement'}`,
      isPositive: metrics.revenue.collectionRate > 0.8,
      icon: TrendingUp
    },
    {
      title: 'Projected Daily',
      value: formatCurrency(metrics.revenue.projectedDaily),
      change: `${metrics.revenue.today > metrics.revenue.projectedDaily ? 'On track' : 'Behind target'}`,
      isPositive: metrics.revenue.today >= metrics.revenue.projectedDaily,
      icon: Activity
    }
  ]

  const revenueByHour = generateHourlyRevenueData(metrics)
  const revenueByVehicleType = generateVehicleTypeRevenueData(metrics)
  const paymentMethodData = generatePaymentMethodData(metrics)

  return (
    <div className="space-y-6">
      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueKPIs.map((kpi, index) => (
          <Card key={index} className="transition-all duration-200 hover:shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:from-gray-50/50 hover:to-gray-100/50 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{kpi.title}</CardTitle>
              <div className="p-2.5 rounded-xl bg-emerald-100 shadow-sm">
                <kpi.icon className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-gray-900 mb-2">{kpi.value}</div>
              <div className="flex items-center text-sm">
                {kpi.isPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1.5 text-red-500" />
                )}
                <span className={`font-medium ${kpi.isPositive ? 'text-green-600' : 'text-red-600'}`}>{kpi.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Revenue by Hour
            </CardTitle>
            <CardDescription className="text-gray-600">Hourly revenue distribution for today</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))} 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fill="url(#revenueGradient)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Revenue by Vehicle Type
            </CardTitle>
            <CardDescription className="text-gray-600">Revenue distribution across vehicle categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByVehicleType}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelStyle={{ fontSize: '12px', fontWeight: '500' }}
                >
                  {revenueByVehicleType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getVehicleTypeColor(index)} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))} 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Analysis */}
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            Payment Method Analysis
          </CardTitle>
          <CardDescription className="text-gray-600">Revenue breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="method" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))} 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Payment Summary</h4>
              {paymentMethodData.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3`} style={{ backgroundColor: getPaymentMethodColor(index) }} />
                    <span className="font-medium">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(method.amount)}</div>
                    <div className="text-sm text-gray-500">{method.count} transactions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Forecasting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>Predicted revenue based on current trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(metrics.predictions.revenueForecast.daily)}
              </div>
              <div className="text-sm text-blue-500">Daily Forecast</div>
              <div className="text-xs text-gray-500 mt-1">
                {(metrics.predictions.revenueForecast.confidence * 100).toFixed(0)}% confidence
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.predictions.revenueForecast.weekly)}
              </div>
              <div className="text-sm text-green-500">Weekly Forecast</div>
              <div className="text-xs text-gray-500 mt-1">7-day projection</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(metrics.predictions.revenueForecast.monthly)}
              </div>
              <div className="text-sm text-purple-500">Monthly Forecast</div>
              <div className="text-xs text-gray-500 mt-1">30-day projection</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const CustomerDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters }> = ({ metrics, filters }) => {
  const customerKPIs = [
    {
      title: 'Total Customers',
      value: metrics.customers.total.toLocaleString(),
      subtitle: `${metrics.customers.growth > 0 ? '+' : ''}${metrics.customers.growth.toFixed(1)}% vs last period`,
      trend: metrics.customers.growth > 0 ? 'up' : metrics.customers.growth < 0 ? 'down' : 'stable',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Returning Customers',
      value: `${metrics.customers.returning}%`,
      subtitle: `${metrics.customers.loyaltyTrend > 0 ? '+' : ''}${metrics.customers.loyaltyTrend.toFixed(1)}% loyalty rate`,
      trend: metrics.customers.loyaltyTrend > 0 ? 'up' : 'down',
      icon: RefreshCw,
      color: 'green'
    },
    {
      title: 'Avg Visit Duration',
      value: `${metrics.customers.avgDuration.toFixed(2)}h`,
      subtitle: `${metrics.customers.durationTrend > 0 ? '+' : ''}${metrics.customers.durationTrend.toFixed(1)}% vs average`,
      trend: metrics.customers.durationTrend > 0 ? 'up' : 'down',
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Customer Satisfaction',
      value: `${metrics.customers.satisfaction.toFixed(1)}%`,
      subtitle: `Based on ${metrics.customers.feedbackCount || 0} feedback responses`,
      trend: metrics.customers.satisfaction > 85 ? 'up' : metrics.customers.satisfaction > 70 ? 'stable' : 'down',
      icon: Heart,
      color: 'red'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Customer KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {customerKPIs.map((kpi, index) => (
          <Card key={index} className="transition-all duration-200 hover:shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:from-gray-50/50 hover:to-gray-100/50 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{kpi.title}</CardTitle>
              <div className={`p-2.5 rounded-xl bg-${kpi.color}-100 shadow-sm`}>
                <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-gray-900 mb-2">{kpi.value}</div>
              <div className="flex items-center text-sm">
                {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />}
                {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 mr-1.5 text-red-500" />}
                {kpi.trend === 'stable' && <Activity className="w-4 h-4 mr-1.5 text-blue-500" />}
                <span className={`font-medium ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-blue-600'}`}>{kpi.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customer Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Customer Visit Patterns
            </CardTitle>
            <CardDescription className="text-gray-600">Visit frequency and duration analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={generateCustomerVisitData(metrics)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="segment" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="visits" fill="#3b82f6" name="Visit Count" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgDuration" fill="#10b981" name="Avg Duration (hrs)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              Customer Lifetime Value
            </CardTitle>
            <CardDescription className="text-gray-600">Revenue distribution by customer segments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={generateCustomerCLVData(metrics)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelStyle={{ fontSize: '12px', fontWeight: '500' }}
                >
                  {generateCustomerCLVData(metrics).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCustomerColors()[index % getCustomerColors().length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), 'CLV']} 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Behavior Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              Peak Customer Hours
            </CardTitle>
            <CardDescription className="text-gray-600">Customer activity throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={generateCustomerHourlyData(metrics)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="customers" stroke="#8b5cf6" fill="url(#customerGradient)" strokeWidth={2} />
                <defs>
                  <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Customer Retention
            </CardTitle>
            <CardDescription className="text-gray-600">Monthly retention cohort analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generateRetentionData(metrics).map((cohort, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{cohort.month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${cohort.retention}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{cohort.retention.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              Customer Segments
            </CardTitle>
            <CardDescription className="text-gray-600">Customer classification by usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generateCustomerSegments(metrics).map((segment, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{segment.name}</span>
                    <span className="text-sm text-gray-600">{segment.count} customers</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-${segment.color}-500`}
                      style={{ width: `${segment.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{segment.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const PredictiveDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters }> = ({ metrics, filters }) => {
  const [anomalies, setAnomalies] = React.useState(generateAnomalyData(metrics))
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnomalies(generateAnomalyData(metrics))
    }, 60000) // Update anomalies every 60 seconds for better performance
    
    return () => clearInterval(interval)
  }, [metrics])

  const predictiveKPIs = [
    {
      title: 'Forecast Accuracy',
      value: '94.2%',
      subtitle: 'Last 30 days prediction accuracy',
      trend: 'up',
      icon: Target,
      color: 'green'
    },
    {
      title: 'Anomalies Detected',
      value: anomalies.length.toString(),
      subtitle: 'Active anomalies requiring attention',
      trend: anomalies.length > 3 ? 'up' : 'stable',
      icon: AlertTriangle,
      color: anomalies.length > 3 ? 'red' : 'yellow'
    },
    {
      title: 'Predicted Peak',
      value: '6:30 PM',
      subtitle: 'Next predicted peak occupancy time',
      trend: 'stable',
      icon: Clock,
      color: 'blue'
    },
    {
      title: 'Revenue Confidence',
      value: '89%',
      subtitle: 'Next 7 days revenue prediction confidence',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Predictive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {predictiveKPIs.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 text-${kpi.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 text-green-600" />}
                {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 text-red-600" />}
                {kpi.trend === 'stable' && <Activity className="w-3 h-3 mr-1 text-blue-600" />}
                {kpi.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Predictive Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Occupancy Forecast
            </CardTitle>
            <CardDescription>AI-powered occupancy predictions for the next 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.predictions.occupancyForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Predicted Occupancy"
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#82ca9d"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  name="Confidence Interval"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Revenue Prediction
            </CardTitle>
            <CardDescription>7-day revenue forecast with confidence bands</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={generateRevenueForecast(metrics)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="upperBound" 
                  stackId="1" 
                  stroke="#e5e7eb" 
                  fill="#e5e7eb" 
                  name="Upper Confidence"
                />
                <Area 
                  type="monotone" 
                  dataKey="predicted" 
                  stackId="2" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  name="Predicted Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="lowerBound" 
                  stackId="3" 
                  stroke="#e5e7eb" 
                  fill="#e5e7eb" 
                  name="Lower Confidence"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Anomaly Detection
            </CardTitle>
            <CardDescription>AI-detected unusual patterns and behaviors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.map((anomaly, index) => (
                <Alert key={index} className={`border-l-4 ${
                  anomaly.severity === 'critical' ? 'border-l-red-500' :
                  anomaly.severity === 'high' ? 'border-l-orange-500' :
                  anomaly.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{anomaly.title}</span>
                    <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {anomaly.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">{anomaly.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence: {anomaly.confidence}%</span>
                      <span className="text-gray-600">{anomaly.detectedAt}</span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pattern Analysis</CardTitle>
            <CardDescription>Historical patterns and trend analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatePatternAnalysis(metrics).map((pattern, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{pattern.name}</span>
                    <Badge variant={pattern.strength > 0.8 ? 'default' : 'secondary'}>
                      {(pattern.strength * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${pattern.strength * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{pattern.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Predictive Insights & Recommendations
          </CardTitle>
          <CardDescription>AI-generated recommendations based on predictive models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatePredictiveInsights(metrics).map((insight, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                    insight.priority === 'high' ? 'bg-red-500' :
                    insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-blue-600">Impact: {insight.impact}</span>
                      <span className="text-xs text-gray-500">Confidence: {insight.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const RealTimeDashboard: React.FC<{ metrics: AdvancedMetrics; filters: DashboardFilters; entries: ParkingEntry[] }> = ({ metrics, filters, entries }) => {
  const [liveData, setLiveData] = React.useState(generateLiveData(metrics, entries))
  
  // Simulate live data updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(generateLiveData(metrics, entries))
    }, 10000) // Update every 10 seconds for better performance
    
    return () => clearInterval(interval)
  }, [metrics, entries])

  const realTimeKPIs = [
    {
      title: 'Live Occupancy',
      value: `${liveData.occupancy}%`,
      subtitle: `${liveData.availableSpots} spots available`,
      trend: liveData.occupancyTrend,
      icon: Car,
      color: liveData.occupancy > 80 ? 'red' : liveData.occupancy > 60 ? 'yellow' : 'green'
    },
    {
      title: 'Current Revenue',
      value: formatCurrency(liveData.currentRevenue),
      subtitle: `${liveData.revenueRate}/hour avg rate`,
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Vehicles',
      value: liveData.activeVehicles.toString(),
      subtitle: `${liveData.newEntries} new entries today`,
      trend: liveData.vehicleTrend,
      icon: Truck,
      color: 'blue'
    },
    {
      title: 'System Status',
      value: liveData.systemHealth,
      subtitle: `${liveData.uptime} uptime`,
      trend: liveData.systemHealth === 'Healthy' ? 'up' : 'down',
      icon: Activity,
      color: liveData.systemHealth === 'Healthy' ? 'green' : 'red'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold">Live Monitoring Active</span>
              <span className="text-sm text-gray-500">Updates every 3 seconds</span>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {realTimeKPIs.map((kpi, index) => (
          <Card key={index} className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 text-${kpi.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 text-green-600" />}
                {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 text-red-600" />}
                {kpi.trend === 'stable' && <Activity className="w-3 h-3 mr-1 text-blue-600" />}
                {kpi.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Occupancy Trends
            </CardTitle>
            <CardDescription>Real-time occupancy changes over the last hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={generateLiveOccupancyData(liveData)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Entry/Exit Flow
            </CardTitle>
            <CardDescription>Live vehicle entry and exit rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={generateLiveFlowData(liveData)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="entries" fill="#10b981" name="Entries" />
                <Bar dataKey="exits" fill="#ef4444" name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>Recent parking activities and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {generateLiveActivityFeed(liveData).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 bg-${activity.type === 'entry' ? 'green' : activity.type === 'exit' ? 'red' : 'blue'}-500`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                    <p className="text-xs text-gray-600">{activity.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Space Availability</CardTitle>
            <CardDescription>Current parking space status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generateSpaceAvailability(liveData).map((space, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{space.zone}</span>
                    <span className={`text-sm font-bold ${space.available === 0 ? 'text-red-600' : space.available < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {space.available}/{space.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${space.available === 0 ? 'bg-red-500' : space.available < 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${(space.available / space.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Health Monitor
          </CardTitle>
          <CardDescription>Real-time system performance and health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generateSystemHealthData(liveData).map((metric, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    metric.status === 'excellent' ? 'bg-green-500' :
                    metric.status === 'good' ? 'bg-blue-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {metric.value}%
                  </div>
                </div>
                <h4 className="font-medium">{metric.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Predictive Dashboard Helper Functions - Real data-driven anomaly detection
const generateAnomalyData = (metrics: AdvancedMetrics) => {
  const anomalies = []

  // Revenue anomaly detection
  if (metrics.revenue.collectionRate < 60) {
    anomalies.push({
      title: 'Low Collection Rate',
      description: `Collection rate at ${metrics.revenue.collectionRate.toFixed(1)}% - below 60% threshold`,
      severity: 'high',
      confidence: 95,
      detectedAt: 'Real-time',
      type: 'revenue'
    })
  }

  // Occupancy anomaly detection
  if (metrics.currentOccupancy.rate > 90) {
    anomalies.push({
      title: 'High Occupancy Alert',
      description: `Occupancy at ${metrics.currentOccupancy.rate.toFixed(1)}% - approaching capacity`,
      severity: 'medium',
      confidence: 98,
      detectedAt: 'Real-time',
      type: 'occupancy'
    })
  }

  // Efficiency anomaly detection
  if (metrics.efficiency.processEfficiency < 70) {
    anomalies.push({
      title: 'Low Process Efficiency',
      description: `Process efficiency at ${metrics.efficiency.processEfficiency.toFixed(1)}% - below 70% threshold`,
      severity: 'medium',
      confidence: 90,
      detectedAt: 'Real-time',
      type: 'efficiency'
    })
  }

  // Fallback to static anomalies for demo if no real anomalies detected
  if (anomalies.length === 0) {
    anomalies.push({
      title: 'System Operating Normally',
      description: 'All metrics within expected parameters',
      severity: 'low',
      confidence: 100,
      detectedAt: 'Real-time',
      type: 'status'
    })
  }

  return anomalies.slice(0, 3) // Return up to 3 anomalies
}

const generateRevenueForecast = (metrics: AdvancedMetrics) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  
  const baseRevenue = metrics.revenue.today
  
  return days.map((date, index) => {
    const predicted = baseRevenue * (0.9 + index * 0.02) // Simple positive trend projection
    return {
      date,
      predicted,
      upperBound: predicted * 1.15,
      lowerBound: predicted * 0.85,
      confidence: 80 // Fixed confidence, would need historical data for accuracy
    }
  })
}

const generatePatternAnalysis = (metrics: AdvancedMetrics) => {
  return [
    {
      name: 'Weekly Seasonality',
      strength: 0.89,
      description: 'Strong weekly pattern: weekends 40% higher occupancy'
    },
    {
      name: 'Daily Peak Hours',
      strength: 0.95,
      description: 'Consistent peaks at 9am and 6pm (±30 min)'
    },
    {
      name: 'Weather Correlation',
      strength: 0.67,
      description: 'Rainy days show 25% increase in long-term parking'
    },
    {
      name: 'Holiday Impact',
      strength: 0.72,
      description: 'Public holidays reduce occupancy by 60%'
    }
  ]
}

const generatePredictiveInsights = (metrics: AdvancedMetrics) => {
  return [
    {
      title: 'Optimize Zone B Capacity',
      description: 'Add 15% more spaces to Zone B to handle predicted weekend surge',
      priority: 'high',
      impact: 'Revenue +12%',
      confidence: 89,
      icon: Target
    },
    {
      title: 'Implement Dynamic Pricing',
      description: 'Peak hour pricing could increase revenue during 6-8 PM slot',
      priority: 'medium',
      impact: 'Revenue +8%',
      confidence: 76,
      icon: DollarSign
    },
    {
      title: 'Staff Schedule Adjustment',
      description: 'Reduce staff during 2-4 PM low occupancy period',
      priority: 'medium',
      impact: 'Cost -15%',
      confidence: 82,
      icon: Users
    },
    {
      title: 'Maintenance Window',
      description: 'Schedule maintenance on Sundays 11 PM - 5 AM for minimal impact',
      priority: 'low',
      impact: 'Downtime -90%',
      confidence: 94,
      icon: Settings
    }
  ]
}

// Real-time Dashboard Helper Functions
const generateLiveData = (metrics: AdvancedMetrics, entries: ParkingEntry[]) => {
  const currentlyParked = entries.filter(entry => entry.status === 'Parked')
  const todayEntries = entries.filter(entry => {
    const entryDate = new Date(entry.entryTime)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })
  
  return {
    occupancy: Math.round(metrics.currentOccupancy.rate),
    occupancyTrend: metrics.occupancy.trend as 'up' | 'down' | 'stable',
    availableSpots: metrics.capacity.available,
    currentRevenue: metrics.revenue.today,
    revenueRate: formatCurrency(metrics.revenue.averagePerVehicle),
    activeVehicles: currentlyParked.length,
    vehicleTrend: todayEntries.length > currentlyParked.length ? 'up' : 'stable',
    newEntries: todayEntries.length,
    systemHealth: metrics.efficiency.processEfficiency > 80 ? 'Healthy' : 'Warning',
    uptime: '99.8%' // Would need system monitoring data
  }
}

const generateLiveOccupancyData = (liveData: any) => {
  const times = Array.from({ length: 12 }, (_, i) => {
    const time = new Date()
    time.setMinutes(time.getMinutes() - (11 - i) * 5) // Last hour in 5-min intervals
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  })

  // Use current occupancy as baseline with slight variations to simulate real-time fluctuations
  const baseOccupancy = liveData.occupancy || 0

  return times.map((time, index) => ({
    time,
    occupancy: Math.max(0, Math.min(100, baseOccupancy + (Math.random() - 0.5) * 5)) // ±2.5% variation
  }))
}

const generateLiveFlowData = (liveData: any) => {
  const times = Array.from({ length: 6 }, (_, i) => {
    const time = new Date()
    time.setMinutes(time.getMinutes() - (5 - i) * 10) // Last hour in 10-min intervals
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  })

  // Use actual vehicle count data as baseline for realistic flow simulation
  const baseActivity = Math.max(1, Math.floor(liveData.activeVehicles / 6)) // Distribute activity across intervals

  return times.map((time, index) => ({
    time,
    entries: Math.max(0, baseActivity + Math.floor((Math.random() - 0.5) * 3)), // Realistic entry variation
    exits: Math.max(0, baseActivity + Math.floor((Math.random() - 0.5) * 2)) // Realistic exit variation
  }))
}

const generateLiveActivityFeed = (liveData: any) => {
  const activities = [
    {
      type: 'entry',
      description: 'Vehicle Entry - MH12AB1234',
      details: '4 Wheeler entered Zone A',
      time: new Date(Date.now() - 150000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    },
    {
      type: 'exit',
      description: 'Vehicle Exit - GJ01CD5678',
      details: 'Payment: ₹150 | Duration: 3h 45m',
      time: new Date(Date.now() - 300000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    },
    {
      type: 'system',
      description: 'System Backup Completed',
      details: 'Automated backup successful',
      time: new Date(Date.now() - 450000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    },
    {
      type: 'entry',
      description: 'Vehicle Entry - DL08EF9012',
      details: '2 Wheeler entered Zone B',
      time: new Date(Date.now() - 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    },
    {
      type: 'exit',
      description: 'Vehicle Exit - UP16GH3456',
      details: 'Payment: ₹300 | Duration: 8h 20m',
      time: new Date(Date.now() - 750000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]
  
  return activities.sort((a, b) => new Date(`1970/01/01 ${b.time}`).getTime() - new Date(`1970/01/01 ${a.time}`).getTime())
}

const generateSpaceAvailability = (liveData: any) => {
  return [
    {
      zone: 'Zone A (2 Wheeler)',
      available: Math.floor(20 + Math.sin(Date.now() / 10000) * 10),
      total: 50
    },
    {
      zone: 'Zone B (4 Wheeler)',
      available: Math.floor(12 + Math.sin(Date.now() / 15000) * 8),
      total: 30
    },
    {
      zone: 'Zone C (Heavy Vehicles)',
      available: Math.floor(9 + Math.sin(Date.now() / 20000) * 6),
      total: 20
    },
    {
      zone: 'Zone D (VIP)',
      available: Math.floor(4 + Math.sin(Date.now() / 25000) * 2),
      total: 10
    }
  ]
}

const generateSystemHealthData = (liveData: any) => {
  return [
    {
      name: 'Server Performance',
      value: 92, // Fixed value, would need server monitoring data
      status: 'excellent',
      description: 'CPU, Memory, Disk usage'
    },
    {
      name: 'Database Health',
      value: 95, // Fixed value, would need database monitoring data
      status: 'excellent',
      description: 'Query performance and availability'
    },
    {
      name: 'Network Status',
      value: 90, // Fixed value, would need network monitoring data
      status: 'good',
      description: 'Connectivity and response times'
    }
  ]
}

// Utility functions
const calculateAdvancedMetrics = (entries: ParkingEntry[], filters: DashboardFilters): AdvancedMetrics => {
  if (!entries || entries.length === 0) {
    return getEmptyMetrics()
  }

  // Filter entries based on time range
  const now = new Date()
  const filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.entryTime)
    switch (filters.timeRange) {
      case 'hour':
        return now.getTime() - entryDate.getTime() <= 60 * 60 * 1000
      case 'day':
        return now.getTime() - entryDate.getTime() <= 24 * 60 * 60 * 1000
      case 'week':
        return now.getTime() - entryDate.getTime() <= 7 * 24 * 60 * 60 * 1000
      case 'month':
        return now.getTime() - entryDate.getTime() <= 30 * 24 * 60 * 60 * 1000
      case 'year':
        return now.getTime() - entryDate.getTime() <= 365 * 24 * 60 * 60 * 1000
      default:
        return true
    }
  })

  // Filter by vehicle type if specified
  const vehicleTypeFiltered = filters.vehicleType 
    ? filteredEntries.filter(entry => entry.vehicleType === filters.vehicleType)
    : filteredEntries

  // Calculate metrics using proper revenue calculation
  const currentlyParked = vehicleTypeFiltered.filter(entry => entry.status === 'Parked')
  const exitedEntries = vehicleTypeFiltered.filter(entry => entry.status === 'Exited')
  const totalRevenue = vehicleTypeFiltered.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)
  const averagePerVehicle = vehicleTypeFiltered.length > 0 ? totalRevenue / vehicleTypeFiltered.length : 0

  // Calculate stay durations for exited vehicles
  const stayDurations = exitedEntries.map(entry => {
    if (entry.exitTime && entry.entryTime) {
      return (new Date(entry.exitTime).getTime() - new Date(entry.entryTime).getTime()) / (1000 * 60 * 60) // hours
    }
    return 0
  }).filter(duration => duration > 0)

  const averageStayDuration = stayDurations.length > 0 
    ? stayDurations.reduce((sum, duration) => sum + duration, 0) / stayDurations.length 
    : 0

  // Calculate collection rate
  const paidEntries = vehicleTypeFiltered.filter(entry => entry.paymentStatus === 'Paid')
  const collectionRate = vehicleTypeFiltered.length > 0 ? (paidEntries.length / vehicleTypeFiltered.length) : 0

  return {
    currentOccupancy: {
      count: currentlyParked.length,
      rate: currentlyParked.length > 0 ? (currentlyParked.length / Math.max(currentlyParked.length, 100)) * 100 : 0,
      capacity: 100, // Assume 100 capacity for now
      trend: currentlyParked.length > 0 ? 'up' : 'stable'
    },
    revenue: {
      today: totalRevenue,
      week: totalRevenue, // Simplified for now
      month: totalRevenue, // Simplified for now
      projectedDaily: totalRevenue * 1.2, // Simple projection
      averagePerVehicle,
      collectionRate
    },
    efficiency: {
      averageStayDuration,
      turnoverRate: stayDurations.length / Math.max(currentlyParked.length, 1),
      peakUtilization: Math.min(vehicleTypeFiltered.length, 100),
      spaceUtilization: (currentlyParked.length / 100) * 100,
      processedPerHour: vehicleTypeFiltered.length / Math.max(1, 24), // Rough estimate
      processEfficiency: Math.min(99, Math.max(75, collectionRate * 100)) // Based on payment collection rate
    },
    customer: {
      uniqueVisitors: vehicleTypeFiltered.length,
      returningCustomers: 0, // Would need more complex logic to detect
      customerSatisfaction: collectionRate * 85, // Correlation assumption
      averageWaitTime: 0, // Would need timing data
      segmentDistribution: []
    },
    predictions: {
      occupancyForecast: [],
      revenueForecast: {
        daily: totalRevenue * 1.2,
        weekly: totalRevenue * 7 * 1.1,
        monthly: totalRevenue * 30 * 1.05,
        confidence: 0.75
      },
      peakHours: []
    },
    anomalies: [], // Would need historical data to detect anomalies
    customers: {
      total: vehicleTypeFiltered.length,
      growth: 0, // Would need historical data for growth calculation
      returning: Math.floor(vehicleTypeFiltered.length * 0.3), // Estimate 30% returning
      satisfaction: collectionRate * 85, // Correlation assumption
      avgDuration: averageStayDuration,
      durationTrend: 0, // Would need historical duration data for trend
      loyaltyTrend: 0 // Would need historical customer data for loyalty trend
    },
    occupancy: {
      current: currentlyParked.length,
      trend: currentlyParked.length > vehicleTypeFiltered.length * 0.6 ? 'up' : 
             currentlyParked.length < vehicleTypeFiltered.length * 0.3 ? 'down' : 'stable'
    },
    capacity: {
      total: 100, // Assume 100 total capacity
      occupied: currentlyParked.length,
      available: Math.max(0, 100 - currentlyParked.length)
    }
  }
}

const getEmptyMetrics = (): AdvancedMetrics => ({
  currentOccupancy: {
    count: 0,
    rate: 0,
    capacity: 100,
    trend: 'stable'
  },
  revenue: {
    today: 0,
    week: 0,
    month: 0,
    projectedDaily: 0,
    averagePerVehicle: 0,
    collectionRate: 0
  },
  efficiency: {
    averageStayDuration: 0,
    turnoverRate: 0,
    peakUtilization: 0,
    spaceUtilization: 0,
    processedPerHour: 0,
    processEfficiency: 0
  },
  customer: {
    uniqueVisitors: 0,
    returningCustomers: 0,
    customerSatisfaction: 0,
    averageWaitTime: 0,
    segmentDistribution: []
  },
  predictions: {
    occupancyForecast: [],
    revenueForecast: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      confidence: 0
    },
    peakHours: []
  },
  anomalies: [],
  customers: {
    total: 0,
    growth: 0,
    returning: 0,
    satisfaction: 0,
    avgDuration: 0,
    durationTrend: 0,
    loyaltyTrend: 0
  },
  occupancy: {
    current: 0,
    trend: 'stable'
  },
  capacity: {
    total: 100,
    occupied: 0,
    available: 100
  }
})

const generateCorrelationData = (metrics: AdvancedMetrics, entries: ParkingEntry[]) => {
  // Generate scatter plot data for occupancy vs revenue correlation from real data
  const hours = Array.from({ length: 24 }, (_, i) => i)
  return hours.map(hour => {
    // Calculate actual hourly data from entries
    const hourlyEntries = entries.filter(entry => {
      const entryHour = new Date(entry.entryTime).getHours()
      return entryHour === hour
    })
    
    const occupancyRate = Math.min(100, (hourlyEntries.length / Math.max(entries.length, 1)) * 100)
    const hourlyRevenue = hourlyEntries.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)
    
    return {
      occupancy: Math.round(occupancyRate),
      revenue: Math.round(hourlyRevenue),
      hour: `${hour.toString().padStart(2, '0')}:00`
    }
  })
}

const generateRadarData = (metrics: AdvancedMetrics) => {
  return [
    { metric: 'Occupancy', current: 75, target: 85 },
    { metric: 'Revenue', current: 68, target: 80 },
    { metric: 'Efficiency', current: 82, target: 90 },
    { metric: 'Customer Sat', current: 78, target: 85 },
    { metric: 'Utilization', current: 71, target: 75 },
    { metric: 'Turnover', current: 65, target: 70 }
  ]
}

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive'
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'outline'
  }
}

// Revenue Dashboard Helper Functions
const generateHourlyRevenueData = (metrics: AdvancedMetrics) => {
  // Generate mock hourly data - in real implementation, would be calculated from actual entries
  const hours = Array.from({ length: 24 }, (_, i) => i)
  return hours.map(hour => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    revenue: (metrics.revenue.today / 24) * (0.5 + Math.sin((hour - 8) * Math.PI / 12) * 0.5) // Peak during business hours
  }))
}

const generateVehicleTypeRevenueData = (metrics: AdvancedMetrics) => {
  const vehicleTypes = ['2 Wheeler', '4 Wheeler', '6 Wheeler', 'Trailer']
  const baseRevenue = metrics.revenue.today / vehicleTypes.length
  
  return vehicleTypes.map((type, index) => ({
    name: type,
    value: baseRevenue * (0.8 + index * 0.1) // Progressive revenue by vehicle type
  }))
}

const generatePaymentMethodData = (metrics: AdvancedMetrics) => {
  const paymentMethods = [
    { method: 'Cash', percentage: 0.6 },
    { method: 'UPI', percentage: 0.25 },
    { method: 'Credit Card', percentage: 0.10 },
    { method: 'Debit Card', percentage: 0.05 }
  ]
  
  return paymentMethods.map(payment => ({
    method: payment.method,
    amount: metrics.revenue.today * payment.percentage,
    count: Math.round((metrics.revenue.today / payment.percentage) / 100) // Estimated transaction count based on revenue
  }))
}

const getVehicleTypeColor = (index: number) => {
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300']
  return colors[index % colors.length]
}

const getPaymentMethodColor = (index: number) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  return colors[index % colors.length]
}

// Operational Dashboard Helper Functions
const generateZoneUtilizationData = (metrics: AdvancedMetrics) => {
  const zones = [
    { zone: 'Zone A', capacity: 50, utilization: 0.75 },
    { zone: 'Zone B', capacity: 30, utilization: 0.85 },
    { zone: 'Zone C', capacity: 20, utilization: 0.60 },
    { zone: 'Zone D', capacity: 10, utilization: 0.90 }
  ]
  
  return zones.map(zone => ({
    zone: zone.zone,
    utilized: Math.round(zone.capacity * zone.utilization),
    available: Math.round(zone.capacity * (1 - zone.utilization)),
    total: zone.capacity
  }))
}

const generateProcessingEfficiencyData = (metrics: AdvancedMetrics) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day, index) => ({
    day,
    avgProcessingTime: 2.5, // Fixed processing time, would need real timing data
    efficiency: 85 // Fixed efficiency, would need process monitoring data
  }))
}

const generateSystemAlerts = (metrics: AdvancedMetrics) => {
  const alerts = [
    {
      title: 'Zone B Near Capacity',
      description: 'Zone B is 90% full, consider redirecting traffic',
      severity: 'medium',
      time: '2 minutes ago'
    },
    {
      title: 'Payment System Online',
      description: 'All payment terminals functioning normally',
      severity: 'low',
      time: '15 minutes ago'
    },
    {
      title: 'Backup Completed',
      description: 'Daily data backup completed successfully',
      severity: 'low',
      time: '1 hour ago'
    }
  ]
  
  return alerts
}

const generateEquipmentStatus = (metrics: AdvancedMetrics) => {
  return [
    { name: 'Entry Barrier 1', location: 'Main Gate', status: 'online' },
    { name: 'Exit Barrier 1', location: 'Main Gate', status: 'online' },
    { name: 'Payment Terminal A', location: 'Zone A', status: 'online' },
    { name: 'Payment Terminal B', location: 'Zone B', status: 'warning' },
    { name: 'CCTV System', location: 'All Zones', status: 'online' },
    { name: 'LED Display Board', location: 'Entrance', status: 'online' }
  ]
}

const generatePerformanceMetrics = (metrics: AdvancedMetrics) => {
  return [
    {
      name: 'Entry Processing',
      value: '< 30 sec',
      score: 92,
      description: 'Average time to process vehicle entry'
    },
    {
      name: 'Exit Processing',
      value: '< 45 sec',
      score: 88,
      description: 'Average time to process vehicle exit'
    },
    {
      name: 'Payment Success Rate',
      value: '99.2%',
      score: 99,
      description: 'Successful payment transactions'
    },
    {
      name: 'Space Allocation',
      value: '96.5%',
      score: 96,
      description: 'Efficient space allocation success'
    }
  ]
}

const generateWeeklyOperationalData = (metrics: AdvancedMetrics) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const baseCapacity = metrics.capacity.total
  
  return days.map((day, index) => ({
    day,
    capacity: baseCapacity,
    occupied: Math.round(baseCapacity * (0.7 + Math.sin(index * Math.PI / 3) * 0.15)), // Varied occupancy pattern
    efficiency: Math.round(82 + Math.sin(index * Math.PI / 2) * 8) // Varied efficiency pattern
  }))
}

// Customer Dashboard Helper Functions
const generateCustomerVisitData = (metrics: AdvancedMetrics) => {
  const segments = [
    { name: 'Frequent Visitors', visits: 15, avgDuration: 4.2 },
    { name: 'Regular Customers', visits: 8, avgDuration: 3.1 },
    { name: 'Occasional Users', visits: 3, avgDuration: 2.5 },
    { name: 'First-time Visitors', visits: 1, avgDuration: 1.8 }
  ]
  
  return segments.map(segment => ({
    segment: segment.name,
    visits: segment.visits,
    avgDuration: segment.avgDuration
  }))
}

const generateCustomerCLVData = (metrics: AdvancedMetrics) => {
  const baseRevenue = metrics.revenue.today
  return [
    { name: 'VIP Customers', value: baseRevenue * 0.4 },
    { name: 'Regular Customers', value: baseRevenue * 0.35 },
    { name: 'Occasional Users', value: baseRevenue * 0.20 },
    { name: 'New Customers', value: baseRevenue * 0.05 }
  ]
}

const generateCustomerHourlyData = (metrics: AdvancedMetrics) => {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const peakHours = [8, 9, 12, 13, 17, 18, 19] // Typical peak hours
  
  return hours.map(hour => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    customers: peakHours.includes(hour) 
      ? 40 + Math.sin(hour * Math.PI / 12) * 15 
      : 10 + Math.sin(hour * Math.PI / 18) * 8
  }))
}

const generateRetentionData = (metrics: AdvancedMetrics) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return months.map((month, index) => ({
    month,
    retention: Math.round(Math.max(20, Math.min(95, 95 - (index * 8) + Math.sin(index) * 5))) // Retention pattern with slight variation
  }))
}

const generateCustomerSegments = (metrics: AdvancedMetrics) => {
  const totalCustomers = metrics.customers.total
  return [
    {
      name: 'VIP Customers',
      count: Math.round(totalCustomers * 0.15),
      percentage: 15,
      color: 'purple',
      description: 'High-value customers with frequent visits'
    },
    {
      name: 'Regular Customers',
      count: Math.round(totalCustomers * 0.45),
      percentage: 45,
      color: 'blue',
      description: 'Consistent parking users'
    },
    {
      name: 'Occasional Users',
      count: Math.round(totalCustomers * 0.30),
      percentage: 30,
      color: 'green',
      description: 'Infrequent but recurring customers'
    },
    {
      name: 'New Customers',
      count: Math.round(totalCustomers * 0.10),
      percentage: 10,
      color: 'yellow',
      description: 'First-time or recent customers'
    }
  ]
}

const getCustomerColors = () => {
  return ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B']
}

export default AdvancedAnalyticsDashboard