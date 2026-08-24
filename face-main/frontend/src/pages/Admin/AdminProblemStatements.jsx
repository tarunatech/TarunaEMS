import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, Edit3, Loader2, Plus, Search, UserPlus, X } from 'lucide-react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const getEmployeeName = (person) => {
  if (!person) return '';
  const personalName = `${person.personalInfo?.firstName || ''} ${person.personalInfo?.lastName || ''}`.trim();
  return personalName || person.fullName || person.name || person.email || person.employeeId || '';
};

const getDepartmentName = (employee) => {
  const department = employee?.workInfo?.department;
  return department?.name || department?.code || department || '';
};

const isDeveloper = (employee) => {
  const department = getDepartmentName(employee).toLowerCase();
  const position = String(employee?.workInfo?.position || employee?.workInfo?.designation || '').toLowerCase();
  return ['developer', 'development'].some((key) => department.includes(key) || position.includes(key));
};

const AdminProblemStatements = () => {
  const location = useLocation();
  const initialSearch = location.state?.employeeFilter || location.state?.search || '';

  const [problems, setProblems] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [modalMode, setModalMode] = useState(null);
  const [activeProblem, setActiveProblem] = useState(null);
  const [form, setForm] = useState({ description: '', assignedTo: '' });

  useEffect(() => {
    const navSearch = location.state?.employeeFilter || location.state?.search || '';
    if (navSearch) {
      setSearch(navSearch);
    }
  }, [location.state]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [problemsRes, employeesRes] = await Promise.all([
        api.get('/problems'),
        api.get('/employees', { params: { limit: 200, status: 'Active' } })
      ]);
      if (problemsRes.data?.success) setProblems(problemsRes.data.data || []);
      const employeeList = employeesRes.data?.data?.employees || employeesRes.data?.employees || employeesRes.data?.data || [];
      setDevelopers(employeeList.filter(isDeveloper));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load problem statements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProblems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return problems;
    return problems.filter((problem) =>
      [
        problem.description,
        problem.status,
        problem.reportedBy?.name,
        problem.reportedBy?.email,
        problem.reportedBy?.employeeId,
        getEmployeeName(problem.assignedTo)
      ].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [problems, search]);

  const openCount = problems.filter((problem) => !['solved', 'resolved', 'closed'].includes(String(problem.status || '').toLowerCase())).length;
  const upsertProblem = (updated) => setProblems((prev) => prev.some((item) => (item._id || item.id) === (updated._id || updated.id))
    ? prev.map((item) => (item._id || item.id) === (updated._id || updated.id) ? updated : item)
    : [updated, ...prev]);

  const openModal = (mode, problem = null) => {
    setModalMode(mode);
    setActiveProblem(problem);
    setForm({
      description: problem?.description || '',
      assignedTo: problem?.assignedTo?._id || problem?.assignedTo?.id || ''
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveProblem(null);
    setForm({ description: '', assignedTo: '' });
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error('Please enter a problem statement');
      return;
    }
    try {
      const payload = { description: form.description.trim(), assignedTo: form.assignedTo || null };
      const res = modalMode === 'edit'
        ? await api.put(`/problems/${activeProblem._id || activeProblem.id}`, payload)
        : await api.post('/problems', payload);
      if (res.data?.success) {
        upsertProblem(res.data.data);
        closeModal();
        toast.success(modalMode === 'edit' ? 'Problem updated' : 'Problem added');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save problem');
    }
  };

  const handleAssign = async (problem, assignedTo) => {
    try {
      const res = await api.patch(`/problems/${problem._id || problem.id}/assign`, { assignedTo: assignedTo || null });
      if (res.data?.success) {
        upsertProblem(res.data.data);
        toast.success(assignedTo ? 'Problem assigned' : 'Assignment cleared');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign problem');
    }
  };

  const handleSolve = async (problem) => {
    try {
      const res = await api.patch(`/problems/${problem._id || problem.id}/solve`, {});
      if (res.data?.success) {
        upsertProblem(res.data.data);
        toast.success('Problem marked as solved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark solved');
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page-shell space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="premium-page-title text-xl font-bold sm:text-2xl md:text-3xl">Problem Statements</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Review developer-reported issues and resolutions.</p>
          </div>
          <div className="grid gap-2 sm:w-[28rem] sm:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-black text-slate-900">{problems.length}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
              <p className="text-xs text-amber-700">Open</p>
              <p className="text-xl font-black text-amber-900">{openCount}</p>
            </div>
            <button onClick={() => openModal('new')} className="premium-primary-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Add New
            </button>
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
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          Reported by: <span className="font-semibold text-slate-700">{getEmployeeName(problem.reportedBy) || 'Reporter unavailable'}</span>
                        </div>
                        <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
                          Assigned to: <span className="font-semibold">{getEmployeeName(problem.assignedTo) || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-56">
                      <select
                        value={problem.assignedTo?._id || problem.assignedTo?.id || ''}
                        onChange={(event) => handleAssign(problem, event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Assign developer</option>
                        {developers.map((developer) => (
                          <option key={developer._id || developer.id} value={developer._id || developer.id}>
                            {getEmployeeName(developer) || developer.employeeId}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openModal('edit', problem)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button onClick={() => handleSolve(problem)} disabled={solved} className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Solved
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {modalMode && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={closeModal} />
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{modalMode === 'edit' ? 'Edit Problem' : 'Add Problem'}</h2>
                  <p className="text-xs text-slate-500">Assign it to a developer from the same screen.</p>
                </div>
                <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={5}
                placeholder="Write the problem statement..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <label className="mt-4 block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign to developer
                </span>
                <select
                  value={form.assignedTo}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Unassigned</option>
                  {developers.map((developer) => (
                    <option key={developer._id || developer.id} value={developer._id || developer.id}>
                      {getEmployeeName(developer) || developer.employeeId}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSave} className="premium-primary-button rounded-xl px-4 py-2 text-sm font-semibold">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProblemStatements;
