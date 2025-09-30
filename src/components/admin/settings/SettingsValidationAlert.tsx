/**
 * Settings Validation Alert Component
 * Displays validation results with fix suggestions and auto-fix capabilities
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import type { ValidationResult, ValidationIssue } from '../../../types/settings'

interface SettingsValidationAlertProps {
  validation: ValidationResult
  onAutoFix?: (issueId: string) => Promise<void>
  onDismiss?: () => void
  className?: string
}

const severityConfig = {
  error: {
    icon: ExclamationCircleIcon,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-400',
    textColor: 'text-red-800',
    buttonColor: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-400',
    textColor: 'text-yellow-800',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  info: {
    icon: InformationCircleIcon,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-800',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  }
}

export const SettingsValidationAlert: React.FC<SettingsValidationAlertProps> = ({
  validation,
  onAutoFix,
  onDismiss,
  className = ''
}) => {
  const [fixingIssues, setFixingIssues] = useState<Set<string>>(new Set())
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set())

  const handleAutoFix = async (issue: ValidationIssue) => {
    if (!onAutoFix || !issue.autoFixAvailable) return

    setFixingIssues(prev => new Set(prev).add(issue.id))
    
    try {
      await onAutoFix(issue.id)
      setFixedIssues(prev => new Set(prev).add(issue.id))
    } catch (error) {
      console.error('Auto-fix failed:', error)
    } finally {
      setFixingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(issue.id)
        return newSet
      })
    }
  }

  const groupedIssues = validation.issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) acc[issue.severity] = []
    acc[issue.severity].push(issue)
    return acc
  }, {} as Record<string, ValidationIssue[]>)

  if (validation.isValid && validation.issues.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center">
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              All Settings Valid
            </h3>
            <p className="text-sm text-green-700 mt-1">
              No validation issues found. Your configuration is ready to use.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <AnimatePresence>
        {Object.entries(groupedIssues).map(([severity, issues]) => {
          const config = severityConfig[severity as keyof typeof severityConfig]
          const Icon = config.icon

          return (
            <motion.div
              key={severity}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}
            >
              <div className="flex items-start">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="ml-3 flex-1">
                  <h3 className={`text-sm font-medium ${config.textColor} mb-3`}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)} Issues ({issues.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {issues.map((issue) => (
                      <motion.div
                        key={issue.id}
                        layout
                        className="bg-white rounded-md p-3 border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {issue.message}
                            </h4>
                            
                            {issue.field && (
                              <p className="text-xs text-gray-500 mb-2">
                                Field: <code className="bg-gray-100 px-1 rounded">{issue.field}</code>
                              </p>
                            )}
                            
                            {issue.suggestion && (
                              <p className="text-sm text-gray-600 mb-2">
                                💡 {issue.suggestion}
                              </p>
                            )}
                            
                            {issue.impact && (
                              <p className="text-xs text-gray-500">
                                Impact: {issue.impact}
                              </p>
                            )}
                          </div>
                          
                          {issue.autoFixAvailable && onAutoFix && (
                            <div className="ml-3 flex-shrink-0">
                              {fixedIssues.has(issue.id) ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Fixed</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAutoFix(issue)}
                                  disabled={fixingIssues.has(issue.id)}
                                  className={`inline-flex items-center px-2 py-1 text-xs font-medium text-white ${config.buttonColor} rounded-md disabled:opacity-50 transition-colors`}
                                >
                                  {fixingIssues.has(issue.id) ? (
                                    <>
                                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                                      Fixing...
                                    </>
                                  ) : (
                                    <>
                                      <WrenchScrewdriverIcon className="w-3 h-3 mr-1" />
                                      Auto Fix
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className={`ml-3 ${config.iconColor} hover:${config.textColor} transition-colors`}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      
      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Validation Summary
          </div>
          <div className="flex items-center space-x-4">
            {groupedIssues.error && (
              <span className="text-red-600">
                {groupedIssues.error.length} errors
              </span>
            )}
            {groupedIssues.warning && (
              <span className="text-yellow-600">
                {groupedIssues.warning.length} warnings
              </span>
            )}
            {groupedIssues.info && (
              <span className="text-blue-600">
                {groupedIssues.info.length} suggestions
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsValidationAlert