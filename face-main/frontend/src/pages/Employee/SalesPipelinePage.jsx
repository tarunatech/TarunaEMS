import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GitBranch, Loader2, Search, User } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('employee-pipeline-leads-collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('employee-pipeline-leads-collapsed', String(next));
      return next;
    });
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadAPI.getLeads({ limit: 1000 });
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

  useEffect(() => {
    const requestedLeadId = searchParams.get('leadId');
    if (requestedLeadId && requestedLeadId !== selectedLeadId && leads.some((lead) => lead._id === requestedLeadId)) {
      setSelectedLeadId(requestedLeadId);
    }
  }, [searchParams, leads, selectedLeadId]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase().trim();
    return leads.filter((lead) => {
      const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase();
      const company = (lead.company || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();
      return fullName.includes(term) || company.includes(term) || email.includes(term);
    });
  }, [leads, searchTerm]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead._id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

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
      <div className="employee-sales-pipeline-page flex flex-col gap-4 lg:h-[calc(100vh-104px)] w-full min-w-0 max-w-full">
        {/* Header */}
        <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Sales Pipeline</h1>
            <p className="text-[13px] text-slate-500">Track client, quotation, proposal, negotiation, and closure stages.</p>
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
          <div className={`grid flex-1 min-h-0 min-w-0 w-full max-w-full gap-4 transition-[grid-template-columns] duration-200 ease-out ${
            isCollapsed
              ? 'lg:grid-cols-[68px_minmax(0,1fr)]'
              : 'lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)]'
          }`}>
            {/* Leads list */}
            <aside className="sales-pipeline-leads flex min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {/* Aside Header */}
              <div className={`flex-shrink-0 border-b border-slate-100 ${
                isCollapsed ? 'p-2 flex flex-col items-center gap-1.5' : 'px-3 py-2.5 space-y-2'
              }`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'justify-between'}`}>
                  {!isCollapsed ? (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 truncate">My Leads</p>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                          {filteredLeads.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleCollapse}
                        className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Collapse list"
                        aria-label="Collapse list"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleCollapse}
                      className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Expand list"
                      aria-label="Expand list"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search leads..."
                      className="w-full rounded-md border border-slate-200 bg-slate-50/50 pl-8 pr-2.5 py-1 text-[12px] text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Leads scrollable area */}
              <div className="flex-1 min-h-0 max-h-48 lg:max-h-none overflow-y-auto p-2 touch-pan-y">
                <div className="space-y-1">
                  {filteredLeads.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-slate-400">
                      {isCollapsed ? '—' : 'No matching leads'}
                    </div>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isActive = selectedLeadId === lead._id;
                      const leadTooltip = `${lead.firstName} ${lead.lastName}${lead.company ? ` (${lead.company})` : ''}`;
                      return (
                        <button
                          key={lead._id}
                          type="button"
                          onClick={() => handleSelectLead(lead._id)}
                          title={isCollapsed ? leadTooltip : undefined}
                          className={`group relative flex w-full items-center rounded-lg transition-colors duration-150 ${
                            isCollapsed
                              ? 'justify-center h-10 w-10 mx-auto'
                              : 'gap-2.5 px-2.5 py-2 text-left'
                          } ${
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
                          {!isCollapsed && (
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-[13px] font-medium ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>
                                {lead.firstName} {lead.lastName}
                              </span>
                              <span className="block truncate text-[11.5px] text-slate-400">{lead.company || 'No company'}</span>
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Aside Footer collapse toggle button */}
              <div className="flex-shrink-0 border-t border-slate-100 p-1.5 hidden lg:block">
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className={`w-full flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150 ${
                    isCollapsed ? 'h-8 w-8 mx-auto' : 'h-7 gap-1.5 text-[11.5px] font-medium'
                  }`}
                  title={isCollapsed ? 'Expand leads list' : 'Collapse leads list'}
                  aria-label={isCollapsed ? 'Expand leads list' : 'Collapse leads list'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <>
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Collapse list</span>
                    </>
                  )}
                </button>
              </div>
            </aside>

            {/* Pipeline detail */}
            <main className="sales-pipeline-main flex-1 min-h-0 min-w-0 w-full max-w-full lg:overflow-y-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-3 sm:p-6 overflow-hidden sm:overflow-visible">
              {selectedLead ? (
                <SalesPipelineModal
                  key={`${selectedLead._id}-${searchParams.get('stage') || 'default'}`}
                  lead={selectedLead}
                  role="employee"
                  embedded
                  initialStage={searchParams.get('stage')}
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
