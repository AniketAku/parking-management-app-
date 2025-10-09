import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Button } from '../ui/Button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Progress } from '../ui/progress'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart,
  ScatterChart, Scatter, RadialBarChart, RadialBar
} from 'recharts'
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, Activity, 
  Users, DollarSign, Car, Clock, BarChart3, PieChart as PieChartIcon,
  Brain, Zap, Eye, Settings, Download, RefreshCw, Lightbulb,
  Shield, Star, Award, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { useParkingStore } from '../../stores/parkingStore'
import { getRevenueAmount, formatCurrency } from '../../utils/helpers'
// import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics'
// import { machineLearningService } from '../../services/machineLearningService'
// import { analyticsService } from '../../services/analyticsService'

interface ExecutiveInsight {
  id: string
  category: 'opportunity' | 'risk' | 'achievement' | 'trend'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  actionable: boolean
  recommendedActions: string[]
  metrics: {
    current: number
    target: number
    change: number
    unit: string
  }
}

interface KPIScorecards {
  financial: {
    totalRevenue: { value: number; change: number; target: number }
    revenueGrowth: { value: number; change: number; target: number }
    profitMargin: { value: number; change: number; target: number }
    revenuePerSpace: { value: number; change: number; target: number }
  }
  operational: {
    occupancyRate: { value: number; change: number; target: number }
    turnoverRate: { value: number; change: number; target: number }
    utilizationEfficiency: { value: number; change: number; target: number }
    averageStayDuration: { value: number; change: number; target: number }
  }
  customer: {
    satisfaction: { value: number; change: number; target: number }
    retention: { value: number; change: number; target: number }
    acquisitionCost: { value: number; change: number; target: number }
    lifetimeValue: { value: number; change: number; target: number }
  }
}

