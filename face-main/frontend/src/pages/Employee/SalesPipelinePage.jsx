import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import SalesPipelineModal from '../../components/Sales/SalesPipelineModal';
import { leadAPI } from '../../utils/api';

const SalesPipelinePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(searchParams.get('leadId') || '');

  const selectedLead = useMemo(
    () => leads.find((lead) => lead._id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadAPI.getLeads();
      if (response.data.success) {
        const fetched = response.data.data.leads || [];
        setLeads(fetched);
        const requestedLeadId = searchParams.get('leadId');
        if (requestedLeadId && fetched.some((lead) => lead._id === requestedLeadId)) {
          setSelectedLeadId(requestedLeadId);
        } else if (!selectedLeadId && fetched.length > 0) {
          setSelectedLeadId(fetched[0]._id);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSelectLead = (leadId) => {
    setSelectedLeadId(leadId);
    navigate(`/employee/sales-pipeline?leadId=${leadId}`, { replace: true });
  };

  const getInitials = (lead) => {
    const first = lead.firstName?.[0] || '';
    const last = lead.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  return (
    <EmployeeLayout>
      <div className="employee-sales-pipeline-page flex flex-col gap-4 lg:h-[calc(100vh-104px)]">
        {/* Header */}
        <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Sales Pipeline</h1>
            <p className="text-[13px] text-slate-500">Track client, quotation, approval, negotiation, and closure stages.</p>
          </div>
          {!loading && leads.length > 0 && (
            <span className="text-[12px] font-medium text-slate-400">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
              <p className="text-[13px] font-medium text-slate-500">Loading sales pipelines…</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <GitBranch className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
            </div>
            <p className="text-[14px] font-medium text-slate-900">No leads available</p>
            <p className="mt-1 text-[12.5px] text-slate-500">Add or receive a lead first to start a sales pipeline.</p>
          </div>
        ) : (
          <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)]">
            {/* Leads list */}
            <aside className="sales-pipeline-leads flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">My Leads</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2">
                <div className="space-y-1">
                  {leads.map((lead) => {
                    const isActive = selectedLeadId === lead._id;
                    return (
                      <button
                        key={lead._id}
                        type="button"
                        onClick={() => handleSelectLead(lead._id)}
                        className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-indigo-500" />
                        )}
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                          isActive ? 'bg-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}>
                          {getInitials(lead)}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate text-[13px] font-medium ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {lead.firstName} {lead.lastName}
                          </span>
                          <span className="block truncate text-[11.5px] text-slate-400">{lead.company || 'No company'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Pipeline detail */}
            <main className="sales-pipeline-main min-h-0 overflow-y-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {selectedLead ? (
                <SalesPipelineModal
                  lead={selectedLead}
                  role="employee"
                  embedded
                  onUpdated={fetchLeads}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-center text-[13px] text-slate-400">
                  Select a lead to view its pipeline.
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default SalesPipelinePage;
