import { useEffect, useState, useRef } from 'react';
import Profile from '../components/Profile';
import { api } from '../utils/api';
import filterIcon from '../assets/filter.png';

const resolvePath = (object, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), object);

const pickValue = (object, paths) => {
  for (const path of paths) {
    const value = resolvePath(object, path);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const toDisplayString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayString(item, '')).filter(Boolean).join(', ') || fallback;
  }
  if (typeof value === 'object') {
    const entries = Object.values(value)
      .map((item) => toDisplayString(item, ''))
      .filter(Boolean);
    return entries.join(', ') || fallback;
  }
  return fallback;
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : 'Unknown';
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const extractArray = (payload, visited = new WeakSet()) => {
  if (!payload || visited.has(payload)) return [];
  if (Array.isArray(payload)) return payload;

  visited.add(payload);

  // Check the most specific paths first based on actual API response structure
  const candidates = [
    // Most specific: data.visits (from API response: { success: true, data: { visits: [...] } })
    payload?.data?.visits,
    // Direct array properties
    payload.data,
    payload.results,
    payload.items,
    payload.visits,
    payload.buildings,
    // Nested data structures
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.buildings,
    payload?.data?.data,
    payload?.data?.docs,
    // Additional possible response structures
    payload?.visits?.data,
    payload?.visits?.items,
    payload?.visits?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      console.log('[VisitHistory] Found array in payload at:', candidate.length, 'items');
      return candidate;
    }
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate, visited);
      if (nested.length) {
        console.log('[VisitHistory] Found array in nested structure:', nested.length, 'items');
        return nested;
      }
    }
  }

  console.warn('[VisitHistory] extractArray: No array found in payload structure:', {
    keys: Object.keys(payload || {}),
    hasData: !!payload?.data,
    dataKeys: payload?.data ? Object.keys(payload.data) : [],
    fullPayload: payload
  });
  return [];
};

const normalizeBuildings = (payload) =>
  extractArray(payload).map((item, index) => {
    const id =
      pickValue(item, ['_id', 'id', 'buildingId', 'uuid']) ?? `building-${index}`;
    return {
      id,
      name: pickValue(item, ['name', 'buildingName', 'title']) || 'Unnamed Building',
      address:
        pickValue(item, ['address', 'buildingAddress', 'location', 'addressLine']) ||
        '',
    };
  });

const normalizeVisits = (payload) =>
  extractArray(payload).map((item, index) => {
    // Extract visitor name from visitorId object
    const visitorId = item?.visitorId || {};
    const visitorName = pickValue(visitorId, [
      'name',
      'fullContactInfo.name',
      'fullName',
    ]) || pickValue(item, ['visitorName', 'name']);
    
    // Extract approved by from approvedBy object
    const approvedByObj = item?.approvedBy || {};
    const approvedByName = pickValue(approvedByObj, [
      'name',
      'fullName',
    ]) || pickValue(item, [
      'approvedByName',
      'securityPersonnel',
      'verifiedBySecurity.name',
      'guardName',
    ]);
    
    // Extract building name (might not be in visit object, so use buildingId as fallback)
    const buildingName = toDisplayString(
      pickValue(item, [
        'buildingName',
        'building.name',
        'building',
      ]) || pickValue(item, ['buildingId']),
      'Building'
    );
    
    // Extract remarks/purpose
    const remarks = toDisplayString(
      pickValue(item, [
        'purpose',
        'remarks',
        'reason',
        'note',
      ]),
      'No remarks provided'
    );
    
    // Extract date/time (prefer createdAt for visit history)
    const dateTime = formatDateTime(
      pickValue(item, [
        'createdAt',
        'updatedAt',
        'checkInTime',
        'approvedAt',
        'dateTime',
        'visitTime',
        'timestamp',
      ])
    );

    return {
      id: pickValue(item, ['_id', 'id', 'visitId']) ?? `visit-${index}`,
      name: toDisplayString(visitorName, 'Unknown Visitor'),
      buildingName,
      approvedBy: toDisplayString(approvedByName, 'Not available'),
      remarks,
      dateTime,
    };
  });

