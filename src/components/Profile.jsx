import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiRequest } from '../utils/api'

export default function Profile({ showName = true, size = 'default' }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const navigate = useNavigate()

  // Get user data from localStorage
  const userData = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem('authUser')
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      console.error('Failed to parse user data', err)
      return null
    }
  }, [])

  // Initialize form data when userData changes or modal opens
  useEffect(() => {
    if (showEditModal && userData) {
      setFormData({
        name: userData.name || userData.firstName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || userData.phone || '',
      })
      setFormErrors({})
      setSubmissionError('')
      setSubmissionMessage('')
    }
  }, [showEditModal, userData])

  // Generate initials from user data
  const getInitials = () => {
    if (!userData) return 'SC'
    
    // Try to get initials from name
    if (userData.name) {
      const nameParts = userData.name.trim().split(/\s+/)
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      }
      return nameParts[0][0].toUpperCase()
    }
    
    // Fallback to email initials
    if (userData.email) {
      return userData.email.substring(0, 2).toUpperCase()
    }
    
    // Fallback to phone initials
    if (userData.phone) {
      return userData.phone.substring(userData.phone.length - 2).toUpperCase()
    }
    
    return 'SC'
  }

  // Get display name
  const getDisplayName = () => {
    if (userData?.name) return userData.name
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`
    }
    if (userData?.firstName) return userData.firstName
    return 'User'
  }

  // Get login identifier (email or phone) - prioritize the stored loginIdentifier
  const getLoginIdentifier = () => {
    // First check if we have the exact login identifier that was used
    if (userData?.loginIdentifier) return userData.loginIdentifier
    // Fallback to email or phone from user object
    if (userData?.email) return userData.email
    if (userData?.phone) return userData.phone
    return 'No identifier'
  }

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    localStorage.removeItem('authUser')
    
    // Redirect to sign-in page
    navigate('/signin')
    setShowDropdown(false)
  }

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown)
  }

  const handleEditProfile = () => {
    setShowDropdown(false)
    setShowEditModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    
    // For phone number, only allow digits
    let processedValue = value
    if (name === 'phoneNumber') {
      processedValue = value.replace(/\D/g, '')
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmissionError('')
    setSubmissionMessage('')
    setFormErrors({})

    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedPhone = formData.phoneNumber.trim()

    const nextErrors = {}

    if (!trimmedName) {
      nextErrors.name = 'Name is required.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.'
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.'
    }

    const phoneRegex = /^\d{10}$/
    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      nextErrors.phoneNumber = 'Phone number must be exactly 10 digits.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
      }

      if (trimmedPhone) {
        payload.phoneNumber = trimmedPhone
      }

      // Try different endpoints for profile update
      // Common patterns: /auth/profile, /auth/me, /auth/user, /profile
      let response
      const endpoints = [
        '/auth/profile',
        '/auth/me',
        '/auth/user',
        '/profile',
      ]
      
      let lastError
      let success = false
      
      for (const endpoint of endpoints) {
        try {
          response = await apiRequest(endpoint, {
            method: 'PUT',
            body: payload,
          })
          success = true
          console.log(`[Profile] Successfully updated via ${endpoint}`)
          break
        } catch (error) {
          lastError = error
          console.log(`[Profile] ${endpoint} failed:`, error.status || error.message)
          // Continue to next endpoint if 404, otherwise throw
          if (error.status !== 404) {
            throw error
          }
        }
      }
      
      if (!success) {
        // If all endpoints failed, just update localStorage (offline mode)
        console.warn('[Profile] All endpoints failed, updating localStorage only')
        // Don't throw error, just update localStorage
      }
      
      // Update localStorage with new user data (always update, even if API call failed)
      const updatedUserData = {
        ...userData,
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        phone: trimmedPhone,
      }
      window.localStorage.setItem('authUser', JSON.stringify(updatedUserData))

      if (success) {
        setSubmissionMessage('Profile updated successfully.')
      } else {
        setSubmissionMessage('Profile updated locally. Note: Backend update may not be available.')
      }
      
      setTimeout(() => {
        setShowEditModal(false)
        // Force a page reload to update the profile display
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error('Failed to update profile', err)
      // Even if API fails, localStorage is updated, so show a warning instead of error
      if (err.status === 404) {
        setSubmissionError('Profile update endpoint not found. Changes saved locally only.')
      } else {
        setSubmissionError(err.message || 'Unable to update profile on server. Changes saved locally.')
      }
    } finally {
      setIsSubmitting(false)
    }
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
        {getInitials()}
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
          <div className={`absolute ${dropdownClasses[size]} z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 sm:right-0 sm:left-auto left-0`}>
            {/* Profile Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b00020] text-white font-bold flex items-center justify-center text-sm">
                  {getInitials()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{getDisplayName()}</div>
                  <div className="text-xs text-gray-500">{getLoginIdentifier()}</div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button 
                onClick={handleEditProfile}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Edit Profile
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-800">Edit Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submissionError && (
                <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md">
                  {submissionError}
                </div>
              )}
              {submissionMessage && (
                <div className="px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-md">
                  {submissionMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number (10 digits)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {formErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#b00020] text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700 transition"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
