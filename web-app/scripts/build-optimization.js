#!/usr/bin/env node

/**
 * Build Optimization Script - Advanced Bundle Analysis and Optimization
 * Analyzes bundle size, provides optimization recommendations, and generates reports
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { resolve, relative, extname, basename } from 'path'
import { execSync } from 'child_process'
import { glob } from 'glob'

// Configuration
const config = {
  srcDir: resolve(process.cwd(), 'src'),
  distDir: resolve(process.cwd(), 'dist'),
  reportDir: resolve(process.cwd(), 'reports'),
  maxBundleSize: 500 * 1024, // 500KB
  maxChunkSize: 250 * 1024,  // 250KB
  targetGzipRatio: 0.3       // 30% of original size
}

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Logger utility
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  section: (title) => console.log(`\n${colors.cyan}${colors.bright}📊 ${title}${colors.reset}`),
  metric: (label, value, unit = '') => console.log(`  ${colors.magenta}${label}:${colors.reset} ${value}${unit}`)
}

/**
 * Bundle Analysis Class
 */
class BundleAnalyzer {
  constructor() {
    this.analysis = {
      totalSize: 0,
      totalGzipSize: 0,
      chunks: [],
      assets: [],
      duplicates: [],
      unusedFiles: [],
      importAnalysis: {},
      performanceScore: 0
    }
  }

  /**
   * Analyze built bundle
   */
  async analyzeBuild() {
    log.section('Bundle Analysis')

    if (!existsSync(config.distDir)) {
      log.error('Build directory not found. Run build first.')
      process.exit(1)
    }

    // Analyze JavaScript chunks
    await this.analyzeJSChunks()

    // Analyze CSS files
    await this.analyzeCSSFiles()

    // Analyze assets
    await this.analyzeAssets()

    // Find duplicates
    await this.findDuplicates()

    // Analyze imports
    await this.analyzeImports()

    // Calculate performance score
    this.calculatePerformanceScore()

    // Generate recommendations
    this.generateRecommendations()

    return this.analysis
  }

  /**
   * Analyze JavaScript chunks
   */
  async analyzeJSChunks() {
    const jsFiles = glob.sync('**/*.js', { cwd: config.distDir })
    
    for (const file of jsFiles) {
      const filePath = resolve(config.distDir, file)
      const stats = statSync(filePath)
      const content = readFileSync(filePath, 'utf8')
      
      // Estimate gzipped size (rough approximation)
      const gzipSize = Math.floor(stats.size * 0.3)
      
      const chunk = {
        name: basename(file, '.js'),
        path: relative(config.distDir, filePath),
        size: stats.size,
        gzipSize,
        type: this.getChunkType(file),
        modules: this.extractModules(content),
        treeshakeable: this.isTreeshakeable(content)
      }

      this.analysis.chunks.push(chunk)
      this.analysis.totalSize += stats.size
      this.analysis.totalGzipSize += gzipSize

      // Check size warnings
      if (stats.size > config.maxChunkSize) {
        log.warn(`Large chunk detected: ${file} (${this.formatBytes(stats.size)})`)
      }
    }

    log.success(`Analyzed ${jsFiles.length} JavaScript chunks`)
  }

  /**
   * Analyze CSS files
   */
  async analyzeCSSFiles() {
    const cssFiles = glob.sync('**/*.css', { cwd: config.distDir })
    
    for (const file of cssFiles) {
      const filePath = resolve(config.distDir, file)
      const stats = statSync(filePath)
      const gzipSize = Math.floor(stats.size * 0.2) // CSS compresses better
      
      const asset = {
        name: basename(file),
        path: relative(config.distDir, filePath),
        size: stats.size,
        gzipSize,
        type: 'css'
      }

      this.analysis.assets.push(asset)
      this.analysis.totalSize += stats.size
      this.analysis.totalGzipSize += gzipSize
    }
  }

