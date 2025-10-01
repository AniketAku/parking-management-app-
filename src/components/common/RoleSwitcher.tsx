import React from 'react'
import { Select } from '../ui'
import { useUserRole, setUserRole, type UserRole } from '../../hooks/useUserRole'

interface RoleSwitcherProps {
  className?: string
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ className = '' }) => {
  const { role } = useUserRole()

  const handleRoleChange = (newRole: string) => {
    if (['admin', 'operator', 'viewer'].includes(newRole)) {
      setUserRole(newRole as UserRole)
    }
  }

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="text-xs font-medium text-gray-600">
        Development Mode - Switch Role:
      </label>
      <Select
        value={role}
        onChange={handleRoleChange}
        options={[
          { value: 'admin', label: '👑 Admin' },
          { value: 'operator', label: '🔧 Operator' },
          { value: 'viewer', label: '👁️ Viewer' }
        ]}
        className="text-xs"
      />
    </div>
  )
}