/**
 * Printing Settings Tab Component
 * Comprehensive printing and thermal printer management interface
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  PrinterIcon, 
  Cog6ToothIcon,
  BoltIcon,
  DocumentTextIcon,
  WifiIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import ThermalPrinterManager from '../../printing/ThermalPrinterManager'
import ThermalPrintDemo from '../../printing/ThermalPrintDemo'
import PrinterTestingPanel from './PrinterTestingPanel'
import { printerConfigService } from '../../../services/printerConfigService'
import type { PrintingSettings } from '../../../types/settings'
import type { 
  PrinterProfile, 
  DetectedPrinter, 
  TestResult, 
  CalibrationResult,
  PrinterType,
  ConnectionType 
} from '../../../types/printerConfig'

interface PrintingSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
}

export function PrintingSettingsTab({ onSettingChange }: PrintingSettingsTabProps) {
  const [settings, setSettings] = useState<PrintingSettings>({
    // Thermal Printer Settings
    enable_thermal_printing: true,
    default_paper_width: 'thermal-2.75',
    auto_cut_enabled: true,
    print_test_page_on_connect: true,
    
    // Print Queue Settings
    max_concurrent_jobs: 3,
    retry_failed_jobs: true,
    max_retry_attempts: 3,
    job_timeout_seconds: 30,
    
    // Ticket Settings
    print_duplicate_tickets: false,
    include_qr_codes: true,
    business_logo_enabled: true,
    ticket_footer_text: 'Thank you for parking with us!',
    
    // Connection Settings
    auto_discover_printers: true,
    connection_timeout_ms: 5000,
    enable_printer_status_monitoring: true,
    status_check_interval_ms: 10000,
    
    // Hardware Profile Integration
    enable_printer_profiles: true,
    auto_assign_detected_printers: true,
    
    // Advanced Queue Management
    print_queue_enabled: true,
    max_queue_size: 100,
    queue_timeout_minutes: 60,
    background_printing: true,
    batch_printing_enabled: false,
    
    // Quality and Calibration
    default_print_quality: 'normal',
    enable_calibration: true,
    auto_calibration: false,
    
    // Security and Audit
    require_auth_to_print: false,
    audit_print_jobs: true,
    restrict_printer_access: false
  })

  const [activeTab, setActiveTab] = useState<'profiles' | 'thermal' | 'settings' | 'demo'>('profiles')
  const [printerProfiles, setPrinterProfiles] = useState<PrinterProfile[]>([])
  const [detectedPrinters, setDetectedPrinters] = useState<DetectedPrinter[]>([])
  const [selectedProfile, setSelectedProfile] = useState<PrinterProfile | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }

  // Load printer profiles
  const loadPrinterProfiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const profiles = await printerConfigService.getAllPrinterProfiles()
      setPrinterProfiles(profiles)
    } catch (error) {
      console.error('Failed to load printer profiles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Discover printers
  const handleDiscoverPrinters = useCallback(async () => {
    try {
      setIsDiscovering(true)
      const discovered = await printerConfigService.discoverPrinters()
      setDetectedPrinters(discovered)
    } catch (error) {
      console.error('Failed to discover printers:', error)
    } finally {
      setIsDiscovering(false)
    }
  }, [])

  // Test printer connection
  const handleTestPrinter = useCallback(async (profile: PrinterProfile) => {
    try {
      const result = await printerConfigService.testPrinterConnection(profile)
      
      // Update the profile with test result
      setPrinterProfiles(prev => prev.map(p => 
        p.id === profile.id 
          ? { ...p, lastTestResult: result }
          : p
      ))
      
      return result
    } catch (error) {
      console.error('Failed to test printer:', error)
      return {
        success: false,
        message: 'Connection test failed',
        timestamp: new Date()
      }
    }
  }, [])

  // Delete printer profile
  const handleDeleteProfile = useCallback(async (profileId: string) => {
    try {
      await printerConfigService.deletePrinterProfile(profileId)
      setPrinterProfiles(prev => prev.filter(p => p.id !== profileId))
    } catch (error) {
      console.error('Failed to delete printer profile:', error)
    }
  }, [])

  // Set default printer
  const handleSetDefaultPrinter = useCallback(async (profileId: string) => {
    try {
      await printerConfigService.setDefaultPrinter(profileId)
      await loadPrinterProfiles() // Reload to get updated default status
    } catch (error) {
      console.error('Failed to set default printer:', error)
    }
  }, [loadPrinterProfiles])

  useEffect(() => {
    loadPrinterProfiles()
  }, [])

  const tabs = [
    { id: 'profiles', name: 'Printer Profiles', icon: PrinterIcon },
    { id: 'thermal', name: 'Thermal Printers', icon: PrinterIcon },
    { id: 'settings', name: 'Print Settings', icon: Cog6ToothIcon },
    { id: 'demo', name: 'Print Testing', icon: BoltIcon }
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                  ${isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Printer Profiles Tab */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex justify-between items-start">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex-1 mr-4">
              <div className="flex items-start space-x-3">
                <PrinterIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-purple-900 mb-1">
                    Hardware Printer Profiles
                  </h3>
                  <p className="text-sm text-purple-700">
                    Manage printer hardware configurations, connection settings, and capabilities. 
                    Create profiles for different printer types and assign them to parking locations.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDiscoverPrinters}
                disabled={isDiscovering}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <WifiIcon className="w-4 h-4 mr-2" />
                {isDiscovering ? 'Discovering...' : 'Discover Printers'}
              </button>
              
              <button
                onClick={() => setShowProfileForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Profile
              </button>
            </div>
          </div>

          {/* Detected Printers */}
          {detectedPrinters.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Detected Printers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detectedPrinters.map((printer, index) => (
                  <div key={index} className="bg-white border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-gray-900">{printer.name}</h5>
                        <p className="text-sm text-gray-600">
                          {printer.manufacturer} {printer.model}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {printer.connectionType} • {printer.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <button
                        className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                        onClick={() => {
                          // Auto-fill form with detected printer data
                          setShowProfileForm(true)
                        }}
                      >
                        Create Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Printer Profiles */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Configured Printer Profiles ({printerProfiles.length})
            </h4>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading printer profiles...</div>
            ) : printerProfiles.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <PrinterIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Printer Profiles</h3>
                <p className="text-gray-600 mb-4">
                  Create your first printer profile to start managing hardware configurations.
                </p>
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create First Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {printerProfiles.map((profile) => (
                  <div 
                    key={profile.id} 
                    className={`bg-white border rounded-lg p-4 ${
                      profile.isDefault 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{profile.name}</h5>
                          {profile.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                          {!profile.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {profile.manufacturer} {profile.model}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {profile.type} • {profile.connection.type}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTestPrinter(profile)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                          title="Test Connection"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="text-gray-600 hover:text-gray-700"
                          title="Edit Profile"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {!profile.isDefault && (
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Profile"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Paper:</span>
                          <span className="ml-2 text-gray-600">
                            {profile.defaultSettings.paperSize}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Resolution:</span>
                          <span className="ml-2 text-gray-600">
                            {profile.capabilities.resolution} DPI
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Usage:</span>
                          <span className="ml-2 text-gray-600">
                            {profile.usage.totalJobs} jobs
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Success:</span>
                          <span className="ml-2 text-gray-600">
                            {profile.usage.totalJobs > 0 
                              ? Math.round((profile.usage.successfulJobs / profile.usage.totalJobs) * 100) + '%'
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Last Test Result */}
                      {profile.lastTestResult && (
                        <div className={`mt-3 p-2 rounded text-sm ${
                          profile.lastTestResult.success 
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className={`w-4 h-4 ${
                              profile.lastTestResult.success ? 'text-green-600' : 'text-red-600'
                            }`} />
                            <span className="font-medium">
                              {profile.lastTestResult.success ? 'Connected' : 'Connection Failed'}
                            </span>
                            {profile.lastTestResult.responseTime && (
                              <span className="text-xs opacity-75">
                                ({profile.lastTestResult.responseTime}ms)
                              </span>
                            )}
                          </div>
                          {!profile.lastTestResult.success && (
                            <p className="text-xs mt-1 opacity-90">
                              {profile.lastTestResult.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        {!profile.isDefault && profile.isActive && (
                          <button
                            onClick={() => handleSetDefaultPrinter(profile.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {profile.locationAssignments?.length || 0} locations assigned
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thermal Printers Tab */}
      {activeTab === 'thermal' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <PrinterIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Thermal Printer Management
                </h3>
                <p className="text-sm text-blue-700">
                  Configure and manage thermal printers for printing parking tickets and receipts. 
                  Connect via USB, test printing functionality, and monitor printer status in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Thermal Printer Manager Component */}
          <ThermalPrinterManager
            onPrinterConnected={(printer) => {
              console.log('Printer connected in settings:', printer)
            }}
            onPrintTestComplete={(result) => {
              console.log('Test print completed:', result)
            }}
          />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* Thermal Printer Settings */}
          <SettingsSection
            title="Thermal Printer Configuration"
            description="Configure thermal printer behavior and defaults"
            icon={PrinterIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Enable Thermal Printing"
                description="Allow thermal printers to be used for ticket printing"
                type="boolean"
                value={settings.enable_thermal_printing}
                onChange={(value) => handleSettingChange('enable_thermal_printing', value)}
              />

              <SettingsField
                label="Default Paper Width"
                description="Default paper width for thermal printers"
                type="select"
                value={settings.default_paper_width}
                options={[
                  { value: 'thermal-2.75', label: '2.75 inches (70mm)' },
                  { value: 'thermal-3', label: '3 inches (80mm)' },
                  { value: 'thermal-4', label: '4 inches (110mm)' }
                ]}
                onChange={(value) => handleSettingChange('default_paper_width', value)}
              />

              <SettingsField
                label="Auto Cut Paper"
                description="Automatically cut paper after printing tickets"
                type="boolean"
                value={settings.auto_cut_enabled}
                onChange={(value) => handleSettingChange('auto_cut_enabled', value)}
              />

              <SettingsField
                label="Test Print on Connect"
                description="Print a test page when connecting to a new printer"
                type="boolean"
                value={settings.print_test_page_on_connect}
                onChange={(value) => handleSettingChange('print_test_page_on_connect', value)}
              />
            </div>
          </SettingsSection>

          {/* Print Queue Settings */}
          <SettingsSection
            title="Print Queue Management"
            description="Configure print job processing and queue behavior"
            icon={DocumentTextIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Max Concurrent Jobs"
                description="Maximum number of print jobs to process simultaneously"
                type="number"
                value={settings.max_concurrent_jobs}
                min={1}
                max={10}
                onChange={(value) => handleSettingChange('max_concurrent_jobs', value)}
              />

              <SettingsField
                label="Retry Failed Jobs"
                description="Automatically retry failed print jobs"
                type="boolean"
                value={settings.retry_failed_jobs}
                onChange={(value) => handleSettingChange('retry_failed_jobs', value)}
              />

              <SettingsField
                label="Max Retry Attempts"
                description="Maximum number of retry attempts for failed jobs"
                type="number"
                value={settings.max_retry_attempts}
                min={1}
                max={10}
                onChange={(value) => handleSettingChange('max_retry_attempts', value)}
                disabled={!settings.retry_failed_jobs}
              />

              <SettingsField
                label="Job Timeout (seconds)"
                description="Timeout for individual print jobs"
                type="number"
                value={settings.job_timeout_seconds}
                min={5}
                max={300}
                onChange={(value) => handleSettingChange('job_timeout_seconds', value)}
              />
            </div>
          </SettingsSection>

          {/* Ticket Settings */}
          <SettingsSection
            title="Ticket Formatting"
            description="Customize parking ticket and receipt appearance"
            icon={DocumentTextIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Print Duplicate Tickets"
                description="Print two copies of each ticket by default"
                type="boolean"
                value={settings.print_duplicate_tickets}
                onChange={(value) => handleSettingChange('print_duplicate_tickets', value)}
              />

              <SettingsField
                label="Include QR Codes"
                description="Add QR codes to tickets for quick scanning"
                type="boolean"
                value={settings.include_qr_codes}
                onChange={(value) => handleSettingChange('include_qr_codes', value)}
              />

              <SettingsField
                label="Business Logo"
                description="Include business logo on printed tickets"
                type="boolean"
                value={settings.business_logo_enabled}
                onChange={(value) => handleSettingChange('business_logo_enabled', value)}
              />

              <SettingsField
                label="Footer Text"
                description="Custom footer text to appear on all tickets"
                type="text"
                value={settings.ticket_footer_text}
                placeholder="Thank you for parking with us!"
                onChange={(value) => handleSettingChange('ticket_footer_text', value)}
              />
            </div>
          </SettingsSection>

          {/* Hardware Profile Integration */}
          <SettingsSection
            title="Hardware Profile Management"
            description="Configure printer profile system and automatic assignment"
            icon={PrinterIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Enable Printer Profiles"
                description="Use hardware printer profiles for advanced configuration"
                type="boolean"
                value={settings.enable_printer_profiles}
                onChange={(value) => handleSettingChange('enable_printer_profiles', value)}
              />

              <SettingsField
                label="Default Printer Profile"
                description="Primary printer profile for all print jobs"
                type="select"
                value={settings.default_printer_profile_id || ''}
                options={[
                  { value: '', label: 'Select default printer...' },
                  ...printerProfiles.filter(p => p.isActive).map(p => ({
                    value: p.id,
                    label: `${p.name} (${p.manufacturer} ${p.model})`
                  }))
                ]}
                onChange={(value) => handleSettingChange('default_printer_profile_id', value)}
                disabled={!settings.enable_printer_profiles || printerProfiles.length === 0}
              />

              <SettingsField
                label="Fallback Printer Profile"
                description="Backup printer when default is unavailable"
                type="select"
                value={settings.fallback_printer_profile_id || ''}
                options={[
                  { value: '', label: 'No fallback printer...' },
                  ...printerProfiles
                    .filter(p => p.isActive && p.id !== settings.default_printer_profile_id)
                    .map(p => ({
                      value: p.id,
                      label: `${p.name} (${p.manufacturer} ${p.model})`
                    }))
                ]}
                onChange={(value) => handleSettingChange('fallback_printer_profile_id', value)}
                disabled={!settings.enable_printer_profiles || printerProfiles.length === 0}
              />

              <SettingsField
                label="Auto-Assign Detected Printers"
                description="Automatically create profiles for newly detected printers"
                type="boolean"
                value={settings.auto_assign_detected_printers}
                onChange={(value) => handleSettingChange('auto_assign_detected_printers', value)}
                disabled={!settings.enable_printer_profiles}
              />
            </div>
          </SettingsSection>

          {/* Advanced Queue Management */}
          <SettingsSection
            title="Advanced Queue Management"
            description="Configure enterprise-grade print queue features"
            icon={DocumentTextIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Print Queue Enabled"
                description="Enable centralized print queue management"
                type="boolean"
                value={settings.print_queue_enabled}
                onChange={(value) => handleSettingChange('print_queue_enabled', value)}
              />

              <SettingsField
                label="Max Queue Size"
                description="Maximum number of jobs in print queue"
                type="number"
                value={settings.max_queue_size}
                min={10}
                max={1000}
                onChange={(value) => handleSettingChange('max_queue_size', value)}
                disabled={!settings.print_queue_enabled}
              />

              <SettingsField
                label="Queue Timeout (minutes)"
                description="Time before queued jobs expire"
                type="number"
                value={settings.queue_timeout_minutes}
                min={5}
                max={1440}
                onChange={(value) => handleSettingChange('queue_timeout_minutes', value)}
                disabled={!settings.print_queue_enabled}
              />

              <SettingsField
                label="Background Printing"
                description="Process print jobs in background"
                type="boolean"
                value={settings.background_printing}
                onChange={(value) => handleSettingChange('background_printing', value)}
              />

              <SettingsField
                label="Batch Printing"
                description="Group similar jobs for efficient processing"
                type="boolean"
                value={settings.batch_printing_enabled}
                onChange={(value) => handleSettingChange('batch_printing_enabled', value)}
              />
            </div>
          </SettingsSection>

          {/* Quality and Calibration */}
          <SettingsSection
            title="Quality & Calibration"
            description="Configure print quality and automatic calibration"
            icon={Cog6ToothIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Default Print Quality"
                description="Default quality setting for all print jobs"
                type="select"
                value={settings.default_print_quality}
                options={[
                  { value: 'draft', label: 'Draft - Fast, lower quality' },
                  { value: 'normal', label: 'Normal - Balanced speed/quality' },
                  { value: 'high', label: 'High - Better quality, slower' },
                  { value: 'best', label: 'Best - Highest quality, slowest' }
                ]}
                onChange={(value) => handleSettingChange('default_print_quality', value)}
              />

              <SettingsField
                label="Enable Calibration"
                description="Allow printer calibration and adjustment features"
                type="boolean"
                value={settings.enable_calibration}
                onChange={(value) => handleSettingChange('enable_calibration', value)}
              />

              <SettingsField
                label="Auto Calibration"
                description="Automatically calibrate printers when connected"
                type="boolean"
                value={settings.auto_calibration}
                onChange={(value) => handleSettingChange('auto_calibration', value)}
                disabled={!settings.enable_calibration}
              />
            </div>
          </SettingsSection>

          {/* Security and Audit */}
          <SettingsSection
            title="Security & Audit"
            description="Configure printing security and audit logging"
            icon={CheckCircleIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Require Authentication"
                description="Require user authentication before printing"
                type="boolean"
                value={settings.require_auth_to_print}
                onChange={(value) => handleSettingChange('require_auth_to_print', value)}
              />

              <SettingsField
                label="Audit Print Jobs"
                description="Log all print job activity for auditing"
                type="boolean"
                value={settings.audit_print_jobs}
                onChange={(value) => handleSettingChange('audit_print_jobs', value)}
              />

              <SettingsField
                label="Restrict Printer Access"
                description="Limit printer access based on user permissions"
                type="boolean"
                value={settings.restrict_printer_access}
                onChange={(value) => handleSettingChange('restrict_printer_access', value)}
              />
            </div>
          </SettingsSection>

          {/* Connection Settings */}
          <SettingsSection
            title="Connection & Monitoring"
            description="Configure printer discovery and status monitoring"
            icon={WifiIcon}
          >
            <div className="space-y-6">
              <SettingsField
                label="Auto-Discover Printers"
                description="Automatically detect connected thermal printers"
                type="boolean"
                value={settings.auto_discover_printers}
                onChange={(value) => handleSettingChange('auto_discover_printers', value)}
              />

              <SettingsField
                label="Connection Timeout (ms)"
                description="Timeout for printer connection attempts"
                type="number"
                value={settings.connection_timeout_ms}
                min={1000}
                max={30000}
                step={1000}
                onChange={(value) => handleSettingChange('connection_timeout_ms', value)}
              />

              <SettingsField
                label="Status Monitoring"
                description="Monitor printer status and connectivity"
                type="boolean"
                value={settings.enable_printer_status_monitoring}
                onChange={(value) => handleSettingChange('enable_printer_status_monitoring', value)}
              />

              <SettingsField
                label="Status Check Interval (ms)"
                description="How often to check printer status"
                type="number"
                value={settings.status_check_interval_ms}
                min={1000}
                max={60000}
                step={1000}
                onChange={(value) => handleSettingChange('status_check_interval_ms', value)}
                disabled={!settings.enable_printer_status_monitoring}
              />
            </div>
          </SettingsSection>
        </div>
      )}

      {/* Demo Tab */}
      {activeTab === 'demo' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <BoltIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-900 mb-1">
                  Print Testing & Demonstration
                </h3>
                <p className="text-sm text-green-700">
                  Test your thermal printer setup, print sample tickets, and verify print quality. 
                  Use this interface to troubleshoot printing issues and validate your configuration.
                </p>
              </div>
            </div>
          </div>

          {/* Comprehensive Printer Testing Panel */}
          <PrinterTestingPanel
            profile={selectedProfile}
            onTestComplete={(report) => {
              console.log('Test completed:', report)
              // Could integrate with notifications or store results
            }}
          />

          {/* Thermal Print Demo Component */}
          <ThermalPrintDemo
            showPrinterManager={false}
            compactMode={false}
          />
        </div>
      )}

      {/* Settings Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="w-5 h-5 text-gray-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Settings Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Thermal Printing:</span>{' '}
                {settings.enable_thermal_printing ? 'Enabled' : 'Disabled'}
              </div>
              <div>
                <span className="font-medium">Printer Profiles:</span>{' '}
                {settings.enable_printer_profiles ? `${printerProfiles.length} configured` : 'Disabled'}
              </div>
              <div>
                <span className="font-medium">Paper Width:</span>{' '}
                {settings.default_paper_width.replace('thermal-', '') + '"'}
              </div>
              <div>
                <span className="font-medium">Print Quality:</span>{' '}
                {settings.default_print_quality}
              </div>
              <div>
                <span className="font-medium">Max Concurrent:</span>{' '}
                {settings.max_concurrent_jobs}
              </div>
              <div>
                <span className="font-medium">Queue Size:</span>{' '}
                {settings.print_queue_enabled ? settings.max_queue_size : 'Disabled'}
              </div>
              <div>
                <span className="font-medium">Auto Discovery:</span>{' '}
                {settings.auto_discover_printers ? 'On' : 'Off'}
              </div>
              <div>
                <span className="font-medium">Audit Logging:</span>{' '}
                {settings.audit_print_jobs ? 'On' : 'Off'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printer Profile Form Modal */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedProfile ? 'Edit Printer Profile' : 'Create Printer Profile'}
                </h3>
                <button
                  onClick={() => {
                    setShowProfileForm(false)
                    setSelectedProfile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <PrinterProfileForm
              profile={selectedProfile}
              detectedPrinters={detectedPrinters}
              onSave={async (profileData) => {
                try {
                  if (selectedProfile) {
                    await printerConfigService.updatePrinterProfile(selectedProfile.id, profileData)
                  } else {
                    await printerConfigService.createPrinterProfile(profileData)
                  }
                  await loadPrinterProfiles()
                  setShowProfileForm(false)
                  setSelectedProfile(null)
                } catch (error) {
                  console.error('Failed to save printer profile:', error)
                }
              }}
              onCancel={() => {
                setShowProfileForm(false)
                setSelectedProfile(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Printer Profile Form Component
interface PrinterProfileFormProps {
  profile?: PrinterProfile | null
  detectedPrinters: DetectedPrinter[]
  onSave: (profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

function PrinterProfileForm({ profile, detectedPrinters, onSave, onCancel }: PrinterProfileFormProps) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    type: profile?.type || 'thermal' as PrinterType,
    manufacturer: profile?.manufacturer || '',
    model: profile?.model || '',
    description: profile?.description || '',
    connectionType: profile?.connection.type || 'usb' as ConnectionType,
    connectionSettings: profile?.connection.settings || {},
    capabilities: profile?.capabilities || {
      maxWidth: 70,
      maxHeight: 2000,
      resolution: 203,
      colorSupport: false,
      paperSizes: ['thermal-2.75'],
      commandSet: 'ESC/POS' as const,
      supportedFonts: ['Arial'],
      maxCopies: 10,
      duplexSupport: false,
      cutterSupport: true
    },
    defaultSettings: profile?.defaultSettings || {
      paperSize: 'thermal-2.75',
      orientation: 'portrait' as const,
      copies: 1,
      density: 5,
      speed: 'normal' as const,
      margins: { top: 5, right: 5, bottom: 5, left: 5 },
      scaling: 1.0,
      fitToPage: true,
      centerContent: true
    },
    isActive: profile?.isActive ?? true,
    isDefault: profile?.isDefault || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const profileData = {
      name: formData.name,
      type: formData.type,
      manufacturer: formData.manufacturer,
      model: formData.model,
      description: formData.description,
      connection: {
        type: formData.connectionType,
        settings: formData.connectionSettings
      },
      capabilities: formData.capabilities,
      defaultSettings: formData.defaultSettings,
      isActive: formData.isActive,
      isDefault: formData.isDefault,
      usage: profile?.usage || {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0
      }
    }
    
    onSave(profileData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Basic Information</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Printer Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Main Entry Printer"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Printer Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PrinterType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="thermal">Thermal</option>
              <option value="receipt">Receipt</option>
              <option value="label">Label</option>
              <option value="laser">Laser</option>
              <option value="inkjet">Inkjet</option>
              <option value="dot-matrix">Dot Matrix</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manufacturer *
            </label>
            <input
              type="text"
              required
              value={formData.manufacturer}
              onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Epson"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="TM-T20III"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            rows={2}
            placeholder="Main entry gate thermal printer"
          />
        </div>
      </div>

      {/* Connection Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Connection Configuration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection Type *
          </label>
          <select
            value={formData.connectionType}
            onChange={(e) => {
              const type = e.target.value as ConnectionType
              setFormData(prev => ({ 
                ...prev, 
                connectionType: type,
                connectionSettings: getDefaultConnectionSettings(type)
              }))
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="usb">USB</option>
            <option value="network">Network</option>
            <option value="bluetooth">Bluetooth</option>
            <option value="serial">Serial</option>
          </select>
        </div>

        {/* Connection Settings based on type */}
        <ConnectionSettingsForm 
          type={formData.connectionType}
          settings={formData.connectionSettings}
          onChange={(settings) => setFormData(prev => ({ ...prev, connectionSettings: settings }))}
        />
      </div>

      {/* Status */}
      <div className="flex items-center space-x-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Active</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Set as Default</span>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {profile ? 'Update Profile' : 'Create Profile'}
        </button>
      </div>
    </form>
  )
}

// Helper function for default connection settings
function getDefaultConnectionSettings(type: ConnectionType) {
  switch (type) {
    case 'usb':
      return { vendorId: 0, productId: 0, timeout: 5000 }
    case 'network':
      return { ipAddress: '192.168.1.100', port: 9100, protocol: 'socket', timeout: 3000 }
    case 'bluetooth':
      return { deviceAddress: '', timeout: 5000 }
    case 'serial':
      return { port: 'COM1', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', timeout: 3000 }
    default:
      return {}
  }
}

// Connection Settings Form Component
interface ConnectionSettingsFormProps {
  type: ConnectionType
  settings: any
  onChange: (settings: any) => void
}

function ConnectionSettingsForm({ type, settings, onChange }: ConnectionSettingsFormProps) {
  const updateSetting = (key: string, value: any) => {
    onChange({ ...settings, [key]: value })
  }

  switch (type) {
    case 'usb':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor ID
            </label>
            <input
              type="number"
              value={settings.vendorId || 0}
              onChange={(e) => updateSetting('vendorId', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="1208"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
            </label>
            <input
              type="number"
              value={settings.productId || 0}
              onChange={(e) => updateSetting('productId', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="514"
            />
          </div>
        </div>
      )
      
    case 'network':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address *
              </label>
              <input
                type="text"
                required
                value={settings.ipAddress || ''}
                onChange={(e) => updateSetting('ipAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                required
                value={settings.port || 9100}
                onChange={(e) => updateSetting('port', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protocol
            </label>
            <select
              value={settings.protocol || 'socket'}
              onChange={(e) => updateSetting('protocol', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="socket">Socket</option>
              <option value="ipp">IPP</option>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
            </select>
          </div>
        </div>
      )
      
    case 'bluetooth':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Address *
          </label>
          <input
            type="text"
            required
            value={settings.deviceAddress || ''}
            onChange={(e) => updateSetting('deviceAddress', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            placeholder="00:11:22:33:44:55"
          />
        </div>
      )
      
    case 'serial':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port *
            </label>
            <input
              type="text"
              required
              value={settings.port || 'COM1'}
              onChange={(e) => updateSetting('port', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="COM1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Baud Rate *
            </label>
            <select
              value={settings.baudRate || 9600}
              onChange={(e) => updateSetting('baudRate', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
            </select>
          </div>
        </div>
      )
      
    default:
      return <div className="text-sm text-gray-500">Select a connection type</div>
  }
}

export default PrintingSettingsTab