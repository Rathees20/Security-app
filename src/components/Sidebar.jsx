import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md border border-neutral-200"
        style={{ position: 'fixed' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 shrink-0 bg-white h-screen sticky top-0 border-r border-neutral-200 transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      {/* Logo Section */}
      <div className="p-4 flex flex-col items-center justify-center w-full">
        <div className="mb-2">
          <img 
            src="/src/assets/Security icon.jpg" 
            alt="Security Check" 
            className="w-20 h-20 object-contain"
          />
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="px-4 space-y-2 flex flex-col">
        {/* Overview */}
        <div className="flex justify-center">
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 w-48 rounded-lg transition-colors ${isActive ? 'bg-[#b00020] text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            <img src="/src/assets/squares.png" alt="Overview" className="w-5 h-5 object-contain flex-shrink-0" />
            <span className="text-sm font-medium">Overview</span>
          </NavLink>
        </div>

        {/* Visit History */}
        <div className="flex justify-center">
          <NavLink
            to="/history"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 w-48 rounded-lg transition-colors ${isActive ? 'bg-[#b00020] text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            <img src="/src/assets/book.png" alt="Visit History" className="w-5 h-5 object-contain flex-shrink-0" />
            <span className="text-sm font-medium">Visit History</span>
          </NavLink>
        </div>

        {/* Admin Control */}
        <div className="flex justify-center">
          <NavLink
            to="/admins"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 w-48 rounded-lg transition-colors ${isActive ? 'bg-[#b00020] text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            <img src="/src/assets/user.png" alt="Admin Control" className="w-5 h-5 object-contain flex-shrink-0" />
            <span className="text-sm font-medium">Admin Control</span>
          </NavLink>
        </div>

        {/* Society Control */}
        <div className="flex justify-center">
          <NavLink
            to="/society"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 w-48 rounded-lg transition-colors ${isActive ? 'bg-[#b00020] text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            <img src="/src/assets/chat.png" alt="Society Control" className="w-5 h-5 object-contain flex-shrink-0" />
            <span className="text-sm font-medium">Society Control</span>
          </NavLink>
        </div>
      </nav>
    </aside>
    </>
  )
}