import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { getApiFileUrl, offerLetterAPI } from '../../utils/api';
import { allowedKeysForDepartment, getDepartmentName, normalizeDepartment } from '../../utils/departmentAccess';
import logo from '../../assets/logo.jpg';

const initialFormData = {
  employeeName: '',
  role: 'Junior MERN Stack Developer',
  joiningDate: '09 July 2026',
  companyName: 'Taruna Technology',
  location: 'Vadodara',
  duration: 'three (3) months',
  workingHours: '10:00 AM to 7:00 PM, Monday to Saturday',
  signatoryName: 'MIHIR MAKWANA',
  signatoryRole: 'Operational Manager',
  candidateId: '',
  employeeId: '',
};

const OfferLetterGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Access validation for HR
  const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  const userDept = getDepartmentName(
    localStorage.getItem('userDepartment'),
    sessionStorage.getItem('userDepartment')
  );
  const normalizedDept = normalizeDepartment(userDept);
  const isHR = userRole === 'admin' || ['hr', 'humanresources'].includes(normalizedDept);

  // States
  const [formData, setFormData] = useState(initialFormData);
  const [candidatesAndEmployees, setCandidatesAndEmployees] = useState({ employees: [], candidates: [] });
  const [offerLetters, setOfferLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'history'

  const previewRef = useRef(null);

  // Parse query params if redirected from Interviews page (e.g. ?name=John&role=React+Dev&date=2026-07-09)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qName = params.get('name');
    const qRole = params.get('role');
    const qDate = params.get('date');
    const qCandId = params.get('candidateId');

    if (qName || qRole || qDate) {
      setFormData((prev) => ({
        ...prev,
        employeeName: qName || prev.employeeName,
        role: qRole || prev.role,
        joiningDate: qDate || prev.joiningDate,
        candidateId: qCandId || prev.candidateId,
      }));
    }
  }, [location.search]);

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [candRes, lettersRes] = await Promise.all([
        offerLetterAPI.getCandidatesAndEmployees().catch(() => ({ data: { data: { employees: [], candidates: [] } } })),
        offerLetterAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);

      if (candRes.data?.success) {
        setCandidatesAndEmployees(candRes.data.data || { employees: [], candidates: [] });
      }
      if (lettersRes.data?.success) {
        setOfferLetters(lettersRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load offer letter data:', error);
      toast.error('Failed to load candidates and offer letters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHR) {
      fetchData();
    }
  }, [isHR]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPreload = (e) => {
    const val = e.target.value;
    if (!val) {
      setFormData(initialFormData);
      return;
    }

    const [type, id] = val.split(':');
    if (type === 'candidate') {
      const cand = candidatesAndEmployees.candidates.find((c) => String(c.id) === String(id));
      if (cand) {
        setFormData((prev) => ({
          ...prev,
          employeeName: cand.name || '',
          role: cand.role || prev.role,
          joiningDate: cand.joiningDate || prev.joiningDate,
          candidateId: cand.id,
          employeeId: '',
        }));
        toast.success(`Selected candidate: ${cand.name}`);
      }
    } else if (type === 'employee') {
      const emp = candidatesAndEmployees.employees.find((e) => String(e.id) === String(id));
      if (emp) {
        setFormData((prev) => ({
          ...prev,
          employeeName: emp.name || '',
          role: emp.role || prev.role,
          joiningDate: emp.joiningDate || prev.joiningDate,
          employeeId: emp.employeeId || emp.id,
          candidateId: '',
        }));
        toast.success(`Selected employee: ${emp.name}`);
      }
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();

    if (!formData.employeeName.trim()) {
      toast.error('Please enter the employee name');
      return;
    }
    if (!formData.role.trim()) {
      toast.error('Please enter the role / position');
      return;
    }
    if (!formData.joiningDate.trim()) {
      toast.error('Please enter the joining date');
      return;
    }

    try {
      setGenerating(true);
      const toastId = toast.loading('Generating official Offer Letter PDF...');

      const res = await offerLetterAPI.generate(formData);

      if (res.data?.success) {
        toast.success('Offer Letter generated successfully!', { id: toastId });

        // Add to history list
        if (res.data.data) {
          setOfferLetters((prev) => [res.data.data, ...prev]);
        }

        // Trigger download of generated PDF
        if (res.data.data?._id || res.data.data?.id) {
          const letterId = res.data.data._id || res.data.data.id;
          handleDownload(letterId, formData.employeeName);
        }
      }
    } catch (error) {
      console.error('Failed to generate offer letter:', error);
      toast.error(error.response?.data?.message || 'Failed to generate offer letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (letterId, empName) => {
    try {
      setDownloadingId(letterId);
      const res = await offerLetterAPI.download(letterId);

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (empName || 'Employee').replace(/[^a-z0-9]/gi, '_');
      link.download = `Offer_Letter_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Offer Letter PDF downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (letterId) => {
    if (!window.confirm('Are you sure you want to delete this generated offer letter record?')) {
      return;
    }

    try {
      setDeletingId(letterId);
      const res = await offerLetterAPI.delete(letterId);
      if (res.data?.success) {
        setOfferLetters((prev) => prev.filter((item) => (item._id || item.id) !== letterId));
        toast.success('Offer letter deleted');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete offer letter');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOfferLetters = useMemo(() => {
    if (!searchQuery.trim()) return offerLetters;
    const q = searchQuery.toLowerCase();
    return offerLetters.filter(
      (item) =>
        item.employeeName?.toLowerCase().includes(q) ||
        item.role?.toLowerCase().includes(q) ||
        item.joiningDate?.toLowerCase().includes(q)
    );
  }, [offerLetters, searchQuery]);

  if (!isHR) {
    return (
      <EmployeeLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">HR Module Access Restricted</h2>
          <p className="text-slate-500 max-w-md mb-6">
            The Offer Letter Generator is restricted to Human Resources personnel and Administrators only.
          </p>
          <button
            onClick={() => navigate('/employee/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="min-h-full bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Offer Letter Generator
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    HR Module
                  </span>
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Generate official Taruna Technology offer letters matching standard formatting with live preview & export.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher & Refresh */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'generator'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generator & Preview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Generated Letters ({offerLetters.length})
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Data"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Generator & Live Preview */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Candidate & Offer Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a candidate or enter details below. All standard template text will stay intact.
                </p>
              </div>

              {/* Quick Preload Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Quick Select (Candidate / Employee)</span>
                  <span className="text-[11px] font-normal text-indigo-600 lowercase">auto-fills form</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleSelectPreload}
                    className="w-full text-xs sm:text-sm pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Choose Candidate or Employee to Auto-Fill --</option>
                    {candidatesAndEmployees.candidates.length > 0 && (
                      <optgroup label="Interview Candidates">
                        {candidatesAndEmployees.candidates.map((cand) => (
                          <option key={`cand-${cand.id}`} value={`candidate:${cand.id}`}>
                            {cand.name} {cand.role ? `(${cand.role})` : ''} - [{cand.status || 'Interview'}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {candidatesAndEmployees.employees.length > 0 && (
                      <optgroup label="Employees">
                        {candidatesAndEmployees.employees.map((emp) => (
                          <option key={`emp-${emp.id}`} value={`employee:${emp.id}`}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''} {emp.employeeId ? `[${emp.employeeId}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* 1. Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    Employee / Candidate Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleChange}
                    placeholder="e.g. Sudhanshu Naik"
                    required
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in salutation: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">Dear {formData.employeeName || '[Name]'},</code>
                  </p>
                </div>

                {/* 2. Role / Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    Role / Position <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="e.g. Junior MERN Stack Developer"
                    required
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in paragraph 4: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">full-time position as a {formData.role || '[Role]'}</code>
                  </p>
                </div>

                {/* 3. Joining Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    Joining / Commencement Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    placeholder="e.g. 09 July 2026"
                    required
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in paragraph 1: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">commence on {formData.joiningDate || '[Date]'}</code>
                  </p>
                </div>

                {/* Advanced Parameters Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5" />
                      Advanced Template Options (Optional)
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Internship Duration</label>
                        <input
                          type="text"
                          name="duration"
                          value={formData.duration}
                          onChange={handleChange}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Working Hours</label>
                        <input
                          type="text"
                          name="workingHours"
                          value={formData.workingHours}
                          onChange={handleChange}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Name</label>
                          <input
                            type="text"
                            name="signatoryName"
                            value={formData.signatoryName}
                            onChange={handleChange}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Title</label>
                          <input
                            type="text"
                            name="signatoryRole"
                            value={formData.signatoryRole}
                            onChange={handleChange}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit & Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate & Download PDF
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(initialFormData)}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-sm transition"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Interactive Live PDF Preview */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-slate-900">Live WYSIWYG Template Preview</h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                    Real-time
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.7, z - 0.1))}
                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-xs font-medium text-slate-500 w-12 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, z + 0.1))}
                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <button
                    onClick={handlePrint}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                    title="Print Preview"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(true)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Offer Letter Canvas / Sheet */}
              <div className="overflow-auto bg-slate-100/80 p-4 sm:p-6 rounded-xl flex justify-center border border-slate-200">
                <div
                  ref={previewRef}
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center',
                    width: '595px',
                    minHeight: '842px',
                  }}
                  className="bg-white text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-between font-sans transition-transform duration-150 select-none rounded-sm border border-slate-200"
                >
                  {/* ── TOP RIGHT: wide diagonal pink→purple shape (matches reference) ── */}
                  {/* Back outer magenta-pink layer */}
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '260px',
                      height: '195px',
                      background: '#E91E8C',
                      clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                    }}
                  />
                  {/* Mid violet layer */}
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '190px',
                      height: '195px',
                      background: '#5B21B6',
                      clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                  {/* Dark innermost triangle */}
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '100px',
                      height: '100px',
                      background: '#2E1065',
                      clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                    }}
                  />
                  {/* Bottom ledge accent */}
                  <div
                    className="absolute top-[195px] right-0 pointer-events-none"
                    style={{
                      width: '80px',
                      height: '20px',
                      background: '#7C3AED',
                      clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                    }}
                  />

                  {/* ── TOP LEFT: small magenta corner ── */}
                  <div
                    className="absolute top-0 left-0 w-10 h-10 pointer-events-none"
                    style={{
                      background: '#E91E8C',
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    }}
                  />
                  <div
                    className="absolute top-[10px] left-0 pointer-events-none"
                    style={{
                      width: '18px',
                      height: '55px',
                      background: '#7C3AED',
                      clipPath: 'polygon(0 0, 70% 30%, 0 100%)',
                    }}
                  />

                  {/* ── BOTTOM LEFT: two overlapping magenta ribbons ── */}
                  <div
                    className="absolute bottom-0 left-0 pointer-events-none"
                    style={{
                      width: '115px',
                      height: '120px',
                      background: '#E91E8C',
                      clipPath: 'polygon(0 0, 96% 100%, 0% 100%)',
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 pointer-events-none"
                    style={{
                      width: '65px',
                      height: '65px',
                      background: '#C2185B',
                      clipPath: 'polygon(0 0, 100% 100%, 0% 100%)',
                    }}
                  />
                  {/* Thin upper accent ribbon */}
                  <div
                    className="absolute left-0 pointer-events-none"
                    style={{
                      bottom: '120px',
                      width: '22px',
                      height: '105px',
                      background: '#E91E8C',
                      clipPath: 'polygon(0 0, 100% 13%, 0 100%)',
                    }}
                  />

                  {/* ── CENTRE WATERMARK: large circuit-T logo ── */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img
                      src="/taruna_logo.png"
                      alt="Taruna Logo Watermark"
                      className="w-[460px] opacity-[0.16] object-contain select-none"
                    />
                  </div>

                  {/* Document Content */}
                  <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-5">
                    {/* Header: Logo */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={logo}
                          alt="Taruna Technology Logo"
                          className="h-14 w-auto object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div>
                          <h2 className="text-xl font-extrabold tracking-tight text-[#1E1B4B]">
                            TARUNA
                          </h2>
                          <p className="text-[9px] font-bold tracking-widest text-[#7C3AED] -mt-1">
                            TECHNOLOGY
                          </p>
                          <p className="text-[6.5px] font-semibold tracking-wider text-slate-500">
                            INSPIRING THE INTELLIGENCE
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Centered Title */}
                    <div className="text-center pt-2">
                      <h3 className="text-xl font-bold tracking-normal text-slate-950">
                        Offer Letter
                      </h3>
                    </div>

                    {/* Salutation */}
                    <div className="pt-2">
                      <p className="text-[13px] font-bold text-slate-950">
                        Dear{' '}
                        <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                          {formData.employeeName || 'Sudhanshu Naik'}
                        </span>
                        ,
                      </p>
                    </div>

                    {/* Body Paragraphs */}
                    <div className="space-y-4 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                      <p>
                        We are pleased to offer you an Internship with{' '}
                        <span className="font-semibold">{formData.companyName}</span>, {formData.location}. Your
                        internship will commence on{' '}
                        <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                          {formData.joiningDate || '09 July 2026'}
                        </span>{' '}
                        and will continue for a period of {formData.duration}. During this period, you will receive
                        practical training and hands-on experience by working on real-world projects and assigned
                        responsibilities.
                      </p>

                      <p>
                        Your working hours will be {formData.workingHours}. You are expected to maintain professionalism,
                        punctuality, and comply with all company policies and procedures throughout the internship period.
                      </p>

                      <p>
                        You shall maintain strict confidentiality regarding all company information, client data, project
                        details, and business operations. Any breach of confidentiality or company policies may result in
                        the immediate termination of the internship.
                      </p>

                      <p>
                        Upon successful completion of the internship, you will be awarded an Internship Completion
                        Certificate. Based on your performance, technical skills, dedication, and overall contribution
                        during the internship, you may also be considered for a full-time position as a{' '}
                        <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                          {formData.role || 'Junior MERN Stack Developer'}
                        </span>{' '}
                        at {formData.companyName}.
                      </p>

                      <p>
                        We are excited to welcome you to our team and look forward to supporting your professional growth.
                        We wish you a successful and rewarding internship experience with us.
                      </p>
                    </div>

                    {/* Sign-off Block */}
                    <div className="pt-4 flex justify-end">
                      <div className="text-right space-y-0.5 min-w-[180px]">
                        <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                        <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                          {formData.signatoryName || 'MIHIR MAKWANA'}
                        </p>
                        {/* Horizontal signature image placed between MIHIR MAKWANA and Operational Manager */}
                        <div className="relative h-12 flex items-center justify-end my-1">
                          <img
                            src="/sign_img.png"
                            alt="Signature"
                            className="h-12 w-auto object-contain select-none translate-x-1"
                          />
                        </div>
                        <p className="text-[11.5px] font-semibold text-slate-900">
                          {formData.signatoryRole || 'Operational Manager'}
                        </p>
                        <p className="text-[12px] font-bold text-slate-950">
                          {formData.companyName || 'Taruna Technology'}
                        </p>
                      </div>
                    </div>

                    {/* Centered Website Footer */}
                    <div className="text-center pt-6 border-t border-slate-100">
                      <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                        www.tarunatech.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Generated History Table */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Previously Generated Offer Letters</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View, download, or manage all generated offer letter records.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <p className="text-xs">Loading offer letter records...</p>
              </div>
            ) : filteredOfferLetters.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No offer letters generated yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the Generator tab above to create a new offer letter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                      <th className="px-5 py-3.5">Candidate / Employee</th>
                      <th className="px-5 py-3.5">Designated Role</th>
                      <th className="px-5 py-3.5">Joining Date</th>
                      <th className="px-5 py-3.5">Generated On</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfferLetters.map((item) => {
                      const letterId = item._id || item.id;
                      const isDeleting = deletingId === letterId;
                      const isDownloading = downloadingId === letterId;

                      return (
                        <tr key={letterId} className="hover:bg-slate-50/60 transition group">
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                                {item.employeeName?.charAt(0)?.toUpperCase() || 'E'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{item.employeeName}</p>
                                <p className="text-[10px] text-slate-400 font-normal">
                                  {item.companyName || 'Taruna Technology'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">{item.role}</td>
                          <td className="px-5 py-3.5 text-slate-700">
                            <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3 text-indigo-500" />
                              {item.joiningDate}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.status || 'Generated'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDownload(letterId, item.employeeName)}
                                disabled={isDownloading}
                                title="Download PDF"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                              >
                                {isDownloading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setFormData({
                                    ...initialFormData,
                                    employeeName: item.employeeName || '',
                                    role: item.role || '',
                                    joiningDate: item.joiningDate || '',
                                    companyName: item.companyName || initialFormData.companyName,
                                    location: item.location || initialFormData.location,
                                    duration: item.duration || initialFormData.duration,
                                    workingHours: item.workingHours || initialFormData.workingHours,
                                    signatoryName: item.signatoryName || initialFormData.signatoryName,
                                    signatoryRole: item.signatoryRole || initialFormData.signatoryRole,
                                  });
                                  setActiveTab('generator');
                                  toast.success(`Loaded ${item.employeeName} into generator`);
                                }}
                                title="Load into Editor"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(letterId)}
                                disabled={isDeleting}
                                title="Delete Record"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Preview Modal */}
        {isFullscreenPreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Fullscreen Offer Letter Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Full Document Canvas */}
              <div
                style={{
                  width: '595px',
                  minHeight: '842px',
                }}
                className="bg-white text-slate-900 shadow-lg relative overflow-hidden flex flex-col justify-between font-sans border border-slate-300"
              >
                {/* Artwork Top Right */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, #4A154B 0%, #3B0764 60%, #2E1065 100%)',
                    clipPath: 'polygon(35% 0%, 100% 0%, 100% 100%, 0% 100%)',
                  }}
                />
                {/* Top Left */}
                <div
                  className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  }}
                />
                {/* Bottom Left */}
                <div
                  className="absolute bottom-0 left-0 w-32 h-44 pointer-events-none"
                  style={{
                    background: 'linear-gradient(45deg, #E11D48 0%, #DB2777 60%, #701A75 100%)',
                    clipPath: 'polygon(0% 25%, 35% 40%, 100% 100%, 0% 100%)',
                  }}
                />

                {/* Background Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img
                    src="/taruna_logo.png"
                    alt="Taruna Logo Watermark"
                    className="w-[320px] opacity-[0.11] object-contain select-none mt-6"
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={logo}
                        alt="Taruna Technology Logo"
                        className="h-14 w-auto object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-[#1E1B4B]">
                          TARUNA
                        </h2>
                        <p className="text-[9px] font-bold tracking-widest text-[#7C3AED] -mt-1">
                          TECHNOLOGY
                        </p>
                        <p className="text-[6.5px] font-semibold tracking-wider text-slate-500">
                          INSPIRING THE INTELLIGENCE
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <h3 className="text-xl font-bold tracking-normal text-slate-950">
                      Offer Letter
                    </h3>
                  </div>

                  <div className="pt-2">
                    <p className="text-[13px] font-bold text-slate-950">
                      Dear {formData.employeeName || 'Sudhanshu Naik'},
                    </p>
                  </div>

                  <div className="space-y-4 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                    <p>
                      We are pleased to offer you an Internship with{' '}
                      <span className="font-semibold">{formData.companyName}</span>, {formData.location}. Your
                      internship will commence on{' '}
                      <span className="font-semibold">{formData.joiningDate || '09 July 2026'}</span> and will
                      continue for a period of {formData.duration}. During this period, you will receive practical
                      training and hands-on experience by working on real-world projects and assigned responsibilities.
                    </p>

                    <p>
                      Your working hours will be {formData.workingHours}. You are expected to maintain professionalism,
                      punctuality, and comply with all company policies and procedures throughout the internship period.
                    </p>

                    <p>
                      You shall maintain strict confidentiality regarding all company information, client data, project
                      details, and business operations. Any breach of confidentiality or company policies may result in
                      the immediate termination of the internship.
                    </p>

                    <p>
                      Upon successful completion of the internship, you will be awarded an Internship Completion
                      Certificate. Based on your performance, technical skills, dedication, and overall contribution
                      during the internship, you may also be considered for a full-time position as a{' '}
                      <span className="font-semibold">{formData.role || 'Junior MERN Stack Developer'}</span> at{' '}
                      {formData.companyName}.
                    </p>

                    <p>
                      We are excited to welcome you to our team and look forward to supporting your professional growth.
                      We wish you a successful and rewarding internship experience with us.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <div className="text-right space-y-0.5 min-w-[180px]">
                      <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                      <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                        {formData.signatoryName || 'MIHIR MAKWANA'}
                      </p>
                      {/* Horizontal signature image placed between MIHIR MAKWANA and Operational Manager */}
                      <div className="relative h-12 flex items-center justify-end my-1">
                        <img
                          src="/sign_img.png"
                          alt="Signature"
                          className="h-12 w-auto object-contain select-none translate-x-1"
                        />
                      </div>
                      <p className="text-[11.5px] font-semibold text-slate-900">
                        {formData.signatoryRole || 'Operational Manager'}
                      </p>
                      <p className="text-[12px] font-bold text-slate-950">
                        {formData.companyName || 'Taruna Technology'}
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-6 border-t border-slate-100">
                    <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                      www.tarunatech.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default OfferLetterGenerator;
