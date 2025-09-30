// Accessibility Components Barrel Export
// Centralized exports for all accessibility-related components and utilities

// Core accessibility components
export { default as AccessibilityProvider, AccessibilityContext, useAccessibilityContext } from './AccessibilityProvider'
export { default as AccessibilitySettings } from './AccessibilitySettings'
export { default as AccessibilityTestRunner } from './AccessibilityTestRunner'
export { default as ColorBlindnessFilters } from './ColorBlindnessFilters'

// Accessibility hooks
export { useTheme } from '../../hooks/useTheme'
export {
  useFormAccessibility,
  useFocusTrap,
  useKeyboardNavigation,
  useLiveRegion,
  useScreenReader,
  useReducedMotion,
  useHighContrast,
  useColorContrast,
  useSkipLinks
} from '../../hooks/useAccessibility'

// Accessible UI components
export {
  AccessibleTextInput,
  AccessiblePasswordInput,
  AccessibleSelect,
  AccessibleTextarea
} from '../ui/AccessibleInput'

export {
  SkipLinks,
  FocusTrap,
  RovingTabIndex,
  KeyboardShortcuts,
  AccessibleMenu
} from '../ui/KeyboardNavigation'

export {
  VisuallyHidden,
  LiveRegion,
  StatusAnnouncer,
  LoadingAnnouncer,
  ProgressAnnouncer,
  FormValidationAnnouncer,
  TableAnnouncer,
  AccessibleDataTable,
  PaginationAnnouncer,
  SearchResultsAnnouncer
} from '../ui/ScreenReaderSupport'

// Accessibility utilities
export {
  ARIA_LABELS,
  ARIA_DESCRIPTIONS,
  focusManager,
  keyboardHandler,
  screenReader,
  colorUtils,
  a11yTest
} from '../../utils/accessibility'

export {
  AccessibilityValidator,
  quickAccessibilityCheck,
  generateAccessibilityReportHTML
} from '../../utils/accessibilityTesting'

// Types
export type { 
  Theme, 
  MotionPreference, 
  ThemePreferences 
} from '../../hooks/useTheme'

export type { 
  AccessibilityReport, 
  AccessibilityIssue 
} from '../../utils/accessibilityTesting'

export type { 
  ComponentWithClassName, 
  ComponentWithTestId 
} from '../../types'