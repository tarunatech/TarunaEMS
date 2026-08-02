import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { User, LogOut, Shield, Clock } from "lucide-react";

const ProfileDropdown = ({ onLogout, userProfile, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'employee';
  const isAdmin = userRole === 'admin';

  const formatName = () => {
    if (userProfile?.name) return userProfile.name;
    if (userProfile?.personalInfo) {
      const { firstName, lastName } = userProfile.personalInfo;
      if (firstName && lastName) return `${firstName} ${lastName}`;
    }
    return localStorage.getItem('userName') || 'User';
  };

  const formatEmail = () => {
    return userProfile?.email || 
           userProfile?.contactInfo?.personalEmail ||
           localStorage.getItem('userEmail') || 
           '';
  };

  return (
    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-dropdown-in">
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dropdown-in {
          animation: dropdownIn 0.15s ease-out;
        }
      `}</style>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {formatName()}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {formatEmail()}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium capitalize">
                  {isAdmin ? 'Administrator' : 'Employee'}
                </span>
              </div>
              {userProfile?.employeeId && (
                <span className="text-xs text-slate-400">
                  ID: {userProfile.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="py-2">
        <Link
          to={isAdmin ? '/admin/profile' : '/employee/profile'}
          onClick={onClose}
          className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
        >
          <User className="w-4 h-4 mr-3" />
          {isAdmin ? 'Profile Settings' : 'Profile Information'}
        </Link>

        {isAdmin && (
          <Link
            to="/admin/employees"
            onClick={onClose}
            className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
          >
            <User className="w-4 h-4 mr-3" />
            Manage Employees
          </Link>
        )}

        {!isAdmin && (
          <Link
            to="/employee/attendance"
            onClick={onClose}
            className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
          >
            <Clock className="w-4 h-4 mr-3" />
            My Attendance
          </Link>
        )}

        <hr className="my-2 border-slate-200" />

        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;