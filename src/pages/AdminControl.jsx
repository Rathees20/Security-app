import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const findNumericByKeyword = (payload, keywords) => {
  if (!payload || typeof payload !== 'object') return undefined;

  const stack = [payload];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    Object.entries(current).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        stack.push(value);
        return;
      }

      if (
        (typeof value === 'string' || typeof value === 'number') &&
        keywords.some((keyword) => key.toLowerCase().includes(keyword))
      ) {
        const parsed = typeof value === 'string' ? value.trim() : value;
        if (parsed !== '' && parsed !== null && parsed !== undefined) {
          return parsed;
        }
      }
    });
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

const formatRoleForDisplay = (roleValue) => {
  if (!roleValue || typeof roleValue !== 'string') return 'ADMIN';
  const trimmed = roleValue.trim();
  if (!trimmed) return 'ADMIN';
  
  const normalized = trimmed.toLowerCase().replace(/[_\s]+/g, '_');
  
  // Map building_admin to Building Admin for display - handle all variations
  if (normalized === 'building_admin' || normalized === 'buildingadmin' || 
      (trimmed.toLowerCase().includes('building') && trimmed.toLowerCase().includes('admin'))) {
    return 'Building Admin';
  }
  
  // Also handle legacy super_admin for backward compatibility
  if (normalized === 'super_admin' || normalized === 'superadmin' || 
      (trimmed.toLowerCase().includes('super') && trimmed.toLowerCase().includes('admin'))) {
    return 'Building Admin';
  }
  
  // Format other roles with proper capitalization
  return trimmed
    .replace(/[_\s]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const extractArray = (payload, visited = new WeakSet()) => {
  if (!payload || visited.has(payload)) return [];
  if (Array.isArray(payload)) return payload;

  visited.add(payload);

  const candidates = [
    payload.data,
    payload.buildings,
    payload.results,
    payload.items,
    payload.users,
    payload?.data?.buildings,
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

const DEFAULT_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'building_admin', label: 'Building Admin' },
  { value: 'security', label: 'Security' },
  { value: 'resident', label: 'Resident' },
];

const RESTRICTED_ROLE_KEYS = ['security', 'resident', 'building_admin'];
const isRestrictedRole = (value = '') => RESTRICTED_ROLE_KEYS.includes(value.toLowerCase());

const MODAL_TITLES = {
  default: 'Admin',
  security: 'Security',
  resident: 'Resident',
  building_admin: 'Building Admin',
};

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name · A → Z' },
  { value: 'name-desc', label: 'Name · Z → A' },
  { value: 'role-asc', label: 'Role · A → Z' },
  { value: 'guards-desc', label: 'Most Security Guards' },
  { value: 'employees-desc', label: 'Most Employees' },
];

const createInitialFormData = (roleValue = DEFAULT_ROLE_OPTIONS[0].value) => ({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: roleValue,
  buildingId: "",
  employeeCode: "",
  buildingName: "",
  buildingAddress: "",
  phoneNumber: "",
  securityGuards: "",
  employees: "",
});

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

export default function AdminControl() {
  const [showModal, setShowModal] = useState(false);
  const [modalContext, setModalContext] = useState('default');
  const [searchTerm, setSearchTerm] = useState("");
  const [admins, setAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');

  const [formData, setFormData] = useState(() => createInitialFormData(DEFAULT_ROLE_OPTIONS[0].value));
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [isLoadingBuildingOptions, setIsLoadingBuildingOptions] = useState(false);
  const [buildingOptionsError, setBuildingOptionsError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0].value);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const selectedSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortOption)?.label || 'Sort',
    [sortOption]
  );

  // Get current user role and assigned building from localStorage
  const [userRole, setUserRole] = useState(null);
  const [userBuildingId, setUserBuildingId] = useState(null);

  const PHONE_REGEX = /^\d{10}$/;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;

    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

    if (name === 'phoneNumber') {
      const digitsOnly = typeof nextValue === 'string' ? nextValue.replace(/\D/g, '') : '';
      nextValue = digitsOnly;
      const candidate = digitsOnly;
      if (!candidate) {
        setPhoneError('');
      } else if (!PHONE_REGEX.test(candidate)) {
        setPhoneError('Phone number must be exactly 10 digits.');
      } else {
        setPhoneError('');
      }
    }


    // Auto-fill building address when building is selected
    if (name === 'buildingId') {
      if (nextValue) {
        const selectedBuilding = buildingOptions.find(
          (building) => building.id === nextValue
        );
        
        setFormData((prev) => ({
          ...prev,
          [name]: nextValue,
          buildingName: selectedBuilding?.name || '',
          buildingAddress: selectedBuilding?.address || '',
        }));
      } else {
        // Clear building-related fields when building is deselected
        setFormData((prev) => ({
          ...prev,
          [name]: '',
          buildingName: '',
          buildingAddress: '',
        }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    setAdminsError('');
    try {
      const response = await api.getAllUsers('?limit=100');
      let normalized = extractArray(response).map((item, index) => {
        const employeeCount =
          findNumericByKeyword(item, ['employee', 'staff']) ??
          pickValue(item, [
            'employees',
            'employeeCount',
            'staffCount',
            'noOfEmployees',
            'numberOfEmployees',
            'numEmployees',
          ]);

        const securityGuardCount =
          findNumericByKeyword(item, ['guard', 'security']) ??
          pickValue(item, [
            'securityGuards',
            'guardCount',
            'securityGuardCount',
            'noOfSecurityGuards',
            'numberOfSecurityGuards',
            'numSecurityGuards',
          ]);

        const rawRole = pickValue(item, ['role']);
        
        // Extract buildingId from various possible locations
        let adminBuildingId = pickValue(item, [
          'buildingId',
          'building.id',
          'building._id',
          'assignedBuildingId',
          'assignedBuilding.id',
          'assignedBuilding._id',
        ]);

        // If buildingId not found, check for nested building object
        if (!adminBuildingId) {
          const buildingObj = pickValue(item, ['assignedBuilding', 'building']);
          if (buildingObj && typeof buildingObj === 'object') {
            adminBuildingId = pickValue(buildingObj, ['_id', 'id', 'buildingId']);
          }
        }

        // Ensure buildingId is a primitive value, not an object
        if (adminBuildingId && typeof adminBuildingId === 'object') {
          adminBuildingId = pickValue(adminBuildingId, ['_id', 'id']);
        }

        return {
          id: pickValue(item, ['_id', 'id', 'userId']) ?? `admin-${index}`,
          name: toDisplayString(
            pickValue(item, ['name', 'fullName', 'username']),
            'Unknown Admin'
          ),
          building: toDisplayString(
            pickValue(item, ['buildingName', 'building.name']),
            'Not assigned'
          ),
          buildingId: adminBuildingId, // Store buildingId for filtering
          email: toDisplayString(pickValue(item, ['email']), 'Email unavailable'),
          phoneNumber: toDisplayString(
            pickValue(item, ['phoneNumber', 'contactNumber']),
            'Phone unavailable'
          ),
          employees: toDisplayString(employeeCount, '0'),
          securityGuards: toDisplayString(securityGuardCount, '0'),
          role: formatRoleForDisplay(rawRole),
          roleValue: rawRole, // Store original backend value for dropdown options
          details:
            toDisplayString(pickValue(item, ['details', 'description'])) ||
            `Email: ${toDisplayString(pickValue(item, ['email']), 'N/A')} · Phone: ${toDisplayString(
              pickValue(item, ['phoneNumber', 'contactNumber']),
              'N/A'
            )}`,
        };
      });

      // Filter admins by building if user is building admin
      // Check for various building admin role formats (BUILDING_ADMIN, building_admin, super_admin, etc.)
      const isBuildingAdmin = userRole && (
        userRole === 'building_admin' || 
        userRole === 'super_admin' || 
        userRole === 'build_admin' ||
        userRole === 'buildingadmin' ||
        userRole.includes('building') && userRole.includes('admin')
      );
      
      if (userBuildingId && isBuildingAdmin) {
        normalized = normalized.filter((admin) => {
          // Compare building IDs as strings to handle different formats
          return String(admin.buildingId) === String(userBuildingId);
        });
        console.log('[AdminControl] Filtered admins for building admin:', normalized.length, 'buildingId:', userBuildingId);
      }

      setAdmins(normalized);
    } catch (err) {
      console.error('Failed to fetch admins', err);
      setAdminsError(err.message || 'Unable to load admins');
      setAdmins([]);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [userRole, userBuildingId]);

  // Get user information from localStorage
  useEffect(() => {
    const getUserInfo = () => {
      try {
        const userData = window.localStorage.getItem('authUser');
        if (userData) {
          const user = JSON.parse(userData);
          const role = user?.role || user?.roleValue || '';
          
          // Derive buildingId from various possible shapes
          let rawBuildingId = pickValue(user, [
            'buildingId',
            'building.id',
            'building._id',
            'assignedBuildingId',
            'assignedBuilding.id',
            'assignedBuilding._id',
          ]);

          if (!rawBuildingId) {
            const buildingObj = pickValue(user, ['assignedBuilding', 'building']);
            if (buildingObj && typeof buildingObj === 'object') {
              rawBuildingId = pickValue(buildingObj, ['_id', 'id']);
            }
          }

          const finalBuildingId = rawBuildingId && typeof rawBuildingId !== 'object' ? rawBuildingId : null;

          // Store role in both original and lowercase for flexible checking
          const normalizedRole = role?.toLowerCase();
          setUserRole(normalizedRole);
          setUserBuildingId(finalBuildingId);
          console.log('[AdminControl] User role:', role, 'normalized:', normalizedRole, 'buildingId:', finalBuildingId);
        }
      } catch (err) {
        console.error('[AdminControl] Failed to get user info', err);
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const availableRoles = useMemo(() => {
    const seen = new Map();

    admins.forEach((admin) => {
      // Use roleValue (original backend value) if available, otherwise use role (formatted)
      const roleValue = admin?.roleValue || admin?.role;
      if (!roleValue || typeof roleValue !== 'string') return;
      const trimmed = roleValue.trim();
      if (!trimmed || seen.has(trimmed)) return;

      // Custom label for building_admin to display as "Building Admin" - handle all variations
      const normalized = trimmed.toLowerCase().replace(/[_\s]+/g, '_');
      let label;
      if (normalized === 'building_admin' || normalized === 'buildingadmin' || 
          (trimmed.toLowerCase().includes('building') && trimmed.toLowerCase().includes('admin'))) {
        label = 'Building Admin';
      } else if (normalized === 'super_admin' || normalized === 'superadmin' || 
          (trimmed.toLowerCase().includes('super') && trimmed.toLowerCase().includes('admin'))) {
        // Handle legacy super_admin for backward compatibility
        label = 'Building Admin';
      } else {
        label = trimmed
          .replace(/[_\s]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }

      seen.set(trimmed, {
        value: trimmed,
        label: label || trimmed,
      });
    });

    if (seen.size > 0) {
      return Array.from(seen.values());
    }

    return DEFAULT_ROLE_OPTIONS;
  }, [admins]);

  const defaultRoleOptions = useMemo(() => {
    const filtered = availableRoles.filter(
      (option) => option?.value && !isRestrictedRole(option.value)
    );
    if (filtered.length) {
      return filtered;
    }
    return DEFAULT_ROLE_OPTIONS.filter((option) => !isRestrictedRole(option.value));
  }, [availableRoles]);

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

  useEffect(() => {
    if (!showModal) {
      return;
    }

    setFormData((prev) => {
      const normalizedRole = prev.role?.toLowerCase() || '';
      const roleInAvailable = availableRoles.some((option) => option.value === prev.role);
      const roleIsRestricted = isRestrictedRole(normalizedRole);

      if (roleIsRestricted || roleInAvailable) {
        return prev;
      }

      const fallbackPool =
        modalContext === 'default' ? defaultRoleOptions : availableRoles;
      const fallbackRole = fallbackPool[0]?.value;

      if (!fallbackRole || fallbackRole === prev.role) {
        return prev;
      }

      return {
        ...prev,
        role: fallbackRole,
      };
    });
  }, [availableRoles, defaultRoleOptions, modalContext, showModal]);

  const requiresSecurityFields = useMemo(
    () => modalContext === 'security' && formData.role?.toLowerCase() === 'security',
    [modalContext, formData.role]
  );

  const requiresBuildingAdminFields = useMemo(
    () => modalContext === 'building_admin' || formData.role?.toLowerCase() === 'building_admin',
    [modalContext, formData.role]
  );

  const getRoleForContext = useCallback(
    (roleKey) => {
      if (roleKey) {
        const normalized = roleKey.toLowerCase();
        return (
          availableRoles.find((option) => option.value?.toLowerCase() === normalized)?.value ||
          roleKey
        );
      }

      return (
        defaultRoleOptions[0]?.value ||
        DEFAULT_ROLE_OPTIONS.find((option) => !isRestrictedRole(option.value))?.value ||
        DEFAULT_ROLE_OPTIONS[0].value
      );
    },
    [availableRoles, defaultRoleOptions]
  );

  const handleOpenModalForRole = useCallback(
    (roleKey) => {
      const normalizedKey = (roleKey || '').toLowerCase();
      let nextRole;
      let modalCtx = 'default';

      if (roleKey) {
        const isSecurity = normalizedKey === 'security';
        const isResident = normalizedKey === 'resident';
        const isBuildingAdmin = normalizedKey === 'building_admin' || normalizedKey === 'super_admin' || normalizedKey === 'building admin';
        
        if (isSecurity) {
          modalCtx = 'security';
          nextRole = 'security';
        } else if (isResident) {
          modalCtx = 'resident';
          nextRole = 'resident';
        } else if (isBuildingAdmin) {
          modalCtx = 'building_admin';
          nextRole = 'building_admin'; // Use building_admin as separate role
        } else {
          nextRole = getRoleForContext(roleKey);
        }
      } else {
        nextRole = getRoleForContext(roleKey);
      }

      setFormData(createInitialFormData(nextRole));
      setModalContext(modalCtx);
      setPhoneError('');
      setFieldErrors({});
      setSubmissionError('');
      setSubmissionMessage('');
      setShowModal(true);
    },
    [getRoleForContext]
  );

  const fetchBuildingOptions = useCallback(async () => {
    setIsLoadingBuildingOptions(true);
    setBuildingOptionsError('');
    try {
      const response = await api.getBuildings();
      let normalized = extractArray(response).map((item, index) => ({
        id: pickValue(item, ['_id', 'id', 'buildingId']) ?? `building-${index}`,
        name: toDisplayString(
          pickValue(item, ['name', 'buildingName', 'title']),
          'Unnamed Building'
        ),
        address: toDisplayString(
          pickValue(item, ['address.full', 'address', 'location', 'buildingAddress']),
          ''
        ),
      }));

      // Filter buildings to show only user's building if they're building admin
      // Check for various building admin role formats (BUILDING_ADMIN, building_admin, super_admin, etc.)
      const isBuildingAdmin = userRole && (
        userRole === 'building_admin' || 
        userRole === 'super_admin' || 
        userRole === 'build_admin' ||
        userRole === 'buildingadmin' ||
        userRole.includes('building') && userRole.includes('admin')
      );
      
      if (userBuildingId && isBuildingAdmin) {
        normalized = normalized.filter((building) => {
          // Compare building IDs as strings to handle different formats
          return String(building.id) === String(userBuildingId);
        });
        console.log('[AdminControl] Filtered buildings for building admin:', normalized.length, 'buildingId:', userBuildingId);
      }

      setBuildingOptions(normalized);
    } catch (err) {
      console.error('Failed to fetch buildings', err);
      setBuildingOptions([]);
      setBuildingOptionsError(err.message || 'Unable to load buildings');
    } finally {
      setIsLoadingBuildingOptions(false);
    }
  }, [userRole, userBuildingId]);

  useEffect(() => {
    if (!showModal) {
      return;
    }
    fetchBuildingOptions();
  }, [fetchBuildingOptions, showModal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionError('');
    setSubmissionMessage('');
    setFieldErrors({});

    const trimmedEmail = formData.email.trim();
    const name = formData.name.trim();
    const role = formData.role?.trim();
    const phoneNumber = formData.phoneNumber.trim();

    const nextFieldErrors = {};

    if (!name) {
      nextFieldErrors.name = 'Name is required.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextFieldErrors.email = 'Email is required.';
    } else if (!emailPattern.test(trimmedEmail)) {
      nextFieldErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      nextFieldErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      nextFieldErrors.password = 'Password must be at least 6 characters long.';
    }

    if (!formData.confirmPassword) {
      nextFieldErrors.confirmPassword = 'Please confirm the password.';
    } else if (formData.password !== formData.confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords must match.';
    }

    if (!role) {
      nextFieldErrors.role = 'Please select a role.';
    }

    if (!phoneNumber) {
      nextFieldErrors.phoneNumber = 'Phone number is required.';
    } else if (phoneError || !PHONE_REGEX.test(phoneNumber)) {
      nextFieldErrors.phoneNumber = phoneError || 'Phone number must be exactly 10 digits.';
    }

    if (requiresSecurityFields) {
      if (!formData.buildingId) {
        nextFieldErrors.buildingId = 'Please select a building.';
      }
      if (!formData.employeeCode.trim()) {
        nextFieldErrors.employeeCode = 'Employee code is required.';
      }
    }

    if (requiresBuildingAdminFields) {
      if (!formData.buildingId) {
        nextFieldErrors.buildingId = 'Please select a building.';
      }
      // Backend requires employeeCode for BUILDING_ADMIN role
      if (!formData.employeeCode.trim()) {
        nextFieldErrors.employeeCode = 'Employee code is required.';
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    // Map roles to backend-expected format
    // First, try to find the role in availableRoles (these come from backend, so they're valid)
    // If not found, use default mappings
    let backendRole = role?.trim() || '';
    const normalizedRole = backendRole.toLowerCase().replace(/\s+/g, '_');
    
    // Check if this role exists in availableRoles (from backend)
    const matchingRole = availableRoles.find(
      (option) => option.value?.toLowerCase().replace(/\s+/g, '_') === normalizedRole
    );
    
    if (matchingRole) {
      // Use the exact backend value from availableRoles
      backendRole = matchingRole.value;
    } else {
      // Map roles to backend format (for new roles not yet in backend)
      if (normalizedRole === 'building_admin' || normalizedRole === 'buildingadmin') {
        // User requirement: "use building admin is admin" - try 'admin'
        backendRole = 'admin';
      } else if (normalizedRole === 'admin') {
        backendRole = 'admin';
      } else if (normalizedRole === 'security') {
        backendRole = 'security';
      } else if (normalizedRole === 'resident') {
        backendRole = 'resident';
      } else if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
        backendRole = 'super_admin';
      } else {
        // Keep as lowercase with underscores
        backendRole = normalizedRole;
      }
    }
    
    console.log('[AdminControl] Role mapping:', { original: role, normalized: normalizedRole, backendRole, availableRoles: availableRoles.map(r => r.value) });

    const payload = {
      name,
      email: trimmedEmail,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      role: backendRole,
      phoneNumber,
    };

    // Only include fields that have values to avoid empty string validation errors
    if (formData.buildingId && formData.buildingId.trim()) {
      payload.buildingId = formData.buildingId.trim();
    }
    
    if (formData.buildingName && formData.buildingName.trim()) {
      payload.buildingName = formData.buildingName.trim();
    }
    
    if (formData.buildingAddress && formData.buildingAddress.trim()) {
      payload.buildingAddress = formData.buildingAddress.trim();
    }
    
    // Convert to numbers if they have values
    if (formData.securityGuards !== '' && formData.securityGuards !== null && formData.securityGuards !== undefined) {
      const guardsNum = Number(formData.securityGuards);
      if (!isNaN(guardsNum) && guardsNum >= 0) {
        payload.securityGuards = guardsNum;
      }
    }
    
    if (formData.employees !== '' && formData.employees !== null && formData.employees !== undefined) {
      const employeesNum = Number(formData.employees);
      if (!isNaN(employeesNum) && employeesNum >= 0) {
        payload.employees = employeesNum;
      }
    }

    // Include employeeCode for both security and building admin roles
    if ((requiresSecurityFields || requiresBuildingAdminFields) && formData.employeeCode && formData.employeeCode.trim()) {
      payload.employeeCode = formData.employeeCode.trim();
    }

    const submitAdmin = async () => {
      setIsSubmitting(true);
      try {
        console.log('Submitting admin payload:', payload);
        const response = await api.createAdmin(payload);
        console.log('Admin created successfully:', response);
        setSubmissionMessage('Admin created successfully.');
        setShowModal(false);
        setModalContext('default');
        setFormData(createInitialFormData(availableRoles[0]?.value || DEFAULT_ROLE_OPTIONS[0].value));
        setPhoneError('');
        await fetchAdmins();
      } catch (err) {
        console.error('Failed to create admin', err);
        console.error('Error details:', err.message, err);
        console.error('Payload sent:', payload);
        console.error('Response status:', err.status, err.statusText);
        
        // Use the error message which should already contain formatted validation errors
        const errorMessage = err.message || 'Unable to create admin';
        
        // Show error in UI
        setSubmissionError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    };

    submitAdmin();
  };

  const filteredAdmins = useMemo(() => {
    const query = searchTerm.toLowerCase();
    if (!query) return admins;
    return admins.filter((admin) =>
      admin.name.toLowerCase().includes(query) ||
      admin.building.toLowerCase().includes(query) ||
      admin.details.toLowerCase().includes(query)
    );
  }, [admins, searchTerm]);

  const sortedAdmins = useMemo(() => {
    const items = [...filteredAdmins];
    const coerceNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    switch (sortOption) {
      case 'name-desc':
        return items.sort((a, b) => b.name.localeCompare(a.name));
      case 'role-asc':
        return items.sort((a, b) => a.role.localeCompare(b.role));
      case 'guards-desc':
        return items.sort((a, b) => coerceNumber(b.securityGuards) - coerceNumber(a.securityGuards));
      case 'employees-desc':
        return items.sort((a, b) => coerceNumber(b.employees) - coerceNumber(a.employees));
      case 'name-asc':
      default:
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredAdmins, sortOption]);

  const resolvedPhoneError = phoneError || fieldErrors.phoneNumber;

  return (
    <div className="px-4 sm:px-6 lg:px-10 bg-white min-h-screen pt-16 lg:pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-10 gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">
          Admin Control
        </h1>

        {/* Right side icons */}
        <div className="flex items-center gap-5">
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

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex-1 min-w-[150px] relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 font-medium hover:bg-gray-50 transition"
            >
              <img src={filterIcon} alt="Sort admins" className="w-4 h-4 object-contain" />
              {selectedSortLabel}
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isSortMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 px-2 mb-1">Sort admins</p>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm ${
                        sortOption === option.value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="admin-sort"
                        checked={sortOption === option.value}
                        onChange={() => {
                          setSortOption(option.value);
                          setIsSortMenuOpen(false);
                        }}
                        className="text-[#b00020] focus:ring-[#b00020]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!sortedAdmins || sortedAdmins.length === 0) {
                return;
              }
              const rows = sortedAdmins.map((admin) => ({
                Name: admin.name || '',
                Email: admin.email || '',
                Role: admin.role || '',
                Building: admin.building || '',
                Phone: admin.phoneNumber || '',
                Guards: admin.securityGuards || '',
                Employees: admin.employees || '',
              }));
              downloadAsCsv('admins', rows);
            }}
            className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-1 px-4 py-2 border border-[#b00020] rounded-lg text-sm text-[#b00020] font-medium hover:bg-[#b00020]/10 transition"
          >
            <svg
              className="w-3.5 h-3.5 text-[#b00020]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 3a2 2 0 012-2h6a1 1 0 01.707.293l4 4A1 1 0 0116 7h-3a1 1 0 01-1-1V3H5v14h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H5a2 2 0 01-2-2V3z" />
              <path d="M11 11a1 1 0 10-2 0v1.586L8.293 12.88a1 1 0 00-1.414 1.415l3 3a1 1 0 001.414 0l3-3a1 1 0 10-1.414-1.415L11 12.586V11z" />
            </svg>
            <span>Download CSV</span>
          </button>
          <button
            onClick={() => handleOpenModalForRole('resident')}
            className="flex-1 min-w-[150px] flex items-center gap-2 px-4 py-2 border border-[#b00020] rounded-lg text-sm text-[#b00020] font-medium hover:bg-[#b00020]/10 transition justify-center"
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
            Add Resident
          </button>
          <button
            onClick={() => handleOpenModalForRole('security')}
            className="flex-1 min-w-[150px] flex items-center gap-2 px-4 py-2 border border-[#b00020] rounded-lg text-sm text-[#b00020] font-medium hover:bg-[#b00020]/10 transition justify-center"
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
            Add Security
          </button>
          <button
            onClick={() => handleOpenModalForRole('building_admin')}
            className="flex-1 min-w-[150px] flex items-center gap-2 px-4 py-2 border border-[#b00020] rounded-lg text-sm text-[#b00020] font-medium hover:bg-[#b00020]/10 transition justify-center"
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
            Add Building Admin
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

      {/* Admin cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingAdmins && (
          <div className="col-span-full text-center text-sm text-gray-500 py-6">
            Loading admins...
          </div>
        )}
        {!isLoadingAdmins && sortedAdmins.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-500 py-6">
            No admins found.
          </div>
        )}
        {!isLoadingAdmins && sortedAdmins.map((admin) => (
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

          <div className="mt-3 flex justify-start gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#b00020] text-white text-[10px]">
                SG
              </span>
              <span className="text-gray-700">
                Guards: {admin.securityGuards}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#b00020] text-white text-[10px]">
                E
              </span>
              <span className="text-gray-700">
                Employees: {admin.employees}
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
                <h3 className="font-semibold text-lg text-gray-800">
                  {MODAL_TITLES[modalContext] || 'Admin'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalContext('default');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submissionError && (
                <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md">
                  {submissionError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign Building</label>
                <select
                  name="buildingId"
                  value={formData.buildingId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020] bg-white"
                  disabled={isLoadingBuildingOptions}
                >
                  <option value="">{isLoadingBuildingOptions ? 'Loading buildings...' : 'Select building'}</option>
                  {buildingOptions.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                      {building.address ? ` · ${building.address}` : ''}
                    </option>
                  ))}
                </select>
                {buildingOptionsError && (
                  <p className="mt-1 text-xs text-red-600">{buildingOptionsError}</p>
                )}
                {fieldErrors.buildingId && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.buildingId}</p>
                )}
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
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  aria-invalid={Boolean(phoneError)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    resolvedPhoneError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-[#b00020]'
                  }`}
                />
                {resolvedPhoneError && (
                  <p className="mt-1 text-xs text-red-600">{resolvedPhoneError}</p>
                )}
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

              {modalContext === 'default' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020] bg-white"
                  >
                    {defaultRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.role && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-800">
                    {MODAL_TITLES[modalContext]}
                  </div>
                </div>
              )}

              {(requiresSecurityFields || requiresBuildingAdminFields) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Employee Code</label>
                    <input
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleInputChange}
                      placeholder="Enter employee code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b00020]"
                    />
                    {fieldErrors.employeeCode && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.employeeCode}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#b00020] text-white rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? 'Adding...' 
                    : modalContext === 'building_admin' 
                      ? 'Add Building Admin' 
                      : modalContext === 'security' 
                        ? 'Add Security' 
                        : modalContext === 'resident' 
                          ? 'Add Resident' 
                          : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
