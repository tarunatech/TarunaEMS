// src/pages/Employee/ProblemStatementPage.js
import React, { useState, useEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { 
  AlertCircle, 
  Plus, 
  CheckCircle, 
  User,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const ProblemStatementPage = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProblem, setNewProblem] = useState('');
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get employee data
        const profileRes = await api.get('/auth/me');
        if (profileRes.data?.success) {
          setEmployeeData(profileRes.data.data);
        }

        // Get all problems
        const problemsRes = await api.get('/problems');
        if (problemsRes.data?.success) {
          setProblems(problemsRes.data.data || []);
        }
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
      toast.error('Please enter a problem description');
      return;
    }

    try {
      const res = await api.post('/problems', 
        { description: newProblem }
      );
      if (res.data?.success) {
        setProblems(prev => [res.data.data, ...prev]);
        setNewProblem('');
        setShowAddModal(false);
        toast.success('Problem reported successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report problem');
    }
  };

  const handleSolveProblem = async (problemId) => {
    try {
      const res = await api.patch(`/problems/${problemId}/solve`, 
        {}
      );
      if (res.data?.success) {
        setProblems(prev =>
          prev.map(p => p._id === problemId ? res.data.data : p)
        );
        toast.success('Problem marked as solved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to solve problem');
    }
  };

  // ... rest of your JSX remains unchanged ...

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="premium-panel rounded-2xl px-6 py-4 text-slate-600 shadow-sm">Loading problems...</div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout employeeData={employeeData}>
      <div className="admin-page-shell space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Problem Statement</h1>
            <p className="text-slate-500">Report issues and track resolutions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="premium-primary-button px-4 py-2 rounded-lg flex items-center justify-center font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Problem
          </button>
        </div>

        {/* Problems Table */}
        <div className="premium-panel rounded-2xl overflow-hidden">
          {problems.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No problems reported</h3>
              <p className="text-slate-500">Click "Add Problem" to report an issue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                {/* Responsive card view for small screens */}
                <div className="block sm:hidden space-y-4">
                  {problems.map(problem => (
                    <div key={problem._id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className={`w-5 h-5 ${problem.status === 'Solved' ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className="text-slate-900 font-semibold break-words">{problem.description}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-sm shadow-blue-500/20">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-slate-700">
                          {problem.reportedBy?.personalInfo?.firstName} {problem.reportedBy?.personalInfo?.lastName}
                        </span>
                      </div>
                      <div>
                        {problem.status === 'Solved' ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Solved</span>
                            {problem.solvedBy && (
                              <span className="ml-2">
                                by {problem.solvedBy.personalInfo?.firstName} {problem.solvedBy.personalInfo?.lastName}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-sm">
                            Pending
                          </span>
                        )}
                      </div>
                      <div>
                        {problem.status !== 'Solved' && (
                          <button
                            onClick={() => handleSolveProblem(problem._id)}
                            className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-center font-medium"
                          >
                            Mark as Solved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table view for sm and larger screens */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left p-2 sm:p-4 text-slate-500 font-semibold">Problem</th>
                        <th className="text-left p-2 sm:p-4 text-slate-500 font-semibold">Reported By</th>
                        <th className="text-left p-2 sm:p-4 text-slate-500 font-semibold">Status</th>
                        <th className="text-left p-2 sm:p-4 text-slate-500 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map(problem => (
                        <tr key={problem._id} className="premium-table-row border-b border-slate-100">
                          <td className="p-2 sm:p-4 text-slate-900 max-w-xs sm:max-w-md">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 ${problem.status === 'Solved' ? 'text-emerald-600' : 'text-amber-600'}`} />
                              <span className="text-sm sm:text-base break-words">{problem.description}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-sm shadow-blue-500/20">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              </div>
                              <span className="text-slate-700 text-sm sm:text-base">
                                {problem.reportedBy?.personalInfo?.firstName} {problem.reportedBy?.personalInfo?.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4">
                            {problem.status === 'Solved' ? (
                              <span className="inline-flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs sm:text-sm">
                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>Solved</span>
                                {problem.solvedBy && (
                                  <span className="ml-1 sm:ml-2 hidden sm:inline">
                                    by {problem.solvedBy.personalInfo?.firstName} {problem.solvedBy.personalInfo?.lastName}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2 sm:px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs sm:text-sm">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-2 sm:p-4">
                            {problem.status !== 'Solved' && (
                              <button
                                onClick={() => handleSolveProblem(problem._id)}
                                className="px-2 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm rounded-lg whitespace-nowrap font-medium"
                              >
                                Mark as Solved
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Problem Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Enhanced backdrop with blur */}
              <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={() => setShowAddModal(false)} />

              {/* Modal content */}
              <div className="relative premium-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900">Report a Problem</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-6 h-6" /> {/* Now defined */}
                  </button>
                </div>
                <textarea
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  placeholder="Describe the problem you're facing..."
                  className="premium-input w-full p-3 rounded-lg text-slate-900 placeholder-slate-400"
                  rows="4"
                />
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProblem}
                    className="premium-primary-button px-4 py-2 rounded-lg w-full sm:w-auto font-semibold"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
    </EmployeeLayout>
  );
};
export default ProblemStatementPage;
