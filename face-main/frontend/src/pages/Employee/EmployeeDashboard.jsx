// src/pages/Employee/EmployeeDashboard.js
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  User, Clock, Calendar, DollarSign, CheckCircle, AlertCircle, MapPin, Bell, Award, Target, TrendingUp, FileText, MessageCircle, X, Send, Bot, Camera, Download, Users, Loader2, CheckSquare, AlertTriangle, Video, Briefcase, HelpCircle
} from 'lucide-react';
import GroupChatModal from '../../components/Employee/GroupChat/GroupChatModal';
import toast from 'react-hot-toast';
import { employeeAPI, authAPI, attendanceAPI, payslipAPI, dashboardAPI, leadAPI, getApiFileUrl } from '../../utils/api';
import API from '../../utils/api';
import { taskService } from '../../services/taskService';
import { geolocationUtils } from '../../utils/geolocationUtils';
import io from 'socket.io-client';

const welcomeHeroPresets = {
  morning: {
    video: '/morning_vid.mp4',
    messages: ['Rise & Shine', 'Make Today Count', 'Ready to Achieve', 'Bright Horizons', "Let's Make Progress"]
  },
  afternoon: {
    video: '/sea_vid.mp4',
    messages: ['Keep the Momentum', 'Onward & Upward', 'Productivity Peak', 'Great Things Ahead', 'Halfway to Success']
  },
  evening: {
    video: '/evening1_vid.mp4',
    messages: ['Wrapping Up', 'Celebrate Progress', 'Another Great Day', 'Keep the Spark Alive', 'Success in Motion']
  },
  night: {
    video: '/moon_vid.mp4',
    messages: ['Wind Down', 'Reflect & Recharge', 'Recharge for Tomorrow', 'Night Mode', 'Time to Unwind']
  }
};

const getWelcomeHero = (date) => {
  const hour = date.getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const preset = welcomeHeroPresets[period];
  const dayStart = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - dayStart) / 86400000);

  return {
    video: preset.video,
    message: preset.messages[dayOfYear % preset.messages.length]
  };
};

const getPersonDisplayName = (person, fallback = 'Employee') => {
  const clean = (value) => (typeof value === 'string' ? value.trim() : '');
  const directName = clean(person?.name);
  const fullName = clean(person?.fullName);
  const userName = clean(person?.user?.name);
  const firstName = clean(person?.personalInfo?.firstName || person?.user?.personalInfo?.firstName);
  const lastName = clean(person?.personalInfo?.lastName || person?.user?.personalInfo?.lastName);
  const personalName = [firstName, lastName].filter(Boolean).join(' ');

  return [directName, fullName, userName, personalName]
    .find((name) => name && !/^unknown( user)?$/i.test(name)) || fallback;
};

