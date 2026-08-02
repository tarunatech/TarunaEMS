import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/User.js';

export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const ownerId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const members = [{
      user: ownerId,
      role: 'owner',
      joinedAt: new Date(),
      addedBy: ownerId
    }];

    if (memberIds && Array.isArray(memberIds)) {
      const validMembers = await User.find({ 
        _id: { $in: memberIds, $ne: ownerId },
        isActive: true 
      }).select('_id');
      
      validMembers.forEach(member => {
        members.push({
          user: member._id,
          role: 'member',
          joinedAt: new Date(),
          addedBy: ownerId
        });
      });
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      owner: ownerId,
      members
    });

    await group.save();
    await group.populate('members.user', 'name email profileImage');
    await group.populate('owner', 'name email profileImage');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Failed to create group' });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({
      'members.user': userId,
      isActive: true
    })
    .populate('owner', 'name email profileImage')
    .populate('members.user', 'name email profileImage')
    .populate('lastMessage.sender', 'name')
    .sort({ updatedAt: -1 });

    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Get my groups error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch groups' });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('owner', 'name email profileImage')
      .populate('members.user', 'name email profileImage')
      .populate('members.addedBy', 'name');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch group' });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, settings } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    if (!group.canEditInfo(userId)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this group' });
    }

    if (name && typeof name === 'string') {
      const trimmedName = name.trim();
      if (trimmedName.length > 0 && trimmedName.length <= 100) {
        group.name = trimmedName;
      }
    }
    if (description !== undefined && typeof description === 'string') {
      group.description = description.trim().substring(0, 500);
    }
    if (settings && group.isOwner(userId)) {
      const allowedSettings = ['onlyAdminsCanSend', 'onlyAdminsCanAddMembers', 'onlyAdminsCanEditInfo'];
      allowedSettings.forEach(key => {
        if (typeof settings[key] === 'boolean') {
          group.settings[key] = settings[key];
        }
      });
    }

    await group.save();
    await group.populate('owner', 'name email profileImage');
    await group.populate('members.user', 'name email profileImage');

    res.json({ success: true, message: 'Group updated', data: group });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Failed to update group' });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.canAddMembers(userId)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to add members' });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Member IDs are required' });
    }

    const existingMemberIds = group.members.map(m => m.user.toString());
    const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

    const validMembers = await User.find({
      _id: { $in: newMemberIds },
      isActive: true
    }).select('_id');

    const addedMembers = [];
    validMembers.forEach(member => {
      group.members.push({
        user: member._id,
        role: 'member',
        joinedAt: new Date(),
        addedBy: userId
      });
      addedMembers.push(member._id);
    });

    await group.save();
    await group.populate('members.user', 'name email profileImage');

    res.json({ 
      success: true, 
      message: `${addedMembers.length} member(s) added`,
      data: group 
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ success: false, message: 'Failed to add members' });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const memberToRemove = group.members.find(m => m.user.toString() === memberId);
    if (!memberToRemove) {
      return res.status(404).json({ success: false, message: 'Member not found in group' });
    }

    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove the group owner' });
    }

    const isRemovingSelf = userId === memberId;
    const isAdmin = group.isAdmin(userId);

    if (!isRemovingSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to remove members' });
    }

    group.members = group.members.filter(m => m.user.toString() !== memberId);
    await group.save();
    await group.populate('members.user', 'name email profileImage');

    res.json({ 
      success: true, 
      message: isRemovingSelf ? 'You left the group' : 'Member removed',
      data: group 
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    if (group.isOwner(userId)) {
      const admins = group.members.filter(m => m.role === 'admin' && m.user.toString() !== userId);
      if (admins.length > 0) {
        const newOwnerMember = admins[0];
        group.owner = newOwnerMember.user;
        newOwnerMember.role = 'owner';
      } else {
        const otherMembers = group.members.filter(m => m.user.toString() !== userId);
        if (otherMembers.length > 0) {
          const newOwnerMember = otherMembers[0];
          group.owner = newOwnerMember.user;
          newOwnerMember.role = 'owner';
        } else {
          group.isActive = false;
        }
      }
    }

    group.members = group.members.filter(m => m.user.toString() !== userId);
    await group.save();

    res.json({ success: true, message: 'You left the group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave group' });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isOwner(userId)) {
      return res.status(403).json({ success: false, message: 'Only the owner can change member roles' });
    }

    const member = group.members.find(m => m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot change owner role' });
    }

    member.role = role;
    await group.save();
    await group.populate('members.user', 'name email profileImage');

    res.json({ success: true, message: 'Member role updated', data: group });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isOwner(userId)) {
      return res.status(403).json({ success: false, message: 'Only the owner can delete the group' });
    }

    group.isActive = false;
    await group.save();

    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete group' });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const query = { group: groupId, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await GroupMessage.find(query)
      .populate('sender', 'name email profileImage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const sanitizedText = text.trim().substring(0, 5000);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    if (!group.canSendMessage(userId)) {
      return res.status(403).json({ success: false, message: 'You cannot send messages in this group' });
    }

    const message = new GroupMessage({
      group: groupId,
      sender: userId,
      text: sanitizedText
    });

    await message.save();
    await message.populate('sender', 'name email profileImage');

    group.lastMessage = {
      text: sanitizedText.substring(0, 100),
      sender: userId,
      timestamp: new Date()
    };
    await group.save();

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};
