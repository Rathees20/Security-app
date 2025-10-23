import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import VisitHistory from './pages/VisitHistory'
import AdminControl from './pages/AdminControl'
import SocietyControl from './pages/SocietyControl'
import OverviewCombined from './pages/OverviewCombined'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto flex">
        <Sidebar />
        <main className="flex-1 px-8 py-6">
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


