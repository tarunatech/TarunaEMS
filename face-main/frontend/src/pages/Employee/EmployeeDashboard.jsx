// src/pages/Employee/EmployeeDashboard.js
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  User, Clock, Calendar, DollarSign, CheckCircle, AlertCircle, MapPin, Bell, Award, Target, TrendingUp, FileText, MessageCircle, X, Send, Bot, Camera, Download, Users, Loader2
} from 'lucide-react';
import GroupChatModal from '../../components/Employee/GroupChat/GroupChatModal';
import toast from 'react-hot-toast';
import { employeeAPI, authAPI, attendanceAPI, payslipAPI } from '../../utils/api';
import API from '../../utils/api';
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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [newBotMessage, setNewBotMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const botMessagesEndRef = useRef(null);
  const botMessagesContainerRef = useRef(null);
  const botTimeoutRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const typingTimeoutRef = useRef(null);
  const welcomeHero = useMemo(() => getWelcomeHero(currentTime), [currentTime]);

  const openTeamChat = useCallback(() => {
    setShowGroupChatModal(false);
    setShowBotModal(false);
    setShowChatModal(true);
  }, []);

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
          // Ensure we have the user ID as id, and employee ID as employeeId
          setEmployeeData({
            ...employee,
            id: employee.id || employee.user?._id || employee._id,
            employeeId: employee.employeeId || employee._id
          });

          const stats = [
            { title: 'Days Present', value: '...', subtitle: 'This Month', icon: CheckCircle, color: 'from-green-500 to-green-600', change: 'Calculating...' },
            { title: 'Leave Balance', value: employee.leaveBalance?.remaining?.toString() || '30', subtitle: 'Days Remaining', icon: Calendar, color: 'from-blue-500 to-blue-600', change: `${employee.leaveBalance?.total || 30} total allocated` },
            { title: 'Current Salary', value: `₹${employee.salaryInfo?.basicSalary?.toLocaleString() || '60,000'}`, subtitle: 'Basic Salary', icon: DollarSign, color: 'from-purple-500 to-purple-600', change: 'Monthly' },
            { title: 'Years of Service', value: employee.yearsOfService?.toString() || '0', subtitle: 'Years', icon: Target, color: 'from-pink-500 to-pink-600', change: `Since ${employee.workInfo?.joiningDate ? new Date(employee.workInfo.joiningDate).getFullYear() : 'N/A'}` }
          ];
          setDashboardStats(stats);
        } else {
          console.error('Failed to fetch employee profile:', profileResponse);
          toast.error('Unable to load your profile data');
          setDefaultStats();
        }

        try {
          const [attendanceStatusRes, statsRes] = await Promise.all([
            attendanceAPI.getTodayAttendance(),
            attendanceAPI.getEmployeeAttendanceStats()
          ]);

          if (attendanceStatusRes.data.success) {
            const data = attendanceStatusRes.data;
            setTodayAttendance(data.data);
            setHasCheckedIn(data.hasCheckedIn);
            setHasCheckedOut(data.hasCheckedOut);
          }

          if (statsRes.data.success) {
            const realStats = statsRes.data.data;
            setDashboardStats(prev => {
              if (!prev) return prev;
              const updated = [...prev];
              updated[0] = { ...updated[0], value: realStats.presentDays.toString(), change: `${realStats.lateDays} late, ${realStats.halfDays} half days` };
              return updated;
            });
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Error fetching today attendance or stats:', error);
          }
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
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return baseUrl.replace('/api', '') + path;
  };

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

  const setDefaultStats = () => {
    setDashboardStats([
      { title: 'Days Present', value: '0', subtitle: 'This Month', icon: CheckCircle, color: 'from-green-500 to-green-600', change: 'No data' },
      { title: 'Leave Balance', value: '30', subtitle: 'Days Remaining', icon: Calendar, color: 'from-blue-500 to-blue-600', change: '30 total allocated' },
      { title: 'Current Salary', value: '₹0', subtitle: 'Basic Salary', icon: DollarSign, color: 'from-purple-500 to-purple-600', change: 'Monthly' },
      { title: 'Years of Service', value: '0', subtitle: 'Years', icon: Target, color: 'from-pink-500 to-pink-600', change: 'N/A' }
    ]);
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
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://face-votd.onrender.com';
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
  }, [employeeData]);

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
            res.data.data.forEach(user => {
              if (user.isOnline) {
                setOnlineUsers(prev => new Set(prev).add(user._id));
              }
            });
            if (res.data.data.length > 0 && !selectedPeer) {
              setSelectedPeer(res.data.data[0]);
            }
          }
        } catch (err) {
          console.error('Failed to load chat users:', err);
          toast.error('Could not load employee list for chat');
        }
      };
      fetchChatUsers();
    }
  }, [showChatModal, employeeData]);

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
                fromName: msg.from?.fullName ||
                  (msg.from?.personalInfo?.firstName && msg.from?.personalInfo?.lastName
                    ? `${msg.from.personalInfo.firstName} ${msg.from.personalInfo.lastName}`
                    : 'Unknown'),
                to: msg.to?._id || msg.to,
                text: msg.text,
                timestamp: msg.timestamp,
                self: isSelf,
                fromBot: msg.fromBot || false
              };
            });
            setChatMessages(normalized);
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
  }, [selectedPeer, employeeData]);

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
      fromName: `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`,
      to: peerId,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      clientMessageId
    };

    setChatMessages(prev => [...prev, { ...message, _id: clientMessageId, self: true, pending: true }]);
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

  const recentNotices = [
    { id: 1, title: "Company Holiday Announcement", message: "Office will be closed on October 15th for Diwali festival.", date: "2024-10-10", priority: "High" },
    { id: 2, title: "New HR Policy Update", message: "Please review the updated attendance policy.", date: "2024-10-08", priority: "Medium" },
    { id: 3, title: "Team Meeting Scheduled", message: "Monthly team sync meeting scheduled for tomorrow at 2 PM.", date: "2024-10-09", priority: "Medium" }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': case 'on track': return 'text-green-700 bg-green-100';
      case 'in progress': case 'nearly complete': return 'text-amber-700 bg-amber-100';
      case 'pending': case 'not started': return 'text-red-700 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  if (loading) {
    return (
      <EmployeeLayout onOpenTeamChat={openTeamChat} onOpenGroupChats={openGroupChats}>
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-blue-100/80 bg-gradient-to-br from-white via-sky-50 to-indigo-50 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-white/80 p-3 shadow-[0_10px_24px_rgba(37,99,235,0.14)] ring-1 ring-blue-100">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
            <p className="text-base font-semibold text-slate-700">Loading your dashboard...</p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '300ms' }} />
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
    {
      icon: 'from-blue-500 to-indigo-600',
      ring: 'ring-blue-100/80',
      glow: 'shadow-blue-500/25',
      wash: 'rgba(59,130,246,0.10)'
    },
    {
      icon: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-100/80',
      glow: 'shadow-emerald-500/25',
      wash: 'rgba(16,185,129,0.10)'
    },
    {
      icon: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-100/80',
      glow: 'shadow-amber-500/25',
      wash: 'rgba(245,158,11,0.10)'
    },
    {
      icon: 'from-pink-500 to-rose-600',
      ring: 'ring-pink-100/80',
      glow: 'shadow-pink-500/25',
      wash: 'rgba(236,72,153,0.10)'
    }
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
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.5s ease-out both;
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
      <div className="space-y-6 bg-[#F8FAFC]">
        {/* Welcome Section */}
        <div
          className="relative min-h-[260px] overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-950 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.22)] animate-enter transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_56px_rgba(15,23,42,0.28)] md:p-10"
          style={{ animationDelay: '0ms' }}
        >
          <video
            key={welcomeHero.video}
            src={welcomeHero.video}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-900/58 to-slate-950/46" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/36 via-slate-950/18 to-slate-950/78" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-slate-950/52 via-slate-900/24 to-transparent" />
          <div className="absolute left-0 right-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/56 via-slate-900/18 to-transparent" />
          <div className="welcome-wave absolute -left-24 bottom-4 h-28 w-[125%] rounded-[50%] border-t border-cyan-200/10 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.14),transparent_62%)] blur-sm" />
          <div className="welcome-wave-slow absolute -left-32 bottom-12 h-36 w-[135%] rounded-[50%] border-t border-indigo-200/10 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.12),transparent_66%)] blur-md" />
          <div className="welcome-wave-float absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_35%,rgba(147,197,253,0.12),transparent_26%)]" />
          <div className="welcome-shimmer absolute -top-8 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-xl" />
          <div className="welcome-particle absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-cyan-200/45" />
          <div className="welcome-particle absolute left-[48%] top-[16%] h-1 w-1 rounded-full bg-indigo-200/40" style={{ animationDelay: '2.8s', animationDuration: '14s' }} />
          <div className="welcome-particle absolute right-[18%] bottom-[26%] h-1.5 w-1.5 rounded-full bg-white/35" style={{ animationDelay: '5.2s', animationDuration: '16s' }} />

          <div className="relative z-10 flex min-h-[188px] flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-[0_16px_32px_rgba(79,70,229,0.36)] transition-transform duration-300 hover:scale-105">
                {(employeeData?.profileImage || employeeData?.user?.profileImage) ? (
                  <img
                    src="/emp_mountain.png"
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.42em] text-cyan-100 drop-shadow-[0_2px_8px_rgba(15,23,42,0.9)]">
                  {welcomeHero.message}
                </p>
                <h1 className="mb-3 text-4xl font-extrabold leading-tight text-white drop-shadow-[0_4px_14px_rgba(15,23,42,0.9)] md:text-4xl">
                  Welcome,<br className="hidden sm:block" />{' '}
                  <span className="bg-gradient-to-r from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent">{displayName}!</span>
                </h1>
               <p className="mb-5 text-lg font-semibold text-slate-50 drop-shadow-[0_2px_8px_rgba(15,23,42,0.85)]">
  {displayPosition}
  <span className="mx-2 text-slate-200">•</span>
  {displayDepartment}
</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-xl border border-white/30 bg-slate-950/46 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md">
                    Employee ID: <span className="text-cyan-100">{displayEmployeeId}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-950/44 px-4 py-2 text-sm font-bold text-emerald-100 shadow-sm backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
                    Online
                  </span>
                  {/* <span className="rounded-full border border-white/25 bg-slate-950/46 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm backdrop-blur-md">
                    Available
                  </span> */}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start border-white/10 md:items-end md:border- md:pl-10">
              <p className="font-mono text-4xl font-extrabold leading-none tracking-wider text-white drop-shadow-[0_5px_18px_rgba(15,23,42,0.92)] md:text-6xl">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="mt-2 text-base font-bold text-cyan-50 drop-shadow-[0_2px_8px_rgba(15,23,42,0.85)]">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-7 rounded-full border border-white/30 bg-slate-950/44 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardStats.map((stat, index) => (
              <div
                key={index}
                className="dashboard-stat-card relative overflow-hidden bg-[#F8FAFC] border border-blue-100/80 rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.07)] p-6 animate-enter transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]"
                style={{ animationDelay: `${80 + index * 80}ms` }}
              >
                <div
                  className="dashboard-card-wash absolute -top-14 -right-14 h-32 w-32 rounded-full transition-transform duration-300"
                  style={{ background: employeeStatAccents[index % employeeStatAccents.length].wash }}
                />
                <div className="flex items-center justify-between mb-4">
                  <div className={`relative w-12 h-12 bg-gradient-to-r ${employeeStatAccents[index % employeeStatAccents.length].icon} rounded-xl flex items-center justify-center shadow-lg ${employeeStatAccents[index % employeeStatAccents.length].glow} ring-4 ${employeeStatAccents[index % employeeStatAccents.length].ring}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</h3>
                  <p className="text-slate-500 text-sm mb-2">{stat.title}</p>
                  <p className="text-xs text-indigo-600 font-semibold">{stat.change}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attendance Section */}
        <div
          className="dashboard-panel bg-[#F8FAFC] border border-blue-100/80 rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.07)] p-6 animate-enter transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Today's Attendance</h2>
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className={`w-4 h-4 rounded-full ${hasCheckedIn ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <div>
                <p className="text-slate-900 font-medium">
                  Status: <span className={hasCheckedIn ? 'text-green-600' : 'text-red-600'}>
                    {hasCheckedIn ? (hasCheckedOut ? 'Completed for today' : 'Checked In') : 'Not Marked'}
                  </span>
                </p>
                {todayAttendance && (
                  <div className="text-sm text-slate-500 space-y-1">
                    {todayAttendance.checkInTime && <p>Check-in: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</p>}
                    {hasCheckedIn && !hasCheckedOut && realTimeWorkingTime > 0 && (
                      <p className="text-green-600">Working Time: {Math.floor(realTimeWorkingTime / 60)}h {realTimeWorkingTime % 60}m</p>
                    )}
                    {todayAttendance.checkOutTime && <p>Check-out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</p>}
                  </div>
                )}
                {location && (
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" /> Location ready
                  </p>
                )}
              </div>
            </div>
            {!hasCheckedIn && (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={markAttendance}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-[0_12px_24px_rgba(79,70,229,0.24)] hover:shadow-[0_16px_30px_rgba(79,70,229,0.30)] hover:scale-[1.02] transition-all duration-200 flex items-center justify-center"
                >
                  <Camera className="w-4 h-4 mr-2" /> Mark Attendance with Face Verification
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Face verification (Optional)
                </p>
              </div>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <button
                onClick={() => window.location.href = '/employee/attendance'}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
              >
                <Clock className="w-4 h-4 mr-2 inline" /> Check Out
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="dashboard-panel bg-[#F8FAFC] border border-blue-100/80 rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.07)] p-6 animate-enter transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]"
            style={{ animationDelay: '220ms' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Profile Summary</h2>
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-4">
              <div className="dashboard-soft-row flex justify-between items-center p-3 bg-[#F1F5F9] border border-blue-100/60 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:border-indigo-200">
                <span className="text-slate-500">Employee ID</span>
                <span className="text-slate-900 font-medium">{displayEmployeeId}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center p-3 bg-[#F1F5F9] border border-blue-100/60 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:border-indigo-200">
                <span className="text-slate-500">Department</span>
                <span className="text-slate-900 font-medium">{displayDepartment}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center p-3 bg-[#F1F5F9] border border-blue-100/60 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:border-indigo-200">
                <span className="text-slate-500">Join Date</span>
                <span className="text-slate-900 font-medium">
                  {employeeData?.workInfo?.joiningDate ? new Date(employeeData.workInfo.joiningDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center p-3 bg-[#F1F5F9] border border-blue-100/60 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:border-indigo-200">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium">{employeeData?.contactInfo?.personalEmail || employeeData?.user?.email || 'N/A'}</span>
              </div>
              <div className="dashboard-soft-row flex justify-between items-center p-3 bg-[#F1F5F9] border border-blue-100/60 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:border-indigo-200">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-900 font-medium">{employeeData?.contactInfo?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div
            className="dashboard-panel bg-[#F8FAFC] border border-blue-100/80 rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.07)] p-6 animate-enter transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]"
            style={{ animationDelay: '260ms' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Latest Notices</h2>
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="dashboard-sub-card p-4 border border-blue-100/80 bg-[#F8FAFC] rounded-xl transition-all duration-200 hover:border-indigo-300 hover:bg-blue-50 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-slate-900 font-medium">{notice.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(notice.priority)}`}>
                      {notice.priority}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-2">{notice.message}</p>
                  <p className="text-xs text-indigo-600">{new Date(notice.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="dashboard-panel bg-[#F8FAFC] border border-blue-100/80 rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.07)] p-6 animate-enter transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(30,64,175,0.12)]"
          style={{ animationDelay: '300ms' }}
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <button
              onClick={() => window.location.href = '/employee/attendance'}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group"
            >
              <Clock className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">My Attendance</p>
            </button>
            <button
              onClick={() => window.location.href = '/employee/leaves'}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group"
            >
              <Calendar className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">Apply Leave</p>
            </button>
            <button
              onClick={handleViewPayslip}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group">
              <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">View Payslip</p>
            </button>
            <button
              onClick={openTeamChat}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group"
            >
              <MessageCircle className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">Chat with Team</p>
            </button>
            <button
              onClick={openGroupChats}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group"
            >
              <Users className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">Group Chats</p>
            </button>
            <button
              onClick={() => setShowBotModal(true)}
              className="dashboard-sub-card p-4 rounded-xl border border-blue-100/80 bg-[#F8FAFC] hover:border-indigo-300 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,64,175,0.10)] transition-all duration-200 group"
            >
              <Bot className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors duration-200" />
              <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors duration-200">HR Bot</p>
            </button>
          </div>
        </div>

        {/* Chat Modal - rendered inline to prevent remounting */}
        {showChatModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[99998]" onClick={handleCloseChatModal} />
            <div className="relative z-[99999] bg-[#F8FAFC] border border-blue-100/80 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-[0_20px_44px_rgba(15,23,42,0.16)] animate-enter" style={{ animationDuration: '0.25s' }}>
              <div className="flex items-center justify-between p-4 border-b border-blue-100/80">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />
                  Employee Chat
                </h2>
                <button onClick={handleCloseChatModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
                  <div className="p-3 text-sm text-slate-500 font-medium">Colleagues ({peers.length})</div>
                  {peers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No colleagues available</div>
                  ) : (
                    peers.map(peer => {
                      const isOnline = onlineUsers.has(peer._id);
                      const peerName = peer.name || 'Unknown';
                      return (
                        <div
                          key={peer._id}
                          onClick={() => setSelectedPeer(peer)}
                          className={`p-3 border-l-4 cursor-pointer transition-all duration-200 ${selectedPeer?._id === peer._id
                            ? 'border-blue-600 bg-blue-50 text-slate-900'
                            : 'border-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">{peerName}</div>
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} title={isOnline ? 'Online' : 'Offline'} />
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span>{peer.position || peer.workInfo?.position || 'Employee'}</span>
                            {isOnline && <span className="text-green-600">• Online</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  {selectedPeer ? (
                    <>
                      <div className="p-3 border-b border-blue-100/80 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900">{selectedPeer.name || 'Unknown User'}</div>
                          <div className={`w-2 h-2 rounded-full ${onlineUsers.has(selectedPeer._id) ? 'bg-green-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <span>{selectedPeer.position || selectedPeer.workInfo?.position || 'Employee'}</span>
                          {onlineUsers.has(selectedPeer._id) ? (
                            typingUsers.has(selectedPeer._id) ? (
                              <span className="text-blue-600 animate-pulse">typing...</span>
                            ) : (
                              <span className="text-green-600">Online</span>
                            )
                          ) : (
                            <span className="text-slate-400">Offline</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 relative">
                        {loadingChat ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-slate-400">Loading chat history...</div>
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
                                    <MessageCircle className="w-16 h-16 mb-3 opacity-30" />
                                    <p className="text-sm">No messages yet</p>
                                    <p className="text-xs mt-1">Start a conversation with {selectedPeer.name || 'this colleague'}</p>
                                  </div>
                                );
                              }
                              return filteredMessages.map((msg, idx) => (
                                <div key={msg._id || `msg-${idx}`} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm ${msg.self ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
                                    {!msg.self && (
                                      <div className="text-xs text-slate-400 mb-1 font-medium">
                                        {msg.fromName || selectedPeer.name || 'Unknown'}
                                      </div>
                                    )}
                                    <div className="text-sm break-words">{msg.text}</div>
                                    <div className={`text-xs mt-1 ${msg.self ? 'text-blue-100' : 'text-slate-400'}`}>
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
                      <div className="p-3 border-t border-slate-200">
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
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-l-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                            autoComplete="off"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity duration-200"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
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
            <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md h-[70vh] flex flex-col shadow-xl animate-enter" style={{ animationDuration: '0.25s' }}>
              <div className="flex items-center justify-between p-4 border-b border-blue-100/80">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-indigo-600" />
                  HR Assistant
                </h2>
                <button onClick={handleCloseBotModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div
                ref={botMessagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 relative"
                onScroll={() => {
                  if (botMessagesContainerRef.current) {
                    const { scrollTop, clientHeight, scrollHeight } = botMessagesContainerRef.current;
                    isUserScrolledUp.current = scrollTop + clientHeight < scrollHeight - 50;
                  }
                }}
              >
                {botMessages.length === 0 && !loadingBot ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Bot className="w-16 h-16 mb-3 opacity-30" />
                    <p className="text-sm">Hi! I'm your HR Assistant</p>
                    <p className="text-xs mt-1 text-center px-4">Ask me about leave policies, attendance, salary slips, or any HR-related questions.</p>
                  </div>
                ) : (
                  <>
                    {botMessages.map((msg, idx) => (
                      <div
                        key={msg._id || idx}
                        className={`max-w-xs p-3 rounded-lg shadow-sm ${msg.self
                          ? 'ml-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : msg.fromBot
                            ? 'mr-auto bg-blue-50 border border-blue-200 text-slate-900'
                            : 'mr-auto bg-white border border-slate-200 text-slate-900'
                          }`}
                      >
                        <div className="text-sm">
                          {renderMessageText(msg.text)}
                        </div>
                        <div className={`text-xs mt-1 ${msg.self ? 'text-blue-100' : 'text-blue-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                    <div ref={botMessagesEndRef} />
                  </>
                )}
                {loadingBot && (
                  <div className="flex items-center text-slate-400 p-3">
                    <Loader2 className="w-4 h-4 mr-2 text-blue-600 animate-spin" />
                    Bot is thinking...
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-200">
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
                    placeholder="Ask HR Assistant..."
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-l-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    disabled={loadingBot}
                  />
                  <button
                    onClick={sendBotMessage}
                    disabled={!newBotMessage.trim() || loadingBot}
                    className="px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-r-lg disabled:opacity-50 transition-opacity duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payslip Modal */}
        {showPayslipModal && employeeData && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[99998]" onClick={() => setShowPayslipModal(false)} />
            <div className="relative z-[99999] bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-enter" style={{ animationDuration: '0.25s' }}>
              <div className="flex items-center justify-between p-4 border-b border-blue-100/80">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                  Salary Slip - {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => setShowPayslipModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {payslipLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                ) : !currentPayslip ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 text-lg font-medium">No payslip generated for current month</p>
                    <p className="text-slate-400 text-sm mt-2">Please contact HR for more information</p>
                  </div>
                ) : (
                  <>
                    {/* Employee Info */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Employee Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Name:</span>
                          <span className="text-slate-900 ml-2">{currentPayslip.employeeName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Employee ID:</span>
                          <span className="text-slate-900 ml-2">{currentPayslip.employeeId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Period:</span>
                          <span className="text-slate-900 ml-2">
                            {new Date(currentPayslip.period.year, currentPayslip.period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>
                          <span className="text-slate-900 ml-2 capitalize">{currentPayslip.status || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Info */}
                    {currentPayslip.attendance && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-600 mb-3">Attendance Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Working Days:</span>
                            <span className="text-slate-900">{currentPayslip.attendance.workingDays || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Present Days:</span>
                            <span className="text-slate-900">{currentPayslip.attendance.presentDays || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Leave Days:</span>
                            <span className="text-slate-900">{currentPayslip.attendance.leaveDays || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Absent Days:</span>
                            <span className="text-slate-900">{currentPayslip.attendance.absentDays || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Earnings */}
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-700 mb-3">Earnings</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Basic Salary</span>
                          <span className="text-slate-900">₹{(currentPayslip.earnings?.basicSalary || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">HRA</span>
                          <span className="text-slate-900">₹{(currentPayslip.earnings?.hra || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Medical Allowance</span>
                          <span className="text-slate-900">₹{(currentPayslip.earnings?.medical || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Transport Allowance</span>
                          <span className="text-slate-900">₹{(currentPayslip.earnings?.transport || 0).toLocaleString()}</span>
                        </div>
                        {(currentPayslip.earnings?.bonus || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Bonus</span>
                            <span className="text-slate-900">₹{(currentPayslip.earnings?.bonus || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(currentPayslip.earnings?.overtime || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Overtime</span>
                            <span className="text-slate-900">₹{(currentPayslip.earnings?.overtime || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Other Allowances</span>
                          <span className="text-slate-900">₹{(currentPayslip.earnings?.otherAllowances || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-green-200 pt-2 font-semibold">
                          <span className="text-green-700">Gross Earnings</span>
                          <span className="text-green-700">₹{(currentPayslip.grossEarnings || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Deductions */}
                {currentPayslip && (
                  <>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-red-700 mb-3">Deductions</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Provident Fund (PF)</span>
                          <span className="text-slate-900">₹{(currentPayslip.deductions?.pf || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">ESI</span>
                          <span className="text-slate-900">₹{(currentPayslip.deductions?.esi || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tax</span>
                          <span className="text-slate-900">₹{(currentPayslip.deductions?.tax || 0).toLocaleString()}</span>
                        </div>
                        {(currentPayslip.deductions?.professionalTax || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Professional Tax</span>
                            <span className="text-slate-900">₹{(currentPayslip.deductions?.professionalTax || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(currentPayslip.deductions?.loanDeduction || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Loan Deduction</span>
                            <span className="text-slate-900">₹{(currentPayslip.deductions?.loanDeduction || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Other Deductions</span>
                          <span className="text-slate-900">₹{(currentPayslip.deductions?.otherDeductions || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-red-200 pt-2 font-semibold">
                          <span className="text-red-700">Total Deductions</span>
                          <span className="text-red-700">₹{(currentPayslip.totalDeductions || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-slate-900">Net Salary</span>
                        <span className="text-2xl font-bold text-blue-600">₹{(currentPayslip.netSalary || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Bank Info */}
                    {currentPayslip.bankInfo && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">Bank Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bank Name:</span>
                            <span className="text-slate-900">{currentPayslip.bankInfo.bankName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Account Number:</span>
                            <span className="text-slate-900">{currentPayslip.bankInfo.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">IFSC Code:</span>
                            <span className="text-slate-900">{currentPayslip.bankInfo.ifscCode || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Remarks */}
                    {currentPayslip.remarks && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Remarks</h3>
                        <p className="text-slate-600 text-sm">{currentPayslip.remarks}</p>
                      </div>
                    )}

                    {/* Download Button */}
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={handleDownloadPayslip}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                      >
                        <Download className="w-5 h-5" />
                        Download Payslip PDF
                      </button>
                    </div>
                  </>
                )}


                <p className="text-xs text-slate-400 text-center">This is a computer generated payslip and does not require a signature.</p>
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
