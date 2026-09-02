// hooks/useDashboardData.js
import { useState, useEffect, useCallback } from 'react';
import API, { dashboardAPI, leadAPI, salesPipelineAPI } from '../utils/api';
import { Users, ListChecks, Target, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

const getArrayCount = (payload) => {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload?.leads)) return payload.leads.length;
  return Number(payload?.count || payload?.total || 0);
};

const safeArray = (val) => {
  if (Array.isArray(val)) return val;
  if (Array.isArray(val?.data)) return val.data;
  if (Array.isArray(val?.leads)) return val.leads;
  if (Array.isArray(val?.tasks)) return val.tasks;
  if (Array.isArray(val?.events)) return val.events;
  if (Array.isArray(val?.data?.leads)) return val.data.leads;
  if (Array.isArray(val?.data?.tasks)) return val.data.tasks;
  if (Array.isArray(val?.data?.data)) return val.data.data;
  return [];
};

const findStatusCount = (statusDistribution = [], status) => {
  const target = String(status).toLowerCase();
  const safeList = safeArray(statusDistribution);
  const item = safeList.find(entry => String(entry._id || entry.status || '').toLowerCase() === target);
  return item?.count || 0;
};

const formatEmployeeName = (employee) => {
  const firstName = employee?.personalInfo?.firstName || '';
  const lastName = employee?.personalInfo?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  return employee?.fullName || employee?.user?.name || employee?.name || 'Unassigned';
};

