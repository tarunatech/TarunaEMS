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
          <div className="text-white">Loading problems...</div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout employeeData={employeeData}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Problem Statement</h1>
            <p className="text-secondary-400">Report issues and track resolutions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Problem
          </button>
        </div>

        {/* Problems Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          {problems.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <AlertCircle className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No problems reported</h3>
              <p className="text-secondary-500">Click "Add Problem" to report an issue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                {/* Responsive card view for small screens */}
                <div className="block sm:hidden space-y-4">
                  {problems.map(problem => (
                    <div key={problem._id} className="glass-morphism neon-border rounded-2xl p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className={`w-5 h-5 ${problem.status === 'Solved' ? 'text-green-400' : 'text-yellow-400'}`} />
                        <span className="text-white font-semibold break-words">{problem.description}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white">
                          {problem.reportedBy?.personalInfo?.firstName} {problem.reportedBy?.personalInfo?.lastName}
                        </span>
                      </div>
                      <div>
                        {problem.status === 'Solved' ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Solved</span>
                            {problem.solvedBy && (
                              <span className="ml-2">
                                by {problem.solvedBy.personalInfo?.firstName} {problem.solvedBy.personalInfo?.lastName}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 text-sm">
                            Pending
                          </span>
                        )}
                      </div>
                      <div>
                        {problem.status !== 'Solved' && (
                          <button
                            onClick={() => handleSolveProblem(problem._id)}
                            className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-center"
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
                    <thead className="border-b border-secondary-700">
                      <tr>
                        <th className="text-left p-2 sm:p-4 text-secondary-300 font-medium">Problem</th>
                        <th className="text-left p-2 sm:p-4 text-secondary-300 font-medium">Reported By</th>
                        <th className="text-left p-2 sm:p-4 text-secondary-300 font-medium">Status</th>
                        <th className="text-left p-2 sm:p-4 text-secondary-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map(problem => (
                        <tr key={problem._id} className="border-b border-secondary-800 hover:bg-secondary-800/30">
                          <td className="p-2 sm:p-4 text-white max-w-xs sm:max-w-md">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 ${problem.status === 'Solved' ? 'text-green-400' : 'text-yellow-400'}`} />
                              <span className="text-sm sm:text-base break-words">{problem.description}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              </div>
                              <span className="text-white text-sm sm:text-base">
                                {problem.reportedBy?.personalInfo?.firstName} {problem.reportedBy?.personalInfo?.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4">
                            {problem.status === 'Solved' ? (
                              <span className="inline-flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-xs sm:text-sm">
                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>Solved</span>
                                {problem.solvedBy && (
                                  <span className="ml-1 sm:ml-2 hidden sm:inline">
                                    by {problem.solvedBy.personalInfo?.firstName} {problem.solvedBy.personalInfo?.lastName}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2 sm:px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 text-xs sm:text-sm">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-2 sm:p-4">
                            {problem.status !== 'Solved' && (
                              <button
                                onClick={() => handleSolveProblem(problem._id)}
                                className="px-2 sm:px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm rounded-lg whitespace-nowrap"
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
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowAddModal(false)} />

              {/* Modal content */}
              <div className="relative glass-morphism neon-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Report a Problem</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-secondary-400 hover:text-white">
                    <X className="w-6 h-6" /> {/* Now defined */}
                  </button>
                </div>
                <textarea
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  placeholder="Describe the problem you're facing..."
                  className="w-full p-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink"
                  rows="4"
                />
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-secondary-600 text-secondary-300 rounded-lg w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProblem}
                    className="px-4 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg w-full sm:w-auto"
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