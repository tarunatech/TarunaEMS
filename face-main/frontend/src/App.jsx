import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from "./pages/Common/login";
import ForgotPassword from './components/Common/ForgotPassword';
import ResetPassword from './components/Common/ResetPassword';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import EmployeeManagement from './pages/Admin/EmployeeManagement';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import { EmployeeProvider } from './context/EmployeeContext';
import './App.css';
import AdminLeaveManagement from './pages/Admin/AdminLeaveManagement';
import AdminTaskManagement from './pages/Admin/AdminTaskManagement';
import EmployeeLeaveRequests from './pages/Employee/EmployeeLeaveRequests';
import EmployeeTasks from './pages/Employee/EmployeeTasks';
import AdminAttendance from './pages/Admin/AdminAttendance';
import EmployeeAttendance from './pages/Employee/EmployeeAttendance';
import AdminFaceRegistration from './pages/Admin/AdminFaceRegistration';
import ContinuousFaceRegistration from './pages/Admin/ContinuousFaceRegistration';
import DepartmentManagementPage from './pages/Admin/DepartmentManagement';
import LeadManagement from './pages/Sales/LeadManagement';
import ProblemStatementPage from './pages/Employee/ProblemStatementPage';
import SalesPage from './pages/Employee/Sales';
import SalesPipelinePage from './pages/Employee/SalesPipelinePage';
import SalesMeetings from './pages/Employee/SalesMeetings';
import AdminSalesDashboard from './pages/Admin/AdminSalesDashboard';
import PurchaseOrders from './pages/Admin/PurchaseOrders';
import AdminPayslips from './pages/Admin/AdminPayslips';
import AdminProfile from './pages/Admin/AdminProfile';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminHolidayCalendar from './pages/Admin/AdminHolidayCalendar';
import EmployeeHolidayCalendar from './pages/Employee/EmployeeHolidayCalendar';
import EmployeeProfile from './pages/Employee/EmployeeProfile';
import EmployeeSettings from './pages/Employee/EmployeeSettings';
import DayBookEntry from './pages/Employee/DayBookEntry';
import ExpenseTracker from './pages/Admin/ExpenseTracker';
import EmployeeExpenses from './pages/Employee/EmployeeExpenses';
import HRInterviewSchedule from './pages/Employee/HRInterviewSchedule';
import AdminInterviews from './pages/Admin/AdminInterviews';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute role="admin">
              <EmployeeManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute role="admin">
              <AdminAttendance />
            </ProtectedRoute>
          } />
          <Route path="/admin/leaves" element={
            <ProtectedRoute role="admin">
              <AdminLeaveManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/holidays" element={
            <ProtectedRoute role="admin">
              <AdminHolidayCalendar />
            </ProtectedRoute>
          } />
          <Route path="/admin/department" element={
            <ProtectedRoute role="admin">
              <DepartmentManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/tasks" element={
            <ProtectedRoute role="admin">
              <AdminTaskManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/face-registration" element={
            <ProtectedRoute role="admin">
              <ContinuousFaceRegistration />
            </ProtectedRoute>
          } />
          <Route path="/admin/face-registration-legacy" element={
            <ProtectedRoute role="admin">
              <AdminFaceRegistration />
            </ProtectedRoute>
          } />
          <Route path="/admin/sales" element={
            <ProtectedRoute role="admin">
              <AdminSalesDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/purchase-orders" element={
            <ProtectedRoute role="admin">
              <PurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/expense-tracker" element={
            <ProtectedRoute role="admin">
              <ExpenseTracker />
            </ProtectedRoute>
          } />
          <Route path="/admin/payslips" element={
            <ProtectedRoute role="admin">
              <AdminPayslips />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute role="admin">
              <AdminProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute role="admin">
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/admin/interviews" element={
            <ProtectedRoute role="admin">
              <AdminInterviews />
            </ProtectedRoute>
          } />

          {/* Employee Routes - Wrapped with EmployeeProvider for persistent state */}
          <Route path="/employee/*" element={
            <EmployeeProvider>
              <Routes>
                <Route path="dashboard" element={
                  <ProtectedRoute role="employee">
                    <EmployeeDashboard />
                  </ProtectedRoute>
                } />
                <Route path="leaves" element={
                  <ProtectedRoute role="employee">
                    <EmployeeLeaveRequests />
                  </ProtectedRoute>
                } />
                <Route path="attendance" element={
                  <ProtectedRoute role="employee">
                    <EmployeeAttendance />
                  </ProtectedRoute>
                } />
                <Route path="expenses" element={
                  <ProtectedRoute role="employee">
                    <EmployeeExpenses />
                  </ProtectedRoute>
                } />
                <Route path="holidays" element={
                  <ProtectedRoute role="employee">
                    <EmployeeHolidayCalendar />
                  </ProtectedRoute>
                } />
                <Route path="tasks" element={
                  <ProtectedRoute role="employee">
                    <EmployeeTasks />
                  </ProtectedRoute>
                } />
                <Route path="leads" element={
                  <ProtectedRoute role="employee">
                    <LeadManagement />
                  </ProtectedRoute>
                } />
                <Route path="problems" element={
                  <ProtectedRoute role="employee">
                    <ProblemStatementPage />
                  </ProtectedRoute>
                } />
                <Route path="sales" element={
                  <ProtectedRoute role="employee">
                    <SalesPage />
                  </ProtectedRoute>
                } />
                <Route path="sales-pipeline" element={
                  <ProtectedRoute role="employee">
                    <SalesPipelinePage />
                  </ProtectedRoute>
                } />
                <Route path="sales-meetings" element={
                  <ProtectedRoute role="employee">
                    <SalesMeetings />
                  </ProtectedRoute>
                } />
                <Route path="hr-interviews" element={
                  <ProtectedRoute role="employee">
                    <HRInterviewSchedule />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute role="employee">
                    <EmployeeProfile />
                  </ProtectedRoute>
                } />
                <Route path="settings" element={
                  <ProtectedRoute role="employee">
                    <EmployeeSettings />
                  </ProtectedRoute>
                } />
                <Route path="daybook" element={
                  <ProtectedRoute role="employee">
                    <DayBookEntry />
                  </ProtectedRoute>
                } />
              </Routes>
            </EmployeeProvider>
          } />
        </Routes>
        <Toaster position="top-right" />
      </Router>
    </div>
  );
}

export default App;
