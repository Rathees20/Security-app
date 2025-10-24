import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Profile({ showName = true, size = 'default' }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    
    // Redirect to sign-in page
    navigate('/signin')
    setShowDropdown(false)
  }

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown)
  }

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  }

  const dropdownClasses = {
    small: 'top-10 right-0',
    default: 'top-12 right-0',
    large: 'top-14 right-0'
  }

  return (
    <div className="relative">
      {/* Profile Avatar */}
      <button
        onClick={handleProfileClick}
        className={`${sizeClasses[size]} rounded-full bg-[#b00020] text-white font-bold hover:ring-2 hover:ring-[#b00020] hover:ring-offset-2 transition-all cursor-pointer flex items-center justify-center`}
      >
        SC
      </button>

      {/* Profile Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Menu */}
          <div className={`absolute ${dropdownClasses[size]} z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2`}>
            {/* Profile Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b00020] text-white font-bold flex items-center justify-center text-sm">
                  SC
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Admin User</div>
                  <div className="text-xs text-gray-500">admin@securitycheck.com</div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button 
                onClick={() => {
                  setShowDropdown(false)
                  // Add profile settings navigation here if needed
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </button>
              
              <button 
                onClick={() => {
                  setShowDropdown(false)
                  // Add preferences navigation here if needed
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </button>
            </div>

            {/* Logout Button */}
            <div className="border-t border-gray-100 pt-1">
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
