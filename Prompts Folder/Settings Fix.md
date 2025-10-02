# SuperClaude Prompts for Settings Propagation Fix

## **🚨 CRITICAL: Service Architecture Duplication Fix**

**FUNDAMENTAL ISSUE: Two independent systems managing same business data with zero synchronization**

**ROOT CAUSE: VehicleEntryForm using legacy businessConfigService instead of modern centralized settings system**

---

## **Phase 1: Emergency Fix (< 1 hour) 🚨**

### **Prompt 1.1: Immediate Import Path Correction**
```bash
/sc:analyze --existing --import-path --service-duplication --critical --seq --persona-backend --c7

🚨 CRITICAL SERVICE DUPLICATION: Fix immediate settings propagation failure by correcting import paths.

Current Architecture Problem Analysis:
- Modern Settings System: settingsService.ts (1102 lines) → app_settings table
- Legacy Business System: businessConfigService.ts (147 lines) → business_config table  
- VehicleEntryForm.tsx:7 imports WRONG hook pointing to legacy isolated service
- Result: Complete data isolation between settings interface and form consumption

/sc:fix --import-path --service-unification --immediate --critical --persona-backend

IMMEDIATE IMPORT FIX REQUIRED:

1. **Correct Import Path in VehicleEntryForm.tsx:**
```typescript
// CURRENT PROBLEM (Line 7):
import { useBusinessConfig } from '../../hooks/useBusinessConfig' // WRONG - Legacy service

// CORRECT IMPORT:
import { useBusinessConfig } from '../../hooks/useCentralizedSettings' // Modern service

// Verify hook interface compatibility
interface BusinessConfigHook {
  config: BusinessConfiguration
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isLoaded: boolean
  // Ensure return interface matches existing VehicleEntryForm usage
}
```

2. **Validate Hook Interface Compatibility:**
```typescript
// Check if useCentralizedSettings returns compatible interface
const VehicleEntryForm: React.FC = () => {
  // BEFORE (legacy):
  const { config, loading, error, refresh, isLoaded } = useBusinessConfig()
  
  // AFTER (modern) - verify same interface:
  const { config, loading, error, refresh, isLoaded } = useBusinessConfig() // from useCentralizedSettings
  
  // Ensure all existing form logic works without changes
  const vehicleRates = config.rates // Must exist
  const validationRules = config.validation // Must exist  
}
```

3. **Real-time Validation Test:**
```typescript
// Test immediate propagation after fix
const validateSettingsPropagation = async () => {
  // 1. Change vehicle rate in settings interface
  await settingsService.updateSetting('business.vehicleRates.truck', 500)
  
  // 2. Verify VehicleEntryForm sees change within 1 second
  const formConfig = await useCentralizedSettings().getBusinessConfig()
  
  // 3. Confirm real-time subscription works
  expect(formConfig.rates.truck).toBe(500)
}
```

Generate immediate fix that corrects import path and validates interface compatibility to restore settings propagation.
```

