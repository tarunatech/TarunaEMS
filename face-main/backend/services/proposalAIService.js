import { generateGeminiText } from './geminiKeyManager.js';

const text = (value) => String(value || '').trim();
const asArray = (value) => Array.isArray(value) ? value : [];
const contactDetails = {
  website: 'www.tarunatech.com',
  phone: '+91 910 6610 595',
  email: 'tarunatechnology@gmail.com',
  address: '709,710, Broadway Empire, Nilamber circle, Vasna Bhayli Main Rd, Bhayli, Vadodara, Gujarat 391410'
};
const timelineRows = [
  { phase: 'Requirement Finalization', duration: '1 Week', notes: 'Finalize scope, users, modules, and approval points.' },
  { phase: 'UI/UX & Development', duration: '3 Weeks', notes: 'Design, build, and connect the approved software modules.' },
  { phase: 'Testing & Deployment', duration: '2 Weeks', notes: 'QA, fixes, deployment setup, and handover.' }
];
const paymentRows = [
  { milestone: 'Project Kickoff', description: 'Advance payment before development starts.', percentage: 40 },
  { milestone: 'Development Review', description: 'After major modules are ready for review.', percentage: 30 },
  { milestone: 'Final Deployment', description: 'Before final deployment and handover.', percentage: 30 }
];
const buildCostRows = (amount = 0) => {
  const total = Number(amount || 0);
  const split = [
    ['UI/UX Design & Prototyping', 10],
    ['Frontend Development', 18],
    ['Backend & API Integration', 22],
    ['Core Module Customization', 25],
    ['Database, Testing & Deployment', 15],
    ['Project Management & Documentation', 10]
  ];
  return split.map(([component, percent], index) => ({
    component,
    cost: total ? Math.round(index === split.length - 1
      ? total - split.slice(0, -1).reduce((sum, [, pct]) => sum + Math.round((total * pct) / 100), 0)
      : (total * percent) / 100) : 0
  }));
};

