import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../utils/api';
import { normalizeDepartment } from '../utils/departmentAccess';

const EmployeeContext = createContext(null);

const getInitialEmployeeData = () => {
  const storedDepartment = localStorage.getItem('userDepartment');
  const storedName = localStorage.getItem('userName');
  const storedEmail = localStorage.getItem('userEmail');
  const storedEmployeeId = localStorage.getItem('employeeId');
  
  if (storedDepartment || storedName || storedEmail) {
    return {
      personalInfo: {
        firstName: storedName?.split(' ')[0] || 'Unknown',
        lastName: storedName?.split(' ')[1] || 'User',
      },
      workInfo: {
        position: 'Employee',
        department: storedDepartment || 'N/A',
      },
      employeeId: storedEmployeeId || 'N/A',
      contactInfo: {
        personalEmail: storedEmail || 'user@company.com',
      },
    };
  }
  return null;
};

const getStoredDepartment = () => {
  return localStorage.getItem('userDepartment') || 
         sessionStorage.getItem('userDepartment') || 
         'N/A';
};

export const EmployeeProvider = ({ children }) => {
  const [employeeData, setEmployeeData] = useState(() => getInitialEmployeeData());
  const [department, setDepartment] = useState(() => getStoredDepartment());
  const [loading, setLoading] = useState(!getInitialEmployeeData());
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (hasFetchedRef.current) return;
      
      const hasInitialData = getInitialEmployeeData() !== null;
      if (!hasInitialData && !employeeData) {
        setLoading(true);
      }

      try {
        const response = await authAPI.getProfile();

        if (response.data.success) {
          const userData = response.data.data.user;
          const employeeDataFromAPI = response.data.data.employee;

          // Extract department name - handle various response formats
          // NEVER overwrite a valid department name with an ObjectId
          const storedDepartment = localStorage.getItem('userDepartment');
          let departmentValue = null;
          
          const apiDept = employeeDataFromAPI?.workInfo?.department;
          console.log('Context - API department data:', apiDept);
          
          if (apiDept) {
            if (typeof apiDept === 'object' && apiDept.name) {
              // Department is an object with a name property
              departmentValue = apiDept.name;
            } else if (typeof apiDept === 'string' && !apiDept.match(/^[a-f0-9]{24}$/i)) {
              // Department is a string but NOT an ObjectId (24 hex chars)
              departmentValue = apiDept;
            }
          }
          
          // If we couldn't extract a valid name from API, use stored value
          if (!departmentValue || departmentValue === 'N/A') {
            departmentValue = storedDepartment;
          }
          
          // Final fallback
          if (!departmentValue) {
            departmentValue = 'N/A';
          }
          
          const finalDepartmentValue = departmentValue;
          console.log('Context - Final department value:', finalDepartmentValue);

          const combinedData = {
            personalInfo: {
              firstName: employeeDataFromAPI?.personalInfo?.firstName || userData.name?.split(' ')[0] || 'Unknown',
              lastName: employeeDataFromAPI?.personalInfo?.lastName || userData.name?.split(' ')[1] || 'User',
            },
            workInfo: {
              position: employeeDataFromAPI?.workInfo?.position || 'Employee',
              department: finalDepartmentValue,
            },
            employeeId: userData.employeeId || employeeDataFromAPI?.employeeId || 'N/A',
            contactInfo: {
              personalEmail: userData.email || employeeDataFromAPI?.contactInfo?.personalEmail || localStorage.getItem("userEmail") || 'user@company.com',
            },
            user: userData,
          };

          if (finalDepartmentValue && finalDepartmentValue !== 'N/A') {
            setDepartment(finalDepartmentValue);
            localStorage.setItem('userDepartment', finalDepartmentValue);
          }
          
          setEmployeeData(combinedData);

          if (userData.name) localStorage.setItem('userName', userData.name);
          if (userData.email) localStorage.setItem('userEmail', userData.email);
          if (userData.employeeId) localStorage.setItem('employeeId', userData.employeeId);
        }
        
        hasFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching employee data:', error);
        if (!employeeData) {
          setEmployeeData({
            personalInfo: {
              firstName: localStorage.getItem('userName')?.split(' ')[0] || 'Unknown',
              lastName: localStorage.getItem('userName')?.split(' ')[1] || 'User',
            },
            workInfo: {
              position: 'Employee',
              department: localStorage.getItem('userDepartment') || 'N/A',
            },
            employeeId: localStorage.getItem('employeeId') || 'N/A',
            contactInfo: {
              personalEmail: localStorage.getItem("userEmail") || 'user@company.com',
            },
          });
        }
        hasFetchedRef.current = true;
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      fetchEmployeeData();
    }
  }, []);

  const getDepartmentValue = () => {
    if (department && department !== 'N/A') return department;
    if (employeeData?.workInfo?.department?.name) return employeeData.workInfo.department.name;
    if (employeeData?.workInfo?.department && typeof employeeData.workInfo.department === 'string') return employeeData.workInfo.department;
    return localStorage.getItem('userDepartment') || 'N/A';
  };

  const normalizedDepartment = normalizeDepartment(getDepartmentValue());

  const value = {
    employeeData,
    department: getDepartmentValue(),
    normalizedDepartment,
    loading,
    setEmployeeData,
    setDepartment,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export default EmployeeContext;