export default function VisitHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState('all');
  const [buildings, setBuildings] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  
  // Get current user role from localStorage
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const getUserRole = () => {
      try {
        const userData = window.localStorage.getItem('authUser');
        if (userData) {
          const user = JSON.parse(userData);
          const role = user?.role || user?.roleValue || '';
          setUserRole(role?.toLowerCase());
          console.log('[VisitHistory] Current user role:', role);
        }
      } catch (err) {
        console.error('[VisitHistory] Failed to get user role', err);
      }
    };
    getUserRole();
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      setError('');
      try {
        console.log('[VisitHistory] Fetching buildings...');
        const response = await api.getBuildings();
        console.log('[VisitHistory] Buildings API response:', response);
        const normalized = normalizeBuildings(response);
        console.log('[VisitHistory] Normalized buildings:', normalized);
        setBuildings(normalized);
        
        // For super admin, default to 'all', otherwise select first building
        if (normalized.length > 0) {
          if (userRole === 'super_admin' || userRole === 'admin') {
            // Super admin can see all buildings, default to 'all'
            if (selectedBuildingId === 'all' || !selectedBuildingId) {
              setSelectedBuildingId('all');
            }
          } else {
            // For other roles, select first building
            if (!selectedBuildingId || selectedBuildingId === 'all') {
              const firstWithId = normalized.find((building) => building.id);
              if (firstWithId?.id) {
                console.log('[VisitHistory] Setting selectedBuildingId to:', firstWithId.id);
                setSelectedBuildingId(firstWithId.id);
              }
            }
          }
        } else {
          console.warn('[VisitHistory] No buildings found');
          setError('No buildings available. Please create a building first.');
        }
      } catch (err) {
        console.error('[VisitHistory] Failed to fetch buildings', err);
        setError(err.message || 'Unable to load buildings');
      }
    };

    fetchBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  // Handle clicking outside filter menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    };

    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
    if (!selectedBuildingId || selectedBuildingId === 'all' && buildings.length === 0) {
      return;
    }

    const fetchVisits = async () => {
      setIsLoadingVisits(true);
      setError('');
      try {
        // If 'all' is selected and user is super admin, fetch visits for all buildings
        if (selectedBuildingId === 'all' && (userRole === 'super_admin' || userRole === 'admin')) {
          console.log('[VisitHistory] Fetching visits for ALL buildings');
          const allVisitsPromises = buildings.map((building) =>
            api.getVisitHistory(building.id, 100, startDate || null, endDate || null)
              .then((response) => normalizeVisits(response))
              .catch((err) => {
                console.warn(`[VisitHistory] Failed to fetch visits for building ${building.id}:`, err);
                return []; // Return empty array for failed requests
              })
          );

          const allVisitsArrays = await Promise.all(allVisitsPromises);
          const combinedVisits = allVisitsArrays.flat();
          
          // Sort by date (most recent first)
          combinedVisits.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateB - dateA;
          });

          console.log('[VisitHistory] Combined visits from all buildings:', combinedVisits.length);
          setVisits(combinedVisits);
          
          if (combinedVisits.length === 0) {
            console.warn('[VisitHistory] No visits found across all buildings');
          }
        } else {
          // Fetch visits for specific building
          console.log('[VisitHistory] Fetching visits for buildingId:', selectedBuildingId, 'limit: 100', 'startDate:', startDate, 'endDate:', endDate);
          const response = await api.getVisitHistory(
            selectedBuildingId, 
            100, 
            startDate || null, 
            endDate || null
          );
          console.log('[VisitHistory] API response:', response);
          const normalized = normalizeVisits(response);
          console.log('[VisitHistory] Normalized visits:', normalized);
          setVisits(normalized);
          
          if (normalized.length === 0) {
            console.warn('[VisitHistory] No visits found after normalization. Raw response:', response);
          }
        }
      } catch (err) {
        console.error('[VisitHistory] Failed to fetch visits', err);
        console.error('[VisitHistory] Error details:', {
          message: err.message,
          status: err.status,
          statusText: err.statusText,
          url: err.url,
          responseData: err.responseData
        });
        setError(err.message || 'Unable to load visits');
        setVisits([]);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    fetchVisits();
  }, [selectedBuildingId, startDate, endDate, buildings, userRole]);

  const filteredVisits = visits.filter((visit) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      visit.name.toLowerCase().includes(query) ||
      visit.buildingName.toLowerCase().includes(query) ||
      visit.approvedBy.toLowerCase().includes(query) ||
      visit.remarks.toLowerCase().includes(query) ||
      visit.dateTime.toLowerCase().includes(query)
    );
  });

  const notifications = [
    { id: 1, message: "New visit logged for Building 1", time: "1 min ago", type: "info" },
    { id: 2, message: "Visit approval pending", time: "5 min ago", type: "warning" },
    { id: 3, message: "Security check completed", time: "15 min ago", type: "info" }
  ];

  return (
    <div className="space-y-6 p-4 bg-white min-h-screen pt-16 lg:pt-4">
      {/* Header with Title, Notification, and Profile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Visit History</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 sm:right-0 sm:left-auto left-0">
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
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search Logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"
          />
          <svg
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        {/* Filter Button with Date Dropdown */}
        <div className="relative" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => setIsFilterMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-800 font-medium"
          >
            <img src={filterIcon} alt="Filter visits" className="w-4 h-4 object-contain" />
            {startDate || endDate ? 'Date Filter' : 'Filter'}
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isFilterMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Filter by Date</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-medium">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-medium">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent text-sm"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visit History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Approved by</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Remarks</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Date and Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingVisits && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-sm text-gray-500">
                    Loading visits...
                  </td>
                </tr>
              )}
              {!isLoadingVisits && (!selectedBuildingId || (selectedBuildingId === 'all' && buildings.length === 0)) && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-sm text-gray-500">
                    {buildings.length === 0 
                      ? 'Loading building information...'
                      : 'Loading visits...'}
                  </td>
                </tr>
              )}
              {!isLoadingVisits && selectedBuildingId && filteredVisits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-sm text-gray-500">
                    {startDate || endDate 
                      ? 'No visit history found for the selected date range.'
                      : 'No visit history found.'}
                  </td>
                </tr>
              )}
              {!isLoadingVisits &&
                filteredVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">{visit.name}</td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">{visit.buildingName}</td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">{visit.approvedBy}</td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">{visit.remarks}</td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">{visit.dateTime}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}