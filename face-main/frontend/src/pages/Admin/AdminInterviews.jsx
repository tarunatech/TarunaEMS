import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, RefreshCw, Search, Trash2, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { getApiFileUrl, interviewAPI } from '../../utils/api';

const statuses = ['Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled'];

const AdminInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewResume, setPreviewResume] = useState(null);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await interviewAPI.getAll();
      if (res.data?.success) setInterviews(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const filteredInterviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return interviews;

    return interviews.filter((item) =>
      [item.candidateName, item.email, item.phone, item.position, item.skills, item.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [interviews, search]);

  const updateStatus = async (id, status) => {
    try {
      const res = await interviewAPI.updateStatus(id, status);
      if (res.data?.success) {
        setInterviews((prev) => prev.map((item) => (item._id === id ? res.data.data : item)));
        toast.success('Interview status updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const deleteInterview = async (id) => {
    if (!window.confirm('Delete this interview schedule?')) return;

    try {
      const res = await interviewAPI.delete(id);
      if (res.data?.success) {
        setInterviews((prev) => prev.filter((item) => item._id !== id));
        toast.success('Interview deleted');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete interview');
    }
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'N/A');

  const getResumePath = (item) => item.resumeFile?.path || item.resumeUrl || '';
  const isImageResume = (item) => (item.resumeFile?.mimeType || '').startsWith('image/');
  const getResumeUrl = (item) => getApiFileUrl(getResumePath(item));

  const ResumePreview = ({ item }) => {
    const resumePath = getResumePath(item);
    if (!resumePath) return <span className="text-sm text-slate-400">No resume</span>;

    if (isImageResume(item)) {
      return (
        <button type="button" onClick={() => setPreviewResume(item)} className="mt-2 block text-left">
          <img
            src={getApiFileUrl(resumePath)}
            alt={`${item.candidateName} resume`}
            className="h-16 w-20 rounded-lg border border-slate-200 object-cover hover:opacity-90"
          />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPreviewResume(item)}
        className="mt-2 inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        <FileText className="mr-2 h-4 w-4" />
        View resume
      </button>
    );
  };

  return (
    <AdminLayout>
      <div className="admin-page-shell space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview Details</h1>
            <p className="text-slate-500">Review interview schedules submitted by HR employees</p>
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

        <div className="premium-panel rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="premium-input w-full rounded-lg py-3 pl-10 pr-3"
              placeholder="Search candidates, email, position, skills, status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="premium-panel overflow-hidden rounded-2xl">
          {loading ? (
            <div className="p-6 text-slate-500">Loading interview details...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No interview details found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Candidate</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Contact</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Interview</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Field Details</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterviews.map((item) => (
                    <tr key={item._id} className="premium-table-row border-b border-slate-100">
                      <td className="p-4 align-top">
                        <div className="flex gap-3">
                          <UserRound className="mt-1 h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-bold text-slate-900">{item.candidateName}</p>
                            <p className="text-sm text-slate-500">{item.position}</p>
                            <ResumePreview item={item} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top text-sm text-slate-600">
                        <p>{item.email}</p>
                        <p>{item.phone}</p>
                      </td>
                      <td className="p-4 align-top text-sm text-slate-600">
                        <p><CalendarClock className="mr-1 inline h-4 w-4" />{formatDate(item.interviewDate)} at {item.interviewTime}</p>
                        <p>{item.interviewMode} | {item.interviewRound}</p>
                      </td>
                      <td className="max-w-xs p-4 align-top text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{item.experience}</p>
                        <p>{item.skills}</p>
                        <p className="mt-2 text-slate-500">{item.notes}</p>
                      </td>
                      <td className="p-4 align-top">
                        <select
                          className="premium-input rounded-lg px-3 py-2 text-sm"
                          value={item.status}
                          onChange={(event) => updateStatus(item._id, event.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 align-top">
                        <button
                          type="button"
                          onClick={() => deleteInterview(item._id)}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </AdminLayout>
  );
};

export default AdminInterviews;