export const BusinessIntelligenceSystem: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'executive' | 'operational' | 'strategic'>('executive')
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
  const [insights, setInsights] = useState<ExecutiveInsight[]>([])
  const [kpiScorecards, setKPIScorecards] = useState<KPIScorecards | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Real data from parking store
  const { entries, statistics, loading } = useParkingStore()

  // Calculate real KPIs from actual data
  const kpis = useMemo(() => {
    if (!entries.length) {
      return {
        occupancy: { rate: 0, hourlyChange: 0 },
        revenue: { today: 0, projectedDaily: 0, monthToDate: 0, collectionRate: 0 },
        efficiency: { utilizationRate: 0, turnoverRate: 0, averageStayDuration: 0 },
        customer: { satisfactionScore: 0.88, customerRetentionRate: 0.76 }
      }
    }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Filter today's entries
    const todayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.entryTime || (entry as any).entry_time)
      return entryDate >= todayStart && entryDate < todayEnd
    })

    // Calculate metrics
    const currentlyParked = entries.filter(e => e.status === 'Parked').length
    const paidEntries = todayEntries.filter(e => e.paymentStatus === 'Paid')
    const todayRevenue = paidEntries.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)
    const collectionRate = todayEntries.length > 0 ? paidEntries.length / todayEntries.length : 0

    // Calculate average stay duration
    const completedStays = todayEntries.filter(e => e.exitTime || (e as any).exit_time)
    const avgStayDuration = completedStays.length > 0
      ? completedStays.reduce((sum, entry) => {
          const entryTime = new Date(entry.entryTime || (entry as any).entry_time)
          const exitTime = new Date(entry.exitTime || (entry as any).exit_time!)
          return sum + (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60) // hours
        }, 0) / completedStays.length
      : 0

    return {
      occupancy: {
        rate: Math.min((currentlyParked / 100) * 100, 100), // Assuming 100 space capacity
        hourlyChange: Math.floor(Math.random() * 10) - 5 // Mock hourly change for now
      },
      revenue: {
        today: todayRevenue,
        projectedDaily: todayRevenue * 1.2, // Simple projection
        monthToDate: statistics.totalIncome || 0,
        collectionRate
      },
      efficiency: {
        utilizationRate: Math.min(currentlyParked / 100, 1), // Assuming 100 space capacity
        turnoverRate: todayEntries.length > 0 ? completedStays.length / todayEntries.length : 0,
        averageStayDuration: avgStayDuration
      },
      customer: {
        satisfactionScore: 0.88, // Mock for now - would need customer feedback data
        customerRetentionRate: 0.76 // Mock for now - would need historical customer data
      }
    }
  }, [entries, statistics])
  
  const predictions = {
    anomalies: [
      {
        id: 'anom_1',
        type: 'Revenue',
        description: 'Unusual drop in evening revenue detected',
        severity: 'high' as const,
        confidence: 0.89,
        actualValue: 2800,
        expectedValue: 3500,
        recommendedActions: ['Investigate payment system issues', 'Check staff availability', 'Review pricing strategy']
      }
    ]
  }

  // Mock business intelligence data for strategic view
  const businessIntelligence = {
    marketPosition: {
      competitiveAdvantage: 'High-tech automated parking system',
      marketShare: 0.15,
      growthPotential: 0.25
    },
    strategicInitiatives: [
      {
        name: 'Digital Transformation',
        priority: 'High',
        timeline: '6 months',
        investment: 50000
      },
      {
        name: 'Expansion Planning',
        priority: 'Medium', 
        timeline: '12 months',
        investment: 150000
      }
    ],
    riskAssessment: {
      operationalRisk: 'Low',
      financialRisk: 'Medium',
      competitiveRisk: 'Low'
    }
  }

  // Mock insights for demo
  const mockInsights: ExecutiveInsight[] = [
    {
      id: 'insight-1',
      category: 'opportunity',
      title: 'Peak Hour Revenue Optimization',
      description: 'Current occupancy rates suggest 25% revenue increase potential during peak hours',
      impact: 'high',
      confidence: 0.92,
      actionable: true,
      recommendedActions: [
        'Implement dynamic pricing for peak hours',
        'Optimize staff scheduling',
        'Introduce premium parking zones'
      ],
      metrics: {
        current: 25000,
        target: 31250,
        change: 25,
        unit: 'revenue_increase_%'
      }
    },
    {
      id: 'insight-2',
      category: 'risk',
      title: 'Capacity Utilization Risk',
      description: 'Weekend utilization dropping below optimal levels',
      impact: 'medium',
      confidence: 0.76,
      actionable: true,
      recommendedActions: [
        'Review weekend pricing strategy',
        'Consider promotional campaigns',
        'Analyze competitor pricing'
      ],
      metrics: {
        current: 65,
        target: 80,
        change: -15,
        unit: 'utilization_%'
      }
    }
  ]

  const refreshAll = () => {
    console.log('Refreshing BI data...')
  }

  // Generate executive insights
  const generateExecutiveInsights = useCallback(async () => {
    // Use mock insights for demo mode
    setInsights(mockInsights)
  }, [])

  // Calculate KPI scorecards with stable data
  const calculateKPIScorecards = useCallback((): KPIScorecards => {
    return {
      financial: {
        totalRevenue: { 
          value: kpis.revenue.monthToDate, 
          change: ((kpis.revenue.today - kpis.revenue.projectedDaily) / kpis.revenue.projectedDaily) * 100,
          target: 50000 
        },
        revenueGrowth: { 
          value: 12.5, 
          change: 2.1, 
          target: 15 
        },
        profitMargin: { 
          value: kpis.revenue.collectionRate * 30, 
          change: 1.8, 
          target: 25 
        },
        revenuePerSpace: { 
          value: kpis.revenue.today / 100, 
          change: 5.2, 
          target: 500 
        }
      },
      operational: {
        occupancyRate: { 
          value: kpis.occupancy.rate, 
          change: kpis.occupancy.hourlyChange, 
          target: 80 
        },
        turnoverRate: { 
          value: kpis.efficiency.turnoverRate, 
          change: 0.3, 
          target: 2.5 
        },
        utilizationEfficiency: { 
          value: kpis.efficiency.utilizationRate * 100, 
          change: 2.1, 
          target: 75 
        },
        averageStayDuration: { 
          value: kpis.efficiency.averageStayDuration, 
          change: -0.2, 
          target: 3.5 
        }
      },
      customer: {
        satisfaction: { 
          value: kpis.customer.satisfactionScore * 100, 
          change: 1.5, 
          target: 85 
        },
        retention: { 
          value: kpis.customer.customerRetentionRate * 100, 
          change: -2.3, 
          target: 70 
        },
        acquisitionCost: { 
          value: 22, 
          change: -8.5, 
          target: 25 
        },
        lifetimeValue: { 
          value: 180, 
          change: 15.2, 
          target: 200 
        }
      }
    }
  }, [])

  // Initialize insights and scorecards once
  useEffect(() => {
    generateExecutiveInsights()
    setKPIScorecards(calculateKPIScorecards())
  }, [])

  // Performance score calculation
  const overallPerformanceScore = useMemo(() => {
    if (!kpiScorecards) return 0

    const scores = [
      // Financial performance (30%)
      (kpiScorecards.financial.totalRevenue.value / kpiScorecards.financial.totalRevenue.target) * 0.1,
      (kpiScorecards.financial.revenueGrowth.value / kpiScorecards.financial.revenueGrowth.target) * 0.1,
      (kpiScorecards.financial.profitMargin.value / kpiScorecards.financial.profitMargin.target) * 0.1,
      
      // Operational performance (40%)
      (kpiScorecards.operational.occupancyRate.value / kpiScorecards.operational.occupancyRate.target) * 0.15,
      (kpiScorecards.operational.turnoverRate.value / kpiScorecards.operational.turnoverRate.target) * 0.1,
      (kpiScorecards.operational.utilizationEfficiency.value / kpiScorecards.operational.utilizationEfficiency.target) * 0.15,
      
      // Customer performance (30%)
      (kpiScorecards.customer.satisfaction.value / kpiScorecards.customer.satisfaction.target) * 0.15,
      (kpiScorecards.customer.retention.value / kpiScorecards.customer.retention.target) * 0.15
    ]

    const totalScore = scores.reduce((sum, score) => sum + Math.min(score, 0.15), 0)
    return Math.round(totalScore * 100)
  }, [kpiScorecards])

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Improvement'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Intelligence</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and actionable recommendations
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Performance Score */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Overall Score</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getPerformanceColor(overallPerformanceScore)}`}>
                    {overallPerformanceScore}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getPerformanceLabel(overallPerformanceScore)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Executive Insights
          </CardTitle>
          <CardDescription>
            AI-generated insights and recommendations based on current performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockInsights.map((insight) => (
              <Card key={insight.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge 
                      variant={insight.category === 'opportunity' ? 'default' : 
                               insight.category === 'achievement' ? 'secondary' :
                               insight.category === 'risk' ? 'destructive' : 'outline'}
                      className="mb-2"
                    >
                      {insight.category}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {insight.impact === 'high' && <ArrowUpRight className="w-4 h-4 text-red-500" />}
                      {insight.impact === 'medium' && <Activity className="w-4 h-4 text-yellow-500" />}
                      {insight.impact === 'low' && <ArrowDownRight className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    {insight.description}
                  </p>
                  
                  {/* Metrics */}
                  <div className="bg-muted/50 p-3 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Current:</span>
                        <span className="ml-1 font-medium">
                          {insight.metrics.current.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-1 font-medium">
                          {insight.metrics.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Impact:</span>
                        <span className={`ml-1 font-medium ${
                          insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {insight.metrics.change > 0 ? '+' : ''}{insight.metrics.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Confidence */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <span className="text-xs font-medium">
                      {(insight.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={insight.confidence * 100} className="h-2" />
                  
                  {/* Actions */}
                  {insight.actionable && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="w-full">
                        View Recommendations
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kpiScorecards && Object.entries(kpiScorecards.financial).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof value.value === 'number' ? value.value.toLocaleString() : value.value}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    value.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {value.change > 0 ? '+' : ''}{value.change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target: {value.target.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Operational KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Operational Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kpiScorecards && Object.entries(kpiScorecards.operational).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof value.value === 'number' ? value.value.toLocaleString() : value.value}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    value.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {value.change > 0 ? '+' : ''}{value.change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target: {value.target.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Customer KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kpiScorecards && Object.entries(kpiScorecards.customer).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof value.value === 'number' ? value.value.toLocaleString() : value.value}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    value.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {value.change > 0 ? '+' : ''}{value.change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target: {value.target.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed BI Views */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executive">Executive View</TabsTrigger>
          <TabsTrigger value="operational">Operational View</TabsTrigger>
          <TabsTrigger value="strategic">Strategic View</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          <ExecutiveView 
            kpis={kpis} 
            insights={mockInsights}
            performanceScore={overallPerformanceScore}
          />
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <OperationalView kpis={kpis} predictions={predictions} />
        </TabsContent>

        <TabsContent value="strategic" className="space-y-6">
          <StrategicView 
            businessIntelligence={businessIntelligence}
            insights={mockInsights}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-components for different views
const ExecutiveView: React.FC<{ 
  kpis: any; 
  insights: ExecutiveInsight[]; 
  performanceScore: number 
}> = ({ kpis, insights, performanceScore }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Key Achievements</h4>
              <ul className="space-y-2">
                {insights
                  .filter(i => i.category === 'achievement')
                  .slice(0, 3)
                  .map(insight => (
                    <li key={insight.id} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span className="text-sm">{insight.title}</span>
                    </li>
                  ))
                }
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Priority Actions</h4>
              <ul className="space-y-2">
                {insights
                  .filter(i => i.actionable && i.impact === 'high')
                  .slice(0, 3)
                  .map(insight => (
                    <li key={insight.id} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                      <span className="text-sm">{insight.title}</span>
                    </li>
                  ))
                }
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={generateRevenueData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#ff7300" name="Growth %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

const OperationalView: React.FC<{ kpis: any; predictions: any }> = ({ kpis, predictions }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadialBarChart data={[{
                name: 'Occupancy',
                value: kpis?.occupancy.rate || 0,
                fill: '#8884d8'
              }]}>
                <RadialBar
                  minAngle={15}
                  label={{ position: 'insideStart', fill: '#fff' }}
                  background
                  clockWise
                  dataKey="value"
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Turnover Rate</span>
                  <span>{kpis?.efficiency.turnoverRate.toFixed(1) || '0'}</span>
                </div>
                <Progress value={(kpis?.efficiency.turnoverRate || 0) * 40} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Average Stay (hours)</span>
                  <span>{kpis?.efficiency.averageStayDuration.toFixed(1) || '0'}</span>
                </div>
                <Progress value={(kpis?.efficiency.averageStayDuration || 0) * 20} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const StrategicView: React.FC<{ businessIntelligence: any; insights: ExecutiveInsight[] }> = ({ 
  businessIntelligence, 
  insights 
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights
              .filter(i => i.impact === 'high')
              .map((insight, index) => (
                <div key={insight.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    <div className="mt-2">
                      <Badge variant="outline">
                        {insight.recommendedActions.length} recommended actions
                      </Badge>
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

// Utility functions
const generateRevenueData = () => {
  return [
    { period: 'Q1', revenue: 45000, growth: 12 },
    { period: 'Q2', revenue: 52000, growth: 15 },
    { period: 'Q3', revenue: 48000, growth: 8 },
    { period: 'Q4', revenue: 58000, growth: 18 }
  ]
}

export default BusinessIntelligenceSystem