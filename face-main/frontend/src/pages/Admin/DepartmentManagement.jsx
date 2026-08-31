import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Building,
  X,
  CheckCircle,
  Eye,
  DollarSign,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const ModalShell = ({ title, onClose, children, className = '' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
    <div className="fixed inset-0 bg-slate-900/30" onClick={onClose} />
    <div className={`premium-panel relative flex max-h-[70dvh] sm:max-h-[90vh] w-[calc(100vw-1rem)] max-w-sm flex-col overflow-hidden rounded-xl sm:w-full sm:max-w-4xl sm:rounded-2xl ${className}`}>
      <style>{`
        .department-modal-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .department-modal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:mb-6 sm:border-b-0 sm:bg-transparent sm:p-6 sm:pb-0">
        <h2 className="min-w-0 truncate text-base font-bold text-slate-900 sm:text-2xl">{title}</h2>
        <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-slate-900">
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
      <div className="department-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 sm:pt-0">
        {children}
      </div>
    </div>
  </div>
);

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [loadingDepartmentEmployees, setLoadingDepartmentEmployees] = useState(false);

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    code: '',
    description: '',
    manager: '',
    location: '',
    budget: 0,
    status: 'Active',
    establishedDate: new Date().toISOString().split('T')[0],
    goals: [],
  });

  const statusOptions = ['Active', 'Inactive', 'Restructuring'];

  const fetchDepartments = async ({ showPageLoader = true } = {}) => {
    try {
      if (showPageLoader) setLoading(true);
      const response = await departmentAPI.getDepartments();
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      if (showPageLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter((dept) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(searchLower) ||
      dept.code.toLowerCase().includes(searchLower) ||
      dept.manager?.toLowerCase().includes(searchLower) ||
      dept.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateDepartment = async (e) => {
    e.preventDefault();

    if (!newDepartment.name || !newDepartment.code) {
      toast.error('Department name and code are required');
      return;
    }

    try {
      setCreatingDepartment(true);
      const response = await departmentAPI.createDepartment(newDepartment);
      if (response.data.success) {
        await fetchDepartments({ showPageLoader: false });
        resetForm();
        setShowAddModal(false);
        toast.success('Department created successfully!');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setCreatingDepartment(false);
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();

    try {
      const response = await departmentAPI.updateDepartment(
        selectedDepartment._id,
        selectedDepartment
      );
      if (response.data.success) {
        await fetchDepartments();
        setShowEditModal(false);
        setSelectedDepartment(null);
        toast.success('Department updated successfully!');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.response?.data?.message || 'Failed to update department');
    }
  };

  const handleDeleteDepartment = async (id) => {
    const department = departments.find((d) => d._id === id);

    if (department?.employeeCount > 0) {
      toast.error('Cannot delete department with employees. Please reassign employees first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the ${department?.name} department?`)) {
      try {
        const response = await departmentAPI.deleteDepartment(id);
        if (response.data.success) {
          await fetchDepartments();
          toast.success('Department deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error(error.response?.data?.message || 'Failed to delete department');
      }
    }
  };

  const resetForm = () => {
    setNewDepartment({
      name: '',
      code: '',
      description: '',
      manager: '',
      location: '',
      budget: 0,
      status: 'Active',
      establishedDate: new Date().toISOString().split('T')[0],
      goals: [],
    });
  };

  const addGoal = () => {
    if (newDepartment.goals.length < 5) {
      setNewDepartment({
        ...newDepartment,
        goals: [...newDepartment.goals, ''],
      });
    }
  };

  const updateGoal = (index, value) => {
    const updatedGoals = [...newDepartment.goals];
    updatedGoals[index] = value;
    setNewDepartment({
      ...newDepartment,
      goals: updatedGoals,
    });
  };

  const removeGoal = (index) => {
    const updatedGoals = newDepartment.goals.filter((_, i) => i !== index);
    setNewDepartment({
      ...newDepartment,
      goals: updatedGoals,
    });
  };

  const getEmployeeName = (employee) => {
    const firstName = employee?.personalInfo?.firstName || '';
    const lastName = employee?.personalInfo?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || employee?.user?.name || 'Unnamed Employee';
  };

  const openViewModal = async (department) => {
    setSelectedDepartment(department);
    setShowViewModal(true);
    setDepartmentEmployees([]);
    setLoadingDepartmentEmployees(true);

    try {
      const response = await departmentAPI.getDepartmentEmployees(department._id);
      if (response.data.success) {
        setDepartmentEmployees(response.data.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching department employees:', error);
      toast.error('Failed to fetch department employees');
    } finally {
      setLoadingDepartmentEmployees(false);
    }
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openDepartmentDetails = (event, department) => {
    if (isInteractiveClick(event)) return;
    openViewModal(department);
  };

  const fieldClass =
    'premium-input w-full rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 sm:rounded-xl sm:px-4 sm:py-3 sm:text-base';

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-xl text-slate-700">Loading departments...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page-shell w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 text-slate-900">
        <div className="flex flex-col justify-between gap-3 sm:gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="premium-page-title text-xl font-bold sm:text-2xl">Department Management</h1>
            <p className="text-sm text-slate-500 sm:text-base">
              Manage company departments and organizational structure
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="premium-primary-button flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 sm:px-6 sm:py-3"
          >
            <Plus className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Add Department
          </button>
        </div>

        <div className="premium-panel rounded-2xl p-4 sm:p-6">
          <SearchWithSuggestions
            value={searchTerm}
            onChange={setSearchTerm}
            items={departments}
            getSuggestionValue={(dept) => dept.name || dept.code || dept.manager || ''}
            getSuggestionTitle={(dept) => dept.name || 'Department'}
            getSuggestionSubtitle={(dept) => [dept.code, dept.manager, dept.description].filter(Boolean).join(' • ')}
            placeholder="Search departments..."
            inputClassName="premium-input rounded-xl py-2 text-slate-900 sm:py-3"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <div className="premium-stat-card rounded-2xl p-3 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(99,102,241,0.10)', '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">{departments.length}</h3>
                <p className="text-xs text-slate-500 sm:text-sm">Total Departments</p>
              </div>
              <div className="premium-icon flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 md:h-12 md:w-12">
                <Building className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-3 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(16,185,129,0.10)', '--icon-gradient': 'linear-gradient(135deg,#10b981,#0d9488)', '--icon-shadow': '0 12px 24px rgba(16,185,129,0.25)' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
                  {departments.filter((d) => d.status === 'Active').length}
                </h3>
                <p className="text-xs text-slate-500 sm:text-sm">Active</p>
              </div>
              <div className="premium-icon flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 md:h-12 md:w-12">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-3 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(245,158,11,0.10)', '--icon-gradient': 'linear-gradient(135deg,#f59e0b,#ea580c)', '--icon-shadow': '0 12px 24px rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
                  {departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0)}
                </h3>
                <p className="text-xs text-slate-500 sm:text-sm">Total Employees</p>
              </div>
              <div className="premium-icon flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 md:h-12 md:w-12">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-3 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(236,72,153,0.10)', '--icon-gradient': 'linear-gradient(135deg,#ec4899,#e11d48)', '--icon-shadow': '0 12px 24px rgba(236,72,153,0.25)' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
                  {departments.reduce((sum, dept) => sum + (dept.budget || 0), 0).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-500 sm:text-sm">Total Budget</p>
              </div>
              <div className="premium-icon flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 md:h-12 md:w-12">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl md:premium-panel">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Department</th>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Manager</th>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Employees</th>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Status</th>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Budget</th>
                  <th className="p-4 text-left font-medium text-slate-500 sm:p-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => (
                  <tr key={department._id} onClick={(event) => openDepartmentDetails(event, department)} className="premium-table-row border-b border-slate-100 cursor-pointer">
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 sm:h-10 sm:w-10">
                          <Building className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{department.name}</p>
                          <p className="text-sm text-slate-500">{department.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 sm:p-6">{department.manager || 'Not assigned'}</td>
                    <td className="p-4 text-slate-700 sm:p-6">{department.employeeCount || 0}</td>
                    <td className="p-4 sm:p-6">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${department.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : department.status === 'Inactive'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {department.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 sm:p-6">
                      {department.budget ? `₹${department.budget.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openViewModal(department)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDepartment(department);
                            setShowEditModal(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department._id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="scrollbar-hide md:hidden max-h-[68dvh] overflow-y-auto overscroll-contain p-0 w-full max-w-full overflow-x-hidden">
            <div className="grid gap-2.5 w-full max-w-full">
              {filteredDepartments.map((department) => (
                <div
                  key={department._id}
                  onClick={(event) => openDepartmentDetails(event, department)}
                  className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 active:bg-indigo-50/60"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                        <Building className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{department.name}</p>
                        <p className="text-xs text-slate-500">{department.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => openViewModal(department)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="View Details"
                        aria-label={`View ${department.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDepartment(department);
                          setShowEditModal(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                        aria-label={`Edit ${department.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(department._id)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                        aria-label={`Delete ${department.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-500 shrink-0">Manager</span>
                      <span className="truncate text-right font-medium text-slate-800 min-w-0">{department.manager || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-500 shrink-0">Employees</span>
                      <span className="font-medium text-slate-800 shrink-0">{department.employeeCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-500 shrink-0">Status</span>
                      <span
                        className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none ${department.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : department.status === 'Inactive'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {department.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-500 shrink-0">Budget</span>
                      <span className="truncate text-right font-medium text-slate-800 min-w-0">
                        {department.budget ? `₹${department.budget.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredDepartments.length === 0 && (
            <div className="p-8 text-center sm:p-12">
              <Building className="mx-auto mb-4 h-10 w-10 text-slate-400 sm:h-12 sm:w-12" />
              <h3 className="mb-2 text-base font-medium text-slate-600 sm:text-lg">No departments found</h3>
              <p className="text-sm text-slate-500 sm:text-base">
                {searchTerm ? 'Try adjusting your search term' : 'Start by adding your first department'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <ModalShell
          title="Add New Department"
          onClose={() => {
            resetForm();
            setShowAddModal(false);
          }}
        >
          <form onSubmit={handleCreateDepartment} className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="border-b border-slate-200 pb-1.5 text-sm font-bold text-slate-900 sm:pb-2 sm:text-lg">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    value={newDepartment.code}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className={fieldClass}
                    placeholder="e.g., ENG, HR, MKT"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">Description</label>
                  <textarea
                    value={newDepartment.description}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className={fieldClass}
                    placeholder="Brief description of the department..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">
                    Department Manager
                  </label>
                  <input
                    type="text"
                    value={newDepartment.manager}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        manager: e.target.value,
                      }))
                    }
                    className={fieldClass}
                    placeholder="Manager name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">Location</label>
                  <input
                    type="text"
                    value={newDepartment.location}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    className={fieldClass}
                    placeholder="Office location"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">Budget</label>
                  <input
                    type="number"
                    value={newDepartment.budget}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        budget: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={fieldClass}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">Status</label>
                  <select
                    value={newDepartment.status}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className={fieldClass}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 sm:mb-2 sm:text-sm">
                    Established Date
                  </label>
                  <input
                    type="date"
                    value={newDepartment.establishedDate}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        establishedDate: e.target.value,
                      }))
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="border-b border-slate-200 pb-1.5 text-sm font-bold text-slate-900 sm:pb-2 sm:text-lg">
                  Department Goals
                </h3>
                <button
                  type="button"
                  onClick={addGoal}
                  className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100 sm:px-3 sm:text-sm"
                  disabled={newDepartment.goals.length >= 5}
                >
                  Add Goal
                </button>
              </div>
              {newDepartment.goals.map((goal, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    className="premium-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-slate-900 sm:rounded-xl sm:px-4 sm:text-base"
                    placeholder={`Goal ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 sm:space-x-4 sm:pt-6">
              <button
                type="button"
                disabled={creatingDepartment}
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:px-6 sm:py-3 sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingDepartment}
                className="premium-primary-button rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:opacity-60 sm:px-6 sm:py-3 sm:text-base"
              >
                {creatingDepartment ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showEditModal && (
        <ModalShell title="Edit Department" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditDepartment} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={selectedDepartment?.name || ''}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Department Code *
                </label>
                <input
                  type="text"
                  value={selectedDepartment?.code || ''}
                  onChange={(e) =>
                    setSelectedDepartment({ ...selectedDepartment, code: e.target.value.toUpperCase() })
                  }
                  className={fieldClass}
                  maxLength={5}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="premium-primary-button rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                Update Department
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showViewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setShowViewModal(false)} />
          <div className="premium-panel relative flex max-h-[65dvh] sm:max-h-[90vh] w-[calc(100vw-1rem)] max-w-sm flex-col overflow-hidden rounded-xl sm:w-full sm:max-w-4xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:mb-6 sm:border-b-0 sm:bg-transparent sm:p-6 sm:pb-0">
              <h2 className="min-w-0 truncate text-base font-bold text-slate-900 sm:text-2xl">Department Details</h2>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-all duration-200 hover:border-blue-200 hover:bg-blue-100 hover:text-blue-800 sm:px-3 sm:text-sm"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button onClick={() => setShowViewModal(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            {selectedDepartment && (
              <div className="department-modal-scroll max-h-[calc(65dvh-3rem)] space-y-2.5 overflow-y-auto overscroll-contain p-2.5 sm:max-h-none sm:space-y-6 sm:overflow-visible sm:p-6 sm:pt-0">
                <div className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:space-x-4 sm:p-4">
                  <div className="premium-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-16 sm:w-16" style={{ '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
                    <Building className="h-5 w-5 sm:h-8 sm:w-8" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900 sm:text-xl">{selectedDepartment.name}</h3>
                    <p className="text-sm text-blue-600 sm:text-base">{selectedDepartment.code}</p>
                    <p className="break-words text-xs text-slate-500 sm:text-base">{selectedDepartment.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                  <div className="space-y-2 sm:space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 sm:text-lg">Information</h4>
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 sm:block sm:bg-transparent sm:p-0 sm:text-base">
                        <span className="text-slate-900">Manager:</span>
                        <span className="min-w-0 break-words">
                          {selectedDepartment.manager || 'Not assigned'}
                        </span>
                      </p>
                      <p className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 sm:block sm:bg-transparent sm:p-0 sm:text-base">
                        <span className="text-slate-900">Location:</span>
                        <span className="min-w-0 break-words">
                          {selectedDepartment.location || 'Not specified'}
                        </span>
                      </p>
                      <p className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 sm:block sm:bg-transparent sm:p-0 sm:text-base">
                        <span className="text-slate-900">Status:</span>
                        <span
                          className={`w-fit rounded-full px-2 py-1 text-xs sm:ml-2 ${selectedDepartment.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : selectedDepartment.status === 'Inactive'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}
                        >
                          {selectedDepartment.status}
                        </span>
                      </p>
                      <p className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 sm:block sm:bg-transparent sm:p-0 sm:text-base">
                        <span className="text-slate-900">Employees:</span>
                        <span>
                          {selectedDepartment.employeeCount || 0}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 sm:text-lg">Goals</h4>
                    {selectedDepartment.goals && selectedDepartment.goals.length > 0 ? (
                      <ul className="space-y-1.5 sm:space-y-2">
                        {selectedDepartment.goals.map((goal, index) => (
                          <li key={index} className="flex items-start space-x-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 sm:bg-transparent sm:p-0 sm:text-base">
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600 sm:mt-1 sm:h-4 sm:w-4" />
                            <span className="break-words">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 sm:text-base">No goals set</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900 sm:text-lg">Employees</h4>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {departmentEmployees.length || selectedDepartment.employeeCount || 0} employee{(departmentEmployees.length || selectedDepartment.employeeCount || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {loadingDepartmentEmployees ? (
                    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading employees...
                    </div>
                  ) : departmentEmployees.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="hidden bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1.2fr_0.8fr_1fr_0.7fr]">
                        <div className="px-4 py-3">Employee</div>
                        <div className="px-4 py-3">Employee ID</div>
                        <div className="px-4 py-3">Position</div>
                        <div className="px-4 py-3">Status</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {departmentEmployees.map((employee) => (
                          <div key={employee._id || employee.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1.2fr_0.8fr_1fr_0.7fr] sm:items-center">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{getEmployeeName(employee)}</p>
                              <p className="truncate text-xs text-slate-500">{employee.user?.email || employee.contactInfo?.personalEmail || 'No email'}</p>
                            </div>
                            <div className="text-slate-700">
                              <span className="text-xs text-slate-500 sm:hidden">ID: </span>
                              {employee.employeeId || employee.user?.employeeId || '-'}
                            </div>
                            <div className="text-slate-700">
                              <span className="text-xs text-slate-500 sm:hidden">Position: </span>
                              {employee.workInfo?.position || 'Not specified'}
                            </div>
                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${employee.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : employee.status === 'Inactive'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                                }`}>
                                {employee.status || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No employees assigned to this department.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DepartmentManagement;
