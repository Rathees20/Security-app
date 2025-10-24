import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <OverviewCombined />
      } />
      <Route path="/signin" element={
        <SignIn />
      } />
      <Route path="/forgot-password" element={
        <ForgotPassword />
      } />
      <Route path="/signin-success" element={
        <SignInSuccess />
      } />
      <Route path="/history" element={
        <Layout>
          <VisitHistory />
        </Layout>
      } />
      <Route path="/admins" element={
        <Layout>
          <AdminControl />
        </Layout>
      } />
      <Route path="/society" element={
        <Layout>
          <SocietyControl />
        </Layout>
      } />
    </Routes>
  )
}