  /**
   * Analyze other assets
   */
  async analyzeAssets() {
    const assetFiles = glob.sync('**/*.{png,jpg,jpeg,svg,woff,woff2,ico}', { 
      cwd: config.distDir 
    })
    
    for (const file of assetFiles) {
      const filePath = resolve(config.distDir, file)
      const stats = statSync(filePath)
      
      const asset = {
        name: basename(file),
        path: relative(config.distDir, filePath),
        size: stats.size,
        gzipSize: stats.size, // Assets don't compress much
        type: extname(file).slice(1)
      }

      this.analysis.assets.push(asset)
      this.analysis.totalSize += stats.size
      this.analysis.totalGzipSize += stats.size
    }
  }

  /**
   * Find duplicate modules
   */
  async findDuplicates() {
    const moduleMap = new Map()
    
    for (const chunk of this.analysis.chunks) {
      for (const module of chunk.modules) {
        if (!moduleMap.has(module)) {
          moduleMap.set(module, [])
        }
        moduleMap.get(module).push(chunk.name)
      }
    }

    for (const [module, chunks] of moduleMap) {
      if (chunks.length > 1) {
        this.analysis.duplicates.push({
          module,
          chunks,
          count: chunks.length
        })
      }
    }
  }

  /**
   * Analyze import patterns
   */
  async analyzeImports() {
    const srcFiles = glob.sync('**/*.{ts,tsx,js,jsx}', { cwd: config.srcDir })
    
    const importPattern = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
    const importCounts = new Map()

    for (const file of srcFiles) {
      const filePath = resolve(config.srcDir, file)
      const content = readFileSync(filePath, 'utf8')
      
      let match
      while ((match = importPattern.exec(content)) !== null) {
        const module = match[1]
        if (!importCounts.has(module)) {
          importCounts.set(module, 0)
        }
        importCounts.set(module, importCounts.get(module) + 1)
      }
    }

    // Sort by usage count
    this.analysis.importAnalysis = Array.from(importCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .reduce((obj, [module, count]) => {
        obj[module] = count
        return obj
      }, {})
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore() {
    let score = 100

    // Deduct points for large bundle size
    if (this.analysis.totalSize > config.maxBundleSize) {
      score -= Math.min(30, (this.analysis.totalSize - config.maxBundleSize) / (config.maxBundleSize * 0.1))
    }

    // Deduct points for poor gzip ratio
    const gzipRatio = this.analysis.totalGzipSize / this.analysis.totalSize
    if (gzipRatio > config.targetGzipRatio) {
      score -= (gzipRatio - config.targetGzipRatio) * 100
    }

    // Deduct points for duplicates
    score -= this.analysis.duplicates.length * 2

    // Deduct points for large chunks
    const largeChunks = this.analysis.chunks.filter(chunk => chunk.size > config.maxChunkSize)
    score -= largeChunks.length * 5

    this.analysis.performanceScore = Math.max(0, Math.floor(score))
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = []

    // Bundle size recommendations
    if (this.analysis.totalSize > config.maxBundleSize) {
      recommendations.push({
        type: 'critical',
        title: 'Bundle size exceeds recommended limit',
        description: `Total bundle size is ${this.formatBytes(this.analysis.totalSize)}, recommended: ${this.formatBytes(config.maxBundleSize)}`,
        actions: [
          'Implement code splitting',
          'Remove unused dependencies',
          'Use tree shaking optimizations'
        ]
      })
    }

    // Large chunk recommendations
    const largeChunks = this.analysis.chunks.filter(chunk => chunk.size > config.maxChunkSize)
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Large chunks detected',
        description: `${largeChunks.length} chunks exceed ${this.formatBytes(config.maxChunkSize)}`,
        actions: [
          'Split large vendor chunks',
          'Implement lazy loading for large components',
          'Use dynamic imports'
        ]
      })
    }