### **Prompt 1.2: Critical Fix Validation & Testing**
```bash
/sc:test --settings-propagation --real-time --validation --critical --persona-qa --seq

VALIDATE EMERGENCY FIX: Comprehensive testing to ensure settings propagation works after import path correction.

/sc:implement --validation-tests --real-time-sync --critical-verification --persona-qa --seq

CRITICAL VALIDATION TESTING:

1. **Settings Propagation Test:**
```typescript
describe('Critical Settings Propagation Fix', () => {
  test('Settings changes propagate to VehicleEntryForm immediately', async () => {
    // 1. Load initial form state
    render(<VehicleEntryForm />)
    const initialRate = screen.getByTestId('truck-rate').textContent
    
    // 2. Change setting via settings interface
    await settingsService.updateSetting('business.vehicleRates.truck', 750)
    
    // 3. Verify form updates within 1 second
    await waitFor(() => {
      expect(screen.getByTestId('truck-rate')).toHaveTextContent('750')
    }, { timeout: 1000 })
  })
  
  test('Real-time subscription works across multiple views', async () => {
    const { rerender } = render(<VehicleEntryForm />)
    
    // Change settings
    await settingsService.updateSetting('business.gracePeriod', 15)
    
    // Re-render form
    rerender(<VehicleEntryForm />)
    
    // Verify immediate update without page refresh
    expect(screen.getByTestId('grace-period')).toHaveTextContent('15')
  })
  
  test('Fallback behavior when settings service unavailable', async () => {
    // Mock service failure
    jest.spyOn(settingsService, 'getBusinessConfig').mockRejectedValue(new Error('Service down'))
    
    render(<VehicleEntryForm />)
    
    // Verify fallback values are used
    await waitFor(() => {
      expect(screen.getByTestId('truck-rate')).toHaveTextContent('0') // Default fallback
    })
  })
})
```

2. **Data Integrity Verification:**
```typescript
// Ensure no data loss during service migration
const verifyDataIntegrity = async () => {
  // 1. Get all current business settings
  const modernSettings = await settingsService.getAllBusinessSettings()
  const legacySettings = await businessConfigService.getAllSettings()
  
  // 2. Compare critical business values
  const criticalKeys = ['vehicleRates', 'gracePeriod', 'minimumCharge']
  
  criticalKeys.forEach(key => {
    const modernValue = modernSettings[key]
    const legacyValue = legacySettings[key]
    
    if (JSON.stringify(modernValue) !== JSON.stringify(legacyValue)) {
      console.warn(`Data mismatch for ${key}:`, { modernValue, legacyValue })
    }
  })
}
```

3. **Performance Impact Assessment:**
```typescript
// Measure performance impact of centralized settings
const performanceTest = async () => {
  const startTime = performance.now()
  
  // Load business config via modern system
  const config = await useCentralizedSettings().getBusinessConfig()
  
  const loadTime = performance.now() - startTime
  
  // Verify load time < 200ms requirement
  expect(loadTime).toBeLessThan(200)
  
  console.log(`Settings load time: ${loadTime}ms`)
}
```

Generate comprehensive validation tests ensuring emergency fix restores settings propagation without data loss or performance degradation.
```

---

## **Phase 2: Legacy System Removal (2-4 hours) 🧹**

### **Prompt 2.1: Legacy Service Cleanup**
```bash
/sc:analyze --existing --legacy-removal --duplicate-code --seq --persona-architect --c7

LEGACY SERVICE REMOVAL: Eliminate duplicate businessConfigService system now that modern centralized system is connected.

Current Duplication Assessment:
- businessConfigService.ts: 147 lines of duplicate functionality
- hooks/useBusinessConfig.ts: 160 lines of legacy hook implementation  
- business_config table: Separate database table with same logical data
- Total technical debt: 307 lines of duplicate code + database schema duplication

/sc:implement --ultrathink --legacy-cleanup --code-removal --architecture-simplification --persona-backend --seq

SYSTEMATIC LEGACY REMOVAL:

1. **Dependency Analysis & Safe Removal:**
```typescript
// Step 1: Verify no other components use legacy service
const dependencyAudit = async () => {
  // Search confirmed: Only VehicleEntryForm affected by legacy import
  // Safe to remove entire legacy system
  
  const filesToRemove = [
    'services/businessConfigService.ts',     // 147 lines
    'hooks/useBusinessConfig.ts',           // 160 lines
  ]
  
  const tablesToDeprecate = [
    'business_config' // Will be migrated to app_settings
  ]
  
  return { filesToRemove, tablesToDeprecate }
}
```

2. **Legacy Service Removal Process:**
```bash
# Remove legacy service files
rm services/businessConfigService.ts
rm hooks/useBusinessConfig.ts

# Verify no broken imports
grep -r "businessConfigService" src/ || echo "No legacy imports found"
grep -r "useBusinessConfig" src/ --exclude="useCentralizedSettings.ts" || echo "Clean removal"
```

3. **Database Schema Cleanup:**
```sql
-- Step 1: Backup legacy data before removal
CREATE TABLE business_config_backup AS 
SELECT * FROM business_config;

-- Step 2: Verify data migration completed successfully
SELECT 
  COUNT(*) as legacy_count,
  (SELECT COUNT(*) FROM app_settings WHERE category = 'business') as modern_count
FROM business_config;

-- Step 3: Drop legacy table after validation
-- DROP TABLE business_config; -- Execute after Phase 3 migration
```

4. **Import Path Validation:**
```typescript
// Ensure all imports now point to centralized system
const validateImports = () => {
  // Check VehicleEntryForm uses correct import
  const formImports = `
    import { useBusinessConfig }