import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function SignInSuccess() {
  const navigate = useNavigate()

  const handleContinue = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 lg:py-12">
        <div className="w-full max-w-md text-center">
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

          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-[#b00020] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">Sign In Successful</h2>
            <p className="text-gray-600 text-sm">You have been successfully signed in to your account, click on continue.</p>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-[#b00020] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#8b0018] transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