export const buildProposalDefaults = ({ lead = {}, clientDetails = {}, quotation = {}, proposal = {} }) => {
  const customerName = text(`${lead.firstName || ''} ${lead.lastName || ''}`) || text(proposal.customerName);
  const currency = proposal.pricing?.currency || quotation.currency || 'INR';
  return {
    status: proposal.status || 'draft',
    version: Number(proposal.version || 0),
    generatedAt: proposal.generatedAt || null,
    updatedAt: proposal.updatedAt || null,
    generatedBy: proposal.generatedBy || null,
    companyName: proposal.companyName || lead.company || '',
    customerName: proposal.customerName || customerName,
    proposalType: proposal.proposalType || 'ERP Software',
    title: proposal.title || `${proposal.proposalType || 'ERP Software'} Proposal`,
    subtitle: proposal.subtitle || clientDetails.businessNeed || '',
    pricing: {
      totalPrice: Number(proposal.pricing?.totalPrice || quotation.amount || lead.estimatedValue || 0),
      discountedPrice: Number(proposal.pricing?.discountedPrice || 0),
      amcCost: Number(proposal.pricing?.amcCost || 0),
      currency
    },
    validity: {
      validUntil: proposal.validity?.validUntil || quotation.validUntil || ''
    },
    sections: {
      executiveSummary: proposal.sections?.executiveSummary || '',
      companyIntroduction: proposal.sections?.companyIntroduction || 'Taruna Technology delivers practical, scalable software solutions for growing businesses.',
      projectObjectives: proposal.sections?.projectObjectives || clientDetails.businessNeed || '',
      proposedSolution: proposal.sections?.proposedSolution || '',
      scopeOfWork: proposal.sections?.scopeOfWork || clientDetails.requirements || '',
      coreModules: asArray(proposal.sections?.coreModules),
      additionalModules: asArray(proposal.sections?.additionalModules),
      technologyStack: asArray(proposal.sections?.technologyStack),
      systemWorkflow: asArray(proposal.sections?.systemWorkflow),
      securityAndDataProtection: asArray(proposal.sections?.securityAndDataProtection),
      hostingAndDeployment: asArray(proposal.sections?.hostingAndDeployment),
      projectCostBreakdown: asArray(proposal.sections?.projectCostBreakdown).length ? proposal.sections.projectCostBreakdown : buildCostRows(proposal.pricing?.totalPrice || quotation.amount || lead.estimatedValue),
      projectInvestmentDetails: proposal.sections?.projectInvestmentDetails || quotation.notes || '',
      supportAndMaintenance: asArray(proposal.sections?.supportAndMaintenance),
      deliverables: asArray(proposal.sections?.deliverables),
      conclusion: proposal.sections?.conclusion || '',
      hostingDetails: asArray(proposal.sections?.hostingDetails),
      commercialClarification: asArray(proposal.sections?.commercialClarification),
      whyUs: asArray(proposal.sections?.whyUs),
      agreement: proposal.sections?.agreement || 'This proposal is prepared for review and mutual acceptance. Final scope, timeline, and delivery terms will be confirmed in writing before project kickoff.',
      warrantyAndSupport: proposal.sections?.warrantyAndSupport || '',
      intellectualPropertyRights: proposal.sections?.intellectualPropertyRights || 'Project intellectual property and usage rights will be governed by the mutually agreed commercial agreement.',
      hostingThirdPartyServices: proposal.sections?.hostingThirdPartyServices || 'Hosting, domains, SSL certificates, email, SMS, payment gateways, and other third-party subscriptions are subject to the selected provider plans and renewal charges.',
      termination: proposal.sections?.termination || 'Either party may terminate the engagement through written notice as per the mutually accepted agreement. Completed work and approved costs up to the termination date will remain payable.',
      limitationOfLiability: proposal.sections?.limitationOfLiability || 'Taruna Technology liability is limited to the fees received for the agreed project scope and excludes indirect, incidental, or consequential losses.',
      governingLaw: proposal.sections?.governingLaw || 'This proposal will be governed by the applicable laws agreed between both parties.',
      termsAndConditions: asArray(proposal.sections?.termsAndConditions).length ? proposal.sections.termsAndConditions : [
        'Project scope, timeline, and commercials are subject to mutual written confirmation.',
        'Payment terms must be agreed before project kickoff.',
        'Any additional scope will be estimated and approved separately.'
      ],
      projectTimeline: asArray(proposal.sections?.projectTimeline).length ? proposal.sections.projectTimeline : timelineRows,
      paymentTerms: asArray(proposal.sections?.paymentTerms).length ? proposal.sections.paymentTerms : paymentRows
    },
    contactDetails: { ...contactDetails, ...(proposal.contactDetails || {}) },
    signatureDetails: {
      clientName: proposal.signatureDetails?.clientName || proposal.customerName || customerName,
      clientDate: proposal.signatureDetails?.clientDate || '',
      clientSignature: proposal.signatureDetails?.clientSignature || '',
      place: proposal.signatureDetails?.place || '',
      authorizedSignatory: proposal.signatureDetails?.authorizedSignatory || 'Taruna Technology',
      tarunaDate: proposal.signatureDetails?.tarunaDate || ''
    },
    sourceData: {
      lead: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        estimatedValue: lead.estimatedValue,
        address: lead.address
      },
      clientDetails,
      quotation
    },
    htmlContent: proposal.htmlContent || '',
    aiInstructions: proposal.aiInstructions || '',
    contentVersion: Number(proposal.contentVersion || proposal.version || 0),
    aiGeneratedAt: proposal.aiGeneratedAt || null,
    aiModel: proposal.aiModel || '',
    aiProvider: proposal.aiProvider || '',
    pdfUrl: proposal.pdfUrl || '',
    docxUrl: proposal.docxUrl || '',
    versions: asArray(proposal.versions)
  };
};

