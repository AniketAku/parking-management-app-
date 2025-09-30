// Vite Configuration for Performance Optimization
// Enhanced Vite config with bundle analysis and optimization settings

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Optimize JSX
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: [
          // Remove PropTypes in production
          process.env.NODE_ENV === 'production' && ['babel-plugin-transform-remove-prop-types', { removeImport: true }],
          // Optimize React components
          process.env.NODE_ENV === 'production' && ['babel-plugin-transform-react-remove-prop-types'],
        ].filter(Boolean),
      },
    }),
    
    // Code splitting for better performance
    splitVendorChunkPlugin(),
    
    // Bundle analyzer
    process.env.ANALYZE && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@types': resolve(__dirname, 'src/types'),
      '@styles': resolve(__dirname, 'src/styles'),
    },
  },

  // Build optimization
  build: {
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        // Remove unused code
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        // Keep function names for better error reporting
        keep_fnames: process.env.NODE_ENV === 'development',
      },
    },

    // Rollup options for advanced bundling
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          
          // State management
          'state-vendor': ['zustand'],
          
          // HTTP and WebSocket
          'network-vendor': ['axios', 'socket.io-client'],
          
          // Charts and visualization
          'chart-vendor': ['recharts', 'date-fns'],
          
          // Accessibility
          'a11y-vendor': ['focus-trap', 'aria-hidden'],
          
          // Utilities
          'util-vendor': ['clsx', 'react-hook-form', '@hookform/resolvers', 'zod'],
        },
        
        // Optimize chunk loading
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes('vendor')) {
            return 'vendor/[name]-[hash].js'
          }
          return 'chunks/[name]-[hash].js'
        },
        
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return 'styles/[name]-[hash][extname]'
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return 'images/[name]-[hash][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
      
      // External dependencies (for library mode)
      external: process.env.BUILD_MODE === 'library' ? [
        'react',
        'react-dom',
        'react-router-dom',
      ] : [],
    },

    // Performance budgets
    chunkSizeWarningLimit: 500, // 500KB warning
    
    // CSS code splitting
    cssCodeSplit: true,
  },

  // Development server optimization
  server: {
    // Enable file system caching
    fs: {
      strict: false,
    },
    
    // CORS configuration
    cors: true,
    
    // HMR optimization
    hmr: {
      overlay: true,
    },
  },

  // Preview server for production builds
  preview: {
    port: 3000,
    strictPort: true,
    cors: true,
  },

  // Dependency optimization
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'axios',
      'socket.io-client',
      'recharts',
      'date-fns',
      'clsx',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
    ],
    
    // Exclude from pre-bundling
    exclude: [
      // Large libraries that should be loaded on-demand
      '@accessibility/validator',
    ],
  },

  // Environment variables
  define: {
    // Runtime environment detection
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    
    // Performance monitoring
    __ENABLE_PERFORMANCE_MONITORING__: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    __ENABLE_BUNDLE_ANALYSIS__: process.env.ANALYZE === 'true',
  },

  // CSS optimization
  css: {
    // CSS modules configuration
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:5]' 
        : '[name]__[local]__[hash:base64:5]',
    },
    
    // PostCSS configuration
    postcss: {
      plugins: [
        // Autoprefixer for browser compatibility
        require('autoprefixer'),
        
        // CSS optimization for production
        ...(process.env.NODE_ENV === 'production' ? [
          require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            }],
          }),
        ] : []),
      ],
    },
  },

  // Experimental features
  experimental: {
    // Enable render on demand for better dev performance
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      }
      return { relative: true }
    },
  },

  // Worker optimization
  worker: {
    format: 'es',
    plugins: [
      // Optimize service worker
      react(),
    ],
  },

  // JSON optimization
  json: {
    stringify: true,
  },
})