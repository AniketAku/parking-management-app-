/**
 * Vite Performance Configuration - Advanced Bundle Optimization
 * Features: Tree shaking, code splitting, bundle analysis, performance monitoring
 */

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'
import type { OutputOptions, ManualChunksOption } from 'rollup'

// Custom plugin for performance monitoring
const performanceMonitoringPlugin = (): Plugin => ({
  name: 'performance-monitoring',
  generateBundle(options, bundle) {
    const chunks = Object.values(bundle)
    const totalSize = chunks.reduce((acc, chunk) => {
      return acc + (chunk.type === 'chunk' ? chunk.code.length : 0)
    }, 0)

    console.log(`📦 Bundle Analysis:`)
    console.log(`  Total size: ${(totalSize / 1024).toFixed(2)} KB`)
    console.log(`  Chunks: ${chunks.filter(c => c.type === 'chunk').length}`)
    console.log(`  Assets: ${chunks.filter(c => c.type === 'asset').length}`)

    // Performance warnings
    const largeChunks = chunks.filter(
      chunk => chunk.type === 'chunk' && chunk.code.length > 500 * 1024
    )
    
    if (largeChunks.length > 0) {
      console.warn(`⚠️  Large chunks detected (>500KB):`)
      largeChunks.forEach(chunk => {
        console.warn(`  - ${chunk.fileName}: ${(chunk.code.length / 1024).toFixed(2)} KB`)
      })
    }
  }
})

// Advanced manual chunk splitting strategy
const createManualChunks = (): ManualChunksOption => {
  return (id: string) => {
    // React ecosystem
    if (id.includes('node_modules/react') || 
        id.includes('node_modules/react-dom') ||
        id.includes('node_modules/react-router')) {
      return 'react-vendor'
    }

    // State management
    if (id.includes('node_modules/zustand') || 
        id.includes('node_modules/@tanstack/react-query')) {
      return 'state-vendor'
    }

    // UI Components and Animation
    if (id.includes('node_modules/@headlessui') ||
        id.includes('node_modules/@heroicons') ||
        id.includes('node_modules/framer-motion')) {
      return 'ui-vendor'
    }

    // Network and WebSocket
    if (id.includes('node_modules/axios') ||
        id.includes('node_modules/socket.io-client') ||
        id.includes('node_modules/@supabase')) {
      return 'network-vendor'
    }

    // Charts and Data Visualization
    if (id.includes('node_modules/recharts') ||
        id.includes('node_modules/date-fns')) {
      return 'chart-vendor'
    }

    // Form handling
    if (id.includes('node_modules/react-hook-form') ||
        id.includes('node_modules/@hookform') ||
        id.includes('node_modules/zod')) {
      return 'form-vendor'
    }

    // Utilities and small libraries
    if (id.includes('node_modules/clsx') ||
        id.includes('node_modules/react-hot-toast') ||
        id.includes('node_modules/web-vitals')) {
      return 'utils-vendor'
    }

    // Performance and monitoring
    if (id.includes('components/optimized') ||
        id.includes('hooks/usePerformance') ||
        id.includes('utils/performanceMonitor')) {
      return 'performance'
    }

    // Large async components (lazy-loaded)
    if (id.includes('pages/') || id.includes('components/reports/')) {
      return 'async-pages'
    }

    // Default vendor chunk for remaining node_modules
    if (id.includes('node_modules/')) {
      return 'vendor-misc'
    }
  }
}

