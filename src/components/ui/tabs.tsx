import React, { createContext, useContext, useState } from 'react'
import type { ComponentWithChildren, ComponentWithClassName } from '../../types'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

const useTabsContext = () => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component')
  }
  return context
}

interface TabsProps extends ComponentWithChildren, ComponentWithClassName {
  value: string
  onValueChange: (value: string) => void
  defaultValue?: string
}

export const Tabs: React.FC<TabsProps> = ({
  children,
  value,
  onValueChange,
  defaultValue,
  className = '',
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`tabs-container ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps extends ComponentWithChildren, ComponentWithClassName {}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex space-x-1 bg-gray-100 p-1 rounded-lg ${className}`}>
      {children}
    </div>
  )
}

interface TabsTriggerProps extends ComponentWithChildren, ComponentWithClassName {
  value: string
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  value,
  className = '',
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isActive = selectedValue === value

  return (
    <button
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isActive
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${className}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends ComponentWithChildren, ComponentWithClassName {
  value: string
}

export const TabsContent: React.FC<TabsContentProps> = ({
  children,
  value,
  className = '',
}) => {
  const { value: selectedValue } = useTabsContext()
  
  if (selectedValue !== value) {
    return null
  }

  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  )
}