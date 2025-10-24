import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = (e) => {
    e.preventDefault()
    // Simulate successful sign-in
    navigate('/signin-success')
  }

  const handleForgotPassword = () => {
    navigate('/forgot-password')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 lg:py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <img 
                src="/assets/Security icon.jpg" 
                alt="Security Check" 
                className="w-28 h-28 object-contain"
              />
            </div>
          </div>

          {/* Sign In Form */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">Sign In to Your Account</h2>
            <p className="text-gray-600 text-sm">Sign in to continue visits or view your history.</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Email ID *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b00020] focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b00020] focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#b00020] hover:text-[#8b0018] font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-[#b00020] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#8b0018] transition-colors"
            >
              Sign In
            </button>
          </form>

          {/* Support Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Facing issues? <span className="text-[#b00020] font-medium cursor-pointer hover:text-[#8b0018]">Contact admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
