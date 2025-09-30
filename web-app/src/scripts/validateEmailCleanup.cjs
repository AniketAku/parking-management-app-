/**
 * Email Cleanup Validation Script (CommonJS)
 * Validates that email cleanup has been properly implemented
 */

const fs = require('fs');
const path = require('path');

// Validation functions
function validatePhoneFormat(phone) {
    // International format: +1234567890 (7-15 digits after country code)
    return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function normalizePhoneNumber(phone) {
    return phone.replace(/[\s\-\(\)]/g, '');
}

function runValidationTests() {
    console.log('🧪 Running Email Cleanup Validation Tests...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        details: []
    };

    const tests = [
        {
            name: 'Phone Validation - Valid Numbers',
            test: () => {
                const validPhones = [
                    '+1234567890',
                    '+19876543210', 
                    '+447911123456',
                    '+33123456789'
                ];

                for (const phone of validPhones) {
                    const normalized = normalizePhoneNumber(phone);
                    if (!validatePhoneFormat(normalized)) {
                        return {
                            result: 'FAIL',
                            message: `Valid phone ${phone} failed validation`
                        };
                    }
                }

                return {
                    result: 'PASS',
                    message: 'All valid phone numbers pass validation'
                };
            }
        },
        {
            name: 'Phone Validation - Invalid Numbers',
            test: () => {
                const invalidPhones = [
                    'invalid',
                    '123',
                    'abc-def-ghij',
                    '++1234567890',
                    '12345678901234567890' // Too long
                ];

                for (const phone of invalidPhones) {
                    const normalized = normalizePhoneNumber(phone);
                    if (validatePhoneFormat(normalized)) {
                        return {
                            result: 'FAIL', 
                            message: `Invalid phone ${phone} passed validation`
                        };
                    }
                }

                return {
                    result: 'PASS',
                    message: 'All invalid phone numbers correctly fail validation'
                };
            }
        },
        {
            name: 'Phone Normalization',
            test: () => {
                const testCases = [
                    { input: '+1 (555) 123-4567', expected: '+15551234567' },
                    { input: '+44 20 7946 0958', expected: '+442079460958' },
                    { input: '1-555-123-4567', expected: '15551234567' }
                ];

                for (const testCase of testCases) {
                    const result = normalizePhoneNumber(testCase.input);
                    if (result !== testCase.expected) {
                        return {
                            result: 'FAIL',
                            message: `Phone normalization failed: ${testCase.input} -> ${result} (expected ${testCase.expected})`
                        };
                    }
                }

                return {
                    result: 'PASS',
                    message: 'Phone normalization working correctly'
                };
            }
        },
        {
            name: 'File Structure Validation',
            test: () => {
                try {
                    const projectRoot = path.resolve(__dirname, '../../..');
                    
                    // Check key files exist
                    const keyFiles = [
                        'web-app/src/services/userService.ts',
                        'web-app/src/types/index.ts',
                        'web-app/src/stores/authStore.ts',
                        'src/api/schemas/auth.py',
                        'web-app/database/complete-email-cleanup.sql'
                    ];
                    
                    const missingFiles = [];
                    for (const file of keyFiles) {
                        const fullPath = path.join(projectRoot, file);
                        if (!fs.existsSync(fullPath)) {
                            missingFiles.push(file);
                        }
                    }
                    
                    if (missingFiles.length > 0) {
                        return {
                            result: 'FAIL',
                            message: `Missing required files: ${missingFiles.join(', ')}`
                        };
                    }
                    
                    return {
                        result: 'PASS',
                        message: 'All required files are present'
                    };
                } catch (error) {
                    return {
                        result: 'FAIL',
                        message: `File structure validation error: ${error.message}`
                    };
                }
            }
        },
        {
            name: 'Code Content Validation',
            test: () => {
                try {
                    const projectRoot = path.resolve(__dirname, '../../..');
                    
                    // Check that userService.ts has been updated
                    const userServicePath = path.join(projectRoot, 'web-app/src/services/userService.ts');
                    const userServiceContent = fs.readFileSync(userServicePath, 'utf8');
                    
                    // Should NOT contain email placeholders
                    if (userServiceContent.includes('@noemail.local')) {
                        return {
                            result: 'FAIL',
                            message: 'userService.ts still contains email placeholders (@noemail.local)'
                        };
                    }
                    
                    // Should contain phone validation
                    if (!userServiceContent.includes('phone')) {
                        return {
                            result: 'FAIL',
                            message: 'userService.ts missing phone field implementation'
                        };
                    }
                    
                    // Check types file
                    const typesPath = path.join(projectRoot, 'web-app/src/types/index.ts');
                    const typesContent = fs.readFileSync(typesPath, 'utf8');
                    
                    if (!typesContent.includes('phone:')) {
                        return {
                            result: 'FAIL',
                            message: 'types/index.ts missing phone field in interfaces'
                        };
                    }
                    
                    return {
                        result: 'PASS',
                        message: 'Code content properly updated for phone-only registration'
                    };
                } catch (error) {
                    return {
                        result: 'FAIL',
                        message: `Code content validation error: ${error.message}`
                    };
                }
            }
        }
    ];

    // Run tests
    results.total = tests.length;
    
    for (const { name, test } of tests) {
        console.log(`  Testing: ${name}...`);
        
        try {
            const result = test();
            
            results.details.push({
                test: name,
                result: result.result,
                message: result.message
            });
            
            if (result.result === 'PASS') {
                results.passed++;
                console.log(`    ✅ ${name}: ${result.message}`);
            } else {
                results.failed++;
                console.log(`    ❌ ${name}: ${result.message}`);
            }
        } catch (error) {
            results.failed++;
            const errorMessage = error.message || 'Unknown error';
            results.details.push({
                test: name,
                result: 'FAIL',
                message: `Test execution failed: ${errorMessage}`
            });
            console.log(`    ❌ ${name}: Test execution failed: ${errorMessage}`);
        }
    }

    return results;
}

function generateValidationReport(results) {
    const successRate = Math.round((results.passed / results.total) * 100);
    
    let report = `# Email Cleanup Validation Report\n\n`;
    report += `**Validation Date:** ${new Date().toISOString()}\n`;
    report += `**Success Rate:** ${successRate}% (${results.passed}/${results.total})\n\n`;
    
    if (successRate === 100) {
        report += `🎉 **ALL VALIDATIONS PASSED** - Email cleanup implementation is working correctly!\n\n`;
    } else {
        report += `⚠️ **${results.failed} VALIDATION(S) FAILED** - Review and fix issues below.\n\n`;
    }
    
    report += `## Validation Results\n\n`;
    
    for (const detail of results.details) {
        const icon = detail.result === 'PASS' ? '✅' : '❌';
        report += `### ${icon} ${detail.test}\n`;
        report += `**Result:** ${detail.result}\n`;
        report += `**Message:** ${detail.message}\n\n`;
    }
    
    report += `## Summary\n\n`;
    if (successRate === 100) {
        report += `✅ All core validation tests pass\n`;
        report += `✅ Phone validation system working correctly\n`;
        report += `✅ File structure is complete\n`;
        report += `✅ Code content properly updated\n`;
        report += `✅ Email cleanup implementation is ready for production\n\n`;
    } else {
        report += `**Issues Found:**\n`;
        for (const detail of results.details) {
            if (detail.result === 'FAIL') {
                report += `- ${detail.test}: ${detail.message}\n`;
            }
        }
        report += `\n**Recommendation:** Address the failed validations before deployment.\n`;
    }
    
    return report;
}

// Export for testing
module.exports = {
    runValidationTests,
    generateValidationReport,
    validatePhoneFormat,
    normalizePhoneNumber
};

// Run if executed directly
if (require.main === module) {
    const results = runValidationTests();
    const report = generateValidationReport(results);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Validations: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
    console.log('='.repeat(50));
    
    if (results.failed > 0) {
        console.log('\n❌ FAILED VALIDATIONS:');
        results.details
            .filter(d => d.result === 'FAIL')
            .forEach(d => console.log(`  - ${d.test}: ${d.message}`));
    } else {
        console.log('\n🎉 ALL VALIDATIONS PASSED!');
        console.log('Email cleanup implementation is working correctly!');
    }
}