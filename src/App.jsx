import React, { useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import VisitHistory from './pages/VisitHistory'
import AdminControl from './pages/AdminControl'
import SocietyControl from './pages/SocietyControl'
import OverviewCombined from './pages/OverviewCombined'
import SignIn from './components/SignIn'
import ForgotPassword from './components/ForgotPassword'
import SignInSuccess from './components/SignInSuccess'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row w-full">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-screen w-full lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const hasToken = useMemo(() => {
    if (typeof window === 'undefined') return false
    const token = window.localStorage.getItem('authToken')
    return Boolean(token)
  }, [])

  if (!hasToken) {
    return <Navigate to="/signin" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/signin" element={
        <SignIn />
      } />
      <Route path="/forgot-password" element={
        <ForgotPassword />
      } />
      <Route path="/signin-success" element={<SignInSuccess />} />
      <Route path="/overview" element={
        <RequireAuth>
          <OverviewCombined />
        </RequireAuth>
      } />
      <Route path="/history" element={
        <RequireAuth>
          <Layout>
            <VisitHistory />
          </Layout>
        </RequireAuth>
      } />
      <Route path="/admins" element={
        <RequireAuth>
          <Layout>
            <AdminControl />
          </Layout>
        </RequireAuth>
      } />
      <Route path="/society" element={
        <RequireAuth>
          <Layout>
            <SocietyControl />
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  )
}


