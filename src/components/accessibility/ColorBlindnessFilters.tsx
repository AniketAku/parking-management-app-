// Color Blindness SVG Filters
// Provides SVG filter definitions for color blindness simulation and accommodation

import React from 'react'

export const ColorBlindnessFilters: React.FC = () => {
  return (
    <svg
      className="colorblind-filters"
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {/* Protanopia (Red-blind) Filter */}
        <filter id="protanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.567, 0.433, 0,     0, 0
                    0.558, 0.442, 0,     0, 0
                    0,     0.242, 0.758, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Deuteranopia (Green-blind) Filter */}
        <filter id="deuteranopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.625, 0.375, 0,   0, 0
                    0.7,   0.3,   0,   0, 0
                    0,     0.3,   0.7, 0, 0
                    0,     0,     0,   1, 0"
          />
        </filter>

        {/* Tritanopia (Blue-blind) Filter */}
        <filter id="tritanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.95, 0.05,  0,     0, 0
                    0,    0.433, 0.567, 0, 0
                    0,    0.475, 0.525, 0, 0
                    0,    0,     0,     1, 0"
          />
        </filter>

        {/* Protanomaly (Red-weak) Filter */}
        <filter id="protanomaly-filter">
          <feColorMatrix
            type="matrix"
            values="0.817, 0.183, 0,     0, 0
                    0.333, 0.667, 0,     0, 0
                    0,     0.125, 0.875, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Deuteranomaly (Green-weak) Filter */}
        <filter id="deuteranomaly-filter">
          <feColorMatrix
            type="matrix"
            values="0.8,   0.2,   0,     0, 0
                    0.258, 0.742, 0,     0, 0
                    0,     0.142, 0.858, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Tritanomaly (Blue-weak) Filter */}
        <filter id="tritanomaly-filter">
          <feColorMatrix
            type="matrix"
            values="0.967, 0.033, 0,     0, 0
                    0,     0.733, 0.267, 0, 0
                    0,     0.183, 0.817, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Achromatopsia (Complete color blindness) Filter */}
        <filter id="achromatopsia-filter">
          <feColorMatrix
            type="matrix"
            values="0.299, 0.587, 0.114, 0, 0
                    0.299, 0.587, 0.114, 0, 0
                    0.299, 0.587, 0.114, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Achromatomaly (Partial color blindness) Filter */}
        <filter id="achromatomaly-filter">
          <feColorMatrix
            type="matrix"
            values="0.618, 0.320, 0.062, 0, 0
                    0.163, 0.775, 0.062, 0, 0
                    0.163, 0.320, 0.516, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* High contrast enhancement filter */}
        <filter id="high-contrast-filter">
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 .5 1"/>
          </feComponentTransfer>
        </filter>

        {/* Blue light filter for reduced eye strain */}
        <filter id="blue-light-filter">
          <feColorMatrix
            type="matrix"
            values="1,     0,     0,     0, 0
                    0,     0.9,   0,     0, 0
                    0,     0,     0.8,   0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Sepia filter for reduced contrast */}
        <filter id="sepia-filter">
          <feColorMatrix
            type="matrix"
            values="0.393, 0.769, 0.189, 0, 0
                    0.349, 0.686, 0.168, 0, 0
                    0.272, 0.534, 0.131, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Invert colors filter for high contrast */}
        <filter id="invert-filter">
          <feColorMatrix
            type="matrix"
            values="-1,  0,  0, 0, 1
                     0, -1,  0, 0, 1
                     0,  0, -1, 0, 1
                     0,  0,  0, 1, 0"
          />
        </filter>
      </defs>
    </svg>
  )
}

export default ColorBlindnessFilters