const formatLeadName = (lead) => {
  const fullName = `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim();
  return fullName || lead?.fullName || lead?.company || 'Lead';
};

const isSameDay = (a, b) => {
  const left = new Date(a);
  const right = new Date(b);
  return left.toDateString() === right.toDateString();
};

export const useDashboardData = () => {
  const [state, setState] = useState({
    stats: [],
    attentionItems: [],
    taskHealth: [],
    recentActivities: [],
    upcomingEvents: [],
    loading: true,
    error: null
  });

  const createDefaultStats = useCallback((data = {}, leadStats = {}, taskStats = {}, upcomingMeetingsInput = [], recentActivitiesInput = [], overdueTasksInput = [], overdueFollowUpsInput = [], allLeadsInput = [], allTasksInput = []) => {
    const recentActivities = safeArray(recentActivitiesInput);
    const overdueFollowUps = safeArray(overdueFollowUpsInput);
    const overdueTasks = safeArray(overdueTasksInput);
    const upcomingMeetings = safeArray(upcomingMeetingsInput);
    const allLeads = safeArray(allLeadsInput);
    const allTasks = safeArray(allTasksInput);

    const employeeNames = recentActivities
      .filter((activity) => activity && (activity.category === 'employee' || activity.user))
      .slice(0, 3)
      .map((activity) => activity.user || activity.description || activity.action)
      .filter(Boolean);

    // Display overdue follow-ups or fallback to recent leads
    const displayLeads = overdueFollowUps.length > 0 ? overdueFollowUps : allLeads;
    const safeDisplayLeads = safeArray(displayLeads);
    const leadNames = safeDisplayLeads
      .slice(0, 3)
      .map((lead) => formatLeadName(lead))
      .filter(Boolean);

    // Display overdue tasks or fallback to all tasks
    const displayTasks = overdueTasks.length > 0 ? overdueTasks : allTasks;
    const safeDisplayTasks = safeArray(displayTasks);
    const taskNames = safeDisplayTasks
      .slice(0, 3)
      .map((task) => task?.title || task?.description || 'Task')
      .filter(Boolean);

    const meetingNames = upcomingMeetings
      .slice(0, 3)
      .map((meeting) => meeting?.leadName || meeting?.title || 'Lead')
      .filter(Boolean);

    return [
      {
        title: 'Employees',
        value: data.totalEmployees || 0,
        icon: Users,
        change: `${data.activeEmployees || 0} active`,
        changeType: 'positive',
        detail: employeeNames.length ? employeeNames.join(' • ') : 'Recent employee additions',
        path: '/admin/employees'
      },
      {
        title: 'Leads',
        value: (safeArray(leadStats.statusStats) || []).reduce((sum, item) => sum + (item?.count || 0), 0) || safeDisplayLeads.length,
        icon: Target,
        change: `${leadStats.todayFollowUps || 0} today`,
        changeType: leadStats.overdueFollowUps > 0 ? 'negative' : 'neutral',
        detail: leadNames.length ? leadNames.join(' • ') : 'Leads waiting on follow-up',
        path: '/admin/sales',
        newCount: findStatusCount(leadStats.statusStats, 'New'),
        hoverItems: safeDisplayLeads.slice(0, 10).map((lead) => ({
          primary: formatLeadName(lead),
          secondary: lead?.company || lead?.source || 'Direct Inquiry',
          status: lead?.status || 'New'
        }))
      },
      {
        title: 'Tasks',
        value: taskStats.total || data.totalTasks || 0,
        icon: ListChecks,
        change: `${taskStats.inProgress || 0} active`,
        changeType: taskStats.overdue > 0 ? 'negative' : 'positive',
        detail: taskNames.length ? taskNames.join(' • ') : 'Tasks needing attention',
        path: '/admin/tasks',
        hoverItems: safeDisplayTasks.slice(0, 10).map((task) => ({
          primary: task?.title || task?.description || 'Task',
          secondary: formatEmployeeName(task?.assignedTo),
          status: task?.status || 'In Progress'
        }))
      },
      {
        title: 'Meetings',
        value: upcomingMeetings.length,
        icon: CalendarDays,
        change: upcomingMeetings.length
          ? `today: ${String(upcomingMeetings[0]?.leadName || 'lead').split(' ')[0]}...`
          : 'no meetings today',
        changeType: upcomingMeetings.length > 0 ? 'positive' : 'neutral',
        detail: meetingNames.length ? meetingNames.join(' • ') : 'Upcoming sales meetings',
        path: '/admin/sales',
        hoverItems: upcomingMeetings.slice(0, 4).map((meeting) => ({
          primary: meeting?.leadName || meeting?.title || 'Meeting',
          secondary: meeting?.date
            ? new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Today',
          status: 'Scheduled'
        }))
      }
    ];
  }, []);

  const createAttentionItems = useCallback((data = {}, leadStats = {}, taskStats = {}, pendingApprovalsInput = [], overdueFollowUpsInput = [], overdueTasksInput = [], pendingLeavesInput = []) => {
    const overdueFollowUps = safeArray(overdueFollowUpsInput);
    const overdueTasks = safeArray(overdueTasksInput);
    const pendingLeaves = safeArray(pendingLeavesInput);

    const leadFollowUpNames = overdueFollowUps.slice(0, 3).map(item => formatLeadName(item));
    const overdueTaskDetail = overdueTasks.slice(0, 2).map(item => {
      const taskTitle = item?.title || 'Task';
      const employee = formatEmployeeName(item?.assignedTo);
      return `${taskTitle} — ${employee}`;
    });
    const pendingLeaveDetail = pendingLeaves.slice(0, 2).map(item => {
      const employee = formatEmployeeName(item?.employee);
      const leaveType = item?.leaveType || 'Leave';
      return `${employee} • ${leaveType}`;
    });
    const taskReviewDetail = overdueTasks
      .filter(item => item?.status === 'Review' || item?.progress === 100)
      .slice(0, 2)
      .map(item => `${item?.title || 'Task'} • ${formatEmployeeName(item?.assignedTo)}`);

    return [
    {
      label: 'overdue tasks',
      value: taskStats.overdue || data.overdueTasks || 0,
      detail: overdueTaskDetail.length ? overdueTaskDetail.join(' · ') : 'Team items waiting',
      actionLabel: 'Open',
      path: '/admin/tasks',
      tone: 'rose'
    },
    {
      label: 'leave approvals',
      value: data.pendingLeaves || 0,
      detail: pendingLeaveDetail.length ? pendingLeaveDetail.join(' · ') : 'Admin review pending',
      actionLabel: 'Review',
      path: '/admin/leaves',
      tone: 'amber'
    },
    {
      label: 'task review',
      value: findStatusCount(taskStats.statusDistribution || [], 'Review'),
      detail: taskReviewDetail.length ? taskReviewDetail.join(' · ') : 'Tasks awaiting review',
      actionLabel: 'Review',
      path: '/admin/tasks',
      tone: 'violet'
    },
    {
      label: 'lead follow-ups',
      value: getArrayCount(overdueFollowUps) || leadStats.overdueFollowUps || 0,
      detail: leadFollowUpNames.length ? leadFollowUpNames.join(' · ') : 'Leads waiting on touchpoints',
      actionLabel: 'View',
      path: '/admin/sales',
      tone: 'orange'
    }
  ];
  }, []);

  const createTaskHealth = useCallback((taskStats = {}, overdueTasksInput = [], allTasksInput = []) => {
    const overdueTasks = safeArray(overdueTasksInput);
    const allTasks = safeArray(allTasksInput);

    const statusDistribution = safeArray(taskStats.statusDistribution);
    const completed = taskStats.completed || findStatusCount(statusDistribution, 'Completed');
    const inProgress = taskStats.inProgress || findStatusCount(statusDistribution, 'In Progress');
    const notStarted = findStatusCount(statusDistribution, 'Not Started');
    const review = findStatusCount(statusDistribution, 'Review');

    const mapTaskTitles = (taskList) => safeArray(taskList).map(t => ({
      title: t?.title || t?.description || 'Untitled Task',
      assignee: formatEmployeeName(t?.assignedTo)
    }));

    const completedTasks = mapTaskTitles(allTasks.filter(t => String(t?.status).toLowerCase() === 'completed'));
    const inProgressTasks = mapTaskTitles(allTasks.filter(t => String(t?.status).toLowerCase() === 'in progress'));
    const notStartedTasks = mapTaskTitles(allTasks.filter(t => String(t?.status).toLowerCase() === 'not started' || String(t?.status).toLowerCase() === 'pending'));
    const reviewTasks = mapTaskTitles(allTasks.filter(t => String(t?.status).toLowerCase() === 'review'));
    
    // For overdue, fallback to overdueTasks if allTasks filter returns empty
    const overdueList = allTasks.filter(t => t?.isOverdue || (t?.dueDate && new Date(t.dueDate) < new Date() && t?.status !== 'Completed'));
    const overdueTasksMapped = mapTaskTitles(overdueList.length > 0 ? overdueList : overdueTasks);

    return [
      { label: 'Completed', value: completed, tone: 'emerald', tasks: completedTasks },
      { label: 'In Progress', value: inProgress, tone: 'blue', tasks: inProgressTasks },
      { label: 'Not Started', value: notStarted, tone: 'slate', tasks: notStartedTasks },
      { label: 'Review', value: review, tone: 'violet', tasks: reviewTasks },
      { label: 'Overdue', value: taskStats.overdue || 0, tone: 'rose', tasks: overdueTasksMapped }
    ];
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [statsResponse, activitiesResponse, eventsResponse, taskStatsResponse, leadStatsResponse, pendingApprovalsResponse, overdueFollowUpsResponse, overdueTasksResponse, allTasksResponse, pendingLeavesResponse, allLeadsResponse] = await Promise.all([
        dashboardAPI.getAdminStats(),
        dashboardAPI.getRecentActivities(),
        dashboardAPI.getUpcomingEvents(),
        API.get('/tasks/stats').catch(() => ({ data: { success: false, stats: {} } })),
        leadAPI.getLeadStats().catch(() => ({ data: { success: false, data: {} } })),
        salesPipelineAPI.getPendingApprovals().catch(() => ({ data: { success: false, data: [] } })),
        leadAPI.getOverdueFollowUps().catch(() => ({ data: { success: false, data: [] } })),
        API.get('/tasks', { params: { overdue: 'true', limit: 15 } }).catch(() => ({ data: { success: false, tasks: [] } })),
        API.get('/tasks', { params: { limit: 50 } }).catch(() => ({ data: { success: false, tasks: [] } })),
        API.get('/leaves', { params: { status: 'Pending', limit: 10 } }).catch(() => ({ data: { success: false, leaves: [] } })),
        leadAPI.getLeads({ limit: 15 }).catch(() => ({ data: { success: false, data: [] } }))
      ]);

      const dashboardStats = statsResponse.data?.success ? statsResponse.data : {};
      const taskStats = taskStatsResponse.data?.success ? taskStatsResponse.data.stats || {} : {};
      const leadStats = leadStatsResponse.data?.success ? leadStatsResponse.data.data || {} : {};
      const pendingApprovals = safeArray(pendingApprovalsResponse.data?.data || pendingApprovalsResponse.data);
      const overdueFollowUps = safeArray(overdueFollowUpsResponse.data?.data || overdueFollowUpsResponse.data?.leads || overdueFollowUpsResponse.data);
      const overdueTasks = safeArray(overdueTasksResponse.data?.tasks || overdueTasksResponse.data?.data || overdueTasksResponse.data);
      const allTasks = safeArray(allTasksResponse.data?.tasks || allTasksResponse.data?.data || allTasksResponse.data);
      const pendingLeaves = safeArray(pendingLeavesResponse.data?.leaves || pendingLeavesResponse.data?.data || pendingLeavesResponse.data);
      const allLeads = safeArray(allLeadsResponse.data?.data || allLeadsResponse.data?.leads || allLeadsResponse.data);

      const rawEvents = safeArray(eventsResponse.data?.events || eventsResponse.data?.data || eventsResponse.data);
      const upcomingMeetings = rawEvents
        .filter((event) => event && (event.type === 'meeting' || String(event.title || '').toLowerCase().includes('meeting')))
        .map((event) => ({
          ...event,
          leadName: String(event.title || '')
            .replace(/^.*meeting:\s*/i, '')
            .trim() || 'Lead'
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const todayMeeting = upcomingMeetings.find((event) => isSameDay(event.date, new Date()));
      const upcomingMeetingStats = todayMeeting
        ? [todayMeeting, ...upcomingMeetings.filter((event) => event !== todayMeeting)]
        : upcomingMeetings;

      const activities = safeArray(activitiesResponse.data?.activities || activitiesResponse.data?.data || activitiesResponse.data);

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        stats: createDefaultStats(dashboardStats, leadStats, taskStats, upcomingMeetingStats, activities, overdueTasks, overdueFollowUps, allLeads, allTasks),
        attentionItems: createAttentionItems(dashboardStats, leadStats, taskStats, pendingApprovals, overdueFollowUps, overdueTasks, pendingLeaves),
        taskHealth: createTaskHealth(taskStats, overdueTasks, allTasks),
        recentActivities: activities,
        upcomingEvents: rawEvents
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      const errorMessage = error.response?.data?.message || 'Failed to load dashboard data';
      toast.error(errorMessage);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        stats: createDefaultStats(),
        attentionItems: createAttentionItems(),
        taskHealth: createTaskHealth(),
        recentActivities: [],
        upcomingEvents: []
      }));
    }
  }, [createAttentionItems, createDefaultStats, createTaskHealth]);

  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    ...state,
    refreshData,
    isLoading: state.loading
  };
};
