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
    
    // Extract building id and name (name might not be present on the visit object)
    const rawBuildingId = pickValue(item, [
      'buildingId',
      'building.id',
      'building._id',
    ]);
    const buildingName = toDisplayString(
      pickValue(item, [
        'buildingName',
        'building.name',
        'building',
      ]),
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
      buildingId: toDisplayString(rawBuildingId, ''),
      buildingName,
      approvedBy: toDisplayString(approvedByName, 'Not available'),
      remarks,
      dateTime,
    };
  });

export default function VisitHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState('all');
  const [buildings, setBuildings] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  
  // Get current user role and assigned building from localStorage
  const [userRole, setUserRole] = useState(null);
  const [userBuildingId, setUserBuildingId] = useState(null);
  
  useEffect(() => {
    const getUserInfo = () => {
      try {
        const userData = window.localStorage.getItem('authUser');
        if (userData) {
          const user = JSON.parse(userData);
          const role = user?.role || user?.roleValue || '';
          const buildingId = pickValue(user, [
            'buildingId',
            'building.id',
            'building._id',
            'buildingId',
            'assignedBuilding',
            'assignedBuildingId'
          ]);

          setUserRole(role?.toLowerCase());
          setUserBuildingId(buildingId);
          console.log('[VisitHistory] Current user role:', role, 'buildingId:', buildingId);
        }
      } catch (err) {
        console.error('[VisitHistory] Failed to get user info', err);
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      setError('');
      try {
        console.log('[VisitHistory] Fetching buildings...');
        const isAdminUser = userRole === 'super_admin' || userRole === 'admin';
        const response = await api.getBuildings();
        console.log('[VisitHistory] Buildings API response:', response);
        let normalized = normalizeBuildings(response);
        console.log('[VisitHistory] Normalized buildings before filtering:', normalized);

        // If user has an assigned building and is not super/admin, restrict to that building only
        if (userBuildingId && !isAdminUser) {
          const userBuildingIdStr = String(userBuildingId);
          const matchedBuilding = normalized.find(
            (building) => String(building.id) === userBuildingIdStr
          );

          if (matchedBuilding) {
            normalized = [matchedBuilding];
            console.log(
              '[VisitHistory] Restricted buildings to assigned buildingId:',
              userBuildingIdStr,
              'Result:',
              normalized
            );
          } else {
            // Backend knows the assigned building even if /buildings doesn't return it
            normalized = [];
            console.warn(
              '[VisitHistory] Assigned buildingId not found in buildings list for userBuildingId:',
              userBuildingIdStr
            );
          }
        } else if (isAdminUser) {
          console.log('[VisitHistory] Super admin/admin - showing all buildings in VisitHistory');
        } else {
          console.log('[VisitHistory] No buildingId found for user - showing all buildings in VisitHistory');
        }

        setBuildings(normalized);
        
        // For super admin/admin, default to 'all'
        // For other roles, always prefer user's assigned buildingId for selection
        if (normalized.length > 0) {
          if (isAdminUser) {
            if (selectedBuildingId === 'all' || !selectedBuildingId) {
              setSelectedBuildingId('all');
            }
          } else {
            if (userBuildingId) {
              const userBuildingIdStr = String(userBuildingId);
              if (
                !selectedBuildingId ||
                selectedBuildingId === 'all' ||
                String(selectedBuildingId) !== userBuildingIdStr
              ) {
                console.log(
                  '[VisitHistory] Setting selectedBuildingId to user assigned buildingId:',
                  userBuildingIdStr
                );
                setSelectedBuildingId(userBuildingId);
              }
            } else if (!selectedBuildingId || selectedBuildingId === 'all') {
              const firstWithId = normalized.find((building) => building.id);
              if (firstWithId?.id) {
                console.log(
                  '[VisitHistory] Setting selectedBuildingId to first available building for non-admin:',
                  firstWithId.id
                );
                setSelectedBuildingId(firstWithId.id);
              }
            }
          }
        } else {
          console.warn('[VisitHistory] No buildings found for current user');
          setError('No buildings available for your account. Please contact an administrator.');
          // For restricted users, still prefer their assigned buildingId for visit fetching
          if (!isAdminUser && userBuildingId) {
            console.log(
              '[VisitHistory] Using userBuildingId for visits despite empty buildings list:',
              userBuildingId
            );
            setSelectedBuildingId(userBuildingId);
          }
        }
      } catch (err) {
        console.error('[VisitHistory] Failed to fetch buildings', err);
        setError(err.message || 'Unable to load buildings');
      }
    };

    fetchBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userBuildingId]);

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
    const isAdminUser = userRole === 'super_admin' || userRole === 'admin';

    // Guard conditions based on role
    if (isAdminUser) {
      if (!selectedBuildingId || (selectedBuildingId === 'all' && buildings.length === 0)) {
        return;
      }
    } else {
      // Restricted users must have a userBuildingId; selectedBuildingId is secondary
      if (!userBuildingId) {
        console.warn(
          '[VisitHistory] No userBuildingId for restricted user; skipping visit fetch'
        );
        return;
      }
    }

    const fetchVisits = async () => {
      setIsLoadingVisits(true);
      setError('');
      try {
        // If 'all' is selected and user is super admin, fetch visits for all buildings
        if (selectedBuildingId === 'all' && isAdminUser) {
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
          const buildingIdForRequest = isAdminUser ? selectedBuildingId : userBuildingId;
          console.log(
            '[VisitHistory] Fetching visits for buildingId:',
            buildingIdForRequest,
            'limit: 100',
            'startDate:',
            startDate,
            'endDate:',
            endDate
          );
          const response = await api.getVisitHistory(
            buildingIdForRequest, 
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

        let errorMessage = err.message || 'Unable to load visits';
        if (
          err.responseData?.message ===
          'Access denied. You can only access your assigned building.'
        ) {
          // Provide a clearer UI message while preserving backend intent
          errorMessage =
            'You can only view visit history for your assigned building. Please contact an administrator if this seems incorrect.';
        }

        setError(errorMessage);
        setVisits([]);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    fetchVisits();
  }, [selectedBuildingId, startDate, endDate, buildings, userRole, userBuildingId]);

  // Resolve a human-readable building name for each visit
  const getBuildingDisplayName = (visit) => {
    const id = visit.buildingId;
    if (id && buildings.length) {
      const match = buildings.find((b) => String(b.id) === String(id));
      if (match?.name) {
        return match.name;
      }
    }
    // Fallback to whatever name was present on the visit object or a generic label
    return visit.buildingName || 'Building';
  };

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

  return (
    <div className="space-y-6 p-4 bg-white min-h-screen pt-16 lg:pt-4">
      {/* Header with Title, Notification, and Profile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Visit History</h1>
        <div className="flex items-center gap-4">
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
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">
                  Visitor Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">
                  Building Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">
                  Approved by
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">
                  Remarks
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">
                  Date and Time
                </th>
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
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">
                      {getBuildingDisplayName(visit)}
                    </td>
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