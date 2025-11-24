import React from 'react'
import Sidebar from '../components/Sidebar'
import Profile from '../components/Profile'
import { LineChart, Line, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../utils/api'

const DEFAULT_BUILDING_ID = '68b04099951cc19873fc3dd3'
const DEFAULT_RESIDENT_ID = '68f50d1d8cd4d85f4db79b59'

const resolvePath = (object, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), object)

const pickValue = (object, paths) => {
  for (const path of paths) {
    const value = resolvePath(object, path)
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

const toDisplayString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayString(item, '')).filter(Boolean).join(', ') || fallback
  }
  if (typeof value === 'object') {
    const entries = Object.values(value)
      .map((item) => toDisplayString(item, ''))
      .filter(Boolean)
    return entries.join(', ') || fallback
  }
  return fallback
}

const formatDateTime = (value) => {
  if (!value) return 'Schedule TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : 'Schedule TBD'
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const extractArray = (payload, visited = new WeakSet()) => {
  if (!payload || visited.has(payload)) return []
  if (Array.isArray(payload)) return payload

  visited.add(payload)

  const candidates = [
    payload.data,
    payload.results,
    payload.items,
    payload.preApprovals,
    payload.records,
    payload.list,
    payload.upcoming,
    payload.users,
    payload?.data?.preApprovals,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.data,
    payload?.data?.users,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate, visited)
      if (nested.length) return nested
    }
  }

  return []
}

const findNumericByKeyword = (payload, keywords) => {
  if (!payload || typeof payload !== 'object') return undefined

  const stack = [payload]
  const seen = new WeakSet()

  while (stack.length) {
    const current = stack.pop()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)

    Object.entries(current).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        stack.push(value)
        return
      }

      if (
        (typeof value === 'string' || typeof value === 'number') &&
        keywords.some((keyword) => key.toLowerCase().includes(keyword))
      ) {
        const parsed = typeof value === 'string' ? value.trim() : value
        if (parsed !== '' && parsed !== null && parsed !== undefined) {
          return parsed
        }
      }
    })
  }

  return undefined
}

const normalizeAdmins = (payload, buildingsMap = {}) =>
  extractArray(payload).map((item, index) => {
    const employeeCount =
      findNumericByKeyword(item, ['employee', 'staff']) ??
      pickValue(item, [
        'employees',
        'employeeCount',
        'staffCount',
        'noOfEmployees',
        'numberOfEmployees',
        'numEmployees',
      ])

    const securityGuardCount =
      findNumericByKeyword(item, ['guard', 'security']) ??
      pickValue(item, [
        'securityGuards',
        'guardCount',
        'securityGuardCount',
        'noOfSecurityGuards',
        'numberOfSecurityGuards',
        'numSecurityGuards',
      ])

    const buildingId = pickValue(item, ['buildingId', 'building.id', 'building._id', 'assignedBuilding', 'assignedBuildingId'])
    const buildingName = buildingId && buildingsMap[buildingId]
      ? buildingsMap[buildingId]
      : toDisplayString(pickValue(item, ['buildingName', 'building.name']), 'Not assigned')

    return {
      id: pickValue(item, ['_id', 'id', 'userId']) ?? `admin-${index}`,
      name: toDisplayString(
        pickValue(item, ['name', 'fullName', 'username']),
        'Unknown Admin'
      ),
      building: buildingName,
      guards: Number(securityGuardCount) || 0,
      employees: Number(employeeCount) || 0,
      role: pickValue(item, ['role', 'roleValue']) || 'admin',
    }
  })

const normalizeUpcomingVisitors = (payload) =>
  extractArray(payload).map((item, index) => {
    const scheduledRaw = pickValue(item, ['visitDate', 'scheduledDate', 'fromDate', 'date', 'createdAt'])
    const status = toDisplayString(
      pickValue(item, ['status', 'approvalStatus', 'state']),
      'Pending'
    )

    return {
      id: pickValue(item, ['_id', 'id', 'approvalId']) ?? `upcoming-${index}`,
      name: toDisplayString(
        pickValue(item, ['visitorName', 'name', 'visitor.fullName', 'visitor.name']),
        'Unknown Visitor'
      ),
      building: toDisplayString(
        pickValue(item, ['buildingName', 'building.name', 'location']),
        'Building TBD'
      ),
      unit: toDisplayString(
        pickValue(item, ['unitName', 'unit', 'flatNumber', 'apartmentNumber']),
        ''
      ),
      purpose: toDisplayString(
        pickValue(item, ['purpose', 'reason', 'remarks', 'note']),
        'Purpose not provided'
      ),
      host: toDisplayString(
        pickValue(item, ['hostName', 'residentName', 'approvedBy', 'requestedBy']),
        'Host pending'
      ),
      scheduled: formatDateTime(scheduledRaw),
      status,
    }
  })

