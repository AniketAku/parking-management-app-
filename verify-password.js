// Quick test to verify if '12345678' matches the stored hash
async function testPassword() {
    const password = '12345678'
    const storedHash = '16d58f83eb20f4f9a3c11461489a27382062a68420230d66eff2d30ab0b9a97d'
    
    // Compute SHA-256 of the password
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    console.log('Password:', password)
    console.log('Computed hash:', computedHash)
    console.log('Stored hash:  ', storedHash)
    console.log('Match:', computedHash === storedHash ? '✅ YES' : '❌ NO')
    
    return computedHash === storedHash
}

// Run in browser console
testPassword().then(result => console.log('Final result:', result))