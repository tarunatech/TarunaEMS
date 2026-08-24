import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Download, Edit3, FileText, Loader2, Plus, Save, Trash2, Upload, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { getApiFileUrl, interviewAPI } from '../../utils/api';

const tabs = ['Overview', 'Education', 'Experience', 'Certifications', 'Documents'];

const sectionFields = {
  education: [
    ['educationLevel', 'Education Level'], ['degree', 'Degree / Qualification'], ['field', 'Field / Specialization'],
    ['institution', 'Institution / College'], ['board', 'Board / University'], ['startYear', 'Start Year'],
    ['endYear', 'End Year'], ['grade', 'Grade / Percentage / CGPA'],
  ],
  experience: [
    ['companyName', 'Company Name'], ['designation', 'Designation'], ['employmentType', 'Employment Type'],
    ['startDate', 'Start Date', 'date'], ['endDate', 'End Date', 'date'], ['description', 'Description', 'textarea'],
  ],
  certifications: [
    ['certificateName', 'Certificate Name'], ['issuingOrganization', 'Issuing Organization'], ['issueDate', 'Issue Date', 'date'],
    ['expiryDate', 'Expiry Date', 'date'], ['credentialId', 'Credential ID'],
  ],
  documents: [
    ['documentName', 'Document Name'], ['category', 'Category'], ['relatedRecord', 'Related Record'],
  ],
};

const emptyRecord = {
  education: { educationLevel: '', degree: '', field: '', institution: '', board: '', startYear: '', endYear: '', grade: '' },
  experience: { companyName: '', designation: '', employmentType: '', startDate: '', endDate: '', currentlyWorking: false, description: '' },
  certifications: { certificateName: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialId: '' },
  documents: { documentName: '', category: 'Other', relatedRecord: '' },
};

const documentCategories = ['Resume', 'Education', 'Experience', 'Certification', 'Identity', 'Address Proof', 'Other'];

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'N/A');
const formatBytes = (size) => size ? `${(Number(size) / 1024).toFixed(Number(size) > 1024 * 1024 ? 1 : 0)} ${Number(size) > 1024 * 1024 ? 'MB' : 'KB'}` : '-';
const getFile = (record) => record?.document || record?.resumeFile || null;
const fileUrl = (record) => getApiFileUrl(getFile(record)?.path || '');

