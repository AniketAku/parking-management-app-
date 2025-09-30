// Debug script to check settings service
// Run this in browser console on your app

console.log('🔍 Debugging Settings Service...');

// Check if service is loaded
if (window.supabase) {
  // Query app_config table directly
  window.supabase
    .from('app_config')
    .select('*')
    .eq('category', 'business')
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Database query failed:', error);
      } else {
        console.log('📊 Business settings count:', data?.length || 0);
        console.log('📋 Business settings:', data);

        if (data?.length === 0) {
          console.warn('⚠️ CONFIRMED: app_config table is empty - run SQL fix');
        } else {
          console.log('✅ Settings found - should be working');
        }
      }
    });
} else {
  console.error('❌ Supabase not found in window object');
}

// Check hook state if available
setTimeout(() => {
  const businessSettings = document.querySelector('[data-testid="business-settings"]');
  if (businessSettings) {
    console.log('🎯 Business settings component found');
  }
}, 1000);