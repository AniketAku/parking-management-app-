// Accessibility Testing Utilities
// Automated testing helpers for WCAG 2.1 AA compliance validation

import { a11yTest, colorUtils } from './accessibility'

export interface AccessibilityReport {
  score: number // 0-100
  level: 'AAA' | 'AA' | 'A' | 'Fail'
  issues: AccessibilityIssue[]
  recommendations: string[]
  summary: {
    total: number
    passed: number
    warnings: number
    errors: number
  }
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  element: HTMLElement
  message: string
  wcagCriterion: string
  suggestions: string[]
}

export class AccessibilityValidator {
  private report: AccessibilityReport = {
    score: 0,
    level: 'Fail',
    issues: [],
    recommendations: [],
    summary: { total: 0, passed: 0, warnings: 0, errors: 0 }
  }

  /**
   * Run comprehensive accessibility audit on the current page
   */
  public async runAudit(container?: HTMLElement): Promise<AccessibilityReport> {
    const target = container || document.body
    this.resetReport()

    // Run all accessibility checks
    await Promise.all([
      this.checkSemanticStructure(target),
      this.checkKeyboardAccessibility(target),
      this.checkColorContrast(target),
      this.checkFormAccessibility(target),
      this.checkImageAccessibility(target),
      this.checkFocusManagement(target),
      this.checkAriaUsage(target),
      this.checkHeadingStructure(target),
      this.checkLinkAccessibility(target),
      this.checkTableAccessibility(target),
    ])

    this.calculateScore()
    return this.report
  }

  /**
   * Check semantic HTML structure
   */
  private async checkSemanticStructure(container: HTMLElement): Promise<void> {
    const landmarks = container.querySelectorAll('main, nav, header, footer, aside, section, article')
    
    if (landmarks.length === 0) {
      this.addIssue('warning', container, 
        'No semantic landmarks found. Consider using <main>, <nav>, <header>, etc.',
        '1.3.1',
        ['Add semantic HTML5 elements', 'Use ARIA landmarks as fallback']
      )
    }

    // Check for main landmark
    const mainElements = container.querySelectorAll('main, [role="main"]')
    if (mainElements.length === 0) {
      this.addIssue('error', container,
        'No main landmark found. Each page should have exactly one main content area.',
        '1.3.1',
        ['Add <main> element', 'Add role="main" to content container']
      )
    } else if (mainElements.length > 1) {
      this.addIssue('error', container,
        'Multiple main landmarks found. Only one main element is allowed per page.',
        '1.3.1',
        ['Remove duplicate main elements', 'Use sections within main instead']
      )
    }

    // Check skip links
    const skipLinks = container.querySelectorAll('a[href^="#"]')
    if (skipLinks.length === 0) {
      this.addIssue('warning', container,
        'No skip links found. Consider adding "Skip to main content" link.',
        '2.4.1',
        ['Add skip navigation links', 'Ensure links are keyboard accessible']
      )
    }
  }

  /**
   * Check keyboard accessibility
   */
  private async checkKeyboardAccessibility(container: HTMLElement): Promise<void> {
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]')
    
    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      
      // Check if element is keyboard accessible
      if (!a11yTest.isKeyboardAccessible(htmlElement)) {
        this.addIssue('error', htmlElement,
          'Interactive element is not keyboard accessible',
          '2.1.1',
          ['Add tabindex="0" for custom interactive elements', 'Ensure element can receive focus', 'Add keyboard event handlers']
        )
      }

      // Check for custom interactive elements without proper role
      const tagName = element.tagName.toLowerCase()
      const role = element.getAttribute('role')
      if (!['button', 'a', 'input', 'select', 'textarea'].includes(tagName) && !role) {
        this.addIssue('warning', htmlElement,
          'Custom interactive element should have appropriate role',
          '4.1.2',
          ['Add role="button" for clickable elements', 'Add role="link" for navigation elements']
        )
      }

