import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { UserService, type UserProfile } from '../services/userService'
import { log } from '../utils/secureLogger'

export const UserApprovalPage: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingUsers()
    } else {
      loadApprovedUsers()
    }
  }, [activeTab])

  const loadPendingUsers = async () => {
    setIsLoading(true)
    try {
      const users = await UserService.getPendingUsers()
      setPendingUsers(users)
    } catch (error) {
      log.error('Failed to load pending users', error)
      toast.error('Failed to load pending users')
    } finally {
      setIsLoading(false)
    }
  }

  const loadApprovedUsers = async () => {
    setIsLoading(true)
    try {
      const users = await UserService.getApprovedUsers()
      setApprovedUsers(users)
    } catch (error) {
      log.error('Failed to load approved users', error)
      toast.error('Failed to load approved users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveUser = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId))
    
    try {
      const result = await UserService.approveUser(userId)
      
      if (result.success) {
        toast.success(result.message)
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      log.error('Failed to approve user', error)
      toast.error('Failed to approve user')
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleRejectUser = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId))
    
    try {
      const result = await UserService.rejectUser(userId)
      
      if (result.success) {
        toast.success(result.message)
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      log.error('Failed to reject user', error)
      toast.error('Failed to reject user')
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleUpdateUserRole = async (userId: string, role: 'admin' | 'operator' | 'viewer') => {
    setProcessingUsers(prev => new Set(prev).add(userId))
    
    try {
      const result = await UserService.updateUserRole(userId, role)
      
      if (result.success) {
        toast.success(result.message)
        // Refresh the current tab data
        if (activeTab === 'approved') {
          loadApprovedUsers()
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      log.error('Failed to update user role', error)
      toast.error('Failed to update user role')
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleUpdateUserStatus = async (userId: string, isApproved: boolean) => {
    setProcessingUsers(prev => new Set(prev).add(userId))
    
    try {
      const result = await UserService.updateUserStatus(userId, isApproved)
      
      if (result.success) {
        toast.success(result.message)
        // Refresh both tabs data
        loadApprovedUsers()
        loadPendingUsers()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      log.error('Failed to update user status', error)
      toast.error('Failed to update user status')
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // Get current users based on active tab
  const currentUsers = activeTab === 'pending' ? pendingUsers : approvedUsers

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts and approvals
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{approvedUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approval ({pendingUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Users ({approvedUsers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab === 'pending' ? 'Pending User Approvals' : 'Active Users'}
            </h2>
          </div>
          
          {currentUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">
                {activeTab === 'pending' ? 'No pending approvals' : 'No active users'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'pending' 
                  ? 'All new user registrations have been processed.'
                  : 'No approved users found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'pending' ? 'Registered' : 'Last Login'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name || user.username}</div>
                            <div className="text-sm text-gray-500">{user.phone}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activeTab === 'pending' 
                          ? new Date(user.created_at).toLocaleDateString()
                          : user.last_login 
                            ? new Date(user.last_login).toLocaleDateString()
                            : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_approved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.is_approved ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {activeTab === 'pending' ? (
                            // Pending users: Approve/Reject buttons
                            <>
                              <button
                                onClick={() => handleApproveUser(user.id)}
                                disabled={processingUsers.has(user.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingUsers.has(user.id) ? (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectUser(user.id)}
                                disabled={processingUsers.has(user.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingUsers.has(user.id) ? (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Reject
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            // Approved users: Role dropdown and Deactivate button
                            <>
                              <div className="relative inline-block text-left">
                                <select
                                  value={user.role}
                                  onChange={(e) => handleUpdateUserRole(user.id, e.target.value as 'admin' | 'operator' | 'viewer')}
                                  disabled={processingUsers.has(user.id) || user.username === 'Aniket@123'}
                                  className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="operator">Operator</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                              {user.username !== 'Aniket@123' && (
                                <button
                                  onClick={() => handleUpdateUserStatus(user.id, false)}
                                  disabled={processingUsers.has(user.id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingUsers.has(user.id) ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                      </svg>
                                      Deactivate
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}