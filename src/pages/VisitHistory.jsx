import { useState } from 'react';

export default function VisitHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  
  const visitData = [
    {
      name: "Sara",
      buildingName: "Building 1- Location",
      approvedBy: "John Doe - Security",
      remarks: "Househelp - Employee Code: 17637",
      dateTime: "12th August, 2025 03:10 PM"
    },
    {
      name: "Sara",
      buildingName: "Building 1- Location",
      approvedBy: "John Doe - Security",
      remarks: "Househelp - Employee Code: 17637",
      dateTime: "12th August, 2025 03:10 PM"
    },
    {
      name: "Sara",
      buildingName: "Building 1- Location",
      approvedBy: "John Doe - Security",
      remarks: "Househelp - Employee Code: 17637",
      dateTime: "12th August, 2025 03:10 PM"
    },
    {
      name: "Sara",
      buildingName: "Building 1- Location",
      approvedBy: "John Doe - Security",
      remarks: "Househelp - Employee Code: 17637",
      dateTime: "12th August, 2025 03:10 PM"
    }
  ];

  const filteredVisits = visitData.filter(visit =>
    visit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.buildingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.approvedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.dateTime.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notifications = [
    { id: 1, message: "New visit logged for Building 1", time: "1 min ago", type: "info" },
    { id: 2, message: "Visit approval pending", time: "5 min ago", type: "warning" },
    { id: 3, message: "Security check completed", time: "15 min ago", type: "info" }
  ];

  return (
    <div className="space-y-6 p-4 bg-white min-h-screen">
      {/* Header with Title, Notification, and Profile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Visit History</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
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
          <div className="w-8 h-8">
            <img
              src="https://via.placeholder.com/32"
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Search and Sort Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 w-full sm:w-auto justify-center">
          <span>Sort By: Date</span>
          <svg
            className="w-4 h-4 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 000 2v11a1 1 0 102 0V5h10a1 1 0 100-2H3zm11 8a1 1 0 01-1 1H6a1 1 0 110-2h7a1 1 0 011 1zm-1 4a1 1 0 100-2H6a1 1 0 100 2h7z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Visit History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Building Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Approved by</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Remarks</th>
                <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-gray-800">Date and Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVisits.map((visit, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
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