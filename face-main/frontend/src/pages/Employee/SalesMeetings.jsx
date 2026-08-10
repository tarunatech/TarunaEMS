import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CheckCircle, ChevronDown, Clock, Edit3, Loader2, Phone, Search, UserCheck, Video, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { leadAPI } from '../../utils/api';

const SalesMeetings = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLeadIds, setExpandedLeadIds] = useState(new Set());
  const groupRefs = useRef({});
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    type: 'Call',
    scheduledDate: '',
    duration: 30,
    status: 'Scheduled',
    agenda: ''
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadAPI.getLeads();
      if (response.data.success) {
        setLeads(response.data.data.leads || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load sales meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const meetings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return leads
      .flatMap((lead) => (lead.meetings || []).map((meeting) => ({
        ...meeting,
        leadId: lead._id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead',
        company: lead.company || 'No company',
        email: lead.email,
        phone: lead.phone,
        status: meeting.status || 'Scheduled'
      })))
      .filter((meeting) => {
        if (!normalizedSearch) return true;
        return [
          meeting.leadName,
          meeting.company,
          meeting.type,
          meeting.status,
          meeting.agenda
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }, [leads, searchTerm]);

  const scheduledCount = meetings.filter((meeting) => meeting.status === 'Scheduled').length;
  const completedCount = meetings.filter((meeting) => meeting.status === 'Completed').length;
  const meetingGroups = useMemo(() => {
    const groups = new Map();
    meetings.forEach((meeting) => {
      const group = groups.get(meeting.leadId) || {
        leadId: meeting.leadId,
        leadName: meeting.leadName,
        company: meeting.company,
        meetings: []
      };
      group.meetings.push(meeting);
      groups.set(meeting.leadId, group);
    });

    return Array.from(groups.values())
      .map((group) => {
        const sortedMeetings = [...group.meetings].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        const upcomingMeeting = sortedMeetings.find((meeting) => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) >= new Date());
        return {
          ...group,
          meetings: sortedMeetings,
          nearestMeeting: upcomingMeeting || sortedMeetings[0]
        };
      })
      .sort((a, b) => new Date(a.nearestMeeting?.scheduledDate || 0) - new Date(b.nearestMeeting?.scheduledDate || 0));
  }, [meetings]);

  const nextMeeting = [...meetings]
    .filter((meeting) => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) >= new Date())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

  const toggleLead = (leadId) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else {
        next.add(leadId);
        window.setTimeout(() => {
          const node = groupRefs.current[leadId];
          if (!node) return;
          const mainScroller = document.getElementById('employee-main-scroll');
          if (mainScroller) {
            const scrollerTop = mainScroller.getBoundingClientRect().top;
            const nodeTop = node.getBoundingClientRect().top;
            mainScroller.scrollTo({
              top: mainScroller.scrollTop + nodeTop - scrollerTop - 18,
              behavior: 'smooth'
            });
            return;
          }
          node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
      return next;
    });
  };

  const openEditMeeting = (meeting) => {
    setEditingMeeting(meeting);
    setMeetingForm({
      type: meeting.type || 'Call',
      scheduledDate: toInputDateTime(meeting.scheduledDate),
      duration: meeting.duration || 30,
      status: meeting.status || 'Scheduled',
      agenda: meeting.agenda || ''
    });
  };

  const updateMeeting = async (meeting, data, successMessage = 'Meeting updated') => {
    try {
      await leadAPI.updateMeeting(meeting.leadId, meeting._id || meeting.id, data);
      toast.success(successMessage);
      await fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update meeting');
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingMeeting) return;

    await updateMeeting(editingMeeting, {
      ...meetingForm,
      scheduledDate: new Date(meetingForm.scheduledDate).toISOString(),
      duration: Number(meetingForm.duration) || 30
    });
    setEditingMeeting(null);
  };

  return (
    <EmployeeLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sales Meetings</p>
              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Scheduled Meeting History</h1>
              <p className="mt-1 text-sm text-slate-500">All meetings across your leads, sorted by earliest scheduled date and time.</p>
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search meetings..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard title="Total Meetings" value={meetings.length} icon={Calendar} tone="blue" />
            <SummaryCard title="Scheduled" value={scheduledCount} icon={Clock} tone="indigo" />
            <SummaryCard title="Completed" value={completedCount} icon={UserCheck} tone="emerald" />
          </div>
        </div>

        {nextMeeting && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/70 to-blue-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Next Upcoming</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{nextMeeting.leadName}</h2>
                <p className="text-sm text-slate-500">{nextMeeting.company}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
                <InfoPill label="Date" value={formatDate(nextMeeting.scheduledDate)} />
                <InfoPill label="Time" value={formatTime(nextMeeting.scheduledDate)} />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-bold text-slate-900">Meeting List</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
              Loading meetings...
            </div>
          ) : meetings.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No meetings found</p>
              <p className="mt-1 text-xs text-slate-500">Meetings scheduled from Sales will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 p-3 sm:p-4">
              {meetingGroups.map((group) => (
                <MeetingGroup
                  key={group.leadId}
                  ref={(node) => {
                    if (node) groupRefs.current[group.leadId] = node;
                    else delete groupRefs.current[group.leadId];
                  }}
                  group={group}
                  expanded={expandedLeadIds.has(group.leadId)}
                  onToggle={() => toggleLead(group.leadId)}
                  onEdit={openEditMeeting}
                  onMarkDone={(meeting) => updateMeeting(meeting, { status: 'Completed' }, 'Meeting marked as done')}
                />
              ))}
            </div>
          )}
        </div>

        {editingMeeting && (
          <MeetingEditModal
            form={meetingForm}
            setForm={setMeetingForm}
            onSubmit={handleEditSubmit}
            onClose={() => setEditingMeeting(null)}
          />
        )}
      </div>
    </EmployeeLayout>
  );
};