      // Check for accessible name
      if (!a11yTest.hasAccessibleName(htmlElement)) {
        this.addIssue('error', htmlElement,
          'Interactive element lacks accessible name',
          '4.1.2',
          ['Add aria-label attribute', 'Add aria-labelledby reference', 'Add visible text content']
        )
      }
    })
  }

  /**
   * Check color contrast compliance
   */
  private async checkColorContrast(container: HTMLElement): Promise<void> {
    const textElements = container.querySelectorAll('*')
    
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      const styles = window.getComputedStyle(htmlElement)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastFromComputedStyles(color, backgroundColor)
        const fontSize = parseFloat(styles.fontSize)
        const fontWeight = styles.fontWeight
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
        const minContrast = isLargeText ? 3 : 4.5
        
        if (contrast < minContrast) {
          this.addIssue('error', htmlElement,
            `Insufficient color contrast: ${contrast.toFixed(2)}:1 (minimum: ${minContrast}:1)`,
            '1.4.3',
            ['Increase color contrast', 'Use darker text or lighter background', 'Consider high contrast theme']
          )
        }
      }
    })
  }

  /**
   * Check form accessibility
   */
  private async checkFormAccessibility(container: HTMLElement): Promise<void> {
    const formControls = container.querySelectorAll('input, select, textarea')
    
    formControls.forEach((control) => {
      const htmlControl = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      
      // Check for labels
      if (!a11yTest.hasLabel(htmlControl)) {
        this.addIssue('error', htmlControl,
          'Form control missing label',
          '3.3.2',
          ['Add <label> element with for attribute', 'Add aria-label attribute', 'Add aria-labelledby reference']
        )
      }

      // Check required fields
      if (htmlControl.hasAttribute('required')) {
        const hasRequiredIndicator = 
          htmlControl.getAttribute('aria-required') === 'true' ||
          container.querySelector(`label[for="${htmlControl.id}"] .required`) ||
          htmlControl.getAttribute('aria-describedby')?.includes('required')
        
        if (!hasRequiredIndicator) {
          this.addIssue('warning', htmlControl,
            'Required field should be clearly indicated',
            '3.3.2',
            ['Add aria-required="true"', 'Add visual required indicator', 'Include required in field description']
          )
        }
      }

      // Check error handling
      if (htmlControl.getAttribute('aria-invalid') === 'true') {
        const hasErrorMessage = htmlControl.getAttribute('aria-describedby')
        if (!hasErrorMessage) {
          this.addIssue('error', htmlControl,
            'Invalid field missing error description',
            '3.3.1',
            ['Add aria-describedby pointing to error message', 'Ensure error message is programmatically associated']
          )
        }
      }
    })
  }

  /**
   * Check image accessibility
   */
  private async checkImageAccessibility(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img')
    
    images.forEach((img) => {
      const alt = img.getAttribute('alt')
      
      if (alt === null) {
        this.addIssue('error', img,
          'Image missing alt attribute',
          '1.1.1',
          ['Add descriptive alt text', 'Add alt="" for decorative images', 'Use aria-label if alt is not appropriate']
        )
      } else if (alt === '' && !img.hasAttribute('role')) {
        // Decorative image should have role="presentation" for clarity
        this.addIssue('info', img,
          'Decorative image could benefit from role="presentation"',
          '1.1.1',
          ['Add role="presentation" for clarity', 'Consider if image is truly decorative']
        )
      }
    })
  }

  /**
   * Check focus management
   */
  private async checkFocusManagement(container: HTMLElement): Promise<void> {
    const focusableElements = container.querySelectorAll('[tabindex]')
    
    focusableElements.forEach((element) => {
      const tabIndex = element.getAttribute('tabindex')
      
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue('warning', element as HTMLElement,
          'Positive tabindex can disrupt natural tab order',
          '2.4.3',
          ['Use tabindex="0" or no tabindex for focusable elements', 'Use tabindex="-1" only to remove from tab order']
        )
      }
    })
  }

  /**
   * Check ARIA usage
   */
  private async checkAriaUsage(container: HTMLElement): Promise<void> {
    const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby]')
    
    elementsWithAria.forEach((element) => {
      const labelledBy = element.getAttribute('aria-labelledby')
      const describedBy = element.getAttribute('aria-describedby')
      
      if (labelledBy) {
        const referencedElements = labelledBy.split(' ').map(id => container.querySelector(`#${id}`))
        if (referencedElements.some(el => !el)) {
          this.addIssue('error', element as HTMLElement,
            'aria-labelledby references non-existent element',
            '4.1.2',
            ['Ensure referenced elements exist', 'Check ID spelling', 'Remove invalid references']
          )
        }
      }
      
      if (describedBy) {
        const referencedElements = describedBy.split(' ').map(id => container.querySelector(`#${id}`))
        if (referencedElements.some(el => !el)) {
          this.addIssue('error', element as HTMLElement,
            'aria-describedby references non-existent element',
            '4.1.2',
            ['Ensure referenced elements exist', 'Check ID spelling', 'Remove invalid references']
          )
        }
      }
    })
  }

  /**
   * Check heading structure
   */
  private async checkHeadingStructure(container: HTMLElement): Promise<void> {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    
    if (headings.length === 0) {
      this.addIssue('warning', container,
        'No headings found. Content should be structured with headings.',
        '2.4.6',
        ['Add heading elements to structure content', 'Ensure logical heading hierarchy']
      )
      return
    }

    let previousLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (index === 0 && level !== 1) {
        this.addIssue('warning', heading as HTMLElement,
          'First heading should be h1',
          '2.4.6',
          ['Start with h1 for main page title', 'Ensure logical heading hierarchy']
        )
      }
      
      if (level > previousLevel + 1) {
        this.addIssue('warning', heading as HTMLElement,
          `Heading level ${level} skips level ${previousLevel + 1}`,
          '2.4.6',
          ['Maintain sequential heading levels', 'Don\'t skip heading levels']
        )
      }
      
      previousLevel = level
    })
  }

  /**
   * Check link accessibility
   */
  private async checkLinkAccessibility(container: HTMLElement): Promise<void> {
    const links = container.querySelectorAll('a[href]')
    
    links.forEach((link) => {
      const href = link.getAttribute('href')
      const text = link.textContent?.trim()
      
      if (!text || text.length < 2) {
        this.addIssue('error', link as HTMLElement,
          'Link has insufficient or missing text content',
          '2.4.4',
          ['Add descriptive link text', 'Use aria-label for context', 'Add sr-only text for clarity']
        )
      }
      
      if (href?.startsWith('javascript:')) {
        this.addIssue('warning', link as HTMLElement,
          'JavaScript links may not be accessible',
          '2.1.1',
          ['Use button element instead', 'Ensure keyboard accessibility', 'Add proper event handlers']
        )
      }
      
      // Check for generic link text
      const genericTexts = ['click here', 'read more', 'here', 'more', 'link']
      if (text && genericTexts.includes(text.toLowerCase())) {
        this.addIssue('warning', link as HTMLElement,
          'Link text is not descriptive',
          '2.4.4',
          ['Use descriptive link text', 'Add context with aria-label', 'Make link purpose clear']
        )
      }
    })
  }

  /**
   * Check table accessibility
   */
  private async checkTableAccessibility(container: HTMLElement): Promise<void> {
    const tables = container.querySelectorAll('table')
    
    tables.forEach((table) => {
      // Check for caption
      const caption = table.querySelector('caption')
      if (!caption && !table.getAttribute('aria-label') && !table.getAttribute('aria-labelledby')) {
        this.addIssue('warning', table,
          'Table missing caption or accessible name',
          '1.3.1',
          ['Add <caption> element', 'Add aria-label attribute', 'Add aria-labelledby reference']
        )
      }
      
      // Check for headers
      const headers = table.querySelectorAll('th')
      if (headers.length === 0) {
        this.addIssue('error', table,
          'Table missing header cells',
          '1.3.1',
          ['Add <th> elements for headers', 'Use scope attribute for complex tables', 'Add headers attribute if needed']
        )
      }
      
      // Check header scope
      headers.forEach((header) => {
        const scope = header.getAttribute('scope')
        if (!scope) {
          this.addIssue('info', header as HTMLElement,
            'Table header could benefit from scope attribute',
            '1.3.1',
            ['Add scope="col" for column headers', 'Add scope="row" for row headers']
          )
        }
      })
    })
  }

  /**
   * Calculate contrast from computed styles
   */
  private calculateContrastFromComputedStyles(color: string, backgroundColor: string): number {
    // Parse RGB values from computed styles
    const parseRgb = (rgbString: string) => {
      const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : null
    }
    
    const textColor = parseRgb(color)
    const bgColor = parseRgb(backgroundColor)
    
    if (!textColor || !bgColor) return 21 // Max contrast if can't parse
    
    const textLum = colorUtils.getLuminance(textColor)
    const bgLum = colorUtils.getLuminance(bgColor)
    
    const lighter = Math.max(textLum, bgLum)
    const darker = Math.min(textLum, bgLum)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Add issue to report
   */
  private addIssue(type: 'error' | 'warning' | 'info', element: HTMLElement, message: string, wcagCriterion: string, suggestions: string[]): void {
    this.report.issues.push({
      type,
      element,
      message,
      wcagCriterion,
      suggestions
    })
    
    this.report.summary.total++
    if (type === 'error') this.report.summary.errors++
    else if (type === 'warning') this.report.summary.warnings++
    else this.report.summary.passed++
  }

  /**
   * Calculate overall accessibility score
   */
  private calculateScore(): void {
    const { total, errors, warnings } = this.report.summary
    
    if (total === 0) {
      this.report.score = 100
      this.report.level = 'AAA'
      return
    }
    
    // Calculate score: errors are weighted more heavily than warnings
    const errorPenalty = errors * 10
    const warningPenalty = warnings * 5
    const totalPenalty = errorPenalty + warningPenalty
    
    this.report.score = Math.max(0, 100 - (totalPenalty / total) * 100)
    
    // Determine WCAG level
    if (errors === 0 && warnings === 0) {
      this.report.level = 'AAA'
    } else if (errors === 0 && warnings <= total * 0.1) {
      this.report.level = 'AA'
    } else if (errors <= total * 0.05) {
      this.report.level = 'A'
    } else {
      this.report.level = 'Fail'
    }
    
    // Generate recommendations
    this.generateRecommendations()
  }

  /**
   * Generate accessibility recommendations
   */
  private generateRecommendations(): void {
    const recommendations: string[] = []
    
    if (this.report.summary.errors > 0) {
      recommendations.push('Address all critical errors to meet basic accessibility standards')
    }
    
    if (this.report.summary.warnings > 5) {
      recommendations.push('Review and resolve warnings to improve accessibility')
    }
    
    const commonIssues = this.getCommonIssues()
    if (commonIssues.length > 0) {
      recommendations.push(`Focus on common issues: ${commonIssues.join(', ')}`)
    }
    
    recommendations.push('Test with screen readers and keyboard navigation')
    recommendations.push('Validate with users who have disabilities')
    
    this.report.recommendations = recommendations
  }

  /**
   * Get most common issue types
   */
  private getCommonIssues(): string[] {
    const issueCounts: Record<string, number> = {}
    
    this.report.issues.forEach(issue => {
      const key = issue.wcagCriterion
      issueCounts[key] = (issueCounts[key] || 0) + 1
    })
    
    return Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([criterion]) => criterion)
  }

  /**
   * Reset report for new audit
   */
  private resetReport(): void {
    this.report = {
      score: 0,
      level: 'Fail',
      issues: [],
      recommendations: [],
      summary: { total: 0, passed: 0, warnings: 0, errors: 0 }
    }
  }
}

/**
 * Quick accessibility check function
 */
export const quickAccessibilityCheck = async (element?: HTMLElement): Promise<AccessibilityReport> => {
  const validator = new AccessibilityValidator()
  return await validator.runAudit(element)
}

/**
 * Generate accessibility report as HTML
 */
export const generateAccessibilityReportHTML = (report: AccessibilityReport): string => {
  const { score, level, issues, recommendations, summary } = report
  
  return `
    <div class="accessibility-report">
      <h2>Accessibility Report</h2>
      <div class="score">
        <h3>Score: ${score.toFixed(1)}/100 (${level})</h3>
        <div class="summary">
          <span>Total Issues: ${summary.total}</span>
          <span>Errors: ${summary.errors}</span>
          <span>Warnings: ${summary.warnings}</span>
          <span>Passed: ${summary.passed}</span>
        </div>
      </div>
      
      <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      
      <div class="issues">
        <h3>Issues Found</h3>
        ${issues.map(issue => `
          <div class="issue ${issue.type}">
            <h4>${issue.message}</h4>
            <p>WCAG Criterion: ${issue.wcagCriterion}</p>
            <ul>
              ${issue.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

export default AccessibilityValidator