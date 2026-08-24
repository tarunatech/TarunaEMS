import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Award, Clock, Building2, DollarSign, FileText } from 'lucide-react';

const QuickActions = ({ userRole = 'admin' }) => {
  const navigate = useNavigate();

  const adminActions = [
    {
      icon: Users,
      label: 'Manage Employees',
      href: '/admin/employees',
      description: 'Add, edit, or remove employees'
    },
    {
      icon: Calendar,
      label: 'Leave Requests',
      href: '/admin/leaves',
      description: 'Review and approve leave requests'
    },
    {
      icon: Award,
      label: 'Task Management',
      href: '/admin/tasks',
      description: 'Assign and track tasks'
    },
    {
      icon: Building2,
      label: 'Departments',
      href: '/admin/department',
      description: 'Manage company departments'
    },
    {
      icon: Clock,
      label: 'Attendance',
      href: '/admin/attendance',
      description: 'Monitor employee attendance'
    },
    {
      icon: DollarSign,
      label: 'Sales Dashboard',
      href: '/admin/sales',
      description: 'View sales performance'
    },
    {
      icon: FileText,
      label: 'Purchase Orders',
      href: '/admin/purchase-orders',
      description: 'Manage purchase orders'
    }
  ];

  const employeeActions = [
    {
      icon: Clock,
      label: 'Check In/Out',
      href: '/employee/attendance',
      description: 'Mark your attendance'
    },
    {
      icon: Calendar,
      label: 'Apply for Leave',
      href: '/employee/leaves',
      description: 'Submit leave applications'
    },
    {
      icon: Award,
      label: 'My Tasks',
      href: '/employee/tasks',
      description: 'View assigned tasks'
    },
    {
      icon: DollarSign,
      label: 'Sales',
      href: '/employee/sales',
      description: 'View your sales'
    }
  ];

  const actions = userRole === 'admin' ? adminActions : employeeActions;
  const visibleActions = actions.slice(0, userRole === 'admin' ? 8 : 4);
  
  const actionAccents = [
    'text-indigo-600 bg-indigo-50 border-indigo-100',
    'text-emerald-600 bg-emerald-50 border-emerald-100',
    'text-amber-600 bg-amber-50 border-amber-100',
    'text-pink-600 bg-pink-50 border-pink-100',
    'text-cyan-600 bg-cyan-50 border-cyan-100',
    'text-violet-600 bg-violet-50 border-violet-100',
    'text-rose-600 bg-rose-50 border-rose-100'
  ];

  const handleActionClick = (href) => {
    navigate(href);
  };

  return (
    <div className="admin-quick-actions bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">Quick Actions</h2>
        {userRole === 'admin' && (
          <span className="admin-quick-actions-badge text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            Admin Shortcuts
          </span>
        )}
      </div>
      
      <div className={`grid gap-2 sm:gap-2.5 ${
        userRole === 'admin' 
          ? 'grid-cols-2 sm:grid-cols-4' 
          : 'grid-cols-2 sm:grid-cols-4'
      }`}>
        {visibleActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleActionClick(action.href)}
            className="admin-quick-action-card flex items-center gap-2.5 p-2 sm:p-2.5 rounded-lg border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200 group text-left bg-white"
            title={action.description}
          >
            <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${actionAccents[index % actionAccents.length]} transition-transform duration-200 group-hover:scale-105`}>
              <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="admin-quick-action-label text-xs sm:text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                {action.label}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