const fallbackContent = ({ clientDetails = {}, quotation = {}, proposalInputs = {} }) => ({
  executiveSummary: proposalInputs.sections?.executiveSummary || `This proposal outlines a focused ${proposalInputs.proposalType || 'software'} solution for ${proposalInputs.companyName || 'the client'}.`,
  companyIntroduction: proposalInputs.sections?.companyIntroduction || 'Taruna Technology provides custom software, automation, and business workflow systems with a focus on reliable delivery and clear support.',
  projectObjectives: asArray(proposalInputs.sections?.projectObjectives).length ? proposalInputs.sections.projectObjectives : [
    clientDetails.businessNeed || 'Centralize business operations in one reliable software platform.',
    'Improve visibility, tracking, and reporting across daily workflows.'
  ],
  proposedSolution: proposalInputs.sections?.proposedSolution || `A configurable ${proposalInputs.proposalType || 'software'} platform tailored to the supplied business requirements.`,
  scopeOfWork: proposalInputs.sections?.scopeOfWork || clientDetails.requirements || '',
  coreModules: proposalInputs.sections?.coreModules?.length ? proposalInputs.sections.coreModules : [
    { title: 'Production Management', description: 'Structured planning and tracking for operational activities.', features: ['Production planning', 'Batch tracking', 'Status monitoring'] },
    { title: 'Inventory & Warehouse Management', description: 'Centralized visibility across stock and warehouse movement.', features: ['Raw material inventory', 'Finished goods tracking', 'Stock alerts'] },
    { title: 'Sales & Order Management', description: 'Controlled order handling from quotation to delivery.', features: ['Quotation management', 'Order tracking', 'Customer records'] }
  ],
  additionalModules: proposalInputs.sections?.additionalModules || [],
  technologyStack: proposalInputs.sections?.technologyStack?.length ? proposalInputs.sections.technologyStack : [
    { technology: 'React.js', purpose: 'Responsive application interface' },
    { technology: 'Node.js', purpose: 'Backend API and business logic' },
    { technology: 'PostgreSQL', purpose: 'Structured data storage' }
  ],
  systemWorkflow: proposalInputs.sections?.systemWorkflow?.length ? proposalInputs.sections.systemWorkflow : [
    { title: 'Lead to Delivery', description: 'Client requirements are captured, reviewed, implemented, tested, and delivered through controlled stages.' }
  ],
  securityAndDataProtection: proposalInputs.sections?.securityAndDataProtection?.length ? proposalInputs.sections.securityAndDataProtection : ['Role-based access control', 'Secure authentication', 'Data backup-ready architecture'],
  hostingAndDeployment: proposalInputs.sections?.hostingAndDeployment || [],
  supportAndMaintenance: proposalInputs.sections?.supportAndMaintenance?.length ? proposalInputs.sections.supportAndMaintenance : ['Basic post-delivery support as mutually agreed'],
  deliverables: proposalInputs.sections?.deliverables?.length ? proposalInputs.sections.deliverables : ['Web application', 'Admin panel', 'Deployment-ready source package'],
  conclusion: proposalInputs.sections?.conclusion || 'We look forward to collaborating and delivering a practical, scalable solution.',
  whyUs: proposalInputs.sections?.whyUs?.length ? proposalInputs.sections.whyUs : ['Business-focused implementation', 'Structured delivery', 'Editable and transparent proposal process'],
  commercialClarification: proposalInputs.sections?.commercialClarification?.length ? proposalInputs.sections.commercialClarification : [quotation.notes].filter(Boolean),
  termsAndConditions: proposalInputs.sections?.termsAndConditions || [],
  warrantyAndSupport: proposalInputs.sections?.warrantyAndSupport || 'Warranty and support will be provided as mutually agreed in the final project agreement.',
  intellectualPropertyRights: proposalInputs.sections?.intellectualPropertyRights || 'Ownership, usage, and source-code access will be handled as per the final commercial agreement.',
  governingLaw: proposalInputs.sections?.governingLaw || 'Governing law and dispute handling will be finalized in the signed agreement.'
});

const parseStrictJson = (raw) => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

