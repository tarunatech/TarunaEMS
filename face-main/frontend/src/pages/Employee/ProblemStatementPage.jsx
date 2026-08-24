// src/pages/Employee/ProblemStatementPage.jsx
import React, { useState, useEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  AlertCircle,
  Plus,
  CheckCircle,
  X,
  Clock,
  ShieldCheck,
  MessageSquareWarning,
  Sparkles,
  Send,
  TriangleAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

/* ─────────────────────────────── helpers ─────────────────────────────── */
const getEmployeeName = (person) => {
  if (!person) return 'Employee';
  const personalName =
    `${person.personalInfo?.firstName || ''} ${person.personalInfo?.lastName || ''}`.trim();
  return personalName || person.fullName || person.name || person.email || 'Employee';
};

const getInitials = (name) => {
  if (!name || name === 'Employee') return 'E';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/* ─────────────────────────────── sub-components ──────────────────────── */
const StatCard = ({ icon: Icon, label, value, gradient, delay = '0ms' }) => (
  <div
    className="premium-stat-card rounded-2xl p-5 flex items-center gap-4"
    style={{ animationDelay: delay }}
  >
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
      style={{ background: gradient }}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
    </div>
  </div>
);

const StatusBadge = ({ status, solvedBy }) => {
  if (status === 'Solved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCircle className="w-3.5 h-3.5" />
        Solved
        {solvedBy && (
          <span className="hidden sm:inline text-emerald-600 font-medium">
            · {getEmployeeName(solvedBy)}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  );
};

const AvatarCircle = ({ name }) => {
  const initials = getInitials(name);
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-md"
      style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
    >
      {initials}
    </div>
  );
};

/* ──────────────────────────── main component ─────────────────────────── */
const ProblemStatementPage = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProblem, setNewProblem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get('/auth/me');
        if (profileRes.data?.success) setEmployeeData(profileRes.data.data);

        const problemsRes = await api.get('/problems');
        if (problemsRes.data?.success) setProblems(problemsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load problems:', err);
        toast.error('Failed to load problems');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddProblem = async () => {
    if (!newProblem.trim()) {
      toast.error('Please describe the problem');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post('/problems', { description: newProblem });
      if (res.data?.success) {
        setProblems((prev) => [res.data.data, ...prev]);
        setNewProblem('');
        setShowAddModal(false);
        toast.success('Problem reported successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report problem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSolveProblem = async (problemId) => {
    try {
      const res = await api.patch(`/problems/${problemId}/solve`, {});
      if (res.data?.success) {
        setProblems((prev) =>
          prev.map((p) => (p._id === problemId ? res.data.data : p))
        );
        toast.success('Problem marked as solved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update problem');
    }
  };

  const totalProblems = problems.length;
  const solvedProblems = problems.filter((p) => p.status === 'Solved').length;
  const pendingProblems = problems.filter((p) => p.status !== 'Solved').length;

  /* ── loading state ── */
  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="premium-panel rounded-2xl px-8 py-5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-slate-600 font-medium">Loading problems…</span>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout employeeData={employeeData}>
      <div className="admin-page-shell space-y-6">

        {/* ── Hero Header ───────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl overflow-hidden px-6 py-7 md:px-10 md:py-9 flex flex-col md:flex-row md:items-center justify-between gap-5"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6366f1 100%)',
            boxShadow: '0 20px 50px rgba(79,70,229,0.30)',
            animation: 'adminFadeUp 560ms ease-out both',
          }}
        >
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner flex-shrink-0">
              <MessageSquareWarning className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Problem Statement
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                Report workplace issues &amp; track resolutions in real-time
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Report Problem
          </button>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={AlertCircle}
            label="Total Reported"
            value={totalProblems}
            gradient="linear-gradient(135deg, #6366f1, #7c3aed)"
            delay="60ms"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pendingProblems}
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            delay="120ms"
          />
          <StatCard
            icon={ShieldCheck}
            label="Resolved"
            value={solvedProblems}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            delay="180ms"
          />
        </div>

        {/* ── Problems Panel ─────────────────────────────────────────── */}
        <div className="premium-panel rounded-2xl overflow-hidden" style={{ animationDelay: '220ms' }}>
          {/* panel header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-800 text-sm">All Problems</span>
              {totalProblems > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                  {totalProblems}
                </span>
              )}
            </div>
          </div>

          {problems.length === 0 ? (
            /* ── empty state ── */
            <div className="p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center mb-5 shadow-sm">
                <TriangleAlert className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No problems reported yet</h3>
              <p className="text-slate-500 text-sm mb-5 max-w-xs">
                Everything looks great! If you encounter any issues, click below to report them.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="premium-primary-button px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Report First Problem
              </button>
            </div>
          ) : (
            <>
              {/* ── Mobile cards ── */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {problems.map((problem) => (
                  <div
                    key={problem._id}
                    className="p-4 space-y-3 hover:bg-indigo-50/40 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          problem.status === 'Solved' ? 'bg-emerald-50' : 'bg-amber-50'
                        }`}
                      >
                        <AlertCircle
                          className={`w-4 h-4 ${
                            problem.status === 'Solved' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                      </div>
                      <p className="text-sm text-slate-800 font-medium leading-snug">
                        {problem.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={getEmployeeName(problem.reportedBy)} />
                        <span className="text-xs text-slate-600 font-medium">
                          {getEmployeeName(problem.reportedBy)}
                        </span>
                      </div>
                      <StatusBadge status={problem.status} solvedBy={problem.solvedBy} />
                    </div>

                    {problem.status !== 'Solved' && (
                      <button
                        onClick={() => handleSolveProblem(problem._id)}
                        className="w-full py-2 rounded-xl text-white text-xs font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark as Solved
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50/70">
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Problem
                      </th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Reported By
                      </th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {problems.map((problem) => (
                      <tr key={problem._id} className="premium-table-row group">
                        <td className="px-6 py-4 max-w-sm">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200 ${
                                problem.status === 'Solved' ? 'bg-emerald-50' : 'bg-amber-50'
                              }`}
                            >
                              <AlertCircle
                                className={`w-4 h-4 ${
                                  problem.status === 'Solved' ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              />
                            </div>
                            <span className="text-sm text-slate-800 leading-snug">
                              {problem.description}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <AvatarCircle name={getEmployeeName(problem.reportedBy)} />
                            <span className="text-sm text-slate-700 font-medium">
                              {getEmployeeName(problem.reportedBy)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={problem.status} solvedBy={problem.solvedBy} />
                        </td>
                        <td className="px-6 py-4">
                          {problem.status !== 'Solved' ? (
                            <button
                              onClick={() => handleSolveProblem(problem._id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Mark Solved
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Problem Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          />

          {/* Modal card */}
          <div
            className="relative premium-panel rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            style={{ animation: 'adminFadeUp 320ms ease-out both' }}
          >
            {/* top gradient accent bar */}
            <div
              className="h-1.5 w-full"
              style={{ background: 'linear-gradient(90deg, #6366f1, #7c3aed, #06b6d4)' }}
            />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                  >
                    <MessageSquareWarning className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none">
                      Report a Problem
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Describe the issue you're facing</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Textarea */}
              <div className="space-y-2 mb-5">
                <label className="block text-sm font-semibold text-slate-700">
                  Problem Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  placeholder="Explain the problem clearly — what happened, when it happened, and how it affected your work…"
                  className="premium-input w-full p-3.5 rounded-xl text-sm text-slate-900 placeholder-slate-400 resize-none outline-none"
                  rows={5}
                />
                <p className="text-xs text-slate-400 text-right">{newProblem.length} characters</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProblem}
                  disabled={submitting}
                  className="premium-primary-button px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? 'Submitting…' : 'Submit Problem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
};

export default ProblemStatementPage;
