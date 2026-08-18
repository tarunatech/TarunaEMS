import { PDFParse } from 'pdf-parse';
import { createRequire } from 'module';
import { generateGeminiText } from './geminiKeyManager.js';
import { validateProposalAIResponse } from './proposalAIService.js';

const require = createRequire(import.meta.url);
let legacyPdfParse = null;
try {
  legacyPdfParse = require('pdf-parse');
} catch (e) {
  // ignore
}

const extractTextFromBuffer = async (buffer) => {
  if (typeof PDFParse === 'function') {
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      return textResult.text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (legacyPdfParse) {
    if (typeof legacyPdfParse.PDFParse === 'function') {
      const parser = new legacyPdfParse.PDFParse({ data: buffer });
      try {
        const textResult = await parser.getText();
        return textResult.text || '';
      } finally {
        await parser.destroy().catch(() => {});
      }
    }
    if (typeof legacyPdfParse === 'function') {
      const parsed = await legacyPdfParse(buffer);
      return parsed.text || '';
    }
    if (typeof legacyPdfParse.default === 'function') {
      const parsed = await legacyPdfParse.default(buffer);
      return parsed.text || '';
    }
  }

  throw new Error('PDF parsing library was not found or is incompatible.');
};

const parseStrictJson = (raw) => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

export const fallbackExtractFromText = (rawText) => {
  let companyName = '';
  const presMatch = rawText.match(/Presented to\s*[:\n]?\s*([^\n]+)/i);
  if (presMatch) {
    companyName = presMatch[1].trim();
  } else {
    const compMatch = rawText.match(/(?:Client|Company|Prepared for)\s*[:\n]?\s*([^\n]+)/i);
    if (compMatch) companyName = compMatch[1].trim();
  }

  let customerName = '';
  const custMatch = rawText.match(/(?:Attn|Customer Name|Contact Person|Contact)\s*[:\n]?\s*([^\n]+)/i);
  if (custMatch) customerName = custMatch[1].trim();

  let proposalType = 'ERP Software';
  const typeMatch = rawText.match(/(?:Proposal Type|Project Type)\s*[:\n]?\s*([^\n]+)/i);
  if (typeMatch) {
    proposalType = typeMatch[1].trim();
  } else if (/ERP|Production Management/i.test(rawText)) {
    proposalType = 'ERP Software';
  } else if (/Web App|Website/i.test(rawText)) {
    proposalType = 'Web App';
  } else if (/Mobile App|Android|iOS/i.test(rawText)) {
    proposalType = 'Mobile App';
  }

  const parseNum = (str) => {
    if (!str) return 0;
    const clean = str.replace(/[^\d.]/g, '');
    return Number(clean) || 0;
  };

  let totalPrice = 0;
  const totalMatch = rawText.match(/(?:Total Price|Total Project Cost|Total Cost|Total Amount)\s*[:\n]?\s*(?:Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  if (totalMatch) totalPrice = parseNum(totalMatch[1]);

  let discountedPrice = 0;
  const discMatch = rawText.match(/(?:Discounted Price|Special Price)\s*[:\n]?\s*(?:Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  if (discMatch) discountedPrice = parseNum(discMatch[1]);

  let amcCost = 0;
  const amcMatch = rawText.match(/(?:AMC Cost|AMC|Annual Maintenance)\s*[:\n]?\s*(?:Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  if (amcMatch) amcCost = parseNum(amcMatch[1]);

  let validUntil = '';
  const valMatch = rawText.match(/(?:Valid Until|Validity)\s*[:\n]?\s*([^\n]+)/i);
  if (valMatch) validUntil = valMatch[1].trim();

  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}|\+91\s*\d{10}|\+91\s*\d{3}\s*\d{3}\s*\d{4}/);
  const webMatch = rawText.match(/www\.[\w.-]+\.\w+/);

  const extractSection = (headingRegex) => {
    const match = rawText.match(headingRegex);
    if (!match) return '';
    const startPos = match.index + match[0].length;
    const rest = rawText.slice(startPos);
    const endMatch = rest.match(/\n\n[A-Z][A-Za-z\s]{3,30}\n|\n(?:Commercial Summary|Company Introduction|Executive Summary|Project Objectives|Scope of Work|Proposed Solution|Technology Stack|Core Modules|System Workflow|Project Cost|Security|Support|Deliverables|Why Us|Terms|Timeline|Payment|Agreement)/i);
    const endPos = endMatch ? endMatch.index : Math.min(rest.length, 3000);
    return rest.slice(0, endPos).trim();
  };

  const executiveSummary = extractSection(/(?:Executive Summary)\s*[:\n]/i);
  const companyIntroduction = extractSection(/(?:Company Introduction)\s*[:\n]/i);
  const projectObjectives = extractSection(/(?:Project Objectives)\s*[:\n]/i);
  const scopeOfWork = extractSection(/(?:Scope of Work)\s*[:\n]/i);
  const proposedSolution = extractSection(/(?:Proposed Solution|Proposed Solution \/ Basic Phrases)\s*[:\n]/i);
  const projectInvestmentDetails = extractSection(/(?:Project Investment Details)\s*[:\n]/i);
  const agreement = extractSection(/(?:Software Development Agreement|Agreement)\s*[:\n]/i);
  const intellectualPropertyRights = extractSection(/(?:Intellectual Property Rights)\s*[:\n]/i);
  const hostingThirdPartyServices = extractSection(/(?:Hosting & Third-Party Services|Hosting & Third Party Services)\s*[:\n]/i);
  const termination = extractSection(/(?:Termination)\s*[:\n]/i);
  const limitationOfLiability = extractSection(/(?:Limitation of Liability)\s*[:\n]/i);
  const governingLaw = extractSection(/(?:Governing Law)\s*[:\n]/i);

  const extractList = (headingRegex) => {
    const block = extractSection(headingRegex);
    if (!block) return [];
    return block.split('\n').map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  };

  const securityAndDataProtection = extractList(/(?:Security & Data Protection|Security and Data Protection)\s*[:\n]/i);
  const supportAndMaintenance = extractList(/(?:Support & Maintenance|Support and Maintenance)\s*[:\n]/i);
  const deliverables = extractList(/(?:Deliverables)\s*[:\n]/i);
  const whyUs = extractList(/(?:Why Taruna Technology|Why Us)\s*[:\n]/i);
  const termsAndConditions = extractList(/(?:Terms & Conditions|Terms and Conditions)\s*[:\n]/i);

  return {
    companyName: companyName || '',
    customerName: customerName || '',
    proposalType: proposalType || 'ERP Software',
    pricing: {
      totalPrice,
      discountedPrice,
      amcCost,
      currency: rawText.includes('Rs') || rawText.includes('INR') || rawText.includes('₹') ? 'INR' : 'USD'
    },
    validity: { validUntil },
    contactDetails: {
      website: webMatch ? webMatch[0] : 'www.tarunatech.com',
      phone: phoneMatch ? phoneMatch[0] : '+91 910 6610 595',
      email: emailMatch ? emailMatch[0] : 'tarunatechnology@gmail.com',
      address: ''
    },
    signatureDetails: {
      clientName: customerName || companyName || '',
      clientDate: '',
      clientSignature: '',
      place: '',
      authorizedSignatory: 'Taruna Technology',
      tarunaDate: ''
    },
    sections: {
      executiveSummary: executiveSummary || `Proposal details extracted for ${companyName || 'client'}.`,
      companyIntroduction: companyIntroduction || 'Taruna Technology delivers practical, scalable software solutions.',
      projectObjectives: projectObjectives ? [projectObjectives] : [],
      proposedSolution: proposedSolution || `Custom ${proposalType} solution tailored to requirements.`,
      scopeOfWork,
      coreModules: [],
      additionalModules: [],
      technologyStack: [],
      systemWorkflow: [],
      securityAndDataProtection,
      hostingAndDeployment: [],
      supportAndMaintenance,
      deliverables,
      conclusion: '',
      whyUs,
      commercialClarification: [],
      termsAndConditions,
      projectCostBreakdown: totalPrice ? [{ component: 'Total Project Cost', cost: totalPrice }] : [],
      projectTimeline: [],
      paymentTerms: [],
      projectInvestmentDetails,
      agreement,
      intellectualPropertyRights,
      hostingThirdPartyServices,
      termination,
      limitationOfLiability,
      governingLaw,
      warrantyAndSupport: ''
    }
  };
};

const buildExtractionPrompt = (text) => `You are a professional proposal data extractor.
Extract ALL structured data from the following proposal PDF text and return it as strict JSON.
Do NOT invent data. Only extract what is clearly present in the text.
Return STRICT JSON only. No markdown, no code fence, no explanation.

Return JSON with these top-level keys:
- companyName (string): client/customer company name
- customerName (string): client contact person name
- proposalType (string): type of proposal/project e.g. "ERP Software", "Web App"
- pricing (object): { totalPrice (number), discountedPrice (number), amcCost (number), currency (string, default "INR") }
- validity (object): { validUntil (string, date) }
- contactDetails (object): { website, phone, email, address }
- signatureDetails (object): { clientName, clientDate, clientSignature, place, authorizedSignatory, tarunaDate }
- sections (object) with these keys:
  - executiveSummary (string)
  - companyIntroduction (string)
  - projectObjectives (array of strings OR string)
  - proposedSolution (string)
  - scopeOfWork (string)
  - coreModules (array of { title, description, features: string[] })
  - additionalModules (array of { title, description, features: string[] })
  - technologyStack (array of { technology, purpose })
  - systemWorkflow (array of { title, description })
  - securityAndDataProtection (array of strings)
  - hostingAndDeployment (array of strings)
  - supportAndMaintenance (array of strings)
  - deliverables (array of strings)
  - conclusion (string)
  - whyUs (array of strings)
  - termsAndConditions (array of strings)
  - agreement (string)
  - intellectualPropertyRights (string)
  - hostingThirdPartyServices (string)
  - termination (string)
  - limitationOfLiability (string)
  - governingLaw (string)
  - warrantyAndSupport (string)
  - commercialClarification (array of strings)
  - projectCostBreakdown (array of { component, cost })
  - projectTimeline (array of { phase, duration, notes })
  - paymentTerms (array of { milestone, description, percentage })
  - projectInvestmentDetails (string)

PDF TEXT:
${text.slice(0, 18000)}`;

export const extractProposalFromPdf = async (buffer) => {
  let rawText = '';
  try {
    rawText = await extractTextFromBuffer(buffer);
  } catch (parseError) {
    throw new Error(`Failed to read PDF: ${parseError.message}`);
  }

  if (!rawText.trim()) {
    throw new Error('No text could be extracted from this PDF. It may be scanned or image-based.');
  }

  try {
    const result = await generateGeminiText(buildExtractionPrompt(rawText));
    const parsed = parseStrictJson(result.text);

    const sectionFallback = fallbackExtractFromText(rawText).sections;
    const validatedSections = validateProposalAIResponse(parsed.sections || {}, sectionFallback);

    return {
      companyName: String(parsed.companyName || ''),
      customerName: String(parsed.customerName || ''),
      proposalType: String(parsed.proposalType || 'ERP Software'),
      pricing: {
        totalPrice: Number(parsed.pricing?.totalPrice || 0),
        discountedPrice: Number(parsed.pricing?.discountedPrice || 0),
        amcCost: Number(parsed.pricing?.amcCost || 0),
        currency: String(parsed.pricing?.currency || 'INR')
      },
      validity: {
        validUntil: String(parsed.validity?.validUntil || '')
      },
      contactDetails: parsed.contactDetails || {},
      signatureDetails: parsed.signatureDetails || {},
      sections: {
        ...validatedSections,
        projectCostBreakdown: Array.isArray(parsed.sections?.projectCostBreakdown) ? parsed.sections.projectCostBreakdown : [],
        projectTimeline: Array.isArray(parsed.sections?.projectTimeline) ? parsed.sections.projectTimeline : [],
        paymentTerms: Array.isArray(parsed.sections?.paymentTerms) ? parsed.sections.paymentTerms : [],
        projectInvestmentDetails: String(parsed.sections?.projectInvestmentDetails || ''),
        agreement: String(parsed.sections?.agreement || ''),
        intellectualPropertyRights: String(parsed.sections?.intellectualPropertyRights || ''),
        hostingThirdPartyServices: String(parsed.sections?.hostingThirdPartyServices || ''),
        termination: String(parsed.sections?.termination || ''),
        limitationOfLiability: String(parsed.sections?.limitationOfLiability || ''),
        governingLaw: String(parsed.sections?.governingLaw || ''),
        warrantyAndSupport: String(parsed.sections?.warrantyAndSupport || '')
      }
    };
  } catch (aiError) {
    console.warn('[PDF Extract AI] Gemini AI extraction unavailable, using text fallback parser:', aiError.message);
    return fallbackExtractFromText(rawText);
  }
};
