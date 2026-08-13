import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Camera, CreditCard, DollarSign, FileText, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { authAPI, getApiFileUrl } from '../../utils/api';

const ProfileField = ({ label, value, editable = true, type = 'text', onChange, options }) => (
  <div>
    <label className="mb-1 block text-[12px] font-semibold text-slate-500">{label}</label>
    {editable ? (
      options ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
        >
          <option value="">Select</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
        />
      )
    ) : (
      <p className="flex h-10 items-center overflow-hidden text-ellipsis rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-600">
        {value || 'N/A'}
      </p>
    )}
  </div>
);

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

  const handleNestedChange = (section, path, value) => {
    setProfile(prev => {
      const nextSection = { ...(prev[section] || {}) };
      if (path.length === 1) {
        nextSection[path[0]] = value;
      } else {
        nextSection[path[0]] = {
          ...(nextSection[path[0]] || {}),
          [path[1]]: value
        };
      }

      const nextProfile = { ...prev, [section]: nextSection };
      if (section === 'personalInfo' && ['firstName', 'lastName'].includes(path[0])) {
        nextProfile.name = `${nextProfile.personalInfo?.firstName || ''} ${nextProfile.personalInfo?.lastName || ''}`.trim();
      }
      if (section === 'contactInfo' && path[0] === 'phone') {
        nextProfile.phone = value;
      }
      return nextProfile;
    });
  };

  const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        personalInfo: {
          firstName: profile.personalInfo?.firstName || '',
          lastName: profile.personalInfo?.lastName || '',
          dateOfBirth: profile.personalInfo?.dateOfBirth || null,
          gender: profile.personalInfo?.gender || '',
          bloodGroup: profile.personalInfo?.bloodGroup || '',
          nationality: profile.personalInfo?.nationality || ''
        },
        contactInfo: {
          phone: profile.phone,
          personalEmail: profile.contactInfo?.personalEmail || '',
          alternatePhone: profile.contactInfo?.alternatePhone || '',
          address: profile.contactInfo?.address || {},
          emergencyContact: profile.contactInfo?.emergencyContact || {}
        },
        bankInfo: profile.bankInfo || {}
      });
      toast.success('Profile updated successfully');
      localStorage.setItem('userName', profile.name);
      localStorage.setItem('userEmail', profile.email);
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
      <div className="employee-profile-page mx-auto max-w-5xl bg-[#F8FAFC] px-3 sm:px-5 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">View and update your information</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="employee-profile-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.24)] transition-all hover:shadow-[0_16px_30px_rgba(79,70,229,0.30)] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="relative mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-[0_12px_24px_rgba(79,70,229,0.22)] ring-4 ring-blue-100/80">
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
              <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
              <p className="text-sm text-slate-500">{profile.position || 'Employee'}</p>
              {profile.employeeId && (
                <p className="text-xs text-indigo-600 mt-1 font-semibold">ID: {profile.employeeId}</p>
              )}
            </div>
          </div>
        </div>

        <form id="employee-profile-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ProfileField label="First Name" value={profile.personalInfo?.firstName} onChange={(value) => handleNestedChange('personalInfo', ['firstName'], value)} />
              <ProfileField label="Last Name" value={profile.personalInfo?.lastName} onChange={(value) => handleNestedChange('personalInfo', ['lastName'], value)} />
              <ProfileField label="Date of Birth" type="date" value={formatDateInput(profile.personalInfo?.dateOfBirth)} onChange={(value) => handleNestedChange('personalInfo', ['dateOfBirth'], value)} />
              <ProfileField label="Gender" value={profile.personalInfo?.gender} options={['Male', 'Female', 'Other']} onChange={(value) => handleNestedChange('personalInfo', ['gender'], value)} />
              <ProfileField label="Blood Group" value={profile.personalInfo?.bloodGroup} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(value) => handleNestedChange('personalInfo', ['bloodGroup'], value)} />
              <ProfileField label="Nationality" value={profile.personalInfo?.nationality || 'Indian'} onChange={(value) => handleNestedChange('personalInfo', ['nationality'], value)} />
            </div>
          </section>

          {/* Contact Information */}
          <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center space-x-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">Contact Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileField label="Official Email" value={profile.email} editable={false} onChange={() => {}} />
              <ProfileField label="Personal Email" type="email" value={profile.contactInfo?.personalEmail} onChange={(value) => handleNestedChange('contactInfo', ['personalEmail'], value)} />
              <ProfileField label="Phone Number" type="tel" value={profile.phone} onChange={(value) => handleNestedChange('contactInfo', ['phone'], value)} />
              <ProfileField label="Alternate Phone" type="tel" value={profile.contactInfo?.alternatePhone} onChange={(value) => handleNestedChange('contactInfo', ['alternatePhone'], value)} />
            </div>

            {/* Address */}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-slate-700">
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                Address Details
              </h4>
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ProfileField label="Street" value={profile.contactInfo?.address?.street} onChange={(value) => handleNestedChange('contactInfo', ['address', 'street'], value)} />
                </div>
                <ProfileField label="City" value={profile.contactInfo?.address?.city} onChange={(value) => handleNestedChange('contactInfo', ['address', 'city'], value)} />
                <ProfileField label="State" value={profile.contactInfo?.address?.state} onChange={(value) => handleNestedChange('contactInfo', ['address', 'state'], value)} />
                <ProfileField label="Pincode" value={profile.contactInfo?.address?.pincode} onChange={(value) => handleNestedChange('contactInfo', ['address', 'pincode'], value)} />
                <ProfileField label="Country" value={profile.contactInfo?.address?.country || 'India'} onChange={(value) => handleNestedChange('contactInfo', ['address', 'country'], value)} />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-slate-700">
                <Phone className="w-4 h-4 mr-2 text-indigo-600" />
                Emergency Contact
              </h4>
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
                <ProfileField label="Name" value={profile.contactInfo?.emergencyContact?.name} onChange={(value) => handleNestedChange('contactInfo', ['emergencyContact', 'name'], value)} />
                <ProfileField label="Relationship" value={profile.contactInfo?.emergencyContact?.relationship} onChange={(value) => handleNestedChange('contactInfo', ['emergencyContact', 'relationship'], value)} />
                <ProfileField label="Phone" type="tel" value={profile.contactInfo?.emergencyContact?.phone} onChange={(value) => handleNestedChange('contactInfo', ['emergencyContact', 'phone'], value)} />
              </div>
            </div>
          </section>

          {/* Bank Information */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Bank Information</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ProfileField label="Account Holder" value={profile.bankInfo?.accountHolderName} onChange={(value) => handleNestedChange('bankInfo', ['accountHolderName'], value)} />
              <ProfileField label="Bank Name" value={profile.bankInfo?.bankName} onChange={(value) => handleNestedChange('bankInfo', ['bankName'], value)} />
              <ProfileField label="Account Number" value={profile.bankInfo?.accountNumber} onChange={(value) => handleNestedChange('bankInfo', ['accountNumber'], value)} />
              <ProfileField label="IFSC Code" value={profile.bankInfo?.ifscCode} onChange={(value) => handleNestedChange('bankInfo', ['ifscCode'], value.toUpperCase())} />
              <ProfileField label="Branch Name" value={profile.bankInfo?.branchName} onChange={(value) => handleNestedChange('bankInfo', ['branchName'], value)} />
              <ProfileField label="Account Type" value={profile.bankInfo?.accountType || 'Savings'} options={['Savings', 'Current', 'Salary']} onChange={(value) => handleNestedChange('bankInfo', ['accountType'], value)} />
            </div>
          </div>

          {/* Salary Information */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Salary Information</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold text-slate-500">Basic Salary</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">
                  {profile.salaryInfo?.currency || 'INR'} {profile.salaryInfo?.basicSalary?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-slate-500">Pay Frequency</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">{profile.salaryInfo?.payFrequency || 'Monthly'}</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="relative mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Additional Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-500">Notes from Admin</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                  {profile.personalInfo?.notes || 'No notes provided.'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[12px] font-semibold text-slate-500">Employment Type</p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">{profile.workInfo?.employmentType || 'Full-time'}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-500">Work Location</p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">{profile.workInfo?.workLocation || 'Office'}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-500">Work Shift</p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">{profile.workInfo?.workShift || 'Morning'}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-500">Reporting Manager</p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900">
                    {profile.workInfo?.reportingManager
                      ? `${profile.workInfo.reportingManager.personalInfo?.firstName} ${profile.workInfo.reportingManager.personalInfo?.lastName}`
                      : 'Not Assigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeProfile;