const requiredKeys = [
  'executiveSummary',
  'companyIntroduction',
  'projectObjectives',
  'proposedSolution',
  'scopeOfWork',
  'coreModules',
  'additionalModules',
  'technologyStack',
  'systemWorkflow',
  'securityAndDataProtection',
  'hostingAndDeployment',
  'supportAndMaintenance',
  'deliverables',
  'conclusion',
  'whyUs',
  'commercialClarification',
  'termsAndConditions'
];

const normalizeString = (value) => typeof value === 'string' ? value : '';
const normalizeStringArray = (value) => asArray(value).map(item => typeof item === 'string' ? item : text(item.title || item.description || item.technology || item.purpose)).filter(Boolean);
const normalizeModules = (value) => asArray(value).map(item => ({
  title: normalizeString(item?.title || item),
  description: normalizeString(item?.description),
  features: normalizeStringArray(item?.features)
})).filter(item => item.title || item.description || item.features.length);
const normalizeTech = (value) => asArray(value).map(item => typeof item === 'string'
  ? { technology: item, purpose: '' }
  : { technology: normalizeString(item?.technology || item?.title), purpose: normalizeString(item?.purpose || item?.description) }
).filter(item => item.technology || item.purpose);
const normalizeWorkflow = (value) => asArray(value).map(item => typeof item === 'string'
  ? { title: item, description: '' }
  : { title: normalizeString(item?.title), description: normalizeString(item?.description) }
).filter(item => item.title || item.description);

export const validateProposalAIResponse = (response, fallback) => {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return fallback;
  const normalized = {
    executiveSummary: normalizeString(response.executiveSummary) || fallback.executiveSummary,
    companyIntroduction: normalizeString(response.companyIntroduction) || fallback.companyIntroduction,
    projectObjectives: normalizeStringArray(response.projectObjectives).length ? normalizeStringArray(response.projectObjectives) : asArray(fallback.projectObjectives),
    proposedSolution: normalizeString(response.proposedSolution) || fallback.proposedSolution,
    scopeOfWork: normalizeString(response.scopeOfWork) || fallback.scopeOfWork,
    coreModules: normalizeModules(response.coreModules).length ? normalizeModules(response.coreModules) : fallback.coreModules,
    additionalModules: normalizeModules(response.additionalModules),
    technologyStack: normalizeTech(response.technologyStack).length ? normalizeTech(response.technologyStack) : fallback.technologyStack,
    systemWorkflow: normalizeWorkflow(response.systemWorkflow).length ? normalizeWorkflow(response.systemWorkflow) : fallback.systemWorkflow,
    securityAndDataProtection: normalizeStringArray(response.securityAndDataProtection).length ? normalizeStringArray(response.securityAndDataProtection) : fallback.securityAndDataProtection,
    hostingAndDeployment: normalizeStringArray(response.hostingAndDeployment),
    supportAndMaintenance: normalizeStringArray(response.supportAndMaintenance).length ? normalizeStringArray(response.supportAndMaintenance) : fallback.supportAndMaintenance,
    deliverables: normalizeStringArray(response.deliverables).length ? normalizeStringArray(response.deliverables) : fallback.deliverables,
    conclusion: normalizeString(response.conclusion) || fallback.conclusion,
    whyUs: normalizeStringArray(response.whyUs).length ? normalizeStringArray(response.whyUs) : fallback.whyUs,
    commercialClarification: normalizeStringArray(response.commercialClarification).length ? normalizeStringArray(response.commercialClarification) : fallback.commercialClarification,
    termsAndConditions: normalizeStringArray(response.termsAndConditions).length ? normalizeStringArray(response.termsAndConditions) : fallback.termsAndConditions
  };
  return requiredKeys.every(key => normalized[key] !== undefined) ? normalized : fallback;
};

