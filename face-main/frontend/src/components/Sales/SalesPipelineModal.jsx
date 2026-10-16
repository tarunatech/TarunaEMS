import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, CheckCircle, Download, FileText, Globe, Loader2, Mail, Phone, Plus, RefreshCw, Save, Send, ShieldCheck, Sparkles, Trash2, Upload, XCircle, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiFileUrl, salesPipelineAPI } from '../../utils/api';

const stages = [
  ['client_details', 'Client Details'],
  ['quotation', 'Quotation Details'],
  ['proposal', 'Proposal'],
  ['sent_to_client', 'Sent to Client'],
  ['negotiation', 'Negotiation'],
  ['won_closed', 'Won / Closed']
];

const proposalEditableSections = [
  ['companyIntroduction', 'Company Introduction', 'text'],
  ['executiveSummary', 'Executive Summary', 'text'],
  ['projectObjectives', 'Project Objectives', 'list'],
  ['scopeOfWork', 'Scope of Work', 'text'],
  ['technologyStack', 'Technology Stack', 'pairs'],
  ['proposedSolution', 'Proposed Solution / Basic Phrases', 'text'],
  ['coreModules', 'Core Modules & Features', 'modules'],
  ['systemWorkflow', 'System Workflow', 'pairs'],
  ['securityAndDataProtection', 'Security & Data Protection', 'list'],
  ['supportAndMaintenance', 'Support & Maintenance', 'list'],
  ['deliverables', 'Deliverables', 'list'],
  ['whyUs', 'Why Taruna Technology', 'list'],
  ['termsAndConditions', 'Terms & Conditions', 'list'],
  ['agreement', 'Software Development Agreement', 'text'],
  ['intellectualPropertyRights', 'Intellectual Property Rights', 'text'],
  ['hostingThirdPartyServices', 'Hosting & Third-Party Services', 'text'],
  ['termination', 'Termination', 'text'],
  ['limitationOfLiability', 'Limitation of Liability', 'text'],
  ['governingLaw', 'Governing Law', 'text']
];

const defaultContactDetails = {
  website: 'www.tarunatech.com',
  phone: '+91 910 6610 595',
  email: 'tarunatechnology@gmail.com',
  address: '709,710, Broadway Empire, Nilamber circle, Vasna Bhayli Main Rd, Bhayli, Vadodara, Gujarat 391410'
};

const defaultSignatureDetails = {
  clientName: '',
  clientDate: '',
  clientSignature: '',
  place: '',
  authorizedSignatory: 'Taruna Technology',
  tarunaDate: ''
};

const defaultTimelineRows = [
  { phase: 'Requirement Finalization', duration: '1 Week', notes: 'Finalize scope, users, modules, and approval points.' },
  { phase: 'UI/UX & Development', duration: '3 Weeks', notes: 'Design, build, and connect the approved software modules.' },
  { phase: 'Testing & Deployment', duration: '2 Weeks', notes: 'QA, fixes, deployment setup, and handover.' }
];

const defaultPaymentRows = [
  { milestone: 'Project Kickoff', description: 'Advance payment before development starts.', percentage: 40, amount: '' },
  { milestone: 'Development Review', description: 'After major modules are ready for review.', percentage: 30, amount: '' },
  { milestone: 'Final Deployment', description: 'Before final deployment and handover.', percentage: 30, amount: '' }
];

const defaultIntellectualPropertyRights = 'Upon full payment of the agreed project fees, the client will receive a non-exclusive license to use the delivered software for internal business purposes. Taruna Technology retains ownership of its pre-existing tools, frameworks, code snippets, and reusable development components. Any transfer, resale, redistribution, or source-code disclosure beyond the agreed scope must be approved in writing by both parties.';
const defaultHostingThirdPartyServices = 'Hosting, domain registration, SSL certificates, email services, SMS gateways, payment gateways, app store accounts, and other third-party subscriptions are governed by the terms and pricing of the respective providers. Any renewal fees, provider charges, or external service limitations are the client’s responsibility unless expressly included in the signed proposal.';
const defaultTermination = 'Either party may terminate the project by providing written notice in accordance with the final agreement. If termination occurs, the client remains responsible for payment of all completed work, approved milestones, and any committed third-party costs incurred up to the termination date.';
const defaultLimitationOfLiability = 'Taruna Technology shall not be liable for indirect, incidental, special, or consequential damages arising from the use or inability to use the delivered solution. Our total liability for any claim related to the project will be limited to the amount actually paid for the specific services giving rise to the claim, subject to the final signed agreement.';

const proposalTypeOptions = ['ERP Software', 'Website Development', 'Mobile App'];
const billingTypeOptions = ['Fixed Price', 'Milestone Based', 'Time and Material', 'Recurring', 'Other'];
const paymentTermsOptions = ['Milestone Based', 'Advance', 'Monthly', 'Quarterly', 'Yearly', 'On Completion', 'Custom'];
const quotationStatusOptions = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Expired'];
const acceptanceStatusOptions = ['Pending', 'Accepted', 'Rejected', 'Changes Requested'];
const managerApprovalOptions = ['Not Required', 'Pending', 'Approved', 'Rejected'];
const discountReasonOptions = ['Volume Discount', 'Scope Adjustment', 'Competitive Match', 'Budget Constraint', 'Special Promotion', 'Strategic Account', 'Other'];

