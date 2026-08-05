import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Clock, FileText, X, DollarSign, CreditCard, ChevronLeft, ChevronRight, Wallet, Moon, Sun, ClipboardList } from "lucide-react";
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
    { name: "Interviews", icon: ClipboardList, path: "/admin/interviews" },
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
        isCollapsed ? "w-[76px]" : "w-[248px]"
      } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } transition-[width,transform] duration-200 ease-out lg:translate-x-0`}
    >
      <div className="relative h-full bg-[#0C0F17] flex flex-col justify-between overflow-hidden">
        {/* single, quiet accent — no glow blobs */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent" />

        <div className="relative flex-1 overflow-y-auto scrollbar-none">
          {/* Logo Section */}
          <div className={`flex items-center h-16 ${
            isCollapsed ? "justify-center px-3" : "justify-between px-5"
          }`}>
            <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "gap-2.5"}`}>
              <div className={`${isCollapsed ? "w-10 h-10" : "w-8 h-8"} relative rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 ring-1 ring-white/10`}>
                <img
                  src={logo}
                  alt="Taruna Technology"
                  className="h-full w-full object-cover"
                />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-[13.5px] font-semibold text-white leading-tight tracking-tight truncate">
                    Taruna Technology
                  </h1>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium truncate">
                    Admin Panel
                  </p>
                </div>
              )}
            </div>

            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-white transition-colors duration-150 flex-shrink-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px bg-white/[0.06] mx-5 mb-3" />

          {/* Navigation */}
          <nav className="px-3">
            
            <div className="space-y-0.5">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  
                  <Link
                    key={item.name}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={`group relative flex items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 ${
                      isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 h-9"
                    } ${isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                    }`}
                  >
                    {isActive && !isCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-full bg-indigo-400" />
                    )}
                    <item.icon
                      strokeWidth={1.75}
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
                        isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className={`text-[13.5px] font-medium truncate ${isActive ? "text-white" : ""}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
                
              })}
             
            </div>
          </nav>
          
        </div>

        {/* Footer controls */}
        <div className="relative p-3 space-y-2">
          
          <div className="h-px bg-white/[0.06] mb-1" />
          <button
            onClick={handleToggle}
            className={`hidden lg:flex w-full items-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 ${
              isCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-center h-9"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight strokeWidth={1.75} className="w-[18px] h-[18px]" /> : <ChevronLeft strokeWidth={1.75} className="w-[18px] h-[18px]" />}
          </button>
           
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className={`flex w-full items-center rounded-lg text-slate-300 transition-colors duration-150 hover:bg-white/[0.05] ${
              isCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-between px-2.5 h-9"
            }`}
          >
            <span className={`flex items-center ${isCollapsed ? "" : "gap-2.5"}`}>
              {isDark ? <Sun strokeWidth={1.75} className="h-[18px] w-[18px] text-amber-300" /> : <Moon strokeWidth={1.75} className="h-[18px] w-[18px] text-indigo-300" />}
              {!isCollapsed && <span className="text-[13.5px] font-medium">{isDark ? "Light theme" : "Dark theme"}</span>}
            </span>
            {!isCollapsed && (
              <span className={`h-[18px] w-8 rounded-full p-0.5 transition-colors ${isDark ? "bg-indigo-500" : "bg-slate-700"}`}>
                <span className={`block h-[14px] w-[14px] rounded-full bg-white transition-transform ${isDark ? "translate-x-[14px]" : "translate-x-0"}`} />
              </span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { width: 0; height: 0; }
        .scrollbar-none { scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Sidebar;
