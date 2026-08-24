import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { payslipAPI, employeeAPI } from '../../utils/api';
import {
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPayslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  const currentDate = new Date();
  const [bulkFormData, setBulkFormData] = useState({
    employeeId: '',
    startMonth: currentDate.getMonth() + 1,
    startYear: currentDate.getFullYear(),
    endMonth: currentDate.getMonth() + 1,
    endYear: currentDate.getFullYear(),
    basicSalary: 0
  });

  const handleBulkEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    setBulkFormData(prev => ({
      ...prev,
      employeeId,
      basicSalary: employee?.salaryInfo?.basicSalary || 0
    }));
  };
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  
  const [formData, setFormData] = useState({
    employeeId: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    earnings: {
      basicSalary: 0,
      hra: 0,
      medical: 0,
      transport: 0,
      bonus: 0,
      overtime: 0,
      otherAllowances: 0
    },
    deductions: {
      pf: 0,
      esi: 0,
      tax: 0,
      professionalTax: 0,
      loanDeduction: 0,
      otherDeductions: 0
    },
    remarks: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  useEffect(() => {
    fetchPayslips();
    fetchEmployees();
  }, [filterMonth, filterYear]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await payslipAPI.getPayslips({ month: filterMonth, year: filterYear });
      console.log('Payslips response:', response.data); // Debug log
      setPayslips(response.data?.data?.payslips || []); // ✅ Fixed: Correct nested path
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getEmployees({ status: 'Active', limit: 100 });
      setEmployees(response.data?.data?.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleEmployeeSelect = async (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        earnings: {
          basicSalary: employee.salaryInfo?.basicSalary || 0,
          hra: employee.salaryInfo?.allowances?.hra || 0,
          medical: employee.salaryInfo?.allowances?.medical || 0,
          transport: employee.salaryInfo?.allowances?.transport || 0,
          bonus: 0,
          overtime: 0,
          otherAllowances: employee.salaryInfo?.allowances?.other || 0
        },
        deductions: {
          pf: employee.salaryInfo?.deductions?.pf || 0,
          esi: employee.salaryInfo?.deductions?.esi || 0,
          tax: employee.salaryInfo?.deductions?.tax || 0,
          professionalTax: 0,
          loanDeduction: 0,
          otherDeductions: employee.salaryInfo?.deductions?.other || 0
        }
      }));
    }
  };

  const handleGeneratePayslip = async (e, forceRegenerate = false) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setGenerating(true);
      const dataToSend = { ...formData };
      if (forceRegenerate) {
        dataToSend.regenerate = true;
      }

      const response = await payslipAPI.generatePayslip(dataToSend);
      toast.success(forceRegenerate ? 'Payslip regenerated successfully!' : 'Payslip generated successfully!');
      setShowGenerateModal(false);
      resetForm();
      fetchPayslips();
    } catch (error) {
      console.error('Error generating payslip:', error);

      // Check if error is due to existing payslip
      if (error.response?.data?.canRegenerate) {
        const existingPayslip = error.response.data.existingPayslip;
        const monthName = months[formData.month - 1];

        // Show confirmation dialog
        const confirmed = window.confirm(
          `A payslip already exists for this employee for ${monthName} ${formData.year}.\n\n` +
          `Generated: ${new Date(existingPayslip.generatedAt).toLocaleDateString()}\n` +
          `Net Salary: ₹${existingPayslip.netSalary?.toLocaleString()}\n\n` +
          `Do you want to regenerate it? This will delete the existing payslip and create a new one.`
        );

        if (confirmed) {
          // Retry with regenerate flag
          handleGeneratePayslip(e, true);
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to generate payslip');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async (regenerate = false) => {
    if (!bulkFormData.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!bulkFormData.basicSalary || bulkFormData.basicSalary <= 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    try {
      setGenerating(true);
      const response = await payslipAPI.bulkGenerate({
        employeeId: bulkFormData.employeeId,
        startMonth: bulkFormData.startMonth,
        startYear: bulkFormData.startYear,
        endMonth: bulkFormData.endMonth,
        endYear: bulkFormData.endYear,
        basicSalary: bulkFormData.basicSalary,
        regenerate
      });

      const results = response.data.data;
      const message = response.data.message;

      // Show detailed results
      if (results.success?.length > 0 || results.regenerated?.length > 0) {
        toast.success(message);
      }
      
      if (results.skipped?.length > 0) {
        const confirmed = window.confirm(
          `Some payslips in the selected range already exist.\n\n` +
          `${results.skipped.length} periods already have payslips.\n\n` +
          `Do you want to regenerate them? This will delete existing payslips and create new ones.`
        );

        if (confirmed) {
          handleBulkGenerate(true);
          return;
        }
      }

      setShowBulkModal(false);
      fetchPayslips();
    } catch (error) {
      console.error('Error bulk generating payslips:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (payslipId) => {
    try {
      const response = await payslipAPI.downloadPayslip(payslipId);

      // The response.data is already a Blob when responseType: 'blob' is set
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Get payslip details for better filename
      const payslip = payslips.find(p => p._id === payslipId);
      const filename = payslip
        ? `Payslip_${payslip.employeeId}_${payslip.period.month}_${payslip.period.year}.pdf`
        : `payslip_${payslipId}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success('Payslip downloaded successfully!');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error(error.response?.data?.message || 'Failed to download payslip');
    }
  };

  const handleDelete = async (payslipId) => {
    if (!window.confirm('Are you sure you want to delete this payslip?')) return;
    
    try {
      await payslipAPI.deletePayslip(payslipId);
      toast.success('Payslip deleted');
      fetchPayslips();
    } catch (error) {
      console.error('Error deleting payslip:', error);
      toast.error('Failed to delete payslip');
    }
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowViewModal(true);
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openPayslipDetails = (event, payslip) => {
    if (isInteractiveClick(event)) return;
    handleViewPayslip(payslip);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      earnings: {
        basicSalary: 0,
        hra: 0,
        medical: 0,
        transport: 0,
        bonus: 0,
        overtime: 0,
        otherAllowances: 0
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        professionalTax: 0,
        loanDeduction: 0,
        otherDeductions: 0
      },
      remarks: ''
    });
  };

  const calculateTotals = () => {
    const grossEarnings = Object.values(formData.earnings).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const totalDeductions = Object.values(formData.deductions).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const netSalary = grossEarnings - totalDeductions;
    return { grossEarnings, totalDeductions, netSalary };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'generated': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 bg-slate-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payslip Management</h1>
            <p className="text-slate-500 mt-1">Generate and manage employee payslips</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center space-x-2 transition-all duration-200"
            >
              <Users className="w-5 h-5" />
              <span>Bulk Generate</span>
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg flex items-center space-x-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Generate Payslip</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchPayslips}
              className="px-4 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center space-x-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="ml-auto text-slate-500">
              Total: {payslips.length} payslips
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No payslips found for {months[filterMonth - 1]} {filterYear}</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200"
              >
                Generate First Payslip
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payslips.map((payslip) => (
                    <tr key={payslip._id} onClick={(event) => openPayslipDetails(event, payslip)} className="hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{payslip.employeeName}</p>
                          <p className="text-sm text-slate-500">{payslip.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {months[payslip.period.month - 1]} {payslip.period.year}
                      </td>
                      <td className="px-4 py-4 text-right text-green-600 font-medium">
                        INR {payslip.grossEarnings?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-right text-red-600 font-medium">
                        INR {payslip.totalDeductions?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-900 font-bold">
                        INR {payslip.netSalary?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(payslip.status)}`}>
                          {payslip.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewPayslip(payslip)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(payslip._id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payslip._id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)} />
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Generate Payslip</h2>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGeneratePayslip} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Employee *</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.personalInfo?.firstName} {emp.personalInfo?.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Month *</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Year *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-green-600 border-b border-slate-200 pb-2">Earnings</h3>
                    {Object.entries(formData.earnings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            earnings: { ...prev.earnings, [key]: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-red-600 border-b border-slate-200 pb-2">Deductions</h3>
                    {Object.entries(formData.deductions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            deductions: { ...prev.deductions, [key]: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-500">Gross Earnings</p>
                      <p className="text-xl font-bold text-green-600">INR {calculateTotals().grossEarnings.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Deductions</p>
                      <p className="text-xl font-bold text-red-600">INR {calculateTotals().totalDeductions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Net Salary</p>
                      <p className="text-xl font-bold text-slate-900">INR {calculateTotals().netSalary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    rows={2}
                    placeholder="Optional remarks..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? 'Generating...' : 'Generate Payslip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Bulk Generate Payslips</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-slate-600">
                  Select an employee and period range to generate multiple monthly payslips.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Employee</label>
                  <select
                    value={bulkFormData.employeeId}
                    onChange={(e) => handleBulkEmployeeSelect(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Month</label>
                    <select
                      value={bulkFormData.startMonth}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, startMonth: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Year</label>
                    <select
                      value={bulkFormData.startYear}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, startYear: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Month</label>
                    <select
                      value={bulkFormData.endMonth}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, endMonth: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Year</label>
                    <select
                      value={bulkFormData.endYear}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, endYear: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Basic Salary Amount (INR)</label>
                  <input
                    type="number"
                    value={bulkFormData.basicSalary}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    min="0"
                    placeholder="Enter basic salary"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-700 font-medium">Note</p>
                      <p className="text-xs text-slate-600">
                        Existing payslips for the selected periods will be skipped unless you choose to regenerate them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBulkGenerate(false)}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? 'Generating...' : 'Generate Payslips'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showViewModal && selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
            <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl lg:max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:px-6 sm:pb-0 sm:pt-6">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Payslip Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="grid grid-cols-2 gap-3 text-sm sm:gap-4 sm:text-base">
                  <div>
                    <p className="text-sm text-slate-500">Employee</p>
                    <p className="text-slate-900 font-semibold">{selectedPayslip.employeeName}</p>
                    <p className="text-sm text-slate-500">{selectedPayslip.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Period</p>
                    <p className="text-slate-900 font-semibold">{months[selectedPayslip.period.month - 1]} {selectedPayslip.period.year}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3 sm:p-4">
                    <h3 className="mb-2 font-bold text-green-700 sm:mb-3">Earnings</h3>
                    <div className="space-y-1.5 text-sm sm:space-y-2">
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Basic</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.basicSalary?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">HRA</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.hra?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Medical</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.medical?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Transport</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.transport?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Bonus</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.bonus?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Overtime</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.overtime?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Other</span><span className="text-right text-slate-900">INR {selectedPayslip.earnings?.otherAllowances?.toLocaleString()}</span></div>
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between gap-3 font-bold"><span className="text-green-700">Total</span><span className="text-right text-green-700">INR {selectedPayslip.grossEarnings?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 sm:p-4">
                    <h3 className="mb-2 font-bold text-red-700 sm:mb-3">Deductions</h3>
                    <div className="space-y-1.5 text-sm sm:space-y-2">
                      <div className="flex justify-between gap-3"><span className="text-slate-600">PF</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.pf?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">ESI</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.esi?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Income Tax</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.tax?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Prof. Tax</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.professionalTax?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Loan</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.loanDeduction?.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">Other</span><span className="text-right text-slate-900">INR {selectedPayslip.deductions?.otherDeductions?.toLocaleString()}</span></div>
                      <div className="border-t border-red-200 pt-2 mt-2">
                        <div className="flex justify-between gap-3 font-bold"><span className="text-red-700">Total</span><span className="text-right text-red-700">INR {selectedPayslip.totalDeductions?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center sm:p-4">
                  <p className="text-slate-600 text-sm">Net Salary</p>
                  <p className="text-2xl font-bold text-slate-900 sm:text-3xl">INR {selectedPayslip.netSalary?.toLocaleString()}</p>
                </div>

                {selectedPayslip.attendance && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <h3 className="mb-3 font-bold text-slate-900">Attendance Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-4">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{selectedPayslip.attendance.workingDays}</p>
                        <p className="text-xs text-slate-500">Working Days</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{selectedPayslip.attendance.presentDays}</p>
                        <p className="text-xs text-slate-500">Present</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{selectedPayslip.attendance.leaveDays}</p>
                        <p className="text-xs text-slate-500">Leave</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{selectedPayslip.attendance.absentDays}</p>
                        <p className="text-xs text-slate-500">Absent</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-3 sm:pt-4">
                  <button
                    onClick={() => handleDownload(selectedPayslip._id)}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayslips;