const proposalTypeTemplates = {
  'ERP Software': {
    title: 'ERP Software Proposal',
    subtitle: 'CUSTOM ERP & PRODUCTION MANAGEMENT SYSTEM',
    description: 'Project details and budget projections for a custom ERP and production management system.',
    sections: {
      companyIntroduction: 'Taruna Technology is a professional software development and IT services company specializing in custom business software, applications, CRM systems, ERP solutions, and automation. We help businesses streamline operations, improve efficiency, and gain better control through smart, technology-driven solutions.\n\nOur focus is on building scalable, secure, and user-friendly systems that align with each client\'s unique business needs. By combining strong technical expertise with a deep understanding of business processes, we deliver solutions that enhance productivity, reduce manual effort, and support long-term growth.\n\nAt Taruna Technology, we follow a strategic and consultative approach, ensuring every solution is tailored, reliable, and future-ready. We are committed to quality, innovation, and building long-term partnerships that enable businesses to succeed in an increasingly digital world.\n\nTaruna Technology - Smart Software Solutions for Growing Businesses.',
      executiveSummary: 'Taruna Technology is pleased to present this comprehensive proposal for developing a tailored Enterprise Resource Planning (ERP) software solution. Our objective is to provide a robust, scalable, and user-friendly system designed to streamline your business operations, enhance data management, and foster improved decision-making across all departments.\n\nThis ERP solution aims to centralize critical business functions, from inventory and billing to reporting, into a single, cohesive platform. By automating routine tasks and providing real-time insights, our proposed system will empower your team to operate more efficiently, reduce manual errors, and allocate resources more effectively.\n\nTaruna Technology is dedicated to building a solution that not only meets your current needs but also provides a flexible foundation for future expansion and innovation, ensuring a significant return on your investment.',
      projectObjectives: ['Centralize and integrate critical business data into a single platform.', 'Automate key operational workflows to reduce manual effort and errors.', 'Improve real-time reporting and analytics for informed decision-making.', 'Enhance inventory tracking and management efficiency.', 'Streamline billing and invoicing processes for faster transactions and payment tracking.', 'Provide a secure and role-based access control system for data integrity.'],
      proposedSolution: 'We will develop a modern, secure, and scalable ERP system tailored to your requirements, utilizing our proven technology stack.',
      scopeOfWork: 'Taruna Technology will design, develop, and deploy a feature-rich web app, including user-friendly interfaces and an integrated system for real-time data access and operational efficiency.',
      coreModules: [
        { title: 'Dashboard & Analytics', description: 'Real-time overview of key performance indicators and business summaries.', features: ['Customizable widgets for sales, inventory, and financial summaries', 'Quick links to frequently used modules and reports'] },
        { title: 'Inventory Management', description: 'Product catalog, stock tracking, purchase orders, and vendor management.', features: ['Product catalog management with detailed descriptions', 'Real-time stock level tracking and alerts for low inventory', 'Purchase order generation and vendor management', 'Goods receipt and stock adjustment functionalities'] },
        { title: 'Billing & Invoicing', description: 'Automated invoice generation and payment tracking.', features: ['Automated invoice generation from sales orders', 'Payment tracking and status updates', 'Customer account management and transaction history', 'Support for various payment methods and discounts'] },
        { title: 'Reporting & Insights', description: 'Business reports for sales, inventory, and financial summaries.', features: ['Generate sales reports by product, customer, or period', 'Inventory valuation and movement reports', 'Financial summaries', 'Export functionality for reports'] },
        { title: 'User & Role Management', description: 'Secure account and permission management.', features: ['Create and manage user accounts with distinct roles', 'Granular permission control based on user roles', 'Secure user authentication with password policies'] }
      ],
      technologyStack: [
        { technology: 'Frontend', purpose: 'React.js, HTML5, CSS3' },
        { technology: 'Backend', purpose: 'Node.js (Express.js)' },
        { technology: 'Database', purpose: 'PostgreSQL' },
        { technology: 'Deployment', purpose: 'Docker, Basic Cloud VM such as AWS EC2 or DigitalOcean' }
      ],
      systemWorkflow: [
        { title: 'Workflow 1', description: 'User logs in -> Dashboard view -> Access modules based on role.' },
        { title: 'Workflow 2', description: 'Product added/updated -> Inventory updated automatically -> Low stock alert generated.' },
        { title: 'Workflow 3', description: 'Sales order created -> Invoice generated -> Payment received -> Invoice status updated to Paid.' },
        { title: 'Workflow 4', description: 'Generate monthly sales report -> Analyze performance -> Make informed purchasing decisions.' },
        { title: 'Workflow 5', description: 'Create new user account -> Assign specific roles and permissions -> User accesses designated modules.' }
      ],
      securityAndDataProtection: ['Role-based access control (RBAC) to ensure data privacy.', 'Data encryption in transit using HTTPS/SSL.', 'Secure password policies including hashing and salting.', 'Regular security audits and vulnerability assessments.', 'Input validation and sanitization to prevent injection attacks.', 'Comprehensive activity logging for audit trails.'],
      hostingAndDeployment: ['Cloud-based hosting environment for scalability and reliability.', 'Automated daily database backups with point-in-time recovery.', '99.9% uptime commitment for continuous operation.', 'Monitoring and alerting for system performance and availability.', 'Secure network configuration with firewalls.'],
      projectCostBreakdown: [
        { component: 'UI/UX Design & Prototyping', cost: 7000 },
        { component: 'Frontend Development (React.js)', cost: 8000 },
        { component: 'Backend Development (Node.js/Express.js)', cost: 12000 },
        { component: 'Core Module Implementation', cost: 9000 },
        { component: 'Authentication & Security Setup', cost: 3000 },
        { component: 'Testing & Quality Assurance', cost: 3000 },
        { component: 'Initial Hosting & Deployment Setup', cost: 3000 }
      ],
      projectInvestmentDetails: 'Total One-Time Investment: Rs. 45,000\nDiscounted Offer Price: Rs. 35,000',
      supportAndMaintenance: ['Free warranty support: 3 months', 'Bug fixes and minor improvements included', 'Optional AMC (Annual Maintenance) available upon request'],
      deliverables: ['A fully developed and deployed web-based ERP application including all core modules.', 'Detailed project plan and scope document.', 'Comprehensive UI/UX design prototype.', 'Fully functional ERP web application.', 'User manual and training documentation.', 'Complete source code repository access.', 'Deployment guide and environment configuration.', 'Initial 30-day post-deployment technical support.', 'System architecture diagram.'],
      conclusion: 'This integrated digital ERP solution will empower your business with complete operational control through a centralized system, real-time insights, improved accuracy with automated tracking and management, faster daily operations by reducing manual work, and enhanced decision-making through detailed reports.\n\nBy implementing this modern and scalable ERP platform, your business will achieve seamless coordination across all operations. This transformation will improve internal efficiency and elevate overall business performance, leading to long-term growth.',
      hostingDetails: ['Dedicated VPS Server', 'Secure SSL Certificate', 'Optimized server configuration', 'Suitable for ERP-grade performance and data security', '1 year hosting validity'],
      commercialClarification: ['The above amount is a one-time investment.', 'Includes complete ERP development plus 1-year VPS hosting.', 'Hosting renewal after 1 year will be charged separately.', 'No hidden costs.'],
      whyUs: ['Proven experience in custom ERP and compliance systems.', 'Industry-specific solution design.', 'Transparent communication and documentation.', 'Scalable, secure, and future-ready architecture.', 'Dedicated support and long-term partnership approach.'],
      termsAndConditions: ['Project scope is strictly limited to the features, modules, and functionalities explicitly mentioned in the approved proposal and documentation.', 'Project timeline will commence after proposal approval, receipt of the initial advance payment, and final requirement confirmation.', 'Payments must be made as per the agreed milestone-based payment schedule.', 'Client agrees to provide timely access to required data, nominate a single point of contact, and review deliverables reasonably.', 'Taruna Technology agrees to maintain strict confidentiality of all client data.', 'A 3-month free warranty period is provided post-deployment, covering bug fixes related to delivered features.', 'Upon full payment, the client will receive usage rights for the developed software.', 'This agreement shall be governed and interpreted in accordance with the laws of India. Any disputes shall be subject to the jurisdiction of Vadodara, Gujarat.'],
      agreement: 'This Software Development Agreement is made and entered into between Taruna Technology and the client. By signing below, both parties acknowledge and agree to the terms and conditions set forth in this Agreement and commit to fulfill their respective obligations.'
    }
  },
  'Website Development': {
    title: 'Website Development Proposal',
    subtitle: 'CUSTOM WEBSITE DESIGN & DEVELOPMENT',
    description: 'Project details and budget projections for a professional business website.',
    sections: {
      companyIntroduction: 'Taruna Technology is a professional software development and IT services company specializing in custom business software, websites, applications, CRM systems, ERP solutions, and automation.',
      executiveSummary: 'Taruna Technology is pleased to present this comprehensive proposal for the development of a professional and highly functional website. This initiative aims to establish a strong digital footprint, providing your business with an essential platform to engage with your target audience, showcase your offerings, and reinforce your brand identity in the competitive online landscape. A well-crafted website is crucial for modern business success, acting as a 24/7 digital storefront and information hub.',
      projectObjectives: ['Establish a compelling and functional online presence for your organization.', 'Professionally design and develop a website that enhances visibility.', 'Facilitate customer interaction and support business growth.'],
      proposedSolution: 'We will develop a professional, responsive, and easy-to-manage website with modern design, clear page structure, CMS support, inquiry forms, basic SEO setup, and deployment assistance.',
      scopeOfWork: 'To establish a compelling and functional online presence for your organization through a professionally designed and developed website that enhances visibility, facilitates customer interaction, and supports business growth.',
      coreModules: [
        { title: 'Website Structure', description: 'Complete business website page structure.', features: ['Homepage with compelling hero section and key service highlights', 'About Us page detailing company history, mission, and team', 'Services/Products page with detailed descriptions and visuals', 'Blog/News section for content marketing and updates', 'Contact Us page with an inquiry form and location details', 'Privacy Policy and Terms of Service pages'] },
        { title: 'Design', description: 'Customized, modern, and aesthetically pleasing user interface design.', features: ['Responsive design across desktop, tablet, and mobile', 'Intuitive navigation and user experience', 'Integration of client branding guidelines including logo, color palette, and typography', 'Selection of high-quality imagery and iconography'] },
        { title: 'Development', description: 'Robust website development and CMS setup.', features: ['User-friendly Content Management System such as WordPress for easy content updates', 'Development of all agreed-upon pages with robust and clean code', 'Integration of contact forms and interactive elements', 'Basic Search Engine Optimization setup', 'Performance optimization for fast loading and cross-browser compatibility'] }
      ],
      technologyStack: [
        { technology: 'React.js / Modern Frontend', purpose: 'Responsive website interface' },
        { technology: 'Node.js / API Integration', purpose: 'Contact form and backend support where required' },
        { technology: 'SEO Basics', purpose: 'Meta titles, descriptions, and clean structure' },
        { technology: 'Hosting Deployment', purpose: 'Production-ready website launch' }
      ],
      systemWorkflow: [
        { title: 'Content and Design Finalization', description: 'Website pages and content structure are finalized before development.' },
        { title: 'Development and Review', description: 'Pages are built, reviewed, revised, and tested.' },
        { title: 'Deployment', description: 'Approved website is deployed with required hosting/domain setup support.' }
      ],
      projectCostBreakdown: [
        { component: 'Website Design & UI/UX', cost: 15000 },
        { component: 'Website Development & CMS Setup', cost: 18000 },
        { component: 'Content Integration & Basic SEO', cost: 7000 },
        { component: 'Testing, Quality Assurance & Deployment', cost: 5000 },
        { component: 'Project Management & Client Communication', cost: 5000 }
      ],
      projectInvestmentDetails: 'Total Cost (One-Time): Rs. 45,000\nSpecial Offer Discounted Price: Rs. 35,000 (One-Time)\nComplimentary Service: Logo Designing.',
      securityAndDataProtection: ['Secure HTTPS connection', 'Basic SEO setup', 'Performance optimization', 'Cross-browser compatibility'],
      supportAndMaintenance: ['Domain and hosting setup for 1st year included', 'SSL certificate included for 1 year', 'Basic post-launch support'],
      deliverables: ['Fully developed, professional website', 'Domain and hosting setup for 1st year included', 'Secure HTTPS connection', 'Instagram and WhatsApp integration', 'Optimized for mobile and fast loading', 'Basic SEO setup to help you appear on search engines', 'No hidden charges - fully transparent package'],
      whyUs: ['Professional website design and development', 'Modern responsive user interface', 'Transparent one-time pricing', 'Support for launch and deployment'],
      termsAndConditions: ['The project includes a static website with up to 5 to 8 pages.', 'Project timeline is 7-10 working days from the date of 60% advance payment.', 'The total project cost is all inclusive.', '60% advance payment is required to start the project.', 'The remaining 40% must be paid before final deployment.', 'All payments made are non-refundable.', 'Domain registration is included for 1 year.', 'Web hosting is included for 1 year.', 'SSL certificate is included for 1 year.', 'Basic SEO setup is included.'],
      agreement: 'This Website Development Agreement is made and entered into between Taruna Technology and the client. By signing below, both parties acknowledge the terms and conditions set forth in this Agreement and commit to fulfill their respective obligations.'
    }
  },
  'Mobile App': {
    title: 'Mobile App Proposal',
    subtitle: 'CUSTOM MOBILE APPLICATION DEVELOPMENT',
    description: 'Project details and budget projections for a custom mobile application.',
    sections: {
      companyIntroduction: 'Taruna Technology is a professional software development and IT services company specializing in custom mobile applications, business software, CRM systems, ERP solutions, and automation.',
      executiveSummary: 'Taruna Technology is pleased to present this proposal for the development of a cutting-edge mobile application. This project aims to deliver a robust and intuitive digital platform, specifically designed to elevate user engagement and streamline essential services for your audience.\n\nOur solution will focus on creating a seamless and delightful user experience, ensuring that your customers can easily access information and interact with your services on the go. We understand the critical role a well-executed mobile presence plays in today\'s market.\n\nThis application will serve as a powerful tool to enhance your brand\'s accessibility, improve customer satisfaction, and provide a convenient channel for service delivery. By focusing on efficient functionality and an appealing interface, we commit to delivering an application that not only meets but exceeds user expectations, fostering loyalty and driving digital growth.\n\nOur commitment is to deliver a high-quality, cost-effective mobile application within the allocated budget of Rs. 45,000. Taruna Technology is dedicated to translating your vision into a practical, high-performing mobile solution that strengthens your digital footprint and contributes significantly to your business objectives.',
      projectObjectives: ['Develop a user-friendly and feature-rich mobile application.', 'Enhance customer interaction and streamline core services.', 'Provide a modern digital platform accessible on both Android and iOS devices.'],
      proposedSolution: 'We will develop a robust cross-platform mobile application with intuitive UI/UX, secure authentication, backend API integration, database support, notifications, testing, and deployment assistance.',
      scopeOfWork: 'To develop a user-friendly and feature-rich mobile application that enhances customer interaction and streamlines core services, providing a modern digital platform accessible on both Android and iOS devices.',
      coreModules: [
        { title: 'Mobile App Structure', description: 'Core screens and mobile functionality.', features: ['User Registration and Login with secure authentication', 'Interactive Dashboard/Home Screen displaying key information', 'Comprehensive Profile Management for users to update personal details', 'Content Display Module for listing products, services, or articles', 'Advanced Search Functionality with filters', 'Integrated Notifications System for updates and alerts', 'Contact/Support Page with in-app messaging capabilities'] },
        { title: 'Design', description: 'Intuitive and consistent mobile UI/UX.', features: ['Development of an intuitive and consistent user interface', 'Creation of an engaging user experience flow for seamless navigation', 'Integration of consistent branding elements and color schemes', 'Responsive design for various mobile screen sizes', 'Interactive wireframes and mockups for client review and approval'] },
        { title: 'Development', description: 'Cross-platform mobile app development and backend integration.', features: ['Cross-platform mobile application development such as React Native or Flutter', 'Robust backend development for data management and API integration', 'Secure database setup and management', 'Testing and debugging across multiple devices and operating systems', 'Deployment assistance to Google Play Store and Apple App Store'] }
      ],
      technologyStack: [
        { technology: 'React Native / Flutter', purpose: 'Cross-platform mobile app development' },
        { technology: 'Node.js / Express.js', purpose: 'Backend APIs and app logic' },
        { technology: 'PostgreSQL / Database', purpose: 'Secure structured data storage' },
        { technology: 'Firebase / Push Services', purpose: 'Notifications where applicable' }
      ],
      systemWorkflow: [
        { title: 'User Access', description: 'Users log in and access app features based on their role or account.' },
        { title: 'Mobile Data Flow', description: 'App actions are saved through backend APIs and reflected in admin views.' },
        { title: 'Testing and Release', description: 'App is tested on target devices before deployment or APK/build handover.' }
      ],
      projectCostBreakdown: [
        { component: 'Project Management & Discovery', cost: 5000 },
        { component: 'UI/UX Design & Wireframing', cost: 8000 },
        { component: 'Mobile App Development (Frontend)', cost: 15000 },
        { component: 'Backend Development & API Integration', cost: 10000 },
        { component: 'Testing & Quality Assurance', cost: 4000 },
        { component: 'Deployment & Go-Live Support', cost: 3000 }
      ],
      projectInvestmentDetails: 'Total Cost (One-Time): Rs. 45,000\nSpecial Offer Discounted Price: Rs. 35,000 (One-Time)\nComplimentary Service: Logo Designing.',
      securityAndDataProtection: ['Secure authentication', 'Protected API communication', 'Secure database setup and management', 'Testing and debugging across multiple devices and operating systems'],
      supportAndMaintenance: ['Deployment assistance to Google Play Store and Apple App Store', 'Testing support after delivery', 'Bug fixes for agreed project scope'],
      deliverables: ['Fully developed professional mobile application', 'Backend development and API integration', 'Secure database setup', 'Optimized mobile experience', 'Deployment assistance', 'No hidden charges - fully transparent package'],
      whyUs: ['Robust and intuitive mobile app development', 'Seamless user experience design', 'Cross-platform development approach', 'High-quality cost-effective delivery'],
      termsAndConditions: ['Project timeline is 7-10 working days from the date of 60% advance payment where applicable.', 'The total project cost is all inclusive for the agreed scope.', '60% advance payment is required to start the project.', 'The remaining 40% must be paid before final deployment.', 'All payments made are non-refundable.', 'Third-party accounts, app store charges, domain, hosting, SSL, SMS, maps, or payment gateway charges are separate where applicable.', 'Basic support is included for agreed scope.'],
      agreement: 'This Mobile App Development Agreement is made and entered into between Taruna Technology and the client. By signing below, both parties acknowledge the terms and conditions set forth in this Agreement and commit to fulfill their respective obligations.'
    }
  }
};

const buildDefaultCostRows = (amount = 0) => {
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
      : (total * percent) / 100) : ''
  }));
};

const emptyForms = {
  clientDetails: {
    requirements: '',
    decisionMaker: '',
    businessNeed: '',
    budgetRange: '',
    timeline: '',
    notes: '',
    clientBudgetAmount: '',
    expectedClosingDate: '',
    expectedProjectStartDate: '',
    expectedProjectEndDate: '',
    billingType: 'Fixed Price',
    paymentTerms: 'Milestone Based',
    customPaymentTerms: ''
  },
  quotation: {
    quotationNumber: '',
    amount: '',
    baseAmount: '',
    discountType: 'Percentage',
    discountValue: '',
    taxableAmount: '',
    taxType: 'GST (CGST + SGST)',
    taxRate: 18,
    cgstAmount: '',
    sgstAmount: '',
    igstAmount: '',
    otherCharges: '',
    totalQuotationValue: '',
    paymentTerms: 'Milestone Based',
    quotationStatus: 'Draft',
    currency: 'INR',
    validUntil: '',
    notes: '',
    fileUrl: ''
  },
  proposal: {
    status: 'draft',
    version: 0,
    companyName: '',
    customerName: '',
    proposalType: 'ERP Software',
    title: 'ERP Software Proposal',
    subtitle: '',
    contractDuration: '',
    projectStartDate: '',
    projectEndDate: '',
    commercialPaymentTerms: '',
    pricing: {
      totalPrice: '',
      discountedPrice: '',
      amcCost: '',
      additionalCharges: '',
      recurringCharges: '',
      currency: 'INR'
    },
    validity: { validUntil: '' },
    sections: {
      executiveSummary: '',
      companyIntroduction: '',
      projectObjectives: '',
      proposedSolution: '',
      scopeOfWork: '',
      coreModules: [],
      additionalModules: [],
      technologyStack: [],
      systemWorkflow: [],
      securityAndDataProtection: [],
      hostingAndDeployment: [],
      projectCostBreakdown: [],
      supportAndMaintenance: [],
      deliverables: [],
      conclusion: '',
      hostingDetails: [],
      commercialClarification: [],
      whyUs: [],
      agreement: '',
      warrantyAndSupport: '',
      intellectualPropertyRights: defaultIntellectualPropertyRights,
      hostingThirdPartyServices: defaultHostingThirdPartyServices,
      termination: defaultTermination,
      limitationOfLiability: defaultLimitationOfLiability,
      governingLaw: '',
      termsAndConditions: [],
      projectTimeline: defaultTimelineRows,
      paymentTerms: defaultPaymentRows
    },
    contactDetails: defaultContactDetails,
    signatureDetails: defaultSignatureDetails,
    aiInstructions: '',
    sectionTitles: {},
    pdfUrl: ''
  },
  sentToClient: {
    sentAt: '',
    method: 'Email',
    recipientEmail: '',
    notes: '',
    proposalVersionSent: '',
    expectedClientResponseDate: '',
    clientAcceptanceDate: '',
    acceptanceStatus: 'Pending',
    acceptanceReference: '',
    acceptanceNotes: ''
  },
  negotiation: {
    expectedCloseDate: '',
    notes: '',
    originalQuotationValue: '',
    currentProposedValue: '',
    negotiatedDiscount: '',
    revisedContractValue: '',
    discountReason: '',
    managerApprovalStatus: 'Not Required',
    managerApprovalNotes: '',
    revisionHistory: []
  },
  outcome: {
    status: 'open',
    finalValue: '',
    finalContractValue: '',
    taxInclusive: 'Excluding Tax',
    contractNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    finalPaymentTerms: '',
    initialAdvanceAmount: '',
    billingSchedule: [],
    projectManager: '',
    financeOwner: '',
    contractDocumentRef: '',
    internalApprovedBudget: '',
    internalBudgetNotes: '',
    reason: '',
    notes: '',
    projectId: '',
    projectCode: ''
  }
};

const toInputDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};
const toInputDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '-';
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';

const escapeHtml = (value) => String(value ?? '-')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const asArray = (value) => Array.isArray(value) ? value : [];
const hasTemplateValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.values(value).some(hasTemplateValue);
  return value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '0';
};
const getProposalTypeTemplate = (type = 'ERP Software') =>
  proposalTypeTemplates[proposalTypeOptions.find(option => option.toLowerCase() === String(type || '').toLowerCase())] ||
  proposalTypeTemplates['ERP Software'];

const formatSectionToText = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return String(value);

  return value.map(item => {
    if (item === undefined || item === null) return '';
    if (typeof item === 'string') return item;

    if (item.features !== undefined || (item.title !== undefined && item.description !== undefined && item.features)) {
      const lines = [];
      if (item.title !== undefined) lines.push(item.title);
      if (item.description) lines.push(item.description);
      if (Array.isArray(item.features)) {
        item.features.forEach(f => {
          if (typeof f === 'string') {
            lines.push(f.startsWith('-') ? f : `- ${f}`);
          } else {
            lines.push(String(f));
          }
        });
      }
      return lines.join('\n');
    }

    if (item.title !== undefined || item.technology !== undefined || item.description !== undefined || item.purpose !== undefined) {
      const t = item.title ?? item.technology ?? '';
      const d = item.description ?? item.purpose ?? '';
      if (item.hasDelimiter || (d !== '' && d !== undefined)) {
        return `${t} - ${d}`;
      }
      return t;
    }

    return String(item);
  }).join(value.some(item => typeof item === 'object' && item?.features) ? '\n\n' : '\n');
};

