import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowRight, UserCheck, Calendar, Briefcase, ChevronRight, Layers, Target, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { leadAPI, salesPipelineAPI } from '../../../utils/api';

const STAGE_COLORS = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  Qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Proposal: 'bg-purple-50 text-purple-700 border-purple-200',
  Negotiation: 'bg-violet-50 text-violet-700 border-violet-200',
  Won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost: 'bg-rose-50 text-rose-700 border-rose-200'
};

const LeadOverviewSection = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const INITIAL_COUNT = 3;

  useEffect(() => {
    fetchActiveLeads();
  }, []);

  const fetchActiveLeads = async () => {
    try {
      setLoading(true);
      const [leadsRes, pipelinesRes] = await Promise.all([
        leadAPI.getLeads({ includeAll: true, limit: 50 }),
        salesPipelineAPI.getAll().catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (leadsRes.data?.success) {
        const fetched = Array.isArray(leadsRes.data.data?.leads)
          ? leadsRes.data.data.leads
          : Array.isArray(leadsRes.data.data)
            ? leadsRes.data.data
            : [];
        setLeads(fetched);
      }

      if (pipelinesRes.data?.success) {
        setPipelines(Array.isArray(pipelinesRes.data.data) ? pipelinesRes.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch lead overview for dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Active leads (excluding Won/Lost for active focus)
  const activeLeads = leads.filter(l => !['Won', 'Lost'].includes(l.status));
  const displayLeads = showAll ? activeLeads : activeLeads.slice(0, INITIAL_COUNT);

  // Summary Metrics
  const totalValue = activeLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const pipelineByLeadId = useMemo(() => {
    const map = new Map();
    pipelines.forEach((pipeline) => {
      const key = String(pipeline?.lead?._id || pipeline?.lead?.id || pipeline?.lead || '');
      if (key) map.set(key, pipeline);
    });
    return map;
  }, [pipelines]);
  
  const stageCounts = {
    New: activeLeads.filter(l => l.status === 'New').length,
    Contacted: activeLeads.filter(l => l.status === 'Contacted').length,
    Proposal: activeLeads.filter((l) => {
      const pipeline = pipelineByLeadId.get(String(l._id || l.id));
      const proposalStatus = pipeline?.proposal?.status;
      const hasProposalContent = !!(
        pipeline?.proposal?.sections &&
        Object.values(pipeline.proposal.sections).some((value) => {
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          return Boolean(value);
        })
      );
      return l.status === 'Proposal' || l.status === 'Qualified' || proposalStatus === 'generated' || proposalStatus === 'finalized' || hasProposalContent;
    }).length,
    Negotiation: activeLeads.filter(l => l.status === 'Negotiation').length
  };

  const handleLeadClick = (lead) => {
    const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.fullName || lead.company || '';

    navigate('/admin/sales', {
      state: {
        leadFilter: leadName,
        search: leadName,
        leadName: leadName,
        leadId: lead._id || lead.id
      }
    });
  };

  const handleViewAllSales = () => {
    navigate('/admin/sales');
  };

  const getAssignedName = (assignedTo) => {
    if (!assignedTo) return 'Unassigned';
    if (typeof assignedTo === 'object') {
      const first = assignedTo.personalInfo?.firstName || assignedTo.firstName || '';
      const last = assignedTo.personalInfo?.lastName || assignedTo.lastName || '';
      const name = `${first} ${last}`.trim();
      return name || assignedTo.name || assignedTo.employeeId || 'Assigned BDE';
    }
    return 'Assigned BDE';
  };

  return (
    <div className="dashboard-panel lead-overview-panel bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Active Leads & Sales Progress</h2>
            <span className="text-xs sm:text-[13px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
              {activeLeads.length} Active
            </span>
          </div>
          <p className="text-[12.5px] sm:text-[13px] text-slate-500 mt-0.5">Click any active lead to open and filter in Sales Dashboard</p>
        </div>

        <button
          onClick={handleViewAllSales}
          className="inline-flex items-center gap-1.5 text-[13px] sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all self-start sm:self-auto"
        >
          <span>View All Sales Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Stage Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between px-2.5 py-2 sm:py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600 truncate mr-1">New Leads</span>
          <span className="text-[13.5px] font-bold text-blue-600 shrink-0">{stageCounts.New}</span>
        </div>
        <div className="flex items-center justify-between px-2.5 py-2 sm:py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600 truncate mr-1">Contacted</span>
          <span className="text-[13.5px] font-bold text-amber-600 shrink-0">{stageCounts.Contacted}</span>
        </div>
        <div className="flex items-center justify-between px-2.5 py-2 sm:py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600 truncate mr-1">Proposal</span>
          <span className="text-[13.5px] font-bold text-purple-600 shrink-0">{stageCounts.Proposal}</span>
        </div>
        <div className="flex items-center justify-between px-2.5 py-2 sm:py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600 truncate mr-1">Est. Pipeline</span>
          <span className="text-[13.5px] font-bold text-emerald-600 shrink-0">₹{totalValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Active Leads Cards */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs sm:text-sm">
          Loading active leads...
        </div>
      ) : displayLeads.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs sm:text-sm">
          No active leads currently in pipeline.
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {displayLeads.map((lead) => {
              const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.fullName || 'Lead Contact';
              const company = lead.company || 'Direct Inquiry';
              const pipeline = pipelineByLeadId.get(String(lead._id || lead.id));
              const reqText = pipeline?.clientDetails?.requirements || lead.notes || lead.position || lead.source || 'General Sales Lead';
              const stageStyle = STAGE_COLORS[lead.status] || STAGE_COLORS.New;

              return (
                <div
                  key={lead._id || lead.id}
                  onClick={() => handleLeadClick(lead)}
                  className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Top Row: Name & Stage */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {name}
                      </p>
                      <p className="text-[12px] font-medium text-slate-500 truncate flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{company}</span>
                      </p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stageStyle}`}>
                      {lead.status || 'New'}
                    </span>
                  </div>

                  {/* Requirement / Notes summary */}
                  <p className="text-[12px] sm:text-[12.5px] text-slate-600 line-clamp-2 mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-snug">
                    <span className="font-bold text-slate-700">Requirement: </span>
                    {reqText}
                  </p>

                  {/* Bottom Row: Assigned To & Value */}
                  <div className="flex items-center justify-between text-[12px] text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate max-w-[60%] font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{getAssignedName(lead.assignedTo)}</span>
                    </div>

                    {lead.estimatedValue ? (
                      <span className="font-extrabold text-[13px] text-slate-900 shrink-0">
                        ₹{Number(lead.estimatedValue).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 shrink-0 font-medium">N/A</span>
                    )}
                  </div>

                  {/* Next Follow-up — only show if date is today or in the future */}
                  {lead.nextFollowUpDate && (() => {
                    const followDate = new Date(lead.nextFollowUpDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (followDate < today) return null;
                    const formatted = followDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium text-slate-500">
                          Next Follow-up:&nbsp;
                        </span>
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-slate-700">
                          {formatted}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Show More / Show Less Toggle Button */}
          {activeLeads.length > INITIAL_COUNT && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs sm:text-[13px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
              >
                {showAll ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  </>
                ) : (
                  <>
                    <span>Show More ({activeLeads.length - INITIAL_COUNT} More)</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadOverviewSection;