    // Duplicate module recommendations
    if (this.analysis.duplicates.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Duplicate modules found',
        description: `${this.analysis.duplicates.length} modules are duplicated across chunks`,
        actions: [
          'Optimize chunk splitting strategy',
          'Use splitChunks.cacheGroups',
          'Review import patterns'
        ]
      })
    }

    // Tree shaking recommendations
    const nonTreeshakeableChunks = this.analysis.chunks.filter(chunk => !chunk.treeshakeable)
    if (nonTreeshakeableChunks.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Tree shaking opportunities',
        description: `${nonTreeshakeableChunks.length} chunks could benefit from better tree shaking`,
        actions: [
          'Use named imports instead of default imports',
          'Configure sideEffects: false in package.json',
          'Remove unused exports'
        ]
      })
    }

    this.analysis.recommendations = recommendations
  }

  /**
   * Helper methods
   */
  getChunkType(filename) {
    if (filename.includes('vendor')) return 'vendor'
    if (filename.includes('runtime')) return 'runtime'
    if (filename.includes('main')) return 'main'
    return 'async'
  }

  extractModules(content) {
    // Simple regex to extract module names (this is a simplified version)
    const modulePattern = /\/\*\s*webpack\/runtime\/([\w-]+)\s*\*\//g
    const modules = []
    let match

    while ((match = modulePattern.exec(content)) !== null) {
      modules.push(match[1])
    }

    return modules.length > 0 ? modules : ['unknown']
  }

  isTreeshakeable(content) {
    // Check for ESM exports and imports
    return content.includes('export {') || content.includes('import {')
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
}

/**
 * Report Generator
 */
class ReportGenerator {
  constructor(analysis) {
    this.analysis = analysis
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    // Console report
    this.printConsoleReport()

    // JSON report
    this.generateJSONReport()

    // HTML report
    this.generateHTMLReport()
  }

  /**
   * Print console report
   */
  printConsoleReport() {
    log.section('Bundle Report')

    // Overall metrics
    log.metric('Total Size', this.formatBytes(this.analysis.totalSize))
    log.metric('Gzipped Size', this.formatBytes(this.analysis.totalGzipSize))
    log.metric('Compression Ratio', `${((1 - this.analysis.totalGzipSize / this.analysis.totalSize) * 100).toFixed(1)}%`)
    log.metric('Performance Score', `${this.analysis.performanceScore}/100`)

    // Chunks breakdown
    log.section('Chunks Breakdown')
    this.analysis.chunks
      .sort((a, b) => b.size - a.size)
      .forEach(chunk => {
        const sizeStr = this.formatBytes(chunk.size)
        const gzipStr = this.formatBytes(chunk.gzipSize)
        console.log(`  ${chunk.name}: ${sizeStr} (${gzipStr} gzipped)`)
      })

    // Top imports
    log.section('Most Used Imports')
    Object.entries(this.analysis.importAnalysis)
      .slice(0, 10)
      .forEach(([module, count]) => {
        console.log(`  ${module}: ${count} imports`)
      })

    // Recommendations
    if (this.analysis.recommendations?.length > 0) {
      log.section('Recommendations')
      this.analysis.recommendations.forEach(rec => {
        const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`\n  ${icon} ${rec.title}`)
        console.log(`     ${rec.description}`)
        rec.actions.forEach(action => {
          console.log(`     • ${action}`)
        })
      })
    }

