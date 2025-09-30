import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { formatCurrency } from '../../utils/helpers'

interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface StatisticsChartProps {
  data: ChartData[]
  title: string
  type: 'line' | 'area' | 'bar' | 'pie'
  dataKey?: string
  color?: string
  height?: number
  loading?: boolean
  showLegend?: boolean
  formatter?: (value: number) => string
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16'  // Lime
]

const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  formatter 
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-border-light rounded-lg shadow-lg">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-text-secondary">
            <span className="inline-block w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const LoadingSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="w-full h-full bg-surface-muted rounded"></div>
  </div>
)

export const StatisticsChart: React.FC<StatisticsChartProps> = ({
  data,
  title,
  type,
  dataKey = 'value',
  color = '#3B82F6',
  height = 300,
  loading = false,
  showLegend = false,
  formatter
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton height={height} />
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`${color}20`}
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-text-muted"
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            {showLegend && <Legend />}
          </PieChart>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {data.length === 0 && (
            <span className="text-sm text-text-muted">No data available</span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-text-muted">No data to display</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}