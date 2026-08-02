import React, { useState, useEffect, useRef } from 'react';
import { employeeAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  User,
  X,
  Save,
  UserPlus,
  Camera,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFaceRegistration } from '../../hooks/useFaceRegistration';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Face detection states
  const [currentStep, setCurrentStep] = useState(1); // 1: Employee Form, 2: Face Registration
  const [faceRegistrationEnabled, setFaceRegistrationEnabled] = useState(true);

  // Use the face registration hook
  const {
    videoRef,
    canvasRef,
    isInitialized,
    faceDetected,
    isCapturing,
    capturedFaceData,
    error: faceError,
    initialize,
    captureFace,
    reset
  } = useFaceRegistration();

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

  const departments = ['Engineering', 'Product', 'Design', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations'];
  const genders = ['Male', 'Female', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const workLocations = ['Office', 'Remote', 'Hybrid'];
  const workShifts = ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'];
  const accountTypes = ['Savings', 'Current'];

  // Fetch employees from backend
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getEmployees();
      if (response.data.success) {
        const employeeData = response.data.data?.employees || [];
        setEmployees(employeeData);
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
  }, []);

  // Initialize face detection when modal opens
  useEffect(() => {
    if (showAddModal && currentStep === 2 && faceRegistrationEnabled) {
      initialize();
    }
  }, [showAddModal, currentStep, faceRegistrationEnabled, initialize]);

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.toLowerCase();
    const userEmail = emp.user?.email?.toLowerCase() || '';
    const position = emp.workInfo?.position?.toLowerCase() || '';
    const employeeId = emp.employeeId?.toLowerCase() || emp.user?.employeeId?.toLowerCase() || '';
    
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         userEmail.includes(searchTerm.toLowerCase()) ||
                         position.includes(searchTerm.toLowerCase()) ||
                         employeeId.includes(searchTerm.toLowerCase());
    
    const empDepartment = typeof emp.workInfo?.department === 'object' 
      ? (emp.workInfo.department?._id || emp.workInfo.department?.name)
      : emp.workInfo?.department;
    const matchesDepartment = !filterDepartment || empDepartment === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Handle form submission (Step 1)
  const handleFormNext = (e) => {
    e.preventDefault();
    
    // Validate required fields
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

    if (faceRegistrationEnabled) {
      setCurrentStep(2);
    } else {
      handleCreateEmployee();
    }
  };

  // Handle face capture using the hook
  const handleCaptureFace = async () => {
    const faceData = await captureFace();
    if (faceData) {
      // Face data is already set in the hook's capturedFaceData state
      // No additional processing needed here
    }
  };

  // Handle final employee creation
  const handleCreateEmployee = async () => {
    try {
      let employeeDataWithFace = { ...newEmployee };
      
      // Add face data if captured
      if (capturedFaceData) {
        employeeDataWithFace.faceDescriptor = capturedFaceData.descriptor;
        employeeDataWithFace.faceImage = capturedFaceData.thumbnail;
        employeeDataWithFace.hasFaceRegistered = true;
      }

      const response = await employeeAPI.createEmployee(employeeDataWithFace);
      
      if (response.data.success) {
        await fetchEmployees();
        resetForm();
        setShowAddModal(false);
        
        const employeeName = `${newEmployee.personalInfo.firstName} ${newEmployee.personalInfo.lastName}`;
        toast.success(`Employee ${employeeName} added successfully${capturedFaceData ? ' with face registration' : ''}!`);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
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
    reset(); // Use the hook's reset function
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    
    try {
      const response = await employeeAPI.updateEmployee(selectedEmployee._id, selectedEmployee);
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

  const AddEmployeeModal = () => {
    const updateEmployee = (field, value, nestedField = null, subNestedField = null) => {
      if (subNestedField) {
        setNewEmployee({
          ...newEmployee,
          [field]: {
            ...newEmployee[field],
            [nestedField]: {
              ...newEmployee[field][nestedField],
              [subNestedField]: value
            }
          }
        });
      } else if (nestedField) {
        setNewEmployee({
          ...newEmployee,
          [field]: {
            ...newEmployee[field],
            [nestedField]: value
          }
        });
      } else {
        setNewEmployee({
          ...newEmployee,
          [field]: value
        });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 neon-border rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-white">Add New Employee</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= 1 ? 'bg-neon-pink text-white' : 'bg-secondary-600 text-secondary-400'
                }`}>
                  1
                </div>
                <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-neon-pink' : 'bg-secondary-600'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= 2 ? 'bg-neon-pink text-white' : 'bg-secondary-600 text-secondary-400'
                }`}>
                  2
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm text-secondary-300">
                <input
                  type="checkbox"
                  checked={faceRegistrationEnabled}
                  onChange={(e) => setFaceRegistrationEnabled(e.target.checked)}
                  className="rounded border-secondary-600 text-neon-pink focus:ring-neon-pink focus:ring-offset-0"
                />
                <span>Enable Face Registration</span>
              </label>
              <button 
                onClick={resetForm}
                className="text-secondary-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {currentStep === 1 ? (
            // Employee Form
            <form onSubmit={handleFormNext} className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={newEmployee.personalInfo.firstName}
                      onChange={(e) => updateEmployee('personalInfo', e.target.value, 'firstName')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={newEmployee.personalInfo.lastName}
                      onChange={(e) => updateEmployee('personalInfo', e.target.value, 'lastName')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      value={newEmployee.personalInfo.dateOfBirth}
                      onChange={(e) => updateEmployee('personalInfo', e.target.value, 'dateOfBirth')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Gender *</label>
                    <select
                      value={newEmployee.personalInfo.gender}
                      onChange={(e) => updateEmployee('personalInfo', e.target.value, 'gender')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    >
                      <option value="">Select Gender</option>
                      {genders.map(gender => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Blood Group</label>
                    <select
                      value={newEmployee.personalInfo.bloodGroup}
                      onChange={(e) => updateEmployee('personalInfo', e.target.value, 'bloodGroup')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
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
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newEmployee.contactInfo.personalEmail}
                      onChange={(e) => updateEmployee('contactInfo', e.target.value, 'personalEmail')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={newEmployee.contactInfo.phone}
                      onChange={(e) => updateEmployee('contactInfo', e.target.value, 'phone')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-white mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-300 mb-2">Name *</label>
                        <input
                          type="text"
                          value={newEmployee.contactInfo.emergencyContact.name}
                          onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'name')}
                          className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-300 mb-2">Relationship *</label>
                        <input
                          type="text"
                          value={newEmployee.contactInfo.emergencyContact.relationship}
                          onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'relationship')}
                          className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-300 mb-2">Phone *</label>
                        <input
                          type="tel"
                          value={newEmployee.contactInfo.emergencyContact.phone}
                          onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'phone')}
                          className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Position *</label>
                    <input
                      type="text"
                      value={newEmployee.workInfo.position}
                      onChange={(e) => updateEmployee('workInfo', e.target.value, 'position')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Department *</label>
                    <select
                      value={newEmployee.workInfo.department}
                      onChange={(e) => updateEmployee('workInfo', e.target.value, 'department')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Basic Salary *</label>
                    <input
                      type="number"
                      value={newEmployee.salaryInfo.basicSalary}
                      onChange={(e) => updateEmployee('salaryInfo', parseFloat(e.target.value) || 0, 'basicSalary')}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
                >
                  {faceRegistrationEnabled ? 'Next: Face Registration' : 'Create Employee'}
                </button>
              </div>
            </form>
          ) : (
            // Face Registration Step
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">
                  Face Registration for {newEmployee.personalInfo.firstName} {newEmployee.personalInfo.lastName}
                </h3>
                <p className="text-secondary-400">Position your face in the frame to capture biometric data</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Camera Feed */}
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
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
                    
                    {!isInitialized && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink mx-auto mb-2"></div>
                          <p>Initializing camera and face models...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary-800/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                      <span className="text-sm text-secondary-400">
                        {faceError ? `Error: ${faceError}` : 
                         !isInitialized ? 'Initializing camera...' :
                         faceDetected ? 'Face detected - Ready to capture' : 
                         'No face detected - Position face in frame'}
                      </span>
                    </div>
                    <div className="text-xs text-secondary-500">
                      {isInitialized ? 'Ready' : 'Loading...'}
                    </div>
                  </div>
                </div>

                {/* Instructions & Actions */}
                <div className="space-y-6">
                  {/* Captured Face Preview */}
                  {capturedFaceData && (
                    <div className="bg-secondary-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">Face Captured Successfully</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <img 
                          src={capturedFaceData.thumbnail} 
                          alt="Captured face"
                          className="w-16 h-16 rounded-lg object-cover border border-secondary-600"
                        />
                        <div className="text-sm">
                          <p className="text-white">Confidence: {capturedFaceData.confidence}%</p>
                          <p className="text-secondary-400">Descriptor: 128 dimensions</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Face Registration Guidelines</h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-white">Good Lighting</p>
                          <p className="text-secondary-400">Ensure face is well-lit and clearly visible</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-white">Center Your Face</p>
                          <p className="text-secondary-400">Look directly at camera with neutral expression</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-white">No Obstructions</p>
                          <p className="text-secondary-400">Remove glasses, hats, or face coverings</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!capturedFaceData ? (
                    <button
                      onClick={handleCaptureFace}
                      disabled={!faceDetected || isCapturing || !isInitialized}
                      className="w-full py-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-5 h-5" />
                      <span>{isCapturing ? 'Capturing Face...' : 'Capture Face'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={reset}
                      className="w-full py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Recapture Face</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateEmployee}
                  className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Create Employee {capturedFaceData ? 'with Face Data' : ''}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // View Modal (existing)
  const ViewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 neon-border rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Employee Details</h2>
          <button 
            onClick={() => setShowViewModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-secondary-800/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedEmployee.fullName}</h3>
                <p className="text-neon-pink">{selectedEmployee.workInfo?.position}</p>
                <p className="text-secondary-400">{typeof selectedEmployee.workInfo?.department === 'object' ? selectedEmployee.workInfo.department?.name : selectedEmployee.workInfo?.department}</p>
                <p className="text-secondary-400 text-sm">ID: {selectedEmployee.employeeId || selectedEmployee.user?.employeeId}</p>
                {selectedEmployee.hasFaceRegistered && (
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-400/20 text-green-400 mt-1">
                    Face Registered
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Edit Modal (simplified version)
  const EditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 neon-border rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Employee</h2>
          <button 
            onClick={() => setShowEditModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleEditEmployee}>
          <div className="text-center py-8">
            <p className="text-secondary-400">Edit functionality simplified for this demo</p>
          </div>
          <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
            >
              Update Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading employees...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-white">Employee Management</p>
            <p className="text-secondary-400">Manage your company's workforce with integrated face registration</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>

        {/* Filters */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="pl-10 pr-8 py-3 bg-secondary-100 border border-secondary-100 rounded-lg text-black focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{employees.length}</h3>
                <p className="text-secondary-400">Total Employees</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {employees.filter(e => e.hasFaceRegistered).length}
                </h3>
                <p className="text-secondary-400">Face Registered</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {new Set(employees.map(e => e.workInfo?.department).filter(Boolean)).size}
                </h3>
                <p className="text-secondary-400">Departments</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {employees.filter(e => e.status === 'Active' || !e.status).length}
                </h3>
                <p className="text-secondary-400">Active</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-secondary-700">
                <tr>
                  <th className="text-left p-6 text-secondary-300 font-medium">Employee</th>
                  <th className="text-left p-6 text-secondary-300 font-medium">Position</th>
                  <th className="text-left p-6 text-secondary-300 font-medium">Department</th>
                  <th className="text-left p-6 text-secondary-300 font-medium">Face Status</th>
                  <th className="text-left p-6 text-secondary-300 font-medium">Status</th>
                  <th className="text-left p-6 text-secondary-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{employee.fullName}</p>
                          <p className="text-secondary-400 text-sm flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {employee.user?.email || employee.contactInfo?.personalEmail}
                          </p>
                          <p className="text-secondary-400 text-xs">ID: {employee.employeeId || employee.user?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-white">{employee.workInfo?.position}</td>
                    <td className="p-6">
                      <span className="px-3 py-1 text-xs rounded-full bg-secondary-700 text-secondary-300">
                        {typeof employee.workInfo?.department === 'object' ? employee.workInfo.department?.name : employee.workInfo?.department}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1 w-fit ${
                        employee.hasFaceRegistered
                          ? 'bg-green-400/20 text-green-400' 
                          : 'bg-yellow-400/20 text-yellow-400'
                      }`}>
                        <Camera className="w-3 h-3" />
                        <span>{employee.hasFaceRegistered ? 'Registered' : 'Pending'}</span>
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        employee.status === 'Active' || !employee.status
                          ? 'bg-green-400/20 text-green-400' 
                          : 'bg-red-400/20 text-red-400'
                      }`}>
                        {employee.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee._id)}
                          className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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

          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No employees found</h3>
              <p className="text-secondary-500">
                {searchTerm || filterDepartment 
                  ? 'Try adjusting your search filters' 
                  : 'Start by adding your first employee'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddEmployeeModal />}
      {showEditModal && <EditModal />}
      {showViewModal && <ViewModal />}
    </AdminLayout>
  );
};

export default EmployeeManagement;