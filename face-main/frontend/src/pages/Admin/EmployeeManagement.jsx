import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { employeeAPI, departmentAPI, attendanceAPI, leadAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { faceAPI, cameraHelper } from '../../utils/faceAPI';
import {
  Plus,
  Filter,
  Edit,
  Eye,
  Trash2,
  Mail,
  User,
  X,
  Save,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Camera,
  Calendar,
  ClipboardList,
  TrendingUp,
  Users,
  BarChart3,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';
import toast from 'react-hot-toast';

const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL;
  return baseUrl.replace('/api', '') + path;
};

const getDepartmentId = (department) => {
  if (!department) return '';
  if (typeof department === 'object') {
    return department._id || department.id || '';
  }
  return department;
};

const EmployeeOverviewCard = ({
  icon,
  title,
  value,
  subtitle,
  breakdown = [],
  progress,
  cta,
  tone = 'blue',
  onClick
}) => {
  const tones = {
    blue:    { gradient: 'from-blue-500 to-indigo-600',    accent: '#3b82f6', text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',  divider: 'bg-blue-100' },
    amber:   { gradient: 'from-amber-400 to-orange-500',  accent: '#f59e0b', text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100', divider: 'bg-amber-100' },
    violet:  { gradient: 'from-violet-500 to-purple-600', accent: '#8b5cf6', text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',divider: 'bg-violet-100' },
    emerald: { gradient: 'from-emerald-500 to-teal-500',  accent: '#10b981', text: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-100',divider: 'bg-emerald-100' },
    slate:   { gradient: 'from-slate-500 to-slate-700',   accent: '#64748b', text: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200',  divider: 'bg-slate-200' },
    rose:    { gradient: 'from-rose-500 to-pink-500',     accent: '#f43f5e', text: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-100',   divider: 'bg-rose-100' }
  };
  const t = tones[tone] || tones.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border ${t.border} bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 shrink-0`}
      style={{ flex: '1 0 190px', minWidth: 190, maxWidth: 260 }}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${t.gradient}`} />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
          {React.createElement(icon, { className: 'h-3.5 w-3.5' })}
        </span>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      </div>

      {/* Divider */}
      <div className={`mx-4 h-px ${t.divider} opacity-50`} />

      {/* Main value */}
      <div className="px-4 pt-3 pb-2">
        <p className={`text-3xl font-black leading-none ${t.text}`}>{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-400">{subtitle}</p>
      </div>

      {/* Breakdown grid */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-px mx-4 mb-3 overflow-hidden rounded-xl border border-slate-100">
          {breakdown.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-2.5 py-2 ${
                i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 truncate">{item.label}</span>
              <span className="text-[11px] font-black text-slate-800 ml-1 shrink-0">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {typeof progress === 'number' && (
        <div className="px-4 pb-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${t.gradient} transition-all duration-700`}
              style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className={`mt-auto flex items-center justify-between px-4 py-2.5 ${t.bg} border-t ${t.border}`}>
        <span className={`text-[10px] font-bold ${t.text} truncate`}>{cta || 'View details'}</span>
        <ArrowUpRight className={`h-3.5 w-3.5 ${t.text} opacity-70 group-hover:opacity-100 transition-opacity shrink-0`} />
      </div>
    </button>
  );
};

// ================================
// EXTRACTED AddEmployeeModal Component
// ================================
const AddEmployeeModal = ({
  show,
  onClose,
  currentStep,
  setCurrentStep,
  newEmployee,
  setNewEmployee,
  departments,
  faceRegistrationEnabled,
  setFaceRegistrationEnabled,
  modelsLoaded,
  faceDetected,
  isScanning,
  capturedFaceData,
  setCapturedFaceData,
  capturedDescriptors,
  setCapturedDescriptors,
  posesCaptured,
  setPosesCaptured,
  videoRef,
  canvasRef,
  startCamera,
  captureCurrentPose,
  handleCreateEmployee,
  handleFormNext,
  resetForm
}) => {
  const updateEmployee = (field, value, nestedField = null, subNestedField = null) => {
    if (subNestedField) {
      setNewEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: {
            ...prev[field][nestedField],
            [subNestedField]: value
          }
        }
      }));
    } else if (nestedField) {
      setNewEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setNewEmployee(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const genders = ['Male', 'Female', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const workLocations = ['Office', 'Remote', 'Hybrid'];
  const workShifts = ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'];
  const accountTypes = ['Savings', 'Current'];
  if (!show) return null;
  const POSES = [
    { name: 'front', instruction: 'Look straight ahead at the camera. Keep your head level.', emoji: '�️' }
  ];
  const currentPoseIndex = posesCaptured.length;
  const currentPose = currentPoseIndex < POSES.length ? POSES[currentPoseIndex] : null;
  return (
    <div className="fixed inset-y-0 left-0 right-0 lg:left-64 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Enhanced backdrop with blur - Click to close */}
      <div
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      {/* Modal content - Prevent click propagation */}
      <div
        className="relative bg-[#F8FAFC] border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 w-full max-w-4xl max-h-[92vh] sm:max-h-[86vh] overflow-y-auto shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base sm:text-2xl font-bold text-slate-900 truncate">
              <span className="sm:hidden">Add Employee</span>
              <span className="hidden sm:inline">Add New Employee</span>
            </h2>
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                1
              </div>
              <div className={`w-4 sm:w-6 h-0.5 sm:h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                2
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-emerald-600">
              <Camera className="w-4 h-4" />
              <span>Face Registration (Optional)</span>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all duration-200"
              aria-label="Close modal"
              type="button"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        {currentStep === 1 ? (
          <form onSubmit={handleFormNext} className="space-y-4 sm:space-y-8">
            {/* Personal Information */}
            <div className="space-y-2.5 sm:space-y-4">
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 sm:pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">First Name *</label>
                  <input
                    type="text"
                    value={newEmployee.personalInfo.firstName}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'firstName')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={newEmployee.personalInfo.lastName}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'lastName')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={newEmployee.personalInfo.dateOfBirth}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'dateOfBirth')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Gender *</label>
                  <select
                    value={newEmployee.personalInfo.gender}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'gender')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Gender</option>
                    {genders.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Blood Group</label>
                  <select
                    value={newEmployee.personalInfo.bloodGroup}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'bloodGroup')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Contact Information */}
            <div className="space-y-2.5 sm:space-y-4">
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 sm:pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Email *</label>
                  <input
                    type="email"
                    value={newEmployee.contactInfo.personalEmail}
                    onChange={(e) => updateEmployee('contactInfo', e.target.value, 'personalEmail')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={newEmployee.contactInfo.phone}
                    onChange={(e) => updateEmployee('contactInfo', e.target.value, 'phone')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-xs sm:text-md font-semibold text-slate-900 mb-1.5 sm:mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                    <div>
                      <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Name *</label>
                      <input
                        type="text"
                        value={newEmployee.contactInfo.emergencyContact.name}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'name')}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Relationship *</label>
                      <input
                        type="text"
                        value={newEmployee.contactInfo.emergencyContact.relationship}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'relationship')}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={newEmployee.contactInfo.emergencyContact.phone}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'phone')}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Work Information */}
            <div className="space-y-2.5 sm:space-y-4">
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 sm:pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Position *</label>
                  <input
                    type="text"
                    value={newEmployee.workInfo.position}
                    onChange={(e) => updateEmployee('workInfo', e.target.value, 'position')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Department *</label>
                  <select
                    value={newEmployee.workInfo.department}
                    onChange={(e) => updateEmployee('workInfo', e.target.value, 'department')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Basic Salary *</label>
                  <input
                    type="number"
                    value={newEmployee.salaryInfo.basicSalary}
                    onChange={(e) => updateEmployee('salaryInfo', parseFloat(e.target.value) || 0, 'basicSalary')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
            {/* Bank Information */}
            <div className="space-y-2.5 sm:space-y-4">
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 sm:pb-2">Bank Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.accountHolderName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountHolderName')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Account Number</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.accountNumber}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountNumber')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.bankName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'bankName')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.branchName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'branchName')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.ifscCode}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value.toUpperCase(), 'ifscCode')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-2">Account Type</label>
                  <select
                    value={newEmployee.bankInfo.accountType}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountType')}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 text-xs sm:text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 -mx-3 -mb-3 p-3 sm:p-0 sm:static sm:mx-0 sm:mb-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-6 z-20">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Create employee without face registration
                  await handleCreateEmployee();
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl bg-white hover:bg-slate-50 transition-colors"
              >
                Skip Face & Create
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white font-semibold text-xs sm:text-sm rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-sm"
              >
                Next: Face Registration
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Face Registration (Optional) for {newEmployee.personalInfo.firstName} {newEmployee.personalInfo.lastName}
              </h3>
              <p className="text-slate-500 text-sm">Position your face directly in front of the camera (or skip to create employee without face data)</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Camera Feed */}
              <div className="space-y-3 sm:space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[300px] sm:max-h-[360px] w-full">
                  <video
                    ref={videoRef}
                    width="640"
                    height="480"
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  {!modelsLoaded && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-1 sm:mb-2"></div>
                        <p className="text-xs sm:text-sm">Loading face models... (one-time setup)</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-blue-100 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-xs sm:text-sm text-slate-600">
                      {faceDetected ? 'Face detected - Ready to capture' : 'No face detected - Position face in frame'}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500">
                    {modelsLoaded ? 'Models ready' : 'Loading...'}
                  </div>
                </div>
              </div>
              {/* Instructions & Actions */}
              <div className="space-y-4 sm:space-y-6">
                {/* Pose Progress */}
                {posesCaptured.length > 0 && (
                  <div className="bg-white border border-emerald-100 rounded-xl p-3 sm:p-4 shadow-sm">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      <span className="text-sm text-slate-900 font-medium">Face Captured Successfully!</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      {POSES.map(pose => (
                        <div key={pose.name} className={`text-center p-1.5 sm:p-2 rounded text-[10px] sm:text-xs font-medium ${posesCaptured.includes(pose.name)
                          ? 'bg-green-400/20 text-green-400'
                          : 'bg-slate-100 text-slate-500'
                          }`}>
                          {pose.name === 'up' ? 'Top' : pose.name.charAt(0).toUpperCase() + pose.name.slice(1)}
                        </div>
                      ))}
                    </div>
                    {capturedDescriptors.length > 0 && (
                      <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                        {capturedDescriptors.map((faceData, index) => (
                          <div key={index} className="text-center">
                            <img
                              src={faceData.thumbnail}
                              alt={`Front face`}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-blue-100 mx-auto mb-1"
                            />
                            <p className="text-[10px] sm:text-xs text-slate-500">Front Face</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Dynamic Instruction */}
                <div className="bg-white border border-blue-100 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="text-center mb-3 sm:mb-4">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">
                      {currentPose
                        ? `${currentPose.emoji} ${currentPose.instruction}`
                        : '✅ All poses captured!'}
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm">
                      {currentPose
                        ? 'Position your face as shown, then click “Capture This Pose”'
                        : 'Face registration complete!'}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-1.5 sm:space-x-2 mb-2 sm:mb-3">
                    {POSES.map((pose, index) => (
                      <div key={pose.name} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${posesCaptured.includes(pose.name) ? 'bg-green-400' :
                        posesCaptured.length === index ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'
                        }`} />
                    ))}
                  </div>
                  <div className="text-center text-[10px] sm:text-xs text-slate-500">
                    {posesCaptured.length > 0 ? 'Face captured!' : 'Ready to capture'}
                  </div>
                </div>
                {!capturedFaceData ? (
                  <button
                    onClick={captureCurrentPose}
                    disabled={isScanning || posesCaptured.length >= 1}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{isScanning ? 'Capturing...' : 'Capture This Pose'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCapturedFaceData(null);
                      setCapturedDescriptors([]);
                      setPosesCaptured([]);
                      startCamera();
                    }}
                    className="w-full py-2.5 sm:py-3 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-white hover:text-slate-900 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Recapture Face</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-white hover:text-slate-900 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  // Create employee without face data
                  setCapturedFaceData(null);
                  handleCreateEmployee();
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border border-blue-200 text-blue-700 text-sm rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <span>Skip Face & Create</span>
              </button>
              <button
                type="button"
                onClick={handleCreateEmployee}
                disabled={!capturedFaceData}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Create with Face Data</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================
// MAIN COMPONENT
// ================================
const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFullEmployeeDetails, setShowFullEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeOverview, setEmployeeOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [faceRegistrationEnabled, setFaceRegistrationEnabled] = useState(true); // Face registration is now OPTIONAL
  const [globalModelsLoaded, setGlobalModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedFaceData, setCapturedFaceData] = useState(null);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [posesCaptured, setPosesCaptured] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const keyDetailsRef = useRef(null);
  const POSES = [
    { name: 'front', instruction: 'Look straight ahead at the camera. Keep your head level.', emoji: '👁️' }
  ];
  const [newEmployee, setNewEmployee] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      nationality: 'Indian',
      maritalStatus: 'Single',
      bloodGroup: ''
    },
    contactInfo: {
      phone: '',
      alternatePhone: '',
      personalEmail: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    workInfo: {
      position: '',
      department: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-time',
      workLocation: 'Office',
      team: '',
      skills: [],
      workShift: 'Morning'
    },
    salaryInfo: {
      basicSalary: 0,
      allowances: {
        hra: 0,
        medical: 0,
        transport: 0,
        other: 0
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        other: 0
      },
      currency: 'INR',
      payFrequency: 'Monthly'
    },
    bankInfo: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      branchName: '',
      ifscCode: '',
      accountType: 'Savings'
    }
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 480,
          height: 360,
          facingMode: 'user'
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Please allow camera access to register face');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (videoRef.current?.detectionInterval) {
      clearInterval(videoRef.current.detectionInterval);
    }
  };

  // ✅ Draw unique hexagon instead of square
  const getDepartmentName = (department, fallback = 'No Department') => {
    if (!department) return fallback;
    if (typeof department === 'object') {
      return department.name || department.departmentName || department.code || fallback;
    }
    return String(department);
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openEmployeeView = (event, employee) => {
    if (isInteractiveClick(event)) return;
    setSelectedEmployee(employee);
    setShowFullEmployeeDetails(false);
    setShowViewModal(true);
  };

  const drawHexagon = (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.max(width, height) * 0.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = centerX + radius * Math.cos(angle);
      const hy = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  };

  const startFaceDetection = async () => {
    // Simplified face detection - just assume face is present if camera is ready
    // This avoids the timeout issues with continuous detection
    console.log('Face detection simplified - assuming face is present when camera is ready');

    // Set face detected to true after a short delay to allow camera to initialize
    setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        setFaceDetected(true);
        console.log('Camera ready - face detection enabled');
      }
    }, 1000);

    // Optional: You can still draw a guide box without actual detection
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a centered guide box
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const boxWidth = canvas.width * 0.6;
        const boxHeight = canvas.height * 0.8;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(
          centerX - boxWidth / 2,
          centerY - boxHeight / 2,
          boxWidth,
          boxHeight
        );
        ctx.setLineDash([]);
      }
    }
  };

  const captureCurrentPose = async () => {
    // Removed face detection check - we'll validate during capture instead
    const currentPoseIndex = posesCaptured.length;
    if (currentPoseIndex >= POSES.length) {
      toast.error('Face already captured.');
      return false;
    }
    setIsScanning(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsScanning(false);
      toast.error('Capture timeout. Please try again.');
    }, 120000); // 120 second timeout

    try {
      // Capture image as base64
      const imageBase64 = cameraHelper.captureImage(videoRef.current);
      if (!imageBase64) {
        clearTimeout(timeoutId);
        toast.error('Failed to capture image. Please try again.');
        setIsScanning(false);
        return false;
      }

      console.log('Captured image size:', imageBase64.length, 'characters');

      // Use the new analyzeFrameBase64 endpoint with error handling
      let response;
      try {
        console.log('Sending request to analyze frame...');
        response = await Promise.race([
          faceAPI.analyzeFrameBase64(imageBase64),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - server took too long to respond')), 30000)
          )
        ]);
        console.log('Response received:', response.data);
      } catch (apiError) {
        clearTimeout(timeoutId);
        console.error('API call error:', apiError);

        // More specific error messages
        if (apiError.message && apiError.message.includes('timeout')) {
          toast.error('Request timeout. The server is taking too long. Please try again.');
        } else if (apiError.code === 'ERR_NETWORK') {
          toast.error('Network error. Please check if the backend server is running.');
        } else if (apiError.response?.status === 413) {
          toast.error('Image too large. Please try with better lighting.');
        } else {
          toast.error(`Error: ${apiError.message || 'Network error. Please try again.'}`);
        }

        setIsScanning(false);
        return false;
      }

      clearTimeout(timeoutId);

      if (!response.data?.success || !response.data?.face_detected) {
        toast.error(response.data?.message || 'No face detected. Please try again.');
        setIsScanning(false);
        return false;
      }

      const faceDescriptor = response.data.face.descriptor;
      if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        toast.error('Invalid face descriptor. Please try again.');
        setIsScanning(false);
        return false;
      }

      // Create thumbnail from captured image
      const thumbnail = imageBase64;
      const confidence = response.data.quality?.score
        ? Math.round(response.data.quality.score * 100)
        : 90;

      const faceData = {
        pose: POSES[currentPoseIndex].name,
        descriptor: faceDescriptor,
        thumbnail: thumbnail,
        confidence: confidence
      };

      setCapturedDescriptors(prev => [...prev, faceData]);
      setPosesCaptured(prev => [...prev, POSES[currentPoseIndex].name]);
      toast.success(`Front face captured successfully!`);

      // Since we only capture one pose now, immediately set the face data
      setCapturedFaceData({
        descriptors: [faceData],
        averageDescriptor: faceDescriptor,
        thumbnail: thumbnail,
        confidence: confidence
      });
      toast.success('Face registration complete!');

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error capturing face:', error);
      toast.error('Failed to capture face data. Please try again.');
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getEmployees();
      if (response.data.success) {
        const employeeData = response.data.data?.employees || [];
        const enrichedEmployees = employeeData.map(emp => {
          // Check multiple possible indicators of face registration
          const hasFaceRegistered =
            emp.hasFaceRegistered === true ||
            (Array.isArray(emp.faceDescriptor) && (emp.faceDescriptor.length === 128 || emp.faceDescriptor.length === 512)) ||
            !!emp.faceImage;
          return {
            ...emp,
            hasFaceRegistered // explicitly set the flag
          };
        });
        setEmployees(enrichedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    setGlobalModelsLoaded(true); // No local model loading needed - using backend service
    return () => stopCamera();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentAPI.getDepartments();
        if (response.data.success) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (showAddModal && currentStep === 2 && faceRegistrationEnabled && globalModelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showAddModal, currentStep, faceRegistrationEnabled, globalModelsLoaded]);

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.toLowerCase();
    const userEmail = emp.user?.email?.toLowerCase() || '';
    const position = emp.workInfo?.position?.toLowerCase() || '';
    const employeeId = emp.employeeId?.toLowerCase() || emp.user?.employeeId?.toLowerCase() || '';
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      userEmail.includes(searchTerm.toLowerCase()) ||
      position.includes(searchTerm.toLowerCase()) ||
      employeeId.includes(searchTerm.toLowerCase());
    const departmentName = getDepartmentName(emp.workInfo?.department, '');
    const matchesDepartment = !filterDepartment || departmentName === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleFormNext = (e) => {
    e.preventDefault();
    if (!newEmployee.personalInfo.firstName || !newEmployee.personalInfo.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!newEmployee.contactInfo.personalEmail) {
      toast.error('Email is required');
      return;
    }
    if (!newEmployee.workInfo.position || !newEmployee.workInfo.department) {
      toast.error('Position and department are required');
      return;
    }
    // Face registration is now OPTIONAL - go to step 2 where user can skip
    setCurrentStep(2);
  };

  const handleCreateEmployee = async () => {
    try {
      let employeeDataWithFace = { ...newEmployee };
      if (capturedFaceData) {
        // ✅ Send average face descriptor (128-number array)
        employeeDataWithFace.faceDescriptor = capturedFaceData.averageDescriptor;
        employeeDataWithFace.hasFaceRegistered = true;
      }
      const response = await employeeAPI.createEmployee(employeeDataWithFace);
      if (response.data.success) {
        await fetchEmployees();
        resetForm();
        setShowAddModal(false);
        const employeeName = `${newEmployee.personalInfo.firstName} ${newEmployee.personalInfo.lastName}`;
        toast.success(`Employee ${employeeName} added successfully with 4-pose face registration!`);
      }
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    }
  };

  const resetForm = () => {
    setNewEmployee({
      personalInfo: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        nationality: 'Indian',
        maritalStatus: 'Single',
        bloodGroup: ''
      },
      contactInfo: {
        phone: '',
        alternatePhone: '',
        personalEmail: '',
        address: {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      },
      workInfo: {
        position: '',
        department: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'Full-time',
        workLocation: 'Office',
        team: '',
        skills: [],
        workShift: 'Morning'
      },
      salaryInfo: {
        basicSalary: 0,
        allowances: {
          hra: 0,
          medical: 0,
          transport: 0,
          other: 0
        },
        deductions: {
          pf: 0,
          esi: 0,
          tax: 0,
          other: 0
        },
        currency: 'INR',
        payFrequency: 'Monthly'
      },
      bankInfo: {
        accountHolderName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'Savings'
      }
    });
    setCurrentStep(1);
    setCapturedFaceData(null);
    setCapturedDescriptors([]);
    setPosesCaptured([]);
    setFaceDetected(false);
    setIsScanning(false);
    stopCamera();
  };

  const updateSelectedEmployee = (field, value, nestedField = null, subNestedField = null) => {
    if (subNestedField) {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: {
            ...prev[field][nestedField],
            [subNestedField]: value
          }
        }
      }));
    } else if (nestedField) {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const getSelectedEmployeeKey = (employee = selectedEmployee) => {
    if (!employee) return '';
    return String(employee._id || employee.id || employee.employeeId || employee.user?._id || employee.user?.employeeId || '');
  };

  const getSelectedEmployeeEmail = (employee = selectedEmployee) => (
    employee?.contactInfo?.personalEmail || employee?.user?.email || ''
  );

  const normalizeList = (response, keys = []) => {
    const data = response?.data || response || {};
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
      if (Array.isArray(data?.data?.[key])) return data.data[key];
    }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.tasks)) return data.tasks;
    if (Array.isArray(data.leaves)) return data.leaves;
    return [];
  };

  const matchesEmployee = (item, employee = selectedEmployee) => {
    if (!employee || !item) return false;
    const ids = new Set([
      employee._id,
      employee.id,
      employee.employeeId,
      employee.user?._id,
      employee.user?.id,
      employee.user?.employeeId
    ].filter(Boolean).map(String));
    const email = getSelectedEmployeeEmail(employee).toLowerCase();
    const candidates = [
      item.employee,
      item.employeeId,
      item.assignedTo,
      item.user,
      item.userId,
      item.employee?._id,
      item.employee?.id,
      item.employee?.employeeId,
      item.employee?.user?._id,
      item.employee?.user?.employeeId,
      item.assignedTo?._id,
      item.assignedTo?.id,
      item.assignedTo?.employeeId,
      item.assignedTo?.user?._id,
      item.assignedTo?.user?.employeeId
    ];

    if (candidates.some(value => value && ids.has(String(typeof value === 'object' ? value._id || value.id || value.employeeId : value)))) {
      return true;
    }

    const itemEmail = [
      item.email,
      item.employee?.contactInfo?.personalEmail,
      item.employee?.user?.email,
      item.assignedTo?.contactInfo?.personalEmail,
      item.assignedTo?.user?.email
    ].filter(Boolean).map(value => String(value).toLowerCase());

    return !!email && itemEmail.includes(email);
  };

  const fetchEmployeeOverview = async (employee) => {
    if (!employee) return;
    setOverviewLoading(true);
    setRecentActivities([]);
    const employeeId = getSelectedEmployeeKey(employee);
    const employeeEmail = getSelectedEmployeeEmail(employee);

    try {
      const [leavesRes, tasksRes, attendanceRes, leadsRes, problemsRes, interviewsRes] = await Promise.allSettled([
        api.get('/leaves', { params: { search: employee.employeeId || employee.user?.employeeId || employee.fullName || employeeEmail } }),
        api.get('/tasks', { params: { assignedTo: employee._id || employeeId } }),
        attendanceAPI.getAllAttendance({ employee: employee._id || employeeId, limit: 200 }),
        leadAPI.getLeads({ includeAll: true, assignedTo: employeeEmail || employee._id || employeeId, limit: 200 }),
        isDeveloperEmployee(employee) ? api.get('/problems') : Promise.resolve({ data: { data: [] } }),
        isHrEmployee(employee) ? api.get('/interviews/admin') : Promise.resolve({ data: { data: [] } })
      ]);

      const leaves = leavesRes.status === 'fulfilled'
        ? normalizeList(leavesRes.value, ['leaves']).filter(item => matchesEmployee(item, employee))
        : [];
      const tasks = tasksRes.status === 'fulfilled'
        ? normalizeList(tasksRes.value, ['tasks']).filter(item => matchesEmployee(item, employee))
        : [];
      const attendance = attendanceRes.status === 'fulfilled'
        ? normalizeList(attendanceRes.value, ['attendanceRecords', 'records', 'attendance']).filter(item => matchesEmployee(item, employee))
        : [];
      const leads = leadsRes.status === 'fulfilled'
        ? normalizeList(leadsRes.value, ['leads']).filter(item => matchesEmployee(item, employee))
        : [];
      const problems = problemsRes.status === 'fulfilled'
        ? normalizeList(problemsRes.value, ['data', 'problems']).filter(item => matchesEmployee({ ...item, employee: item.reportedBy || item.solvedBy }, employee))
        : [];
      const interviews = interviewsRes.status === 'fulfilled'
        ? normalizeList(interviewsRes.value, ['data', 'interviews']).filter(item => matchesEmployee({ ...item, employee: item.createdBy || item.employee || item.hr }, employee))
        : [];

      const statusOf = (item) => String(item.status || '').toLowerCase();
      const leadNameOf = (lead) => (
        lead.fullName ||
        lead.name ||
        `${lead.firstName || ''} ${lead.lastName || ''}`.trim() ||
        lead.company ||
        'Lead'
      );
      const formatShortDate = (date) => {
        if (!date) return '';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      };
      const sortLatest = (items) => [...items].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || b.appliedDate || b.startDate || b.dueDate || b.scheduledDate || 0) -
        new Date(a.updatedAt || a.createdAt || a.appliedDate || a.startDate || a.dueDate || a.scheduledDate || 0)
      );
      const scheduledMeetings = leads
        .flatMap(lead => (lead.meetings || []).map(meeting => ({
          ...meeting,
          scheduledDate: meeting.scheduledDate || meeting.date || meeting.meetingDate || meeting.startTime,
          leadName: leadNameOf(lead),
          leadCompany: lead.company,
          leadStatus: lead.status
        })))
        .filter(meeting => statusOf(meeting) !== 'cancelled');
      const presentDays = attendance.filter(record => ['present', 'checked-in', 'checked out', 'checked-out'].includes(statusOf(record))).length;
      const absentDays = attendance.filter(record => statusOf(record) === 'absent').length;
      const lateDays = attendance.filter(record => statusOf(record).includes('late')).length;
      const halfDays = attendance.filter(record => statusOf(record).includes('half')).length;
      const approvedLeaves = leaves.filter(item => statusOf(item) === 'approved').length;
      const rejectedLeaves = leaves.filter(item => statusOf(item) === 'rejected').length;
      const leaveDaysTaken = leaves
        .filter(item => statusOf(item) === 'approved')
        .reduce((sum, item) => sum + Number(item.isHalfDay ? 0.5 : item.totalDays || 0), 0);
      const visibleLeave = sortLatest(leaves.filter(item => ['pending', 'requested', 'applied'].includes(statusOf(item)) || !statusOf(item)))[0];
      const leaveReason = visibleLeave?.reason || visibleLeave?.leaveReason || visibleLeave?.description || visibleLeave?.type || visibleLeave?.leaveType;
      const leaveDate = formatShortDate(visibleLeave?.startDate || visibleLeave?.fromDate || visibleLeave?.date || visibleLeave?.appliedDate);
      const inactiveTaskStatuses = ['completed', 'done', 'approved', 'reviewed', 'cancelled', 'rejected'];
      const activeTasks = sortLatest(tasks.filter(item => !inactiveTaskStatuses.includes(statusOf(item))));
      const completedTasks = tasks.filter(item => ['completed', 'done', 'approved', 'reviewed'].includes(statusOf(item))).length;
      const overdueTasks = tasks.filter(item => {
        if (inactiveTaskStatuses.includes(statusOf(item))) return false;
        return item.dueDate && new Date(item.dueDate) < new Date();
      }).length;
      const taskTitles = activeTasks
        .slice(0, 2)
        .map(item => item.title || item.description || item.taskTitle)
        .filter(Boolean);
      const wonLeads = leads.filter(item => statusOf(item) === 'won').length;
      const lostLeads = leads.filter(item => statusOf(item) === 'lost').length;
      const openLeads = Math.max(leads.length - wonLeads - lostLeads, 0);
      const activeLeads = sortLatest(leads.filter(item => statusOf(item) !== 'won'));
      const activeLead = activeLeads[0];
      const activeLeadInfo = activeLead
        ? [leadNameOf(activeLead), activeLead.company, activeLead.status].filter(Boolean).join(' - ')
        : '';
      const upcomingMeetingItems = scheduledMeetings
        .filter(item => item.scheduledDate && new Date(item.scheduledDate) >= new Date() && !['completed', 'done', 'cancelled'].includes(statusOf(item)))
        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
      const upcomingMeetings = upcomingMeetingItems.length;
      const completedMeetings = scheduledMeetings.filter(item => ['completed', 'done'].includes(statusOf(item))).length;
      const openProblems = problems.filter(item => !['solved', 'resolved', 'closed'].includes(statusOf(item))).length;
      const solvedProblems = Math.max(problems.length - openProblems, 0);
      const latestProblem = sortLatest(problems.filter(item => !['solved', 'resolved', 'closed'].includes(statusOf(item))))[0];
      const scheduledInterviews = interviews.filter(item => ['scheduled', 'pending'].includes(statusOf(item))).length;
      const completedInterviews = interviews.filter(item => ['completed', 'selected', 'rejected', 'cancelled'].includes(statusOf(item))).length;

      setEmployeeOverview({
        leaves: {
          total: leaves.length,
          pending: leaves.filter(item => statusOf(item) === 'pending').length,
          approved: approvedLeaves,
          rejected: rejectedLeaves,
          daysTaken: leaveDaysTaken,
          brief: visibleLeave && (leaveDate || leaveReason) ? `${leaveDate || 'Leave'}: ${leaveReason || 'No reason added'}` : ''
        },
        tasks: {
          total: tasks.length,
          active: activeTasks.length,
          completed: completedTasks,
          overdue: overdueTasks,
          titles: taskTitles
        },
        attendance: {
          total: attendance.length,
          present: presentDays,
          absent: absentDays,
          late: lateDays,
          halfDay: halfDays,
          rate: attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0
        },
        sales: {
          total: leads.length,
          won: wonLeads,
          open: openLeads,
          lost: lostLeads,
          brief: activeLeadInfo
        },
        meetings: {
          total: scheduledMeetings.length,
          upcoming: upcomingMeetings,
          completed: completedMeetings,
          past: Math.max(scheduledMeetings.length - upcomingMeetings, 0),
          brief: upcomingMeetingItems[0]
            ? [upcomingMeetingItems[0].leadName, formatShortDate(upcomingMeetingItems[0].scheduledDate), upcomingMeetingItems[0].type || upcomingMeetingItems[0].title].filter(Boolean).join(' - ')
            : ''
        },
        problems: {
          total: problems.length,
          open: openProblems,
          solved: solvedProblems,
          latest: latestProblem?.title || latestProblem?.description || latestProblem?.problem || ''
        },
        interviews: {
          total: interviews.length,
          pending: scheduledInterviews,
          completed: completedInterviews
        }
      });

      // Build recent activities timeline from raw data
      const activityItems = [];
      const pushActivity = (type, icon, color, label, detail, date) => {
        if (!date) return;
        const d = new Date(date);
        if (!isNaN(d.getTime())) activityItems.push({ type, icon, color, label, detail, date: d });
      };
      // Attendance
      attendance.slice(0, 10).forEach(r => {
        const s = statusOf(r);
        const displayStatus = s === 'present' || s === 'checked-in' || s === 'checked out' || s === 'checked-out' ? 'Checked In'
          : s === 'absent' ? 'Absent'
          : s.includes('late') ? 'Checked In Late'
          : s.includes('half') ? 'Half Day'
          : s.includes('work') ? 'Work From Home'
          : 'Attendance Logged';
        const color = displayStatus === 'Checked In' ? 'blue'
          : displayStatus === 'Absent' ? 'rose'
          : displayStatus === 'Checked In Late' ? 'amber'
          : displayStatus === 'Half Day' ? 'violet'
          : 'slate';
        pushActivity('attendance', 'calendar', color, displayStatus, r.notes || '', r.date || r.checkIn || r.createdAt);
      });
      // Tasks
      sortLatest(tasks).slice(0, 8).forEach(t => {
        const s = statusOf(t);
        const label = ['completed', 'done'].includes(s) ? 'Task Completed'
          : s === 'in-progress' || s === 'inprogress' ? 'Task In Progress'
          : s === 'overdue' ? 'Task Overdue'
          : 'Task Assigned';
        const color = ['completed', 'done'].includes(s) ? 'emerald'
          : s === 'overdue' ? 'rose'
          : s.includes('progress') ? 'violet'
          : 'blue';
        pushActivity('task', 'clipboard', color, label, t.title || t.description || 'Task', t.updatedAt || t.createdAt);
      });
      // Leaves
      sortLatest(leaves).slice(0, 6).forEach(l => {
        const s = statusOf(l);
        const label = s === 'approved' ? 'Leave Approved'
          : s === 'rejected' ? 'Leave Rejected'
          : 'Leave Requested';
        const color = s === 'approved' ? 'emerald' : s === 'rejected' ? 'rose' : 'amber';
        const detail = [l.leaveType || l.type, l.reason || l.leaveReason].filter(Boolean).join(' · ');
        pushActivity('leave', 'users', color, label, detail, l.updatedAt || l.createdAt || l.appliedDate);
      });
      // Sales leads
      sortLatest(leads).slice(0, 6).forEach(ld => {
        const s = statusOf(ld);
        const label = s === 'won' ? 'Lead Won'
          : s === 'lost' ? 'Lead Lost'
          : 'Lead Updated';
        const color = s === 'won' ? 'emerald' : s === 'lost' ? 'rose' : 'blue';
        const detail = leadNameOf(ld) + (ld.company ? ` · ${ld.company}` : '');
        pushActivity('lead', 'trending', color, label, detail, ld.updatedAt || ld.createdAt);
      });
      // Meetings
      sortLatest(scheduledMeetings).slice(0, 5).forEach(m => {
        const s = statusOf(m);
        const label = ['completed', 'done'].includes(s) ? 'Meeting Completed'
          : new Date(m.scheduledDate) >= new Date() ? 'Meeting Scheduled'
          : 'Meeting Held';
        const color = ['completed', 'done'].includes(s) ? 'emerald' : 'slate';
        const detail = [m.leadName, m.type || m.title, formatShortDate(m.scheduledDate)].filter(Boolean).join(' · ');
        pushActivity('meeting', 'bar', color, label, detail, m.scheduledDate || m.createdAt);
      });
      // Problems
      sortLatest(problems).slice(0, 4).forEach(p => {
        const s = statusOf(p);
        const label = ['solved', 'resolved', 'closed'].includes(s) ? 'Problem Resolved' : 'Problem Reported';
        const color = ['solved', 'resolved', 'closed'].includes(s) ? 'emerald' : 'rose';
        pushActivity('problem', 'alert', color, label, p.title || p.description || p.problem || '', p.updatedAt || p.createdAt);
      });
      // Sort all activities by date descending
      activityItems.sort((a, b) => b.date - a.date);
      setRecentActivities(activityItems.slice(0, 20));

    } catch (error) {
      console.error('Failed to load employee overview:', error);
      setEmployeeOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (showViewModal && selectedEmployee) {
      fetchEmployeeOverview(selectedEmployee);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showViewModal, selectedEmployee?._id]);

  const goToEmployeeDetailPage = (path) => {
    const firstName = selectedEmployee?.personalInfo?.firstName || '';
    const lastName = selectedEmployee?.personalInfo?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || selectedEmployee?.user?.name || '';
    setShowViewModal(false);
    navigate(path, { state: { employeeFilter: fullName } });
  };

  const handleToggleFullEmployeeDetails = () => {
    setShowFullEmployeeDetails(prev => !prev);
    window.requestAnimationFrame(() => {
      keyDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const getEmployeeRoleText = (employee = selectedEmployee) => [
    getDepartmentName(employee?.workInfo?.department, ''),
    employee?.workInfo?.position,
    employee?.workInfo?.designation
  ].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');

  const isSalesEmployee = (employee = selectedEmployee) => {
    const roleText = getEmployeeRoleText(employee);
    return ['sales', 'bde', 'businessdevelopment', 'businessdevelopmentexecutive'].some(key => roleText.includes(key));
  };

  const isDeveloperEmployee = (employee = selectedEmployee) => {
    const roleText = getEmployeeRoleText(employee);
    return ['developer', 'development', 'engineer', 'software', 'frontend', 'backend', 'fullstack'].some(key => roleText.includes(key));
  };

  const isHrEmployee = (employee = selectedEmployee) => {
    const roleText = getEmployeeRoleText(employee);
    return ['hr', 'humanresource', 'humanresources', 'recruiter', 'talent'].some(key => roleText.includes(key));
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      const selectedDepartmentValue = selectedEmployee.workInfo?.department;
      const departmentId = getDepartmentId(selectedDepartmentValue);
      const matchedDepartment = departments.find((department) =>
        department._id === departmentId ||
        department.id === departmentId ||
        department.name === selectedDepartmentValue ||
        department.code === selectedDepartmentValue
      );

      const employeePayload = {
        personalInfo: selectedEmployee.personalInfo,
        contactInfo: selectedEmployee.contactInfo,
        workInfo: {
          ...selectedEmployee.workInfo,
          department: matchedDepartment?._id || matchedDepartment?.id || departmentId
        },
        salaryInfo: selectedEmployee.salaryInfo,
        bankInfo: selectedEmployee.bankInfo,
        status: selectedEmployee.status || 'Active'
      };

      const response = await employeeAPI.updateEmployee(selectedEmployee._id, employeePayload);
      if (response.data.success) {
        await fetchEmployees();
        setShowEditModal(false);
        toast.success('Employee updated successfully!');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee? This will also delete their user account.')) {
      try {
        const response = await employeeAPI.deleteEmployee(id);
        if (response.data.success) {
          await fetchEmployees();
          toast.success('Employee deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error(error.response?.data?.message || 'Failed to delete employee');
      }
    }
  };

  const EditModal = () => {
    if (!selectedEmployee) return null;
    return (
      <div className="fixed inset-y-0 left-0 right-0 lg:left-64 z-[9999] flex items-center justify-center p-3 sm:p-4">
        <style>{`
          .employee-edit-modal {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .employee-edit-modal::-webkit-scrollbar {
            display: none;
          }
          .employee-edit-modal input,
          .employee-edit-modal select,
          .employee-edit-modal textarea {
            padding: 0.625rem 0.75rem !important;
            border-radius: 0.75rem !important;
            font-size: 0.875rem !important;
          }
          .employee-edit-modal label {
            margin-bottom: 0.375rem !important;
            font-size: 0.75rem !important;
            line-height: 1rem !important;
          }
        `}</style>
        {/* Enhanced backdrop with blur */}
        <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />

        {/* Modal content */}
        <div className="employee-edit-modal relative w-full max-w-3xl max-h-[76vh] overflow-y-auto rounded-2xl border border-blue-100 bg-[#F8FAFC] shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-blue-100 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur sm:px-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Edit Employee</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleEditEmployee} className="space-y-4 p-4 pb-20 sm:p-5 sm:pb-20">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">First Name *</label>
                  <input
                    type="text"
                    value={selectedEmployee.personalInfo?.firstName || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'firstName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="words"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={selectedEmployee.personalInfo?.lastName || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'lastName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={selectedEmployee.personalInfo?.dateOfBirth ? selectedEmployee.personalInfo.dateOfBirth.split('T')[0] : ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'dateOfBirth')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Gender *</label>
                  <select
                    value={selectedEmployee.personalInfo?.gender || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'gender')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Blood Group</label>
                  <select
                    value={selectedEmployee.personalInfo?.bloodGroup || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'bloodGroup')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Nationality</label>
                  <input
                    type="text"
                    value={selectedEmployee.personalInfo?.nationality || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'nationality')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Email *</label>
                  <input
                    type="email"
                    value={selectedEmployee.contactInfo?.personalEmail || ''}
                    onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'personalEmail')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={selectedEmployee.contactInfo?.phone || ''}
                    onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'phone')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Alternate Phone</label>
                  <input
                    type="tel"
                    value={selectedEmployee.contactInfo?.alternatePhone || ''}
                    onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'alternatePhone')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm sm:text-md font-semibold text-slate-900 mb-2 sm:mb-3">Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="lg:col-span-3">
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Street</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.address?.street || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'address', 'street')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">City</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.address?.city || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'address', 'city')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">State</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.address?.state || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'address', 'state')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Pincode</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.address?.pincode || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'address', 'pincode')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Country</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.address?.country || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'address', 'country')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm sm:text-md font-semibold text-slate-900 mb-2 sm:mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Name *</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.emergencyContact?.name || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'name')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Relationship *</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.emergencyContact?.relationship || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'relationship')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={selectedEmployee.contactInfo?.emergencyContact?.phone || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'phone')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Position *</label>
                  <input
                    type="text"
                    value={selectedEmployee.workInfo?.position || ''}
                    onChange={(e) => updateSelectedEmployee('workInfo', e.target.value, 'position')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Department *</label>
                  <select
                    value={getDepartmentId(selectedEmployee.workInfo?.department)}
                    onChange={(e) => updateSelectedEmployee('workInfo', e.target.value, 'department')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Basic Salary *</label>
                  <input
                    type="number"
                    value={selectedEmployee.salaryInfo?.basicSalary || 0}
                    onChange={(e) => updateSelectedEmployee('salaryInfo', parseFloat(e.target.value) || 0, 'basicSalary')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
            {/* Bank Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Bank Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Account Holder</label>
                  <input
                    type="text"
                    value={selectedEmployee.bankInfo?.accountHolderName || ''}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value, 'accountHolderName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={selectedEmployee.bankInfo?.bankName || ''}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value, 'bankName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Account Number</label>
                  <input
                    type="text"
                    value={selectedEmployee.bankInfo?.accountNumber || ''}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value, 'accountNumber')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={selectedEmployee.bankInfo?.ifscCode || ''}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value.toUpperCase(), 'ifscCode')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={selectedEmployee.bankInfo?.branchName || ''}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value, 'branchName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">Account Type</label>
                  <select
                    value={selectedEmployee.bankInfo?.accountType || 'Savings'}
                    onChange={(e) => updateSelectedEmployee('bankInfo', e.target.value, 'accountType')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="Salary">Salary</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 z-20 -mx-4 -mb-20 flex flex-col justify-end gap-2 border-t border-slate-200 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mb-20 sm:flex-row sm:px-5">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:px-6"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 sm:px-6"
              >
                Update Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ViewModal = () => (
    <div className="fixed inset-y-0 left-0 right-0 lg:left-64 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <style>{`
        .employee-details-view {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .employee-details-view::-webkit-scrollbar {
          display: none;
        }
        .employee-details-view section p {
          min-height: 1.75rem;
          color: rgb(15 23 42);
          font-size: 0.875rem;
          line-height: 1.25rem;
          font-weight: 500;
        }
        .employee-details-view section label {
          margin-bottom: 0.25rem;
          display: block;
          color: rgb(100 116 139);
          font-size: 0.75rem;
          line-height: 1rem;
          font-weight: 500;
        }
        .employee-details-view label + p {
          min-height: 1.75rem !important;
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          color: rgb(15 23 42) !important;
          font-size: 0.875rem !important;
          line-height: 1.25rem !important;
          font-weight: 500 !important;
        }
        .employee-details-view label {
          margin-bottom: 0.25rem !important;
          color: rgb(100 116 139) !important;
          font-size: 0.75rem !important;
          line-height: 1rem !important;
          font-weight: 500 !important;
        }
      `}</style>
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />

      {/* Modal content */}
      <div className="employee-details-view relative w-full max-w-3xl lg:max-w-6xl max-h-[74vh] overflow-y-auto rounded-2xl border border-blue-100 bg-[#F8FAFC] shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-blue-100 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur sm:px-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Employee Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowViewModal(false);
                setShowEditModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition-all duration-200 hover:border-blue-200 hover:bg-blue-100 hover:text-blue-800"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => setShowViewModal(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
        {selectedEmployee && (
          <div className="space-y-4 p-4 sm:p-5">
            {/* ── Premium Profile Hero ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">

              {/* Decorative blobs — light, subtle */}
              <div className="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl translate-x-1/3 -translate-y-1/3" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-indigo-100/50 blur-2xl -translate-x-1/4 translate-y-1/4" />

              <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-md">
                    {selectedEmployee.user?.profileImage ? (
                      <img
                        src={getFullImageUrl(selectedEmployee.user.profileImage)}
                        alt={selectedEmployee.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                        <span className="text-3xl font-black text-white select-none">
                          {(selectedEmployee.personalInfo?.firstName?.[0] || selectedEmployee.fullName?.[0] || 'E').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Status dot */}
                  <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow ${
                    (selectedEmployee.status === 'Active' || !selectedEmployee.status) ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                </div>

                {/* Main info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
                      {selectedEmployee.fullName || `${selectedEmployee.personalInfo?.firstName || ''} ${selectedEmployee.personalInfo?.lastName || ''}`.trim() || 'Employee'}
                    </h3>
                    {selectedEmployee.hasFaceRegistered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle className="h-3 w-3" />
                        Face ID
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      (selectedEmployee.status === 'Active' || !selectedEmployee.status)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      {selectedEmployee.status || 'Active'}
                    </span>
                  </div>

                  <p className="mt-0.5 text-sm font-semibold text-blue-600">
                    {selectedEmployee.workInfo?.position || selectedEmployee.workInfo?.designation || 'Employee'}
                  </p>

                  {/* Info chips row */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {/* Department */}
                    {getDepartmentName(selectedEmployee.workInfo?.department, '') && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1">
                        <Users className="h-3 w-3 text-blue-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700">{getDepartmentName(selectedEmployee.workInfo?.department, 'N/A')}</span>
                      </div>
                    )}
                    {/* Employee ID */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-700">{selectedEmployee.employeeId || selectedEmployee.user?.employeeId || 'N/A'}</span>
                    </div>
                    {/* Email */}
                    {(selectedEmployee.contactInfo?.personalEmail || selectedEmployee.user?.email) && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[160px]">{selectedEmployee.contactInfo?.personalEmail || selectedEmployee.user?.email}</span>
                      </div>
                    )}
                    {/* Phone */}
                    {selectedEmployee.contactInfo?.phone && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1">
                        <span className="text-[10px] text-slate-400">📞</span>
                        <span className="text-[11px] font-semibold text-slate-700">{selectedEmployee.contactInfo.phone}</span>
                      </div>
                    )}
                    {/* Join Date */}
                    {selectedEmployee.workInfo?.joiningDate && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1">
                        <Calendar className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700">Joined {new Date(selectedEmployee.workInfo.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                    {/* Employment Type */}
                    {selectedEmployee.workInfo?.employmentType && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-1">
                        <span className="text-[11px] font-semibold text-slate-700">{selectedEmployee.workInfo.employmentType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right-side actions (desktop) */}
                <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowViewModal(false); setShowEditModal(true); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Profile
                  </button>
                  {overviewLoading && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing data...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 p-3.5 shadow-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Employee Snapshot</h3>
                  <p className="text-[11px] font-medium text-slate-400">Role-based performance overview</p>
                </div>
                {overviewLoading && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-100">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </span>
                )}
              </div>

              {/* Horizontal scrollable stat cards */}
              <div
                className="flex gap-3 overflow-x-auto pb-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
              >
                <EmployeeOverviewCard
                  icon={Calendar}
                  title="Attendance"
                  value={overviewLoading ? '...' : `${employeeOverview?.attendance?.rate || 0}%`}
                  subtitle="Attendance rate"
                  breakdown={[
                    { label: 'Present', value: employeeOverview?.attendance?.present || 0 },
                    { label: 'Absent', value: employeeOverview?.attendance?.absent || 0 },
                    { label: 'Late', value: employeeOverview?.attendance?.late || 0 },
                    { label: 'Half Day', value: employeeOverview?.attendance?.halfDay || 0 }
                  ]}
                  progress={employeeOverview?.attendance?.rate || 0}
                  cta="View attendance"
                  tone="blue"
                  onClick={() => goToEmployeeDetailPage('/admin/attendance')}
                />
                <EmployeeOverviewCard
                  icon={Users}
                  title="Leaves"
                  value={overviewLoading ? '...' : `${employeeOverview?.leaves?.daysTaken || 0} days`}
                  subtitle="Approved days taken"
                  breakdown={[
                    { label: 'Pending', value: employeeOverview?.leaves?.pending || 0 },
                    { label: 'Approved', value: employeeOverview?.leaves?.approved || 0 },
                    { label: 'Rejected', value: employeeOverview?.leaves?.rejected || 0 },
                    { label: 'Total', value: employeeOverview?.leaves?.total || 0 }
                  ]}
                  cta="View leaves"
                  tone="amber"
                  onClick={() => goToEmployeeDetailPage('/admin/leaves')}
                />
                <EmployeeOverviewCard
                  icon={ClipboardList}
                  title="Tasks"
                  value={overviewLoading ? '...' : `${employeeOverview?.tasks?.total || 0} total`}
                  subtitle="Assigned tasks"
                  breakdown={[
                    { label: 'Active', value: employeeOverview?.tasks?.active || 0 },
                    { label: 'Completed', value: employeeOverview?.tasks?.completed || 0 },
                    { label: 'Overdue', value: employeeOverview?.tasks?.overdue || 0 },
                    { label: 'Total', value: employeeOverview?.tasks?.total || 0 }
                  ]}
                  progress={employeeOverview?.tasks?.total ? ((employeeOverview?.tasks?.completed || 0) / employeeOverview.tasks.total) * 100 : 0}
                  cta="View tasks"
                  tone="violet"
                  onClick={() => goToEmployeeDetailPage('/admin/tasks')}
                />
                {isSalesEmployee(selectedEmployee) && (
                  <>
                    <EmployeeOverviewCard
                      icon={TrendingUp}
                      title="Sales"
                      value={overviewLoading ? '...' : `${employeeOverview?.sales?.total || 0} leads`}
                      subtitle="Assigned leads"
                      breakdown={[
                        { label: 'Won', value: employeeOverview?.sales?.won || 0 },
                        { label: 'Open', value: employeeOverview?.sales?.open || 0 },
                        { label: 'Lost', value: employeeOverview?.sales?.lost || 0 },
                        { label: 'Pipeline', value: employeeOverview?.sales?.total || 0 }
                      ]}
                      progress={employeeOverview?.sales?.total ? ((employeeOverview?.sales?.won || 0) / employeeOverview.sales.total) * 100 : 0}
                      cta="View sales"
                      tone="emerald"
                      onClick={() => goToEmployeeDetailPage('/admin/sales')}
                    />
                    <EmployeeOverviewCard
                      icon={BarChart3}
                      title="Meetings"
                      value={overviewLoading ? '...' : `${employeeOverview?.meetings?.total || 0} total`}
                      subtitle="Lead meetings"
                      breakdown={[
                        { label: 'Upcoming', value: employeeOverview?.meetings?.upcoming || 0 },
                        { label: 'Done', value: employeeOverview?.meetings?.completed || 0 },
                        { label: 'Past', value: employeeOverview?.meetings?.past || 0 },
                        { label: 'Total', value: employeeOverview?.meetings?.total || 0 }
                      ]}
                      cta="View meetings"
                      tone="slate"
                      onClick={() => goToEmployeeDetailPage('/admin/sales')}
                    />
                  </>
                )}
                {isDeveloperEmployee(selectedEmployee) && (
                  <EmployeeOverviewCard
                    icon={AlertCircle}
                    title="Problems"
                    value={overviewLoading ? '...' : `${employeeOverview?.problems?.open || 0} open`}
                    subtitle="Reported problems"
                    breakdown={[
                      { label: 'Open', value: employeeOverview?.problems?.open || 0 },
                      { label: 'Resolved', value: employeeOverview?.problems?.solved || 0 }
                    ]}
                    cta="View problems"
                    tone="rose"
                    onClick={() => goToEmployeeDetailPage('/admin/problems')}
                  />
                )}
                {isHrEmployee(selectedEmployee) && (
                  <EmployeeOverviewCard
                    icon={Calendar}
                    title="Interviews"
                    value={overviewLoading ? '...' : `${employeeOverview?.interviews?.total || 0} total`}
                    subtitle="Schedules created"
                    breakdown={[
                      { label: 'Scheduled', value: employeeOverview?.interviews?.pending || 0 },
                      { label: 'Completed', value: employeeOverview?.interviews?.completed || 0 },
                      { label: 'Total', value: employeeOverview?.interviews?.total || 0 }
                    ]}
                    cta="View interviews"
                    tone="emerald"
                    onClick={() => goToEmployeeDetailPage('/admin/interviews')}
                  />
                )}
              </div>
            </section>

            {/* ── Recent Activities ─────────────────────────────────────── */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
                    <p className="text-[10px] font-medium text-slate-400">Timeline of employee actions</p>
                  </div>
                </div>
                {overviewLoading && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
                {!overviewLoading && recentActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">No recent activity</p>
                    <p className="text-xs text-slate-300">Activity will appear as the employee uses the system</p>
                  </div>
                )}
                {recentActivities.map((activity, idx) => {
                  const colorMap = {
                    blue:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 ring-blue-100' },
                    amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-amber-100' },
                    violet:  { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 ring-violet-100' },
                    emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
                    slate:   { dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 ring-slate-200' },
                    rose:    { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 ring-rose-100' }
                  };
                  const c = colorMap[activity.color] || colorMap.slate;
                  const relTime = (() => {
                    const diff = Date.now() - activity.date.getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins}m ago`;
                    if (hrs < 24) return `${hrs}h ago`;
                    if (days < 7) return `${days}d ago`;
                    return activity.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  })();
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60"
                    >
                      {/* Timeline dot + line */}
                      <div className="relative mt-1 flex shrink-0 flex-col items-center">
                        <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${c.dot}`} />
                        {idx < recentActivities.length - 1 && (
                          <span className="mt-1 h-full w-px bg-slate-100" style={{ minHeight: 20 }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${c.badge}`}>
                              {activity.label}
                            </span>
                            {activity.detail && (
                              <p className="mt-1 truncate text-[11px] text-slate-500">{activity.detail}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-300">{relTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section ref={keyDetailsRef} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Key Details</h3>
                  <p className="text-[11px] text-slate-500">A quick employee profile preview</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFullEmployeeDetails}
                  className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {showFullEmployeeDetails ? 'Show less' : 'Show more'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label>Email</label>
                  <p>{selectedEmployee.contactInfo?.personalEmail || selectedEmployee.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label>Phone</label>
                  <p>{selectedEmployee.contactInfo?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label>Joining Date</label>
                  <p>{selectedEmployee.workInfo?.joiningDate ? new Date(selectedEmployee.workInfo.joiningDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <label>Employment Type</label>
                  <p>{selectedEmployee.workInfo?.employmentType || 'N/A'}</p>
                </div>
                <div>
                  <label>Work Location</label>
                  <p>{selectedEmployee.workInfo?.workLocation || 'N/A'}</p>
                </div>
                <div>
                  <label>Status</label>
                  <p>{selectedEmployee.status || 'Active'}</p>
                </div>
              </div>
            </section>

            {showFullEmployeeDetails && (
              <>
            {/* Personal Information */}
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label>First Name</label>
                  <p>{selectedEmployee.personalInfo?.firstName || 'N/A'}</p>
                </div>
                <div>
                  <label>Last Name</label>
                  <p>{selectedEmployee.personalInfo?.lastName || 'N/A'}</p>
                </div>
                <div>
                  <label>Date of Birth</label>
                  <p>
                    {selectedEmployee.personalInfo?.dateOfBirth ? new Date(selectedEmployee.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label>Gender</label>
                  <p>{selectedEmployee.personalInfo?.gender || 'N/A'}</p>
                </div>
                <div>
                  <label>Blood Group</label>
                  <p>{selectedEmployee.personalInfo?.bloodGroup || 'N/A'}</p>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <label>Email</label>
                  <p>{selectedEmployee.contactInfo?.personalEmail || selectedEmployee.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label>Phone</label>
                  <p>{selectedEmployee.contactInfo?.phone || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Emergency Contact</h4>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <div>
                      <label>Name</label>
                      <p>{selectedEmployee.contactInfo?.emergencyContact?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label>Relationship</label>
                      <p>{selectedEmployee.contactInfo?.emergencyContact?.relationship || 'N/A'}</p>
                    </div>
                    <div>
                      <label>Phone</label>
                      <p>{selectedEmployee.contactInfo?.emergencyContact?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Position</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.workInfo?.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Department</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    {getDepartmentName(selectedEmployee.workInfo?.department, 'N/A')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Basic Salary</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    {selectedEmployee.salaryInfo?.basicSalary ? `₹${selectedEmployee.salaryInfo.basicSalary}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Joining Date</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    {selectedEmployee.workInfo?.joiningDate ? new Date(selectedEmployee.workInfo.joiningDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Employment Type</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.workInfo?.employmentType || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Work Location</label>
                  <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.workInfo?.workLocation || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            {selectedEmployee.bankInfo && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Bank Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">Account Holder Name</label>
                    <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.bankInfo?.accountHolderName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">Account Number</label>
                    <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.bankInfo?.accountNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">Bank Name</label>
                    <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.bankInfo?.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">IFSC Code</label>
                    <p className="text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">{selectedEmployee.bankInfo?.ifscCode || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-slate-600 text-lg sm:text-xl">Loading employees...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="premium-page-title text-xl sm:text-2xl md:text-3xl font-bold">Employee Management</p>
            <p className="text-slate-500 text-xs sm:text-sm">Manage your company's workforce with integrated face registration</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="premium-primary-button px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-300 flex items-center"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Add Employee
          </button>
        </div>
        {/* Filters */}
        <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <SearchWithSuggestions
              value={searchTerm}
              onChange={setSearchTerm}
              items={employees}
              getSuggestionValue={(emp) => {
                const fullName = `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.trim() || emp.user?.name || '';
                return fullName || emp.user?.email || emp.employeeId || '';
              }}
              getSuggestionTitle={(emp) => `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.trim() || emp.user?.name || 'Employee'}
              getSuggestionSubtitle={(emp) => [emp.user?.email, emp.employeeId, emp.workInfo?.position].filter(Boolean).join(' • ')}
              placeholder="Search employees..."
              className="flex-1"
              inputClassName="premium-input rounded-xl py-2 text-xs text-slate-900 sm:py-2.5 sm:text-sm md:py-3"
            />
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="premium-input pl-9 sm:pl-10 pr-7 sm:pr-8 py-2 sm:py-2.5 md:py-3 rounded-xl text-slate-900 text-xs sm:text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
          <div className="relative overflow-hidden bg-white border border-slate-100/90 rounded-xl sm:rounded-[22px] p-2.5 sm:p-4.5 lg:p-5 shadow-xs flex items-center justify-between group">
            <div className="absolute -right-5 -top-5 w-24 h-24 sm:-right-8 sm:-top-8 sm:w-44 sm:h-44 rounded-full bg-purple-100/80 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
            <div className="relative z-10 min-w-0 pr-1.5 sm:pr-2">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none mb-0.5 sm:mb-1.5 tracking-tight truncate">{employees.length}</h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate leading-snug">Total Employees</p>
            </div>
            <div className="relative z-10 shrink-0 w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#7f56d9] to-[#6941c6] shadow-md shadow-purple-500/20">
              <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white stroke-[2.2]" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-white border border-slate-100/90 rounded-xl sm:rounded-[22px] p-2.5 sm:p-4.5 lg:p-5 shadow-xs flex items-center justify-between group">
            <div className="absolute -right-5 -top-5 w-24 h-24 sm:-right-8 sm:-top-8 sm:w-44 sm:h-44 rounded-full bg-emerald-100/80 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
            <div className="relative z-10 min-w-0 pr-1.5 sm:pr-2">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none mb-0.5 sm:mb-1.5 tracking-tight truncate">
                {employees.filter(e => e.hasFaceRegistered).length}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate leading-snug">Face Registered</p>
            </div>
            <div className="relative z-10 shrink-0 w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#12b76a] to-[#039855] shadow-md shadow-emerald-500/20">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white stroke-[2.2]" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-white border border-slate-100/90 rounded-xl sm:rounded-[22px] p-2.5 sm:p-4.5 lg:p-5 shadow-xs flex items-center justify-between group">
            <div className="absolute -right-5 -top-5 w-24 h-24 sm:-right-8 sm:-top-8 sm:w-44 sm:h-44 rounded-full bg-orange-100/80 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
            <div className="relative z-10 min-w-0 pr-1.5 sm:pr-2">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none mb-0.5 sm:mb-1.5 tracking-tight truncate">
                {new Set(employees.map(e => getDepartmentName(e.workInfo?.department, '')).filter(Boolean)).size}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate leading-snug">Departments</p>
            </div>
            <div className="relative z-10 shrink-0 w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#f79009] to-[#dc6803] shadow-md shadow-orange-500/20">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white stroke-[2.2]" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-white border border-slate-100/90 rounded-xl sm:rounded-[22px] p-2.5 sm:p-4.5 lg:p-5 shadow-xs flex items-center justify-between group">
            <div className="absolute -right-5 -top-5 w-24 h-24 sm:-right-8 sm:-top-8 sm:w-44 sm:h-44 rounded-full bg-pink-100/80 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
            <div className="relative z-10 min-w-0 pr-1.5 sm:pr-2">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none mb-0.5 sm:mb-1.5 tracking-tight truncate">
                {employees.filter(e => e.status === 'Active' || !e.status).length}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate leading-snug">Active</p>
            </div>
            <div className="relative z-10 shrink-0 w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#ee46bc] to-[#c11574] shadow-md shadow-pink-500/20">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white stroke-[2.2]" />
            </div>
          </div>
        </div>
        {/* Employee Table/Cards */}
        <div className="premium-panel rounded-2xl overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden max-h-[68dvh] overflow-y-auto overscroll-contain p-3">
            <div className="grid gap-3">
            {filteredEmployees.map((employee) => (
              <div key={employee._id} onClick={(event) => openEmployeeView(event, employee)} className="bg-white border border-slate-200 rounded-xl p-3 transition-all duration-200 shadow-sm cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 active:bg-indigo-50/60">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 bg-blue-50">
                      {employee.user?.profileImage ? (
                        <img
                          src={getFullImageUrl(employee.user.profileImage)}
                          alt={employee.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-medium text-sm truncate">{employee.fullName}</p>
                      <p className="flex min-w-0 items-center text-xs text-slate-500">
                        <Mail className="mr-1 h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{employee.user?.email || employee.contactInfo?.personalEmail}</span>
                      </p>
                      <p className="text-slate-500 text-xs">ID: {employee.employeeId || employee.user?.employeeId}</p>
                    </div>
                  </div>
                  <div className="ml-1 flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowViewModal(true);
                      }}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title="View Details"
                      aria-label={`View ${employee.fullName}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowEditModal(true);
                      }}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      title="Edit"
                      aria-label={`Edit ${employee.fullName}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee._id)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                      aria-label={`Delete ${employee.fullName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex-shrink-0 text-xs text-slate-500">Position</span>
                    <span className="min-w-0 text-right text-sm font-medium text-slate-900">{employee.workInfo?.position || 'N/A'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex-shrink-0 text-xs text-slate-500">Department</span>
                    <span className="min-w-0 text-right text-sm text-slate-900">
                      {getDepartmentName(employee.workInfo?.department)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">Status</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${employee.status === 'Active' || !employee.status
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                      }`}>
                      {employee.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-4 md:p-6 text-slate-500 font-medium text-sm">Employee</th>
                    <th className="text-left p-4 md:p-6 text-slate-500 font-medium text-sm">Position</th>
                    <th className="text-left p-4 md:p-6 text-slate-500 font-medium text-sm">Department</th>

                    <th className="text-left p-4 md:p-6 text-slate-500 font-medium text-sm">Status</th>
                    <th className="text-left p-4 md:p-6 text-slate-500 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} onClick={(event) => openEmployeeView(event, employee)} className="premium-table-row border-b border-slate-100 cursor-pointer">
                      <td className="p-4 md:p-6">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 flex-shrink-0">
                            {employee.user?.profileImage ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover border border-slate-200"
                                src={getFullImageUrl(employee.user.profileImage)}
                                alt={employee.fullName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium text-sm">{employee.fullName}</p>
                            <p className="text-slate-500 text-xs flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {employee.user?.email || employee.contactInfo?.personalEmail}
                            </p>
                            <p className="text-slate-500 text-xs">ID: {employee.employeeId || employee.user?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:p-6 text-slate-900 text-sm">{employee.workInfo?.position}</td>
                      <td className="p-4 md:p-6">
                        <span className="px-2.5 py-1.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {getDepartmentName(employee.workInfo?.department)}
                        </span>
                      </td>

                      <td className="p-4 md:p-6">
                        <span className={`px-2.5 py-1.5 text-xs rounded-full ${employee.status === 'Active' || !employee.status
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          {employee.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4 md:p-6">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee._id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="p-6 sm:p-8 text-center">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-sm sm:text-base font-medium text-slate-600 mb-1 sm:mb-2">No employees found</h3>
              <p className="text-slate-500 text-xs sm:text-sm">
                {searchTerm || filterDepartment
                  ? 'Try adjusting your search filters'
                  : 'Start by adding your first employee'}
              </p>
            </div>
          )}
        </div>
        {/* Modals */}
        {showAddModal && (
          <AddEmployeeModal
            show={showAddModal}
            onClose={() => setShowAddModal(false)}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            departments={departments}
            faceRegistrationEnabled={faceRegistrationEnabled}
            setFaceRegistrationEnabled={setFaceRegistrationEnabled}
            modelsLoaded={globalModelsLoaded}
            faceDetected={faceDetected}
            isScanning={isScanning}
            capturedFaceData={capturedFaceData}
            setCapturedFaceData={setCapturedFaceData}
            capturedDescriptors={capturedDescriptors}
            setCapturedDescriptors={setCapturedDescriptors}
            posesCaptured={posesCaptured}
            setPosesCaptured={setPosesCaptured}
            videoRef={videoRef}
            canvasRef={canvasRef}
            startCamera={startCamera}
            captureCurrentPose={captureCurrentPose}
            handleCreateEmployee={handleCreateEmployee}
            handleFormNext={handleFormNext}
            resetForm={resetForm}
          />
        )}
        {showEditModal && EditModal()}
        {showViewModal && <ViewModal />}
      </div>
    </AdminLayout>
  );
};

export default EmployeeManagement;
