import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleContinue = (e) => {
    e.preventDefault()
    // Simulate sending reset email
    alert('Reset link sent to your email!')
    navigate('/signin')
  }

  const handleBackToSignIn = () => {
    navigate('/signin')
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

          {/* Forgot Password Form */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">Forgot Password</h2>
            <p className="text-gray-600 text-sm">Enter your Email below and we will guide you with signing in through a link that will be sent to your mail</p>
          </div>

          <form onSubmit={handleContinue} className="space-y-6">
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

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full bg-[#b00020] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#8b0018] transition-colors"
            >
              Continue
            </button>
          </form>

          {/* Back to Sign In */}
          <div className="text-center mt-6">
            <button
              onClick={handleBackToSignIn}
              className="text-sm text-gray-600 hover:text-[#b00020] transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>

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
