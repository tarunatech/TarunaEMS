import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
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

const getTodayFormatted = () => {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const initialOfferFormData = {
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

const initialCompletionFormData = {
  employeeName: '',
  role: 'Junior MERN Stack Developer',
  employmentType: 'Internship',
  joiningDate: '09 July 2026',
  completionDate: '09 October 2026',
  letterDate: getTodayFormatted(),
  companyName: 'Taruna Technology',
  location: 'Vadodara',
  signatoryName: 'MIHIR MAKWANA',
  signatoryRole: 'Operational Manager',
  candidateId: '',
  employeeId: '',
};

const initialExperienceFormData = {
  employeeName: '',
  role: 'Junior MERN Stack Developer',
  department: 'Engineering',
  joiningDate: '09 July 2025',
  lastWorkingDate: '09 July 2026',
  letterDate: getTodayFormatted(),
  companyName: 'Taruna Technology',
  location: 'Vadodara',
  signatoryName: 'MIHIR MAKWANA',
  signatoryRole: 'Operational Manager',
  candidateId: '',
  employeeId: '',
};

const initialRelievingFormData = {
  employeeName: '',
  role: 'Junior MERN Stack Developer',
  relievingDate: getTodayFormatted(),
  lastWorkingDate: getTodayFormatted(),
  letterDate: getTodayFormatted(),
  companyName: 'Taruna Technology',
  location: 'Vadodara',
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

  // Active section: 'offer' | 'completion' | 'experience' | 'relieving' | 'history'
  const [activeTab, setActiveTab] = useState('offer');

  // Form states
  const [offerFormData, setOfferFormData] = useState(initialOfferFormData);
  const [completionFormData, setCompletionFormData] = useState(initialCompletionFormData);
  const [experienceFormData, setExperienceFormData] = useState(initialExperienceFormData);
  const [relievingFormData, setRelievingFormData] = useState(initialRelievingFormData);

  // Common and History states
  const [candidatesAndEmployees, setCandidatesAndEmployees] = useState({ employees: [], candidates: [] });
  const [lettersList, setLettersList] = useState([]);
  const [historyFilterType, setHistoryFilterType] = useState('all'); // 'all' | 'offer' | 'completion' | 'experience' | 'relieving'
  const [loading, setLoading] = useState(true);
  const [generatingOffer, setGeneratingOffer] = useState(false);
  const [generatingCompletion, setGeneratingCompletion] = useState(false);
  const [generatingExperience, setGeneratingExperience] = useState(false);
  const [generatingRelieving, setGeneratingRelieving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedOffer, setShowAdvancedOffer] = useState(false);
  const [showAdvancedCompletion, setShowAdvancedCompletion] = useState(false);
  const [showAdvancedExperience, setShowAdvancedExperience] = useState(false);
  const [showAdvancedRelieving, setShowAdvancedRelieving] = useState(false);
  
  // Responsive initial preview zoom: 0.52 on mobile (<640px) so 595px canvas fits on 320-390px screens
  const [previewZoom, setPreviewZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 0.52 : 1));
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  const previewRef = useRef(null);

  // Adjust default zoom on window resize if user didn't zoom manually
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPreviewZoom((prev) => (prev > 0.7 ? 0.52 : prev));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse query params if redirected from Interviews page (e.g. ?name=John&role=React+Dev&date=2026-07-09)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qName = params.get('name');
    const qRole = params.get('role');
    const qDate = params.get('date');
    const qCandId = params.get('candidateId');
    const qType = params.get('type');

    if (qType === 'completion') {
      setActiveTab('completion');
    } else if (qType === 'experience') {
      setActiveTab('experience');
    } else if (qType === 'relieving') {
      setActiveTab('relieving');
    }

    if (qName || qRole || qDate) {
      setOfferFormData((prev) => ({
        ...prev,
        employeeName: qName || prev.employeeName,
        role: qRole || prev.role,
        joiningDate: qDate || prev.joiningDate,
        candidateId: qCandId || prev.candidateId,
      }));

      setCompletionFormData((prev) => ({
        ...prev,
        employeeName: qName || prev.employeeName,
        role: qRole || prev.role,
        joiningDate: qDate || prev.joiningDate,
        candidateId: qCandId || prev.candidateId,
      }));

      setExperienceFormData((prev) => ({
        ...prev,
        employeeName: qName || prev.employeeName,
        role: qRole || prev.role,
        joiningDate: qDate || prev.joiningDate,
        candidateId: qCandId || prev.candidateId,
      }));

      setRelievingFormData((prev) => ({
        ...prev,
        employeeName: qName || prev.employeeName,
        role: qRole || prev.role,
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
        setLettersList(lettersRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load letter data:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHR) {
      fetchData();
    }
  }, [isHR]);

  // Offer Letter Form Handlers
  const handleOfferChange = (e) => {
    const { name, value } = e.target;
    setOfferFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferSelectPreload = (e) => {
    const val = e.target.value;
    if (!val) {
      setOfferFormData(initialOfferFormData);
      return;
    }

    const [type, id] = val.split(':');
    if (type === 'candidate') {
      const cand = candidatesAndEmployees.candidates.find((c) => String(c.id) === String(id));
      if (cand) {
        setOfferFormData((prev) => ({
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
        setOfferFormData((prev) => ({
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

  const handleGenerateOffer = async (e) => {
    e?.preventDefault();

    if (!offerFormData.employeeName.trim()) {
      toast.error('Please enter the employee name');
      return;
    }
    if (!offerFormData.role.trim()) {
      toast.error('Please enter the role / position');
      return;
    }
    if (!offerFormData.joiningDate.trim()) {
      toast.error('Please enter the joining date');
      return;
    }

    try {
      setGeneratingOffer(true);
      const toastId = toast.loading('Generating official Offer Letter PDF...');

      const res = await offerLetterAPI.generate(offerFormData);

      if (res.data?.success) {
        toast.success('Offer Letter generated successfully!', { id: toastId });

        if (res.data.data) {
          setLettersList((prev) => [res.data.data, ...prev]);
        }

        if (res.data.data?._id || res.data.data?.id) {
          const letterId = res.data.data._id || res.data.data.id;
          handleDownload(letterId, offerFormData.employeeName, 'Offer_Letter');
        }
      }
    } catch (error) {
      console.error('Failed to generate offer letter:', error);
      toast.error(error.response?.data?.message || 'Failed to generate offer letter');
    } finally {
      setGeneratingOffer(false);
    }
  };

  // Completion Letter Form Handlers
  const handleCompletionChange = (e) => {
    const { name, value } = e.target;
    setCompletionFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompletionSelectPreload = (e) => {
    const val = e.target.value;
    if (!val) {
      setCompletionFormData(initialCompletionFormData);
      return;
    }

    const [type, id] = val.split(':');
    if (type === 'candidate') {
      const cand = candidatesAndEmployees.candidates.find((c) => String(c.id) === String(id));
      if (cand) {
        setCompletionFormData((prev) => ({
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
        setCompletionFormData((prev) => ({
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

  const handleGenerateCompletion = async (e) => {
    e?.preventDefault();

    if (!completionFormData.employeeName.trim()) {
      toast.error('Please enter the employee name');
      return;
    }
    if (!completionFormData.role.trim()) {
      toast.error('Please enter the role / position');
      return;
    }
    if (!completionFormData.joiningDate.trim()) {
      toast.error('Please enter the joining date');
      return;
    }
    if (!completionFormData.completionDate.trim()) {
      toast.error('Please enter the completion date');
      return;
    }

    try {
      setGeneratingCompletion(true);
      const toastId = toast.loading('Generating official Completion Letter PDF...');

      const res = await offerLetterAPI.generateCompletion(completionFormData);

      if (res.data?.success) {
        toast.success('Completion Letter generated successfully!', { id: toastId });

        if (res.data.data) {
          setLettersList((prev) => [res.data.data, ...prev]);
        }

        if (res.data.data?._id || res.data.data?.id) {
          const letterId = res.data.data._id || res.data.data.id;
          handleDownload(letterId, completionFormData.employeeName, 'Completion_Letter');
        }
      }
    } catch (error) {
      console.error('Failed to generate completion letter:', error);
      toast.error(error.response?.data?.message || 'Failed to generate completion letter');
    } finally {
      setGeneratingCompletion(false);
    }
  };

  // Experience Letter Form Handlers
  const handleExperienceChange = (e) => {
    const { name, value } = e.target;
    setExperienceFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExperienceSelectPreload = (e) => {
    const val = e.target.value;
    if (!val) {
      setExperienceFormData(initialExperienceFormData);
      return;
    }

    const [type, id] = val.split(':');
    if (type === 'candidate') {
      const cand = candidatesAndEmployees.candidates.find((c) => String(c.id) === String(id));
      if (cand) {
        setExperienceFormData((prev) => ({
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
        setExperienceFormData((prev) => ({
          ...prev,
          employeeName: emp.name || '',
          role: emp.role || prev.role,
          department: emp.department || prev.department,
          joiningDate: emp.joiningDate || prev.joiningDate,
          lastWorkingDate: prev.lastWorkingDate || getTodayFormatted(),
          employeeId: emp.employeeId || emp.id,
          candidateId: '',
        }));
        toast.success(`Selected employee: ${emp.name}`);
      }
    }
  };

  const handleGenerateExperience = async (e) => {
    e?.preventDefault();

    if (!experienceFormData.employeeName.trim()) {
      toast.error('Please enter the employee name');
      return;
    }
    if (!experienceFormData.role.trim()) {
      toast.error('Please enter the role / position');
      return;
    }
    if (!experienceFormData.department.trim()) {
      toast.error('Please enter the department');
      return;
    }
    if (!experienceFormData.joiningDate.trim()) {
      toast.error('Please enter the joining date');
      return;
    }
    if (!experienceFormData.lastWorkingDate.trim()) {
      toast.error('Please enter the last working date');
      return;
    }

    try {
      setGeneratingExperience(true);
      const toastId = toast.loading('Generating official Experience Letter PDF...');

      const res = await offerLetterAPI.generateExperience(experienceFormData);

      if (res.data?.success) {
        toast.success('Experience Letter generated successfully!', { id: toastId });

        if (res.data.data) {
          setLettersList((prev) => [res.data.data, ...prev]);
        }

        if (res.data.data?._id || res.data.data?.id) {
          const letterId = res.data.data._id || res.data.data.id;
          handleDownload(letterId, experienceFormData.employeeName, 'Experience_Letter');
        }
      }
    } catch (error) {
      console.error('Failed to generate experience letter:', error);
      toast.error(error.response?.data?.message || 'Failed to generate experience letter');
    } finally {
      setGeneratingExperience(false);
    }
  };

  // Relieving Letter Form Handlers
  const handleRelievingChange = (e) => {
    const { name, value } = e.target;
    setRelievingFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRelievingSelectPreload = (e) => {
    const val = e.target.value;
    if (!val) {
      setRelievingFormData(initialRelievingFormData);
      return;
    }

    const [type, id] = val.split(':');
    if (type === 'candidate') {
      const cand = candidatesAndEmployees.candidates.find((c) => String(c.id) === String(id));
      if (cand) {
        setRelievingFormData((prev) => ({
          ...prev,
          employeeName: cand.name || '',
          role: cand.role || prev.role,
          candidateId: cand.id,
          employeeId: '',
        }));
        toast.success(`Selected candidate: ${cand.name}`);
      }
    } else if (type === 'employee') {
      const emp = candidatesAndEmployees.employees.find((e) => String(e.id) === String(id));
      if (emp) {
        setRelievingFormData((prev) => ({
          ...prev,
          employeeName: emp.name || '',
          role: emp.role || prev.role,
          relievingDate: prev.relievingDate || getTodayFormatted(),
          lastWorkingDate: prev.lastWorkingDate || getTodayFormatted(),
          employeeId: emp.employeeId || emp.id,
          candidateId: '',
        }));
        toast.success(`Selected employee: ${emp.name}`);
      }
    }
  };

  const handleGenerateRelieving = async (e) => {
    e?.preventDefault();

    if (!relievingFormData.employeeName.trim()) {
      toast.error('Please enter the employee name');
      return;
    }
    if (!relievingFormData.role.trim()) {
      toast.error('Please enter the role / position');
      return;
    }
    if (!relievingFormData.relievingDate.trim()) {
      toast.error('Please enter the relieving date');
      return;
    }
    if (!relievingFormData.lastWorkingDate.trim()) {
      toast.error('Please enter the last working date');
      return;
    }

    try {
      setGeneratingRelieving(true);
      const toastId = toast.loading('Generating official Relieving Letter PDF...');

      const res = await offerLetterAPI.generateRelieving(relievingFormData);

      if (res.data?.success) {
        toast.success('Relieving Letter generated successfully!', { id: toastId });

        if (res.data.data) {
          setLettersList((prev) => [res.data.data, ...prev]);
        }

        if (res.data.data?._id || res.data.data?.id) {
          const letterId = res.data.data._id || res.data.data.id;
          handleDownload(letterId, relievingFormData.employeeName, 'Relieving_Letter');
        }
      }
    } catch (error) {
      console.error('Failed to generate relieving letter:', error);
      toast.error(error.response?.data?.message || 'Failed to generate relieving letter');
    } finally {
      setGeneratingRelieving(false);
    }
  };

  // Download Handler
  const handleDownload = async (letterId, empName, defaultPrefix = 'Letter') => {
    try {
      setDownloadingId(letterId);
      const res = await offerLetterAPI.download(letterId);

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (empName || 'Employee').replace(/[^a-z0-9]/gi, '_');
      link.download = `${defaultPrefix}_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF document downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete Handler
  const handleDelete = async (letterId) => {
    if (!window.confirm('Are you sure you want to delete this generated letter record?')) {
      return;
    }

    try {
      setDeletingId(letterId);
      const res = await offerLetterAPI.delete(letterId);
      if (res.data?.success) {
        setLettersList((prev) => prev.filter((item) => (item._id || item.id) !== letterId));
        toast.success('Letter record deleted');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete letter');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered History
  const filteredLetters = useMemo(() => {
    let result = lettersList;
    if (historyFilterType === 'offer') {
      result = result.filter((item) => (item.letterType || 'offer') === 'offer');
    } else if (historyFilterType === 'completion') {
      result = result.filter((item) => item.letterType === 'completion');
    } else if (historyFilterType === 'experience') {
      result = result.filter((item) => item.letterType === 'experience');
    } else if (historyFilterType === 'relieving') {
      result = result.filter((item) => item.letterType === 'relieving');
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (item) =>
        item.employeeName?.toLowerCase().includes(q) ||
        item.role?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.joiningDate?.toLowerCase().includes(q) ||
        item.completionDate?.toLowerCase().includes(q) ||
        item.relievingDate?.toLowerCase().includes(q) ||
        item.lastWorkingDate?.toLowerCase().includes(q)
    );
  }, [lettersList, historyFilterType, searchQuery]);

  const countOffers = useMemo(() => {
    return lettersList.filter((item) => (item.letterType || 'offer') === 'offer').length;
  }, [lettersList]);

  const countCompletions = useMemo(() => {
    return lettersList.filter((item) => item.letterType === 'completion').length;
  }, [lettersList]);

  const countExperiences = useMemo(() => {
    return lettersList.filter((item) => item.letterType === 'experience').length;
  }, [lettersList]);

  const countRelievings = useMemo(() => {
    return lettersList.filter((item) => item.letterType === 'relieving').length;
  }, [lettersList]);

  if (!isHR) {
    return (
      <EmployeeLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">HR Module Access Restricted</h2>
          <p className="text-slate-500 max-w-md mb-6">
            The Letter Generation Module is restricted to Human Resources personnel and Administrators only.
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
      <div className="min-h-full bg-slate-50/70 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200 flex items-center justify-center">
                <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                    Letters & Document Generation
                  </h1>
                  <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0 whitespace-nowrap">
                    HR Module
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Generate official Taruna Technology offer letters, completion certificates, experience letters, and relieving letters with live preview & instant PDF export.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher & Refresh */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="flex-1 md:flex-initial flex overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner gap-1">
              <button
                onClick={() => setActiveTab('offer')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'offer'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Offer Letter</span>
              </button>

              <button
                onClick={() => setActiveTab('completion')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'completion'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Completion Letter</span>
              </button>

              <button
                onClick={() => setActiveTab('experience')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'experience'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Experience Letter</span>
              </button>

              <button
                onClick={() => setActiveTab('relieving')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'relieving'
                    ? 'bg-white text-violet-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span>Relieving Letter</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Archive ({lettersList.length})</span>
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Data"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl border border-slate-200 md:border-transparent transition shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: OFFER LETTER GENERATOR                                      */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'offer' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Offer Letter Details</h2>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 whitespace-nowrap">
                  Template: Offer Letter
                </span>
              </div>

              {/* Quick Preload Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-1">
                  <span>Quick Select (Candidate / Employee)</span>
                  <span className="text-[11px] font-normal text-indigo-600 lowercase">auto-fills form</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleOfferSelectPreload}
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

              <form onSubmit={handleGenerateOffer} className="space-y-4">
                {/* 1. Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Employee / Candidate Name</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={offerFormData.employeeName}
                    onChange={handleOfferChange}
                    placeholder="e.g. Sudhanshu Naik"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in salutation: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded break-all">Dear {offerFormData.employeeName || '[Name]'},</code>
                  </p>
                </div>

                {/* 2. Role / Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Role / Position</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={offerFormData.role}
                    onChange={handleOfferChange}
                    placeholder="e.g. Junior MERN Stack Developer"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in paragraph 4: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded break-all">full-time position as a {offerFormData.role || '[Role]'}</code>
                  </p>
                </div>

                {/* 3. Joining Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Joining / Commencement Date</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="joiningDate"
                    value={offerFormData.joiningDate}
                    onChange={handleOfferChange}
                    placeholder="e.g. 09 July 2026"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in paragraph 1: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded break-all">commence on {offerFormData.joiningDate || '[Date]'}</code>
                  </p>
                </div>

                {/* Advanced Parameters Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOffer(!showAdvancedOffer)}
                    className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Advanced Template Options (Optional)</span>
                    </span>
                    {showAdvancedOffer ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>

                  {showAdvancedOffer && (
                    <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Internship Duration</label>
                        <input
                          type="text"
                          name="duration"
                          value={offerFormData.duration}
                          onChange={handleOfferChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Working Hours</label>
                        <input
                          type="text"
                          name="workingHours"
                          value={offerFormData.workingHours}
                          onChange={handleOfferChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={offerFormData.location}
                          onChange={handleOfferChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Name</label>
                          <input
                            type="text"
                            name="signatoryName"
                            value={offerFormData.signatoryName}
                            onChange={handleOfferChange}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Title</label>
                          <input
                            type="text"
                            name="signatoryRole"
                            value={offerFormData.signatoryRole}
                            onChange={handleOfferChange}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
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
                    disabled={generatingOffer}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-200 transition active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  >
                    {generatingOffer ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Generate & Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOfferFormData(initialOfferFormData)}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs sm:text-sm transition"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Interactive Offer Letter Preview */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Offer Letter Live Preview</h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Real-time
                  </span>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewZoom(window.innerWidth < 640 ? 0.52 : 1)}
                    className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                    title="Fit to screen"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-slate-600 w-11 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />
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

              {/* Offer Letter Canvas Responsive Scroll Container */}
              <div className="overflow-x-auto bg-slate-100/80 p-2 sm:p-6 rounded-xl flex justify-center border border-slate-200">
                <div
                  style={{
                    width: `${595 * previewZoom}px`,
                    height: `${842 * previewZoom}px`,
                  }}
                  className="relative shrink-0 overflow-hidden"
                >
                  <div
                    ref={previewRef}
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: '595px',
                      height: '842px',
                    }}
                    className="bg-white text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-between font-sans transition-transform duration-150 select-none rounded-sm border border-slate-200"
                  >
                    {/* Top-Right Artwork */}
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '260px',
                        height: '195px',
                        background: '#E91E8C',
                        clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '190px',
                        height: '195px',
                        background: '#5B21B6',
                        clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '100px',
                        height: '100px',
                        background: '#2E1065',
                        clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-[195px] right-0 pointer-events-none"
                      style={{
                        width: '80px',
                        height: '20px',
                        background: '#7C3AED',
                        clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                      }}
                    />

                    {/* Top-Left Artwork */}
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

                    {/* Bottom-Left Artwork */}
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

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <img
                        src="/taruna_logo.png"
                        alt="Taruna Logo Watermark"
                        className="w-[460px] opacity-[0.16] object-contain select-none"
                      />
                    </div>

                    {/* Document Content */}
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-5">
                      {/* Header */}
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
                            {offerFormData.employeeName || 'Sudhanshu Naik'}
                          </span>
                          ,
                        </p>
                      </div>

                      {/* Body Paragraphs */}
                      <div className="space-y-4 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          We are pleased to offer you an Internship with{' '}
                          <span className="font-semibold">{offerFormData.companyName}</span>, {offerFormData.location}. Your
                          internship will commence on{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {offerFormData.joiningDate || '09 July 2026'}
                          </span>{' '}
                          and will continue for a period of {offerFormData.duration}. During this period, you will receive
                          practical training and hands-on experience by working on real-world projects and assigned
                          responsibilities.
                        </p>

                        <p>
                          Your working hours will be {offerFormData.workingHours}. You are expected to maintain professionalism,
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
                            {offerFormData.role || 'Junior MERN Stack Developer'}
                          </span>{' '}
                          at {offerFormData.companyName}.
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
                            {offerFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {offerFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {offerFormData.companyName || 'Taruna Technology'}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: COMPLETION LETTER GENERATOR                                  */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'completion' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Employee Completion Letter Details</h2>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
                  Template: Completion Letter
                </span>
              </div>

              {/* Quick Preload Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-1">
                  <span>Quick Select (Employee / Candidate)</span>
                  <span className="text-[11px] font-normal text-emerald-600 lowercase">auto-fills form</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleCompletionSelectPreload}
                    className="w-full text-xs sm:text-sm pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Choose Employee or Candidate to Auto-Fill --</option>
                    {candidatesAndEmployees.employees.length > 0 && (
                      <optgroup label="Employees">
                        {candidatesAndEmployees.employees.map((emp) => (
                          <option key={`emp-comp-${emp.id}`} value={`employee:${emp.id}`}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''} {emp.employeeId ? `[${emp.employeeId}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {candidatesAndEmployees.candidates.length > 0 && (
                      <optgroup label="Interview Candidates">
                        {candidatesAndEmployees.candidates.map((cand) => (
                          <option key={`cand-comp-${cand.id}`} value={`candidate:${cand.id}`}>
                            {cand.name} {cand.role ? `(${cand.role})` : ''} - [{cand.status || 'Interview'}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <form onSubmit={handleGenerateCompletion} className="space-y-4">
                {/* 1. Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Employee Name</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={completionFormData.employeeName}
                    onChange={handleCompletionChange}
                    placeholder="e.g. Sudhanshu Naik"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded break-all">To, {completionFormData.employeeName || '[Name]'}</code> &{' '}
                    <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded break-all">Dear {completionFormData.employeeName || '[Name]'},</code>
                  </p>
                </div>

                {/* 2. Role / Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Designated Role</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={completionFormData.role}
                    onChange={handleCompletionChange}
                    placeholder="e.g. Junior MERN Stack Developer"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Subject: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded break-all">Completion Letter – {completionFormData.role || '[Role]'}</code>
                  </p>
                </div>

                {/* 3. Employment / Tenure Type */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Engagement Type</span> <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      {['Internship', 'Employment', 'Probation Period', 'Apprenticeship'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCompletionFormData((prev) => ({ ...prev, employmentType: type }))}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                            completionFormData.employmentType === type
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    name="employmentType"
                    value={completionFormData.employmentType}
                    onChange={handleCompletionChange}
                    placeholder="e.g. Internship, Employment, Probation period"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded break-all">completed their {completionFormData.employmentType || '[Type]'} as a...</code>
                  </p>
                </div>

                {/* 4. Joining Date & Completion Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>From (Joining Date)</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="joiningDate"
                      value={completionFormData.joiningDate}
                      onChange={handleCompletionChange}
                      placeholder="e.g. 09 July 2026"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>To (Completion Date)</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="completionDate"
                      value={completionFormData.completionDate}
                      onChange={handleCompletionChange}
                      placeholder="e.g. 09 October 2026"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* 5. Letter Issue Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Letter Issue Date</span>
                  </label>
                  <input
                    type="text"
                    name="letterDate"
                    value={completionFormData.letterDate}
                    onChange={handleCompletionChange}
                    placeholder="e.g. 21 October 2026"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears at top: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded break-all">Date: {completionFormData.letterDate || getTodayFormatted()}</code>
                  </p>
                </div>

                {/* Advanced Parameters Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCompletion(!showAdvancedCompletion)}
                    className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Signatory & Company Details (Optional)</span>
                    </span>
                    {showAdvancedCompletion ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>

                  {showAdvancedCompletion && (
                    <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Company Name</label>
                        <input
                          type="text"
                          name="companyName"
                          value={completionFormData.companyName}
                          onChange={handleCompletionChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Company Location</label>
                        <input
                          type="text"
                          name="location"
                          value={completionFormData.location}
                          onChange={handleCompletionChange}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Name</label>
                          <input
                            type="text"
                            name="signatoryName"
                            value={completionFormData.signatoryName}
                            onChange={handleCompletionChange}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Signatory Title</label>
                          <input
                            type="text"
                            name="signatoryRole"
                            value={completionFormData.signatoryRole}
                            onChange={handleCompletionChange}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
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
                    disabled={generatingCompletion}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-200 transition active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  >
                    {generatingCompletion ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Completion PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Generate & Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletionFormData(initialCompletionFormData)}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs sm:text-sm transition"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Interactive Completion Letter Preview */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Completion Letter Live Preview</h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Real-time
                  </span>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewZoom(window.innerWidth < 640 ? 0.52 : 1)}
                    className="px-2 py-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                    title="Fit to screen"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-slate-600 w-11 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />
                  <button
                    onClick={handlePrint}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                    title="Print Preview"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(true)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Completion Letter Canvas Responsive Scroll Container */}
              <div className="overflow-x-auto bg-slate-100/80 p-2 sm:p-6 rounded-xl flex justify-center border border-slate-200">
                <div
                  style={{
                    width: `${595 * previewZoom}px`,
                    height: `${842 * previewZoom}px`,
                  }}
                  className="relative shrink-0 overflow-hidden"
                >
                  <div
                    ref={previewRef}
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: '595px',
                      height: '842px',
                    }}
                    className="bg-white text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-between font-sans transition-transform duration-150 select-none rounded-sm border border-slate-200"
                  >
                    {/* Top-Right Artwork */}
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '260px',
                        height: '195px',
                        background: '#E91E8C',
                        clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '190px',
                        height: '195px',
                        background: '#5B21B6',
                        clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '100px',
                        height: '100px',
                        background: '#2E1065',
                        clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-[195px] right-0 pointer-events-none"
                      style={{
                        width: '80px',
                        height: '20px',
                        background: '#7C3AED',
                        clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                      }}
                    />

                    {/* Top-Left Artwork */}
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

                    {/* Bottom-Left Artwork */}
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

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <img
                        src="/taruna_logo.png"
                        alt="Taruna Logo Watermark"
                        className="w-[460px] opacity-[0.16] object-contain select-none"
                      />
                    </div>

                    {/* Document Body */}
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
                      {/* Header: Company Logo */}
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

                      {/* Centered Document Title */}
                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          COMPLETION LETTER
                        </h3>
                      </div>

                      {/* Date */}
                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: <span className="font-semibold">{completionFormData.letterDate || getTodayFormatted()}</span>
                        </p>
                      </div>

                      {/* To Section */}
                      <div className="space-y-0.5">
                        <p className="text-[12px] font-bold text-slate-900">To,</p>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.employeeName || 'Sudhanshu Naik'}
                          </span>
                        </p>
                      </div>

                      {/* Subject */}
                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Subject: Completion Letter –{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.role || 'Junior MERN Stack Developer'}
                          </span>
                        </p>
                      </div>

                      {/* Salutation */}
                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Dear{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.employeeName || 'Sudhanshu Naik'}
                          </span>
                          ,
                        </p>
                      </div>

                      {/* Standard Template Paragraphs */}
                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to certify that{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.employeeName || 'Sudhanshu Naik'}
                          </span>{' '}
                          has successfully completed their{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.employmentType || 'Internship'}
                          </span>{' '}
                          as a{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.role || 'Junior MERN Stack Developer'}
                          </span>{' '}
                          at {completionFormData.companyName || 'Taruna Technology'}, {completionFormData.location || 'Vadodara'}, from{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.joiningDate || '09 July 2026'}
                          </span>{' '}
                          to{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {completionFormData.completionDate || '09 October 2026'}
                          </span>
                          .
                        </p>

                        <p>
                          During this period, they were involved in assigned responsibilities and organizational activities related to their role. We appreciate their dedication, efforts, and contribution to the organization throughout their tenure.
                        </p>

                        <p>
                          We thank them for their association with {completionFormData.companyName || 'Taruna Technology'} and wish them continued success in their future professional endeavors.
                        </p>

                        <p>
                          This letter is issued upon completion of their tenure with the organization for official and professional reference purposes.
                        </p>
                      </div>

                      {/* Sign-off Block */}
                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {completionFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {completionFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {completionFormData.companyName || 'Taruna Technology'}
                          </p>
                        </div>
                      </div>

                      {/* Centered Website Footer */}
                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: EXPERIENCE LETTER GENERATOR                                  */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'experience' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Experience Letter Details</h2>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0 whitespace-nowrap">
                  Template: Experience Letter
                </span>
              </div>

              {/* Quick Preload Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-1">
                  <span>Quick Select (Employee / Candidate)</span>
                  <span className="text-[11px] font-normal text-blue-600 lowercase">auto-fills form</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleExperienceSelectPreload}
                    className="w-full text-xs sm:text-sm pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Choose Employee or Candidate to Auto-Fill --</option>
                    {candidatesAndEmployees.employees.length > 0 && (
                      <optgroup label="Employees">
                        {candidatesAndEmployees.employees.map((emp) => (
                          <option key={`emp-exp-${emp.id}`} value={`employee:${emp.id}`}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''} {emp.department ? `[${emp.department}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {candidatesAndEmployees.candidates.length > 0 && (
                      <optgroup label="Interview Candidates">
                        {candidatesAndEmployees.candidates.map((cand) => (
                          <option key={`cand-exp-${cand.id}`} value={`candidate:${cand.id}`}>
                            {cand.name} {cand.role ? `(${cand.role})` : ''} - [{cand.status || 'Interview'}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <form onSubmit={handleGenerateExperience} className="space-y-4">
                {/* 1. Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Employee Name</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={experienceFormData.employeeName}
                    onChange={handleExperienceChange}
                    placeholder="e.g. Sudhanshu Naik"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded break-all">This is to certify that {experienceFormData.employeeName || '[Name]'} was employed...</code>
                  </p>
                </div>

                {/* 2. Role / Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Role / Position</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={experienceFormData.role}
                    onChange={handleExperienceChange}
                    placeholder="e.g. Junior MERN Stack Developer"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears as: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded break-all">as a {experienceFormData.role || '[Role]'} in the...</code>
                  </p>
                </div>

                {/* 3. Department */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Department</span> <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      {['Engineering', 'Development', 'Designing', 'Sales', 'HR'].map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setExperienceFormData((prev) => ({ ...prev, department: dept }))}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                            experienceFormData.department === dept
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    name="department"
                    value={experienceFormData.department}
                    onChange={handleExperienceChange}
                    placeholder="e.g. Engineering, Web Development, Design"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded break-all">in the {experienceFormData.department || '[Department]'} department</code>
                  </p>
                </div>

                {/* 4. Joining Date & Last Working Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Joining Date (From)</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="joiningDate"
                      value={experienceFormData.joiningDate}
                      onChange={handleExperienceChange}
                      placeholder="e.g. 09 July 2025"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Last Working Date (To)</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastWorkingDate"
                      value={experienceFormData.lastWorkingDate}
                      onChange={handleExperienceChange}
                      placeholder="e.g. 09 July 2026"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* 5. Letter Issue Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Letter Issue Date</span>
                  </label>
                  <input
                    type="text"
                    name="letterDate"
                    value={experienceFormData.letterDate}
                    onChange={handleExperienceChange}
                    placeholder="e.g. 21 October 2026"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears at top: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded break-all">Date: {experienceFormData.letterDate || getTodayFormatted()}</code>
                  </p>
                </div>

                {/* Advanced Parameters Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedExperience(!showAdvancedExperience)}
                    className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Signatory & Company Details (Optional)</span>
                    </span>
                    {showAdvancedExperience ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>

                  {showAdvancedExperience && (
                    <div className="space-y-3 pt-2 text-xs border-t border-dashed border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Authorized Signatory Name</label>
                          <input
                            type="text"
                            name="signatoryName"
                            value={experienceFormData.signatoryName}
                            onChange={handleExperienceChange}
                            placeholder="e.g. MIHIR MAKWANA"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Signatory Designation</label>
                          <input
                            type="text"
                            name="signatoryRole"
                            value={experienceFormData.signatoryRole}
                            onChange={handleExperienceChange}
                            placeholder="e.g. Operational Manager"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Company Name</label>
                          <input
                            type="text"
                            name="companyName"
                            value={experienceFormData.companyName}
                            onChange={handleExperienceChange}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Office Location</label>
                          <input
                            type="text"
                            name="location"
                            value={experienceFormData.location}
                            onChange={handleExperienceChange}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExperienceFormData(initialExperienceFormData)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={generatingExperience}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    {generatingExperience ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Generating Official PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Generate & Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Interactive Experience Letter Preview */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Experience Letter Live Preview</h2>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Real-time
                  </span>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewZoom(window.innerWidth < 640 ? 0.52 : 1)}
                    className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                    title="Fit to screen"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-slate-600 w-11 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />
                  <button
                    onClick={handlePrint}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    title="Print Preview"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(true)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Scroll Container */}
              <div className="overflow-x-auto bg-slate-100/80 p-2 sm:p-6 rounded-xl flex justify-center border border-slate-200">
                <div
                  style={{
                    width: `${595 * previewZoom}px`,
                    height: `${842 * previewZoom}px`,
                  }}
                  className="relative shrink-0 overflow-hidden"
                >
                  <div
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: '595px',
                      height: '842px',
                    }}
                    className="bg-white text-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between font-sans border border-slate-200 select-text"
                  >
                    {/* Top-Right Artwork */}
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '260px',
                        height: '195px',
                        background: '#E91E8C',
                        clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '190px',
                        height: '195px',
                        background: '#5B21B6',
                        clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '100px',
                        height: '100px',
                        background: '#2E1065',
                        clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-[195px] right-0 pointer-events-none"
                      style={{
                        width: '80px',
                        height: '20px',
                        background: '#7C3AED',
                        clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                      }}
                    />

                    {/* Top-Left Artwork */}
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

                    {/* Bottom-Left Artwork */}
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

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <img
                        src="/taruna_logo.png"
                        alt="Taruna Logo Watermark"
                        className="w-[460px] opacity-[0.16] object-contain select-none"
                      />
                    </div>

                    {/* Document Body */}
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
                      {/* Header: Company Logo */}
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

                      {/* Centered Document Title */}
                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          EXPERIENCE LETTER
                        </h3>
                      </div>

                      {/* Date */}
                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: <span className="font-semibold">{experienceFormData.letterDate || getTodayFormatted()}</span>
                        </p>
                      </div>

                      {/* TO WHOM IT MAY CONCERN */}
                      <div className="pt-1">
                        <p className="text-[12.5px] font-bold text-slate-950 uppercase tracking-wide">
                          TO WHOM IT MAY CONCERN
                        </p>
                      </div>

                      {/* Body Paragraphs */}
                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to certify that{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {experienceFormData.employeeName || 'Sudhanshu Naik'}
                          </span>{' '}
                          was employed with {experienceFormData.companyName || 'Taruna Technology'}, Vadodara, as a{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {experienceFormData.role || 'Junior MERN Stack Developer'}
                          </span>{' '}
                          in the{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {experienceFormData.department || 'Engineering'}
                          </span>{' '}
                          department from{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {experienceFormData.joiningDate || '09 July 2025'}
                          </span>{' '}
                          to{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {experienceFormData.lastWorkingDate || '09 July 2026'}
                          </span>
                          .
                        </p>

                        <p>
                          During their tenure with the organization, they were responsible for duties and responsibilities associated with their position. Their role involved contributing to assigned projects, collaborating with team members, and supporting the organization's operational objectives.
                        </p>

                        <p>
                          We appreciate their contributions during their association with {experienceFormData.companyName || 'Taruna Technology'} and wish them success in their future professional endeavors.
                        </p>

                        <p>
                          This letter is issued upon request for official and professional reference purposes.
                        </p>
                      </div>

                      {/* Sign-off Block */}
                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {experienceFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {experienceFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {experienceFormData.companyName || 'Taruna Technology'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600">
                            Vadodara, Gujarat, India
                          </p>
                        </div>
                      </div>

                      {/* Centered Website Footer */}
                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 4: RELIEVING LETTER GENERATOR                                   */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'relieving' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Relieving Letter Details</h2>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 shrink-0 whitespace-nowrap">
                  Template: Relieving Letter
                </span>
              </div>

              {/* Quick Preload Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-1">
                  <span>Quick Select (Employee / Candidate)</span>
                  <span className="text-[11px] font-normal text-violet-600 lowercase">auto-fills form</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleRelievingSelectPreload}
                    className="w-full text-xs sm:text-sm pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Choose Employee or Candidate to Auto-Fill --</option>
                    {candidatesAndEmployees.employees.length > 0 && (
                      <optgroup label="Employees">
                        {candidatesAndEmployees.employees.map((emp) => (
                          <option key={`emp-rel-${emp.id}`} value={`employee:${emp.id}`}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''} {emp.employeeId ? `[${emp.employeeId}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {candidatesAndEmployees.candidates.length > 0 && (
                      <optgroup label="Interview Candidates">
                        {candidatesAndEmployees.candidates.map((cand) => (
                          <option key={`cand-rel-${cand.id}`} value={`candidate:${cand.id}`}>
                            {cand.name} {cand.role ? `(${cand.role})` : ''} - [{cand.status || 'Interview'}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <form onSubmit={handleGenerateRelieving} className="space-y-4">
                {/* 1. Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>Employee Name</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={relievingFormData.employeeName}
                    onChange={handleRelievingChange}
                    placeholder="e.g. Sudhanshu Naik"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded break-all">To, {relievingFormData.employeeName || '[Name]'}</code> &{' '}
                    <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded break-all">Dear {relievingFormData.employeeName || '[Name]'},</code>
                  </p>
                </div>

                {/* 2. Role / Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>Position / Role</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={relievingFormData.role}
                    onChange={handleRelievingChange}
                    placeholder="e.g. Junior MERN Stack Developer"
                    required
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears in: <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded break-all">from the position of {relievingFormData.role || '[Role]'} at...</code>
                  </p>
                </div>

                {/* 3. Relieving Date & Last Working Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span>Relieving Date (Effective)</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="relievingDate"
                      value={relievingFormData.relievingDate}
                      onChange={handleRelievingChange}
                      placeholder="e.g. 09 July 2026"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                    />
                    <p className="text-[10px] text-slate-400">
                      relieved with effect from date
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span>Last Working Day</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastWorkingDate"
                      value={relievingFormData.lastWorkingDate}
                      onChange={handleRelievingChange}
                      placeholder="e.g. 09 July 2026"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                    />
                    <p className="text-[10px] text-slate-400">
                      last working day with organization
                    </p>
                  </div>
                </div>

                {/* 4. Letter Issue Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>Letter Issue Date</span>
                  </label>
                  <input
                    type="text"
                    name="letterDate"
                    value={relievingFormData.letterDate}
                    onChange={handleRelievingChange}
                    placeholder="e.g. 21 October 2026"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears at top: <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded break-all">Date: {relievingFormData.letterDate || getTodayFormatted()}</code>
                  </p>
                </div>

                {/* Advanced Parameters Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedRelieving(!showAdvancedRelieving)}
                    className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-600 hover:text-violet-600 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Signatory & Company Details (Optional)</span>
                    </span>
                    {showAdvancedRelieving ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>

                  {showAdvancedRelieving && (
                    <div className="space-y-3 pt-2 text-xs border-t border-dashed border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Authorized Signatory Name</label>
                          <input
                            type="text"
                            name="signatoryName"
                            value={relievingFormData.signatoryName}
                            onChange={handleRelievingChange}
                            placeholder="e.g. MIHIR MAKWANA"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Signatory Designation</label>
                          <input
                            type="text"
                            name="signatoryRole"
                            value={relievingFormData.signatoryRole}
                            onChange={handleRelievingChange}
                            placeholder="e.g. Operational Manager"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Company Name</label>
                          <input
                            type="text"
                            name="companyName"
                            value={relievingFormData.companyName}
                            onChange={handleRelievingChange}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Office Location</label>
                          <input
                            type="text"
                            name="location"
                            value={relievingFormData.location}
                            onChange={handleRelievingChange}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRelievingFormData(initialRelievingFormData)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={generatingRelieving}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-violet-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    {generatingRelieving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Generating Official PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Generate & Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Interactive Relieving Letter Preview */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-600 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Relieving Letter Live Preview</h2>
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Real-time
                  </span>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewZoom(window.innerWidth < 640 ? 0.52 : 1)}
                    className="px-2 py-1 text-slate-600 hover:text-violet-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                    title="Fit to screen"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-slate-600 w-11 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />
                  <button
                    onClick={handlePrint}
                    className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-slate-100 rounded-lg transition"
                    title="Print Preview"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(true)}
                    className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-slate-100 rounded-lg transition"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Scroll Container */}
              <div className="overflow-x-auto bg-slate-100/80 p-2 sm:p-6 rounded-xl flex justify-center border border-slate-200">
                <div
                  style={{
                    width: `${595 * previewZoom}px`,
                    height: `${842 * previewZoom}px`,
                  }}
                  className="relative shrink-0 overflow-hidden"
                >
                  <div
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: '595px',
                      height: '842px',
                    }}
                    className="bg-white text-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between font-sans border border-slate-200 select-text"
                  >
                    {/* Top-Right Artwork */}
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '260px',
                        height: '195px',
                        background: '#E91E8C',
                        clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '190px',
                        height: '195px',
                        background: '#5B21B6',
                        clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-0 right-0 pointer-events-none"
                      style={{
                        width: '100px',
                        height: '100px',
                        background: '#2E1065',
                        clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                      }}
                    />
                    <div
                      className="absolute top-[195px] right-0 pointer-events-none"
                      style={{
                        width: '80px',
                        height: '20px',
                        background: '#7C3AED',
                        clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                      }}
                    />

                    {/* Top-Left Artwork */}
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

                    {/* Bottom-Left Artwork */}
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

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <img
                        src="/taruna_logo.png"
                        alt="Taruna Logo Watermark"
                        className="w-[460px] opacity-[0.16] object-contain select-none"
                      />
                    </div>

                    {/* Document Body */}
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
                      {/* Header: Company Logo */}
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

                      {/* Centered Document Title */}
                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          RELIEVING LETTER
                        </h3>
                      </div>

                      {/* Date */}
                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: <span className="font-semibold">{relievingFormData.letterDate || getTodayFormatted()}</span>
                        </p>
                      </div>

                      {/* To Section */}
                      <div className="space-y-0.5">
                        <p className="text-[12px] font-bold text-slate-900">To,</p>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {relievingFormData.employeeName || 'Sudhanshu Naik'}
                          </span>
                        </p>
                      </div>

                      {/* Subject */}
                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Subject: Relieving Letter
                        </p>
                      </div>

                      {/* Salutation */}
                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Dear{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {relievingFormData.employeeName || 'Sudhanshu Naik'}
                          </span>
                          ,
                        </p>
                      </div>

                      {/* Body Paragraphs */}
                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to confirm that your resignation from the position of{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {relievingFormData.role || 'Junior MERN Stack Developer'}
                          </span>{' '}
                          at {relievingFormData.companyName || 'Taruna Technology'}, Vadodara, has been accepted, and you are hereby formally relieved from your duties with effect from{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {relievingFormData.relievingDate || '09 July 2026'}
                          </span>
                          .
                        </p>

                        <p>
                          Your last working day with the organization was{' '}
                          <span className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-bold border border-amber-300">
                            {relievingFormData.lastWorkingDate || '09 July 2026'}
                          </span>
                          . We acknowledge your association with the company and appreciate your contributions during your tenure.
                        </p>

                        <p>
                          We wish you success in your future professional and personal endeavors.
                        </p>

                        <p>
                          Thank you for your association with {relievingFormData.companyName || 'Taruna Technology'}.
                        </p>
                      </div>

                      {/* Sign-off Block */}
                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {relievingFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {relievingFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {relievingFormData.companyName || 'Taruna Technology'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600">
                            Vadodara, Gujarat, India
                          </p>
                        </div>
                      </div>

                      {/* Centered Website Footer */}
                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: LETTER ARCHIVE / HISTORY TABLE                              */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Letter Generation Archive</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View, filter, download, or re-open all generated offer letters and completion certificates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Type Filter Buttons */}
                <div className="flex overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs gap-1">
                  <button
                    onClick={() => setHistoryFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap shrink-0 ${
                      historyFilterType === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({lettersList.length})
                  </button>
                  <button
                    onClick={() => setHistoryFilterType('offer')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      historyFilterType === 'offer'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-indigo-600'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Offers ({countOffers})</span>
                  </button>
                  <button
                    onClick={() => setHistoryFilterType('completion')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      historyFilterType === 'completion'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-600 hover:text-emerald-600'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span>Completions ({countCompletions})</span>
                  </button>
                  <button
                    onClick={() => setHistoryFilterType('experience')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      historyFilterType === 'experience'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>Experience ({countExperiences})</span>
                  </button>
                  <button
                    onClick={() => setHistoryFilterType('relieving')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      historyFilterType === 'relieving'
                        ? 'bg-white text-violet-600 shadow-sm'
                        : 'text-slate-600 hover:text-violet-600'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Relieving ({countRelievings})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name, role, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <p className="text-xs">Loading letter records...</p>
              </div>
            ) : filteredLetters.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No letters found in this view</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new Offer Letter, Completion Letter, Experience Letter, or Relieving Letter using the tabs above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                      <th className="px-5 py-3.5">Candidate / Employee</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Designated Role</th>
                      <th className="px-5 py-3.5">Duration / Period</th>
                      <th className="px-5 py-3.5">Generated On</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLetters.map((item) => {
                      const letterId = item._id || item.id;
                      const isDeleting = deletingId === letterId;
                      const isDownloading = downloadingId === letterId;
                      const isCompletion = item.letterType === 'completion';
                      const isExperience = item.letterType === 'experience';
                      const isRelieving = item.letterType === 'relieving';
                      const prefix = isCompletion
                        ? 'Completion_Letter'
                        : isExperience
                        ? 'Experience_Letter'
                        : isRelieving
                        ? 'Relieving_Letter'
                        : 'Offer_Letter';

                      return (
                        <tr key={letterId} className="hover:bg-slate-50/60 transition group">
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                  isCompletion
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : isExperience
                                    ? 'bg-blue-50 text-blue-600'
                                    : isRelieving
                                    ? 'bg-violet-50 text-violet-600'
                                    : 'bg-indigo-50 text-indigo-600'
                                }`}
                              >
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

                          <td className="px-5 py-3.5">
                            {isCompletion ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Completion Letter</span>
                              </span>
                            ) : isExperience ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                <Briefcase className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>Experience Letter</span>
                              </span>
                            ) : isRelieving ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                                <FileText className="w-3 h-3 text-violet-600 shrink-0" />
                                <span>Relieving Letter</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                <FileCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>Offer Letter</span>
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-700 font-medium">
                            <p>{item.role}</p>
                            {item.department && (
                              <p className="text-[10px] text-slate-400 font-normal">Dept: {item.department}</p>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-700">
                            {isCompletion ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-slate-800 bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                                  <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{item.joiningDate} → {item.completionDate || 'Ongoing'}</span>
                                </span>
                              </div>
                            ) : isExperience ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-slate-800 bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                                  <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{item.joiningDate} → {item.lastWorkingDate || 'Ongoing'}</span>
                                </span>
                              </div>
                            ) : isRelieving ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-slate-800 bg-violet-50 text-violet-800 border border-violet-100 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-violet-600 shrink-0" />
                                  <span>Relieved: {item.relievingDate || item.lastWorkingDate}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>{item.joiningDate}</span>
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-'}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{item.status || 'Generated'}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDownload(letterId, item.employeeName, prefix)}
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
                                  if (isCompletion) {
                                    setCompletionFormData({
                                      ...initialCompletionFormData,
                                      employeeName: item.employeeName || '',
                                      role: item.role || '',
                                      joiningDate: item.joiningDate || '',
                                      completionDate: item.completionDate || initialCompletionFormData.completionDate,
                                      employmentType: item.employmentType || initialCompletionFormData.employmentType,
                                      letterDate: item.letterDate || getTodayFormatted(),
                                      companyName: item.companyName || initialCompletionFormData.companyName,
                                      location: item.location || initialCompletionFormData.location,
                                      signatoryName: item.signatoryName || initialCompletionFormData.signatoryName,
                                      signatoryRole: item.signatoryRole || initialCompletionFormData.signatoryRole,
                                    });
                                    setActiveTab('completion');
                                    toast.success(`Loaded ${item.employeeName}'s completion letter`);
                                  } else if (isExperience) {
                                    setExperienceFormData({
                                      ...initialExperienceFormData,
                                      employeeName: item.employeeName || '',
                                      role: item.role || '',
                                      department: item.department || initialExperienceFormData.department,
                                      joiningDate: item.joiningDate || '',
                                      lastWorkingDate: item.lastWorkingDate || initialExperienceFormData.lastWorkingDate,
                                      letterDate: item.letterDate || getTodayFormatted(),
                                      companyName: item.companyName || initialExperienceFormData.companyName,
                                      location: item.location || initialExperienceFormData.location,
                                      signatoryName: item.signatoryName || initialExperienceFormData.signatoryName,
                                      signatoryRole: item.signatoryRole || initialExperienceFormData.signatoryRole,
                                    });
                                    setActiveTab('experience');
                                    toast.success(`Loaded ${item.employeeName}'s experience letter`);
                                  } else if (isRelieving) {
                                    setRelievingFormData({
                                      ...initialRelievingFormData,
                                      employeeName: item.employeeName || '',
                                      role: item.role || '',
                                      relievingDate: item.relievingDate || initialRelievingFormData.relievingDate,
                                      lastWorkingDate: item.lastWorkingDate || initialRelievingFormData.lastWorkingDate,
                                      letterDate: item.letterDate || getTodayFormatted(),
                                      companyName: item.companyName || initialRelievingFormData.companyName,
                                      location: item.location || initialRelievingFormData.location,
                                      signatoryName: item.signatoryName || initialRelievingFormData.signatoryName,
                                      signatoryRole: item.signatoryRole || initialRelievingFormData.signatoryRole,
                                    });
                                    setActiveTab('relieving');
                                    toast.success(`Loaded ${item.employeeName}'s relieving letter`);
                                  } else {
                                    setOfferFormData({
                                      ...initialOfferFormData,
                                      employeeName: item.employeeName || '',
                                      role: item.role || '',
                                      joiningDate: item.joiningDate || '',
                                      companyName: item.companyName || initialOfferFormData.companyName,
                                      location: item.location || initialOfferFormData.location,
                                      duration: item.duration || initialOfferFormData.duration,
                                      workingHours: item.workingHours || initialOfferFormData.workingHours,
                                      signatoryName: item.signatoryName || initialOfferFormData.signatoryName,
                                      signatoryRole: item.signatoryRole || initialOfferFormData.signatoryRole,
                                    });
                                    setActiveTab('offer');
                                    toast.success(`Loaded ${item.employeeName}'s offer letter`);
                                  }
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

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* FULLSCREEN PREVIEW MODAL                                               */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {isFullscreenPreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="relative max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-3 sm:p-6 flex flex-col items-center max-h-[95vh] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between w-full border-b border-slate-100 pb-3 mb-4 gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Fullscreen{' '}
                    {activeTab === 'completion'
                      ? 'Completion Letter'
                      : activeTab === 'experience'
                      ? 'Experience Letter'
                      : activeTab === 'relieving'
                      ? 'Relieving Letter'
                      : 'Offer Letter'}{' '}
                    Preview
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    onClick={
                      activeTab === 'completion'
                        ? handleGenerateCompletion
                        : activeTab === 'experience'
                        ? handleGenerateExperience
                        : activeTab === 'relieving'
                        ? handleGenerateRelieving
                        : handleGenerateOffer
                    }
                    disabled={
                      activeTab === 'completion'
                        ? generatingCompletion
                        : activeTab === 'experience'
                        ? generatingExperience
                        : activeTab === 'relieving'
                        ? generatingRelieving
                        : generatingOffer
                    }
                    className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => setIsFullscreenPreview(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Canvas In Fullscreen */}
              <div className="w-full overflow-x-auto flex justify-center py-2">
                <div
                  style={{
                    width: '595px',
                    minHeight: '842px',
                  }}
                  className="bg-white text-slate-900 shadow-lg relative overflow-hidden flex flex-col justify-between font-sans border border-slate-300 shrink-0"
                >
                  {/* Artwork Top Right */}
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '260px',
                      height: '195px',
                      background: '#E91E8C',
                      clipPath: 'polygon(43% 0%, 100% 0%, 100% 100%, 31% 100%)',
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '190px',
                      height: '195px',
                      background: '#5B21B6',
                      clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{
                      width: '100px',
                      height: '100px',
                      background: '#2E1065',
                      clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
                    }}
                  />
                  <div
                    className="absolute top-[195px] right-0 pointer-events-none"
                    style={{
                      width: '80px',
                      height: '20px',
                      background: '#7C3AED',
                      clipPath: 'polygon(0 0, 100% 0%, 100% 100%, 37% 100%)',
                    }}
                  />

                  {/* Artwork Top Left */}
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

                  {/* Artwork Bottom Left */}
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

                  {/* Background Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img
                      src="/taruna_logo.png"
                      alt="Taruna Logo Watermark"
                      className="w-[460px] opacity-[0.16] object-contain select-none"
                    />
                  </div>

                  {/* Content Switcher */}
                  {activeTab === 'completion' ? (
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
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

                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          COMPLETION LETTER
                        </h3>
                      </div>

                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: {completionFormData.letterDate || getTodayFormatted()}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-[12px] font-bold text-slate-900">To,</p>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          {completionFormData.employeeName || 'Sudhanshu Naik'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Subject: Completion Letter – {completionFormData.role || 'Junior MERN Stack Developer'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Dear {completionFormData.employeeName || 'Sudhanshu Naik'},
                        </p>
                      </div>

                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to certify that {completionFormData.employeeName || 'Sudhanshu Naik'} has successfully completed their {completionFormData.employmentType || 'Internship'} as a {completionFormData.role || 'Junior MERN Stack Developer'} at {completionFormData.companyName || 'Taruna Technology'}, {completionFormData.location || 'Vadodara'}, from {completionFormData.joiningDate || '09 July 2026'} to {completionFormData.completionDate || '09 October 2026'}.
                        </p>
                        <p>
                          During this period, they were involved in assigned responsibilities and organizational activities related to their role. We appreciate their dedication, efforts, and contribution to the organization throughout their tenure.
                        </p>
                        <p>
                          We thank them for their association with {completionFormData.companyName || 'Taruna Technology'} and wish them continued success in their future professional endeavors.
                        </p>
                        <p>
                          This letter is issued upon completion of their tenure with the organization for official and professional reference purposes.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {completionFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {completionFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {completionFormData.companyName || 'Taruna Technology'}
                          </p>
                        </div>
                      </div>

                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  ) : activeTab === 'experience' ? (
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
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

                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          EXPERIENCE LETTER
                        </h3>
                      </div>

                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: {experienceFormData.letterDate || getTodayFormatted()}
                        </p>
                      </div>

                      <div className="pt-1">
                        <p className="text-[12.5px] font-bold text-slate-950 uppercase tracking-wide">
                          TO WHOM IT MAY CONCERN
                        </p>
                      </div>

                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to certify that {experienceFormData.employeeName || 'Sudhanshu Naik'} was employed with {experienceFormData.companyName || 'Taruna Technology'}, Vadodara, as a {experienceFormData.role || 'Junior MERN Stack Developer'} in the {experienceFormData.department || 'Engineering'} department from {experienceFormData.joiningDate || '09 July 2025'} to {experienceFormData.lastWorkingDate || '09 July 2026'}.
                        </p>
                        <p>
                          During their tenure with the organization, they were responsible for duties and responsibilities associated with their position. Their role involved contributing to assigned projects, collaborating with team members, and supporting the organization's operational objectives.
                        </p>
                        <p>
                          We appreciate their contributions during their association with {experienceFormData.companyName || 'Taruna Technology'} and wish them success in their future professional endeavors.
                        </p>
                        <p>
                          This letter is issued upon request for official and professional reference purposes.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {experienceFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {experienceFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {experienceFormData.companyName || 'Taruna Technology'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600">
                            Vadodara, Gujarat, India
                          </p>
                        </div>
                      </div>

                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  ) : activeTab === 'relieving' ? (
                    <div className="relative z-10 p-10 flex flex-col justify-between h-full space-y-4">
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

                      <div className="text-center pt-1">
                        <h3 className="text-xl font-bold tracking-wider text-slate-950 uppercase">
                          RELIEVING LETTER
                        </h3>
                      </div>

                      <div className="pt-1">
                        <p className="text-[12px] font-medium text-slate-900">
                          Date: {relievingFormData.letterDate || getTodayFormatted()}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-[12px] font-bold text-slate-900">To,</p>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          {relievingFormData.employeeName || 'Sudhanshu Naik'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Subject: Relieving Letter
                        </p>
                      </div>

                      <div>
                        <p className="text-[12.5px] font-bold text-slate-950">
                          Dear {relievingFormData.employeeName || 'Sudhanshu Naik'},
                        </p>
                      </div>

                      <div className="space-y-3.5 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          This is to confirm that your resignation from the position of {relievingFormData.role || 'Junior MERN Stack Developer'} at {relievingFormData.companyName || 'Taruna Technology'}, Vadodara, has been accepted, and you are hereby formally relieved from your duties with effect from {relievingFormData.relievingDate || '09 July 2026'}.
                        </p>
                        <p>
                          Your last working day with the organization was {relievingFormData.lastWorkingDate || '09 July 2026'}. We acknowledge your association with the company and appreciate your contributions during your tenure.
                        </p>
                        <p>
                          We wish you success in your future professional and personal endeavors.
                        </p>
                        <p>
                          Thank you for your association with {relievingFormData.companyName || 'Taruna Technology'}.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <div className="text-right space-y-0.5 min-w-[180px]">
                          <p className="text-[12px] font-bold text-slate-900">Best Regards,</p>
                          <p className="text-[13px] font-extrabold text-slate-950 tracking-wide uppercase">
                            {relievingFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {relievingFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {relievingFormData.companyName || 'Taruna Technology'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600">
                            Vadodara, Gujarat, India
                          </p>
                        </div>
                      </div>

                      <div className="text-center pt-4 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  ) : (
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
                          Dear {offerFormData.employeeName || 'Sudhanshu Naik'},
                        </p>
                      </div>

                      <div className="space-y-4 text-[11.8px] leading-[1.65] text-slate-900 text-justify">
                        <p>
                          We are pleased to offer you an Internship with{' '}
                          <span className="font-semibold">{offerFormData.companyName}</span>, {offerFormData.location}. Your
                          internship will commence on{' '}
                          <span className="font-semibold">{offerFormData.joiningDate || '09 July 2026'}</span> and will
                          continue for a period of {offerFormData.duration}. During this period, you will receive practical
                          training and hands-on experience by working on real-world projects and assigned responsibilities.
                        </p>

                        <p>
                          Your working hours will be {offerFormData.workingHours}. You are expected to maintain professionalism,
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
                          <span className="font-semibold">{offerFormData.role || 'Junior MERN Stack Developer'}</span> at{' '}
                          {offerFormData.companyName}.
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
                            {offerFormData.signatoryName || 'MIHIR MAKWANA'}
                          </p>
                          <div className="relative h-12 flex items-center justify-end my-1">
                            <img
                              src="/sign_img.png"
                              alt="Signature"
                              className="h-12 w-auto object-contain select-none translate-x-1"
                            />
                          </div>
                          <p className="text-[11.5px] font-semibold text-slate-900">
                            {offerFormData.signatoryRole || 'Operational Manager'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-950">
                            {offerFormData.companyName || 'Taruna Technology'}
                          </p>
                        </div>
                      </div>

                      <div className="text-center pt-6 border-t border-slate-100">
                        <p className="text-[12px] font-bold text-slate-950 tracking-wide">
                          www.tarunatech.com
                        </p>
                      </div>
                    </div>
                  )}
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
