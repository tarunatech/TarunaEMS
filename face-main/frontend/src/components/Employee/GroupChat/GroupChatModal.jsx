import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Users, Plus, Settings, LogOut, Crown, Shield, UserPlus, Trash2, ArrowLeft, Check, Loader2, Search, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../../utils/api';

const GroupChatModal = ({ 
  isOpen, 
  onClose, 
  socket, 
  employeeData, 
  onlineUsers 
}) => {
  const socketReady = socket?.connected;
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const selectedGroupRef = useRef(selectedGroup);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, scrollToBottom]);

  useEffect(() => {
    if (selectedGroup) {
      setEditGroupName(selectedGroup.name || '');
      setEditGroupDescription(selectedGroup.description || '');
      setIsEditingInfo(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      fetchAvailableUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleGroupMessage = (message) => {
      const currentUserId = String(employeeData?.id || employeeData?._id || localStorage.getItem('userId') || '');
      const senderId = String(message.sender?._id || message.sender?.id || message.sender || '');
      const activeGroupId = selectedGroupRef.current?._id;

      if (String(message.groupId) === String(activeGroupId)) {
        setGroupMessages(prev => {
          if (message._id && prev.some(m => m._id === message._id)) return prev;
          if (message.clientMessageId && prev.some(m => m.clientMessageId === message.clientMessageId)) {
            return prev.map(m => m.clientMessageId === message.clientMessageId ? message : m);
          }
          return [...prev, message];
        });
      }
      setGroups(prev => prev.map(g => 
        g._id === message.groupId 
          ? { ...g, lastMessage: { text: message.text, sender: message.sender, timestamp: message.timestamp } }
          : g
      ));
      if (senderId && senderId !== currentUserId) {
        window.dispatchEvent(new CustomEvent('employee-notifications-refresh'));
      }
    };

    const handleTypingStart = ({ groupId, userId, userName }) => {
      const activeGroupId = selectedGroupRef.current?._id;
      if (String(groupId) === String(activeGroupId) && String(userId) !== String(employeeData?.id || employeeData?._id)) {
        setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      }
    };

    const handleTypingStop = ({ groupId, userId }) => {
      const activeGroupId = selectedGroupRef.current?._id;
      if (String(groupId) === String(activeGroupId)) {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    };

    const handleGroupAdded = ({ groupId }) => {
      fetchGroups();
      toast.success('You were added to a new group');
    };

    const handleGroupRemoved = ({ groupId }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroupRef.current?._id === groupId) {
        setSelectedGroup(null);
        setGroupMessages([]);
        toast.info('You were removed from the group');
      }
    };

    const handleGroupUpdated = (updatedGroup) => {
      setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
      if (selectedGroupRef.current?._id === updatedGroup._id) {
        setSelectedGroup(updatedGroup);
      }
    };

    const handleGroupDeleted = ({ groupId }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroupRef.current?._id === groupId) {
        setSelectedGroup(null);
        setGroupMessages([]);
        toast.info('Group was deleted');
      }
    };

    socket.on('group:message', handleGroupMessage);
    socket.on('group:typing:start', handleTypingStart);
    socket.on('group:typing:stop', handleTypingStop);
    socket.on('group:added', handleGroupAdded);
    socket.on('group:removed', handleGroupRemoved);
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:deleted', handleGroupDeleted);

    return () => {
      socket.off('group:message', handleGroupMessage);
      socket.off('group:typing:start', handleTypingStart);
      socket.off('group:typing:stop', handleTypingStop);
      socket.off('group:added', handleGroupAdded);
      socket.off('group:removed', handleGroupRemoved);
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:deleted', handleGroupDeleted);
    };
  }, [socket, isOpen, employeeData]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMessages(selectedGroup._id);
      if (socket) {
        socket.emit('group:join', { groupId: selectedGroup._id });
      }
    }
    return () => {
      if (selectedGroup && socket) {
        socket.emit('group:leave', { groupId: selectedGroup._id });
      }
    };
  }, [selectedGroup, socket]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await employeeAPI.getGroupChats();
      const groupsList = res.data?.data || res.data?.groups || (Array.isArray(res.data) ? res.data : []);
      setGroups(Array.isArray(groupsList) ? groupsList : []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load group chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await employeeAPI.getEmployees();
      const rawList = res.data?.data?.employees || res.data?.employees || (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
      const currentEmpId = employeeData?.id || employeeData?._id;
      const users = (Array.isArray(rawList) ? rawList : []).map(emp => {
        const u = emp.user || emp;
        return {
          _id: u._id || emp._id,
          name: u.name || emp.fullName || (emp.personalInfo ? `${emp.personalInfo.firstName || ''} ${emp.personalInfo.lastName || ''}`.trim() : 'Unknown'),
          email: u.email || emp.email,
          profileImage: u.profileImage || emp.profileImage,
          department: emp.workInfo?.department?.name || emp.department || '',
          position: emp.workInfo?.position || emp.position || ''
        };
      }).filter(u => u._id && u._id !== currentEmpId);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGroupMessages = async (groupId) => {
    try {
      setLoadingMessages(true);
      const res = await employeeAPI.getGroupMessages(groupId);
      const messagesList = res.data?.data || res.data?.messages || (Array.isArray(res.data) ? res.data : []);
      setGroupMessages(Array.isArray(messagesList) ? messagesList : []);
    } catch (error) {
      console.error('Error fetching group messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    const messageText = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentUserId = employeeData?.id || employeeData?._id || localStorage.getItem('userId');
    const currentUserName = employeeData?.name || localStorage.getItem('userName') || 'You';

    const optimisticMessage = {
      _id: tempId,
      clientMessageId: tempId,
      groupId: selectedGroup._id,
      sender: {
        _id: currentUserId,
        name: currentUserName
      },
      text: messageText,
      timestamp: new Date().toISOString(),
      pending: true
    };

    setGroupMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    if (socket) {
      socket.emit('group:typing:stop', { 
        groupId: selectedGroup._id, 
        userId: currentUserId 
      });
    }

    try {
      if (socket && socket.connected) {
        socket.emit('group:message', {
          groupId: selectedGroup._id,
          text: messageText,
          clientMessageId: tempId
        });
      } else {
        const res = await employeeAPI.sendGroupMessage(selectedGroup._id, {
          text: messageText,
          clientMessageId: tempId
        });
        const savedMsg = res.data?.data || res.data;
        if (savedMsg) {
          setGroupMessages(prev => prev.map(m => (m.clientMessageId === tempId || m._id === tempId) ? { ...savedMsg, self: true } : m));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setGroupMessages(prev => prev.filter(m => m._id !== tempId && m.clientMessageId !== tempId));
      setNewMessage(messageText);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedGroup) return;

    socket.emit('group:typing:start', {
      groupId: selectedGroup._id,
      userId: employeeData?.id,
      userName: employeeData?.name
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('group:typing:stop', {
        groupId: selectedGroup._id,
        userId: employeeData?.id
      });
    }, 2000);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const res = await employeeAPI.createGroupChat({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        members: selectedMembers
      });

      const createdGroup = res.data?.data || res.data?.group;
      if (createdGroup) {
        setGroups(prev => [createdGroup, ...prev]);
        setSelectedGroup(createdGroup);
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMembers([]);
        toast.success('Group created successfully');

        if (socket) {
          socket.emit('group:create', { group: createdGroup });
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0 || !selectedGroup) return;

    try {
      const res = await employeeAPI.addGroupMembers(selectedGroup._id, {
        memberIds: selectedMembers
      });

      const updatedGroup = res.data?.data || res.data?.group;
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
        setShowAddMembers(false);
        setSelectedMembers([]);
        toast.success('Members added successfully');

        if (socket) {
          socket.emit('group:members:added', {
            groupId: selectedGroup._id,
            members: selectedMembers
          });
        }
      }
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error(error.response?.data?.message || 'Failed to add members');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedGroup) return;

    try {
      const res = await employeeAPI.removeGroupMember(selectedGroup._id, memberId);
      const updatedGroup = res.data?.data || res.data?.group;
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
        toast.success('Member removed');

        if (socket) {
          socket.emit('group:members:removed', {
            groupId: selectedGroup._id,
            memberId
          });
        }
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId, role) => {
    if (!selectedGroup) return;

    try {
      const res = await employeeAPI.updateGroupMemberRole(selectedGroup._id, memberId, { role });
      const updatedGroup = res.data?.data || res.data?.group;
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
        toast.success('Role updated');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await employeeAPI.leaveGroupChat(selectedGroup._id);
      setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
      setSelectedGroup(null);
      setGroupMessages([]);
      setShowGroupSettings(false);
      toast.success('Left the group');

      if (socket) {
        socket.emit('group:leave:notify', {
          groupId: selectedGroup._id,
          userId: employeeData?.id
        });
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    try {
      await employeeAPI.deleteGroupChat(selectedGroup._id);
      setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
      setSelectedGroup(null);
      setGroupMessages([]);
      setShowGroupSettings(false);
      toast.success('Group deleted');

      if (socket) {
        socket.emit('group:delete:notify', { groupId: selectedGroup._id });
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!selectedGroup) return;
    if (!editGroupName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }

    try {
      setSavingInfo(true);
      const res = await employeeAPI.updateGroup(selectedGroup._id, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim()
      });

      const updated = res.data?.data || res.data?.group;
      if (updated) {
        setSelectedGroup(updated);
        setGroups(prev => prev.map(g => g._id === updated._id ? updated : g));
        setIsEditingInfo(false);
        toast.success('Group updated successfully');

        if (socket) {
          socket.emit('group:update', { group: updated });
        }
      }
    } catch (error) {
      console.error('Error updating group info:', error);
      toast.error(error.response?.data?.message || 'Failed to update group information');
    } finally {
      setSavingInfo(false);
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getMemberRole = (group, userId) => {
    const member = group?.members?.find(m => (m.user?._id || m.user) === userId);
    return member?.role || 'member';
  };

  const isGroupOwner = selectedGroup?.owner?._id === employeeData?.id || selectedGroup?.owner === employeeData?.id;
  const isGroupAdmin = isGroupOwner || getMemberRole(selectedGroup, employeeData?.id) === 'admin';
  const canEditGroupInfo = isGroupAdmin || !selectedGroup?.settings?.onlyAdminsCanEditInfo;

  const getTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names.length} people are typing...`;
  };

  const filteredGroups = groups.filter(g => {
    if (!groupSearchQuery.trim()) return true;
    const q = groupSearchQuery.toLowerCase().trim();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] min-h-[580px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-enter">
      {/* Top Header Bar */}
      <header className="h-12 sm:h-14 px-2.5 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all text-xs sm:text-sm font-medium shadow-2xs shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden text-[11px]">Back</span>
          </button>
          <div className="h-4 sm:h-5 w-px bg-slate-200 mx-0.5 hidden sm:block shrink-0" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                <span className="hidden sm:inline whitespace-nowrap">Group Chat</span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {groups.length} Channels
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all shrink-0"
            title="Create new group"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Group</span>
            <span className="sm:hidden text-[11px]">New</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
            title="Close Group Chat"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Group Directory */}
        <aside className={`w-full md:w-64 lg:w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 ${selectedGroup ? 'hidden md:flex' : 'flex'}`}>
          {/* Search Box */}
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Search groups..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Group Count Subheader */}
          <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Groups ({filteredGroups.length})</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[11px] font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>

          {/* Group Channels List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                <span className="text-xs">Loading groups...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <p className="font-medium text-slate-700">No groups found</p>
                <p className="text-xs mt-1 text-slate-500">
                  {groupSearchQuery ? 'Try another search query' : 'Create your first team channel'}
                </p>
                {!groupSearchQuery && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Group
                  </button>
                )}
              </div>
            ) : (
              filteredGroups.map(group => {
                const onlineCount = group.members?.filter(m => 
                  onlineUsers.has(m.user?._id || m.user)
                ).length || 0;
                const isSelected = selectedGroup?._id === group._id;

                return (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowGroupSettings(false);
                    }}
                    className={`w-full text-left p-3 flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-blue-600 chat-group-selected'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold truncate group-name ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-900'}`}>
                          {group.name}
                        </span>
                        {onlineCount > 0 && (
                          <span className="text-[10px] font-medium text-emerald-600 shrink-0 ml-1">
                            {onlineCount} online
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {group.lastMessage?.text || `${group.members?.length || 0} members`}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Panel - Active Chat / Group Settings / Empty State */}
        <main className={`flex-1 flex flex-col bg-[#f8fafc] overflow-hidden ${!selectedGroup ? 'hidden md:flex' : 'flex'}`}>
          {selectedGroup ? (
            showGroupSettings ? (
              /* Settings View */
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="h-14 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowGroupSettings(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      title="Back to conversation"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">Group Settings</h3>
                      <p className="text-[11px] text-slate-500">{selectedGroup.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
                  {/* Group Info / Edit Card */}
                  <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl transition-all">
                    {!isEditingInfo ? (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-bold text-slate-900 mb-1 truncate">{selectedGroup.name}</h4>
                            <p className="text-xs sm:text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                              {selectedGroup.description || 'No description provided.'}
                            </p>
                          </div>
                          {canEditGroupInfo && (
                            <button
                              onClick={() => {
                                setEditGroupName(selectedGroup.name || '');
                                setEditGroupDescription(selectedGroup.description || '');
                                setIsEditingInfo(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-xl transition-all border border-slate-200 shadow-2xs shrink-0"
                              title="Edit group name & description"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit Info
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5 animate-enter">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Edit Group Details</h5>
                          <span className="text-[11px] text-slate-400">Name & Description</span>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Group Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            placeholder="Enter group name..."
                            maxLength={100}
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={editGroupDescription}
                            onChange={(e) => setEditGroupDescription(e.target.value)}
                            placeholder="Add group description / purpose..."
                            maxLength={500}
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed [scrollbar-width:thin]"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingInfo(false);
                              setEditGroupName(selectedGroup.name || '');
                              setEditGroupDescription(selectedGroup.description || '');
                            }}
                            disabled={savingInfo}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateGroupInfo}
                            disabled={savingInfo || !editGroupName.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all disabled:opacity-50"
                          >
                            {savingInfo ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Group Members</h4>
                        <p className="text-xs text-slate-500">{selectedGroup.members?.length || 0} participants</p>
                      </div>
                      {isGroupAdmin && (
                        <button 
                          onClick={() => setShowAddMembers(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200/80"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add Member
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedGroup.members?.map(member => {
                        const memberId = member.user?._id || member.user;
                        const memberName = member.user?.name || 'Unknown';
                        const isOnline = onlineUsers.has(memberId);
                        const isSelf = memberId === employeeData?.id;

                        return (
                          <div key={memberId} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200 transition-all">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="text-slate-900 text-xs sm:text-sm font-medium truncate">{memberName}</span>
                              {member.role === 'owner' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                  <Crown className="w-3 h-3 text-amber-500" /> Owner
                                </span>
                              )}
                              {member.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                  <Shield className="w-3 h-3 text-blue-600" /> Admin
                                </span>
                              )}
                              {isSelf && <span className="text-[11px] text-slate-400 font-normal">(You)</span>}
                            </div>
                            {isGroupOwner && !isSelf && member.role !== 'owner' && (
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(memberId, e.target.value)}
                                  className="text-xs bg-slate-50 text-slate-700 rounded-lg px-2 py-1 border border-slate-200 focus:outline-none"
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(memberId)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-all"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleLeaveGroup}
                      className="flex-1 py-2.5 px-4 bg-white border border-rose-300 text-rose-600 rounded-xl hover:bg-rose-50 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Leave Group
                    </button>
                    {isGroupOwner && (
                      <button
                        onClick={handleDeleteGroup}
                        className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Group
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Chat View */
              <>
                {/* Group Active Header */}
                <div className="h-11 sm:h-14 px-3 sm:px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg shrink-0"
                      title="Back to group list"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-base font-bold text-slate-900 leading-tight truncate">
                        {selectedGroup.name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 truncate">
                        <span className="truncate">{selectedGroup.members?.length || 0} members</span>
                        {getTypingText() && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium animate-pulse">{getTypingText()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowGroupSettings(true)}
                    className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all shrink-0"
                    title="Group Settings"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p className="text-sm">Loading group messages…</p>
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <div className="w-14 h-14 mb-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                        <Users className="w-7 h-7 text-blue-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No messages in this group yet</p>
                      <p className="text-xs text-slate-500 mt-1">Start the conversation with your team!</p>
                    </div>
                  ) : (
                    groupMessages.map((msg, idx) => {
                      const currentUserId = String(employeeData?.id || employeeData?._id || localStorage.getItem('userId') || '');
                      const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender || '');
                      const isSelf = Boolean(msg.self) || (Boolean(senderId) && senderId === currentUserId);
                      return (
                        <div key={msg._id || `msg-${idx}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-enter`}>
                          <div className={`max-w-[85%] sm:max-w-md lg:max-w-xl p-3 sm:p-3.5 rounded-2xl shadow-xs ${
                            isSelf 
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-br-xs' 
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                          } ${msg.pending ? 'opacity-70' : ''}`}>
                            {!isSelf && (
                              <div className="text-xs font-semibold text-blue-600 mb-1">
                                {msg.sender?.name || 'Colleague'}
                              </div>
                            )}
                            <div className="text-xs sm:text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                            <div className={`text-[10px] mt-1 text-right ${isSelf ? 'text-blue-100/90' : 'text-slate-400'}`}>
                              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2 max-w-5xl mx-auto">
                    <textarea
                      rows={1}
                      value={newMessage}
                      onChange={(e) => {
                        handleTyping(e);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                          e.target.style.height = 'auto';
                        }
                      }}
                      placeholder={`Message ${selectedGroup.name}...`}
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none max-h-32 min-h-[38px] leading-relaxed [scrollbar-width:thin]"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="h-[38px] px-4 sm:px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow transition-all flex items-center justify-center shrink-0"
                    >
                      <span className="hidden sm:inline mr-1.5 text-xs font-semibold">Send</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-base font-bold text-slate-800">Select a group channel</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm text-center">
                Choose a group channel from the left sidebar to start chatting, or create a brand new team space.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all"
              >
                <Plus className="w-4 h-4" /> Create New Group
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Create Group Sub-Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-[100001] bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 animate-enter">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Group Channel</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Group Name *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Marketing Team, Design Review"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What is this channel for?"
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Add Members</label>
                  {selectedMembers.length > 0 && (
                    <span className="text-[11px] font-semibold text-blue-600">{selectedMembers.length} selected</span>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-2 divide-y divide-slate-100">
                  {availableUsers.map(user => {
                    const isSelected = selectedMembers.includes(user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleMemberSelection(user._id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-800'}`}>
                          {user.name}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow disabled:opacity-40 disabled:hover:shadow-none transition-all"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Sub-Modal */}
      {showAddMembers && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddMembers(false)} />
          <div className="relative z-[100001] bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 animate-enter">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Add Members</h3>
            <p className="text-xs text-slate-500 mb-4">Select colleagues to add to {selectedGroup?.name}</p>
            
            <div className="max-h-60 overflow-y-auto space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-2">
              {availableUsers
                .filter(user => !selectedGroup?.members?.some(m => (m.user?._id || m.user) === user._id))
                .map(user => {
                  const isSelected = selectedMembers.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleMemberSelection(user._id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-800'}`}>
                        {user.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedMembers([]);
                }}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedMembers.length === 0}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow disabled:opacity-40 disabled:hover:shadow-none transition-all"
              >
                Add Selected ({selectedMembers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatModal;
