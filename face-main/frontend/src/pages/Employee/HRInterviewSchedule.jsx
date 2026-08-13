import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, CheckCircle, Clock, FileText, Plus, RefreshCw, Upload, UserRound, X, XCircle } from 'lucide-react';
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
  const timeInputRef = useRef(null);

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
    const optionalFields = new Set(['interviewRound', 'notes']);
    const missing = Object.entries(form).filter(([key, value]) => !optionalFields.has(key) && !String(value).trim());

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
        formData.append(key, optionalFields.has(key) && !String(value).trim() ? '-' : value);
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
  const toDateKey = (date) => (date ? new Date(date).toISOString().split('T')[0] : '');
  const todayKey = new Date().toISOString().split('T')[0];
  const isUpcoming = (item) => toDateKey(item.interviewDate) >= todayKey && !['Completed', 'Selected', 'Rejected', 'Cancelled'].includes(item.status);
  const kpis = [
    { label: 'Total Candidates', value: interviews.length, icon: UserRound, tone: 'indigo' },
    { label: 'Scheduled', value: interviews.filter((item) => item.status === 'Scheduled').length, icon: CalendarClock, tone: 'blue' },
    { label: "Today's Interviews", value: interviews.filter((item) => toDateKey(item.interviewDate) === todayKey).length, icon: Clock, tone: 'amber' },
    { label: 'Upcoming', value: interviews.filter(isUpcoming).length, icon: CalendarClock, tone: 'violet' },
    { label: 'Completed', value: interviews.filter((item) => item.status === 'Completed').length, icon: CheckCircle, tone: 'slate' },
    { label: 'Selected', value: interviews.filter((item) => item.status === 'Selected').length, icon: CheckCircle, tone: 'emerald' },
    { label: 'Rejected', value: interviews.filter((item) => item.status === 'Rejected').length, icon: XCircle, tone: 'red' },
  ];
  const todayInterviews = interviews
    .filter((item) => toDateKey(item.interviewDate) === todayKey)
    .sort((a, b) => String(a.interviewTime || '').localeCompare(String(b.interviewTime || '')))
    .slice(0, 4);
  const upcomingInterviews = interviews
    .filter(isUpcoming)
    .sort((a, b) => `${toDateKey(a.interviewDate)} ${a.interviewTime || ''}`.localeCompare(`${toDateKey(b.interviewDate)} ${b.interviewTime || ''}`))
    .slice(0, 5);
  const toneClasses = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  const openTimePicker = () => {
    const input = timeInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        input.focus();
      }
      return;
    }
    input.focus();
  };

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
      <div className="admin-page-shell space-y-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Interview Schedule</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Add candidate interview details for admin review</p>
          </div>
          <button
            type="button"
            onClick={fetchInterviews}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="premium-panel rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="premium-panel rounded-xl p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Today's Interviews</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{todayInterviews.length}</span>
            </div>
            {todayInterviews.length ? (
              <div className="space-y-2">
                {todayInterviews.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.interviewTime || 'N/A'} · {item.candidateName}</p>
                      <p className="truncate text-xs text-slate-500">{item.position} · {item.interviewRound || '-'} · {item.interviewMode || 'N/A'}</p>
                    </div>
                    <ResumePreview item={item} compact />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">No interviews scheduled today</p>
            )}
          </section>

          <section className="premium-panel rounded-xl p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Upcoming Interviews</h2>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{upcomingInterviews.length}</span>
            </div>
            {upcomingInterviews.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {upcomingInterviews.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{item.candidateName}</p>
                        <p className="truncate text-xs text-slate-500">{item.position}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">{item.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{formatDate(item.interviewDate)} at {item.interviewTime || 'N/A'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">No upcoming interviews</p>
            )}
          </section>
        </div>

        <form onSubmit={handleSubmit} className="premium-panel rounded-xl p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Candidate Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input required className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Candidate name *" value={form.candidateName} onChange={(e) => updateField('candidateName', e.target.value)} />
            <input required type="email" className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Email *" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            <input required className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Phone *" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
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
            <input required className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Position *" value={form.position} onChange={(e) => updateField('position', e.target.value)} />
            <input required className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Experience *" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} />
            <input required type="date" className="premium-input rounded-lg px-3 py-2.5 text-sm" value={form.interviewDate} onChange={(e) => updateField('interviewDate', e.target.value)} />
            <input
              ref={timeInputRef}
              required
              type="time"
              className="premium-input cursor-pointer rounded-lg px-3 py-2.5 text-sm"
              value={form.interviewTime}
              onClick={openTimePicker}
              onFocus={openTimePicker}
              onChange={(e) => updateField('interviewTime', e.target.value)}
            />
            <select required className="premium-input rounded-lg px-3 py-2.5 text-sm" value={form.interviewMode} onChange={(e) => updateField('interviewMode', e.target.value)}>
              <option>Online</option>
              <option>Offline</option>
              <option>Telephonic</option>
            </select>
            <input className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Interview round (optional)" value={form.interviewRound} onChange={(e) => updateField('interviewRound', e.target.value)} />
            <input required className="premium-input rounded-lg px-3 py-2.5 text-sm" placeholder="Skills / field details *" value={form.skills} onChange={(e) => updateField('skills', e.target.value)} />
            <textarea className="premium-input min-h-10 rounded-lg px-3 py-2.5 text-sm md:col-span-2 xl:col-span-1" placeholder="Notes (optional)" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          <div className="mt-4 flex justify-end">
            <button disabled={submitting} className="premium-primary-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save Interview'}
            </button>
          </div>
        </form>

        <div className="premium-panel overflow-hidden rounded-xl">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-slate-900">Submitted Interviews</h2>
          </div>
          {loading ? (
            <div className="p-6 text-slate-500">Loading interviews...</div>
          ) : interviews.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No interviews submitted yet</div>
          ) : (
            <div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Schedule</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Round</th>
                      <th className="px-4 py-3">Skills</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((item) => (
                      <tr key={item._id} className="border-b border-slate-100 transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{item.candidateName}</p>
                              <p className="truncate text-xs text-slate-500">{item.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p className="truncate">{item.email}</p>
                          <p className="text-xs text-slate-500">{item.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p className="font-medium text-slate-800">{formatDate(item.interviewDate)}</p>
                          <p className="text-xs text-slate-500">{item.interviewTime || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.interviewMode || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.interviewRound || '-'}</td>
                        <td className="max-w-[180px] px-4 py-3 text-slate-600">
                          <p className="truncate">{item.skills || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{item.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ResumePreview item={item} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {interviews.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-900">{item.candidateName}</h3>
                          <p className="truncate text-xs text-slate-500">{item.position}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{item.status}</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p><CalendarClock className="mr-1.5 inline h-3.5 w-3.5" />{formatDate(item.interviewDate)} at {item.interviewTime || 'N/A'}</p>
                      <p className="truncate">{item.email} | {item.phone}</p>
                      <p className="truncate">{item.interviewMode || 'N/A'} | {item.interviewRound || '-'}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <ResumePreview item={item} compact />
                    </div>
                  </div>
                ))}
              </div>
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
