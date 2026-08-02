import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Award, Clock, Building2, DollarSign, FileText, UserCheck } from 'lucide-react';

const QuickActions = ({ userRole = 'admin' }) => {
  const navigate = useNavigate();

  const adminActions = [
    {
      icon: Users,
      label: 'Manage Employees',
      href: '/admin/employees',
      color: 'neon-pink',
      description: 'Add, edit, or remove employees'
    },
    {
      icon: Calendar,
      label: 'Leave Management',
      href: '/admin/leaves',
      color: 'neon-purple',
      description: 'Review and approve leave requests'
    },
    {
      icon: Award,
      label: 'Task Management',
      href: '/admin/tasks',
      color: 'neon-pink',
      description: 'Assign and track tasks'
    },
    {
      icon: Building2,
      label: 'Departments',
      href: '/admin/department',
      color: 'neon-purple',
      description: 'Manage company departments'
    },
    {
      icon: Clock,
      label: 'Attendance',
      href: '/admin/attendance',
      color: 'neon-pink',
      description: 'Monitor employee attendance'
    },
    {
      icon: DollarSign,
      label: 'Sales Dashboard',
      href: '/admin/sales',
      color: 'neon-pink',
      description: 'View sales performance'
    },
    {
      icon: FileText,
      label: 'Purchase Orders',
      href: '/admin/purchase-orders',
      color: 'neon-purple',
      description: 'Manage purchase orders'
    }
  ];

  const employeeActions = [
    {
      icon: Clock,
      label: 'Check In/Out',
      href: '/employee/attendance',
      color: 'neon-pink',
      description: 'Mark your attendance'
    },
    {
      icon: Calendar,
      label: 'Apply for Leave',
      href: '/employee/leaves',
      color: 'neon-purple',
      description: 'Submit leave applications'
    },
    {
      icon: Award,
      label: 'My Tasks',
      href: '/employee/tasks',
      color: 'neon-pink',
      description: 'View assigned tasks'
    },
    {
      icon: DollarSign,
      label: 'Sales',
      href: '/employee/sales',
      color: 'neon-purple',
      description: 'View your sales'
    }
  ];

  const actions = userRole === 'admin' ? adminActions : employeeActions;
  const visibleActions = actions.slice(0, userRole === 'admin' ? 8 : 4);
  const actionAccents = [
    'text-indigo-600 bg-indigo-50 border-indigo-100',
    'text-emerald-600 bg-emerald-50 border-emerald-100',
    'text-amber-600 bg-amber-50 border-amber-100',
    'text-pink-600 bg-pink-50 border-pink-100'
  ];

  const handleActionClick = (href) => {
    navigate(href);
  };

  return (
    <div className="admin-quick-actions bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-950">Quick Actions</h2>
        {userRole === 'admin' && (
          <span className="admin-quick-actions-badge text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            Admin Panel
          </span>
        )}
      </div>
      
      <div className={`grid gap-4 ${
        userRole === 'admin' 
          ? 'grid-cols-2 md:grid-cols-4' 
          : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {visibleActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleActionClick(action.href)}
            className="admin-quick-action-card p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/60 transition-all duration-300 group relative overflow-hidden bg-white shadow-sm hover:shadow-md"
            title={action.description}
          >
            <div className="admin-quick-action-sheen absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border ${actionAccents[index % actionAccents.length]} transition-all duration-300 group-hover:scale-110`}>
                <action.icon className="w-5 h-5" />
              </div>
              <p className="admin-quick-action-label text-sm text-slate-600 group-hover:text-slate-900 transition-colors duration-300 leading-tight">
                {action.label}
              </p>
            </div>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
              {action.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