const buildAiContext = ({ lead = {}, clientDetails = {}, quotation = {}, proposalInputs = {}, userInstructions = '' }) => ({
  client: {
    name: proposalInputs.customerName || text(`${lead.firstName || ''} ${lead.lastName || ''}`),
    company: proposalInputs.companyName || lead.company || '',
    email: lead.email || '',
    phone: lead.phone || '',
    decisionMaker: clientDetails.decisionMaker || ''
  },
  requirements: {
    businessNeed: clientDetails.businessNeed || '',
    requirements: clientDetails.requirements || proposalInputs.sections?.scopeOfWork || '',
    timeline: clientDetails.timeline || '',
    budgetRange: clientDetails.budgetRange || '',
    notes: clientDetails.notes || ''
  },
  quotation: {
    quotationNumber: quotation.quotationNumber || '',
    amount: quotation.amount || proposalInputs.pricing?.totalPrice || 0,
    currency: quotation.currency || proposalInputs.pricing?.currency || 'INR',
    validUntil: quotation.validUntil || proposalInputs.validity?.validUntil || '',
    notes: quotation.notes || ''
  },
  proposal: {
    proposalType: proposalInputs.proposalType || '',
    companyName: proposalInputs.companyName || '',
    customerName: proposalInputs.customerName || '',
    totalPrice: proposalInputs.pricing?.totalPrice || 0,
    discountedPrice: proposalInputs.pricing?.discountedPrice || 0,
    amcCost: proposalInputs.pricing?.amcCost || 0,
    termsAndConditions: proposalInputs.sections?.termsAndConditions || []
  },
  existingContent: proposalInputs.sections || {},
  userInstructions: userInstructions || proposalInputs.aiInstructions || ''
});

const buildPrompt = (input, section = '') => {
  const context = buildAiContext(input);
  const sectionContext = section ? {
    sectionKey: section,
    currentSectionContent: input.proposalInputs?.sections?.[section] ?? null
  } : null;

  return `You are a senior proposal editor for a sales team.
Your job is to improve proposal wording based on the user's instruction and the current section content.
Do not change document layout, HTML, CSS, pricing, company identity, customer identity, legal commitments, section names, or section order.
Preserve factual details exactly. Improve clarity, usefulness, structure, and relevance to the user's prompt.
If the user asks for more detail, add relevant detail. If the user asks to shorten, tighten the writing. If the user asks for a more professional tone, rewrite accordingly.
Use the current content as the base and edit it like a real AI assistant would.
Return STRICT JSON only. No markdown, no code fence, no explanation.
${section ? `Improve ONLY this section key: ${section}. Return JSON with exactly that key.` : `Return JSON with these keys: ${requiredKeys.join(', ')}.`}
Current context:
${JSON.stringify(context, null, 2)}
${sectionContext ? `\nSection to improve:\n${JSON.stringify(sectionContext, null, 2)}` : ''}`;
};

export const generateProposalContent = async (input) => {
  const fallback = fallbackContent(input);
  try {
    const result = await generateGeminiText(buildPrompt(input));
    const parsed = parseStrictJson(result.text);
    return {
      content: validateProposalAIResponse(parsed, fallback),
      meta: { aiModel: result.model, aiProvider: 'gemini', keySlot: result.keySlot, usedFallback: false }
    };
  } catch (error) {
    console.warn('[Proposal AI] Falling back to deterministic content:', error.message);
    return { content: fallback, meta: { usedFallback: true } };
  }
};

export const generateProposalSectionContent = async (input, section) => {
  const fallback = fallbackContent(input);
  if (!requiredKeys.includes(section)) return { content: { [section]: fallback[section] }, meta: { usedFallback: true } };
  try {
    const result = await generateGeminiText(buildPrompt(input, section));
    const parsed = parseStrictJson(result.text);
    const validated = validateProposalAIResponse({ ...fallback, ...parsed }, fallback);
    return {
      content: { [section]: validated[section] },
      meta: { aiModel: result.model, aiProvider: 'gemini', keySlot: result.keySlot, usedFallback: false }
    };
  } catch (error) {
    console.warn(`[Proposal AI] Falling back for section ${section}:`, error.message);
    return { content: { [section]: fallback[section] }, meta: { usedFallback: true } };
  }
};
