import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Employee from '../models/Employee.js';
import SalesPipeline from '../models/SalesPipeline.js';

const STAGE_ORDER = ['client_details', 'quotation', 'admin_approval', 'sent_to_client', 'negotiation', 'won_closed'];
const EMPLOYEE_EDITABLE_SECTIONS = ['clientDetails', 'quotation', 'sentToClient', 'negotiation', 'outcome'];

const populatePipeline = (query) => query
  .populate('lead', 'leadId firstName lastName email phone company position estimatedValue status assignedTo')
  .populate('approval.submittedBy', 'name email')
  .populate('approval.approvedBy', 'name email')
  .populate('approval.history.actedBy', 'name email')
  .populate('stageHistory.changedBy', 'name email');

const getEmployeeForUser = async (userId) => Employee.findOne({ user: userId });

const assertLeadAccess = async (lead, user) => {
  if (!lead) {
    const error = new Error('Lead not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'admin') return;

  const employee = await getEmployeeForUser(user.id);
  if (!employee || lead.assignedTo.toString() !== employee._id.toString()) {
    const error = new Error('Access denied. You can only access pipelines for your assigned leads.');
    error.statusCode = 403;
    throw error;
  }
};

const getOrCreatePipeline = async (lead, userId) => {
  let pipeline = await SalesPipeline.findOne({ lead: lead._id });
  if (!pipeline) {
    pipeline = await SalesPipeline.create({
      lead: lead._id,
      currentStage: 'client_details',
      stageHistory: [{
        fromStage: null,
        toStage: 'client_details',
        action: 'created',
        changedBy: userId,
        comments: 'Pipeline created on first access'
      }]
    });
  }
  return pipeline;
};

const appendStageHistory = (pipeline, toStage, userId, comments, action = 'stage_change') => {
  if (pipeline.currentStage !== toStage) {
    pipeline.stageHistory.push({
      fromStage: pipeline.currentStage,
      toStage,
      action,
      changedBy: userId,
      comments
    });
    pipeline.currentStage = toStage;
  }
};

const assertStageTransition = (pipeline, toStage) => {
  if (!STAGE_ORDER.includes(toStage)) {
    const error = new Error('Invalid pipeline stage');
    error.statusCode = 400;
    throw error;
  }

  if (toStage === 'sent_to_client' && pipeline.approval.status !== 'approved') {
    const error = new Error('Quotation must be approved by admin before it can be sent to client.');
    error.statusCode = 400;
    throw error;
  }

  if (toStage === 'negotiation' && !pipeline.sentToClient?.sentAt) {
    const error = new Error('Quotation must be sent to client before negotiation can start.');
    error.statusCode = 400;
    throw error;
  }

  if (toStage === 'won_closed' && !pipeline.negotiation?.enteredAt) {
    const error = new Error('Negotiation must be entered before closing the deal.');
    error.statusCode = 400;
    throw error;
  }
};

export const getPipelineByLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    await assertLeadAccess(lead, req.user);

    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updatePipelineSection = async (req, res) => {
  try {
    const { leadId, section } = req.params;
    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);

    if (req.user.role !== 'admin' && !EMPLOYEE_EDITABLE_SECTIONS.includes(section)) {
      return res.status(403).json({ success: false, message: 'This section cannot be edited by employees.' });
    }

    if (section === 'approval') {
      return res.status(403).json({ success: false, message: 'Use the approval endpoint for admin approval actions.' });
    }

    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    const payload = { ...req.body };

    if (section === 'quotation' && payload.amount !== undefined) {
      payload.amount = Number(payload.amount) || 0;
    }
    if (section === 'quotation' && payload.validUntil) {
      payload.validUntil = new Date(payload.validUntil);
    }
    if (section === 'sentToClient' && payload.sentAt) {
      payload.sentAt = new Date(payload.sentAt);
    }
    if (section === 'negotiation') {
      if (payload.expectedCloseDate) payload.expectedCloseDate = new Date(payload.expectedCloseDate);
      payload.lastNegotiationAt = new Date();
      payload.enteredAt = pipeline.negotiation?.enteredAt || new Date();
    }
    if (section === 'outcome') {
      if (payload.finalValue !== undefined) payload.finalValue = Number(payload.finalValue) || 0;
      if (payload.status && ['won', 'lost'].includes(payload.status)) {
        payload.closedAt = payload.closedAt ? new Date(payload.closedAt) : new Date();
      }
    }

    pipeline[section] = {
      ...(pipeline[section]?.toObject ? pipeline[section].toObject() : pipeline[section]),
      ...payload,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (section === 'quotation') appendStageHistory(pipeline, 'quotation', req.user.id, 'Quotation details updated');
    if (section === 'sentToClient' && pipeline.sentToClient?.sentAt) {
      assertStageTransition(pipeline, 'sent_to_client');
      appendStageHistory(pipeline, 'sent_to_client', req.user.id, 'Quotation sent to client');
    }
    if (section === 'negotiation') {
      assertStageTransition(pipeline, 'negotiation');
      appendStageHistory(pipeline, 'negotiation', req.user.id, 'Negotiation updated');
    }
    if (section === 'outcome' && ['won', 'lost'].includes(pipeline.outcome?.status)) {
      assertStageTransition(pipeline, 'won_closed');
      appendStageHistory(pipeline, 'won_closed', req.user.id, `Deal marked ${pipeline.outcome.status}`);
    }

    await pipeline.save();
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const transitionPipelineStage = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stage, comments } = req.body;
    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);

    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    assertStageTransition(pipeline, stage);

    if (stage === 'admin_approval') {
      pipeline.approval.status = 'pending';
      pipeline.approval.submittedAt = new Date();
      pipeline.approval.submittedBy = req.user.id;
      pipeline.approval.history.push({
        status: 'pending',
        comments: comments || 'Submitted for admin approval',
        actedBy: req.user.id
      });
    }

    if (stage === 'negotiation') {
      pipeline.negotiation.enteredAt = pipeline.negotiation.enteredAt || new Date();
      pipeline.negotiation.lastNegotiationAt = new Date();
    }

    appendStageHistory(pipeline, stage, req.user.id, comments);
    await pipeline.save();

    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updatePipelineApproval = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can update approval.' });
    }

    const { leadId } = req.params;
    const { status, comments } = req.body;
    if (!['approved', 'rejected', 'revision_requested'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status.' });
    }

    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);
    const pipeline = await getOrCreatePipeline(lead, req.user.id);

    pipeline.approval.status = status;
    pipeline.approval.comments = comments || '';
    pipeline.approval.approvedAt = status === 'approved' ? new Date() : undefined;
    pipeline.approval.approvedBy = status === 'approved' ? req.user.id : undefined;
    pipeline.approval.history.push({
      status,
      comments,
      actedBy: req.user.id
    });

    if (status === 'approved') {
      appendStageHistory(pipeline, 'admin_approval', req.user.id, 'Quotation approved by admin', 'approval');
    }

    await pipeline.save();
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const pipelines = await populatePipeline(
      SalesPipeline.find({ 'approval.status': 'pending' }).sort({ 'approval.submittedAt': -1 })
    );

    res.json({ success: true, data: pipelines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPipelines = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const pipelines = await populatePipeline(
      SalesPipeline.find({}).sort({ updatedAt: -1 })
    );

    res.json({ success: true, data: pipelines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