const getStatusBadgeClasses = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('approve')) return 'bg-green-100 text-green-700'
  if (normalized.includes('reject')) return 'bg-red-100 text-red-700'
  if (normalized.includes('pending')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-neutral-100 text-neutral-600'
}

function Header() {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Hi, Admin</h1>
        <p className="text-neutral-500 text-sm">Here is your entire security Controls</p>
      </div>
      <div className="flex items-center gap-4">
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

function UpcomingVisitorCard({ visitor }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-neutral-900">{visitor.name}</div>
          <div className="text-sm text-neutral-500">{visitor.purpose}</div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(visitor.status)}`}>
          {visitor.status}
        </span>
      </div>
      <div className="text-sm text-neutral-600 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm0 2h8v3H6V4zm0 5h8v7H6V9z" clipRule="evenodd" />
        </svg>
        <span>{visitor.scheduled}</span>
      </div>
      <div className="text-sm text-neutral-600">
        <span className="font-medium">Building:</span> {visitor.building}
      </div>
      {visitor.unit && (
        <div className="text-sm text-neutral-600">
          <span className="font-medium">Unit:</span> {visitor.unit}
        </div>
      )}
      <div className="text-sm text-neutral-500">
        <span className="font-medium">Host:</span> {visitor.host}
      </div>
    </div>
  )
}

function Dashboard() {
  const [upcomingVisitors, setUpcomingVisitors] = React.useState([])
  const [isLoadingVisitors, setIsLoadingVisitors] = React.useState(false)
  const [visitorsError, setVisitorsError] = React.useState('')
  const [userRole, setUserRole] = React.useState(null)
  const [userBuildingId, setUserBuildingId] = React.useState(null)
  const [userResidentId, setUserResidentId] = React.useState(null)
  const [buildings, setBuildings] = React.useState([])
  const [buildingsMap, setBuildingsMap] = React.useState({})
  const [admins, setAdmins] = React.useState([])
  const [isLoadingAdmins, setIsLoadingAdmins] = React.useState(false)
  const [adminsError, setAdminsError] = React.useState('')

  // Get user information from localStorage
  React.useEffect(() => {
    const getUserInfo = () => {
      try {
        const userData = window.localStorage.getItem('authUser')
        if (userData) {
          const user = JSON.parse(userData)
          const role = user?.role || user?.roleValue || ''
          const buildingId = pickValue(user, [
            'buildingId',
            'building.id',
            'building._id',
            'assignedBuilding',
            'assignedBuildingId'
          ])
          const residentId = pickValue(user, [
            'residentId',
            'resident.id',
            'resident._id',
            '_id',
            'id'
          ])
          
          setUserRole(role?.toLowerCase())
          setUserBuildingId(buildingId)
          setUserResidentId(residentId || DEFAULT_RESIDENT_ID)
          console.log('[OverviewCombined] User role:', role, 'buildingId:', buildingId, 'residentId:', residentId)
        } else {
          setUserResidentId(DEFAULT_RESIDENT_ID)
        }
      } catch (err) {
        console.error('[OverviewCombined] Failed to get user info', err)
        setUserResidentId(DEFAULT_RESIDENT_ID)
      }
    }
    getUserInfo()
  }, [])

  // Fetch buildings for super admin and create buildings map
  React.useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await api.getBuildings()
        const normalized = extractArray(response).map((item, index) => ({
          id: pickValue(item, ['_id', 'id', 'buildingId']) ?? `building-${index}`,
          name: toDisplayString(pickValue(item, ['name', 'buildingName', 'title']), 'Unnamed Building'),
        }))
        
        // Create a map of buildingId -> buildingName for quick lookup
        const map = {}
        normalized.forEach((building) => {
          if (building.id) {
            map[String(building.id)] = building.name
          }
        })
        setBuildingsMap(map)
        
        if (userRole === 'super_admin' || userRole === 'admin') {
          setBuildings(normalized)
          console.log('[OverviewCombined] Fetched buildings for super admin:', normalized.length)
        } else {
          setBuildings([])
        }
      } catch (err) {
        console.error('[OverviewCombined] Failed to fetch buildings', err)
        setBuildings([])
        setBuildingsMap({})
      }
    }
    fetchBuildings()
  }, [userRole])

  // Fetch admins
  const fetchAdmins = React.useCallback(async () => {
    setIsLoadingAdmins(true)
    setAdminsError('')
    try {
      const response = await api.getAllUsers('?limit=100')
      let normalized = normalizeAdmins(response, buildingsMap)
      
      // Filter for admin roles only (admin, super_admin, building_admin)
      normalized = normalized.filter((admin) => {
        const role = (admin.role || '').toLowerCase()
        return role === 'admin' || role === 'super_admin' || role === 'building_admin'
      })
      
      // Filter by buildingId if user is not super admin
      if (userBuildingId && userRole !== 'super_admin' && userRole !== 'admin') {
        const allUsers = extractArray(response)
        normalized = normalized.filter((admin) => {
          // Find the original user item to get buildingId
          const userItem = allUsers.find((item) => {
            const itemId = pickValue(item, ['_id', 'id', 'userId'])
            return String(itemId) === String(admin.id)
          })
          if (!userItem) return false
          
          const adminBuildingId = pickValue(userItem, [
            'buildingId',
            'building.id',
            'building._id',
            'assignedBuilding',
            'assignedBuildingId'
          ])
          return String(adminBuildingId) === String(userBuildingId)
        })
      }
      
      console.log('[OverviewCombined] Fetched admins:', normalized.length)
      setAdmins(normalized)
    } catch (err) {
      console.error('[OverviewCombined] Failed to fetch admins', err)
      setAdminsError(err.message || 'Unable to load admins')
      setAdmins([])
    } finally {
      setIsLoadingAdmins(false)
    }
  }, [buildingsMap, userRole, userBuildingId])

  React.useEffect(() => {
    if (buildingsMap && Object.keys(buildingsMap).length > 0) {
      fetchAdmins()
    }
  }, [fetchAdmins, buildingsMap])

  const fetchUpcomingVisitors = React.useCallback(async () => {
    setIsLoadingVisitors(true)
    setVisitorsError('')
    try {
      // For super admin, fetch from all buildings
      if ((userRole === 'super_admin' || userRole === 'admin') && buildings.length > 0) {
        console.log('[OverviewCombined] Fetching upcoming visitors for ALL buildings')
        const allVisitorsPromises = buildings.map((building) =>
          api.getUpcomingVisitors(building.id, userResidentId || DEFAULT_RESIDENT_ID)
            .then((response) => normalizeUpcomingVisitors(response))
            .catch((err) => {
              // Handle 404 as empty result (no pre-approvals for this building)
              if (err.status === 404) {
                console.log(`[OverviewCombined] No pre-approvals for building ${building.id}`)
                return []
              }
              console.warn(`[OverviewCombined] Failed to fetch visitors for building ${building.id}:`, err)
              return []
            })
        )

        const allVisitorsArrays = await Promise.all(allVisitorsPromises)
        const combinedVisitors = allVisitorsArrays.flat()
        
        // Sort by scheduled date (upcoming first)
        combinedVisitors.sort((a, b) => {
          const dateA = new Date(a.scheduled)
          const dateB = new Date(b.scheduled)
          return dateA - dateB
        })

        console.log('[OverviewCombined] Combined upcoming visitors from all buildings:', combinedVisitors.length)
        setUpcomingVisitors(combinedVisitors)
      } else if (userBuildingId && userResidentId) {
        // For regular users, fetch from their building
        console.log('[OverviewCombined] Fetching upcoming visitors for user building:', userBuildingId)
        const response = await api.getUpcomingVisitors(userBuildingId, userResidentId)
        const normalized = normalizeUpcomingVisitors(response)
        setUpcomingVisitors(normalized)
      } else {
        // Fallback to default
        console.log('[OverviewCombined] Using default building/resident IDs')
        const response = await api.getUpcomingVisitors(DEFAULT_BUILDING_ID, DEFAULT_RESIDENT_ID)
        const normalized = normalizeUpcomingVisitors(response)
        setUpcomingVisitors(normalized)
      }
    } catch (err) {
      // Handle 404 as empty result instead of error
      if (err.status === 404) {
        console.log('[OverviewCombined] No upcoming visitors found')
        setUpcomingVisitors([])
      } else {
        console.error('Failed to load upcoming visitors', err)
        setVisitorsError(err.message || 'Unable to load upcoming visitors')
        setUpcomingVisitors([])
      }
    } finally {
      setIsLoadingVisitors(false)
    }
  }, [userRole, userBuildingId, userResidentId, buildings])

  React.useEffect(() => {
    // Wait for user info to load
    // For super admin, also wait for buildings to load
    // For regular users, proceed once we have buildingId and residentId
    if (userRole === undefined) return
    
    if (userRole === 'super_admin' || userRole === 'admin') {
      // For super admin, wait for buildings to be fetched (even if empty, proceed)
      fetchUpcomingVisitors()
    } else {
      // For regular users, proceed with their buildingId/residentId or defaults
      fetchUpcomingVisitors()
    }
  }, [fetchUpcomingVisitors, userRole, buildings.length, userBuildingId, userResidentId])

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
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={fetchAdmins}
              disabled={isLoadingAdmins}
              title="Refresh admins"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a6 6 0 019.33-4.98 1 1 0 01-1.06 1.7A4 4 0 106 8h1.586a1 1 0 01.707 1.707l-3.293 3.293a1 1 0 01-1.414 0L.293 9.707A1 1 0 01 1 8h1a6 6 0 012-4zM16 12a4 4 0 00-4-4h-1.586a1 1 0 01-.707-1.707l3.293-3.293a1 1 0 011.414 0l3.293 3.293A1 1 0 0118 7h-1a6 6 0 11-9.33 4.98 1 1 0 011.06-1.7A4 4 0 1016 12z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        {adminsError && (
          <div className="mb-3 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg">
            {adminsError}
          </div>
        )}
        {isLoadingAdmins && (
          <div className="text-sm text-neutral-500">Loading admins...</div>
        )}
        {!isLoadingAdmins && !adminsError && admins.length === 0 && (
          <div className="text-sm text-neutral-500">No admins found.</div>
        )}
        {!isLoadingAdmins && admins.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {admins.slice(0, 4).map((admin) => (
              <AdminCard
                key={admin.id}
                name={admin.name}
                building={admin.building}
                guards={admin.guards}
                employees={admin.employees}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="card-title">Upcoming Visitors</div>
          <div className="flex gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={fetchUpcomingVisitors}
              disabled={isLoadingVisitors}
              title="Refresh upcoming visitors"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a6 6 0 019.33-4.98 1 1 0 01-1.06 1.7A4 4 0 106 8h1.586a1 1 0 01.707 1.707l-3.293 3.293a1 1 0 01-1.414 0L.293 9.707A1 1 0 01 1 8h1a6 6 0 012-4zM16 12a4 4 0 00-4-4h-1.586a1 1 0 01-.707-1.707l3.293-3.293a1 1 0 011.414 0l3.293 3.293A1 1 0 0118 7h-1a6 6 0 11-9.33 4.98 1 1 0 011.06-1.7A4 4 0 1016 12z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        {visitorsError && (
          <div className="mb-3 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg">
            {visitorsError}
          </div>
        )}
        {isLoadingVisitors && (
          <div className="text-sm text-neutral-500">Loading upcoming visitors...</div>
        )}
        {!isLoadingVisitors && !visitorsError && upcomingVisitors.length === 0 && (
          <div className="text-sm text-neutral-500">No upcoming visitors scheduled.</div>
        )}
        {!isLoadingVisitors && upcomingVisitors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {upcomingVisitors.slice(0, 4).map((visitor) => (
              <UpcomingVisitorCard key={visitor.id} visitor={visitor} />
            ))}
          </div>
        )}
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


