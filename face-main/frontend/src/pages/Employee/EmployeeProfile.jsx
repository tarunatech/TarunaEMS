import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Save, Camera, CreditCard, DollarSign, FileText, MapPin, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { authAPI, getApiFileUrl } from '../../utils/api';

const EmployeeProfile = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    employeeId: '',
    joiningDate: '',
    profileImage: '',
    // Detailed sections
    personalInfo: {},
    contactInfo: {},
    workInfo: {},
    bankInfo: {},
    salaryInfo: {},
    documents: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      if (response.data.success) {
        const userData = response.data.data.user;
        const employeeData = response.data.data.employee;

        const savedProfileImage = userData.profileImage || employeeData?.user?.profileImage || '';

        setProfile({
          name: userData.name || (employeeData?.personalInfo ? `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}` : '') || localStorage.getItem('userName') || '',
          email: userData.email || employeeData?.contactInfo?.personalEmail || localStorage.getItem('userEmail') || '',
          phone: userData.phone || employeeData?.contactInfo?.phone || '',
          department: employeeData?.workInfo?.department?.name || localStorage.getItem('userDepartment') || '',
          employeeId: userData.employeeId || employeeData?.employeeId || localStorage.getItem('employeeId') || '',
          joiningDate: employeeData?.workInfo?.joiningDate || '',
          profileImage: savedProfileImage,
          position: employeeData?.workInfo?.position || '',
          // Detailed sections mapping
          personalInfo: employeeData?.personalInfo || {},
          contactInfo: employeeData?.contactInfo || {},
          workInfo: employeeData?.workInfo || {},
          bankInfo: employeeData?.bankInfo || {},
          salaryInfo: employeeData?.salaryInfo || {},
          documents: employeeData?.documents || {}
        });
        if (savedProfileImage) {
          localStorage.setItem('userImage', savedProfileImage);
          sessionStorage.setItem('userImage', savedProfileImage);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile({
        name: localStorage.getItem('userName') || 'Employee',
        email: localStorage.getItem('userEmail') || '',
        phone: '',
        department: localStorage.getItem('userDepartment') || '',
        position: '',
        employeeId: localStorage.getItem('employeeId') || '',
        joiningDate: '',
        profileImage: localStorage.getItem('userImage') || ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({
        name: profile.name,
        phone: profile.phone
      });
      toast.success('Profile updated successfully');
      localStorage.setItem('userName', profile.name);
      // Refresh profile data to show updated values
      await fetchProfile();
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    const toastId = toast.loading('Uploading image...');
    try {
      const response = await authAPI.updateProfileImage(formData);
      if (response.data.success) {
        toast.success('Profile picture updated', { id: toastId });
        const newImagePath = response.data.data.profileImage;
        setProfile(prev => ({ ...prev, profileImage: newImagePath }));
        localStorage.setItem('userImage', newImagePath);
        sessionStorage.setItem('userImage', newImagePath);
        window.dispatchEvent(new CustomEvent('profile-image-updated', {
          detail: { profileImage: newImagePath }
        }));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  const getFullImageUrl = (path) => getApiFileUrl(path) || null;

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="employee-profile-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 mt-1">View and update your information</p>
        </div>

        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 mb-8 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_20px_44px_rgba(30,64,175,0.12)]">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_16px_32px_rgba(79,70,229,0.28)] ring-4 ring-blue-100/80">
                {profile.profileImage ? (
                  <img
                    src={getFullImageUrl(profile.profileImage)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setProfile(prev => ({ ...prev, profileImage: '' }))}
                  />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <label
                htmlFor="profile-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full flex items-center justify-center border-2 border-[#F8FAFC] hover:scale-105 transition-all duration-200 cursor-pointer shadow-lg"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="profile-upload"
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
              <p className="text-sm text-slate-500">{profile.position || 'Employee'}</p>
              {profile.employeeId && (
                <p className="text-xs text-indigo-600 mt-1 font-semibold">ID: {profile.employeeId}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Information */}
          <section className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">First Name</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.firstName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Last Name</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.lastName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Date of Birth</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.dateOfBirth ? new Date(profile.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Gender</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.gender || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Blood Group</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.bloodGroup || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nationality</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.personalInfo?.nationality || 'Indian'}
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]">
            <div className="flex items-center space-x-3 mb-6">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Official Email</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 overflow-hidden text-ellipsis transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Personal Email</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 overflow-hidden text-ellipsis transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.contactInfo?.personalEmail || 'N/A'}
                </p>
              </div>
              <div>
                <form onSubmit={handleSubmit}>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Phone Number (Editable)</label>
                  <div className="flex space-x-2">
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      className="flex-1 p-3 bg-[#F1F5F9] border border-blue-100/70 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-200"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl shadow-[0_12px_24px_rgba(79,70,229,0.24)] hover:shadow-[0_16px_30px_rgba(79,70,229,0.30)] transition-all duration-200 disabled:opacity-50"
                    >
                      {saving ? '...' : <Save className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Alternate Phone</label>
                <p className="text-slate-900 p-3 bg-[#F1F5F9] rounded-xl border border-blue-100/70 transition-all duration-200 hover:border-indigo-200 hover:bg-blue-50">
                  {profile.contactInfo?.alternatePhone || 'N/A'}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="mt-8 pt-8 border-t border-blue-100/80">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                Address Details
              </h4>
              <div className="p-4 bg-[#F1F5F9] border border-blue-100/70 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Street</label>
                  <p className="text-sm text-slate-900">{profile.contactInfo?.address?.street || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">City & State</label>
                  <p className="text-sm text-slate-900">
                    {profile.contactInfo?.address?.city || 'N/A'}, {profile.contactInfo?.address?.state || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Pincode & Country</label>
                  <p className="text-sm text-slate-900">
                    {profile.contactInfo?.address?.pincode || 'N/A'}, {profile.contactInfo?.address?.country || 'India'}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-8 pt-8 border-t border-blue-100/80">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-indigo-600" />
                Emergency Contact
              </h4>
              <div className="p-4 bg-[#F1F5F9] border border-blue-100/70 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <p className="text-sm text-slate-900">{profile.contactInfo?.emergencyContact?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Relationship</label>
                  <p className="text-sm text-slate-900">{profile.contactInfo?.emergencyContact?.relationship || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                  <p className="text-sm text-slate-900">{profile.contactInfo?.emergencyContact?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Bank Information */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">Bank Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Account Holder</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.accountHolderName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Bank Name</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.bankName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Account Number</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.accountNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">IFSC Code</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.ifscCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Branch Name</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.branchName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Account Type</p>
                <p className="text-slate-900 font-medium">{profile.bankInfo?.accountType || 'Savings'}</p>
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]">
            <div className="flex items-center space-x-3 mb-6">
              <DollarSign className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">Salary Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Basic Salary</p>
                <p className="text-slate-900 font-medium">
                  {profile.salaryInfo?.currency || 'INR'} {profile.salaryInfo?.basicSalary?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Pay Frequency</p>
                <p className="text-slate-900 font-medium">{profile.salaryInfo?.payFrequency || 'Monthly'}</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#F8FAFC] p-6 mb-12 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]">
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">Additional Details</h2>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Notes from Admin</p>
                <div className="p-4 bg-[#F1F5F9] border border-blue-100/70 rounded-xl text-slate-600">
                  {profile.personalInfo?.notes || 'No notes provided.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Employment Type</p>
                  <p className="text-slate-900 font-medium">{profile.workInfo?.employmentType || 'Full-time'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Work Location</p>
                  <p className="text-slate-900 font-medium">{profile.workInfo?.workLocation || 'Office'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Work Shift</p>
                  <p className="text-slate-900 font-medium">{profile.workInfo?.workShift || 'Morning'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Reporting Manager</p>
                  <p className="text-slate-900 font-medium">
                    {profile.workInfo?.reportingManager
                      ? `${profile.workInfo.reportingManager.personalInfo?.firstName} ${profile.workInfo.reportingManager.personalInfo?.lastName}`
                      : 'Not Assigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeProfile;
