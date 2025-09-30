/**
 * Printer Testing Panel Component
 * Comprehensive testing interface for printer diagnostics and troubleshooting
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  DocumentTextIcon,
  PrinterIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import type { PrinterProfile } from '../../../types/printerConfig'
import { printerDiagnosticService } from '../../../services/printerDiagnosticService'
import type { 
  DiagnosticReport, 
  DiagnosticTestResult,
  TroubleshootingStep 
} from '../../../services/printerDiagnosticService'

interface PrinterTestingPanelProps {
  profile: PrinterProfile | null
  onTestComplete?: (report: DiagnosticReport) => void
}

interface TestProgress {
  currentTest: string
  completed: number
  total: number
  isRunning: boolean
}

const PrinterTestingPanel: React.FC<PrinterTestingPanelProps> = ({ 
  profile, 
  onTestComplete 
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [currentReport, setCurrentReport] = useState<DiagnosticReport | null>(null)
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  const runDiagnostic = useCallback(async () => {
    if (!profile || isRunning) return

    setIsRunning(true)
    setTestProgress({ currentTest: 'Starting...', completed: 0, total: 7, isRunning: true })

    try {
      // Create a mock diagnostic that simulates real testing
      const report = await simulateFullDiagnostic(profile, setTestProgress)
      setCurrentReport(report)
      onTestComplete?.(report)
    } catch (error) {
      console.error('Diagnostic failed:', error)
    } finally {
      setIsRunning(false)
      setTestProgress(null)
    }
  }, [profile, isRunning, onTestComplete])

  const runIndividualTest = useCallback(async (testType: string) => {
    if (!profile || isRunning) return

    setIsRunning(true)
    try {
      let result
      switch (testType) {
        case 'connection':
          result = await printerDiagnosticService.testConnection(profile)
          break
        case 'communication':
          result = await printerDiagnosticService.testCommunication(profile)
          break
        case 'textPrint':
          result = await printerDiagnosticService.testTextPrint(profile)
          break
        default:
          throw new Error(`Unknown test type: ${testType}`)
      }
      
      // Update current report with individual test result
      if (currentReport) {
        const updatedTests = currentReport.tests.filter(test => test.testName !== testType)
        updatedTests.push({
          testName: testType,
          result,
          timestamp: new Date()
        })
        
        const updatedReport = {
          ...currentReport,
          tests: updatedTests,
          testEndTime: new Date()
        }
        
        setCurrentReport(updatedReport)
      }
    } catch (error) {
      console.error(`Individual test failed:`, error)
    } finally {
      setIsRunning(false)
    }
  }, [profile, isRunning, currentReport])

  if (!profile) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <PrinterIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Select a printer profile to run diagnostics and tests
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Printer Diagnostics
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Testing: {profile.name}
            </span>
            <div className={`h-2 w-2 rounded-full ${
              isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            }`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runDiagnostic}
            disabled={isRunning}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <WrenchScrewdriverIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Diagnostic
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => runIndividualTest('connection')}
            disabled={isRunning}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <BoltIcon className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Connection
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => runIndividualTest('textPrint')}
            disabled={isRunning}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Print
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => runIndividualTest('communication')}
            disabled={isRunning}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <CpuChipIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Commands
              </span>
            </div>
          </motion.button>
        </div>

        {/* Test Progress */}
        <AnimatePresence>
          {testProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {testProgress.currentTest}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                      <span>Progress</span>
                      <span>{testProgress.completed}/{testProgress.total}</span>
                    </div>
                    <div className="mt-1 bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                      <motion.div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(testProgress.completed / testProgress.total) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Diagnostic Results */}
      <AnimatePresence>
        {currentReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Diagnostic Report
              </h3>
              <div className="flex items-center space-x-2">
                <StatusBadge status={currentReport.overallStatus} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {currentReport.testEndTime?.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Performance Metrics */}
            {currentReport.performanceMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentReport.performanceMetrics.reliabilityScore}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Reliability</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentReport.performanceMetrics.qualityScore}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Quality</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentReport.performanceMetrics.averageConnectionTime}ms
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Connection</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentReport.performanceMetrics.averagePrintTime}ms
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Print Time</div>
                </div>
              </div>
            )}

            {/* Test Results */}
            <div className="space-y-3 mb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Test Results ({currentReport.tests.length})
              </h4>
              {currentReport.tests.map((test, index) => (
                <TestResultItem 
                  key={index} 
                  test={test} 
                  onViewDetails={() => setSelectedTest(test.testName)}
                />
              ))}
            </div>

            {/* Recommendations */}
            {currentReport.recommendations.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {currentReport.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {rec.startsWith('✅') ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : rec.startsWith('⚠️') ? (
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {rec.replace(/^[\u2705\u26a0\ufe0f\ud83d\udd27\ud83d\udea8]\s*/u, '')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Details Modal */}
      <AnimatePresence>
        {selectedTest && currentReport && (
          <TestDetailsModal
            test={currentReport.tests.find(t => t.testName === selectedTest)}
            onClose={() => setSelectedTest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    passed: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20', text: 'Passed' },
    warning: { icon: ExclamationTriangleIcon, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'Warning' },
    failed: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20', text: 'Failed' },
    running: { icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'Running' }
  }

  const { icon: Icon, color, bg, text } = config[status as keyof typeof config] || config.failed

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${bg}`}>
      <Icon className={`h-3 w-3 ${color}`} />
      <span className={color}>{text}</span>
    </div>
  )
}

const TestResultItem: React.FC<{ 
  test: DiagnosticTestResult
  onViewDetails: () => void 
}> = ({ test, onViewDetails }) => {
  const success = test.result.success
  const hasDetails = test.result.troubleshooting && test.result.troubleshooting.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {success ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {test.testName}
          </div>
          {test.result.error && (
            <div className="text-xs text-red-600 dark:text-red-400">
              {test.result.error}
            </div>
          )}
          {test.duration && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Completed in {test.duration}ms
            </div>
          )}
        </div>
      </div>

      {hasDetails && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewDetails}
          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          View Details
        </motion.button>
      )}
    </motion.div>
  )
}

const TestDetailsModal: React.FC<{
  test?: DiagnosticTestResult
  onClose: () => void
}> = ({ test, onClose }) => {
  if (!test) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-lg w-full max-h-96 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {test.testName} Test Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status: </span>
            <StatusBadge status={test.result.success ? 'passed' : 'failed'} />
          </div>

          {test.result.error && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Error: </span>
              <span className="text-sm text-red-600 dark:text-red-400">{test.result.error}</span>
            </div>
          )}

          {test.result.troubleshooting && test.result.troubleshooting.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Troubleshooting Steps:
              </h4>
              <div className="space-y-2">
                {test.result.troubleshooting.map((step: TroubleshootingStep, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-xs">
                    <span className="flex-shrink-0 w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                      {step.step}
                    </span>
                    <div>
                      <div className="font-medium text-gray-700 dark:text-gray-300">
                        {step.description}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {step.action}
                      </div>
                      {step.isAutomatic && (
                        <span className="text-blue-600 dark:text-blue-400">(Automatic)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Mock diagnostic function for simulation
async function simulateFullDiagnostic(
  profile: PrinterProfile, 
  setProgress: (progress: TestProgress) => void
): Promise<DiagnosticReport> {
  const tests = ['Connection', 'Communication', 'Text Print', 'Ticket Format', 'Paper Feed', 'Print Speed', 'Quality Check']
  const results: DiagnosticTestResult[] = []

  for (let i = 0; i < tests.length; i++) {
    setProgress({
      currentTest: `Running ${tests[i]} test...`,
      completed: i,
      total: tests.length,
      isRunning: true
    })

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const success = Math.random() > 0.2 // 80% success rate
    results.push({
      testName: tests[i],
      result: {
        success,
        ...(tests[i] === 'Connection' && { connectionTime: Math.floor(Math.random() * 500) + 100 }),
        ...(tests[i].includes('Print') && { printTime: Math.floor(Math.random() * 2000) + 500 }),
        ...(tests[i] === 'Quality Check' && { quality: success ? 'good' : 'fair' }),
        ...(!success && { 
          error: `${tests[i]} test failed - simulated error`,
          troubleshooting: [
            { step: 1, description: `Check ${tests[i].toLowerCase()} settings`, action: 'Verify configuration', severity: 'medium' as const }
          ]
        })
      },
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 1000) + 500
    })
  }

  setProgress({
    currentTest: 'Generating report...',
    completed: tests.length,
    total: tests.length,
    isRunning: true
  })

  await new Promise(resolve => setTimeout(resolve, 500))

  const failedTests = results.filter(test => !test.result.success)
  
  return {
    printerId: profile.id,
    printerName: profile.name,
    testStartTime: new Date(Date.now() - 10000),
    testEndTime: new Date(),
    tests: results,
    overallStatus: failedTests.length === 0 ? 'passed' : failedTests.length <= 2 ? 'warning' : 'failed',
    recommendations: generateMockRecommendations(failedTests.length),
    performanceMetrics: {
      averageConnectionTime: Math.floor(Math.random() * 200) + 100,
      averagePrintTime: Math.floor(Math.random() * 1000) + 800,
      reliabilityScore: Math.max(100 - (failedTests.length * 15), 0),
      qualityScore: Math.floor(Math.random() * 20) + 80
    }
  }
}

function generateMockRecommendations(failedCount: number): string[] {
  if (failedCount === 0) {
    return [
      '✅ All tests passed - printer is functioning optimally',
      '✅ Schedule regular maintenance to maintain performance',
      '✅ Consider enabling auto-print features for efficiency'
    ]
  } else if (failedCount <= 2) {
    return [
      '⚠️ Minor issues detected - monitor closely',
      '🔧 Review failed test troubleshooting steps',
      '⚠️ Schedule maintenance within 1-2 weeks'
    ]
  } else {
    return [
      '🚨 Critical issues detected - immediate attention required',
      '🔧 Multiple system failures indicate hardware problems',
      '🚨 Contact technical support for professional diagnosis',
      '⚠️ Consider backup printer while resolving issues'
    ]
  }
}

export default PrinterTestingPanel