const CandidateProfile = ({ mode = 'hr' }) => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const readOnly = mode === 'admin';
  const Layout = readOnly ? AdminLayout : EmployeeLayout;
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const res = readOnly ? await interviewAPI.getAdminCandidate(candidateId) : await interviewAPI.getCandidate(candidateId);
      if (res.data?.success) setCandidate(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidate(); }, [candidateId, readOnly]);

  const completion = useMemo(() => {
    if (!candidate) return 0;
    const checks = [candidate.candidateName, candidate.email, candidate.phone, candidate.position, candidate.experience, candidate.skills, candidate.resumeFile, candidate.education?.length, candidate.experienceHistory?.length, candidate.certifications?.length];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [candidate]);

  const startAdd = (type) => {
    setEditing({ type, id: null });
    setForm(emptyRecord[type]);
    setFile(null);
  };

  const startEdit = (type, record) => {
    setEditing({ type, id: record.id });
    setForm({ ...emptyRecord[type], ...record });
    setFile(null);
  };

  const submitRecord = async (event) => {
    event.preventDefault();
    if (readOnly || !editing) return;
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ''));
    if (file) formData.append('document', file);
    try {
      setSaving(true);
      if (editing.id) await interviewAPI.updateProfileRecord(candidateId, editing.type, editing.id, formData);
      else await interviewAPI.addProfileRecord(candidateId, editing.type, formData);
      toast.success(editing.id ? 'Profile record updated' : 'Profile record added');
      setEditing(null);
      await fetchCandidate();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save profile record');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (type, id) => {
    if (readOnly || !window.confirm('Delete this profile record?')) return;
    try {
      await interviewAPI.deleteProfileRecord(candidateId, type, id);
      toast.success('Profile record deleted');
      await fetchCandidate();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete profile record');
    }
  };

  const recordsFor = (type) => type === 'experience' ? candidate?.experienceHistory || [] : candidate?.[type] || [];

  const renderDocumentActions = (record) => {
    const meta = getFile(record);
    if (!meta?.path) return <span className="text-xs text-slate-400">No document</span>;
    return (
      <div className="flex flex-wrap gap-2">
        <a href={fileUrl(record)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
          <FileText className="mr-1.5 h-3.5 w-3.5" /> View
        </a>
        <a href={fileUrl(record)} download className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download
        </a>
      </div>
    );
  };

  const renderSection = (type, title, emptyText) => {
    const records = recordsFor(type);
    return (
      <section className="premium-panel rounded-xl p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {!readOnly && <button onClick={() => startAdd(type)} className="premium-primary-button inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold"><Plus className="mr-2 h-4 w-4" /> Add {title.replace(/s$/, '')}</button>}
        </div>
        {!records.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{emptyText}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {records.map((record) => (
              <div key={record.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{record.degree || record.companyName || record.certificateName || record.documentName}</h3>
                    <p className="text-sm text-slate-500">{record.field || record.designation || record.issuingOrganization || record.category}</p>
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => startEdit(type, record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => deleteRecord(type, record.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  {record.institution && <p>{record.institution} {record.board ? `| ${record.board}` : ''}</p>}
                  {(record.startYear || record.endYear) && <p>{record.startYear || '-'} - {record.endYear || 'Present'} {record.grade ? `| ${record.grade}` : ''}</p>}
                  {(record.startDate || record.endDate) && <p>{record.startDate || '-'} - {record.currentlyWorking ? 'Present' : record.endDate || '-'}</p>}
                  {record.expiryDate && new Date(record.expiryDate) < new Date() && <p className="font-semibold text-amber-700">Expired certification</p>}
                  {record.description && <p className="text-slate-500">{record.description}</p>}
                  {getFile(record) && <p className="text-xs text-slate-400">{getFile(record).originalName} | {formatBytes(getFile(record).size)}</p>}
                </div>
                <div className="mt-3">{renderDocumentActions(record)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const modal = editing && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50" onClick={() => setEditing(null)} />
      <form onSubmit={submitRecord} className="relative max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-lg font-bold text-slate-900">{editing.id ? 'Edit' : 'Add'} {editing.type}</h3>
          <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {sectionFields[editing.type].map(([key, label, inputType]) => (
            <label key={key} className={inputType === 'textarea' ? 'md:col-span-2' : ''}>
              <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
              {inputType === 'textarea' ? (
                <textarea className="premium-input min-h-24 w-full rounded-lg px-3 py-2 text-sm" value={form[key] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} />
              ) : key === 'category' ? (
                <select className="premium-input w-full rounded-lg px-3 py-2 text-sm" value={form[key] || 'Other'} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}>
                  {documentCategories.map((item) => <option key={item}>{item}</option>)}
                </select>
              ) : (
                <input type={inputType || 'text'} className="premium-input w-full rounded-lg px-3 py-2 text-sm" value={form[key] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} />
              )}
            </label>
          ))}
          {editing.type === 'experience' && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={!!form.currentlyWorking} onChange={(e) => setForm((prev) => ({ ...prev, currentlyWorking: e.target.checked, endDate: e.target.checked ? '' : prev.endDate }))} />
              Currently Working
            </label>
          )}
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Document</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Upload className="h-4 w-4 text-blue-600" />
              <span className="min-w-0 flex-1 truncate">{file?.name || getFile(form)?.originalName || 'Upload PDF, DOC, DOCX, JPG, JPEG, or PNG'}</span>
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button disabled={saving} className="premium-primary-button inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <Layout>
      <div className="admin-page-shell space-y-4 text-sm">
        {loading ? (
          <div className="premium-panel rounded-xl p-8 text-slate-500">Loading candidate profile...</div>
        ) : !candidate ? (
          <div className="premium-panel rounded-xl p-8 text-slate-500">Candidate profile not found</div>
        ) : (
          <>
            <button onClick={() => navigate(readOnly ? '/admin/interviews' : '/employee/hr-interviews')} className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
            </button>
            <section className="premium-panel rounded-xl p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-600">{readOnly ? 'Candidate Profile' : 'Candidate Details'}</p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">{candidate.candidateName}</h1>
                  <p className="text-slate-500">Manage candidate profile, education, experience and documents</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                    <p>{candidate.position}</p><p>{candidate.email}</p><p>{candidate.phone}</p><p>Status: {candidate.status}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700">
                  <p className="text-xs font-semibold uppercase">Profile Completion</p>
                  <p className="text-2xl font-bold">{completion}%</p>
                </div>
              </div>
            </section>

            <div className="premium-panel flex flex-wrap gap-2 rounded-xl p-2">
              {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{tab}</button>)}
            </div>

            {activeTab === 'Overview' && (
              <div className="grid gap-4 xl:grid-cols-3">
                <section className="premium-panel rounded-xl p-4 shadow-sm">
                  <h2 className="mb-3 font-bold text-slate-900"><UserRound className="mr-2 inline h-4 w-4 text-blue-600" />Personal Information</h2>
                  {['candidateName', 'email', 'phone', 'position', 'experience', 'skills', 'notes'].map((key) => <p key={key} className="mb-2 text-slate-600"><span className="font-semibold text-slate-900">{key}: </span>{candidate[key] || '-'}</p>)}
                </section>
                <section className="premium-panel rounded-xl p-4 shadow-sm">
                  <h2 className="mb-3 font-bold text-slate-900"><CalendarClock className="mr-2 inline h-4 w-4 text-blue-600" />Recruitment Information</h2>
                  <p className="mb-2 text-slate-600">Status: {candidate.status}</p><p className="mb-2 text-slate-600">Round: {candidate.interviewRound || '-'}</p>
                  <p className="mb-2 text-slate-600">Date: {formatDate(candidate.interviewDate)}</p><p className="mb-2 text-slate-600">Time: {candidate.interviewTime || '-'}</p>
                  <p className="mb-2 text-slate-600">Mode: {candidate.interviewMode || '-'}</p><p className="mb-2 text-slate-600">Created by: {candidate.createdBy?.name || candidate.createdBy?.email || '-'}</p>
                </section>
                <section className="premium-panel rounded-xl p-4 shadow-sm">
                  <h2 className="mb-3 font-bold text-slate-900"><FileText className="mr-2 inline h-4 w-4 text-blue-600" />Resume</h2>
                  <p className="mb-2 text-slate-600">{candidate.resumeFile?.originalName || 'No resume uploaded'}</p>
                  <p className="mb-3 text-xs text-slate-400">{candidate.resumeFile?.mimeType || ''} {candidate.resumeFile?.size ? `| ${formatBytes(candidate.resumeFile.size)}` : ''}</p>
                  {renderDocumentActions({ document: candidate.resumeFile })}
                </section>
              </div>
            )}
            {activeTab === 'Education' && renderSection('education', 'Education', 'No education records added yet.')}
            {activeTab === 'Experience' && renderSection('experience', 'Experience', 'No experience records added yet.')}
            {activeTab === 'Certifications' && renderSection('certifications', 'Certifications', 'No certifications added yet.')}
            {activeTab === 'Documents' && renderSection('documents', 'Documents', 'No candidate documents uploaded yet.')}
          </>
        )}
        {modal}
      </div>
    </Layout>
  );
};

export default CandidateProfile;
