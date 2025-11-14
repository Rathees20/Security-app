import { useEffect, useState } from 'react';
import Profile from '../components/Profile';
import { api } from '../utils/api';

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

  const candidates = [
    payload.data,
    payload.results,
    payload.items,
    payload.visits,
    payload.buildings,
    payload?.data?.visits,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.buildings,
    payload?.data?.data,
    payload?.data?.docs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = extractArray(candidate, visited);
      if (nested.length) return nested;
    }
  }

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
  extractArray(payload).map((item, index) => ({
    id: pickValue(item, ['_id', 'id', 'visitId']) ?? `visit-${index}`,
    name:
      toDisplayString(
        pickValue(item, ['visitorName', 'name', 'visitor.fullName', 'visitor.name']),
        'Unknown Visitor'
      ),
    buildingName: toDisplayString(
      pickValue(item, ['buildingName', 'building.name', 'building']),
      'Unknown Building'
    ),
    approvedBy: toDisplayString(
      pickValue(item, [
        'approvedBy',
        'approvedByName',
        'securityPersonnel',
        'security.name',
        'guardName',
      ]),
      'Not available'
    ),
    remarks: toDisplayString(
      pickValue(item, ['remarks', 'purpose', 'reason', 'note']),
      'No remarks provided'
    ),
    dateTime: formatDateTime(
      pickValue(item, ['dateTime', 'visitTime', 'createdAt', 'updatedAt', 'timestamp'])
    ),
  }));

export default function VisitHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [visits, setVisits] = useState([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBuildings = async () => {
      setIsLoadingBuildings(true);
      setError('');
      try {
        const response = await api.getBuildings();
        const normalized = normalizeBuildings(response);
        setBuildings(normalized);
        if (!selectedBuildingId && normalized.length > 0) {
          const firstWithId = normalized.find((building) => building.id);
          if (firstWithId?.id) {
            setSelectedBuildingId(firstWithId.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch buildings', err);
        setError(err.message || 'Unable to load buildings');
      } finally {
        setIsLoadingBuildings(false);
      }
    };

    fetchBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) {
      return;
    }

    const fetchVisits = async () => {
      setIsLoadingVisits(true);
      setError('');
      try {
        const response = await api.getTodayVisits(selectedBuildingId);
        const normalized = normalizeVisits(response);
        setVisits(normalized);
      } catch (err) {
        console.error('Failed to fetch visits', err);
        setError(err.message || 'Unable to load visits');
        setVisits([]);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    fetchVisits();
  }, [selectedBuildingId]);

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

      {/* Search and Sort Section */}
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
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={selectedBuildingId}
            onChange={(event) => setSelectedBuildingId(event.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent text-sm"
            disabled={isLoadingBuildings || buildings.length === 0}
          >
            {isLoadingBuildings && <option>Loading buildings...</option>}
            {!isLoadingBuildings && buildings.length === 0 && (
              <option value="">No buildings available</option>
            )}
            {!isLoadingBuildings &&
              buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
          </select>
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
              {!isLoadingVisits && filteredVisits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-sm text-gray-500">
                    No visit history found for the selected building.
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