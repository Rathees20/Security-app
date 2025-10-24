import React from 'react'
import Sidebar from '../components/Sidebar'
import Profile from '../components/Profile'
import { LineChart, Line, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

function Header() {
  const [showNotifications, setShowNotifications] = React.useState(false);
  
  const notifications = [
    { id: 1, message: "System status update", time: "2 min ago", type: "info" },
    { id: 2, message: "Security dashboard updated", time: "10 min ago", type: "info" },
    { id: 3, message: "New admin access granted", time: "1 hour ago", type: "info" }
  ];

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Hi, Admin</h1>
        <p className="text-neutral-500 text-sm">Here is your entire security Controls</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-full bg-white shadow-card hover:bg-gray-50 transition-colors" 
            aria-label="notifications"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100">
                <button className="w-full text-sm text-blue-600 hover:text-blue-800">
                  View All Notifications
        </button>
              </div>
            </div>
          )}
        </div>
        <Profile />
      </div>
    </header>
  )
}

function RightPanel() {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  
  const Item = ({ idx, title, phone }) => (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 bg-[#B00020] text-white text-xs rounded flex items-center justify-center font-medium">{idx}</div>
      <div className="text-sm text-neutral-800">{title} - {phone}</div>
    </div>
  )

  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const handleDateClick = (day) => {
    setSelectedDate(day.fullDate)
  }

  const getCalendarDays = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    // Generate 35 days (5 weeks)
    for (let i = 0; i < 35; i++) {
      const dayDate = new Date(current)
      days.push({
        date: dayDate.getDate(),
        isCurrentMonth: dayDate.getMonth() === month,
        isToday: dayDate.toDateString() === new Date().toDateString(),
        isSelected: dayDate.toDateString() === selectedDate.toDateString(),
        fullDate: dayDate
      })
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = getCalendarDays(currentDate)

  return (
    <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigateMonth('prev')}
            className="text-neutral-800 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="font-medium text-neutral-800">{formatMonthYear(currentDate)}</div>
          <button 
            onClick={() => navigateMonth('next')}
            className="text-neutral-800 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm text-neutral-600 mb-2">
          {['S','M','T','W','T','F','S'].map((day, index) => (
            <div key={`day-${index}`} className="py-1 font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              onClick={() => handleDateClick(day)}
              className={`py-2 rounded-full cursor-pointer transition-colors ${
                day.isSelected
                  ? 'bg-[#B00020] text-white font-semibold' 
                  : day.isToday 
                    ? 'bg-[#B00020] bg-opacity-20 text-[#B00020] font-semibold border-2 border-[#B00020]' 
                    : day.isCurrentMonth 
                      ? 'text-neutral-800 hover:bg-neutral-100' 
                      : 'text-neutral-400 hover:bg-neutral-50'
              }`}
            >
              {day.date}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5">
        <div className="text-lg font-bold text-[#B00020] mb-4">Contact Numbers for Emergency</div>
        <div className="mb-4">
          <div className="text-sm font-medium text-neutral-800 mb-2">Admins</div>
          <div className="space-y-1">
            <Item idx={1} title="Building1 : Sam" phone="9724382764" />
            <Item idx={2} title="Building 2 : Sam" phone="9724382764" />
            <Item idx={3} title="Building 3 : Sam" phone="9724382764" />
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-neutral-800 mb-2">Security</div>
          <div className="space-y-1">
            <Item idx={1} title="Building1 : Sam" phone="9724382764" />
            <Item idx={2} title="Building 2 : Sam" phone="9724382764" />
            <Item idx={3} title="Building 3 : Sam" phone="9724382764" />
          </div>
        </div>
      </div>
    </aside>
  )
}

const data = [
  { name: 'S', visits: 20 },
  { name: 'M', visits: 40 },
  { name: 'T', visits: 25 },
  { name: 'W', visits: 55 },
  { name: 'T', visits: 35 },
  { name: 'F', visits: 45 },
  { name: 'S', visits: 42 },
]

function StatCard() {
  return (
    <div className="p-5 flex-1 bg-[#B00020] text-white rounded-xl shadow-sm">
      <div className="text-sm opacity-90">Visits Today</div>
      <div className="mt-3 text-4xl font-semibold">100</div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
              <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="4" fill="none" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.45)}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold">45%</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">55 Pending Visits</div>
        </div>
      </div>
    </div>
  )
}

function VisitsChart() {
  return (
    <div className="p-5 flex-1 bg-[#B00020] text-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">No. of Visits</div>
        <div className="text-sm flex items-center gap-1">
          This Week
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.2)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: 'white' }} />
            <Line type="monotone" dataKey="visits" stroke="white" strokeWidth={3} dot={{ r: 6, fill: 'white', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 8, fill: 'white', stroke: 'white', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AdminCard({ name, building, guards, employees }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4 mb-4">
        <img src="https://i.pravatar.cc/64" alt="admin" className="w-12 h-12 rounded-full" />
        <div>
          <div className="font-medium text-neutral-800">{name}</div>
          <div className="text-sm text-neutral-500">{building}</div>
        </div>
      </div>
      <div className="flex justify-between text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--brand-red)] rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <span>{guards} Security Guards</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--brand-red)] rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span>{employees} Building Employees</span>
        </div>
      </div>
    </div>
  )
}

function BuildingCard({ idx, name, percent }) {
  return (
    <div className="card p-4">
      <div className="h-28 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500 mb-3">Building image</div>
      <div className="font-medium text-neutral-800 mb-1">{name}</div>
      <div className="text-sm text-neutral-500 mb-3">Location address</div>
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-neutral-600">Visits Completed Today</span>
          <span className="text-sm text-neutral-600">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-neutral-200">
          <div className="h-2 rounded-full bg-[var(--brand-red)]" style={{ width: percent+'%' }} />
        </div>
      </div>
      <div className="mt-3 text-sm text-neutral-500 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        July 14, 2025
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StatCard />
        <VisitsChart />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="card-title">Admins</div>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminCard name="Sam" building="Building 1" guards={5} employees={20} />
          <AdminCard name="Abraham" building="Building 2" guards={5} employees={20} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="card-title">Upcoming Visitors</div>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <BuildingCard idx={1} name="Building 1 Name" percent={75} />
          <BuildingCard idx={2} name="Building 2 Name" percent={85} />
        </div>
      </div>
    </div>
  )
}

export default function OverviewCombined() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row w-full">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-screen w-full pt-16 lg:pt-4">
          <Header />
          <Dashboard />
        </main>
        <div className="lg:block w-full lg:w-auto">
          <RightPanel />
        </div>
      </div>
    </div>
  )
}


