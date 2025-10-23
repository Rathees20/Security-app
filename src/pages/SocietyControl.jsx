import { useState } from "react";

export default function SocietyControl() {
  const buildingData = [
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    },
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    },
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    },
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    },
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    },
    {
      name: "Building 1 Name",
      location: "Location address",
      progress: 75,
      date: "July 14, 2025"
    }
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allowLogin, setAllowLogin] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [formData, setFormData] = useState({
    buildingName: '',
    buildingAddress: '',
    securityGuards: '',
    employees: '',
    image: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
    console.log('Form submitted:', { ...formData, allowLogin });
    setIsModalOpen(false);
    setFormData({
      buildingName: '',
      buildingAddress: '',
      securityGuards: '',
      employees: '',
      image: null
    });
    setAllowLogin(true);
  };

  const filteredBuildings = buildingData.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notifications = [
    { id: 1, message: "New building registration request", time: "3 min ago", type: "info" },
    { id: 2, message: "Security update for Building 1", time: "10 min ago", type: "info" },
    { id: 3, message: "Maintenance alert in Building 2", time: "30 min ago", type: "warning" }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 bg-white min-h-screen">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Society Control</h1>
        </div>
        
        {/* User/Notification Icons - Far Right */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
            <svg className="w-5 h-5 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
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
          <img alt="avatar" className="w-10 h-10 rounded-full object-cover" src="https://i.pravatar.cc/80" />
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
        <button className="flex items-center gap-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors justify-center">
          <svg className="w-4 h-4 text-[#B00020]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v11a1 1 0 102 0V5h10a1 1 0 100-2H3zm11 8a1 1 0 01-1 1H6a1 1 0 110-2h7a1 1 0 011 1zm-1 4a1 1 0 100-2H6a1 1 0 100 2h7z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-neutral-800">Sort By: A to Z</span>
        </button>
        
        {/* Add New Building Button */}
        <button
          className="flex items-center gap-2 px-4 py-3 bg-[#B00020] text-white rounded-lg hover:bg-red-700 transition-colors justify-center"
          onClick={() => setIsModalOpen(true)}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Add New Building</span>
        </button>
      </div>

      {/* All Buildings Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-6">All Buildings</h2>
        
        {/* Building Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuildings.map((building, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-shadow">
              {/* Building Image Placeholder */}
              <div className="h-28 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500 mb-4">
                Building image
              </div>
              
              {/* Building Name */}
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
                      style={{ width: `${building.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#B00020] font-medium">{building.progress}%</span>
                </div>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-2 mt-3">
                <svg className="w-4 h-4 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-neutral-500">{building.date}</span>
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
            
            {/* Building Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Building Name</label>
              <input
                type="text"
                name="buildingName"
                value={formData.buildingName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B00020] focus:border-transparent text-sm"
              />
            </div>
            
            {/* Building Address */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Building Address</label>
              <input
                type="text"
                name="buildingAddress"
                value={formData.buildingAddress}
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
            
            {/* Allow Admin to Log In */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-neutral-700">
                <span>Allow the admin to log in to the app</span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={allowLogin}
                    onChange={(e) => setAllowLogin(e.target.checked)}
                  />
                  <div 
                    className={`w-8 h-4 rounded-full shadow-inner transition-colors duration-200 ease-in-out cursor-pointer ${
                      allowLogin ? 'bg-[#B00020]' : 'bg-gray-200'
                    }`}
                    onClick={() => setAllowLogin(!allowLogin)}
                  >
                    <div 
                      className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                        allowLogin ? 'translate-x-4 translate-y-0.5' : 'translate-x-0.5 translate-y-0.5'
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add Admin Button */}
            <button 
              type="button"
              onClick={handleSubmit}
              className="w-full py-3 bg-[#B00020] text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add Admin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}