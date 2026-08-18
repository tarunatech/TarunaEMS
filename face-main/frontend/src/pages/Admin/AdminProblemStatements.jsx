import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Search } from 'lucide-react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const AdminProblemStatements = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const res = await api.get('/problems');
        if (res.data?.success) setProblems(res.data.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load problem statements');
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const filteredProblems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return problems;
    return problems.filter((problem) =>
      [
        problem.description,
        problem.status,
        problem.reportedBy?.name,
        problem.reportedBy?.email,
        problem.reportedBy?.employeeId
      ].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [problems, search]);

  const openCount = problems.filter((problem) => !['solved', 'resolved', 'closed'].includes(String(problem.status || '').toLowerCase())).length;

  return (
    <AdminLayout>
      <div className="admin-page-shell space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="premium-page-title text-xl font-bold sm:text-2xl md:text-3xl">Problem Statements</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Review developer-reported issues and resolutions.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-72">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-black text-slate-900">{problems.length}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
              <p className="text-xs text-amber-700">Open</p>
              <p className="text-xl font-black text-amber-900">{openCount}</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search problem statements..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading problem statements...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No problem statements found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProblems.map((problem) => {
                const solved = ['solved', 'resolved', 'closed'].includes(String(problem.status || '').toLowerCase());
                return (
                  <div key={problem._id || problem.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${solved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {solved ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {problem.status || 'Open'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-900">{problem.description || 'No description'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      {problem.reportedBy?.name || problem.reportedBy?.employeeId || 'Reporter unavailable'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProblemStatements;
