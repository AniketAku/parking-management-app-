# Settings Type Safety Migration Guide

This guide helps developers migrate components to use the new type-safe `SettingValue` system.

## Overview

The `settings.ts` type definitions have been upgraded from using `any` to a comprehensive type-safe union type system. This catches type errors at compile time instead of runtime.

## Type System

### Core Types

```typescript
type SettingPrimitiveValue = string | number | boolean | null
type SettingArrayValue = Array<SettingPrimitiveValue | SettingObjectValue>
type SettingObjectValue = { [key: string]: SettingValue }
type SettingValue = SettingPrimitiveValue | SettingArrayValue | SettingObjectValue
```

### Why This Change?

**Before (unsafe):**
```typescript
const timeout: number = setting.value  // ❌ Runtime error if value is string!
```

**After (type-safe):**
```typescript
const timeout = asSettingNumber(setting.value, 30)  // ✅ Always number, safe default
```

## Migration Patterns

### Pattern 1: Number Settings

**Before:**
```typescript
const timeout = setting.value as number
const retries = setting.value || 3
```

**After:**
```typescript
import { asSettingNumber } from '../types/settings'

const timeout = asSettingNumber(setting.value, 30)
const retries = asSettingNumber(setting.value, 3)
```

### Pattern 2: String Settings

**Before:**
```typescript
const name = setting.value as string
const label = setting.value || 'Unknown'
```

**After:**
```typescript
import { asSettingString } from '../types/settings'

const name = asSettingString(setting.value)
const label = asSettingString(setting.value, 'Unknown')
```

### Pattern 3: Boolean Settings

**Before:**
```typescript
const enabled = setting.value as boolean
const isActive = Boolean(setting.value)
```

**After:**
```typescript
import { asSettingBoolean } from '../types/settings'

const enabled = asSettingBoolean(setting.value)
const isActive = asSettingBoolean(setting.value, false)
```

### Pattern 4: Object Settings

**Before:**
```typescript
const config = setting.value as Record<string, any>
const rates = setting.value || {}
```

**After:**
```typescript
import { asSettingObject, isSettingObject } from '../types/settings'

const config = asSettingObject(setting.value)
const rates = asSettingObject(setting.value, {})

// For type narrowing:
if (isSettingObject(setting.value)) {
  // TypeScript knows value is SettingObjectValue here
  Object.keys(setting.value).forEach(key => {
    // Safe to access properties
  })
}
```

### Pattern 5: Array Settings

**Before:**
```typescript
const items = setting.value as any[]
const list = Array.isArray(setting.value) ? setting.value : []
```

**After:**
```typescript
import { asSettingArray, isSettingArray } from '../types/settings'

const items = asSettingArray(setting.value)
const list = asSettingArray(setting.value, [])

// For type narrowing:
if (isSettingArray(setting.value)) {
  // TypeScript knows value is SettingArrayValue here
  setting.value.map(item => /* ... */)
}
```

### Pattern 6: Display Rendering

**Before:**
```typescript
const displayValue = typeof setting.value === 'object'
  ? JSON.stringify(setting.value)
  : String(setting.value)
```

**After:**
```typescript
import { settingValueToString } from '../types/settings'

const displayValue = settingValueToString(setting.value)
```

## Common Component Fixes

### Input Components

```typescript
// Number input
<input
  type="number"
  value={asSettingNumber(value, 0)}
  onChange={(e) => onChange(Number(e.target.value))}
/>

// Text input
<input
  type="text"
  value={asSettingString(value)}
  onChange={(e) => onChange(e.target.value)}
/>

// Checkbox
<input
  type="checkbox"
  checked={asSettingBoolean(value)}
  onChange={(e) => onChange(e.target.checked)}
/>
```

### Display Components

```typescript
// Safe number display
<span>{asSettingNumber(value, 0).toFixed(2)}</span>

// Safe string display
<div>{asSettingString(value, 'N/A')}</div>

// Complex value display
<pre>{settingValueToString(value)}</pre>
```

## Available Utilities

### Type Guards (for narrowing)

- `isSettingString(value)` - Returns true if value is string
- `isSettingNumber(value)` - Returns true if value is number
- `isSettingBoolean(value)` - Returns true if value is boolean
- `isSettingNull(value)` - Returns true if value is null
- `isSettingArray(value)` - Returns true if value is array
- `isSettingObject(value)` - Returns true if value is object

### Safe Accessors (with defaults)

- `asSettingString(value, default = '')` - Always returns string
- `asSettingNumber(value, default = 0)` - Always returns number
- `asSettingBoolean(value, default = false)` - Always returns boolean
- `asSettingArray(value, default = [])` - Always returns array
- `asSettingObject(value, default = {})` - Always returns object

### Display Helpers

- `settingValueToString(value)` - Converts any SettingValue to display string

## Benefits

1. **Compile-time Safety**: Catch type errors during development, not in production
2. **Better IntelliSense**: IDE provides accurate autocomplete and type hints
3. **Safer Defaults**: Explicit default values prevent undefined/null errors
4. **Self-documenting**: Code clearly shows expected types
5. **Easier Refactoring**: TypeScript helps track all usage sites

## Examples from Codebase

### AdvancedSettingsManager.tsx

**Before:**
```typescript
min_value={setting.min_value as number}
max_value={setting.max_value as number}
```

**After:**
```typescript
import { asSettingNumber } from '../../types/settings'

min_value={asSettingNumber(setting.min_value)}
max_value={asSettingNumber(setting.max_value)}
```

### SettingsFormField.tsx

**Before:**
```typescript
const displayValue = typeof value === 'object'
  ? JSON.stringify(value)
  : value
```

**After:**
```typescript
import { settingValueToString } from '../../types/settings'

const displayValue = settingValueToString(value)
```

## Need Help?

- Check type errors carefully - they're helping prevent runtime bugs!
- Use type guards when you need to narrow types
- Always provide sensible defaults to safe accessor functions
- If unsure, use `settingValueToString()` for display-only contexts

## Related Files

- Type definitions: `web-app/src/types/settings.ts`
- Example usage: `web-app/src/hooks/useNewSettings.ts`
- Service implementation: `web-app/src/services/newSettingsService.ts`