const asNonEmptyArray = (value, fallback = []) => Array.isArray(value) && value.length ? value : fallback;
const leadName = (lead) => `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim();

const getProposalDefaults = (lead, clientDetails, quotation, proposal = {}) => {
  const template = getProposalTypeTemplate(proposal.proposalType || 'ERP Software');
  return {
    ...emptyForms.proposal,
    ...template,
    ...proposal,
    companyName: proposal.companyName || lead?.company || '',
    customerName: proposal.customerName || leadName(lead),
    proposalType: proposal.proposalType || 'ERP Software',
    title: proposal.title || template.title,
    subtitle: proposal.subtitle || template.subtitle || clientDetails?.businessNeed || '',
    description: proposal.description || template.description || '',
    contractDuration: proposal.contractDuration || clientDetails?.timeline || '',
    projectStartDate: toInputDate(proposal.projectStartDate || clientDetails?.expectedProjectStartDate),
    projectEndDate: toInputDate(proposal.projectEndDate || clientDetails?.expectedProjectEndDate),
    commercialPaymentTerms: proposal.commercialPaymentTerms || clientDetails?.paymentTerms || 'Milestone Based',
    pricing: {
      ...emptyForms.proposal.pricing,
      ...(proposal.pricing || {}),
      totalPrice: proposal.pricing?.totalPrice ?? quotation?.totalQuotationValue ?? quotation?.amount ?? lead?.estimatedValue ?? '',
      discountedPrice: proposal.pricing?.discountedPrice ?? '',
      amcCost: proposal.pricing?.amcCost ?? '',
      additionalCharges: proposal.pricing?.additionalCharges ?? '',
      recurringCharges: proposal.pricing?.recurringCharges ?? '',
      currency: proposal.pricing?.currency || quotation?.currency || 'INR'
    },
    validity: {
      ...emptyForms.proposal.validity,
      ...(proposal.validity || {}),
      validUntil: toInputDate(proposal.validity?.validUntil || quotation?.validUntil)
    },
    sections: {
      ...emptyForms.proposal.sections,
      ...(template.sections || {}),
      ...(proposal.sections || {}),
      coreModules: asNonEmptyArray(proposal.sections?.coreModules, template.sections?.coreModules || []),
      technologyStack: asNonEmptyArray(proposal.sections?.technologyStack, template.sections?.technologyStack || []),
      additionalModules: asArray(proposal.sections?.additionalModules),
      systemWorkflow: asNonEmptyArray(proposal.sections?.systemWorkflow, template.sections?.systemWorkflow || []),
      securityAndDataProtection: asNonEmptyArray(proposal.sections?.securityAndDataProtection, template.sections?.securityAndDataProtection || []),
      hostingAndDeployment: asArray(proposal.sections?.hostingAndDeployment),
      projectCostBreakdown: asNonEmptyArray(proposal.sections?.projectCostBreakdown, template.sections?.projectCostBreakdown || buildDefaultCostRows(proposal.pricing?.totalPrice ?? quotation?.amount ?? lead?.estimatedValue)),
      supportAndMaintenance: asNonEmptyArray(proposal.sections?.supportAndMaintenance, template.sections?.supportAndMaintenance || []),
      deliverables: asNonEmptyArray(proposal.sections?.deliverables, template.sections?.deliverables || []),
      hostingDetails: asArray(proposal.sections?.hostingDetails),
      commercialClarification: asArray(proposal.sections?.commercialClarification),
      whyUs: asNonEmptyArray(proposal.sections?.whyUs, template.sections?.whyUs || []),
      termsAndConditions: asNonEmptyArray(proposal.sections?.termsAndConditions, template.sections?.termsAndConditions || []),
      projectTimeline: asNonEmptyArray(proposal.sections?.projectTimeline, defaultTimelineRows),
      paymentTerms: asNonEmptyArray(proposal.sections?.paymentTerms, defaultPaymentRows),
      hostingThirdPartyServices: proposal.sections?.hostingThirdPartyServices || emptyForms.proposal.sections.hostingThirdPartyServices,
      termination: proposal.sections?.termination || emptyForms.proposal.sections.termination,
      limitationOfLiability: proposal.sections?.limitationOfLiability || emptyForms.proposal.sections.limitationOfLiability
    },
    sectionTitles: {
      ...(proposal.sectionTitles || {})
    },
    contactDetails: defaultContactDetails,
    signatureDetails: {
      ...defaultSignatureDetails,
      ...(proposal.signatureDetails || {}),
      clientName: proposal.signatureDetails?.clientName || proposal.customerName || leadName(lead)
    },
    aiInstructions: proposal.aiInstructions || '',
    pdfUrl: proposal.pdfUrl || ''
  };
};

const SalesPipelineModal = ({ lead, role = 'employee', onClose, onUpdated, embedded = false }) => {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [activeStage, setActiveStage] = useState('client_details');
  const pdfUploadRef = useRef(null);
  const modalScrollRef = useRef(null);
  const [forms, setForms] = useState(() => ({
    ...emptyForms,
    clientDetails: {
      ...emptyForms.clientDetails,
      clientBudgetAmount: lead?.estimatedValue !== undefined && lead?.estimatedValue !== null && lead?.estimatedValue !== '' ? lead.estimatedValue : '',
      expectedClosingDate: toInputDate(lead?.expectedCloseDate)
    }
  }));

  // Negotiation revision helper state
  const [revisionNote, setRevisionNote] = useState('');

  const isAdmin = role === 'admin';

  const scrollToTop = () => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    let parent = modalScrollRef.current?.parentElement;
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (['auto', 'scroll'].includes(overflowY) && parent.scrollHeight > parent.clientHeight) {
        parent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      parent = parent.parentElement;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await salesPipelineAPI.getByLead(lead._id);
      if (res.data.success) {
        hydrate(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  const hydrate = (data) => {
    setPipeline(data);
    const initialStage = data.currentStage === 'admin_approval' ? 'proposal' : (data.currentStage || 'client_details');
    setActiveStage(prev => prev === 'admin_approval' ? 'proposal' : (prev || initialStage));

    const quot = data.quotation || {};
    const baseAmt = quot.baseAmount !== undefined && quot.baseAmount !== null ? quot.baseAmount : (quot.amount || lead.estimatedValue || '');
    const totQuotVal = quot.totalQuotationValue !== undefined && quot.totalQuotationValue !== null ? quot.totalQuotationValue : (quot.amount || '');

    const prop = data.proposal || {};
    const neg = data.negotiation || {};
    const out = data.outcome || {};

    const origQuotVal = neg.originalQuotationValue !== undefined && neg.originalQuotationValue !== null && neg.originalQuotationValue !== ''
      ? neg.originalQuotationValue
      : (totQuotVal || quot.amount || lead.estimatedValue || '');

    const currPropVal = neg.currentProposedValue !== undefined && neg.currentProposedValue !== null && neg.currentProposedValue !== ''
      ? neg.currentProposedValue
      : (prop.pricing?.discountedPrice || prop.pricing?.totalPrice || totQuotVal || quot.amount || '');

    const finalVal = out.finalContractValue !== undefined && out.finalContractValue !== null && out.finalContractValue !== ''
      ? out.finalContractValue
      : (out.finalValue !== undefined && out.finalValue !== null && out.finalValue !== '' ? out.finalValue : (neg.revisedContractValue || currPropVal || origQuotVal || ''));

    const leadExpectedCloseDate = data.clientDetails?.expectedClosingDate || data.lead?.expectedCloseDate || lead?.expectedCloseDate;
    const leadClientBudget = (data.clientDetails?.clientBudgetAmount !== undefined && data.clientDetails?.clientBudgetAmount !== null && data.clientDetails?.clientBudgetAmount !== '')
      ? data.clientDetails.clientBudgetAmount
      : (data.lead?.estimatedValue !== undefined && data.lead?.estimatedValue !== null && data.lead?.estimatedValue !== ''
        ? data.lead.estimatedValue
        : (lead?.estimatedValue !== undefined && lead?.estimatedValue !== null && lead?.estimatedValue !== ''
          ? lead.estimatedValue
          : ''));

    setForms({
      clientDetails: {
        ...emptyForms.clientDetails,
        ...(data.clientDetails || {}),
        clientBudgetAmount: leadClientBudget,
        expectedClosingDate: toInputDate(leadExpectedCloseDate),
        expectedProjectStartDate: toInputDate(data.clientDetails?.expectedProjectStartDate),
        expectedProjectEndDate: toInputDate(data.clientDetails?.expectedProjectEndDate),
        billingType: data.clientDetails?.billingType || 'Fixed Price',
        paymentTerms: data.clientDetails?.paymentTerms || 'Milestone Based',
        customPaymentTerms: data.clientDetails?.customPaymentTerms || ''
      },
      quotation: {
        ...emptyForms.quotation,
        ...quot,
        validUntil: toInputDate(quot.validUntil),
        amount: quot.amount ?? totQuotVal ?? '',
        baseAmount: baseAmt,
        discountType: quot.discountType || 'Percentage',
        discountValue: quot.discountValue ?? '',
        taxableAmount: quot.taxableAmount ?? baseAmt,
        taxType: quot.taxType || 'GST (CGST + SGST)',
        taxRate: quot.taxRate ?? 18,
        cgstAmount: quot.cgstAmount ?? '',
        sgstAmount: quot.sgstAmount ?? '',
        igstAmount: quot.igstAmount ?? '',
        otherCharges: quot.otherCharges ?? '',
        totalQuotationValue: totQuotVal,
        paymentTerms: quot.paymentTerms || data.clientDetails?.paymentTerms || 'Milestone Based',
        quotationStatus: quot.quotationStatus || 'Draft'
      },
      proposal: getProposalDefaults(lead, data.clientDetails || {}, quot, prop),
      sentToClient: {
        ...emptyForms.sentToClient,
        ...(data.sentToClient || {}),
        sentAt: toInputDateTime(data.sentToClient?.sentAt),
        recipientEmail: data.sentToClient?.recipientEmail || lead.email || '',
        proposalVersionSent: data.sentToClient?.proposalVersionSent || `v${prop.version || 1}`,
        expectedClientResponseDate: toInputDate(data.sentToClient?.expectedClientResponseDate),
        clientAcceptanceDate: toInputDate(data.sentToClient?.clientAcceptanceDate),
        acceptanceStatus: data.sentToClient?.acceptanceStatus || 'Pending',
        acceptanceReference: data.sentToClient?.acceptanceReference || '',
        acceptanceNotes: data.sentToClient?.acceptanceNotes || ''
      },
      negotiation: {
        ...emptyForms.negotiation,
        ...neg,
        expectedCloseDate: toInputDate(neg.expectedCloseDate),
        originalQuotationValue: origQuotVal,
        currentProposedValue: currPropVal,
        negotiatedDiscount: neg.negotiatedDiscount ?? '',
        revisedContractValue: neg.revisedContractValue ?? '',
        discountReason: neg.discountReason || 'Scope Adjustment',
        managerApprovalStatus: neg.managerApprovalStatus || 'Not Required',
        managerApprovalNotes: neg.managerApprovalNotes || '',
        revisionHistory: asArray(neg.revisionHistory)
      },
      outcome: {
        ...emptyForms.outcome,
        ...out,
        finalValue: finalVal,
        finalContractValue: finalVal,
        taxInclusive: out.taxInclusive || 'Excluding Tax',
        contractNumber: out.contractNumber || '',
        contractStartDate: toInputDate(out.contractStartDate || prop.projectStartDate || data.clientDetails?.expectedProjectStartDate),
        contractEndDate: toInputDate(out.contractEndDate || prop.projectEndDate || data.clientDetails?.expectedProjectEndDate),
        finalPaymentTerms: out.finalPaymentTerms || prop.commercialPaymentTerms || quot.paymentTerms || 'Milestone Based',
        initialAdvanceAmount: out.initialAdvanceAmount ?? '',
        billingSchedule: asArray(out.billingSchedule).length ? out.billingSchedule : (asArray(prop.sections?.paymentTerms).map(p => ({
          milestone: p.milestone || '',
          description: p.description || '',
          percentage: p.percentage || '',
          amount: finalVal && p.percentage ? Math.round((Number(finalVal) * Number(p.percentage)) / 100) : '',
          dueDate: ''
        }))),
        projectManager: out.projectManager || '',
        financeOwner: out.financeOwner || '',
        contractDocumentRef: out.contractDocumentRef || '',
        internalApprovedBudget: out.internalApprovedBudget ?? '',
        internalBudgetNotes: out.internalBudgetNotes || '',
        projectId: out.projectId || '',
        projectCode: out.projectCode || ''
      }
    });
  };

  useEffect(() => {
    if (lead?._id) {
      setForms({
        ...emptyForms,
        clientDetails: {
          ...emptyForms.clientDetails,
          clientBudgetAmount: lead.estimatedValue !== undefined && lead.estimatedValue !== null && lead.estimatedValue !== '' ? lead.estimatedValue : '',
          expectedClosingDate: toInputDate(lead.expectedCloseDate)
        }
      });
      loadPipeline();
    }
  }, [lead?._id]);

  const updateForm = (section, key, value) => {
    setForms(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  // Safe Quotation financial calculations
  const updateQuotationField = (key, value) => {
    setForms(prev => {
      const q = { ...prev.quotation, [key]: value };
      const base = Number(q.baseAmount || 0);
      const discVal = Number(q.discountValue || 0);
      let discAmt = 0;
      if (q.discountType === 'Percentage') {
        discAmt = (base * discVal) / 100;
      } else {
        discAmt = discVal;
      }
      const taxable = Math.max(0, base - discAmt);
      const rate = Number(q.taxRate ?? 18);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (q.taxType === 'GST (CGST + SGST)') {
        cgst = Math.round(((taxable * (rate / 2)) / 100) * 100) / 100;
        sgst = Math.round(((taxable * (rate / 2)) / 100) * 100) / 100;
      } else if (q.taxType === 'IGST') {
        igst = Math.round(((taxable * rate) / 100) * 100) / 100;
      }

      const other = Number(q.otherCharges || 0);
      const total = Math.round((taxable + cgst + sgst + igst + other) * 100) / 100;

      return {
        ...prev,
        quotation: {
          ...q,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalQuotationValue: total,
          amount: total
        }
      };
    });
  };

  // Safe Negotiation financial updater
  const updateNegotiationRevisedValue = (value) => {
    setForms(prev => {
      const orig = Number(prev.negotiation.originalQuotationValue || prev.quotation.totalQuotationValue || prev.quotation.amount || 0);
      const revised = Number(value || 0);
      const discount = orig > revised && revised > 0 ? orig - revised : '';
      return {
        ...prev,
        negotiation: {
          ...prev.negotiation,
          revisedContractValue: value,
          negotiatedDiscount: discount
        }
      };
    });
  };

  // Log negotiation revision
  const addNegotiationRevision = () => {
    const revised = Number(forms.negotiation.revisedContractValue || 0);
    if (!revised) {
      toast.error('Please enter a revised contract value first');
      return;
    }
    const revision = {
      date: new Date().toISOString(),
      revisedContractValue: revised,
      negotiatedDiscount: Number(forms.negotiation.negotiatedDiscount || 0),
      discountReason: forms.negotiation.discountReason || 'Negotiation',
      notes: revisionNote || forms.negotiation.notes || '',
      managerApprovalStatus: forms.negotiation.managerApprovalStatus || 'Not Required'
    };
    setForms(prev => ({
      ...prev,
      negotiation: {
        ...prev.negotiation,
        revisionHistory: [revision, ...asArray(prev.negotiation.revisionHistory)]
      }
    }));
    setRevisionNote('');
    toast.success('Commercial revision logged to history');
  };

  // Import milestones from proposal into Won / Closed billing schedule
  const importMilestonesFromProposal = () => {
    const milestones = asArray(forms.proposal.sections?.paymentTerms);
    if (!milestones.length) {
      toast.error('No payment milestones configured in proposal');
      return;
    }
    const contractVal = Number(forms.outcome.finalContractValue || forms.outcome.finalValue || forms.proposal.pricing?.discountedPrice || forms.proposal.pricing?.totalPrice || 0);
    const schedule = milestones.map(m => ({
      milestone: m.milestone || 'Milestone',
      description: m.description || '',
      percentage: m.percentage || '',
      amount: contractVal && m.percentage ? Math.round((contractVal * Number(m.percentage)) / 100) : '',
      dueDate: ''
    }));
    setForms(prev => ({
      ...prev,
      outcome: {
        ...prev.outcome,
        billingSchedule: schedule
      }
    }));
    toast.success('Milestones imported into billing schedule');
  };

  const updateProposal = (key, value) => {
    setForms(prev => ({ ...prev, proposal: { ...prev.proposal, [key]: value } }));
  };

  const updateProposalType = (proposalType) => {
    const template = getProposalTypeTemplate(proposalType);
    setForms(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        proposalType,
        title: template.title,
        subtitle: template.subtitle,
        description: template.description,
        sections: {
          ...prev.proposal.sections,
          ...(template.sections || {}),
          projectCostBreakdown: template.sections?.projectCostBreakdown?.length
            ? template.sections.projectCostBreakdown
            : buildDefaultCostRows(prev.proposal.pricing?.totalPrice),
          projectTimeline: prev.proposal.sections?.projectTimeline?.length
            ? prev.proposal.sections.projectTimeline
            : defaultTimelineRows,
          paymentTerms: prev.proposal.sections?.paymentTerms?.length
            ? prev.proposal.sections.paymentTerms
            : defaultPaymentRows
        },
        contactDetails: defaultContactDetails
      }
    }));
  };

  const updateProposalNested = (group, key, value) => {
    setForms(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        [group]: { ...(prev.proposal[group] || {}), [key]: value }
      }
    }));
  };

  const updateProposalSection = (key, value) => updateProposalNested('sections', key, value);

  const updateProposalSectionRow = (sectionKey, index, field, value) => {
    setForms(prev => {
      const rows = asArray(prev.proposal.sections?.[sectionKey]);
      const nextRows = rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const updated = { ...row, [field]: value };
        // Auto-calculate amount for payment milestones if percentage changes
        if (sectionKey === 'paymentTerms' && field === 'percentage') {
          const totalVal = Number(prev.proposal.pricing?.discountedPrice || prev.proposal.pricing?.totalPrice || 0);
          if (totalVal && value) {
            updated.amount = Math.round((totalVal * Number(value)) / 100);
          }
        }
        return updated;
      });
      return {
        ...prev,
        proposal: {
          ...prev.proposal,
          sections: { ...(prev.proposal.sections || {}), [sectionKey]: nextRows }
        }
      };
    });
  };

  const addProposalSectionRow = (sectionKey, row) => {
    setForms(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        sections: {
          ...(prev.proposal.sections || {}),
          [sectionKey]: [...asArray(prev.proposal.sections?.[sectionKey]), row]
        }
      }
    }));
  };

  const removeProposalSectionRow = (sectionKey, index) => {
    setForms(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        sections: {
          ...(prev.proposal.sections || {}),
          [sectionKey]: asArray(prev.proposal.sections?.[sectionKey]).filter((_, rowIndex) => rowIndex !== index)
        }
      }
    }));
  };

  const updateProposalObject = (group, key, value) => {
    setForms(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        [group]: { ...(prev.proposal[group] || {}), [key]: value }
      }
    }));
  };

  const proposalSectionText = (key) => {
    const value = forms.proposal.sections?.[key];
    return formatSectionToText(value);
  };

  const updateProposalSectionFromText = (key, type, value) => {
    if (type === 'text') {
      updateProposalSection(key, value);
      return;
    }
    if (type === 'modules') {
      const blocks = value.split(/\n\s*\n/);
      const modules = blocks.map(block => {
        const lines = block.split('\n');
        const title = lines[0] || '';
        let description = '';
        let featureStartIndex = 1;
        if (lines[1] && !lines[1].startsWith('-')) {
          description = lines[1];
          featureStartIndex = 2;
        }
        const features = lines.slice(featureStartIndex).map(line => {
          if (line.startsWith('- ')) return line.slice(2);
          if (line.startsWith('-')) return line.slice(1);
          return line;
        });
        return { title, description, features };
      });
      updateProposalSection(key, modules);
      return;
    }
    if (type === 'pairs') {
      const pairs = value.split('\n').map(line => {
        const delimiterIndex = line.indexOf(' - ');
        if (delimiterIndex === -1) {
          return { title: line, description: '' };
        }
        return {
          title: line.slice(0, delimiterIndex),
          description: line.slice(delimiterIndex + 3),
          hasDelimiter: true
        };
      });
      updateProposalSection(key, pairs);
      return;
    }
    updateProposalSection(key, value.split('\n'));
  };

  const saveProposal = async (status = forms.proposal.status || 'draft') => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.saveProposal(lead._id, { ...forms.proposal, status });
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Proposal saved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  const generateProposalWithAI = async () => {
    if (forms.proposal.status === 'generated' || forms.proposal.contentVersion > 0) {
      const ok = window.confirm('This proposal already contains generated content. Generate again and replace AI-generated sections?');
      if (!ok) return;
    }
    try {
      setSaving(true);
      toast.loading('Generating proposal content...', { id: 'proposal-ai' });
      const res = await salesPipelineAPI.generateProposal(lead._id, forms.proposal);
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Proposal generated with AI', { id: 'proposal-ai' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate proposal with AI', { id: 'proposal-ai' });
    } finally {
      setSaving(false);
    }
  };

  const improveProposalSection = async (section) => {
    try {
      setSaving(true);
      toast.loading(`Improving ${section}...`, { id: 'proposal-section' });
      const res = await salesPipelineAPI.generateProposalSection(lead._id, { section, instruction: forms.proposal.aiInstructions });
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success(`Updated ${section}`, { id: 'proposal-section' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to improve ${section}`, { id: 'proposal-section' });
    } finally {
      setSaving(false);
    }
  };

  const generateProposalPdf = async (autoDownload = false) => {
    try {
      setSaving(true);
      toast.loading('Generating proposal PDF...', { id: 'proposal-pdf' });
      const res = await salesPipelineAPI.generateProposalPdf(lead._id, forms.proposal);
      if (res.data.success && res.data.pdfUrl) {
        hydrate(res.data.data);
        onUpdated?.();
        const fullUrl = getApiFileUrl(res.data.pdfUrl);
        toast.success('Proposal PDF ready', { id: 'proposal-pdf' });
        if (autoDownload) {
          const a = document.createElement('a');
          a.href = fullUrl;
          a.download = `Proposal_${lead.company || lead.lastName || 'document'}.pdf`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.open(fullUrl, '_blank');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate PDF', { id: 'proposal-pdf' });
    } finally {
      setSaving(false);
    }
  };

  const handleExtractProposalFromPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF file.');
      return;
    }
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      setExtractingPdf(true);
      toast.loading('Extracting data from PDF...', { id: 'pdf-extract' });
      const res = await salesPipelineAPI.extractProposalFromPdf(lead._id, formData);
      if (res.data.success && res.data.data) {
        const extracted = res.data.data;
        setForms(prev => ({
          ...prev,
          proposal: {
            ...prev.proposal,
            ...(extracted.companyName ? { companyName: extracted.companyName } : {}),
            ...(extracted.customerName ? { customerName: extracted.customerName } : {}),
            ...(extracted.proposalType ? { proposalType: extracted.proposalType } : {}),
            ...(extracted.title ? { title: extracted.title } : {}),
            ...(extracted.subtitle ? { subtitle: extracted.subtitle } : {}),
            ...(extracted.description ? { description: extracted.description } : {}),
            pricing: {
              ...prev.proposal.pricing,
              ...(extracted.pricing || {})
            },
            sections: {
              ...prev.proposal.sections,
              ...(extracted.sections || {})
            }
          }
        }));
        toast.success('Proposal fields populated from PDF!', { id: 'pdf-extract' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to extract from PDF', { id: 'pdf-extract' });
    } finally {
      setExtractingPdf(false);
      if (pdfUploadRef.current) pdfUploadRef.current.value = '';
    }
  };

  const saveSection = async (section) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.updateSection(lead._id, section, forms[section]);
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        if (res.data.project) {
          toast.success(`Project ${res.data.project.projectCode} established!`);
        } else {
          toast.success('Pipeline updated');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pipeline');
    } finally {
      setSaving(false);
    }
  };

  const transition = async (stage, comments) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.transitionStage(lead._id, { stage, comments });
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Stage updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const generateQuotationPdf = () => {
    const client = forms.clientDetails;
    const quotation = forms.quotation;
    const clientName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client';
    const curr = quotation.currency || 'INR';
    const currSym = curr === 'INR' ? '₹' : `${curr} `;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      toast.error('Please allow pop-ups to generate the quotation PDF');
      return;
    }

    const safeFileName = (quotation.quotationNumber || clientName || 'quotation').replace(/[^a-z0-9_-]+/gi, '_');
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Quotation_${escapeHtml(safeFileName)}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
              line-height: 1.45;
            }
            .sheet { width: 100%; }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            .eyebrow {
              margin: 0 0 6px;
              color: #2563eb;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            h1 {
              margin: 0;
              font-size: 26px;
            }
            .meta {
              min-width: 220px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #f8fafc;
              padding: 12px;
              font-size: 12px;
            }
            .meta div { display: flex; justify-content: space-between; gap: 12px; margin-top: 5px; }
            .section {
              margin-top: 16px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
            }
            .section h2 {
              margin: 0;
              padding: 8px 14px;
              background: #f1f5f9;
              font-size: 12px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0;
            }
            .field {
              min-height: 52px;
              border-top: 1px solid #e2e8f0;
              padding: 8px 14px;
            }
            .field:nth-child(odd) { border-right: 1px solid #e2e8f0; }
            .wide { grid-column: 1 / -1; border-right: 0 !important; }
            .label {
              margin: 0 0 3px;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            .value {
              margin: 0;
              color: #0f172a;
              font-size: 12px;
              font-weight: 600;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }
            .table-fin {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            .table-fin th {
              background: #0f172a;
              color: #ffffff;
              padding: 8px 12px;
              text-align: left;
            }
            .table-fin td {
              padding: 8px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .table-fin tr:last-child td {
              font-weight: bold;
              background: #f8fafc;
              border-top: 2px solid #0f172a;
              border-bottom: 0;
            }
            .amount-total {
              color: #047857;
              font-size: 16px;
              font-weight: 800;
            }
            .footer {
              margin-top: 22px;
              color: #64748b;
              font-size: 11px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="header">
              <div>
                <p class="eyebrow">Commercial Quotation</p>
                <h1>${escapeHtml(clientName)}</h1>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${escapeHtml(lead.company || 'No company')}</p>
              </div>
              <div class="meta">
                <div><strong>Quotation #</strong><span>${escapeHtml(quotation.quotationNumber || '-')}</span></div>
                <div><strong>Date</strong><span>${escapeHtml(formatDate(new Date()))}</span></div>
                <div><strong>Valid Until</strong><span>${escapeHtml(formatDate(quotation.validUntil))}</span></div>
                <div><strong>Status</strong><span>${escapeHtml(quotation.quotationStatus || 'Draft')}</span></div>
              </div>
            </header>

            <section class="section">
              <h2>Client & Project Scope</h2>
              <div class="grid">
                <div class="field"><p class="label">Email</p><p class="value">${escapeHtml(lead.email || '-')}</p></div>
                <div class="field"><p class="label">Phone</p><p class="value">${escapeHtml(lead.phone || '-')}</p></div>
                <div class="field"><p class="label">Decision Maker</p><p class="value">${escapeHtml(client.decisionMaker || '-')}</p></div>
                <div class="field"><p class="label">Billing Type</p><p class="value">${escapeHtml(client.billingType || '-')}</p></div>
                <div class="field"><p class="label">Payment Terms</p><p class="value">${escapeHtml(quotation.paymentTerms || client.paymentTerms || '-')}</p></div>
                <div class="field"><p class="label">Client Budget</p><p class="value">${client.clientBudgetAmount ? `${currSym}${Number(client.clientBudgetAmount).toLocaleString('en-IN')}` : '-'}</p></div>
                <div class="field wide"><p class="label">Business Need</p><p class="value">${escapeHtml(client.businessNeed || '-')}</p></div>
                <div class="field wide"><p class="label">Requirements</p><p class="value">${escapeHtml(client.requirements || '-')}</p></div>
              </div>
            </section>

            <section class="section">
              <h2>Commercial & Financial Breakdown</h2>
              <table class="table-fin">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th style="text-align: right;">Details</th>
                    <th style="text-align: right;">Amount (${escapeHtml(curr)})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Base Amount</td>
                    <td style="text-align: right;">Initial Quoted Value</td>
                    <td style="text-align: right;">${quotation.baseAmount ? Number(quotation.baseAmount).toLocaleString('en-IN') : (quotation.amount ? Number(quotation.amount).toLocaleString('en-IN') : '0')}</td>
                  </tr>
                  ${quotation.discountValue ? `
                    <tr>
                      <td>Discount</td>
                      <td style="text-align: right;">${escapeHtml(quotation.discountType)} (${quotation.discountValue}${quotation.discountType === 'Percentage' ? '%' : ''})</td>
                      <td style="text-align: right; color: #dc2626;">- ${(quotation.discountType === 'Percentage' ? (Number(quotation.baseAmount || 0) * Number(quotation.discountValue) / 100) : Number(quotation.discountValue)).toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td>Taxable Amount</td>
                    <td style="text-align: right;">Net of Discounts</td>
                    <td style="text-align: right;">${quotation.taxableAmount ? Number(quotation.taxableAmount).toLocaleString('en-IN') : '0'}</td>
                  </tr>
                  ${quotation.taxType === 'GST (CGST + SGST)' ? `
                    <tr>
                      <td>CGST (${Number(quotation.taxRate || 18) / 2}%)</td>
                      <td style="text-align: right;">Central GST</td>
                      <td style="text-align: right;">${quotation.cgstAmount ? Number(quotation.cgstAmount).toLocaleString('en-IN') : '0'}</td>
                    </tr>
                    <tr>
                      <td>SGST (${Number(quotation.taxRate || 18) / 2}%)</td>
                      <td style="text-align: right;">State GST</td>
                      <td style="text-align: right;">${quotation.sgstAmount ? Number(quotation.sgstAmount).toLocaleString('en-IN') : '0'}</td>
                    </tr>
                  ` : quotation.taxType === 'IGST' ? `
                    <tr>
                      <td>IGST (${Number(quotation.taxRate || 18)}%)</td>
                      <td style="text-align: right;">Integrated GST</td>
                      <td style="text-align: right;">${quotation.igstAmount ? Number(quotation.igstAmount).toLocaleString('en-IN') : '0'}</td>
                    </tr>
                  ` : ''}
                  ${quotation.otherCharges ? `
                    <tr>
                      <td>Other Charges</td>
                      <td style="text-align: right;">Additional Services</td>
                      <td style="text-align: right;">${Number(quotation.otherCharges).toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="font-size: 14px;">Total Quotation Value</td>
                    <td style="text-align: right;">${escapeHtml(quotation.paymentTerms || 'As agreed')}</td>
                    <td style="text-align: right;" class="amount-total">${currSym}${Number(quotation.totalQuotationValue || quotation.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            ${quotation.notes ? `
              <section class="section">
                <h2>Quotation Notes & Terms</h2>
                <div class="field wide">
                  <p class="value">${escapeHtml(quotation.notes)}</p>
                </div>
              </section>
            ` : ''}

            <p class="footer">Taruna Technology • Commercial Quotation Document</p>
          </main>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Milestone percentage check
  const proposalMilestones = asArray(forms.proposal.sections?.paymentTerms);
  const totalMilestonePercentage = proposalMilestones.reduce((acc, row) => acc + Number(row.percentage || 0), 0);
  const isMilestonePercentageValid = totalMilestonePercentage === 100 || proposalMilestones.length === 0;

  const content = (
    <div className={`${embedded ? 'w-full min-w-0 max-w-full flex flex-col bg-transparent border-0 p-0 shadow-none' : `flex flex-col h-[92vh] sm:h-[95vh] max-h-[96vh] w-full ${isAdmin ? 'max-w-7xl' : 'max-w-5xl'} overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-xl`} employee-sales-pipeline-modal`}>
      <style>{`
          @keyframes pipelineStageIn {
            from { opacity: 0; transform: translateY(10px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .pipeline-stage-panel {
            animation: pipelineStageIn 0.28s ease-out both;
          }
          .pipeline-modal-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .pipeline-modal-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-[17px] sm:text-[20px] font-semibold tracking-tight text-slate-900 leading-tight">
            {lead.firstName} {lead.lastName}
            <span className="font-normal text-slate-400"> • {lead.company || 'No company'}</span>
          </h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
          Loading pipeline...
        </div>
      ) : (
        <div ref={modalScrollRef} className={`pipeline-modal-scroll flex-1 min-w-0 max-w-full ${embedded ? 'min-h-0' : 'overflow-y-auto overscroll-y-contain'} space-y-3 sm:space-y-5 pr-0.5 touch-pan-y`}>
          <StageStepper currentStage={pipeline?.currentStage} activeStage={activeStage} onSelect={setActiveStage} />

          <div key={activeStage} className="pipeline-stage-panel rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3.5 sm:p-5 shadow-sm min-w-0 w-full max-w-full overflow-hidden sm:overflow-visible">
            
            {/* STAGE 1: CLIENT DETAILS */}
            {activeStage === 'client_details' && (
              <section>
                <StageHeading title="Client Details" subtitle="Lead profile, qualification, stated client budget, and timeline expectations" />
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm sm:grid-cols-3 rounded-xl border border-slate-200 bg-white p-3 mb-4 shadow-xs">
                  <Info label="Client Name" value={`${lead.firstName} ${lead.lastName}`} />
                  <Info label="Email" value={lead.email} />
                  <Info label="Phone" value={lead.phone} />
                  <Info label="Company" value={lead.company || '-'} />
                  <Info label="Estimated Value" value={lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString('en-IN')}` : '-'} />
                  <Info label="Lead Status" value={lead.status} />
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Commercial & Budget Expectations</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Client Stated Budget (₹)"
                        type="number"
                        value={forms.clientDetails.clientBudgetAmount}
                        onChange={v => updateForm('clientDetails', 'clientBudgetAmount', v)}
                      />
                      <Select
                        label="Billing Type"
                        value={forms.clientDetails.billingType}
                        onChange={v => updateForm('clientDetails', 'billingType', v)}
                        options={billingTypeOptions}
                      />
                      <Select
                        label="Proposed Payment Terms"
                        value={forms.clientDetails.paymentTerms}
                        onChange={v => updateForm('clientDetails', 'paymentTerms', v)}
                        options={paymentTermsOptions}
                      />
                    </div>
                    {forms.clientDetails.paymentTerms === 'Custom' && (
                      <div className="mt-2.5">
                        <Input
                          label="Custom Payment Terms Description"
                          value={forms.clientDetails.customPaymentTerms}
                          onChange={v => updateForm('clientDetails', 'customPaymentTerms', v)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Expected Closing Date" type="date" value={forms.clientDetails.expectedClosingDate} onChange={v => updateForm('clientDetails', 'expectedClosingDate', v)} />
                    <Input label="Expected Project Start Date" type="date" value={forms.clientDetails.expectedProjectStartDate} onChange={v => updateForm('clientDetails', 'expectedProjectStartDate', v)} />
                    <Input label="Expected Project End Date" type="date" value={forms.clientDetails.expectedProjectEndDate} onChange={v => updateForm('clientDetails', 'expectedProjectEndDate', v)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Decision Maker" value={forms.clientDetails.decisionMaker} onChange={v => updateForm('clientDetails', 'decisionMaker', v)} />
                    <Input label="Budget Range (Text)" value={forms.clientDetails.budgetRange} onChange={v => updateForm('clientDetails', 'budgetRange', v)} />
                    <Input label="Timeline (Text)" value={forms.clientDetails.timeline} onChange={v => updateForm('clientDetails', 'timeline', v)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Textarea label="Business Need" value={forms.clientDetails.businessNeed} onChange={v => updateForm('clientDetails', 'businessNeed', v)} />
                    <Textarea label="Requirements" value={forms.clientDetails.requirements} onChange={v => updateForm('clientDetails', 'requirements', v)} />
                  </div>
                </div>

                <SectionActions onSave={() => saveSection('clientDetails')} disabled={saving} />
              </section>
            )}

            {/* STAGE 2: QUOTATION DETAILS */}
            {activeStage === 'quotation' && (
              <section>
                <StageHeading title="Quotation Details" subtitle="Comprehensive commercial breakdown, taxes, payment terms, and PDF export" icon={<FileText className="h-4 w-4 text-blue-600" />} />
                
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Quotation Number" value={forms.quotation.quotationNumber} onChange={v => updateQuotationField('quotationNumber', v)} />
                    <Select label="Quotation Status" value={forms.quotation.quotationStatus} onChange={v => updateQuotationField('quotationStatus', v)} options={quotationStatusOptions} />
                    <Input label="Valid Until" type="date" value={forms.quotation.validUntil} onChange={v => updateQuotationField('validUntil', v)} />
                  </div>

                  {/* Commercial Breakdown Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commercial Breakdown & Tax Calculation</h4>
                    
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Base Amount (₹)"
                        type="number"
                        value={forms.quotation.baseAmount}
                        onChange={v => updateQuotationField('baseAmount', v)}
                      />
                      <Select
                        label="Discount Type"
                        value={forms.quotation.discountType}
                        onChange={v => updateQuotationField('discountType', v)}
                        options={['Percentage', 'Fixed Amount']}
                      />
                      <Input
                        label={forms.quotation.discountType === 'Percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                        type="number"
                        value={forms.quotation.discountValue}
                        onChange={v => updateQuotationField('discountValue', v)}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Taxable Amount (₹)"
                        type="number"
                        value={forms.quotation.taxableAmount}
                        onChange={v => updateQuotationField('taxableAmount', v)}
                      />
                      <Select
                        label="Tax Type"
                        value={forms.quotation.taxType}
                        onChange={v => updateQuotationField('taxType', v)}
                        options={['GST (CGST + SGST)', 'IGST', 'None']}
                      />
                      <Input
                        label="Tax Rate (%)"
                        type="number"
                        value={forms.quotation.taxRate}
                        onChange={v => updateQuotationField('taxRate', v)}
                      />
                    </div>

                    {forms.quotation.taxType === 'GST (CGST + SGST)' && (
                      <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <Input
                          label={`CGST (${Number(forms.quotation.taxRate || 18) / 2}%) (₹)`}
                          type="number"
                          value={forms.quotation.cgstAmount}
                          onChange={v => updateQuotationField('cgstAmount', v)}
                        />
                        <Input
                          label={`SGST (${Number(forms.quotation.taxRate || 18) / 2}%) (₹)`}
                          type="number"
                          value={forms.quotation.sgstAmount}
                          onChange={v => updateQuotationField('sgstAmount', v)}
                        />
                      </div>
                    )}

                    {forms.quotation.taxType === 'IGST' && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <Input
                          label={`IGST (${Number(forms.quotation.taxRate || 18)}%) (₹)`}
                          type="number"
                          value={forms.quotation.igstAmount}
                          onChange={v => updateQuotationField('igstAmount', v)}
                        />
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Other Charges (₹)"
                        type="number"
                        value={forms.quotation.otherCharges}
                        onChange={v => updateQuotationField('otherCharges', v)}
                      />
                      <Select
                        label="Payment Terms"
                        value={forms.quotation.paymentTerms}
                        onChange={v => updateQuotationField('paymentTerms', v)}
                        options={paymentTermsOptions}
                      />
                    </div>

                    {/* Total Quotation Highlight */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-950">
                      <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Quotation Value (Authoritative)</span>
                        <p className="text-xs text-emerald-600">Calculated sum of taxable value, applicable GST, and other charges</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl sm:text-2xl font-black text-emerald-700">
                          ₹{Number(forms.quotation.totalQuotationValue || forms.quotation.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Textarea label="Quotation Notes" value={forms.quotation.notes} onChange={v => updateForm('quotation', 'notes', v)} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={() => saveSection('quotation')} disabled={saving} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 shadow-xs">
                    Save Section
                  </button>
                  <button
                    type="button"
                    onClick={generateQuotationPdf}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 shadow-xs"
                  >
                    <Download className="h-4 w-4" />
                    Generate PDF
                  </button>
                  <button onClick={() => transition('proposal', 'Proceeded to proposal stage')} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 shadow-xs">
                    Proceed to Proposal
                  </button>
                </div>
              </section>
            )}

            {/* STAGE 3: PROPOSAL */}
            {activeStage === 'proposal' && (
              <section>
                <StageHeading
                  title="Proposal"
                  subtitle="Generate, customize, configure commercial milestones, and export proposal document"
                  icon={<FileText className="h-4 w-4 text-indigo-600" />}
                  actions={
                    <>
                      <input
                        ref={pdfUploadRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleExtractProposalFromPdf}
                      />
                      <button
                        type="button"
                        onClick={() => pdfUploadRef.current?.click()}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        {extractingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Upload className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{extractingPdf ? 'Extracting...' : 'Upload PDF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={generateProposalWithAI}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-fuchsia-600 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white transition hover:bg-fuchsia-700 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-200" />
                        <span className="truncate">Generate with AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProposal('draft')}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        <Save className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">Save Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProposal('finalized')}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Save Final</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => generateProposalPdf(false)}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">View PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => transition('sent_to_client', 'Proposal completed and ready to send')}
                        disabled={saving || extractingPdf}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 shadow-xs w-full sm:w-auto truncate"
                      >
                        <Send className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Send to Client Stage</span>
                      </button>
                    </>
                  }
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(420px,1.25fr)] xl:items-start min-w-0 w-full max-w-full">
                  <div className="space-y-4 xl:max-h-[84vh] xl:overflow-y-auto pr-1 xl:pr-2">
                    
                    {/* Core Proposal Metadata */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Company Name" value={forms.proposal.companyName} onChange={v => updateProposal('companyName', v)} />
                      <Input label="Customer Name" value={forms.proposal.customerName} onChange={v => updateProposal('customerName', v)} />
                      <Select label="Proposal Type" value={forms.proposal.proposalType} onChange={updateProposalType} options={proposalTypeOptions} />
                      <Input label="Proposal Title" value={forms.proposal.title} onChange={v => updateProposal('title', v)} />
                      <Input label="Proposal Subtitle" value={forms.proposal.subtitle} onChange={v => updateProposal('subtitle', v)} />
                      <Input label="Valid Until" type="date" value={forms.proposal.validity?.validUntil} onChange={v => updateProposalNested('validity', 'validUntil', v)} />
                    </div>

                    {/* Commercial Agreement & Dates */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Commercial Agreement & Charges</h4>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input label="Contract Duration" value={forms.proposal.contractDuration} onChange={v => updateProposal('contractDuration', v)} />
                        <Input label="Project Start Date" type="date" value={forms.proposal.projectStartDate} onChange={v => updateProposal('projectStartDate', v)} />
                        <Input label="Project End Date" type="date" value={forms.proposal.projectEndDate} onChange={v => updateProposal('projectEndDate', v)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input label="Total Quoted Price (₹)" type="number" value={forms.proposal.pricing?.totalPrice} onChange={v => updateProposalNested('pricing', 'totalPrice', v)} />
                        <Input label="Discounted Offer Price (₹)" type="number" value={forms.proposal.pricing?.discountedPrice} onChange={v => updateProposalNested('pricing', 'discountedPrice', v)} />
                        <Input label="AMC / Support Cost (₹)" type="number" value={forms.proposal.pricing?.amcCost} onChange={v => updateProposalNested('pricing', 'amcCost', v)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Additional One-Time Charges (₹)" type="number" value={forms.proposal.pricing?.additionalCharges} onChange={v => updateProposalNested('pricing', 'additionalCharges', v)} />
                        <Input label="Recurring Charges (₹)" type="number" value={forms.proposal.pricing?.recurringCharges} onChange={v => updateProposalNested('pricing', 'recurringCharges', v)} />
                      </div>
                    </div>

                    <Textarea label="Additional Instructions for AI" value={forms.proposal.aiInstructions} onChange={v => updateProposal('aiInstructions', v)} />

                    <div className="space-y-3">
                      {proposalEditableSections.map(([key, label, type]) => (
                        <EditableAiSection
                          key={key}
                          label={label}
                          value={proposalSectionText(key)}
                          onChange={v => updateProposalSectionFromText(key, type, v)}
                          onImprove={() => improveProposalSection(key)}
                          disabled={saving}
                          helper={type === 'modules' ? 'Use blank lines between modules. Add features as lines starting with "-".' : type === 'list' ? 'One item per line.' : type === 'pairs' ? 'One item per line, use "Title - Description".' : ''}
                        />
                      ))}

                      <ProposalRowsEditor
                        title="Project Cost Breakdown"
                        rows={forms.proposal.sections?.projectCostBreakdown}
                        fields={[['component', 'Component'], ['cost', 'Cost']]}
                        compact
                        onChange={(index, field, value) => updateProposalSectionRow('projectCostBreakdown', index, field, value)}
                        onAdd={() => addProposalSectionRow('projectCostBreakdown', { component: '', cost: '' })}
                        onRemove={(index) => removeProposalSectionRow('projectCostBreakdown', index)}
                      />

                      <ProposalRowsEditor
                        title="Project Timeline"
                        rows={forms.proposal.sections?.projectTimeline}
                        fields={[['phase', 'Phase'], ['duration', 'Duration'], ['notes', 'Notes']]}
                        compact
                        onChange={(index, field, value) => updateProposalSectionRow('projectTimeline', index, field, value)}
                        onAdd={() => addProposalSectionRow('projectTimeline', { phase: '', duration: '', notes: '' })}
                        onRemove={(index) => removeProposalSectionRow('projectTimeline', index)}
                      />

                      {/* Payment Terms Milestones with % Check */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">Configurable Payment Milestones</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isMilestonePercentageValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            Total: {totalMilestonePercentage}% {isMilestonePercentageValid ? '✓' : '(Must equal 100%)'}
                          </span>
                        </div>
                        <ProposalRowsEditor
                          title=""
                          rows={forms.proposal.sections?.paymentTerms}
                          fields={[['milestone', 'Milestone'], ['description', 'Description'], ['percentage', 'Percent %']]}
                          compact
                          onChange={(index, field, value) => updateProposalSectionRow('paymentTerms', index, field, value)}
                          onAdd={() => addProposalSectionRow('paymentTerms', { milestone: '', description: '', percentage: '' })}
                          onRemove={(index) => removeProposalSectionRow('paymentTerms', index)}
                        />
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">For Inquiries Contact Us</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(defaultContactDetails).map(([key, value]) => (
                            <Input key={key} label={key.replace(/([A-Z])/g, ' $1')} value={value} disabled />
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">Agreement & Signatures</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(defaultSignatureDetails).map(([key]) => (
                            <Input key={key} label={key.replace(/([A-Z])/g, ' $1')} value={forms.proposal.signatureDetails?.[key]} onChange={v => updateProposalObject('signatureDetails', key, v)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pl-0 xl:max-h-[84vh] xl:overflow-y-auto xl:sticky xl:top-4 xl:pl-2">
                    <ProposalPreview
                      proposal={forms.proposal}
                      onProposalChange={updateProposal}
                      onNestedChange={updateProposalNested}
                      onSectionChange={updateProposalSectionFromText}
                      onSectionRowChange={updateProposalSectionRow}
                      onAddSectionRow={addProposalSectionRow}
                      onRemoveSectionRow={removeProposalSectionRow}
                      onObjectChange={updateProposalObject}
                      onTitleChange={(key, title) => updateProposalObject('sectionTitles', key, title)}
                      embedded={embedded}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* STAGE 4: SENT TO CLIENT */}
            {activeStage === 'sent_to_client' && (
              <section>
                <StageHeading title="Sent to Client" subtitle="Track quotation/proposal dispatch and formal commercial acceptance" icon={<Send className="h-4 w-4 text-blue-600" />} />
                
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dispatch Information</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Sent At" type="datetime-local" value={forms.sentToClient.sentAt} onChange={v => updateForm('sentToClient', 'sentAt', v)} />
                      <Select label="Method" value={forms.sentToClient.method} onChange={v => updateForm('sentToClient', 'method', v)} options={['Email', 'WhatsApp', 'Portal', 'In-Person', 'Other']} />
                      <Input label="Recipient Email" value={forms.sentToClient.recipientEmail} onChange={v => updateForm('sentToClient', 'recipientEmail', v)} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Proposal Version Sent" value={forms.sentToClient.proposalVersionSent} onChange={v => updateForm('sentToClient', 'proposalVersionSent', v)} />
                      <Input label="Expected Client Response Date" type="date" value={forms.sentToClient.expectedClientResponseDate} onChange={v => updateForm('sentToClient', 'expectedClientResponseDate', v)} />
                    </div>
                    <Textarea label="Send Notes" value={forms.sentToClient.notes} onChange={v => updateForm('sentToClient', 'notes', v)} />
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Commercial Acceptance Tracking</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Select label="Acceptance Status" value={forms.sentToClient.acceptanceStatus} onChange={v => updateForm('sentToClient', 'acceptanceStatus', v)} options={acceptanceStatusOptions} />
                      <Input label="Client Acceptance Date" type="date" value={forms.sentToClient.clientAcceptanceDate} onChange={v => updateForm('sentToClient', 'clientAcceptanceDate', v)} />
                      <Input label="Acceptance Reference / Doc URL" value={forms.sentToClient.acceptanceReference} onChange={v => updateForm('sentToClient', 'acceptanceReference', v)} />
                    </div>
                    <Textarea label="Acceptance Feedback / Notes" value={forms.sentToClient.acceptanceNotes} onChange={v => updateForm('sentToClient', 'acceptanceNotes', v)} />
                  </div>
                </div>

                <SectionActions onSave={() => saveSection('sentToClient')} disabled={saving} />
              </section>
            )}

            {/* STAGE 5: NEGOTIATION */}
            {activeStage === 'negotiation' && (
              <section>
                <StageHeading title="Negotiation" subtitle="Commercial revisions, discount tracking, and closing date" />
                
                <div className="space-y-4">
                  {/* Financial Change Tracking Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commercial Change Tracking</h4>
                    
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Original Quotation Value (₹)"
                        type="number"
                        value={forms.negotiation.originalQuotationValue}
                        onChange={v => updateForm('negotiation', 'originalQuotationValue', v)}
                      />
                      <Input
                        label="Current Proposed Value (₹)"
                        type="number"
                        value={forms.negotiation.currentProposedValue}
                        onChange={v => updateForm('negotiation', 'currentProposedValue', v)}
                      />
                      <Input
                        label="Revised Contract Value (₹)"
                        type="number"
                        value={forms.negotiation.revisedContractValue}
                        onChange={v => updateNegotiationRevisedValue(v)}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Negotiated Discount (₹)"
                        type="number"
                        value={forms.negotiation.negotiatedDiscount}
                        onChange={v => updateForm('negotiation', 'negotiatedDiscount', v)}
                      />
                      <Select
                        label="Discount Reason"
                        value={forms.negotiation.discountReason}
                        onChange={v => updateForm('negotiation', 'discountReason', v)}
                        options={discountReasonOptions}
                      />
                      <Input
                        label="Expected Close Date"
                        type="date"
                        value={forms.negotiation.expectedCloseDate}
                        onChange={v => updateForm('negotiation', 'expectedCloseDate', v)}
                      />
                    </div>

                    <Textarea label="Negotiation Notes" value={forms.negotiation.notes} onChange={v => updateForm('negotiation', 'notes', v)} />

                    {/* Quick Revision Logger */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional comment to record in revision history..."
                        value={revisionNote}
                        onChange={e => setRevisionNote(e.target.value)}
                        className="flex-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={addNegotiationRevision}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition whitespace-nowrap"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Log Commercial Revision
                      </button>
                    </div>
                  </div>

                  {/* Revision History Log */}
                  {asArray(forms.negotiation.revisionHistory).length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commercial Revision History</h4>
                      <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {asArray(forms.negotiation.revisionHistory).map((rev, idx) => (
                          <div key={idx} className="py-1.5 text-xs flex items-center justify-between gap-2 text-slate-600">
                            <div>
                              <span className="font-semibold text-slate-900">₹{Number(rev.revisedContractValue || 0).toLocaleString('en-IN')}</span>
                              {rev.negotiatedDiscount > 0 && <span className="text-red-600"> (Discount: ₹{Number(rev.negotiatedDiscount).toLocaleString('en-IN')})</span>}
                              <span className="text-slate-400"> • {rev.discountReason || 'Revision'}</span>
                              {rev.notes && <span className="text-slate-600"> • "{rev.notes}"</span>}
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">{formatDate(rev.date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <SectionActions onSave={() => saveSection('negotiation')} disabled={saving} />
              </section>
            )}

            {/* STAGE 6: WON / CLOSED */}
            {activeStage === 'won_closed' && (
              <section>
                <StageHeading title="Won / Closed" subtitle="Final commercial handoff, contract terms, billing schedule, and internal delivery budget" icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} />
                
                <div className="space-y-4">
                  {(forms.outcome.status === 'won' || forms.outcome.projectId) && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {forms.outcome.projectCode || 'PRJ'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Relational Project Established</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {forms.outcome.projectCode || 'Active Project'}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            This won deal is linked to centralized Project Management. Commercial contract terms and delivery budgets are synchronized.
                          </p>
                        </div>
                      </div>
                      <Link
                        to={(() => {
                          const userRole = localStorage.getItem('userRole') || role;
                          const isAdminUser = role === 'admin' || userRole === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
                          const basePath = isAdminUser ? '/admin/projects' : '/employee/projects';
                          const q = new URLSearchParams();
                          if (forms.outcome.projectId) q.set('projectId', forms.outcome.projectId);
                          if (forms.outcome.projectCode) q.set('projectCode', forms.outcome.projectCode);
                          if (lead?._id) q.set('leadId', lead._id);
                          const qs = q.toString();
                          return qs ? `${basePath}?${qs}` : basePath;
                        })()}
                        onClick={() => {
                          if (onClose) onClose();
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition shrink-0"
                      >
                        <FolderKanban className="h-3.5 w-3.5" />
                        View in Projects
                      </Link>
                    </div>
                  )}

                  {/* Final Deal Outcome & Contract Terms */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Final Commercial Contract Terms</h4>
                    
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Select label="Outcome Status" value={forms.outcome.status} onChange={v => updateForm('outcome', 'status', v)} options={['open', 'won', 'lost']} />
                      <Input
                        label="Final Commercially Agreed Contract Value (₹)"
                        type="number"
                        value={forms.outcome.finalContractValue}
                        onChange={v => {
                          updateForm('outcome', 'finalContractValue', v);
                          updateForm('outcome', 'finalValue', v);
                        }}
                      />
                      <Select
                        label="Tax Inclusivity"
                        value={forms.outcome.taxInclusive}
                        onChange={v => updateForm('outcome', 'taxInclusive', v)}
                        options={['Excluding Tax', 'Including Tax']}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Contract Number / Reference" value={forms.outcome.contractNumber} onChange={v => updateForm('outcome', 'contractNumber', v)} />
                      <Input label="Contract Start Date" type="date" value={forms.outcome.contractStartDate} onChange={v => updateForm('outcome', 'contractStartDate', v)} />
                      <Input label="Contract End Date" type="date" value={forms.outcome.contractEndDate} onChange={v => updateForm('outcome', 'contractEndDate', v)} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Final Agreed Payment Terms" value={forms.outcome.finalPaymentTerms} onChange={v => updateForm('outcome', 'finalPaymentTerms', v)} />
                      <Input label="Initial Advance Amount (₹)" type="number" value={forms.outcome.initialAdvanceAmount} onChange={v => updateForm('outcome', 'initialAdvanceAmount', v)} />
                      <Input label="Contract / Acceptance Doc URL" value={forms.outcome.contractDocumentRef} onChange={v => updateForm('outcome', 'contractDocumentRef', v)} />
                    </div>
                  </div>

                  {/* Final Agreed Billing Schedule */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">Final Agreed Billing Schedule</h4>
                      <button
                        type="button"
                        onClick={importMilestonesFromProposal}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Import Proposal Milestones
                      </button>
                    </div>

                    <div className="space-y-2">
                      {asArray(forms.outcome.billingSchedule).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] sm:grid-cols-[1.5fr_80px_120px_110px_auto] items-end gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <label className="block min-w-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Milestone</span>
                            <input
                              value={row.milestone || ''}
                              onChange={e => {
                                const list = [...asArray(forms.outcome.billingSchedule)];
                                list[idx].milestone = e.target.value;
                                updateForm('outcome', 'billingSchedule', list);
                              }}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">%</span>
                            <input
                              type="number"
                              value={row.percentage || ''}
                              onChange={e => {
                                const list = [...asArray(forms.outcome.billingSchedule)];
                                list[idx].percentage = e.target.value;
                                const contractVal = Number(forms.outcome.finalContractValue || forms.outcome.finalValue || 0);
                                if (contractVal && e.target.value) {
                                  list[idx].amount = Math.round((contractVal * Number(e.target.value)) / 100);
                                }
                                updateForm('outcome', 'billingSchedule', list);
                              }}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</span>
                            <input
                              type="number"
                              value={row.amount || ''}
                              onChange={e => {
                                const list = [...asArray(forms.outcome.billingSchedule)];
                                list[idx].amount = e.target.value;
                                updateForm('outcome', 'billingSchedule', list);
                              }}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900"
                            />
                          </label>
                          <label className="hidden sm:block min-w-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Due Date</span>
                            <input
                              type="date"
                              value={row.dueDate || ''}
                              onChange={e => {
                                const list = [...asArray(forms.outcome.billingSchedule)];
                                list[idx].dueDate = e.target.value;
                                updateForm('outcome', 'billingSchedule', list);
                              }}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const list = asArray(forms.outcome.billingSchedule).filter((_, i) => i !== idx);
                              updateForm('outcome', 'billingSchedule', list);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...asArray(forms.outcome.billingSchedule), { milestone: '', percentage: '', amount: '', dueDate: '' }];
                          updateForm('outcome', 'billingSchedule', list);
                        }}
                        className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Milestone
                      </button>
                    </div>
                  </div>

                  {/* Distinct Internal Approved Project Budget */}
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 p-4 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Internal Approved Delivery Budget</h4>
                        <p className="text-[11px] text-amber-700">Company's authorized internal execution budget (Strictly distinct from client stated budget and contract revenue)</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Internal Delivery Budget (₹)"
                        type="number"
                        value={forms.outcome.internalApprovedBudget}
                        onChange={v => updateForm('outcome', 'internalApprovedBudget', v)}
                      />
                      <Input
                        label="Outcome Reason"
                        value={forms.outcome.reason}
                        onChange={v => updateForm('outcome', 'reason', v)}
                      />
                    </div>
                    <Textarea
                      label="Internal Budget Notes & Cost Assumptions"
                      value={forms.outcome.internalBudgetNotes}
                      onChange={v => updateForm('outcome', 'internalBudgetNotes', v)}
                    />
                  </div>

                  <Textarea label="Deal Closure Notes" value={forms.outcome.notes} onChange={v => updateForm('outcome', 'notes', v)} />
                </div>

                <SectionActions onSave={() => saveSection('outcome')} disabled={saving} />
              </section>
            )}
          </div>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Stage History</h3>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Scroll to Top</span>
              </button>
            </div>
            <div className="space-y-2">
              {(pipeline?.stageHistory || []).slice().reverse().map((item, index) => (
                <div key={`${item.toStage}-${item.changedAt}-${index}`} className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{labelForStage(item.toStage)}</span>
                  <span> • {formatDateTime(item.changedAt)}</span>
                  {item.changedBy?.name && <span> • {item.changedBy.name}</span>}
                  {item.comments && <span> • {item.comments}</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/30 backdrop-blur-sm ${isAdmin ? 'lg:justify-end lg:pr-8' : ''}`}
      onClick={onClose}
    >
      <div className={`w-full ${isAdmin ? 'max-w-7xl lg:ml-auto' : 'max-w-5xl'}`} onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

const labelForStage = (stage) => stages.find(([value]) => value === stage)?.[1] || stage;

const StageStepper = ({ currentStage, activeStage, onSelect }) => {
  const currentIndex = stages.findIndex(([value]) => value === currentStage);
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 sm:p-2 shadow-inner">
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 touch-pan-x scrollbar-none w-full min-w-0">
        {stages.map(([value, label], index) => {
          const isActive = activeStage === value;
          const isReached = currentIndex >= 0 && index <= currentIndex;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={`group relative min-h-9 sm:min-h-11 min-w-[120px] sm:min-w-[152px] flex-1 rounded-xl border px-2.5 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-[11px] font-semibold transition-all duration-300 ${isActive
                ? 'border-indigo-300 bg-white text-indigo-700 shadow-md shadow-indigo-900/10 ring-2 ring-indigo-100'
                : isReached
                  ? 'border-blue-100 bg-blue-50/70 text-blue-700 hover:border-blue-200 hover:bg-white'
                  : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700'
                }`}
            >
              <span className={`mb-1 block h-1 w-6 sm:w-7 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-500' : isReached ? 'bg-blue-400' : 'bg-slate-200'}`} />
              <span className="block truncate whitespace-nowrap leading-snug">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const StageHeading = ({ title, subtitle, icon, actions }) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
    <div>
      <div className="flex items-center gap-2">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">{icon}</span>}
        <h3 className="text-base sm:text-lg font-bold text-slate-950">{title}</h3>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {actions && (
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto shrink-0">
        {actions}
      </div>
    )}
  </div>
);

const Info = ({ label, value }) => {
  const isEmail = String(label || '').toLowerCase() === 'email';
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        title={isEmail && value ? String(value) : undefined}
        className={`min-w-0 font-medium leading-snug text-slate-900 ${isEmail ? 'truncate text-[13px]' : 'break-words [overflow-wrap:anywhere]'}`}
      >
        {value || '-'}
      </p>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', disabled = false }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
    <input type={type} value={value || ''} onChange={(e) => onChange?.(e.target.value)} disabled={disabled} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1.5 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-600" />
  </label>
);

const Textarea = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows="2" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1.5 focus:ring-blue-500/20" />
  </label>
);

const ProposalRowsEditor = ({ title, rows = [], fields, onChange, onAdd, onRemove, compact }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
    {title && (
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-slate-200 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          + Add Row
        </button>
      </div>
    )}
    {!title && (
      <div className="mb-1.5 flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-slate-200 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          + Add Row
        </button>
      </div>
    )}
    <div className="space-y-2">
      {asArray(rows).map((row, index) => {
        if (fields.length === 2) {
          const [f1, f2] = fields;
          return (
            <div key={`${title}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_auto] sm:grid-cols-[minmax(0,1fr)_120px_auto] items-end gap-1.5 sm:gap-2 rounded-lg bg-slate-50 p-2 border border-slate-100">
              <label className="block min-w-0">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate whitespace-nowrap">{f1[1]}</span>
                <input
                  value={row?.[f1[0]] || ''}
                  onChange={v => onChange(index, f1[0], v.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate whitespace-nowrap">{f2[1]}</span>
                <input
                  value={row?.[f2[0]] || ''}
                  onChange={v => onChange(index, f2[0], v.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                />
              </label>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="h-6 w-6 shrink-0 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition text-xs"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          );
        }

        const longField = fields.find(([k]) => ['notes', 'description'].includes(k)) || fields[2];
        const shortFields = fields.filter(f => f !== longField);
        const [sf1, sf2] = shortFields;

        return (
          <div key={`${title}-${index}`} className="space-y-1.5 rounded-lg bg-slate-50 p-2 border border-slate-100">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_auto] sm:grid-cols-[minmax(0,1fr)_120px_auto] items-end gap-1.5 sm:gap-2">
              {sf1 && (
                <label className="block min-w-0">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate whitespace-nowrap">{sf1[1]}</span>
                  <input
                    value={row?.[sf1[0]] || ''}
                    onChange={v => onChange(index, sf1[0], v.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                  />
                </label>
              )}
              {sf2 && (
                <label className="block min-w-0">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate whitespace-nowrap">{sf2[1]}</span>
                  <input
                    value={row?.[sf2[0]] || ''}
                    onChange={v => onChange(index, sf2[0], v.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="h-6 w-6 shrink-0 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition text-xs"
                title="Remove row"
              >
                ✕
              </button>
            </div>
            {longField && (
              <label className="block w-full">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate whitespace-nowrap">{longField[1]}</span>
                <input
                  value={row?.[longField[0]] || ''}
                  onChange={v => onChange(index, longField[0], v.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1.5 focus:ring-blue-500/20"
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const EditableAiSection = ({ label, value, onChange, onImprove, disabled, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <p className="text-[11px] font-bold text-slate-600">{label}</p>
      <button
        type="button"
        onClick={onImprove}
        disabled={disabled}
        className="rounded-md border border-fuchsia-100 bg-fuchsia-50 px-2 py-0.5 text-[10.5px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-60"
      >
        Improve with AI
      </button>
    </div>
    {helper && <p className="mb-1 text-[10.5px] font-medium text-slate-400">{helper}</p>}
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows="3" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1.5 focus:ring-blue-500/20" />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1.5 focus:ring-blue-500/20">
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const formatProposalMoney = (amount, currency = 'INR') => {
  const number = Number(amount || 0);
  if (!number) return '-';
  return `${currency === 'INR' ? '₹' : `${currency} `}${number.toLocaleString('en-IN')}`;
};

const ProposalPreview = ({
  proposal,
  onProposalChange,
  onNestedChange,
  onSectionChange,
  onSectionRowChange,
  onAddSectionRow,
  onRemoveSectionRow,
  onObjectChange,
  onTitleChange,
  embedded = false
}) => {
  const sections = proposal.sections || {};
  const pricing = proposal.pricing || {};
  const contact = defaultContactDetails;
  const signatures = proposal.signatureDetails || defaultSignatureDetails;
  const sectionText = (value) => formatSectionToText(value);
  const timelineRows = asArray(sections.projectTimeline);
  const timelineHasNotes = timelineRows.some(row => String(row?.notes || '').trim());
  const formatProposalDate = (d) => {
    if (!d) return '-';
    if (typeof d === 'string') {
      const s = d.trim();
      if (!s) return '-';
      const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (dmy) {
        const [, day, month, year] = dmy;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const currSymbol = pricing.currency === 'INR' ? '(₹)' : `(${pricing.currency || 'INR'})`;
  const commercialSummaryRows = [
    { label: 'Contract Duration', val: proposal.contractDuration || '-', isAmount: false },
    { label: 'Project Start Date', val: formatProposalDate(proposal.projectStartDate), isAmount: false },
    { label: 'Project End Date', val: formatProposalDate(proposal.projectEndDate), isAmount: false },
    { label: `Total Quoted Price ${currSymbol}`, val: pricing.totalPrice !== '' && pricing.totalPrice !== undefined && pricing.totalPrice !== null && Number(pricing.totalPrice) > 0 ? formatProposalMoney(pricing.totalPrice, pricing.currency) : '-', isAmount: true },
    { label: `Discounted Offer Price ${currSymbol}`, val: Number(pricing.discountedPrice) > 0 ? formatProposalMoney(pricing.discountedPrice, pricing.currency) : '-', isAmount: true, isHighlight: Number(pricing.discountedPrice) > 0 },
    { label: `AMC / Support Cost ${currSymbol}`, val: Number(pricing.amcCost) > 0 ? `${formatProposalMoney(pricing.amcCost, pricing.currency)} / year` : '-', isAmount: true },
    { label: `Additional One-Time Charges ${currSymbol}`, val: Number(pricing.additionalCharges) > 0 ? formatProposalMoney(pricing.additionalCharges, pricing.currency) : '-', isAmount: true },
    { label: `Recurring Charges ${currSymbol}`, val: Number(pricing.recurringCharges) > 0 ? formatProposalMoney(pricing.recurringCharges, pricing.currency) : '-', isAmount: true }
  ];

  if (proposal.validity?.validUntil) {
    commercialSummaryRows.push({
      label: 'Valid Until',
      val: formatProposalDate(proposal.validity?.validUntil),
      isAmount: false
    });
  }

  const visibleCommercialSummaryRows = commercialSummaryRows.filter(r => r.val && r.val !== '-');

  const page = (key, defaultTitle, children) => {
    const title = proposal.sectionTitles?.[key] || defaultTitle;
    return (
      <div className={`proposal-page relative mx-auto mb-3 sm:mb-4 min-h-[460px] sm:min-h-[560px] w-full overflow-hidden rounded-sm bg-white p-3.5 sm:p-6 shadow-md sm:shadow-lg ring-1 ring-slate-300 flex flex-col justify-between ${embedded ? 'max-w-full sm:max-w-[500px]' : 'max-w-full sm:max-w-[440px] xl:max-w-[680px]'}`}>
        <img
          src="/Taruna-logo-text.png"
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 sm:h-64 sm:w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12]"
        />

        <div className={`relative min-h-[400px] sm:min-h-[500px] ${embedded ? 'text-xs sm:text-[15px]' : 'text-xs sm:text-sm'}`}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
            <img src="/Taruna-logo-text.png" alt="" className={embedded ? 'h-5 sm:h-7 w-auto object-contain' : 'h-4 sm:h-6 w-auto object-contain'} />
            <span className={`${embedded ? 'text-[10px] sm:text-[11px]' : 'text-[9px] sm:text-[10px]'} font-semibold text-fuchsia-600 uppercase tracking-wider`}>{proposal.proposalType || 'Project Proposal'}</span>
          </div>

          <div className="mt-2 sm:mt-4 border-l-4 border-fuchsia-500 pl-2.5 sm:pl-3">
            <input
              type="text"
              value={title}
              onChange={e => onTitleChange?.(key, e.target.value)}
              placeholder="Page Title"
              className={`w-full bg-transparent ${embedded ? 'text-base sm:text-[21px]' : 'text-base sm:text-xl'} font-black uppercase leading-tight text-slate-950 outline-none transition focus:bg-fuchsia-50/50 focus:ring-1 focus:ring-fuchsia-300 rounded px-1 -ml-1`}
            />
          </div>

          <div className={`mt-3 sm:mt-5 ${embedded ? 'text-xs sm:text-[15px] leading-6 sm:leading-8' : 'text-xs sm:text-sm leading-6 sm:leading-7'} text-slate-700`}>{children}</div>
        </div>
      </div>
    );
  };

  const costRows = asArray(sections.projectCostBreakdown);
  const costTotal = costRows.reduce((sum, row) => sum + Number(row?.cost || 0), 0);

  return (
    <div className="employee-sales-pipeline-preview max-h-[70vh] sm:max-h-[78vh] overflow-y-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-200/80 p-2 sm:p-3">
      {/* Cover Page */}
      <div className={`proposal-page relative mx-auto mb-3 sm:mb-4 min-h-[460px] sm:min-h-[560px] w-full overflow-hidden rounded-sm bg-white p-3.5 sm:p-6 shadow-md sm:shadow-lg ring-1 ring-slate-300 flex flex-col justify-between ${embedded ? 'max-w-full sm:max-w-[500px]' : 'max-w-full sm:max-w-[440px]'}`}>
        <div className="relative">
          <img src="/Taruna-logo-text.png" alt="Taruna Technology" className={embedded ? 'mx-auto h-14 sm:h-22 w-auto object-contain mb-4 sm:mb-6' : 'mx-auto h-12 sm:h-20 w-auto object-contain mb-4 sm:mb-6'} />

          <input
            type="text"
            value={proposal.subtitle || proposal.proposalType || ''}
            onChange={e => onProposalChange?.('subtitle', e.target.value)}
            placeholder="CUSTOM ERP & PRODUCTION MANAGEMENT SYSTEM"
            className={`w-full bg-transparent ${embedded ? 'text-[10px] sm:text-[12px]' : 'text-[9px] sm:text-[11px]'} font-black uppercase tracking-wider text-fuchsia-600 outline-none focus:bg-fuchsia-50/50 rounded px-1 -ml-1`}
          />

          <div className="mt-2 text-xl sm:text-3xl font-black uppercase leading-none text-indigo-900">
            <input
              type="text"
              value={proposal.title || 'PROJECT PROPOSAL'}
              onChange={e => onProposalChange?.('title', e.target.value)}
              placeholder="PROJECT PROPOSAL"
              className={`w-full bg-transparent ${embedded ? 'text-lg sm:text-[2.05rem]' : 'text-xl sm:text-3xl'} font-black uppercase leading-tight text-indigo-900 outline-none focus:bg-indigo-50/50 rounded px-1 -ml-1`}
            />
          </div>

          <svg className="absolute right-0 top-36 w-24 h-16 pointer-events-none text-purple-500" viewBox="0 0 100 60" fill="none">
            <path d="M0 20 H50 L70 5 H100 M0 35 H40 L60 50 H100" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="20" r="3" fill="currentColor" />
            <circle cx="40" cy="35" r="3" fill="currentColor" />
          </svg>

          <textarea
            value={proposal.description || `Project details and budget projections for ${proposal.proposalType || 'WEB APP Development'}`}
            onChange={e => onProposalChange?.('description', e.target.value)}
            rows={2}
            className={`mt-6 w-full resize-none bg-transparent ${embedded ? 'text-[13px] leading-7' : 'text-xs leading-relaxed'} text-slate-800 outline-none focus:bg-slate-50 rounded p-1`}
          />

          <div className="mt-8 border-l-2 border-fuchsia-500 pl-4 py-1 space-y-3">
            <div>
              <p className="text-[11px] font-bold text-fuchsia-600">Presented to</p>
              <input
                type="text"
                value={proposal.companyName || ''}
                onChange={e => onProposalChange?.('companyName', e.target.value)}
                placeholder="Company Name"
                className={`w-full bg-transparent ${embedded ? 'text-[13px]' : 'text-xs'} font-bold text-slate-900 outline-none focus:bg-slate-100 rounded px-1 -ml-1`}
              />
              <input
                type="text"
                value={proposal.customerName || ''}
                onChange={e => onProposalChange?.('customerName', e.target.value)}
                placeholder="Customer Name"
                className={`mt-0.5 w-full bg-transparent ${embedded ? 'text-[12px]' : 'text-[11px]'} text-slate-600 outline-none focus:bg-slate-100 rounded px-1 -ml-1`}
              />
            </div>
            <div>
              <p className="text-[11px] font-bold text-fuchsia-600">Presented by</p>
              <p className="text-xs font-bold text-slate-900">TARUNA TECHNOLOGY</p>
            </div>
          </div>
        </div>

        <svg className="absolute left-6 bottom-8 w-24 h-16 pointer-events-none text-purple-400 opacity-60" viewBox="0 0 120 80">
          <pattern id="dots-cover" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="currentColor" />
          </pattern>
          <rect width="120" height="80" fill="url(#dots-cover)" />
        </svg>
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full border-[18px] border-fuchsia-600 pointer-events-none" />
      </div>

      {/* Commercial Summary Page */}
      {visibleCommercialSummaryRows.length > 0 && page('commercialSummary', 'Commercial Summary', (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
            <div className="grid grid-cols-[1.5fr_1fr] bg-slate-900 px-3 py-2.5 font-bold text-white text-[11px] sm:text-xs">
              <div>Commercial Agreement & Charges</div>
              <div>Details / Amount</div>
            </div>
            {visibleCommercialSummaryRows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-[1.5fr_1fr] items-center border-t border-slate-200 px-3 py-2 text-[11px] sm:text-xs ${index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}`}
              >
                <span className="font-bold text-slate-600">{row.label}</span>
                <span className={`font-bold ${row.isHighlight ? 'text-emerald-600 font-extrabold' : row.isAmount ? 'text-slate-950 font-black text-xs sm:text-sm' : 'text-slate-800'}`}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Editable Section Pages */}
      {proposalEditableSections.map(([key, defaultTitle, type]) => (
        <React.Fragment key={key}>
          {page(key, defaultTitle, (
            <PreviewTextarea
              value={sectionText(sections[key])}
              onChange={value => onSectionChange?.(key, type, value)}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Cost Breakdown Page */}
      {page('projectCostBreakdown', 'Project Cost Breakdown', (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
            <div className="grid grid-cols-[1fr_80px_24px] sm:grid-cols-[1.8fr_1fr_auto] bg-slate-900 px-2 py-1.5 font-bold text-white text-[11px] sm:text-xs">
              <div>Module / Service</div>
              <div>Cost (₹)</div>
              <div></div>
            </div>
            {costRows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_24px] sm:grid-cols-[1.8fr_1fr_auto] items-center border-t border-slate-200 px-1.5 py-1 gap-1 text-[11px] sm:text-xs">
                <input
                  type="text"
                  value={row?.component || ''}
                  onChange={e => onSectionRowChange?.('projectCostBreakdown', index, 'component', e.target.value)}
                  placeholder="Component Name"
                  className="w-full bg-transparent py-1 text-slate-800 outline-none focus:bg-blue-50/50 rounded px-1 min-w-0"
                />
                <input
                  type="number"
                  value={row?.cost || ''}
                  onChange={e => onSectionRowChange?.('projectCostBreakdown', index, 'cost', e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent py-1 font-semibold text-slate-900 outline-none focus:bg-blue-50/50 rounded px-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => onRemoveSectionRow?.('projectCostBreakdown', index)}
                  className="px-1 text-xs font-bold text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onAddSectionRow?.('projectCostBreakdown', { component: '', cost: '' })}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              + Add Row
            </button>
            <p className="text-xs sm:text-sm font-black text-slate-950">Total: {formatProposalMoney(costTotal || pricing.totalPrice, pricing.currency)}</p>
          </div>
        </div>
      ))}

      {/* Investment Details Page */}
      {page('projectInvestmentDetails', 'Project Investment Details', (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="font-semibold text-slate-500">Proposed Investment</p>
              <input
                type="number"
                value={pricing.totalPrice || ''}
                onChange={e => onNestedChange?.('pricing', 'totalPrice', e.target.value)}
                placeholder="Total Price"
                className="w-full bg-transparent font-black text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 -ml-1"
              />
            </div>
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="font-semibold text-slate-500">Discounted Investment</p>
              <input
                type="number"
                value={pricing.discountedPrice || ''}
                onChange={e => onNestedChange?.('pricing', 'discountedPrice', e.target.value)}
                placeholder="Discounted Price"
                className="w-full bg-transparent font-black text-emerald-700 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-400 rounded px-1 -ml-1"
              />
            </div>
          </div>
          <PreviewTextarea
            value={sectionText(sections.projectInvestmentDetails)}
            onChange={value => onSectionChange?.('projectInvestmentDetails', 'text', value)}
            rows={4}
          />
        </div>
      ))}

      {/* Project Timeline Page */}
      {page('projectTimeline', 'Project Timeline', (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
            <div className={`grid bg-slate-900 px-2 py-2 font-bold text-white ${timelineHasNotes ? 'grid-cols-[1.2fr_1fr_1.5fr_auto]' : 'grid-cols-[1.2fr_1fr_auto]'}`}>
              <div>Phase</div>
              <div>Duration</div>
              {timelineHasNotes && <div>Notes</div>}
              <div></div>
            </div>
            {timelineRows.map((row, index) => (
              <div key={index} className={`grid items-center border-t border-slate-200 px-2 py-1 gap-1 ${timelineHasNotes ? 'grid-cols-[1.2fr_1fr_1.5fr_auto]' : 'grid-cols-[1.2fr_1fr_auto]'}`}>
                <input
                  type="text"
                  value={row?.phase || ''}
                  onChange={e => onSectionRowChange?.('projectTimeline', index, 'phase', e.target.value)}
                  placeholder="Phase"
                  className="w-full bg-transparent py-1 font-semibold text-slate-800 outline-none focus:bg-blue-50/50 rounded px-1"
                />
                <input
                  type="text"
                  value={row?.duration || ''}
                  onChange={e => onSectionRowChange?.('projectTimeline', index, 'duration', e.target.value)}
                  placeholder="Duration"
                  className="w-full bg-transparent py-1 text-slate-700 outline-none focus:bg-blue-50/50 rounded px-1"
                />
                {timelineHasNotes && (
                  <input
                    type="text"
                    value={row?.notes || ''}
                    onChange={e => onSectionRowChange?.('projectTimeline', index, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="w-full bg-transparent py-1 text-slate-600 outline-none focus:bg-blue-50/50 rounded px-1"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onRemoveSectionRow?.('projectTimeline', index)}
                  className="px-1 text-xs font-bold text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAddSectionRow?.('projectTimeline', { phase: '', duration: '', notes: '' })}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            + Add Phase
          </button>
        </div>
      ))}

      {/* Payment Terms Page */}
      {page('paymentTerms', 'Payment Terms', (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
            <div className="grid grid-cols-[1.2fr_1.8fr_0.8fr_auto] bg-slate-900 px-2 py-2 font-bold text-white">
              <div>Milestone</div>
              <div>Description</div>
              <div>%</div>
              <div></div>
            </div>
            {asArray(sections.paymentTerms).map((row, index) => (
              <div key={index} className="grid grid-cols-[1.2fr_1.8fr_0.8fr_auto] items-center border-t border-slate-200 px-2 py-1 gap-1">
                <input
                  type="text"
                  value={row?.milestone || ''}
                  onChange={e => onSectionRowChange?.('paymentTerms', index, 'milestone', e.target.value)}
                  placeholder="Milestone"
                  className="w-full bg-transparent py-1 font-semibold text-slate-800 outline-none focus:bg-blue-50/50 rounded px-1"
                />
                <input
                  type="text"
                  value={row?.description || ''}
                  onChange={e => onSectionRowChange?.('paymentTerms', index, 'description', e.target.value)}
                  placeholder="Description"
                  className="w-full bg-transparent py-1 text-slate-700 outline-none focus:bg-blue-50/50 rounded px-1"
                />
                <input
                  type="number"
                  value={row?.percentage || ''}
                  onChange={e => onSectionRowChange?.('paymentTerms', index, 'percentage', e.target.value)}
                  placeholder="%"
                  className="w-full bg-transparent py-1 font-semibold text-slate-900 outline-none focus:bg-blue-50/50 rounded px-1"
                />
                <button
                  type="button"
                  onClick={() => onRemoveSectionRow?.('paymentTerms', index)}
                  className="px-1 text-xs font-bold text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAddSectionRow?.('paymentTerms', { milestone: '', description: '', percentage: '' })}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            + Add Milestone
          </button>
        </div>
      ))}

      {/* Agreement & Signatures Page */}
      {page('agreementAndSignatures', 'Agreement & Signatures', (
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="font-black uppercase text-slate-500">Client Acceptance</p>
            <label className="block">
              <span className="text-[10px] text-slate-400">Name</span>
              <input
                type="text"
                value={signatures.clientName || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'clientName', e.target.value)}
                placeholder="Client Name"
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Date</span>
              <input
                type="date"
                value={signatures.clientDate || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'clientDate', e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Place</span>
              <input
                type="text"
                value={signatures.place || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'place', e.target.value)}
                placeholder="City / Place"
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Signature</span>
              <input
                type="text"
                value={signatures.clientSignature || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'clientSignature', e.target.value)}
                placeholder="Client Signature / Title"
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="font-black uppercase text-slate-500">For Taruna Technology</p>
            <label className="block">
              <span className="text-[10px] text-slate-400">Authorized Signatory</span>
              <input
                type="text"
                value={signatures.authorizedSignatory || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'authorizedSignatory', e.target.value)}
                placeholder="Taruna Technology"
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Date</span>
              <input
                type="date"
                value={signatures.tarunaDate || ''}
                onChange={e => onObjectChange?.('signatureDetails', 'tarunaDate', e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
          </div>
        </div>
      ))}

      {/* Thank You / Contact Us Page */}
      <div className="employee-sales-pipeline-preview proposal-page relative mx-auto mb-4 min-h-[560px] max-w-[440px] overflow-hidden rounded-sm bg-white p-6 shadow-lg ring-1 ring-slate-300 flex flex-col justify-between">
        <div className="relative">
          <img src="/Taruna-logo-text.png" alt="Taruna Technology" className="mx-auto h-24 w-auto object-contain mb-8" />

          <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">
            <span className="text-fuchsia-600 block">FOR INQUIRIES,</span>
            <span className="text-indigo-900 block">CONTACT US</span>
          </h2>

          <div className="mt-8 space-y-4 text-xs font-medium text-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shrink-0">
                <Globe className="h-4 w-4" />
              </div>
              <p className="w-full text-xs font-semibold text-slate-800">{contact.website}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-600 text-white shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <p className="w-full text-xs font-semibold text-slate-800">{contact.phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-900 text-white shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <p className="w-full text-xs font-semibold text-slate-800">{contact.email}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-12 space-y-2 text-center text-xs text-slate-700">
          <p className="w-full text-center text-[11px] leading-relaxed text-slate-700">{contact.address}</p>
          <p className="text-xs font-bold text-fuchsia-600">{contact.website || 'www.tarunatech.com'}</p>
        </div>

        <svg className="absolute left-6 bottom-12 w-24 h-16 pointer-events-none text-purple-400 opacity-60" viewBox="0 0 120 80">
          <pattern id="dots-thankyou" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="currentColor" />
          </pattern>
          <rect width="120" height="80" fill="url(#dots-thankyou)" />
        </svg>
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full border-[18px] border-fuchsia-600 pointer-events-none" />
      </div>
    </div>
  );
};

const PreviewTextarea = ({ value, onChange, rows = 10 }) => (
  <textarea
    value={value || ''}
    onChange={(event) => onChange(event.target.value)}
    rows={rows}
    placeholder="Click here to edit this proposal section"
    className="min-h-[220px] w-full resize-y rounded-md border border-transparent bg-transparent p-2 text-sm leading-7 text-slate-700 outline-none transition focus:border-fuchsia-200 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
  />
);

const SectionActions = ({ onSave, disabled }) => (
  <div className="mt-3 flex justify-end">
    <button onClick={onSave} disabled={disabled} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 shadow-xs">
      Save Section
    </button>
  </div>
);

export default SalesPipelineModal;
