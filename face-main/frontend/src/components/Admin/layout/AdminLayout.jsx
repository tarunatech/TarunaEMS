import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Siderbar/Sidebar";
import Header from "../Header/Header";
import FloatingChatButton from "../main/FloatingChatButton";
import AdminChatbot from "../main/AdminChatbot";
import { useAuth } from "../../../hooks/useAuth";

const AdminLayout = ({ children }) => {
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
    { name: "Problem Statements", path: "/admin/problems" },
    { name: "Interviews", path: "/admin/interviews" },
  ];

  return (
    <div className="relative flex h-dvh min-h-dvh overflow-hidden bg-[#eef3f8] text-slate-900">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <Header
          sidebarItems={sidebarItems}
          location={location}
          setSidebarOpen={setSidebarOpen}
        />

        <main id="admin-main-scroll" className="admin-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <FloatingChatButton
        isAdmin={isAdmin}
        onClick={() => setIsChatOpen(true)}
      />

      <AdminChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isAdmin={isAdmin}
      />

      <style>{`
        .admin-main-scroll {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
