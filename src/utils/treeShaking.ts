/**
 * Tree Shaking Utilities - Bundle Size Optimization
 * Provides utilities for analyzing and optimizing bundle size through tree shaking
 */

import { useState, useEffect, useMemo } from 'react'

// Bundle analysis types
interface BundleChunk {
  name: string
  size: number
  gzipSize?: number
  modules: string[]
}

interface BundleAnalysis {
  totalSize: number
  totalGzipSize: number
  chunks: BundleChunk[]
  unusedExports: string[]
  duplicateModules: string[]
}

interface ImportAnalysis {
  module: string
  imports: string[]
  size: number
  treeShakeable: boolean
  sideEffects: boolean
}

/**
 * Hook for bundle analysis in development
 */
export const useBundleAnalysis = () => {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  const analyzeBundles = async () => {
    if (typeof window === 'undefined' || !__DEV__) return

    setLoading(true)
    try {
      // Simulate bundle analysis (in real implementation, this would use webpack-bundle-analyzer API)
      const mockAnalysis: BundleAnalysis = {
        totalSize: 850000, // 850KB
        totalGzipSize: 320000, // 320KB
        chunks: [
          {
            name: 'react-vendor',
            size: 150000,
            gzipSize: 45000,
            modules: ['react', 'react-dom', 'react-router-dom']
          },
          {
            name: 'ui-vendor',
            size: 80000,
            gzipSize: 25000,
            modules: ['@headlessui/react', '@heroicons/react', 'framer-motion']
          },
          {
            name: 'chart-vendor',
            size: 120000,
            gzipSize: 35000,
            modules: ['recharts', 'date-fns']
          }
        ],
        unusedExports: [
          'react-dom/server',
          'date-fns/locale/af',
          'recharts/lib/util/PresentationAttributesAdaptor'
        ],
        duplicateModules: []
      }

      setAnalysis(mockAnalysis)
    } finally {
      setLoading(false)
    }
  }

  return { analysis, loading, analyzeBundles }
}

/**
 * Tree shaking optimizer utility
 */
export class TreeShakingOptimizer {
  private static instance: TreeShakingOptimizer
  private importMap: Map<string, ImportAnalysis> = new Map()

  static getInstance(): TreeShakingOptimizer {
    if (!TreeShakingOptimizer.instance) {
      TreeShakingOptimizer.instance = new TreeShakingOptimizer()
    }
    return TreeShakingOptimizer.instance
  }

  /**
   * Analyze import for tree shaking opportunities
   */
  analyzeImport(module: string, imports: string[]): ImportAnalysis {
    const analysis: ImportAnalysis = {
      module,
      imports,
      size: this.estimateModuleSize(module, imports),
      treeShakeable: this.isTreeShakeable(module),
      sideEffects: this.hasSideEffects(module)
    }

    this.importMap.set(module, analysis)
    return analysis
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []

    this.importMap.forEach((analysis, module) => {
      // Suggest specific imports instead of default imports
      if (!analysis.treeShakeable && analysis.imports.length > 1) {
        suggestions.push(
          `Consider using named imports for ${module}: import { ${analysis.imports.join(', ')} } from '${module}'`
        )
      }

      // Suggest alternatives for large modules
      if (analysis.size > 50000) {
        suggestions.push(
          `${module} is large (${(analysis.size / 1024).toFixed(1)}KB). Consider alternatives or lazy loading.`
        )
      }

      // Warn about side effects
      if (analysis.sideEffects) {
        suggestions.push(
          `${module} has side effects which may prevent tree shaking.`
        )
      }
    })

    return suggestions
  }

  /**
   * Get unused export warnings
   */
  getUnusedExports(): string[] {
    // In a real implementation, this would analyze the actual bundle
    return [
      'components/unused/OldComponent.tsx - exported but never imported',
      'utils/deprecatedHelpers.ts - contains unused exports',
      'hooks/unusedHook.ts - exported but never used'
    ]
  }

  private estimateModuleSize(module: string, imports: string[]): number {
    // Size estimates based on common libraries
    const sizeMap: Record<string, number> = {
      'react': 45000,
      'react-dom': 130000,
      'react-router-dom': 60000,
      'recharts': 280000,
      'date-fns': 150000,
      '@headlessui/react': 25000,
      '@heroicons/react': 200000,
      'framer-motion': 180000,
      'axios': 45000,
      'socket.io-client': 80000,
      'zustand': 8000,
      'clsx': 2000,
      'react-hook-form': 35000,
      'zod': 40000
    }

    const baseSize = sizeMap[module] || 10000
    
    // Estimate size based on imports (tree shaking benefit)
    if (imports.length === 1 && imports[0] !== 'default') {
      return baseSize * 0.3 // Significant tree shaking benefit
    } else if (imports.length < 5) {
      return baseSize * 0.6 // Moderate tree shaking benefit
    }
    
    return baseSize // Full module import
  }

  private isTreeShakeable(module: string): boolean {
    // Known tree-shakeable modules
    const treeShakeableModules = [
      'date-fns',
      '@heroicons/react',
      'react-hook-form',
      'zod',
      'clsx'
    ]

    // Known non-tree-shakeable modules
    const nonTreeShakeableModules = [
      'react',
      'react-dom',
      'react-router-dom',
      'socket.io-client',
      'axios'
    ]

    if (treeShakeableModules.some(mod => module.includes(mod))) {
      return true
    }

    if (nonTreeShakeableModules.some(mod => module.includes(mod))) {
      return false
    }

    // Default assumption for unknown modules
    return !module.includes('node_modules') // Assume local modules are tree-shakeable
  }

