import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Siderbar/Sidebar";
import Header from "../Header/Header";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const location = useLocation();

  const sidebarItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Employee Management", path: "/admin/employees" },
    { name: "Leave Management", path: "/admin/leaves" },
    { name: "Attendance", path: "/admin/attendance" },
    { name: "Holiday Calendar", path: "/admin/holidays" },
    { name: "Department", path: "/admin/department" },
    { name: "Task Management", path: "/admin/tasks" },
  ];

  return (
    <div className="min-h-screen flex bg-[#eef3f8] relative text-slate-900">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <Header
          sidebarItems={sidebarItems}
          location={location}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="p-4 sm:p-6 pt-16 lg:pt-6 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;
