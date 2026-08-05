import React, { useEffect, useState } from 'react';
import { CalendarClock, FileText, Plus, RefreshCw, Upload, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { getApiFileUrl, interviewAPI } from '../../utils/api';

const emptyForm = {
  candidateName: '',
  email: '',
  phone: '',
  position: '',
  experience: '',
  interviewDate: '',
  interviewTime: '',
  interviewMode: 'Online',
  interviewRound: '',
  skills: '',
  notes: '',
};

const HRInterviewSchedule = () => {
  const [interviews, setInterviews] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [previewResume, setPreviewResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await interviewAPI.getMine();
      if (res.data?.success) setInterviews(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const missing = Object.entries(form).filter(([, value]) => !String(value).trim());

    if (missing.length) {
      toast.error('Please fill all interview fields');
      return;
    }

    if (!resumeFile) {
      toast.error('Please upload a resume file');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('resume', resumeFile);

      const res = await interviewAPI.create(formData);
      if (res.data?.success) {
        setInterviews((prev) => [res.data.data, ...prev]);
        setForm(emptyForm);
        setResumeFile(null);
        toast.success('Interview schedule saved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save interview');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'N/A');

  const getResumePath = (item) => item.resumeFile?.path || item.resumeUrl || '';
  const isImageResume = (item) => (item.resumeFile?.mimeType || '').startsWith('image/');
  const getResumeUrl = (item) => getApiFileUrl(getResumePath(item));

  const ResumePreview = ({ item, compact = false }) => {
    const resumePath = getResumePath(item);
    if (!resumePath) return <span className="text-slate-400">No resume</span>;

    if (isImageResume(item)) {
      return (
        <button type="button" onClick={() => setPreviewResume(item)} className="block text-left">
          <img
            src={getApiFileUrl(resumePath)}
            alt={`${item.candidateName} resume`}
            className={`${compact ? 'h-16 w-20' : 'h-24 w-32'} rounded-lg border border-slate-200 object-cover hover:opacity-90`}
          />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPreviewResume(item)}
        className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        <FileText className="mr-2 h-4 w-4" />
        {compact ? 'View' : item.resumeFile?.originalName || 'View resume'}
      </button>
    );
  };

  return (
    <EmployeeLayout>
      <div className="admin-page-shell space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview Schedule</h1>
            <p className="text-slate-500">Add candidate interview details for admin review</p>
          </div>
          <button
            type="button"
            onClick={fetchInterviews}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSubmit} className="premium-panel rounded-2xl p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Candidate Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input required className="premium-input rounded-lg p-3" placeholder="Candidate name *" value={form.candidateName} onChange={(e) => updateField('candidateName', e.target.value)} />
            <input required type="email" className="premium-input rounded-lg p-3" placeholder="Email *" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            <input required className="premium-input rounded-lg p-3" placeholder="Phone *" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <span className="flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <span className="truncate">{resumeFile ? resumeFile.name : 'Upload resume image or file *'}</span>
              </span>
              <input
                required
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </label>
            <input required className="premium-input rounded-lg p-3" placeholder="Position *" value={form.position} onChange={(e) => updateField('position', e.target.value)} />
            <input required className="premium-input rounded-lg p-3" placeholder="Experience *" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} />
            <input required type="date" className="premium-input rounded-lg p-3" value={form.interviewDate} onChange={(e) => updateField('interviewDate', e.target.value)} />
            <input required type="time" className="premium-input rounded-lg p-3" value={form.interviewTime} onChange={(e) => updateField('interviewTime', e.target.value)} />
            <select required className="premium-input rounded-lg p-3" value={form.interviewMode} onChange={(e) => updateField('interviewMode', e.target.value)}>
              <option>Online</option>
              <option>Offline</option>
              <option>Telephonic</option>
            </select>
            <input required className="premium-input rounded-lg p-3" placeholder="Interview round *" value={form.interviewRound} onChange={(e) => updateField('interviewRound', e.target.value)} />
            <input required className="premium-input rounded-lg p-3" placeholder="Skills / field details *" value={form.skills} onChange={(e) => updateField('skills', e.target.value)} />
            <textarea required className="premium-input min-h-[48px] rounded-lg p-3 md:col-span-2 xl:col-span-1" placeholder="Notes *" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          <div className="mt-5 flex justify-end">
            <button disabled={submitting} className="premium-primary-button rounded-lg px-5 py-2 font-semibold disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save Interview'}
            </button>
          </div>
        </form>

        <div className="premium-panel overflow-hidden rounded-2xl">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">Submitted Interviews</h2>
          </div>
          {loading ? (
            <div className="p-6 text-slate-500">Loading interviews...</div>
          ) : interviews.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No interviews submitted yet</div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {interviews.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserRound className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-bold text-slate-900">{item.candidateName}</h3>
                        <p className="text-sm text-slate-500">{item.position}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{item.status}</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p><CalendarClock className="mr-2 inline h-4 w-4" />{formatDate(item.interviewDate)} at {item.interviewTime}</p>
                    <ResumePreview item={item} />
                    <p>{item.email} | {item.phone}</p>
                    <p>{item.skills}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {previewResume && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setPreviewResume(null)} />
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <h3 className="font-bold text-slate-900">{previewResume.candidateName} Resume</h3>
                  <p className="text-sm text-slate-500">{previewResume.resumeFile?.originalName || 'Uploaded resume'}</p>
                </div>
                <button onClick={() => setPreviewResume(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[78vh] overflow-auto bg-slate-50 p-4">
                {isImageResume(previewResume) ? (
                  <img src={getResumeUrl(previewResume)} alt="Resume preview" className="mx-auto max-h-[72vh] max-w-full rounded-lg object-contain" />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      If the document preview does not load, open it directly from the button below.
                    </div>
                    <a
                      href={getResumeUrl(previewResume)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Open resume
                    </a>
                    <iframe title="Resume preview" src={getResumeUrl(previewResume)} className="h-[64vh] w-full rounded-lg border border-slate-200 bg-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default HRInterviewSchedule;
