import { supabase } from '../lib/supabase'
import { log } from '../utils/secureLogger'

export interface UserRegistration {
  username: string
  password: string
  fullName: string
  phone: string  // Make phone required
}

export interface UserProfile {
  id: string
  username: string
  role: 'admin' | 'operator' | 'viewer'
  full_name?: string
  phone: string  // Required for phone-only registration
  is_approved: boolean
  created_at: string
  updated_at: string
  last_login?: string
}

export class UserService {
  /**
   * Register a new user (requires admin approval) - Phone-based registration without Supabase Auth
   * Uses RPC function to bypass RLS for public registration
   */
  static async registerUser(userData: UserRegistration): Promise<{ success: boolean; message: string }> {
    try {
      // Hash password before storing (in a real app, use bcrypt or similar)
      const hashedPassword = await this.hashPassword(userData.password)

      // Use RPC function to bypass RLS and create user
      const { data, error } = await supabase
        .rpc('register_public_user', {
          p_username: userData.username,
          p_password_hash: hashedPassword,
          p_full_name: userData.fullName,
          p_phone: userData.phone
        })

      if (error) {
        throw new Error(`Registration failed: ${error.message}`)
      }

      if (!data) {
        throw new Error('No response from registration service')
      }

      // The RPC function returns JSON with success status
      return {
        success: data.success || false,
        message: data.message || 'Registration completed'
      }
    } catch (error) {
      log.error('Registration error', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  /**
   * Simple password hashing (use bcrypt in production)
   */
  private static async hashPassword(password: string): Promise<string> {
    // For simplicity, using a basic hash. In production, use bcrypt
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'parking_system_salt')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Create admin user (for initial setup) - Uses secure database function to bypass RLS
   */
  static async createAdminUser(username: string, password: string, phone: string = '+1234567890'): Promise<{ success: boolean; message: string }> {
    try {
      // Hash password before storing
      const hashedPassword = await this.hashPassword(password)

      // Use secure database function to create initial admin (bypasses RLS)
      const { data, error } = await supabase
        .rpc('create_initial_admin', {
          p_username: username,
          p_password_hash: hashedPassword,
          p_full_name: 'System Administrator',
          p_phone: phone
        })

      if (error) {
        throw new Error(`Database function error: ${error.message}`)
      }

      if (!data) {
        throw new Error('No response from database function')
      }

      // The function returns JSON with success status
      if (data.success) {
        return {
          success: true,
          message: data.message || 'Admin user created successfully!'
        }
      } else {
        return {
          success: false,
          message: data.message || 'Failed to create admin user'
        }
      }
    } catch (error) {
      log.error('Admin creation error', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create admin user'
      }
    }
  }

  /**
   * Get all pending users (for admin approval) - Uses RPC to bypass RLS
   */
  static async getPendingUsers(): Promise<UserProfile[]> {
    try {
      // Get current user ID from auth storage
      const userId = this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .rpc('get_pending_users', {
          requesting_user_id: userId
        })

      if (error) {
        throw new Error(`Failed to get pending users: ${error.message}`)
      }

      return data || []
    } catch (error) {
      log.error('Error getting pending users', error)
      return []
    }
  }

  /**
   * Get all approved/active users - Uses RPC to bypass RLS
   */
  static async getApprovedUsers(): Promise<UserProfile[]> {
    try {
      // Get current user ID from auth storage
      const userId = this.getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error} = await supabase
        .rpc('get_approved_users', {
          requesting_user_id: userId
        })

      if (error) {
        throw new Error(`Failed to get approved users: ${error.message}`)
      }

      return data || []
    } catch (error) {
      log.error('Error getting approved users', error)
      return []
    }
  }

  /**
   * Get current user ID from auth storage
   */
  private static getCurrentUserId(): string | null {
    try {
      const storedAuth = localStorage.getItem('secure-auth-storage')
      if (!storedAuth) return null

      const decoded = JSON.parse(atob(storedAuth))
      return decoded.state?.user?.id || null
    } catch (error) {
      log.error('Failed to get current user ID', error)
      return null
    }
  }

  /**
   * Approve a user - Uses RPC to bypass RLS
   */
  static async approveUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('approve_user_by_id', { target_user_id: userId })

      if (error) {
        throw new Error(`Failed to approve user: ${error.message}`)
      }

      return {
        success: data?.success || false,
        message: data?.message || 'User approved successfully!'
      }
    } catch (error) {
      log.error('Error approving user', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve user'
      }
    }
  }

  /**
   * Reject a user (removes from users table using RPC to bypass RLS)
   */
  static async rejectUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Use RPC function to delete user (bypasses RLS)
      const { data, error } = await supabase
        .rpc('delete_user', {
          user_id_param: userId
        })

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`)
      }

      // The RPC function returns a JSON object with success and message
      if (data && typeof data === 'object' && 'success' in data) {
        return data as { success: boolean; message: string }
      }

      return {
        success: true,
        message: 'User rejected and removed successfully!'
      }
    } catch (error) {
      log.error('Error rejecting user', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject user'
      }
    }
  }

  /**
   * Update user role - Uses RPC to bypass RLS
   */
  static async updateUserRole(userId: string, role: 'admin' | 'operator' | 'viewer'): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('update_user_role_by_id', {
          target_user_id: userId,
          new_role: role
        })

      if (error) {
        throw new Error(`Failed to update user role: ${error.message}`)
      }

      return {
        success: data?.success || false,
        message: data?.message || `User role updated to ${role} successfully!`
      }
    } catch (error) {
      log.error('Error updating user role', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update user role'
      }
    }
  }

  /**
   * Update user status (activate/deactivate) - Uses RPC to bypass RLS
   */
  static async updateUserStatus(userId: string, isApproved: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('update_user_approval_status', {
          target_user_id: userId,
          approval_status: isApproved
        })

      if (error) {
        throw new Error(`Failed to update user status: ${error.message}`)
      }

      return {
        success: data?.success || false,
        message: data?.message || `User ${isApproved ? 'activated' : 'deactivated'} successfully!`
      }
    } catch (error) {
      log.error('Error updating user status', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update user status'
      }
    }
  }

  /**
   * Check if admin bootstrap is needed
   */
  static async needsAdminBootstrap(): Promise<{ needsBootstrap: boolean; adminCount: number; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('needs_admin_bootstrap')

      if (error) {
        throw new Error(`Failed to check bootstrap status: ${error.message}`)
      }

      return {
        needsBootstrap: data?.needs_bootstrap || false,
        adminCount: data?.admin_count || 0,
        message: data?.message || 'Unknown status'
      }
    } catch (error) {
      log.error('Failed to check bootstrap status', error)
      return {
        needsBootstrap: true, // Default to requiring bootstrap on error
        adminCount: 0,
        message: 'Failed to check bootstrap status'
      }
    }
  }

  /**
   * Initialize admin user if not exists
   */
  static async initializeAdminUser(): Promise<void> {
    try {
      // Use secure function to check if bootstrap is needed
      const bootstrapStatus = await this.needsAdminBootstrap()

      if (bootstrapStatus.needsBootstrap) {
        log.info('Creating admin user...')
        const result = await this.createAdminUser('admin', 'Admin@2024!', '+1234567890')
        log.success('Admin user creation result', { message: result.message })
      } else {
        log.info('Admin user already exists', { adminCount: bootstrapStatus.adminCount })
      }
    } catch (error) {
      log.error('Failed to initialize admin user', error)
    }
  }
}