// Helper to generate role-relevant stat cards (Active Tasks + Overdue info, Meetings for Sales, Problem Statements for Developers, Interviews for HR)
const generateRoleStats = (employee = {}, realStats = null, tasksList = [], rawMeetingsList = [], rawEventsList = []) => {
  const cleanStr = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return (val.name || val.title || val.code || val.role || '').toLowerCase();
    return String(val).toLowerCase();
  };

  const deptStr = cleanStr(employee.workInfo?.department || employee.department || employee.user?.department);
  const posStr = cleanStr(employee.workInfo?.designation || employee.position || employee.designation || employee.user?.position || employee.user?.designation);
  const userRole = cleanStr(employee.role || employee.user?.role);
  const empName = cleanStr(employee.name || employee.fullName || employee.user?.name);
  
  const roleStr = `${deptStr} ${posStr} ${userRole} ${empName}`.toLowerCase();
  const now = new Date();

  const activeTasksList = tasksList.filter(t => t.status !== 'completed' && t.status !== 'approved');
  const overdueTasksCount = activeTasksList.filter(t => t.dueDate && new Date(t.dueDate) < now).length;

  const presentVal = realStats?.presentDays !== undefined ? realStats.presentDays.toString() : '0';
  const presentChange = realStats ? `${realStats.lateDays || 0} late, ${realStats.halfDays || 0} half days` : 'This Month';

  // Stat 1: Days Present
  const stat1 = {
    title: 'Days Present',
    value: presentVal,
    subtitle: 'This Month',
    icon: CheckCircle,
    color: 'from-green-500 to-green-600',
    change: presentChange
  };

  // Stat 2: Leave Balance
  const stat2 = {
    title: 'Leave Balance',
    value: employee.leaveBalance?.remaining?.toString() || '30',
    subtitle: 'Days Remaining',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    change: `${employee.leaveBalance?.total || 30} total allocated`
  };

  // Stat 3: Active Tasks (Includes Overdue Tasks count in small font under it!)
  const overdueText = overdueTasksCount > 0 ? ` • ${overdueTasksCount} overdue` : '';
  const stat3 = {
    title: 'Active Tasks',
    value: activeTasksList.length.toString(),
    subtitle: 'Assigned Tasks',
    icon: CheckSquare,
    color: 'from-purple-500 to-purple-600',
    change: `${tasksList.length} Total${overdueText}`
  };

  // Consolidate meetings from leadAPI, dashboardAPI events, and task list
  const combinedMeetings = [];

  // Helper to format date/time nicely
  const formatTimeStr = (rawDate, rawTime) => {
    if (rawTime) return rawTime;
    if (!rawDate) return '';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // 1. From leadAPI getUpcomingMeetings
  if (Array.isArray(rawMeetingsList)) {
    rawMeetingsList.forEach(m => {
      if (m) {
        const meetingObj = m.meeting || m;
        const leadName = m.fullName || m.leadName || '';
        const companyName = m.company || m.clientName || '';
        const clientLabel = leadName ? (companyName ? `${leadName} (${companyName})` : leadName) : companyName;
        
        const title = meetingObj.title || m.title || (clientLabel ? `Meeting w/ ${clientLabel}` : 'Lead Meeting');
        const scheduledTime = formatTimeStr(meetingObj.scheduledDate || m.date, meetingObj.startTime || m.time);
        
        combinedMeetings.push({
          title,
          clientLabel,
          time: scheduledTime,
          date: meetingObj.scheduledDate || m.date,
          displaySummary: `Next: ${title}${clientLabel && !title.toLowerCase().includes(clientLabel.toLowerCase()) ? ' (' + clientLabel + ')' : ''}${scheduledTime ? ' @ ' + scheduledTime : ''}`
        });
      }
    });
  }

  // 2. From dashboardAPI getUpcomingEvents (type === 'meeting')
  if (Array.isArray(rawEventsList)) {
    rawEventsList.forEach(ev => {
      if (ev && (ev.type === 'meeting' || String(ev.title || '').toLowerCase().includes('meeting'))) {
        const title = ev.title || ev.name || 'Sales Meeting';
        const scheduledTime = formatTimeStr(ev.date || ev.startDate, ev.time);
        combinedMeetings.push({
          title,
          clientLabel: '',
          time: scheduledTime,
          date: ev.date || ev.startDate,
          displaySummary: `Next: ${title}${scheduledTime ? ' @ ' + scheduledTime : ''}`
        });
      }
    });
  }

  // 3. From taskService getTasks (where category/title/type includes meeting/sales/client)
  if (Array.isArray(tasksList)) {
    tasksList.forEach(t => {
      const title = (t.title || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const type = (t.type || '').toLowerCase();
      if (title.includes('meeting') || cat.includes('meeting') || type.includes('meeting') ||
          title.includes('sales') || cat.includes('sales') || type.includes('sales') ||
          title.includes('client') || title.includes('demo')) {
        const scheduledTime = formatTimeStr(t.dueDate || t.createdAt, null);
        combinedMeetings.push({
          title: t.title || 'Client Meeting',
          clientLabel: '',
          time: scheduledTime,
          date: t.dueDate || t.createdAt,
          displaySummary: `Next: ${t.title}${scheduledTime ? ' @ ' + scheduledTime : ''}`
        });
      }
    });
  }

  // Filter out duplicates by displaySummary/title
  const uniqueMeetings = [];
  const seenTitles = new Set();
  combinedMeetings.forEach(m => {
    const key = (m.title || '').toLowerCase().trim();
    if (key && !seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueMeetings.push(m);
    }
  });

  const interviewTasks = tasksList.filter(t => {
    const title = (t.title || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    return title.includes('interview') || cat.includes('interview') || title.includes('hiring') || title.includes('candidate');
  });

  const problemTasks = tasksList.filter(t => {
    const title = (t.title || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    return title.includes('problem') || cat.includes('problem') || title.includes('bug') || cat.includes('bug') || title.includes('feature') || title.includes('issue');
  });

  const isSales = roleStr.includes('sales') || roleStr.includes('market') || roleStr.includes('business') || roleStr.includes('bd') || roleStr.includes('bde') || roleStr.includes('bdm') || roleStr.includes('lead') || roleStr.includes('client') || roleStr.includes('account') || uniqueMeetings.length > 0;
  
  const isHR = roleStr.includes('hr') || roleStr.includes('recruit') || roleStr.includes('hiring') || roleStr.includes('human') || roleStr.includes('people') || interviewTasks.length > 0;

  const isDev = roleStr.includes('dev') || roleStr.includes('software') || roleStr.includes('tech') || roleStr.includes('engineer') || roleStr.includes('code') || roleStr.includes('programmer') || roleStr.includes('web') || roleStr.includes('frontend') || roleStr.includes('backend') || roleStr.includes('fullstack') || roleStr.includes('qa') || roleStr.includes('test') || problemTasks.length > 0;

  // Stat 4: Role-Specific Highlight Card (Sales: Meetings, Dev: Problem Statements, HR: Interviews)
  let stat4;

  if (isSales) {
    // Sales Employee Card: Meetings & Next Meeting Brief
    const nextMeeting = uniqueMeetings[0];
    const meetingDetail = nextMeeting ? nextMeeting.displaySummary : 'No upcoming meetings';

    stat4 = {
      title: 'Meetings',
      value: uniqueMeetings.length.toString(),
      subtitle: 'Scheduled Meetings',
      icon: Video,
      color: 'from-pink-500 to-pink-600',
      change: meetingDetail
    };
  } else if (isHR) {
    // HR Employee Card: Interviews & Next Interview Brief
    const activeInterviews = interviewTasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
    const nextInterview = activeInterviews[0] || interviewTasks[0] || activeTasksList[0];
    const interviewCount = interviewTasks.length || activeTasksList.length || 0;
    const interviewDetail = nextInterview ? `Next: ${nextInterview.title}` : 'No upcoming interviews';

    stat4 = {
      title: 'Interviews',
      value: interviewCount.toString(),
      subtitle: 'Scheduled Interviews',
      icon: Users,
      color: 'from-pink-500 to-pink-600',
      change: interviewDetail
    };
  } else if (isDev) {
    // Developer / Tech Employee Card: Problem Statements
    const activeProblems = problemTasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
    const nextProblem = activeProblems[0] || activeTasksList[0];
    const problemCount = activeProblems.length || activeTasksList.length || 0;
    const problemDetail = nextProblem ? `Next: ${nextProblem.title}` : 'All problems resolved';

    stat4 = {
      title: 'Problem Statements',
      value: problemCount.toString(),
      subtitle: 'Assigned Problems',
      icon: HelpCircle,
      color: 'from-pink-500 to-pink-600',
      change: problemDetail
    };
  } else {
    // Default Role Card
    const nextTask = activeTasksList[0];
    const taskDetail = nextTask ? `Next: ${nextTask.title}` : 'All priorities up to date';

    stat4 = {
      title: 'Upcoming Priority',
      value: activeTasksList.length.toString(),
      subtitle: 'Primary Deliverable',
      icon: Target,
      color: 'from-pink-500 to-pink-600',
      change: taskDetail
    };
  }

  return [stat1, stat2, stat3, stat4];
};

const EmployeeDashboard = () => {
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [workingTime, setWorkingTime] = useState(null);
  const [realTimeWorkingTime, setRealTimeWorkingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [botMessages, setBotMessages] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [peers, setPeers] = useState([]);
  const [peerActivity, setPeerActivity] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [newBotMessage, setNewBotMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentNotices, setRecentNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedPeerRef = useRef(null);
  const showChatModalRef = useRef(false);
  const botMessagesEndRef = useRef(null);
  const botMessagesContainerRef = useRef(null);
  const botTimeoutRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const typingTimeoutRef = useRef(null);
  const welcomeHero = useMemo(() => getWelcomeHero(currentTime), [currentTime]);
 const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    employeeId: '',
    joiningDate: '',
    profileImage: '',
    // Detailed sections
    personalInfo: {},
    contactInfo: {},
    workInfo: {},
    bankInfo: {},
    salaryInfo: {},
    documents: {}
  });
  const openTeamChat = useCallback(() => {
    setShowGroupChatModal(false);
    setShowBotModal(false);
    setShowChatModal(true);
  }, []);

  useEffect(() => {
    selectedPeerRef.current = selectedPeer;
  }, [selectedPeer]);

  useEffect(() => {
    showChatModalRef.current = showChatModal;
  }, [showChatModal]);

  const getPeerId = useCallback((peer) => String(peer?._id || peer?.user?._id || ''), []);

  const getUnreadStorageKey = useCallback(() => {
    const currentUserId = employeeData?.id || employeeData?._id || localStorage.getItem('userId') || 'unknown';
    return `teamChatUnreadCounts:${currentUserId}`;
  }, [employeeData]);

  const getMessageTime = useCallback((message) => {
    const rawTime = message?.timestamp || message?.createdAt || new Date().toISOString();
    const parsedTime = new Date(rawTime).getTime();
    return Number.isNaN(parsedTime) ? Date.now() : parsedTime;
  }, []);

  const recordPeerActivity = useCallback((peerId, message) => {
    if (!peerId) return;

    setPeerActivity((prev) => ({
      ...prev,
      [peerId]: {
        lastMessageAt: getMessageTime(message),
        lastMessage: message?.text || '',
      },
    }));
  }, [getMessageTime]);

  const handleSelectPeer = useCallback((peer) => {
    const peerId = getPeerId(peer);
    setSelectedPeer(peer);

    if (peerId) {
      setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }));
    }
  }, [getPeerId]);

  useEffect(() => {
    if (!employeeData) return;

    try {
      const storedCounts = localStorage.getItem(getUnreadStorageKey());
      if (storedCounts) {
        setUnreadCounts(JSON.parse(storedCounts));
      }
    } catch (error) {
      console.warn('Failed to load chat unread counts:', error);
    }
  }, [employeeData, getUnreadStorageKey]);

  useEffect(() => {
    if (!employeeData) return;

    try {
      localStorage.setItem(getUnreadStorageKey(), JSON.stringify(unreadCounts));
    } catch (error) {
      console.warn('Failed to save chat unread counts:', error);
    }
  }, [employeeData, getUnreadStorageKey, unreadCounts]);

  const sortedPeers = useMemo(() => {
    return [...peers].sort((a, b) => {
      const aId = getPeerId(a);
      const bId = getPeerId(b);
      const aUnread = unreadCounts[aId] || 0;
      const bUnread = unreadCounts[bId] || 0;
      const aTime = peerActivity[aId]?.lastMessageAt || 0;
      const bTime = peerActivity[bId]?.lastMessageAt || 0;

      if (aTime !== bTime) return bTime - aTime;
      if (aUnread !== bUnread) return bUnread - aUnread;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [peers, peerActivity, unreadCounts, getPeerId]);

  const totalUnreadTeamMessages = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + Number(count || 0), 0);
  }, [unreadCounts]);

  const openGroupChats = useCallback(() => {
    setShowChatModal(false);
    setShowBotModal(false);
    setShowGroupChatModal(true);
  }, []);

  const handleBotMessageChange = useCallback((e) => {
    setNewBotMessage(e.target.value);
  }, []);

  const handleChatMessageChange = useCallback((e) => {
    setNewMessage(e.target.value);

    if (socketRef.current?.connected && selectedPeer?._id) {
      socketRef.current.emit('typing:start', { to: selectedPeer._id });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected && selectedPeer?._id) {
          socketRef.current.emit('typing:stop', { to: selectedPeer._id });
        }
      }, 2000);
    }
  }, [selectedPeer]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBottomBot = () => {
    if (!isUserScrolledUp.current) {
      botMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useLayoutEffect(() => {
    scrollToBottomBot();
  }, [botMessages]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        let profileResponse;
        try {
          profileResponse = await authAPI.getMyProfile();
        } catch (error) {
          console.warn('authAPI.getMyProfile() failed, trying employeeAPI.getMyProfile()');
          profileResponse = await employeeAPI.getMyProfile();
        }

        if (profileResponse.data && profileResponse.data.success) {
          const employee = profileResponse.data.data;
          const savedProfileImage = employee.profileImage || employee.user?.profileImage || '';
          if (savedProfileImage) {
            localStorage.setItem('userImage', savedProfileImage);
            sessionStorage.setItem('userImage', savedProfileImage);
          }
          // Ensure we have the user ID as id, and employee ID as employeeId
          setEmployeeData({
            ...employee,
            profileImage: savedProfileImage,
            id: employee.id || employee.user?._id || employee._id,
            employeeId: employee.employeeId || employee._id
          });
          // Fetch attendance, tasks, meetings, and events concurrently to build dynamic role stats
          let realStats = null;
          let tasksList = [];
          let meetingsList = [];
          let eventsList = [];

          try {
            const [attendanceStatusRes, statsRes, tasksRes, meetingsRes, eventsRes] = await Promise.allSettled([
              attendanceAPI.getTodayAttendance(),
              attendanceAPI.getEmployeeAttendanceStats(),
              taskService.getTasks(),
              leadAPI.getUpcomingMeetings(),
              dashboardAPI.getUpcomingEvents()
            ]);

            if (attendanceStatusRes.status === 'fulfilled' && attendanceStatusRes.value.data?.success) {
              const data = attendanceStatusRes.value.data;
              setTodayAttendance(data.data);
              setHasCheckedIn(data.hasCheckedIn);
              setHasCheckedOut(data.hasCheckedOut);
            }

            if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
              realStats = statsRes.value.data.data;
            }

            if (tasksRes.status === 'fulfilled') {
              const val = tasksRes.value;
              tasksList = Array.isArray(val) ? val : (val?.tasks || val?.data || []);
            }

            if (meetingsRes.status === 'fulfilled') {
              const val = meetingsRes.value?.data;
              meetingsList = val?.data || val?.meetings || (Array.isArray(val) ? val : []);
            }

            if (eventsRes.status === 'fulfilled') {
              const val = eventsRes.value?.data;
              eventsList = val?.events || (Array.isArray(val) ? val : []);
              setRecentNotices(eventsList);
            }
          } catch (err) {
            console.error('Error fetching auxiliary dashboard data:', err);
          }

          const dynamicStats = generateRoleStats(employee, realStats, tasksList, meetingsList, eventsList);
          setDashboardStats(dynamicStats);
        } else {
          console.error('Failed to fetch employee profile:', profileResponse);
          toast.error('Unable to load your profile data');
          setDefaultStats();
        }
      } catch (error) {
        console.error('Error fetching employee ', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
          toast.error('Access denied. Please contact HR.');
        } else if (error.response?.status === 404) {
          toast.error('Employee profile not found. Please contact HR.');
        } else {
          toast.error('Unable to load dashboard data.');
        }
        setDefaultStats();
      } finally {
        setLastUpdated(new Date());
        setNoticesLoading(false);
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getFullImageUrl = (path) => getApiFileUrl(path) || null;

  const getCurrentLocation = async () => {
    try {
      const position = await geolocationUtils.getCurrentPosition();
      const addressData = await geolocationUtils.getAddressFromCoords(position.latitude, position.longitude);
      // Format address as string for display
      const addressString = typeof addressData === 'object' ? addressData.address : addressData;
      setLocation({ ...position, address: addressString });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const setDefaultStats = (employee = {}) => {
    setDashboardStats(generateRoleStats(employee, null, []));
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time working time counter
  useEffect(() => {
    let interval;
    if (hasCheckedIn && !hasCheckedOut && todayAttendance?.checkInTime) {
      interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkInTime);
        const now = new Date();
        const diffMs = now - checkInTime;
        const minutes = Math.floor(diffMs / (1000 * 60));
        setRealTimeWorkingTime(minutes);
      }, 1000);
    } else {
      setRealTimeWorkingTime(0);
    }
    return () => clearInterval(interval);
  }, [hasCheckedIn, hasCheckedOut, todayAttendance]);

  useEffect(() => {
    if (!showBotModal) {
      setBotMessages([]);
      setNewBotMessage('');
      setLoadingBot(false);
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
    }
  }, [showBotModal]);

  useEffect(() => {
    if (showBotModal && employeeData && botMessages.length === 0) {
      setBotMessages([
        {
          _id: 'welcome',
          from: null,
          to: employeeData.id,
          text: 'Hello! I am your HR Assistant. How can I help you today? You can ask for salary slip, leave status, or any HR related query.',
          timestamp: new Date(),
          self: false,
          fromBot: true
        }
      ]);
    }
  }, [showBotModal, employeeData]);

  const handleViewPayslip = async () => {
    try {
      setPayslipLoading(true);
      setShowPayslipModal(true);

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Fetch payslips for current user
      const response = await payslipAPI.getPayslips({
        month: currentMonth,
        year: currentYear
      });

      console.log('Employee payslip response:', response.data);

      const payslips = response.data?.data?.payslips || [];

      if (payslips.length > 0) {
        // Get the most recent payslip
        setCurrentPayslip(payslips[0]);
      } else {
        setCurrentPayslip(null);
        toast.info('No payslip generated for current month');
      }
    } catch (error) {
      console.error('Error fetching payslip:', error);
      toast.error('Failed to load payslip');
      setCurrentPayslip(null);
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleDownloadPayslip = async () => {
    if (!currentPayslip?._id) {
      toast.error('No payslip available to download');
      return;
    }

    try {
      toast.loading('Preparing download...', { id: 'payslip-download' });
      const response = await payslipAPI.downloadPayslip(currentPayslip._id);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${currentPayslip.employeeId}_${currentPayslip.period.month}_${currentPayslip.period.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Payslip downloaded successfully!', { id: 'payslip-download' });
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip. Please try again.', { id: 'payslip-download' });
    }
  };

  const handlePdfDownload = async (url) => {
    try {
      const filename = url.split('/').pop();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Document downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download document. Please try again.');
    }
  };

  const renderMessageText = (text) => {
    const urlRegex = /(\/api\/bot\/download\/[a-zA-Z0-9_-]+\.pdf)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePdfDownload(part);
            }}
            className="text-blue-600 underline hover:text-blue-700 break-all bg-transparent border-0 cursor-pointer text-left p-0 font-medium transition-colors duration-200"
          >
            📄 Download Document
          </button>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    // Connect socket on dashboard load for real-time presence and messaging
    // Socket stays connected for the entire session (not just when modals are open)
    if (employeeData && !socketRef.current) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
      console.log('Connecting to socket:', SOCKET_URL);
      const socket = io(`${SOCKET_URL}/employee`, {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setSocketConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setSocketConnected(false);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setSocketConnected(true);
      });

      const handlePresenceSync = (data) => {
        console.log('Presence sync:', data);
        if (data.onlineUsers) {
          setOnlineUsers(new Set(data.onlineUsers));
        }
      };

      const handlePresenceUpdate = (data) => {
        console.log('Presence update:', data);
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          if (data.status === 'online') {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      };

      const handleTypingStart = (data) => {
        setTypingUsers(prev => new Set(prev).add(data.from));
      };

      const handleTypingStop = (data) => {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          updated.delete(data.from);
          return updated;
        });
      };

      const handleMessage = (msg) => {
        console.log('Received message:', msg);

        if (msg.fromBot) {
          setBotMessages(prev => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          setLoadingBot(false);
          if (botTimeoutRef.current) {
            clearTimeout(botTimeoutRef.current);
            botTimeoutRef.current = null;
          }
          return;
        }

        const currentUserId = String(employeeData.id || employeeData._id);
        const senderId = String(msg.from || '');
        const recipientId = String(msg.to || '');
        const peerId = senderId === currentUserId ? recipientId : senderId;
        const selectedPeerId = getPeerId(selectedPeerRef.current);

        recordPeerActivity(peerId, msg);

        if (peerId && senderId !== currentUserId && (!showChatModalRef.current || selectedPeerId !== peerId)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [peerId]: (prev[peerId] || 0) + 1,
          }));
          window.dispatchEvent(new CustomEvent('employee-notifications-refresh'));
        }

        setChatMessages(prev => {
          if (msg.clientMessageId) {
            const tempIndex = prev.findIndex(m => m.clientMessageId === msg.clientMessageId);
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = { ...msg, self: msg.self };
              return updated;
            }
          }
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      };

      const handleError = (error) => {
        console.error('Socket error:', error);
        if (error?.type === 'SELF_CHAT_PREVENTED') {
          toast.error('You cannot send messages to yourself');
        } else if (error?.message) {
          toast.error(error.message);
        } else {
          toast.error('Chat error occurred');
        }
      };

      socket.on('message', handleMessage);
      socket.on('error', handleError);
      socket.on('presence:sync', handlePresenceSync);
      socket.on('presence:update', handlePresenceUpdate);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);

      socketRef.current = socket;

      // Cleanup only when component unmounts (user leaves dashboard/logs out)
      return () => {
        console.log('Disconnecting socket on dashboard unmount');
        socket.off('message', handleMessage);
        socket.off('error', handleError);
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect');
        socket.off('presence:sync', handlePresenceSync);
        socket.off('presence:update', handlePresenceUpdate);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
        socket.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      };
    }
    // Removed: Socket no longer disconnects when modals close
    // Socket stays connected for real-time presence throughout the session
  }, [employeeData, getPeerId, recordPeerActivity]);

  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);

    const chatTarget = params.get('openChat');

    if (chatTarget === 'team') {
      openTeamChat();
    } else if (chatTarget === 'group') {
      openGroupChats();
    } else {
      return;
    }

    params.delete('openChat');

    navigate(
      {
        pathname: routeLocation.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true }
    );
  }, [routeLocation.pathname, routeLocation.search, navigate, openTeamChat, openGroupChats]);

  useEffect(() => {
    if (showChatModal && employeeData) {
      const fetchChatUsers = async () => {
        try {
          const res = await employeeAPI.get('/messages/chat-users');
          if (res.data.success) {
            setPeers(res.data.data);
            setPeerActivity((prev) => {
              const next = { ...prev };
              res.data.data.forEach((user) => {
                const peerId = getPeerId(user);
                if (!peerId) return;

                if (user.lastMessageAt) {
                  next[peerId] = {
                    lastMessageAt: new Date(user.lastMessageAt).getTime(),
                    lastMessage: user.lastMessage || '',
                  };
                } else if (!next[peerId]) {
                  next[peerId] = { lastMessageAt: 0, lastMessage: '' };
                }
              });
              return next;
            });
            res.data.data.forEach(user => {
              if (user.isOnline) {
                setOnlineUsers(prev => new Set(prev).add(user._id));
              }
            });
          }
        } catch (err) {
          console.error('Failed to load chat users:', err);
          toast.error('Could not load employee list for chat');
        }
      };
      fetchChatUsers();
    }
  }, [showChatModal, employeeData, getPeerId]);

  useEffect(() => {
    if (selectedPeer && employeeData) {
      const loadChatHistory = async () => {
        setLoadingChat(true);
        setChatMessages([]); // Clear previous messages
        try {
          // selectedPeer is an employee object with _id directly, not nested under user
          const peerId = selectedPeer._id || selectedPeer.user?._id;
          if (!peerId) {
            console.error('No peer ID found:', selectedPeer);
            setLoadingChat(false);
            return;
          }

          const response = await employeeAPI.get(`/messages/history/${peerId}`);
          if (response.data.success) {
            const currentUserId = employeeData.id || employeeData._id;
            const normalized = response.data.data.map(msg => {
              const msgFromId = msg.from?._id || msg.from;
              const isSelf = String(msgFromId) === String(currentUserId);
              return {
                _id: msg._id,
                from: msgFromId,
                fromName: getPersonDisplayName(msg.from, ''),
                to: msg.to?._id || msg.to,
                text: msg.text,
                timestamp: msg.timestamp,
                self: isSelf,
                fromBot: msg.fromBot || false
              };
            });
            setChatMessages(normalized);
            if (normalized.length > 0) {
              recordPeerActivity(peerId, normalized[normalized.length - 1]);
            }
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
          toast.error('Could not load chat history');
          setChatMessages([]);
        } finally {
          setLoadingChat(false);
        }
      };
      loadChatHistory();
    } else {
      setChatMessages([]);
    }
  }, [selectedPeer, employeeData, recordPeerActivity]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPeer) {
      console.log('Cannot send message:', { newMessage, selectedPeer });
      return;
    }

    const peerId = selectedPeer._id || selectedPeer.user?._id;
    const currentUserId = employeeData.id || employeeData._id;

    if (!peerId || !currentUserId) {
      console.error('Missing IDs:', { peerId, currentUserId });
      toast.error('Unable to send message - missing user information');
      return;
    }

    if (String(peerId) === String(currentUserId)) {
      toast.error('You cannot send messages to yourself');
      return;
    }

    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      from: currentUserId,
      fromName: getPersonDisplayName(employeeData, 'Employee'),
      to: peerId,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      clientMessageId
    };

    recordPeerActivity(peerId, message);
    setChatMessages(prev => [...prev, { ...message, _id: clientMessageId, self: true, pending: true }]);
    setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }));
    setNewMessage('');

    try {
      if (socketRef.current && socketRef.current.connected) {
        console.log('Sending message via socket:', message);
        socketRef.current.emit('message', message);
      } else {
        console.log('Socket not connected, using HTTP fallback');
        const response = await employeeAPI.post('/messages', { to: peerId, text: message.text });
        if (response.data.success) {
          setChatMessages(prev => prev.map(m =>
            m.clientMessageId === clientMessageId ? { ...response.data.data, self: true } : m
          ));
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setChatMessages(prev => prev.filter(m => m.clientMessageId !== clientMessageId));
      toast.error('Failed to send message');
      setNewMessage(message.text);
    }
  };

  const sendBotMessage = async () => {
    if (!newBotMessage.trim()) return;

    const userMessage = {
      from: employeeData.id,
      to: employeeData.id,
      text: newBotMessage.trim(),
      timestamp: new Date().toISOString(),
      self: true
    };

    const tempId = 'temp-' + Date.now();
    setBotMessages(prev => [...prev, { ...userMessage, _id: tempId }]);
    setLoadingBot(true);

    botTimeoutRef.current = setTimeout(() => {
      setLoadingBot(false);
      botTimeoutRef.current = null;
      toast.error('Bot is taking longer than expected. Please try again.');
    }, 10000);

    try {
      const response = await API.post('/bot/message', {
        text: newBotMessage.trim(),
        userId: employeeData.id
      });

      if (response.data.success) {
        const botMessage = {
          _id: 'bot-' + Date.now(),
          from: null,
          to: employeeData.id,
          text: response.data.response,
          timestamp: new Date().toISOString(),
          self: false,
          fromBot: true
        };
        setBotMessages(prev => [...prev, botMessage]);
      } else {
        toast.error('Failed to get bot response');
      }
    } catch (err) {
      console.error('Bot message error:', err);
      toast.error('Failed to send message to bot');
    } finally {
      setLoadingBot(false);
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
    }
    setNewBotMessage('');
  };

  const markAttendance = () => {
    // Redirect to attendance page for face verification
    window.location.href = '/employee/attendance';
  };

  const getStatusColor = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'completed': case 'on track': return 'text-green-700 bg-green-100';
      case 'in progress': case 'nearly complete': return 'text-amber-700 bg-amber-100';
      case 'pending': case 'not started': return 'text-red-700 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (String(priority || '').toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  if (loading) {
    return (
      <EmployeeLayout onOpenTeamChat={openTeamChat} onOpenGroupChats={openGroupChats}>
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-indigo-50 p-3 ring-1 ring-indigo-100">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
            <p className="text-[13.5px] font-medium text-slate-600">Loading your dashboard…</p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  const displayName = employeeData?.personalInfo ?
    `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}` :
    employeeData?.fullName || 'Employee';
  const displayPosition = employeeData?.workInfo?.position || 'Employee';
  const rawDepartment = employeeData?.workInfo?.department;
  const displayDepartment = typeof rawDepartment === 'object' && rawDepartment !== null
    ? (rawDepartment.name || rawDepartment.code || 'General')
    : (rawDepartment || 'General');
  const displayEmployeeId = employeeData?.employeeId || employeeData?.user?.employeeId || 'N/A';
  const employeeStatAccents = [
    { icon: 'text-indigo-500', chip: 'bg-indigo-50 ring-indigo-100' },
    { icon: 'text-emerald-500', chip: 'bg-emerald-50 ring-emerald-100' },
    { icon: 'text-amber-500', chip: 'bg-amber-50 ring-amber-100' },
    { icon: 'text-rose-500', chip: 'bg-rose-50 ring-rose-100' }
  ];

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setNewMessage('');
    // Don't clear selectedPeer and messages immediately to avoid flash
    setTimeout(() => {
      setSelectedPeer(null);
      setChatMessages([]);
    }, 300);
  };

  const handleCloseBotModal = () => {
    setShowBotModal(false);
    setNewBotMessage('');
    setTimeout(() => {
      setBotMessages([]);
    }, 300);
  };

  const handleCloseGroupChatModal = () => {
    setShowGroupChatModal(false);
  };

  return (
    <EmployeeLayout employeeData={employeeData} onOpenTeamChat={openTeamChat} onOpenGroupChats={openGroupChats}>
      {/* Entrance animation keyframes — purely presentational, no logic impact */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.4s ease-out both;
        }
        @keyframes ambientWaveDrift {
          0% { transform: translate3d(-8%, 0, 0) scaleX(1.04); }
          50% { transform: translate3d(4%, -8px, 0) scaleX(1.08); }
          100% { transform: translate3d(12%, 0, 0) scaleX(1.04); }
        }
        @keyframes ambientWaveFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.18; }
          50% { transform: translate3d(0, -10px, 0); opacity: 0.28; }
        }
        @keyframes ambientShimmerSweep {
          0%, 72% { transform: translate3d(-140%, 0, 0) skewX(-18deg); opacity: 0; }
          78% { opacity: 0.18; }
          88% { opacity: 0.08; }
          100% { transform: translate3d(170%, 0, 0) skewX(-18deg); opacity: 0; }
        }
        @keyframes ambientParticleFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.14; }
          50% { transform: translate3d(14px, -16px, 0); opacity: 0.34; }
        }
        .welcome-wave {
          will-change: transform, opacity;
          transform: translateZ(0);
          animation: ambientWaveDrift 18s ease-in-out infinite alternate;
        }
        .welcome-wave-slow {
          will-change: transform, opacity;
          transform: translateZ(0);
          animation: ambientWaveDrift 26s ease-in-out infinite alternate-reverse;
        }
        .welcome-wave-float {
          will-change: transform, opacity;
          transform: translateZ(0);
          animation: ambientWaveFloat 12s ease-in-out infinite;
        }
        .welcome-shimmer {
          will-change: transform, opacity;
          transform: translateZ(0);
          animation: ambientShimmerSweep 13s ease-in-out infinite;
        }
        .welcome-particle {
          will-change: transform, opacity;
          transform: translateZ(0);
          animation: ambientParticleFloat 11s ease-in-out infinite;
        }
      `}</style>
      <div className="space-y-5 bg-slate-50">
        {/* Welcome Section */}
        <div
          className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0C0F1] p-6 animate-enter transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.18)] md:p-9"
          style={{ animationDelay: '0ms' }}
        >
          <video
            key={welcomeHero.video}
            src={welcomeHero.video}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C0F17]/92 via-[#0C0F17]/62 to-[#0C0F17]/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0C0F17]/40 via-[#0C0F17]/16 to-[#0C0F17]/80" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0C0F17]/55 via-[#0C0F17]/22 to-transparent" />
          <div className="absolute left-0 right-0 bottom-0 h-16 bg-gradient-to-t from-[#0C0F17]/60 via-[#0C0F17]/16 to-transparent" />
          <div className="welcome-wave absolute -left-24 bottom-4 h-28 w-[125%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.14),transparent_62%)] blur-sm" />
          <div className="welcome-wave-slow absolute -left-32 bottom-12 h-36 w-[135%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.10),transparent_66%)] blur-md" />
          <div className="welcome-shimmer absolute -top-8 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl" />

          <div className="relative z-10 flex min-h-[160px] flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
                {(employeeData?.profileImage || employeeData?.user?.profileImage) ? (
                  <img
                    src={getFullImageUrl(employeeData.profileImage || employeeData.user?.profileImage)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
                    <User className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-indigo-300/90">
                  {welcomeHero.message}
                </p>
                <h1 className="mb-2 text-[28px] font-semibold leading-tight tracking-tight text-white md:text-[32px]">
                  Welcome, <span className="text-white">{displayName}</span>
                </h1>
                <p className="mb-4 text-[13.5px] font-medium text-slate-300">
                  {displayPosition}
                  <span className="mx-2 text-slate-600">•</span>
                  {displayDepartment}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-slate-200 ring-1 ring-white/10">
                    ID <span className="text-white font-semibold">{displayEmployeeId}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end md:pl-8">
              <p className="font-mono text-3xl font-semibold leading-none tracking-wide text-white md:text-5xl">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="mt-2 text-[13px] font-medium text-slate-400">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] font-medium text-slate-400 ring-1 ring-white/10">
                Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardStats.map((stat, index) => (
              <div
                key={index}
                className="dashboard-stat-card relative overflow-hidden bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 animate-enter transition-all duration-150 hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
                style={{ animationDelay: `${60 + index * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${employeeStatAccents[index % employeeStatAccents.length].chip}`}>
                    <stat.icon className={`w-[18px] h-[18px] ${employeeStatAccents[index % employeeStatAccents.length].icon}`} strokeWidth={1.75} />
                  </div>
                </div>
                <div>
                  <h3 className="text-[22px] font-semibold text-slate-900 mb-0.5 tracking-tight">{stat.value}</h3>
                  <p className="text-slate-500 text-[13px] mb-2">{stat.title}</p>
                  <p className="text-[11.5px] text-indigo-600 font-medium truncate" title={stat.change}>{stat.change}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attendance Section */}
        <div
          className="dashboard-panel bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 animate-enter transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
          style={{ animationDelay: '140ms' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-slate-900">Today's attendance</h2>
            <Clock className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className={`w-2.5 h-2.5 rounded-full ${hasCheckedIn ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-slate-900 text-[13.5px] font-medium">
                  Status: <span className={hasCheckedIn ? 'text-emerald-600' : 'text-red-600'}>
                    {hasCheckedIn ? (hasCheckedOut ? 'Completed for today' : 'Checked in') : 'Not marked'}
                  </span>
                </p>
                {todayAttendance && (
                  <div className="text-[12.5px] text-slate-500 space-y-0.5 mt-1">
                    {todayAttendance.checkInTime && <p>Check-in: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</p>}
                    {hasCheckedIn && !hasCheckedOut && realTimeWorkingTime > 0 && (
                      <p className="text-emerald-600">Working time: {Math.floor(realTimeWorkingTime / 60)}h {realTimeWorkingTime % 60}m</p>
                    )}
                    {todayAttendance.checkOutTime && <p>Check-out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</p>}
                  </div>
                )}
                {location && (
                  <p className="text-[11.5px] text-slate-400 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" strokeWidth={1.75} /> Location ready
                  </p>
                )}
              </div>
            </div>
            {!hasCheckedIn && (
              <div className="flex flex-col space-y-1.5">
                <button
                  onClick={markAttendance}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-[13.5px] font-medium rounded-lg hover:bg-indigo-500 transition-colors duration-150 flex items-center justify-center"
                >
                  <Camera className="w-4 h-4 mr-2" strokeWidth={1.75} /> Mark attendance with face verification
                </button>
                <p className="text-[11.5px] text-slate-400 text-center">
                  Face verification (optional)
                </p>
              </div>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <button
                onClick={() => window.location.href = '/employee/attendance'}
                className="px-5 py-2.5 bg-red-500 text-white text-[13.5px] font-medium rounded-lg hover:bg-red-600 transition-colors duration-150"
              >
                <Clock className="w-4 h-4 mr-2 inline" strokeWidth={1.75} /> Check out
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="dashboard-panel bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 animate-enter transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-slate-900">Profile summary</h2>
              <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <div className="dashboard-soft-row flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-lg transition-colors duration-150 hover:bg-slate-100">
                <span className="text-slate-500 text-[13px]">Employee ID</span>
                <span className="text-slate-900 text-[13px] font-medium">{displayEmployeeId}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-lg transition-colors duration-150 hover:bg-slate-100">
                <span className="text-slate-500 text-[13px]">Department</span>
                <span className="text-slate-900 text-[13px] font-medium">{displayDepartment}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-lg transition-colors duration-150 hover:bg-slate-100">
                <span className="text-slate-500 text-[13px]">Join date</span>
                <span className="text-slate-900 text-[13px] font-medium">
                  {employeeData?.workInfo?.joiningDate ? new Date(employeeData.workInfo.joiningDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-lg transition-colors duration-150 hover:bg-slate-100">
                <span className="text-slate-500 text-[13px]">Email</span>
                <span className="text-slate-900 text-[13px] font-medium">{employeeData?.contactInfo?.personalEmail || employeeData?.user?.email || 'N/A'}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-lg transition-colors duration-150 hover:bg-slate-100">
                <span className="text-slate-500 text-[13px]">Phone</span>
                <span className="text-slate-900 text-[13px] font-medium">{employeeData?.contactInfo?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div
            className="dashboard-panel bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 animate-enter transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            style={{ animationDelay: '220ms' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-slate-900">Latest Updates</h2>
              <Bell className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {noticesLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="rounded-lg border border-slate-200/70 bg-slate-50/70 p-3.5">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                      <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-200/80" />
                      <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-slate-200/70" />
                    </div>
                  ))}
                </div>
              ) : recentNotices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                  <p className="text-[13px] font-medium text-slate-600">No latest notices right now</p>
                  <p className="mt-1 text-[12px] text-slate-400">Holidays, leaves, tasks, sales updates, and HR interview status will appear here.</p>
                </div>
              ) : (
                recentNotices.map((notice) => (
                  <div key={notice.id} className="dashboard-sub-card p-3.5 border border-slate-200/70 bg-slate-50/60 rounded-lg transition-colors duration-150 hover:bg-slate-100/70">
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-slate-900 text-[13px] font-medium">{notice.title || 'Notice'}</h4>
                        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium capitalize text-slate-500 ring-1 ring-slate-200">
                          {notice.type || 'notice'}
                        </span>
                      </div>
                      <span className={`shrink-0 text-[10.5px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(notice.priority)}`}>
                        {notice.priority || 'Medium'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[12.5px] mb-1.5 leading-relaxed">{notice.message || 'No additional details available.'}</p>
                    <p className="text-[11px] text-slate-400">{notice.date ? new Date(notice.date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div
          className="dashboard-panel bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 animate-enter transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
          style={{ animationDelay: '260ms' }}
        >
          <h2 className="text-[15px] font-semibold text-slate-900 mb-5">Quick actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <button
              onClick={() => window.location.href = '/employee/attendance'}
              className="dashboard-sub-card p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group"
            >
              <Clock className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">My Attendance</p>
            </button>
            <button
              onClick={() => window.location.href = '/employee/leaves'}
              className="dashboard-sub-card p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group"
            >
              <Calendar className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">Apply Leave</p>
            </button>
            <button
              onClick={handleViewPayslip}
              className="dashboard-sub-card p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group">
              <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">View Payslip</p>
            </button>
            <button
              onClick={openTeamChat}
              className="dashboard-sub-card relative p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group"
            >
              {totalUnreadTeamMessages > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10.5px] font-semibold leading-none text-white">
                  {totalUnreadTeamMessages > 99 ? '99+' : totalUnreadTeamMessages}
                </span>
              )}
              <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">Chat with Team</p>
            </button>
            <button
              onClick={openGroupChats}
              className="dashboard-sub-card p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group"
            >
              <Users className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">Group Chats</p>
            </button>
            <button
              onClick={() => setShowBotModal(true)}
              className="dashboard-sub-card p-4 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:border-indigo-200 hover:bg-indigo-50/60 transition-colors duration-150 group"
            >
              <Bot className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-150" strokeWidth={1.75} />
              <p className="text-[12px] text-slate-500 group-hover:text-slate-900 transition-colors duration-150">HR Bot</p>
            </button>
          </div>
        </div>

        {/* Chat Modal - rendered inline to prevent remounting */}
        {showChatModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[99998]" onClick={handleCloseChatModal} />
            <div className="employee-chat-modal relative z-[99999] bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl shadow-slate-900/10 animate-enter overflow-hidden" style={{ animationDuration: '0.2s' }}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-[15px] font-semibold text-slate-900 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-indigo-600" strokeWidth={1.75} />
                  Employee Chat
                </h2>
                <button onClick={handleCloseChatModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-150">
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="employee-chat-sidebar w-1/3 border-r border-slate-100 overflow-y-auto">
                  <div className="p-3 text-[12px] text-slate-500 font-medium">Colleagues ({peers.length})</div>
                  {peers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-[13px]">No colleagues available</div>
                  ) : (
                    sortedPeers.map(peer => {
                      const isOnline = onlineUsers.has(peer._id);
                      const peerName = getPersonDisplayName(peer, 'Employee');
                      const peerId = getPeerId(peer);
                      const unreadCount = unreadCounts[peerId] || 0;
                      const lastMessage = peerActivity[peerId]?.lastMessage || '';
                      return (
                        <div
                          key={peer._id}
                          onClick={() => handleSelectPeer(peer)}
                          className={`employee-chat-peer p-3 border-l-2 cursor-pointer transition-colors duration-150 ${selectedPeer?._id === peer._id
                            ? 'border-indigo-500 bg-indigo-50/60 text-slate-900'
                            : 'border-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[13px] font-medium truncate">{peerName}</div>
                            <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                              {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10.5px] font-semibold leading-none text-white">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? 'Online' : 'Offline'} />
                            </div>
                          </div>
                          <div className="text-[11.5px] text-slate-400 flex items-center gap-1 min-w-0 mt-0.5">
                            <span className="truncate">{lastMessage || peer.position || peer.workInfo?.position || 'Employee'}</span>
                            {isOnline && <span className="text-emerald-600">• Online</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  {selectedPeer ? (
                    <>
                      <div className="employee-chat-header p-3 border-b border-slate-100 bg-slate-50/60">
                        <div className="flex items-center gap-2">
                          <div className="text-[13.5px] font-semibold text-slate-900">{getPersonDisplayName(selectedPeer, 'Employee')}</div>
                          <div className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(selectedPeer._id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="text-[12px] text-slate-500 flex items-center gap-2">
                          <span>{selectedPeer.position || selectedPeer.workInfo?.position || 'Employee'}</span>
                          {onlineUsers.has(selectedPeer._id) ? (
                            typingUsers.has(selectedPeer._id) ? (
                              <span className="text-indigo-600 animate-pulse">typing…</span>
                            ) : (
                              <span className="text-emerald-600">Online</span>
                            )
                          ) : (
                            <span className="text-slate-400">Offline</span>
                          )}
                        </div>
                      </div>
                      <div className="employee-chat-messages flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 relative">
                        {loadingChat ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-slate-400 text-[13px]">Loading chat history…</div>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const currentUserId = String(employeeData.id || employeeData._id);
                              const selectedPeerId = String(selectedPeer._id || selectedPeer.user?._id);
                              const filteredMessages = chatMessages.filter(msg => {
                                const msgFrom = String(msg.from || '');
                                const msgTo = String(msg.to || '');
                                return (msgFrom === currentUserId && msgTo === selectedPeerId) ||
                                  (msgFrom === selectedPeerId && msgTo === currentUserId);
                              });
                              if (filteredMessages.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <MessageCircle className="w-12 h-12 mb-3 opacity-25" strokeWidth={1.5} />
                                    <p className="text-[13px]">No messages yet</p>
                                    <p className="text-[11.5px] mt-1">Start a conversation with {getPersonDisplayName(selectedPeer, 'this colleague')}</p>
                                  </div>
                                );
                              }
                              return filteredMessages.map((msg, idx) => (
                                <div key={msg._id || `msg-${idx}`} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`employee-chat-bubble max-w-xs md:max-w-md px-3.5 py-2.5 rounded-xl ${msg.self ? 'employee-chat-bubble-self bg-indigo-600 text-white' : 'employee-chat-bubble-peer bg-white border border-slate-200 text-slate-900'}`}>
                                    {!msg.self && (
                                      <div className="text-[11px] text-slate-400 mb-0.5 font-medium">
                                        {msg.fromName || getPersonDisplayName(selectedPeer, 'Employee')}
                                      </div>
                                    )}
                                    <div className="text-[13px] break-words">{msg.text}</div>
                                    <div className={`text-[10.5px] mt-1 ${msg.self ? 'text-indigo-200' : 'text-slate-400'}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>
                      <div className="employee-chat-compose p-3 border-t border-slate-100">
                        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={handleChatMessageChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            placeholder="Type a message…"
                            className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-l-lg text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors duration-150"
                            autoComplete="off"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="px-4 bg-indigo-600 text-white rounded-r-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors duration-150"
                          >
                            <Send className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">
                      Select a colleague to start chatting
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bot Modal - rendered inline to prevent remounting */}
        {showBotModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={handleCloseBotModal} />
            <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md h-[70vh] flex flex-col shadow-2xl shadow-slate-900/10 animate-enter" style={{ animationDuration: '0.2s' }}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-[15px] font-semibold text-slate-900 flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-indigo-600" strokeWidth={1.75} />
                  HR Assistant
                </h2>
                <button onClick={handleCloseBotModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-150">
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
              <div
                ref={botMessagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 relative"
                onScroll={() => {
                  if (botMessagesContainerRef.current) {
                    const { scrollTop, clientHeight, scrollHeight } = botMessagesContainerRef.current;
                    isUserScrolledUp.current = scrollTop + clientHeight < scrollHeight - 50;
                  }
                }}
              >
                {botMessages.length === 0 && !loadingBot ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Bot className="w-12 h-12 mb-3 opacity-25" strokeWidth={1.5} />
                    <p className="text-[13px]">Hi! I'm your HR Assistant</p>
                    <p className="text-[11.5px] mt-1 text-center px-4">Ask me about leave policies, attendance, salary slips, or any HR-related questions.</p>
                  </div>
                ) : (
                  <>
                    {botMessages.map((msg, idx) => (
                      <div
                        key={msg._id || idx}
                        className={`max-w-xs px-3.5 py-2.5 rounded-xl ${msg.self
                          ? 'ml-auto bg-indigo-600 text-white'
                          : msg.fromBot
                            ? 'mr-auto bg-indigo-50 border border-indigo-100 text-slate-900'
                            : 'mr-auto bg-white border border-slate-200 text-slate-900'
                          }`}
                      >
                        <div className="text-[13px]">
                          {renderMessageText(msg.text)}
                        </div>
                        <div className={`text-[10.5px] mt-1 ${msg.self ? 'text-indigo-200' : 'text-indigo-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                    <div ref={botMessagesEndRef} />
                  </>
                )}
                {loadingBot && (
                  <div className="flex items-center text-slate-400 text-[13px] p-3">
                    <Loader2 className="w-4 h-4 mr-2 text-indigo-600 animate-spin" />
                    Bot is thinking…
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-100">
                <div className="flex">
                  <input
                    type="text"
                    value={newBotMessage}
                    onChange={(e) => setNewBotMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBotMessage();
                      }
                    }}
                    placeholder="Ask HR Assistant…"
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-l-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors duration-150"
                    disabled={loadingBot}
                  />
                  <button
                    onClick={sendBotMessage}
                    disabled={!newBotMessage.trim() || loadingBot}
                    className="px-4 bg-indigo-600 text-white rounded-r-lg disabled:opacity-40 hover:bg-indigo-500 transition-colors duration-150"
                  >
                    <Send className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payslip Modal */}
        {showPayslipModal && employeeData && (
          <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-2.5 pt-12 pb-14 sm:p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]" onClick={() => setShowPayslipModal(false)} />
            <div className="relative z-[99999] flex max-h-[calc(100dvh-100px)] sm:max-h-[85vh] w-full max-w-3xl lg:max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-enter" style={{ animationDuration: '0.2s' }}>
              {/* Header */}
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/95 px-3.5 py-2.5 backdrop-blur sm:px-6 sm:py-3.5">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs shrink-0">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-[15px] font-bold text-slate-900 tracking-tight leading-none">
                      Salary Slip — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">Official Monthly Compensation Breakdown</p>
                  </div>
                </div>
                <button onClick={() => setShowPayslipModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all duration-150">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="task-details-modal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3 sm:space-y-4 sm:px-6 sm:py-4">
                {payslipLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                  </div>
                ) : !currentPayslip ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-slate-800 text-xs sm:text-[14px] font-semibold">No payslip generated for current month</p>
                    <p className="text-slate-400 text-[11px] sm:text-[12px] mt-0.5">Please contact HR for more information</p>
                  </div>
                ) : (
                  <>
                    {/* Top Row: Employee Info & Attendance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Employee Info Card */}
                      <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                        <h3 className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-600 mb-1">Employee Details</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Employee Name</span>
                            <span className="text-slate-900 font-semibold truncate block">{currentPayslip.employeeName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Employee ID</span>
                            <span className="text-slate-900 font-semibold">{currentPayslip.employeeId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Pay Period</span>
                            <span className="text-slate-900 font-semibold">
                              {new Date(currentPayslip.period.year, currentPayslip.period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Status</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                              {currentPayslip.status || 'Generated'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Summary */}
                      {currentPayslip.attendance ? (
                        <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-2.5 sm:p-3">
                          <h3 className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">Attendance Summary</h3>
                          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center">
                            <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-indigo-100/80 shadow-2xs">
                              <span className="text-xs sm:text-[16px] font-bold text-slate-900 block leading-tight">{currentPayslip.attendance.workingDays || 0}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Working</span>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-emerald-100 shadow-2xs">
                              <span className="text-xs sm:text-[16px] font-bold text-emerald-600 block leading-tight">{currentPayslip.attendance.presentDays || 0}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Present</span>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-amber-100 shadow-2xs">
                              <span className="text-xs sm:text-[16px] font-bold text-amber-600 block leading-tight">{currentPayslip.attendance.leaveDays || 0}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Leave</span>
                            </div>
                            <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-rose-100 shadow-2xs">
                              <span className="text-xs sm:text-[16px] font-bold text-rose-600 block leading-tight">{currentPayslip.attendance.absentDays || 0}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Absent</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center justify-center text-slate-400 text-xs">
                          No attendance data recorded
                        </div>
                      )}
                    </div>

                    {/* Middle Row: Earnings & Deductions Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Earnings Column */}
                      <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5 border-b border-emerald-200/60 pb-1">
                            <h3 className="text-xs sm:text-[13px] font-bold text-emerald-800">Earnings</h3>
                            <span className="text-[10px] sm:text-[10.5px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">Allowances</span>
                          </div>
                          <div className="space-y-1 text-xs sm:text-[12px]">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Basic Salary</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.basicSalary || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">HRA</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.hra || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Medical Allowance</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.medical || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Transport Allowance</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.transport || 0).toLocaleString()}</span>
                            </div>
                            {(currentPayslip.earnings?.bonus || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Bonus</span>
                                <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.bonus || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(currentPayslip.earnings?.overtime || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Overtime</span>
                                <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.overtime || 0).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600">Other Allowances</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.otherAllowances || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between border-t border-emerald-200/80 pt-1.5 mt-1.5 font-bold text-xs sm:text-[13px]">
                          <span className="text-emerald-800">Gross Earnings</span>
                          <span className="text-emerald-800">₹{(currentPayslip.grossEarnings || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div className="bg-rose-50/40 border border-rose-200/60 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5 border-b border-rose-200/60 pb-1">
                            <h3 className="text-xs sm:text-[13px] font-bold text-rose-800">Deductions</h3>
                            <span className="text-[10px] sm:text-[10.5px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">Taxes & PF</span>
                          </div>
                          <div className="space-y-1 text-xs sm:text-[12px]">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Provident Fund (PF)</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.pf || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">ESI</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.esi || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Income Tax</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.tax || 0).toLocaleString()}</span>
                            </div>
                            {(currentPayslip.deductions?.professionalTax || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Professional Tax</span>
                                <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.professionalTax || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(currentPayslip.deductions?.loanDeduction || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Loan Deduction</span>
                                <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.loanDeduction || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(currentPayslip.deductions?.lateDeduction || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-rose-700 font-medium">Late Check-in (₹200/day)</span>
                                <span className="font-bold text-rose-700">₹{(currentPayslip.deductions?.lateDeduction || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(currentPayslip.deductions?.halfDayDeduction || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-rose-700 font-medium">Half Day Deduction</span>
                                <span className="font-bold text-rose-700">₹{(currentPayslip.deductions?.halfDayDeduction || 0).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600">Other Deductions</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.otherDeductions || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between border-t border-rose-200/80 pt-1.5 mt-1.5 font-bold text-xs sm:text-[13px]">
                          <span className="text-rose-800">Total Deductions</span>
                          <span className="text-rose-800">₹{(currentPayslip.totalDeductions || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Net Salary Callout & Bank Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 items-center">
                      <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3 sm:p-3.5 shadow-md flex items-center justify-between">
                        <div>
                          <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-widest text-indigo-300">Take-Home Pay</p>
                          <p className="text-xs sm:text-[12.5px] text-slate-300 font-medium mt-0.5">Net Salary Credited</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg sm:text-[25px] font-extrabold tracking-tight text-white leading-none">
                            ₹{(currentPayslip.netSalary || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Bank Details */}
                      {currentPayslip.bankInfo && (
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-0.5 text-xs">
                          <p className="font-bold text-slate-800 text-[11px] sm:text-[11.5px] mb-0.5">Bank Account</p>
                          <div className="flex justify-between text-slate-600">
                            <span>Bank:</span>
                            <span className="font-medium text-slate-900 truncate max-w-[110px]">{currentPayslip.bankInfo.bankName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>A/C:</span>
                            <span className="font-medium text-slate-900">{currentPayslip.bankInfo.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>IFSC:</span>
                            <span className="font-medium text-slate-900">{currentPayslip.bankInfo.ifscCode || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {currentPayslip.remarks && (
                      <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 text-xs">
                        <span className="font-semibold text-slate-700">Remarks: </span>
                        <span className="text-slate-600">{currentPayslip.remarks}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sticky Action Footer */}
              <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-white/95 px-3.5 py-2.5 backdrop-blur sm:px-6 sm:py-3.5">
                <button
                  type="button"
                  onClick={() => setShowPayslipModal(false)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200/80 text-slate-600 rounded-xl hover:bg-slate-50 transition-all duration-150 text-xs sm:text-sm font-semibold shadow-2xs"
                >
                  Close
                </button>
                {currentPayslip && (
                  <button
                    onClick={handleDownloadPayslip}
                    className="flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-[13px] font-semibold rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all duration-150 shadow-md hover:shadow-indigo-500/25"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                    Download PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Group Chat Modal */}
        <GroupChatModal
          isOpen={showGroupChatModal}
          onClose={handleCloseGroupChatModal}
          socket={socketRef.current}
          employeeData={employeeData}
          onlineUsers={onlineUsers}
        />
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;
