import React from 'react'
import { Check, Circle } from 'lucide-react'

export interface Step {
  id: number
  title: string
  description?: string
  optional?: boolean
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  completedSteps?: number[]
  className?: string
  variant?: 'default' | 'compact' | 'minimal'
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  className = '',
  variant = 'default'
}) => {
  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === currentStep) return 'current'
    if (stepId < currentStep) return 'completed'
    return 'pending'
  }

  const getStepClasses = (stepId: number) => {
    const status = getStepStatus(stepId)
    const baseClasses = 'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium'
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white`
      case 'current':
        return `${baseClasses} bg-blue-500 text-white`
      default:
        return `${baseClasses} bg-gray-200 text-gray-500`
    }
  }

  const getConnectorClasses = (stepId: number) => {
    const isCompleted = getStepStatus(stepId) === 'completed' || stepId < currentStep
    return `flex-1 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center space-x-2 ${className}`}>
        <span className="text-sm text-gray-500">
          Step {currentStep} of {steps.length}
        </span>
        <div className="flex space-x-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full ${
                step.id <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${className}`}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center space-x-2">
              <div className={getStepClasses(step.id)}>
                {getStepStatus(step.id) === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  getStepStatus(step.id) === 'current'
                    ? 'text-blue-600'
                    : getStepStatus(step.id) === 'completed'
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-2 sm:mx-4 ${getConnectorClasses(step.id)}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // Default variant - full step indicator
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center space-y-2">
              <div className={getStepClasses(step.id)}>
                {getStepStatus(step.id) === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-sm font-medium ${
                    getStepStatus(step.id) === 'current'
                      ? 'text-blue-600'
                      : getStepStatus(step.id) === 'completed'
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                  {step.optional && (
                    <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                  )}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-1 max-w-24 text-center">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${getConnectorClasses(step.id)}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </span>
          <div className="flex space-x-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full ${
                  step.id <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <div className={getStepClasses(currentStep)}>
            {getStepStatus(currentStep) === 'completed' ? (
              <Check className="w-4 h-4" />
            ) : (
              <span>{currentStep}</span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-lg font-medium text-gray-900">
              {steps.find(step => step.id === currentStep)?.title}
            </div>
            {steps.find(step => step.id === currentStep)?.description && (
              <div className="text-sm text-gray-500 mt-1">
                {steps.find(step => step.id === currentStep)?.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StepIndicator