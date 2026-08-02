import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isModulePathAllowed, normalizeDepartment, COMMON_MODULE_KEYS, moduleKeyFromPath } from '../utils/departmentAccess';

const ProtectedRoute = ({ children, role, requiredRole }) => {
  const location = useLocation();
  const effectiveRole = role || requiredRole;
  
  const token = localStorage.getItem('token') || 
                sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken');
  
  const userRole = localStorage.getItem('userRole') || 
                   sessionStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Check role first before department-based access
  if (effectiveRole && userRole !== effectiveRole) {
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    } else {
      localStorage.clear();
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  // Department-based access control for employees
  // IMPORTANT: Only block access to pages if we have CLEAR evidence the user shouldn't access them
  // Default to allowing access to prevent race conditions during page load
  if (userRole === 'employee') {
    const moduleKey = moduleKeyFromPath(location.pathname);
    
    // Always allow common module paths and non-module paths (profile, settings, etc.)
    if (!moduleKey || COMMON_MODULE_KEYS.includes(moduleKey)) {
      return children;
    }
    
    // For department-specific paths, check if we have a valid department
    let department = localStorage.getItem('userDepartment') || 
                     sessionStorage.getItem('userDepartment');

    // Fallback to user object if direct storage is empty
    if (!department) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        department = storedUser?.department?.name || storedUser?.department;
      } catch (err) {
        department = '';
      }
    }

    // If no department is available yet, ALLOW navigation
    // This prevents premature redirects during initial load
    if (!department || department === 'N/A' || department === '') {
      return children;
    }

    // Only block if we have a valid department AND the path is clearly not allowed
    const normalizedDept = normalizeDepartment(department);
    if (!isModulePathAllowed(location.pathname, normalizedDept)) {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;