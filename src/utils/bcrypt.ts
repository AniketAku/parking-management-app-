// Simple bcrypt comparison utility
// This is a client-side bcrypt comparison - in production, verify passwords server-side

// Import bcryptjs for password verification
import bcrypt from 'bcryptjs'

/**
 * Verify a plaintext password against various hash formats
 * Supports: bcrypt, SHA-256, and plain text comparison
 * @param plaintext - The password to verify
 * @param hash - The hash to compare against
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    if (!plaintext || !hash) {
      console.error('❌ Missing plaintext password or hash')
      return false
    }

    console.log('🔍 Password verification details:', {
      plaintextLength: plaintext.length,
      hashLength: hash.length,
      hashType: detectHashType(hash)
    })

    // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    const isBcryptHash = /^\$2[aby]\$/.test(hash)
    
    if (isBcryptHash) {
      // Use bcrypt to compare
      console.log('🔍 Using bcrypt comparison')
      const isValid = await bcrypt.compare(plaintext, hash)
      console.log(`🔍 bcrypt.compare result: ${isValid}`)
      return isValid
    }

    // Check if it's a SHA-256 hash (64 character hex string)
    const isSHA256Hash = /^[a-f0-9]{64}$/i.test(hash)
    
    if (isSHA256Hash) {
      console.log('🔍 Detected SHA-256 hash, computing SHA-256 of input')
      const sha256Hash = await computeSHA256(plaintext)
      console.log(`🔍 Computed SHA-256: ${sha256Hash}`)
      console.log(`🔍 Stored hash:     ${hash}`)
      const isValid = sha256Hash.toLowerCase() === hash.toLowerCase()
      console.log(`🔍 SHA-256 comparison result: ${isValid}`)
      return isValid
    }

    // If not a recognized hash format, do simple comparison
    console.log('🔍 Unknown hash format, doing simple string comparison')
    const isValid = plaintext.trim() === hash.trim()
    console.log(`🔍 Simple comparison result: ${isValid}`)
    return isValid
    
  } catch (error) {
    console.error('❌ Password verification error:', error)
    return false
  }
}

/**
 * Detect the type of password hash
 */
function detectHashType(hash: string): string {
  if (/^\$2[aby]\$/.test(hash)) return 'bcrypt'
  if (/^[a-f0-9]{64}$/i.test(hash)) return 'SHA-256'
  if (/^[a-f0-9]{32}$/i.test(hash)) return 'MD5'
  return 'plain text or unknown'
}

/**
 * Compute SHA-256 hash of a string
 */
async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a password using bcrypt
 * @param plaintext - The password to hash
 * @param rounds - Number of salt rounds (default: 12)
 * @returns Promise<string> - The bcrypt hash
 */
export async function hashPassword(plaintext: string, rounds: number = 12): Promise<string> {
  try {
    return await bcrypt.hash(plaintext, rounds)
  } catch (error) {
    console.error('❌ Password hashing error:', error)
    throw new Error('Failed to hash password')
  }
}