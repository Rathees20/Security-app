import { useEffect, useMemo, useRef, useState } from "react";
import Profile from '../components/Profile';
import { api } from '../utils/api';
import filterIcon from '../assets/filter.png';

const BUILDING_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name · A → Z' },
  { value: 'name-desc', label: 'Name · Z → A' },
  { value: 'date-desc', label: 'Newest Added' },
  { value: 'progress-desc', label: 'Most Visits Completed' },
];

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

const extractArray = (payload, visited = new WeakSet()) => {
  if (!payload || visited.has(payload)) return [];
  if (Array.isArray(payload)) return payload;

  visited.add(payload);

  const candidates = [
    payload.data,
    payload.results,
    payload.items,
    payload.buildings,
    payload?.data?.buildings,
    payload?.data?.items,
    payload?.data?.results,
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

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

// Helper to download an array of row objects as CSV
const downloadAsCsv = (filenameBase, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const str = value == null ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvLines = [];
  csvLines.push(headers.map(escapeCell).join(','));
  rows.forEach((row) => {
    const line = headers.map((key) => escapeCell(row[key]));
    csvLines.push(line.join(','));
  });

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.setAttribute('download', `${filenameBase}-${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function SocietyControl() {
  const [buildings, setBuildings] = useState([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [buildingError, setBuildingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    buildingName: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    securityGuards: '',
    employees: '',
    image: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [sortOption, setSortOption] = useState(BUILDING_SORT_OPTIONS[0].value);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const selectedSortLabel = useMemo(
    () => BUILDING_SORT_OPTIONS.find((option) => option.value === sortOption)?.label || 'Sort By',
    [sortOption]
  );

  // Get current user information from localStorage
  const [userBuildingId, setUserBuildingId] = useState(null);
  const [userRole, setUserRole] = useState(null);

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
          console.log('[SocietyControl] Current user role:', role, 'buildingId:', buildingId);
        }
      } catch (err) {
        console.error('[SocietyControl] Failed to get user info', err);
      }
    };
    getUserInfo();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionMessage('');
    setSubmissionError('');
    setFormErrors({});

    const trimmedName = formData.buildingName.trim();
    const trimmedCity = formData.city.trim();
    const trimmedCountry = formData.country.trim() || 'India';

    const nextErrors = {};

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      nextErrors.buildingName = 'Building name must be between 2 and 100 characters.';
    }

    if (trimmedCity && trimmedCity.length < 2) {
      nextErrors.city = 'City must be at least 2 characters when provided.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    const addressPayload = {};
    if (formData.street.trim()) addressPayload.street = formData.street.trim();
    if (trimmedCity) addressPayload.city = trimmedCity;
    if (formData.state.trim()) addressPayload.state = formData.state.trim();
    if (formData.pincode.trim()) addressPayload.pincode = formData.pincode.trim();
    addressPayload.country = trimmedCountry;

    const hasImage = Boolean(formData.image);
    let submissionPayload;

    if (hasImage) {
      const formPayload = new FormData();
      formPayload.append('name', trimmedName);
      Object.entries(addressPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formPayload.append(`address[${key}]`, value);
        }
      });
      formPayload.append('securityGuards', formData.securityGuards);
      formPayload.append('employees', formData.employees);
      formPayload.append('image', formData.image);
      submissionPayload = formPayload;
    } else {
      submissionPayload = {
        name: trimmedName,
        address: addressPayload,
        securityGuards: formData.securityGuards,
        employees: formData.employees,
      };
    }

    const submitBuilding = async () => {
      setIsSubmitting(true);
      try {
        await api.createBuilding(submissionPayload);
        setSubmissionMessage('Building added successfully.');
        setIsModalOpen(false);
        setFormData({
          buildingName: '',
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          securityGuards: '',
          employees: '',
          image: null
        });
        setFormErrors({});
        await fetchBuildings();
      } catch (err) {
        console.error('Failed to create building', err);
        setSubmissionError(err.message || 'Unable to add building');
      } finally {
        setIsSubmitting(false);
      }
    };

    submitBuilding();
  };

  const fetchBuildings = async () => {
    setIsLoadingBuildings(true);
    setBuildingError('');
    try {
      const response = await api.getBuildings();
      let normalized = extractArray(response).map((item, index) => ({
        id: pickValue(item, ['_id', 'id', 'buildingId']) ?? `building-${index}`,
        name:
          toDisplayString(pickValue(item, ['name', 'buildingName', 'title']), 'Unnamed Building'),
        location: toDisplayString(
          pickValue(item, ['address', 'buildingAddress', 'location']),
          'No address provided'
        ),
        progress:
          Number(
            pickValue(item, [
              'progress',
              'completion',
              'visitCompletionPercentage',
              'visitCompletion',
            ])
          ) || 0,
        date: formatDate(pickValue(item, ['createdAt', 'updatedAt', 'date'])),
      }));

      // Filter buildings based on user's building if not super admin
      if (userBuildingId && userRole !== 'super_admin' && userRole !== 'admin') {
        console.log('[SocietyControl] Filtering buildings for user buildingId:', userBuildingId);
        normalized = normalized.filter((building) => {
          // Compare both as strings to handle different ID formats
          const buildingIdStr = String(building.id);
          const userBuildingIdStr = String(userBuildingId);
          return buildingIdStr === userBuildingIdStr;
        });
        console.log('[SocietyControl] Filtered buildings count:', normalized.length);
      } else if (userRole === 'super_admin' || userRole === 'admin') {
        console.log('[SocietyControl] Super admin/admin - showing all buildings');
      } else {
        console.log('[SocietyControl] No buildingId found for user - showing all buildings');
      }

      setBuildings(normalized);
    } catch (err) {
      console.error('Failed to fetch buildings', err);
      setBuildingError(err.message || 'Unable to load buildings');
      setBuildings([]);
    } finally {
      setIsLoadingBuildings(false);
    }
  };

  useEffect(() => {
    // Wait for user info to be loaded before fetching buildings
    if (userRole !== undefined) {
      fetchBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userBuildingId]);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!sortMenuRef.current) return;
      if (!sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  const filteredBuildings = useMemo(() => {
    const query = searchTerm.toLowerCase();
    if (!query) return buildings;
    return buildings.filter(
      (building) =>
        building.name.toLowerCase().includes(query) ||
        building.location.toLowerCase().includes(query)
    );
  }, [buildings, searchTerm]);

  const sortedBuildings = useMemo(() => {
    const list = [...filteredBuildings];
    const toTimestamp = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    switch (sortOption) {
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-desc':
        return list.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
      case 'progress-desc':
        return list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      case 'name-asc':
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredBuildings, sortOption]);

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 bg-white min-h-screen pt-16 lg:pt-4">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Society Control</h1>
        </div>
        
        {/* User/Notification Icons - Far Right */}
        <div className="flex items-center gap-3">
          <Profile />
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search building"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
          />
          <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Sort Button */}
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setIsSortMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors justify-center text-sm text-neutral-800"
          >
            <img src={filterIcon} alt="Filter buildings" className="w-4 h-4 object-contain" />
            {selectedSortLabel}
            <svg
              className={`w-4 h-4 text-neutral-500 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isSortMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 p-2">
              <p className="text-xs uppercase tracking-wide text-neutral-500 px-2 mb-1">Sort buildings</p>
              <div className="space-y-1">
                {BUILDING_SORT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm ${
                      sortOption === option.value
                        ? 'bg-neutral-100 text-neutral-900 font-medium'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="building-sort"
                      className="text-[#B00020] focus:ring-[#B00020]"
                      checked={sortOption === option.value}
                      onChange={() => {
                        setSortOption(option.value);
                        setIsSortMenuOpen(false);
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download + Add New Building Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (!sortedBuildings || sortedBuildings.length === 0) {
                return;
              }
              const rows = sortedBuildings.map((building) => ({
                Name: building.name || '',
                Location: building.location || '',
                ProgressPercent: building.progress ?? '',
                Date: building.date || '',
              }));
              downloadAsCsv('buildings', rows);
            }}
            className="flex items-center gap-2 px-4 py-3 border border-[#B00020] text-[#B00020] rounded-lg hover:bg-[#B00020]/10 transition-colors justify-center text-sm"
          >
            <svg
              className="w-4 h-4 text-[#B00020]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 3a2 2 0 012-2h6a1 1 0 01.707.293l4 4A1 1 0 0116 7h-3a1 1 0 01-1-1V3H5v14h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H5a2 2 0 01-2-2V3z" />
              <path d="M11 11a1 1 0 10-2 0v1.586L8.293 12.88a1 1 0 00-1.414 1.415l3 3a1 1 0 001.414 0l3-3a1 1 0 10-1.414-1.415L11 12.586V11z" />
            </svg>
            <span>Download CSV</span>
          </button>

          {(userRole === 'super_admin' || userRole === 'admin' || !userRole) && (
            <button
              className="flex items-center gap-2 px-4 py-3 bg-[#B00020] text-white rounded-lg hover:bg-red-700 transition-colors justify-center"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Add New Building</span>
            </button>
          )}
        </div>
      </div>

      {/* All Buildings Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-6">All Buildings</h2>
        {buildingError && (
          <div className="mb-4 px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {buildingError}
          </div>
        )}
        {submissionMessage && (
          <div className="mb-4 px-4 py-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg">
            {submissionMessage}
          </div>
        )}
        {/* Building Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingBuildings && (
            <div className="col-span-full text-center text-sm text-neutral-500 py-6">
              Loading buildings...
            </div>
          )}
          {!isLoadingBuildings && sortedBuildings.length === 0 && (
            <div className="col-span-full text-center text-sm text-neutral-500 py-6">
              No buildings found.
            </div>
          )}
          {!isLoadingBuildings &&
            sortedBuildings.map((building) => (
              <div key={building.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-shadow">
              {/* Building Image Placeholder */}
              <div className="h-28 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500 mb-4">
                Building image
              </div>
              
              {/* Name */}
              <h3 className="font-bold text-neutral-900 text-base mb-1">{building.name}</h3>
              
              {/* Location Address */}
              <p className="text-sm text-neutral-600 mb-3">{building.location}</p>
              
              {/* Visits Completed Today */}
              <div className="mb-2">
                <p className="text-sm text-neutral-800 mb-2">Visits Completed Today</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-2 bg-neutral-200 rounded-full mr-3">
                    <div 
                      className="h-2 bg-[#B00020] rounded-full" 
                      style={{ width: `${Math.max(0, Math.min(100, building.progress || 0))}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#B00020] font-medium">{Math.max(0, Math.min(100, building.progress || 0))}%</span>
                </div>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-2 mt-3">
                <svg className="w-4 h-4 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-neutral-500">{building.date || 'Date unavailable'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Building Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-xs relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800"
              onClick={() => setIsModalOpen(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Add Building</h2>
            {submissionError && (
              <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md">
                {submissionError}
              </div>
            )}
            
            {/* Add Image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Add Image</label>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-3 text-center text-neutral-500 hover:border-[#B00020] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <svg className="w-6 h-6 mx-auto mb-1 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11v-2.5a.5.5 0 00-1 0V13H5.5zM4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1H4z" />
                </svg>
                  <p className="text-xs">
                    {formData.image ? formData.image.name : 'Drag your file(s) or browse'}
                  </p>
                </label>
              </div>
            </div>
            
            {/* Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
              <input
                type="text"
                name="buildingName"
                value={formData.buildingName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
              {formErrors.buildingName && (
                <p className="mt-1 text-xs text-red-600">{formErrors.buildingName}</p>
              )}
            </div>

            {/* Street */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Street</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>

            {/* City */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
              {formErrors.city && (
                <p className="mt-1 text-xs text-red-600">{formErrors.city}</p>
              )}
            </div>

            {/* State */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>

            {/* Pincode */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>

            {/* Country */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>
            
            {/* No of Security Guards */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">No of Security Guards</label>
              <input
                type="number"
                name="securityGuards"
                value={formData.securityGuards}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>
            
            {/* No of Employees */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">No of Employees</label>
              <input
                type="number"
                name="employees"
                value={formData.employees}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>
            
            {/* Add Admin Button */}
            <button 
              type="button"
              onClick={handleSubmit}
              className="w-full py-3 bg-[#B00020] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}