const MeetingGroup = React.forwardRef(({ group, expanded, onToggle, onEdit, onMarkDone }, ref) => {
  const nearest = group.nearestMeeting;
  const icon = getMeetingIcon(nearest?.type);

  return (
    <div ref={ref} className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-900/5 ${expanded ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_240px_40px] lg:items-center"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            {React.createElement(icon, { className: 'h-5 w-5' })}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-extrabold text-slate-950">{group.leadName}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {group.meetings.length} meeting{group.meetings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{group.company}</p>
            {nearest && (
              <p className="mt-2 text-xs font-medium text-indigo-700">
                Nearest: {nearest.type} on {formatDate(nearest.scheduledDate)} at {formatTime(nearest.scheduledDate)}
              </p>
            )}
          </div>
        </div>

        {nearest && (
          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
            <span className="flex items-center gap-2 text-slate-700"><Calendar className="h-4 w-4 text-slate-400" />{formatDate(nearest.scheduledDate)}</span>
            <span className="flex items-center gap-2 text-slate-700"><Clock className="h-4 w-4 text-slate-400" />{formatTime(nearest.scheduledDate)}</span>
          </div>
        )}

        <div className="flex justify-end">
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">All meetings for this lead</p>
                <h3 className="text-sm font-bold text-slate-950">{group.leadName}</h3>
              </div>
              <span className="text-xs font-medium text-slate-500">Ordered by date and time</span>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-2">
              {group.meetings.map((meeting, index) => (
                <MeetingRow
                  key={meeting._id || meeting.meetingId || `${meeting.leadId}-${meeting.scheduledDate}-${index}`}
                  meeting={meeting}
                  onEdit={() => onEdit(meeting)}
                  onMarkDone={() => onMarkDone(meeting)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MeetingGroup.displayName = 'MeetingGroup';

const MeetingRow = ({ meeting, onEdit, onMarkDone }) => {
  const icon = getMeetingIcon(meeting.type);
  const isPastScheduled = meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) < new Date();
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-100 hover:bg-white sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px_120px] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          {React.createElement(icon, { className: 'h-5 w-5' })}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-950">{meeting.leadName}</p>
            <span className={statusClass(meeting.status)}>{meeting.status}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{meeting.company}</p>
          {meeting.agenda && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{meeting.agenda}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
        <span className="flex items-center gap-2 text-slate-700"><Calendar className="h-4 w-4 text-slate-400" />{formatDate(meeting.scheduledDate)}</span>
        <span className="flex items-center gap-2 text-slate-700"><Clock className="h-4 w-4 text-slate-400" />{formatTime(meeting.scheduledDate)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{meeting.type}</span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{meeting.duration || 30} min</span>
        {isPastScheduled && (
          <button
            type="button"
            onClick={onMarkDone}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    </div>
  );
};

const MeetingEditModal = ({ form, setForm, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
    <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Edit Meeting</p>
          <h3 className="text-lg font-bold text-slate-950">Adjust meeting details</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        <Field label="Meeting Type">
          <select value={form.type} onChange={(event) => setForm(prev => ({ ...prev, type: event.target.value }))} className={inputClass}>
            {['Call', 'Video Meeting', 'In-Person', 'Email Follow-up', 'Demo', 'Presentation', 'Negotiation'].map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Scheduled Date & Time">
          <input type="datetime-local" value={form.scheduledDate} onChange={(event) => setForm(prev => ({ ...prev, scheduledDate: event.target.value }))} className={inputClass} required />
        </Field>
        <Field label="Duration (minutes)">
          <input type="number" min="5" max="480" value={form.duration} onChange={(event) => setForm(prev => ({ ...prev, duration: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value }))} className={inputClass}>
            {['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'].map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Agenda">
          <textarea rows="3" value={form.agenda} onChange={(event) => setForm(prev => ({ ...prev, agenda: event.target.value }))} className={inputClass} />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700">Update Meeting</button>
      </div>
    </form>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    {children}
  </label>
);

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100';

const SummaryCard = ({ title, value, icon, tone }) => {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700'
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          {React.createElement(icon, { className: 'h-5 w-5' })}
        </div>
      </div>
    </div>
  );
};

const InfoPill = ({ label, value }) => (
  <div className="rounded-xl border border-white/80 bg-white/80 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 font-semibold text-slate-900">{value}</p>
  </div>
);

const getMeetingIcon = (type) => {
  if (type === 'Video Meeting') return Video;
  if (type === 'In-Person' || type === 'Demo') return MapPin;
  return Phone;
};

const statusClass = (status) => {
  const classes = {
    Scheduled: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Cancelled: 'bg-red-50 text-red-700 ring-red-100',
    Rescheduled: 'bg-amber-50 text-amber-700 ring-amber-100',
    'No Show': 'bg-slate-100 text-slate-600 ring-slate-200'
  };
  return `rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${classes[status] || classes.Scheduled}`;
};

const formatDate = (date) => date ? new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
const toInputDateTime = (date) => date ? new Date(date).toISOString().slice(0, 16) : '';

export default SalesMeetings;