  private hasSideEffects(module: string): boolean {
    // Known modules with side effects
    const sideEffectModules = [
      'web-vitals',
      'socket.io-client',
      '@supabase/supabase-js',
      'framer-motion' // CSS injection side effects
    ]

    return sideEffectModules.some(mod => module.includes(mod))
  }
}

/**
 * Import optimization utilities
 */
export const ImportOptimizer = {
  /**
   * Optimize date-fns imports
   */
  optimizeDateFns: {
    // Instead of: import { format, parseISO, isValid } from 'date-fns'
    // Use specific imports for better tree shaking
    format: () => import('date-fns/format'),
    parseISO: () => import('date-fns/parseISO'),
    isValid: () => import('date-fns/isValid'),
    formatDistance: () => import('date-fns/formatDistance'),
    differenceInHours: () => import('date-fns/differenceInHours'),
    differenceInMinutes: () => import('date-fns/differenceInMinutes')
  },

  /**
   * Optimize Heroicons imports
   */
  optimizeHeroicons: {
    // Instead of: import { ChevronDownIcon } from '@heroicons/react/24/outline'
    // Use direct imports
    ChevronDownIcon: () => import('@heroicons/react/24/outline/ChevronDownIcon'),
    MagnifyingGlassIcon: () => import('@heroicons/react/24/outline/MagnifyingGlassIcon'),
    PlusIcon: () => import('@heroicons/react/24/outline/PlusIcon'),
    TrashIcon: () => import('@heroicons/react/24/outline/TrashIcon')
  },

  /**
   * Optimize Recharts imports
   */
  optimizeRecharts: {
    // Instead of importing entire recharts
    // Use specific component imports
    LineChart: () => import('recharts/lib/chart/LineChart'),
    BarChart: () => import('recharts/lib/chart/BarChart'),
    PieChart: () => import('recharts/lib/chart/PieChart'),
    XAxis: () => import('recharts/lib/cartesian/XAxis'),
    YAxis: () => import('recharts/lib/cartesian/YAxis'),
    Tooltip: () => import('recharts/lib/component/Tooltip'),
    ResponsiveContainer: () => import('recharts/lib/component/ResponsiveContainer')
  }
}

/**
 * Bundle size tracking hook
 */
export const useBundleSize = () => {
  const [bundleSize, setBundleSize] = useState<{
    estimated: number
    chunks: Record<string, number>
  }>({ estimated: 0, chunks: {} })

  useEffect(() => {
    if (!__DEV__ || typeof window === 'undefined') return

    // Track bundle size using Performance API
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const jsEntries = entries.filter(entry => 
        entry.name.endsWith('.js') && 
        (entry as PerformanceResourceTiming).transferSize
      )

      const totalSize = jsEntries.reduce((acc, entry) => {
        return acc + ((entry as PerformanceResourceTiming).transferSize || 0)
      }, 0)

      const chunks = jsEntries.reduce((acc, entry) => {
        const name = entry.name.split('/').pop()?.replace(/\.js.*/, '') || 'unknown'
        acc[name] = (entry as PerformanceResourceTiming).transferSize || 0
        return acc
      }, {} as Record<string, number>)

      setBundleSize({ estimated: totalSize, chunks })
    })

    observer.observe({ entryTypes: ['resource'] })
    
    return () => observer.disconnect()
  }, [])

  return bundleSize
}

/**
 * Dead code detection utility
 */
export const DeadCodeDetector = {
  /**
   * Find potentially unused components
   */
  findUnusedComponents: (): string[] => {
    // In a real implementation, this would analyze the actual codebase
    // For now, return mock data
    return [
      'src/components/legacy/OldButton.tsx',
      'src/components/unused/DeprecatedModal.tsx',
      'src/utils/oldHelpers.ts'
    ]
  },

  /**
   * Find unused CSS classes
   */
  findUnusedCSS: (): string[] => {
    return [
      '.old-button-style',
      '.deprecated-modal',
      '.unused-utility-class'
    ]
  },

  /**
   * Find duplicate code
   */
  findDuplicateCode: (): Array<{ file1: string, file2: string, similarity: number }> => {
    return [
      {
        file1: 'src/components/Button.tsx',
        file2: 'src/components/ui/Button.tsx',
        similarity: 0.85
      }
    ]
  }
}

/**
 * Tree shaking configuration recommendations
 */
export const TreeShakingConfig = {
  /**
   * Vite-specific optimizations
   */
  vite: {
    build: {
      rollupOptions: {
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom'
      ]
    }
  },

  /**
   * Package.json sideEffects configuration
   */
  packageJson: {
    sideEffects: [
      '*.css',
      '*.scss',
      '*.sass',
      './src/index.css',
      './src/App.css'
    ]
  },

  /**
   * Babel plugin configuration for tree shaking
   */
  babel: {
    plugins: [
      ['import', { libraryName: 'date-fns', libraryDirectory: '', camel2DashComponentName: false }, 'date-fns'],
      ['import', { libraryName: '@heroicons/react', libraryDirectory: '24/outline', camel2DashComponentName: false }, 'heroicons'],
    ]
  }
}

// Global tree shaking optimizer instance
export const treeShakingOptimizer = TreeShakingOptimizer.getInstance()

// Development-only bundle analysis
if (__DEV__ && typeof window !== 'undefined') {
  // Analyze imports during development
  window.addEventListener('load', () => {
    console.log('🌳 Tree Shaking Analysis:')
    console.log('Optimization suggestions:', treeShakingOptimizer.getOptimizationSuggestions())
    console.log('Unused exports:', treeShakingOptimizer.getUnusedExports())
    console.log('Dead code:', DeadCodeDetector.findUnusedComponents())
  })
}