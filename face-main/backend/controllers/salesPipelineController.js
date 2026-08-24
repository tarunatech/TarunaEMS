import Lead from '../models/Lead.js';
import Employee from '../models/Employee.js';
import SalesPipeline from '../models/SalesPipeline.js';
import { buildProposalDefaults, generateProposalContent, generateProposalSectionContent } from '../services/proposalAIService.js';
import { generateProposalPdf } from '../services/proposalPdfService.js';
import { extractProposalFromPdf as extractFromPdf } from '../services/proposalPdfExtractService.js';

const STAGE_ORDER = ['client_details', 'quotation', 'admin_approval', 'proposal', 'sent_to_client', 'negotiation', 'won_closed'];
const EMPLOYEE_EDITABLE_SECTIONS = ['clientDetails', 'quotation', 'proposal', 'sentToClient', 'negotiation', 'outcome'];

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

  if (toStage === 'sent_to_client' && pipeline.approval?.status !== 'approved') {
    const error = new Error('Quotation must be approved by admin before it can be sent to client.');
    error.statusCode = 400;
    throw error;
  }

  if (toStage === 'proposal' && pipeline.currentStage !== 'proposal' && pipeline.approval?.status !== 'approved') {
    const error = new Error('Admin approval must be approved before proposal can be prepared.');
    error.statusCode = 400;
    throw error;
  }

  if (toStage === 'sent_to_client') {
    const proposal = pipeline.proposal || {};
    const hasContent = proposal.sections && Object.values(proposal.sections).some((value) => Array.isArray(value) ? value.length : Boolean(value));
    if (!['generated', 'finalized'].includes(proposal.status) || !hasContent) {
      const error = new Error('Generate and save the proposal before sending it to client.');
      error.statusCode = 400;
      throw error;
    }
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
    if (section === 'proposal') {
      if (pipeline.currentStage !== 'proposal') {
        assertStageTransition(pipeline, 'proposal');
      }
      const current = pipeline.proposal?.toObject ? pipeline.proposal.toObject() : pipeline.proposal;
      const defaults = buildProposalDefaults({ lead, clientDetails: pipeline.clientDetails, quotation: pipeline.quotation, proposal: current });
      payload.pricing = { ...defaults.pricing, ...(payload.pricing || {}) };
      payload.validity = { ...defaults.validity, ...(payload.validity || {}) };
      payload.sections = { ...defaults.sections, ...(payload.sections || {}) };
      payload.sourceData = defaults.sourceData;
      payload.version = Number(current?.version || 0) + 1;
      payload.contentVersion = Number(current?.contentVersion || current?.version || 0) + 1;
      payload.status = payload.status || current?.status || 'draft';
      payload.lastEditedAt = new Date();
      payload.lastEditedBy = req.user.id;
      payload.versions = [
        ...(current?.versions || []),
        { version: payload.version, source: 'manual', content: payload.sections, createdAt: new Date(), createdBy: req.user.id }
      ].slice(-10);
    }

    pipeline[section] = {
      ...(pipeline[section]?.toObject ? pipeline[section].toObject() : pipeline[section]),
      ...payload,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (section === 'quotation') appendStageHistory(pipeline, 'quotation', req.user.id, 'Quotation details updated');
    if (section === 'proposal') appendStageHistory(pipeline, 'proposal', req.user.id, 'Proposal draft updated');
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

      const isWon = pipeline.outcome.status === 'won';
      if (isWon) {
        const finalVal = Number(pipeline.outcome.finalValue) || Number(pipeline.quotation?.totalAmount) || Number(lead.estimatedValue) || 0;
        await Lead.findByIdAndUpdate(lead._id, {
          status: 'Won',
          actualValue: finalVal,
          wonDetails: {
            finalValue: finalVal,
            wonDate: pipeline.outcome.closedAt || new Date(),
            notes: pipeline.outcome.notes || ''
          }
        });
      } else {
        await Lead.findByIdAndUpdate(lead._id, { status: 'Lost' });
      }
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

    if (stage === 'proposal') {
      pipeline.proposal = buildProposalDefaults({ lead, clientDetails: pipeline.clientDetails, quotation: pipeline.quotation, proposal: pipeline.proposal });
    }

    appendStageHistory(pipeline, stage, req.user.id, comments);
    await pipeline.save();

    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const savePipelineProposal = async (req, res) => {
  req.params.section = 'proposal';
  return updatePipelineSection(req, res);
};

export const generatePipelineProposal = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);
    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    if (pipeline.currentStage !== 'proposal') {
      assertStageTransition(pipeline, 'proposal');
    }

    const current = buildProposalDefaults({
      lead,
      clientDetails: pipeline.clientDetails,
      quotation: pipeline.quotation,
      proposal: { ...(pipeline.proposal || {}), ...(req.body || {}) }
    });
    const generation = await generateProposalContent({
      lead,
      clientDetails: pipeline.clientDetails,
      quotation: pipeline.quotation,
      proposalInputs: current,
      userInstructions: req.body?.aiInstructions || current.aiInstructions || ''
    });
    const generatedSections = generation.content;

    const nextVersion = Number(pipeline.proposal?.version || 0) + 1;
    pipeline.proposal = {
      ...current,
      sections: { ...current.sections, ...generatedSections },
      status: 'generated',
      version: nextVersion,
      contentVersion: Number(current.contentVersion || 0) + 1,
      generatedAt: new Date(),
      aiGeneratedAt: new Date(),
      aiModel: generation.meta?.aiModel || current.aiModel || '',
      aiProvider: generation.meta?.aiProvider || current.aiProvider || 'fallback',
      updatedAt: new Date(),
      generatedBy: req.user.id,
      versions: [
        ...(pipeline.proposal?.versions || []),
        { version: nextVersion, source: generation.meta?.usedFallback ? 'fallback' : 'ai', content: current.sections, createdAt: new Date(), createdBy: req.user.id }
      ].slice(-10)
    };
    appendStageHistory(pipeline, 'proposal', req.user.id, 'Proposal content generated');
    await pipeline.save();
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const generatePipelineProposalSection = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { section, instruction } = req.body;
    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);
    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    if (pipeline.currentStage !== 'proposal') {
      assertStageTransition(pipeline, 'proposal');
    }

    const current = buildProposalDefaults({
      lead,
      clientDetails: pipeline.clientDetails,
      quotation: pipeline.quotation,
      proposal: pipeline.proposal || {}
    });
    const generation = await generateProposalSectionContent({
      lead,
      clientDetails: pipeline.clientDetails,
      quotation: pipeline.quotation,
      proposalInputs: current,
      userInstructions: instruction || current.aiInstructions || ''
    }, section);
    const nextVersion = Number(current.version || 0) + 1;
    pipeline.proposal = {
      ...current,
      sections: { ...current.sections, ...generation.content },
      status: 'generated',
      version: nextVersion,
      contentVersion: Number(current.contentVersion || 0) + 1,
      aiGeneratedAt: new Date(),
      aiModel: generation.meta?.aiModel || current.aiModel || '',
      aiProvider: generation.meta?.aiProvider || current.aiProvider || 'fallback',
      updatedAt: new Date(),
      versions: [
        ...(current.versions || []),
        { version: nextVersion, source: generation.meta?.usedFallback ? 'fallback-section' : 'ai-section', section, content: current.sections, createdAt: new Date(), createdBy: req.user.id }
      ].slice(-10)
    };
    appendStageHistory(pipeline, 'proposal', req.user.id, `Proposal section improved: ${section}`);
    await pipeline.save();
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const generatePipelineProposalPdf = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    await assertLeadAccess(lead, req.user);
    const pipeline = await getOrCreatePipeline(lead, req.user.id);
    if (pipeline.currentStage !== 'proposal') {
      assertStageTransition(pipeline, 'proposal');
    }
    const proposal = buildProposalDefaults({
      lead,
      clientDetails: pipeline.clientDetails,
      quotation: pipeline.quotation,
      proposal: { ...(pipeline.proposal || {}), ...(req.body || {}) }
    });
    const hasSectionContent = proposal.sections && Object.values(proposal.sections).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim()));
    const hasBasicContent = Boolean(proposal.companyName || proposal.customerName || proposal.proposalType || proposal.title);
    const hasContent = hasSectionContent || hasBasicContent;
    if (!hasContent) return res.status(400).json({ success: false, message: 'Add or generate proposal content before creating PDF.' });

    const pdfUrl = await generateProposalPdf({ proposal });
    pipeline.proposal = {
      ...proposal,
      pdfUrl,
      status: proposal.status === 'draft' ? 'generated' : proposal.status,
      updatedAt: new Date(),
      version: Number(proposal.version || 0) + 1
    };
    pipeline.sentToClient = {
      ...(pipeline.sentToClient?.toObject ? pipeline.sentToClient.toObject() : pipeline.sentToClient),
      fileUrl: pipeline.sentToClient?.fileUrl || pdfUrl
    };
    await pipeline.save();
    const populated = await populatePipeline(SalesPipeline.findById(pipeline._id));
    res.json({ success: true, data: populated, pdfUrl });
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
    if (req.user.role === 'employee') {
      const employee = await getEmployeeForUser(req.user.id);
      if (!employee) {
        return res.json({ success: true, data: [] });
      }
      const assignedLeads = await Lead.find({ assignedTo: employee._id });
      const leadIdSet = new Set((assignedLeads || []).map(l => String(l._id)));

      // Fetch all pipelines and filter in JS since SalesPipeline model
      // doesn't support MongoDB-style $in queries (uses Drizzle ORM)
      const allPipelines = await populatePipeline(
        SalesPipeline.find({}).sort({ updatedAt: -1 })
      );
      const pipelines = allPipelines.filter(p => {
        const leadId = p.lead ? String(p.lead._id || p.lead.id || p.lead) : null;
        return leadId && leadIdSet.has(leadId);
      });

      return res.json({ success: true, data: pipelines });
    }

    const pipelines = await populatePipeline(
      SalesPipeline.find({}).sort({ updatedAt: -1 })
    );

    res.json({ success: true, data: pipelines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const extractProposalFromPdf = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId });
    await assertLeadAccess(lead, req.user);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Uploaded file must be a PDF.' });
    }

    const extracted = await extractFromPdf(req.file.buffer);
    res.json({ success: true, data: extracted });
  } catch (error) {
    console.error('[PDF Extract] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
