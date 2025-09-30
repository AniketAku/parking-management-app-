import React from 'react'
import UserProfile from '../components/UserProfile'

export const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            View and manage your account information
          </p>
        </div>

        {/* User Profile Component */}
        <UserProfile />
      </div>
    </div>
  )
}