export default defineConfig({
  plugins: [
    // React plugin with optimizations
    react({
      fastRefresh: true,
      babel: {
        plugins: [
          // Remove PropTypes and console statements in production
          ...(process.env.NODE_ENV === 'production' ? [
            ['babel-plugin-transform-remove-prop-types', { removeImport: true }],
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
          ] : []),
        ],
      },
    }),

    // PWA plugin with enhanced caching
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      includeAssets: ['offline.html', 'icons/*.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        // Enhanced runtime caching
        runtimeCaching: [
          // Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // API Statistics (frequent updates)
          {
            urlPattern: /\/api\/parking\/statistics/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'statistics-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          },
          // API Entries (moderate updates)
          {
            urlPattern: /\/api\/parking\/entries/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'entries-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30 // 30 minutes
              },
              networkTimeoutSeconds: 3
            }
          },
          // Static assets
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    }),

    // Advanced vendor chunk splitting
    splitVendorChunkPlugin(),

    // Performance monitoring plugin
    performanceMonitoringPlugin(),

    // Bundle analyzer (only when ANALYZE=true)
    ...(process.env.ANALYZE === 'true' ? [
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
        title: 'Bundle Analysis - Parking Management App'
      })
    ] : []),
  ],

  // Path resolution with performance aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@optimized': resolve(__dirname, 'src/components/optimized'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@types': resolve(__dirname, 'src/types'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@pages': resolve(__dirname, 'src/pages'),
    },
  },

  // Enhanced build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: [
          'console.log', 
          'console.info', 
          'console.debug', 
          'console.trace'
        ],
        // Advanced optimizations
        passes: 2,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        // Tree shaking enhancements
        toplevel: true,
        keep_fargs: false,
      },
      mangle: {
        keep_fnames: process.env.NODE_ENV === 'development',
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    },

    // Advanced Rollup configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      // Tree shaking optimization
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false,
      },

      output: {
        // Advanced manual chunking
        manualChunks: createManualChunks(),
        
        // Optimized file naming
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes('vendor')) {
            return 'vendor/[name]-[hash:8].js'
          }
          if (chunkInfo.name === 'performance') {
            return 'performance/[name]-[hash:8].js'
          }
          return 'chunks/[name]-[hash:8].js'
        },
        
        entryFileNames: 'entry/[name]-[hash:8].js',
        
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset'
          if (/\.css$/.test(name)) {
            return 'styles/[name]-[hash:8][extname]'
          }
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(name)) {
            return 'images/[name]-[hash:8][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
            return 'fonts/[name]-[hash:8][extname]'
          }
          return 'assets/[name]-[hash:8][extname]'
        },
        
        // Advanced output optimizations
        generatedCode: {
          preset: 'es2015',
          arrowFunctions: true,
          constBindings: true,
          objectShorthand: true,
        },
        
        // Hoisting optimizations
        hoistTransitiveImports: true,
        
        // Interop optimizations
        interop: 'auto',
      },
    },

    // Performance budgets
    chunkSizeWarningLimit: 500, // 500KB warning
    assetsInlineLimit: 4096, // 4KB inline limit
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // CSS optimization
    cssMinify: 'lightningcss',
    
    // Asset optimization
    assetsDir: 'assets',
    
    // Enable library mode for component library builds
    ...(process.env.BUILD_MODE === 'library' && {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ParkingManagement',
        formats: ['es', 'umd'],
        fileName: (format) => `parking-management.${format}.js`
      },
    }),
  },

  // Development server optimization
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    
    // HMR optimizations
    hmr: {
      overlay: true,
      clientPort: 3000,
    },
    
    // File system optimizations
    fs: {
      strict: false,
      allow: ['..'],
    },
    
    // CORS
    cors: true,
    
    // Proxy configuration for API
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 10000,
      },
    },
  },

  // Preview server
  preview: {
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  },

  // Enhanced dependency optimization
  optimizeDeps: {
    include: [
      // Core dependencies
      'react',
      'react-dom',
      'react-router-dom',
      
      // State management
      'zustand',
      '@tanstack/react-query',
      
      // Network
      'axios',
      'socket.io-client',
      '@supabase/supabase-js',
      
      // UI
      '@headlessui/react',
      '@heroicons/react',
      'framer-motion',
      
      // Forms
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      
      // Charts
      'recharts',
      'date-fns',
      
      // Utils
      'clsx',
      'react-hot-toast',
      'web-vitals',
    ],
    
    exclude: [
      // Large optional dependencies
      '@types/node',
      '@testing-library/react',
      '@testing-library/jest-dom',
      'vitest',
      'axe-core',
    ],
    
    // Force pre-bundling for better performance
    force: process.env.NODE_ENV === 'development',
  },

  // Environment variables with performance flags
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __ENABLE_PERFORMANCE_MONITORING__: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    __ENABLE_BUNDLE_ANALYSIS__: process.env.ANALYZE === 'true',
    __ENABLE_VIRTUALIZATION__: process.env.ENABLE_VIRTUALIZATION !== 'false',
    
    // Feature flags for gradual rollout
    __ENABLE_OPTIMIZED_COMPONENTS__: process.env.ENABLE_OPTIMIZED_COMPONENTS !== 'false',
    __ENABLE_CODE_SPLITTING__: process.env.ENABLE_CODE_SPLITTING !== 'false',
    __ENABLE_SERVICE_WORKER__: process.env.ENABLE_SERVICE_WORKER !== 'false',
  },

  // Enhanced CSS processing
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:6]' 
        : '[name]__[local]__[hash:base64:4]',
    },
    
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/variables.scss";`
      }
    },
  },

  // Worker optimization
  worker: {
    format: 'es',
    plugins: () => [react()],
  },

  // JSON optimization
  json: {
    stringify: true,
  },

  // Logging configuration
  logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  clearScreen: false,

  // Custom logger for performance metrics
  customLogger: {
    info: (msg: string, options?: any) => {
      if (msg.includes('Bundle') || msg.includes('Performance')) {
        console.log(`🚀 ${msg}`, options)
      } else {
        console.log(msg, options)
      }
    },
    warn: (msg: string, options?: any) => {
      console.warn(`⚠️ ${msg}`, options)
    },
    error: (msg: string, options?: any) => {
      console.error(`❌ ${msg}`, options)
    }
  },
})