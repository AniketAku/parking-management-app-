// Keyboard Navigation Components
// WCAG 2.1 compliant keyboard navigation with focus management

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { focusManager, keyboardHandler } from '../../utils/accessibility'
import { useKeyboardNavigation } from '../../hooks/useAccessibility'

interface SkipLinksProps {
  links: Array<{
    href: string
    label: string
  }>
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ links }) => {
  return (
    <div className="skip-links">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
          onClick={(e) => {
            e.preventDefault()
            const target = document.querySelector(link.href)
            if (target) {
              ;(target as HTMLElement).focus()
              target.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

interface FocusTrapProps {
  children: React.ReactNode
  active: boolean
  autoFocus?: boolean
  restoreFocus?: boolean
  className?: string
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active,
  autoFocus = true,
  restoreFocus = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Store previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }

    // Focus first element if autoFocus is enabled
    if (autoFocus) {
      setTimeout(() => {
        focusManager.focusFirst(container)
      }, 0)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = focusManager.getFocusableElements(container)
        
        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus when trap deactivates
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [active, autoFocus, restoreFocus])

  return (
    <div
      ref={containerRef}
      className={className}
      role={active ? 'dialog' : undefined}
      aria-modal={active}
    >
      {children}
    </div>
  )
}

interface RovingTabIndexProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
  className?: string
  role?: string
}

export const RovingTabIndex: React.FC<RovingTabIndexProps> = ({
  children,
  orientation = 'horizontal',
  wrap = false,
  className = '',
  role = 'group',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const updateTabIndices = useCallback((activeIndex: number) => {
    if (!containerRef.current) return

    const items = focusManager.getFocusableElements(containerRef.current)
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === activeIndex ? '0' : '-1')
    })
  }, [])

  useEffect(() => {
    updateTabIndices(focusedIndex)
  }, [focusedIndex, updateTabIndices])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!containerRef.current) return

    const items = focusManager.getFocusableElements(containerRef.current)
    let newIndex = focusedIndex

    switch (e.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = focusedIndex + 1
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1
          }
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = focusedIndex - 1
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0
          }
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = focusedIndex + 1
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1
          }
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = focusedIndex - 1
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0
          }
        }
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = items.length - 1
        break
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex)
      items[newIndex]?.focus()
    }
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        if (!containerRef.current) return
        
        const items = focusManager.getFocusableElements(containerRef.current)
        const newIndex = items.indexOf(e.target as HTMLElement)
        if (newIndex >= 0) {
          setFocusedIndex(newIndex)
        }
      }}
    >
      {children}
    </div>
  )
}

interface KeyboardShortcutsProps {
  shortcuts: Array<{
    key: string
    modifier?: 'ctrl' | 'alt' | 'shift' | 'meta'
    description: string
    action: () => void
    global?: boolean
  }>
  showHelp?: boolean
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
  showHelp = false,
}) => {
  const [helpVisible, setHelpVisible] = useState(showHelp)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle help with Ctrl+?
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault()
        setHelpVisible(!helpVisible)
        return
      }

      shortcuts.forEach((shortcut) => {
        const modifierMatch = !shortcut.modifier || 
          (shortcut.modifier === 'ctrl' && e.ctrlKey) ||
          (shortcut.modifier === 'alt' && e.altKey) ||
          (shortcut.modifier === 'shift' && e.shiftKey) ||
          (shortcut.modifier === 'meta' && e.metaKey)

        if (modifierMatch && e.key.toLowerCase() === shortcut.key.toLowerCase()) {
          e.preventDefault()
          shortcut.action()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, helpVisible])

  const { isKeyboardUser } = useKeyboardNavigation()

  return (
    <>
      {/* Keyboard help overlay */}
      {helpVisible && (
        <FocusTrap active={helpVisible}>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-help-title"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="keyboard-help-title" className="text-lg font-semibold">
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setHelpVisible(false)}
                  className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Close keyboard shortcuts help"
                >
                  <span className="text-xl" aria-hidden="true">×</span>
                </button>
              </div>
              
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 bg-light-100 rounded text-xs font-mono">
                      {shortcut.modifier && `${shortcut.modifier}+`}{shortcut.key}
                    </kbd>
                  </div>
                ))}
                <div className="flex justify-between items-center border-t pt-2 mt-4">
                  <span className="text-sm text-text-secondary">
                    Show/hide this help
                  </span>
                  <kbd className="px-2 py-1 bg-light-100 rounded text-xs font-mono">
                    ctrl+?
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Keyboard user indicator */}
      {isKeyboardUser && (
        <div
          className="fixed bottom-4 right-4 bg-primary-600 text-white px-3 py-2 rounded shadow-lg text-sm z-40"
          role="status"
          aria-live="polite"
        >
          Keyboard navigation active
          <button
            onClick={() => setHelpVisible(true)}
            className="ml-2 underline hover:no-underline focus:outline-none"
            aria-label="Show keyboard shortcuts help"
          >
            Show shortcuts
          </button>
        </div>
      )}
    </>
  )
}

interface AccessibleMenuProps {
  trigger: React.ReactElement
  items: Array<{
    label: string
    action: () => void
    disabled?: boolean
    icon?: React.ReactNode
  }>
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
}

export const AccessibleMenu: React.FC<AccessibleMenuProps> = ({
  trigger,
  items,
  placement = 'bottom-start',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const openMenu = () => {
    setIsOpen(true)
    setFocusedIndex(0)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setFocusedIndex(-1)
    triggerRef.current?.focus()
  }

  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault()
        openMenu()
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(items.length - 1)
        break
    }
  }

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const nextIndex = prev + 1
          return nextIndex >= items.length ? 0 : nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const nextIndex = prev - 1
          return nextIndex < 0 ? items.length - 1 : nextIndex
        })
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && !items[focusedIndex].disabled) {
          items[focusedIndex].action()
          closeMenu()
        }
        break
    }
  }

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const focusableItems = focusManager.getFocusableElements(menuRef.current)
      focusableItems[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  return (
    <div className="relative">
      {React.cloneElement(trigger, {
        ref: triggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        onClick: () => setIsOpen(!isOpen),
        onKeyDown: handleTriggerKeyDown,
      })}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
            aria-hidden="true"
          />
          
          {/* Menu */}
          <div
            ref={menuRef}
            role="menu"
            className={`absolute z-20 bg-white border border-border-color rounded-lg shadow-lg py-1 min-w-48 ${
              placement.includes('top') ? 'bottom-full mb-1' : 'top-full mt-1'
            } ${
              placement.includes('end') ? 'right-0' : 'left-0'
            }`}
            onKeyDown={handleMenuKeyDown}
          >
            {items.map((item, index) => (
              <button
                key={index}
                role="menuitem"
                disabled={item.disabled}
                tabIndex={-1}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-light-100 focus:bg-light-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                  index === focusedIndex ? 'bg-light-100' : ''
                }`}
                onClick={() => {
                  if (!item.disabled) {
                    item.action()
                    closeMenu()
                  }
                }}
              >
                {item.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}