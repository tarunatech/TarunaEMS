import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Building,
  X,
  CheckCircle,
  Eye,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

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

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentAPI.getDepartments();
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
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
      const response = await departmentAPI.createDepartment(newDepartment);
      if (response.data.success) {
        await fetchDepartments();
        resetForm();
        setShowAddModal(false);
        toast.success('Department created successfully!');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
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

  const ModalShell = ({ title, onClose, children, className = '' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className={`premium-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const fieldClass =
    'premium-input w-full rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400';

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
      <div className="admin-page-shell space-y-6 text-slate-900">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-input w-full rounded-xl py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 sm:py-3"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-4">
          <div className="premium-stat-card rounded-2xl p-4 sm:p-6" style={{ '--stat-soft': 'rgba(99,102,241,0.10)', '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{departments.length}</h3>
                <p className="text-sm text-slate-500 sm:text-base">Total Departments</p>
              </div>
              <div className="premium-icon flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12">
                <Building className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-4 sm:p-6" style={{ '--stat-soft': 'rgba(16,185,129,0.10)', '--icon-gradient': 'linear-gradient(135deg,#10b981,#0d9488)', '--icon-shadow': '0 12px 24px rgba(16,185,129,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {departments.filter((d) => d.status === 'Active').length}
                </h3>
                <p className="text-sm text-slate-500 sm:text-base">Active</p>
              </div>
              <div className="premium-icon flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-4 sm:p-6" style={{ '--stat-soft': 'rgba(245,158,11,0.10)', '--icon-gradient': 'linear-gradient(135deg,#f59e0b,#ea580c)', '--icon-shadow': '0 12px 24px rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0)}
                </h3>
                <p className="text-sm text-slate-500 sm:text-base">Total Employees</p>
              </div>
              <div className="premium-icon flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-4 sm:p-6" style={{ '--stat-soft': 'rgba(236,72,153,0.10)', '--icon-gradient': 'linear-gradient(135deg,#ec4899,#e11d48)', '--icon-shadow': '0 12px 24px rgba(236,72,153,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {departments.reduce((sum, dept) => sum + (dept.budget || 0), 0).toLocaleString()}
                </h3>
                <p className="text-sm text-slate-500 sm:text-base">Total Budget</p>
              </div>
              <div className="premium-icon flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="premium-panel overflow-hidden rounded-2xl">
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
                  <tr key={department._id} className="premium-table-row border-b border-slate-100">
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
                        className={`rounded-full px-3 py-1 text-xs ${
                          department.status === 'Active'
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
                          onClick={() => {
                            setSelectedDepartment(department);
                            setShowViewModal(true);
                          }}
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

          <div className="md:hidden">
            {filteredDepartments.map((department) => (
              <div
                key={department._id}
                className="border-b border-slate-100 p-4 transition-all duration-200 hover:bg-indigo-50/60"
              >
                <div className="mb-3 flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{department.name}</p>
                    <p className="text-sm text-slate-500">{department.code}</p>
                  </div>
                </div>
                <div className="mb-3 space-y-2">
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-900">Manager:</span> {department.manager || 'Not assigned'}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-900">Employees:</span> {department.employeeCount || 0}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-900">Status:</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs ${
                        department.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : department.status === 'Inactive'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {department.status}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-900">Budget:</span>{' '}
                    {department.budget ? `₹${department.budget.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDepartment(department);
                      setShowViewModal(true);
                    }}
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
              </div>
            ))}
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
          <form onSubmit={handleCreateDepartment} className="space-y-6">
            <div className="space-y-4">
              <h3 className="border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    defaultValue={newDepartment.name}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({ ...prev, name: e.target.value }))
                    }
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
                    defaultValue={newDepartment.code}
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
                  <label className="mb-2 block text-sm font-medium text-slate-600">Description</label>
                  <textarea
                    defaultValue={newDepartment.description}
                    onChange={(e) =>
                      setNewDepartment((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className={fieldClass}
                    placeholder="Brief description of the department..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Department Manager
                  </label>
                  <input
                    type="text"
                    defaultValue={newDepartment.manager}
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
                  <label className="mb-2 block text-sm font-medium text-slate-600">Location</label>
                  <input
                    type="text"
                    defaultValue={newDepartment.location}
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
                  <label className="mb-2 block text-sm font-medium text-slate-600">Budget</label>
                  <input
                    type="number"
                    defaultValue={newDepartment.budget}
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
                  <label className="mb-2 block text-sm font-medium text-slate-600">Status</label>
                  <select
                    defaultValue={newDepartment.status}
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
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Established Date
                  </label>
                  <input
                    type="date"
                    defaultValue={newDepartment.establishedDate}
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
                  Department Goals
                </h3>
                <button
                  type="button"
                  onClick={addGoal}
                  className="rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                  disabled={newDepartment.goals.length >= 5}
                >
                  Add Goal
                </button>
              </div>
              {newDepartment.goals.map((goal, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    defaultValue={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    className="premium-input flex-1 rounded-xl px-4 py-2 text-slate-900"
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

            <div className="flex justify-end space-x-4 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
                className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="premium-primary-button rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                Create Department
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
                className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setShowViewModal(false)} />
          <div className="premium-panel relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Department Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedDepartment && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="premium-icon flex h-16 w-16 items-center justify-center rounded-full" style={{ '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
                    <Building className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedDepartment.name}</h3>
                    <p className="text-blue-600">{selectedDepartment.code}</p>
                    <p className="text-slate-500">{selectedDepartment.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-900">Information</h4>
                    <div className="space-y-2">
                      <p className="text-slate-600">
                        <span className="text-slate-900">Manager:</span>{' '}
                        {selectedDepartment.manager || 'Not assigned'}
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-900">Location:</span>{' '}
                        {selectedDepartment.location || 'Not specified'}
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-900">Status:</span>
                        <span
                          className={`ml-2 rounded-full px-2 py-1 text-xs ${
                            selectedDepartment.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : selectedDepartment.status === 'Inactive'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {selectedDepartment.status}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-900">Employees:</span>{' '}
                        {selectedDepartment.employeeCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-900">Goals</h4>
                    {selectedDepartment.goals && selectedDepartment.goals.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedDepartment.goals.map((goal, index) => (
                          <li key={index} className="flex items-start space-x-2 text-slate-600">
                            <CheckCircle className="mt-1 h-4 w-4 flex-shrink-0 text-blue-600" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">No goals set</p>
                    )}
                  </div>
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
