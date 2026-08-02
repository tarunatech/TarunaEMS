import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Clock, FileText, X, DollarSign, CreditCard, ChevronLeft, ChevronRight, Wallet, Moon, Sun } from "lucide-react";
import logo from "../../../assets/logo.jpg";
import { useTheme } from "../../../hooks/useTheme";

const Sidebar = ({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const sidebarItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { name: "Employee Management", icon: Users, path: "/admin/employees" },
    { name: "Leave Management", icon: Calendar, path: "/admin/leaves" },
    { name: "Attendance", icon: Clock, path: "/admin/attendance" },
    { name: "Holiday Calendar", icon: Calendar, path: "/admin/holidays" },
    { name: "Department", icon: FileText, path: "/admin/department" },
    { name: "Task Management", icon: Calendar, path: "/admin/tasks" },
    { name: "Sales", icon: DollarSign, path: "/admin/sales" },
    { name: "Purchase Orders", icon: FileText, path: "/admin/purchase-orders" },
    { name: "Expense Tracker", icon: Wallet, path: "/admin/expense-tracker" },
    { name: "Payslips", icon: CreditCard, path: "/admin/payslips" },
  ];

  const handleToggle = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 transform ${
        isCollapsed ? "w-20" : "w-64"
      } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } transition-all duration-300 ease-in-out lg:translate-x-0`}
    >
      <div className="h-full bg-[#07172d] border-r border-white/10 flex flex-col justify-between shadow-2xl shadow-slate-950/25">
        <div className="flex-1 overflow-y-auto">
          {/* Logo Section */}
          <div className={`flex items-center h-16 border-b border-white/10 ${
            isCollapsed ? "justify-center px-3" : "justify-between px-4"
          }`}>
            <div className={`flex items-center min-w-0 ${isCollapsed ? "" : "space-x-3"}`}>
              {/* Logo Container - Fixed aspect ratio */}
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
                <img
                  src={logo}
                  alt="Taruna Technology Logo"
                  className="object-cover "
                />
              </div>

              {/* Text Container */}
              {!isCollapsed && (
                <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-base font-semibold text-white leading-tight tracking-tight">
                    Taruna Technology
                  </h1>
                  <p className="text-[10px] text-slate-400 leading-tight mt-1 uppercase tracking-widest font-medium">
                    Admin Panel
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleToggle}
              className={`hidden lg:flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-slate-700 transition-all duration-200 hover:bg-white/20 ${
                isCollapsed ? "absolute left-20 top-4 shadow-lg shadow-slate-950/20" : "ml-3"
              }`}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-white transition-colors duration-200 flex-shrink-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-5 px-3">
            <div className="space-y-1.5">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={`group relative flex items-center rounded-lg transition-all duration-200 ${
                      isCollapsed ? "justify-center p-3" : "space-x-3 px-3 py-2.5"
                    } ${isActive
                      ? "bg-indigo-500/18 text-white border border-indigo-300/20 shadow-sm shadow-indigo-950/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/10 hover:translate-x-0.5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-300 shadow-[0_0_10px_rgba(129,140,248,0.75)]" />
                    )}
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                        isActive ? "text-indigo-200" : "text-slate-500 group-hover:text-slate-200"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className={`font-semibold truncate text-sm ${isActive ? "text-white" : ""}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="border-t border-white/5 p-4">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className={`flex w-full items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white ${
              isCollapsed ? "justify-center p-3" : "justify-between px-3 py-2.5"
            }`}
          >
            <span className={`flex items-center ${isCollapsed ? "" : "space-x-3"}`}>
              {isDark ? <Sun className="h-5 w-5 text-amber-200" /> : <Moon className="h-5 w-5 text-indigo-200" />}
              {!isCollapsed && <span className="text-sm font-semibold">{isDark ? "Light Theme" : "Dark Theme"}</span>}
            </span>
            {!isCollapsed && (
              <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isDark ? "bg-indigo-500" : "bg-slate-600"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isDark ? "translate-x-4" : "translate-x-0"}`} />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
