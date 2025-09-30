// Accessibility Test Runner Component
// Provides automated accessibility testing interface and reporting

import React, { useState, useEffect } from 'react'
import { AccessibilityValidator, generateAccessibilityReportHTML } from '../../utils/accessibilityTesting'
import type { AccessibilityReport } from '../../utils/accessibilityTesting'
import { StatusAnnouncer } from '../ui/ScreenReaderSupport'
import { AccessibleTextInput } from '../ui/AccessibleInput'

interface AccessibilityTestRunnerProps {
  onReport?: (report: AccessibilityReport) => void
  autoRun?: boolean
  className?: string
}

export const AccessibilityTestRunner: React.FC<AccessibilityTestRunnerProps> = ({
  onReport,
  autoRun = false,
  className = '',
}) => {
  const [report, setReport] = useState<AccessibilityReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  const [elementSelector, setElementSelector] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const validator = new AccessibilityValidator()

  // Auto-run on mount if enabled
  useEffect(() => {
    if (autoRun) {
      runFullAudit()
    }
  }, [autoRun])

  const runFullAudit = async () => {
    setIsRunning(true)
    setError(null)
    setStatusMessage('Starting accessibility audit...')

    try {
      const auditReport = await validator.runAudit()
      setReport(auditReport)
      setStatusMessage(`Audit completed! Score: ${auditReport.score.toFixed(1)}/100 (${auditReport.level})`)
      onReport?.(auditReport)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setStatusMessage('Audit failed')
    } finally {
      setIsRunning(false)
    }
  }

  const runElementAudit = async () => {
    if (!selectedElement) {
      setError('No element selected for testing')
      return
    }

    setIsRunning(true)
    setError(null)
    setStatusMessage('Testing selected element...')

    try {
      const auditReport = await validator.runAudit(selectedElement)
      setReport(auditReport)
      setStatusMessage(`Element audit completed! Score: ${auditReport.score.toFixed(1)}/100`)
      onReport?.(auditReport)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setStatusMessage('Element audit failed')
    } finally {
      setIsRunning(false)
    }
  }

  const selectElementBySelector = () => {
    try {
      const element = document.querySelector(elementSelector) as HTMLElement
      if (element) {
        setSelectedElement(element)
        setError(null)
        setStatusMessage(`Selected element: ${elementSelector}`)
      } else {
        setError(`Element not found: ${elementSelector}`)
      }
    } catch (err) {
      setError(`Invalid selector: ${elementSelector}`)
    }
  }

  const downloadReport = () => {
    if (!report) return

    const html = generateAccessibilityReportHTML(report)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyReportToClipboard = async () => {
    if (!report) return

    const reportText = `
Accessibility Report
Score: ${report.score.toFixed(1)}/100 (${report.level})
Total Issues: ${report.summary.total}
Errors: ${report.summary.errors}
Warnings: ${report.summary.warnings}

Issues:
${report.issues.map(issue => `- ${issue.type.toUpperCase()}: ${issue.message} (${issue.wcagCriterion})`).join('\n')}

Recommendations:
${report.recommendations.map(rec => `- ${rec}`).join('\n')}
    `.trim()

    try {
      await navigator.clipboard.writeText(reportText)
      setStatusMessage('Report copied to clipboard')
    } catch (err) {
      setError('Failed to copy report to clipboard')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'AAA': return 'bg-green-100 text-green-800'
      case 'AA': return 'bg-blue-100 text-blue-800'
      case 'A': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Accessibility Test Runner
        </h2>
        <div className="flex space-x-2">
          {report && (
            <>
              <button
                onClick={copyReportToClipboard}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              >
                Copy Report
              </button>
              <button
                onClick={downloadReport}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isRunning}
              >
                Download HTML
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Full Page Audit</h3>
          <button
            onClick={runFullAudit}
            disabled={isRunning}
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Audit...' : 'Run Full Accessibility Audit'}
          </button>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Comprehensive WCAG 2.1 AA compliance check for the entire page
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Element-Specific Audit</h3>
          <div className="flex space-x-2">
            <AccessibleTextInput
              label="CSS Selector"
              value={elementSelector}
              onChange={setElementSelector}
              placeholder="e.g., #main-content, .form-group"
              className="flex-1"
            />
            <button
              onClick={selectElementBySelector}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Select
            </button>
          </div>
          {selectedElement && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ Selected: {selectedElement.tagName.toLowerCase()}
              {selectedElement.id && `#${selectedElement.id}`}
              {selectedElement.className && `.${selectedElement.className.split(' ')[0]}`}
            </div>
          )}
          <button
            onClick={runElementAudit}
            disabled={isRunning || !selectedElement}
            className="w-full px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Testing Element...' : 'Test Selected Element'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      <StatusAnnouncer message={statusMessage} priority="polite" />
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Score Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Accessibility Score</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelBadgeColor(report.level)}`}>
                WCAG {report.level}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
                  {report.score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{report.summary.errors}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{report.summary.warnings}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{report.summary.passed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
                🎯 Recommendations
              </h3>
              <ul className="space-y-2">
                {report.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
                    <span className="text-blue-800 dark:text-blue-200">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues List */}
          {report.issues.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Issues Found ({report.issues.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {report.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      issue.type === 'error'
                        ? 'bg-red-50 border-red-400 dark:bg-red-900/20'
                        : issue.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20'
                        : 'bg-blue-50 border-blue-400 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mr-2 ${
                              issue.type === 'error'
                                ? 'bg-red-100 text-red-800'
                                : issue.type === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {issue.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            WCAG {issue.wcagCriterion}
                          </span>
                        </div>
                        <h4 className="font-medium mt-1">{issue.message}</h4>
                        {issue.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Suggestions:
                            </p>
                            <ul className="mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {issue.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          issue.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          issue.element.classList.add('accessibility-highlight')
                          setTimeout(() => {
                            issue.element.classList.remove('accessibility-highlight')
                          }, 3000)
                        }}
                        className="ml-4 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                        title="Highlight element in page"
                      >
                        Locate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.issues.length === 0 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                No Accessibility Issues Found!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                The tested content meets WCAG 2.1 AA accessibility standards.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help Information */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium mb-2">About This Tool</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          This accessibility testing tool checks for WCAG 2.1 AA compliance including:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Semantic HTML structure and landmarks</li>
          <li>• Keyboard accessibility and focus management</li>
          <li>• Color contrast ratios (4.5:1 for normal text, 3:1 for large text)</li>
          <li>• Form accessibility and labeling</li>
          <li>• Image alternative text</li>
          <li>• ARIA usage and screen reader support</li>
          <li>• Heading structure and navigation</li>
          <li>• Link and table accessibility</li>
        </ul>
      </div>
    </div>
  )
}

export default AccessibilityTestRunner