    // Performance grade
    log.section('Performance Grade')
    const grade = this.getPerformanceGrade(this.analysis.performanceScore)
    const gradeColor = grade.color
    console.log(`  ${gradeColor}${grade.letter} (${this.analysis.performanceScore}/100)${colors.reset}`)
    console.log(`  ${grade.description}`)
  }

  /**
   * Generate JSON report
   */
  generateJSONReport() {
    const reportPath = resolve(config.reportDir, 'bundle-analysis.json')
    
    // Ensure report directory exists
    execSync(`mkdir -p ${config.reportDir}`, { stdio: 'ignore' })
    
    writeFileSync(reportPath, JSON.stringify({
      ...this.analysis,
      timestamp: new Date().toISOString(),
      config
    }, null, 2))

    log.success(`JSON report saved: ${reportPath}`)
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const htmlContent = this.generateHTMLContent()
    const reportPath = resolve(config.reportDir, 'bundle-analysis.html')
    
    writeFileSync(reportPath, htmlContent)
    log.success(`HTML report saved: ${reportPath}`)
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent() {
    const grade = this.getPerformanceGrade(this.analysis.performanceScore)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .grade { font-size: 48px; font-weight: bold; color: ${grade.colorHex}; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .chunk { display: flex; justify-content: space-between; padding: 8px 0; }
        .recommendation { margin-bottom: 15px; padding: 15px; border-radius: 4px; }
        .critical { background: #fee; border-left: 4px solid #e53e3e; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .info { background: #ebf8ff; border-left: 4px solid #3182ce; }
        .chart { height: 300px; margin: 20px 0; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bundle Analysis Report</h1>
            <div class="grade">${grade.letter}</div>
            <div>Performance Score: ${this.analysis.performanceScore}/100</div>
            <div>Generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="card">
            <h2>Bundle Overview</h2>
            <div class="metric">
                <span>Total Size</span>
                <strong>${this.formatBytes(this.analysis.totalSize)}</strong>
            </div>
            <div class="metric">
                <span>Gzipped Size</span>
                <strong>${this.formatBytes(this.analysis.totalGzipSize)}</strong>
            </div>
            <div class="metric">
                <span>Compression Ratio</span>
                <strong>${((1 - this.analysis.totalGzipSize / this.analysis.totalSize) * 100).toFixed(1)}%</strong>
            </div>
            <div class="metric">
                <span>Chunks Count</span>
                <strong>${this.analysis.chunks.length}</strong>
            </div>
        </div>

        <div class="card">
            <h2>Chunks Breakdown</h2>
            <div class="chart">
                <canvas id="chunksChart"></canvas>
            </div>
            ${this.analysis.chunks.map(chunk => `
                <div class="chunk">
                    <span>${chunk.name} (${chunk.type})</span>
                    <span>${this.formatBytes(chunk.size)} / ${this.formatBytes(chunk.gzipSize)} gzipped</span>
                </div>
            `).join('')}
        </div>

        ${this.analysis.recommendations?.length > 0 ? `
        <div class="card">
            <h2>Recommendations</h2>
            ${this.analysis.recommendations.map(rec => `
                <div class="recommendation ${rec.type}">
                    <h3>${rec.title}</h3>
                    <p>${rec.description}</p>
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>

    <script>
        const ctx = document.getElementById('chunksChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(this.analysis.chunks.map(c => c.name))},
                datasets: [{
                    data: ${JSON.stringify(this.analysis.chunks.map(c => c.size))},
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Bundle Size by Chunk' }
                }
            }
        });
    </script>
</body>
</html>
    `
  }

  /**
   * Helper methods
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  getPerformanceGrade(score) {
    if (score >= 90) return { letter: 'A', description: 'Excellent performance', color: colors.green, colorHex: '#10B981' }
    if (score >= 80) return { letter: 'B', description: 'Good performance', color: colors.cyan, colorHex: '#06B6D4' }
    if (score >= 70) return { letter: 'C', description: 'Average performance', color: colors.yellow, colorHex: '#F59E0B' }
    if (score >= 60) return { letter: 'D', description: 'Below average performance', color: colors.magenta, colorHex: '#EF4444' }
    return { letter: 'F', description: 'Poor performance', color: colors.red, colorHex: '#DC2626' }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    log.info('Starting build optimization analysis...')

    // Run build analysis
    const analyzer = new BundleAnalyzer()
    const analysis = await analyzer.analyzeBuild()

    // Generate reports
    const reporter = new ReportGenerator(analysis)
    reporter.generateReport()

    // Exit with appropriate code
    const exitCode = analysis.performanceScore >= 70 ? 0 : 1
    process.exit(exitCode)

  } catch (error) {
    log.error(`Analysis failed: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { BundleAnalyzer, ReportGenerator }