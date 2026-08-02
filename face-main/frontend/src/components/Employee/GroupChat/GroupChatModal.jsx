import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Users, Plus, Settings, LogOut, Crown, Shield, UserPlus, Trash2, MoreVertical, ArrowLeft, Check, Loader2 } from 'lucide-react';
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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      fetchAvailableUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleGroupMessage = (message) => {
      if (message.groupId === selectedGroup?._id) {
        setGroupMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
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
    };

    const handleTypingStart = ({ groupId, userId, userName }) => {
      if (groupId === selectedGroup?._id && userId !== employeeData?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      }
    };

    const handleTypingStop = ({ groupId, userId }) => {
      if (groupId === selectedGroup?._id) {
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
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
        setGroupMessages([]);
        toast.info('You were removed from the group');
      }
    };

    socket.on('group:message', handleGroupMessage);
    socket.on('group:typing:start', handleTypingStart);
    socket.on('group:typing:stop', handleTypingStop);
    socket.on('group:added', handleGroupAdded);
    socket.on('group:removed', handleGroupRemoved);

    return () => {
      socket.off('group:message', handleGroupMessage);
      socket.off('group:typing:start', handleTypingStart);
      socket.off('group:typing:stop', handleTypingStop);
      socket.off('group:added', handleGroupAdded);
      socket.off('group:removed', handleGroupRemoved);
    };
  }, [socket, selectedGroup, employeeData]);

  useEffect(() => {
    if (selectedGroup && socket) {
      socket.emit('group:join', { groupId: selectedGroup._id });
      fetchGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, socket]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.get('/groups');
      if (response.data.success) {
        setGroups(response.data.data);
        // Auto-select the first group so history and realtime events are visible immediately
        if (!selectedGroup && response.data.data.length > 0) {
          setSelectedGroup(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMessages = async (groupId) => {
    try {
      setLoadingMessages(true);
      const response = await employeeAPI.get(`/groups/${groupId}/messages`);
      if (response.data.success) {
        setGroupMessages(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch group messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await employeeAPI.get('/messages/chat-users');
      if (response.data.success) {
        setAvailableUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      _id: clientMessageId,
      clientMessageId,
      groupId: selectedGroup._id,
      sender: {
        _id: employeeData.id,
        name: `${employeeData.personalInfo?.firstName} ${employeeData.personalInfo?.lastName}`,
        profileImage: null
      },
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      pending: true
    };

    setGroupMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    if (socket?.connected) {
      socket.emit('group:message', {
        groupId: selectedGroup._id,
        text: newMessage.trim(),
        clientMessageId
      });
    } else {
      try {
        const response = await employeeAPI.post(`/groups/${selectedGroup._id}/messages`, { text: newMessage.trim() });
        if (response.data.success) {
          setGroupMessages(prev => prev.map(m => 
            m.clientMessageId === clientMessageId ? response.data.data : m
          ));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        setGroupMessages(prev => prev.filter(m => m.clientMessageId !== clientMessageId));
        toast.error('Failed to send message');
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket?.connected && selectedGroup) {
      socket.emit('group:typing:start', { groupId: selectedGroup._id });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('group:typing:stop', { groupId: selectedGroup._id });
      }, 2000);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const response = await employeeAPI.post('/groups', {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        memberIds: selectedMembers
      });

      if (response.data.success) {
        toast.success('Group created successfully');
        setGroups(prev => [response.data.data, ...prev]);
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMembers([]);
        setSelectedGroup(response.data.data);

        if (socket && selectedMembers.length > 0) {
          socket.emit('group:member:added', {
            groupId: response.data.data._id,
            memberIds: selectedMembers
          });
        }
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0 || !selectedGroup) return;

    try {
      const response = await employeeAPI.post(`/groups/${selectedGroup._id}/members`, {
        memberIds: selectedMembers
      });

      if (response.data.success) {
        toast.success('Members added successfully');
        setSelectedGroup(response.data.data);
        setShowAddMembers(false);
        setSelectedMembers([]);

        if (socket) {
          socket.emit('group:member:added', {
            groupId: selectedGroup._id,
            memberIds: selectedMembers
          });
        }
      }
    } catch (error) {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedGroup) return;

    try {
      const response = await employeeAPI.delete(`/groups/${selectedGroup._id}/members/${memberId}`);
      if (response.data.success) {
        toast.success('Member removed');
        setSelectedGroup(response.data.data);

        if (socket) {
          socket.emit('group:member:removed', {
            groupId: selectedGroup._id,
            memberId
          });
        }
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await employeeAPI.post(`/groups/${selectedGroup._id}/leave`);
      if (response.data.success) {
        toast.success('You left the group');
        setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
        setSelectedGroup(null);
        setGroupMessages([]);
        setShowGroupSettings(false);
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    try {
      const response = await employeeAPI.delete(`/groups/${selectedGroup._id}`);
      if (response.data.success) {
        toast.success('Group deleted');
        setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
        setSelectedGroup(null);
        setGroupMessages([]);
        setShowGroupSettings(false);
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleUpdateMemberRole = async (memberId, role) => {
    if (!selectedGroup) return;

    try {
      const response = await employeeAPI.put(`/groups/${selectedGroup._id}/members/${memberId}/role`, { role });
      if (response.data.success) {
        toast.success('Member role updated');
        setSelectedGroup(response.data.data);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
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

  const getTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names.length} people are typing...`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[99998]" onClick={onClose} />
      <div className="relative z-[99999] bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Group Chats
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              title="Create new group"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
            <div className="p-3 text-sm text-slate-500 font-medium">
              My Groups ({groups.length})
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-medium">No groups yet</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 text-blue-600 hover:text-blue-700 hover:underline text-xs"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              groups.map(group => {
                const onlineCount = group.members?.filter(m => 
                  onlineUsers.has(m.user?._id || m.user)
                ).length || 0;
                return (
                  <div
                    key={group._id}
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowGroupSettings(false);
                    }}
                    className={`p-3 border-l-4 cursor-pointer transition-all duration-200 ${
                      selectedGroup?._id === group._id
                        ? 'border-blue-600 bg-blue-50 text-slate-900'
                        : 'border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <span>{group.members?.length || 0} members</span>
                          {onlineCount > 0 && <span className="text-green-600">• {onlineCount} online</span>}
                        </div>
                        {group.lastMessage?.text && (
                          <div className="text-xs text-slate-400 truncate mt-1">
                            {group.lastMessage.text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-1 flex flex-col">
            {selectedGroup ? (
              showGroupSettings ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                      onClick={() => setShowGroupSettings(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-bold text-slate-900">Group Settings</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="text-slate-900 font-medium mb-2">{selectedGroup.name}</h4>
                      <p className="text-slate-500 text-sm">{selectedGroup.description || 'No description'}</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-slate-900 font-medium">Members ({selectedGroup.members?.length})</h4>
                        {isGroupAdmin && (
                          <button 
                            onClick={() => setShowAddMembers(true)}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            <UserPlus className="w-4 h-4" /> Add
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedGroup.members?.map(member => {
                          const memberId = member.user?._id || member.user;
                          const memberName = member.user?.name || 'Unknown';
                          const isOnline = onlineUsers.has(memberId);
                          const isSelf = memberId === employeeData?.id;

                          return (
                            <div key={memberId} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                                <span className="text-slate-900 text-sm">{memberName}</span>
                                {member.role === 'owner' && (
                                  <Crown className="w-4 h-4 text-amber-500" title="Owner" />
                                )}
                                {member.role === 'admin' && (
                                  <Shield className="w-4 h-4 text-blue-600" title="Admin" />
                                )}
                                {isSelf && <span className="text-xs text-slate-400">(You)</span>}
                              </div>
                              {isGroupOwner && !isSelf && member.role !== 'owner' && (
                                <div className="flex items-center gap-1">
                                  <select
                                    value={member.role}
                                    onChange={(e) => handleUpdateMemberRole(memberId, e.target.value)}
                                    className="text-xs bg-white text-slate-700 rounded-lg px-2 py-1 border border-slate-300"
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <button
                                    onClick={() => handleRemoveMember(memberId)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all duration-200"
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

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleLeaveGroup}
                        className="w-full py-2 px-4 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Leave Group
                      </button>
                      {isGroupOwner && (
                        <button
                          onClick={handleDeleteGroup}
                          className="w-full py-2 px-4 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Group
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{selectedGroup.name}</div>
                      <div className="text-sm text-slate-500">
                        {selectedGroup.members?.length} members
                        {getTypingText() && (
                          <span className="ml-2 text-blue-600 animate-pulse">{getTypingText()}</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowGroupSettings(true)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all duration-200"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    ) : groupMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <div className="w-16 h-16 mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      groupMessages.map((msg, idx) => {
                        const isSelf = (msg.sender?._id || msg.sender) === employeeData?.id;
                        return (
                          <div key={msg._id || `msg-${idx}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                              isSelf 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                                : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                            } ${msg.pending ? 'opacity-70' : ''}`}>
                              {!isSelf && (
                                <div className="text-xs text-slate-500 mb-1 font-medium">
                                  {msg.sender?.name || 'Unknown'}
                                </div>
                              )}
                              <div className="text-sm break-words">{msg.text}</div>
                              <div className={`text-xs mt-1 ${isSelf ? 'text-blue-100' : 'text-slate-400'}`}>
                                {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-slate-200">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-l-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all duration-200"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-medium">Select a group to start chatting</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-[100001] bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Group Name *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter group description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-1 block">Add Members</label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  {availableUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => toggleMemberSelection(user._id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedMembers.includes(user._id)
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <span className="text-slate-900 text-sm">{user.name}</span>
                      {selectedMembers.includes(user._id) && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
                {selectedMembers.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{selectedMembers.length} member(s) selected</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:shadow-sm transition-all duration-200"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMembers && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowAddMembers(false)} />
          <div className="relative z-[100001] bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Members</h3>
            
            <div className="max-h-60 overflow-y-auto space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-2">
              {availableUsers
                .filter(user => !selectedGroup?.members?.some(m => (m.user?._id || m.user) === user._id))
                .map(user => (
                  <div
                    key={user._id}
                    onClick={() => toggleMemberSelection(user._id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedMembers.includes(user._id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <span className="text-slate-900 text-sm">{user.name}</span>
                    {selectedMembers.includes(user._id) && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                ))}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedMembers([]);
                }}
                className="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedMembers.length === 0}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:shadow-sm transition-all duration-200"
              >
                Add Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatModal;