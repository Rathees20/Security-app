import React, { useCallback, useEffect, useState } from "react";
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

const extractArray = (payload, visited = new WeakSet()) => {
  if (!payload || visited.has(payload)) return [];
  if (Array.isArray(payload)) return payload;

  visited.add(payload);

  const candidates = [
    payload.data,
    payload.results,
    payload.items,
    payload.users,
    payload?.data?.users,
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

export default function AdminControl() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');

  const [formData, setFormData] = useState({
    name: "",
    buildingName: "",
    buildingAddress: "",
    phoneNumber: "",
    securityGuards: "",
    employees: "",
    allowLogin: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    setAdminsError('');
    try {
      const response = await api.getAllUsers('?limit=100');
      const normalized = extractArray(response).map((item, index) => ({
        id: pickValue(item, ['_id', 'id', 'userId']) ?? `admin-${index}`,
        name: toDisplayString(
          pickValue(item, ['name', 'fullName', 'username']),
          'Unknown Admin'
        ),
        building: toDisplayString(
          pickValue(item, ['buildingName', 'building.name']),
          'Not assigned'
        ),
        email: toDisplayString(pickValue(item, ['email']), 'Email unavailable'),
        phoneNumber: toDisplayString(
          pickValue(item, ['phoneNumber', 'contactNumber']),
          'Phone unavailable'
        ),
        role: toDisplayString(pickValue(item, ['role']), 'ADMIN'),
        details:
          toDisplayString(pickValue(item, ['details', 'description'])) ||
          `Email: ${toDisplayString(pickValue(item, ['email']), 'N/A')} · Phone: ${toDisplayString(
            pickValue(item, ['phoneNumber', 'contactNumber']),
            'N/A'
          )}`,
      }));
      setAdmins(normalized);
    } catch (err) {
      console.error('Failed to fetch admins', err);
      setAdminsError(err.message || 'Unable to load admins');
      setAdmins([]);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionError('');
    setSubmissionMessage('');

    const payload = {
      name: formData.name,
      buildingName: formData.buildingName,
      buildingAddress: formData.buildingAddress,
      phoneNumber: formData.phoneNumber,
      securityGuards: formData.securityGuards,
      employees: formData.employees,
      allowLogin: formData.allowLogin,
    };

    const submitAdmin = async () => {
      setIsSubmitting(true);
      try {
        await api.createAdmin(payload);
        setSubmissionMessage('Admin created successfully.');
        setShowModal(false);
        setFormData({
          name: "",
          buildingName: "",
          buildingAddress: "",
          phoneNumber: "",
          securityGuards: "",
          employees: "",
          allowLogin: true,
        });
        await fetchAdmins();
      } catch (err) {
        console.error('Failed to create admin', err);
        setSubmissionError(err.message || 'Unable to create admin');
      } finally {
        setIsSubmitting(false);
      }
    };

    submitAdmin();
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notifications = [
    { id: 1, message: "New admin registration request", time: "2 min ago", type: "info" },
    { id: 2, message: "Security alert in Building 1", time: "5 min ago", type: "warning" },
    { id: 3, message: "System maintenance scheduled", time: "1 hour ago", type: "info" }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 bg-white min-h-screen pt-16 lg:pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-10 gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">
          Admin Control
        </h1>

        {/* Right side icons */}
        <div className="flex items-center gap-5">
          {/* Notification */}
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

          {/* Profile */}
          <Profile />
        </div>
      </div>

      {/* Search bar */}
      <div className="relative w-full sm:w-1/3 mb-6 sm:mb-10">
        <input
          type="text"
          placeholder="Search admin"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 border border-[#b00020] rounded-lg focus:outline-none text-sm text-gray-700"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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

      {/* All Admins Header + Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">All Admins</h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition justify-center">
            <img src={filterIcon} alt="Filter list" className="w-4 h-4 object-contain" />
            Sort By: A to Z
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#b00020] rounded-lg text-sm text-[#b00020] font-medium hover:bg-[#b00020]/10 transition justify-center"
          >
            <svg
              className="w-3.5 h-3.5 text-[#b00020]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Admin
          </button>
        </div>
      </div>

      {adminsError && (
        <div className="mb-6 px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          {adminsError}
        </div>
      )}

      {submissionMessage && (
        <div className="mb-6 px-4 py-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg">
          {submissionMessage}
        </div>
      )}

      {submissionError && (
        <div className="mb-6 px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          {submissionError}
        </div>
      )}

      {/* Admin cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingAdmins && (
          <div className="col-span-full text-center text-sm text-gray-500 py-6">
            Loading admins...
          </div>
        )}
        {!isLoadingAdmins && filteredAdmins.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-500 py-6">
            No admins found.
          </div>
        )}
        {!isLoadingAdmins && filteredAdmins.map((admin) => (
          <div
            key={admin.id}
            className="p-4 rounded-lg border border-[#b00020] bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-3">
              <img
                src="https://i.pravatar.cc/64"
                alt="admin"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-sm text-gray-900">
                  {admin.name}
                </h3>
                <p className="text-xs text-gray-500">{admin.building}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              {admin.details}
            </p>

            <div className="flex justify-start gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#b00020] text-white text-[10px]">
                  R
                </span>
                <span className="text-gray-700">
                  Role: {admin.role}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#b00020] text-white text-[10px]">
                  P
                </span>
                <span className="text-gray-700">
                  {admin.phoneNumber}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h3 className="font-semibold text-lg text-gray-800">Admin</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="buildingName"
                  value={formData.buildingName}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Building Address</label>
                <input
                  name="buildingAddress"
                  value={formData.buildingAddress}
                  onChange={handleInputChange}
                  placeholder="Enter building address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">No. of Security Guards</label>
                <input
                  name="securityGuards"
                  type="number"
                  value={formData.securityGuards}
                  onChange={handleInputChange}
                  placeholder="Enter number of security guards"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">No. of Employees</label>
                <input
                  name="employees"
                  type="number"
                  value={formData.employees}
                  onChange={handleInputChange}
                  placeholder="Enter number of employees"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-700">Allow the admin to login to the app</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    name="allowLogin"
                    className="sr-only"
                    checked={formData.allowLogin}
                    onChange={handleInputChange}
                  />
                  <div
                    onClick={() =>
                      setFormData((p) => ({ ...p, allowLogin: !p.allowLogin }))
                    }
                    className={`w-8 h-4 rounded-full shadow-inner transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.allowLogin ? "bg-[#b00020]" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                        formData.allowLogin
                          ? "translate-x-4 translate-y-0.5"
                          : "translate-x-0.5 translate-y-0.5"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#b00020] text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
