import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Download, FileText, Globe, Loader2, Mail, Phone, Send, ShieldCheck, Upload, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiFileUrl, salesPipelineAPI } from '../../utils/api';

const stages = [
  ['client_details', 'Client Details'],
  ['quotation', 'Quotation Details'],
  ['admin_approval', 'Admin Approval'],
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
  { milestone: 'Project Kickoff', description: 'Advance payment before development starts.', percentage: 40 },
  { milestone: 'Development Review', description: 'After major modules are ready for review.', percentage: 30 },
  { milestone: 'Final Deployment', description: 'Before final deployment and handover.', percentage: 30 }
];

const defaultIntellectualPropertyRights = 'Upon full payment of the agreed project fees, the client will receive a non-exclusive license to use the delivered software for internal business purposes. Taruna Technology retains ownership of its pre-existing tools, frameworks, code snippets, and reusable development components. Any transfer, resale, redistribution, or source-code disclosure beyond the agreed scope must be approved in writing by both parties.';
const defaultHostingThirdPartyServices = 'Hosting, domain registration, SSL certificates, email services, SMS gateways, payment gateways, app store accounts, and other third-party subscriptions are governed by the terms and pricing of the respective providers. Any renewal fees, provider charges, or external service limitations are the client’s responsibility unless expressly included in the signed proposal.';
const defaultTermination = 'Either party may terminate the project by providing written notice in accordance with the final agreement. If termination occurs, the client remains responsible for payment of all completed work, approved milestones, and any committed third-party costs incurred up to the termination date.';
const defaultLimitationOfLiability = 'Taruna Technology shall not be liable for indirect, incidental, special, or consequential damages arising from the use or inability to use the delivered solution. Our total liability for any claim related to the project will be limited to the amount actually paid for the specific services giving rise to the claim, subject to the final signed agreement.';

const proposalTypeOptions = ['ERP Software', 'Website Development', 'Mobile App'];

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
  clientDetails: { requirements: '', decisionMaker: '', businessNeed: '', budgetRange: '', timeline: '', notes: '' },
  quotation: { quotationNumber: '', amount: '', currency: 'INR', validUntil: '', notes: '', fileUrl: '' },
  proposal: {
    status: 'draft',
    version: 0,
    companyName: '',
    customerName: '',
    proposalType: 'ERP Software',
    title: 'ERP Software Proposal',
    subtitle: '',
    pricing: { totalPrice: '', discountedPrice: '', amcCost: '', currency: 'INR' },
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
  sentToClient: { sentAt: '', method: 'Email', recipientEmail: '', notes: '' },
  negotiation: { expectedCloseDate: '', notes: '' },
  outcome: { status: 'open', finalValue: '', reason: '', notes: '' }
};

const toInputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
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
const mergeAvailable = (base = {}, incoming = {}) => {
  const next = { ...base };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (!hasTemplateValue(value)) return;
    if (!Array.isArray(value) && value && typeof value === 'object') {
      next[key] = mergeAvailable(base?.[key] || {}, value);
    } else {
      next[key] = value;
    }
  });
  return next;
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
    pricing: {
      ...emptyForms.proposal.pricing,
      ...(proposal.pricing || {}),
      totalPrice: proposal.pricing?.totalPrice ?? quotation?.amount ?? lead?.estimatedValue ?? '',
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
  const [approvalComments, setApprovalComments] = useState('');
  const [forms, setForms] = useState(emptyForms);

  const isAdmin = role === 'admin';

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
    setActiveStage(prev => prev || data.currentStage || 'client_details');
    setForms({
      clientDetails: {
        ...emptyForms.clientDetails,
        ...(data.clientDetails || {})
      },
      quotation: {
        ...emptyForms.quotation,
        ...(data.quotation || {}),
        validUntil: toInputDate(data.quotation?.validUntil),
        amount: data.quotation?.amount || ''
      },
      proposal: getProposalDefaults(lead, data.clientDetails || {}, data.quotation || {}, data.proposal || {}),
      sentToClient: {
        ...emptyForms.sentToClient,
        ...(data.sentToClient || {}),
        sentAt: toInputDateTime(data.sentToClient?.sentAt),
        recipientEmail: data.sentToClient?.recipientEmail || lead.email || ''
      },
      negotiation: {
        ...emptyForms.negotiation,
        ...(data.negotiation || {}),
        expectedCloseDate: toInputDate(data.negotiation?.expectedCloseDate)
      },
      outcome: {
        ...emptyForms.outcome,
        ...(data.outcome || {}),
        finalValue: data.outcome?.finalValue || ''
      }
    });
  };

  useEffect(() => {
    if (lead?._id) loadPipeline();
  }, [lead?._id]);

  const updateForm = (section, key, value) => {
    setForms(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
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
      const nextRows = rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
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
      toast.error(error.response?.data?.message || 'Failed to generate proposal', { id: 'proposal-ai' });
    } finally {
      setSaving(false);
    }
  };

  const improveProposalSection = async (section) => {
    const instruction = window.prompt('How should this section be improved?');
    if (instruction === null) return;
    try {
      setSaving(true);
      toast.loading('Improving section...', { id: 'proposal-section-ai' });
      const res = await salesPipelineAPI.generateProposalSection(lead._id, { section, instruction });
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Section improved', { id: 'proposal-section-ai' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to improve section', { id: 'proposal-section-ai' });
    } finally {
      setSaving(false);
    }
  };

  const downloadFileFromUrl = async (url, filename = 'Proposal.pdf') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const generateProposalPdf = async (shouldDownloadOnly = false) => {
    let pdfWindow = null;
    if (!shouldDownloadOnly) {
      pdfWindow = window.open('about:blank', '_blank');
      if (pdfWindow) {
        try {
          pdfWindow.document.title = 'Generating Proposal PDF...';
          pdfWindow.document.body.innerHTML = `
            <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;">
              <div style="background:white;padding:32px 48px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);text-align:center;">
                <h2 style="margin:0 0 12px 0;color:#0f172a;">Generating Proposal PDF...</h2>
                <p style="margin:0;color:#64748b;font-size:14px;">Please wait while your document is compiled.</p>
              </div>
            </div>
          `;
        } catch {
          // ignore
        }
      }
    }

    try {
      setSaving(true);
      toast.loading('Generating PDF...', { id: 'proposal-pdf' });
      const pdfRes = await salesPipelineAPI.generateProposalPdf(lead._id, forms.proposal);
      if (pdfRes.data.success) {
        hydrate(pdfRes.data.data);
        onUpdated?.();
        toast.success('PDF generated successfully', { id: 'proposal-pdf' });
        const rawPdfUrl = pdfRes.data.data?.proposal?.pdfUrl || pdfRes.data.pdfUrl;
        const pdfUrl = getApiFileUrl(rawPdfUrl);
        if (pdfUrl) {
          if (shouldDownloadOnly) {
            await downloadFileFromUrl(pdfUrl, `Proposal_${lead.company || lead.firstName || 'Lead'}.pdf`);
          } else if (pdfWindow && !pdfWindow.closed) {
            pdfWindow.location.replace(pdfUrl);
          } else {
            window.open(pdfUrl, '_blank');
          }
        } else if (pdfWindow && !pdfWindow.closed) {
          pdfWindow.close();
        }
      } else if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.close();
      }
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
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
      toast.loading('Extracting proposal from PDF...', { id: 'pdf-extract' });
      const res = await salesPipelineAPI.extractProposalFromPdf(lead._id, formData);
      if (res.data.success) {
        const extracted = res.data.data;
        setForms(prev => ({
          ...prev,
          proposal: {
            ...prev.proposal,
            companyName: extracted.companyName || prev.proposal.companyName,
            customerName: extracted.customerName || prev.proposal.customerName,
            proposalType: hasTemplateValue(extracted.proposalType) ? extracted.proposalType : prev.proposal.proposalType,
            pricing: mergeAvailable(prev.proposal.pricing, extracted.pricing),
            validity: mergeAvailable(prev.proposal.validity, extracted.validity),
            contactDetails: defaultContactDetails,
            signatureDetails: mergeAvailable(prev.proposal.signatureDetails, extracted.signatureDetails),
            sections: mergeAvailable(prev.proposal.sections, extracted.sections)
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
        toast.success('Pipeline updated');
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

  const approve = async (status) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.updateApproval(lead._id, { status, comments: approvalComments });
      if (res.data.success) {
        hydrate(res.data.data);
        setApprovalComments('');
        onUpdated?.();
        toast.success('Approval updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update approval');
    } finally {
      setSaving(false);
    }
  };

  const generateQuotationPdf = () => {
    const client = forms.clientDetails;
    const quotation = forms.quotation;
    const clientName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client';
    const amount = quotation.amount
      ? `${quotation.currency || 'INR'} ${Number(quotation.amount).toLocaleString('en-IN')}`
      : '-';
    const rows = [
      ['Client Name', clientName],
      ['Company', lead.company || '-'],
      ['Email', lead.email || '-'],
      ['Phone', lead.phone || '-'],
      ['Lead Status', lead.status || '-'],
      ['Estimated Value', lead.estimatedValue ? `${quotation.currency || 'INR'} ${Number(lead.estimatedValue).toLocaleString('en-IN')}` : '-'],
      ['Decision Maker', client.decisionMaker || '-'],
      ['Budget Range', client.budgetRange || '-'],
      ['Timeline', client.timeline || '-'],
      ['Business Need', client.businessNeed || '-'],
      ['Requirements', client.requirements || '-'],
      ['Client Notes', client.notes || '-'],
      ['Quotation Number', quotation.quotationNumber || '-'],
      ['Quotation Amount', amount],
      ['Valid Until', formatDate(quotation.validUntil)],
      ['Quotation Notes', quotation.notes || '-']
    ];

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
            @page { size: A4; margin: 18mm; }
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
              padding-bottom: 18px;
              margin-bottom: 20px;
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
              font-size: 28px;
              letter-spacing: 0;
            }
            .meta {
              min-width: 210px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #f8fafc;
              padding: 12px;
              font-size: 12px;
            }
            .meta div { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; }
            .section {
              margin-top: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              overflow: hidden;
            }
            .section h2 {
              margin: 0;
              padding: 10px 14px;
              background: #f1f5f9;
              font-size: 13px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0;
            }
            .field {
              min-height: 58px;
              border-top: 1px solid #e2e8f0;
              padding: 10px 14px;
            }
            .field:nth-child(odd) { border-right: 1px solid #e2e8f0; }
            .wide { grid-column: 1 / -1; border-right: 0 !important; }
            .label {
              margin: 0 0 4px;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            .value {
              margin: 0;
              color: #0f172a;
              font-size: 13px;
              font-weight: 600;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }
            .amount {
              color: #047857;
              font-size: 18px;
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
                <p class="eyebrow">Sales Quotation</p>
                <h1>${escapeHtml(clientName)}</h1>
                <p style="margin:6px 0 0;color:#64748b;font-size:13px;">${escapeHtml(lead.company || 'No company')}</p>
              </div>
              <div class="meta">
                <div><strong>Quotation</strong><span>${escapeHtml(quotation.quotationNumber || '-')}</span></div>
                <div><strong>Date</strong><span>${escapeHtml(formatDate(new Date()))}</span></div>
                <div><strong>Valid Until</strong><span>${escapeHtml(formatDate(quotation.validUntil))}</span></div>
              </div>
            </header>

            <section class="section">
              <h2>Client Details</h2>
              <div class="grid">
                ${rows.slice(0, 12).map(([label, value]) => `
                  <div class="field ${['Requirements', 'Client Notes'].includes(label) ? 'wide' : ''}">
                    <p class="label">${escapeHtml(label)}</p>
                    <p class="value">${escapeHtml(value)}</p>
                  </div>
                `).join('')}
              </div>
            </section>

            <section class="section">
              <h2>Quotation Details</h2>
              <div class="grid">
                ${rows.slice(12).map(([label, value]) => `
                  <div class="field ${label === 'Quotation Notes' ? 'wide' : ''}">
                    <p class="label">${escapeHtml(label)}</p>
                    <p class="value ${label === 'Quotation Amount' ? 'amount' : ''}">${escapeHtml(value)}</p>
                  </div>
                `).join('')}
              </div>
            </section>

            <p class="footer">Generated from Sales Pipeline quotation details.</p>
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

  const content = (
    <div className={`${embedded ? 'w-full h-full flex flex-col' : `flex flex-col max-h-[85dvh] sm:max-h-[90vh] w-full ${isAdmin ? 'max-w-7xl' : 'max-w-5xl'} overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-xl`} employee-sales-pipeline-modal`}>
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
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-5 mb-3 sm:mb-5">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">Sales Pipeline</h2>
          <p className="text-xs sm:text-sm text-slate-500">{lead.firstName} {lead.lastName} • {lead.company || 'No company'}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
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
        <div className={`pipeline-modal-scroll flex-1 ${embedded ? 'min-h-0' : 'overflow-y-auto overscroll-contain'} space-y-3 sm:space-y-5 pr-0.5`}>
          <StageStepper currentStage={pipeline?.currentStage} activeStage={activeStage} onSelect={setActiveStage} />

          <div key={activeStage} className="pipeline-stage-panel rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-5">
            {activeStage === 'client_details' && (
              <section>
                <StageHeading title="Client Details" subtitle="Core lead information and qualification notes" />
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm sm:grid-cols-3">
                  <Info label="Name" value={`${lead.firstName} ${lead.lastName}`} />
                  <Info label="Email" value={lead.email} />
                  <Info label="Phone" value={lead.phone} />
                  <Info label="Company" value={lead.company || '-'} />
                  <Info label="Estimated Value" value={lead.estimatedValue ? `₹${lead.estimatedValue.toLocaleString()}` : '-'} />
                  <Info label="Lead Status" value={lead.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3">
                  <Input label="Decision Maker" value={forms.clientDetails.decisionMaker} onChange={v => updateForm('clientDetails', 'decisionMaker', v)} />
                  <Input label="Budget Range" value={forms.clientDetails.budgetRange} onChange={v => updateForm('clientDetails', 'budgetRange', v)} />
                  <Input label="Timeline" value={forms.clientDetails.timeline} onChange={v => updateForm('clientDetails', 'timeline', v)} />
                  <Input label="Business Need" value={forms.clientDetails.businessNeed} onChange={v => updateForm('clientDetails', 'businessNeed', v)} />
                  <Textarea label="Requirements" value={forms.clientDetails.requirements} onChange={v => updateForm('clientDetails', 'requirements', v)} />
                  <Textarea label="Notes" value={forms.clientDetails.notes} onChange={v => updateForm('clientDetails', 'notes', v)} />
                </div>
                <SectionActions onSave={() => saveSection('clientDetails')} disabled={saving} />
              </section>
            )}

            {activeStage === 'quotation' && (
              <section>
                <StageHeading title="Quotation Details" subtitle="Prepare pricing, validity, and quotation notes" icon={<FileText className="h-4 w-4 text-blue-600" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Quotation Number" value={forms.quotation.quotationNumber} onChange={v => updateForm('quotation', 'quotationNumber', v)} />
                  <Input label="Amount" type="number" value={forms.quotation.amount} onChange={v => updateForm('quotation', 'amount', v)} />
                  <Input label="Currency" value={forms.quotation.currency} onChange={v => updateForm('quotation', 'currency', v)} />
                  <Input label="Valid Until" type="date" value={forms.quotation.validUntil} onChange={v => updateForm('quotation', 'validUntil', v)} />
                  <Textarea label="Quotation Notes" value={forms.quotation.notes} onChange={v => updateForm('quotation', 'notes', v)} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={() => saveSection('quotation')} disabled={saving} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    Save Section
                  </button>
                  <button
                    type="button"
                    onClick={generateQuotationPdf}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Download className="h-4 w-4" />
                    Generate PDF
                  </button>
                  <button onClick={() => transition('admin_approval', 'Submitted quotation for approval')} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    Submit for Approval
                  </button>
                </div>
              </section>
            )}

            {activeStage === 'admin_approval' && (
              <section>
                <StageHeading title="Admin Approval" subtitle="Track approval status and admin comments" icon={<ShieldCheck className="h-4 w-4 text-indigo-600" />} />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge status={pipeline?.approval?.status} />
                  <span className="text-xs text-slate-500">Submitted: {formatDateTime(pipeline?.approval?.submittedAt)}</span>
                </div>
                {isAdmin && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <Textarea label="Approval Comments" value={approvalComments} onChange={setApprovalComments} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => approve('approved')} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Approve</button>
                      <button onClick={() => approve('rejected')} disabled={saving} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
                      <button onClick={() => approve('revision_requested')} disabled={saving} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">Request Revision</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeStage === 'proposal' && (
              <section>
                <StageHeading title="Proposal" subtitle="Generate, edit, preview, and export the client proposal" icon={<FileText className="h-4 w-4 text-indigo-600" />} />
                {pipeline?.approval?.status !== 'approved' ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    Admin approval must be approved before preparing the proposal.
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] xl:items-start">
                    <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1 xl:pr-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Company Name" value={forms.proposal.companyName} onChange={v => updateProposal('companyName', v)} />
                        <Input label="Customer Name" value={forms.proposal.customerName} onChange={v => updateProposal('customerName', v)} />
                        <Select label="Proposal Type" value={forms.proposal.proposalType} onChange={updateProposalType} options={proposalTypeOptions} />
                        <Input label="Proposal Title" value={forms.proposal.title} onChange={v => updateProposal('title', v)} />
                        <Input label="Proposal Subtitle" value={forms.proposal.subtitle} onChange={v => updateProposal('subtitle', v)} />
                        <Input label="Valid Until" type="date" value={forms.proposal.validity?.validUntil} onChange={v => updateProposalNested('validity', 'validUntil', v)} />
                        <Input label="Total Price" type="number" value={forms.proposal.pricing?.totalPrice} onChange={v => updateProposalNested('pricing', 'totalPrice', v)} />
                        <Input label="Discounted Price" type="number" value={forms.proposal.pricing?.discountedPrice} onChange={v => updateProposalNested('pricing', 'discountedPrice', v)} />
                        <Input label="AMC Cost" type="number" value={forms.proposal.pricing?.amcCost} onChange={v => updateProposalNested('pricing', 'amcCost', v)} />
                        <Input label="Currency" value={forms.proposal.pricing?.currency} onChange={v => updateProposalNested('pricing', 'currency', v)} />
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
                        <ProposalRowsEditor
                          title="Payment Terms"
                          rows={forms.proposal.sections?.paymentTerms}
                          fields={[['milestone', 'Milestone'], ['description', 'Description'], ['percentage', 'Percent']]}
                          compact
                          onChange={(index, field, value) => updateProposalSectionRow('paymentTerms', index, field, value)}
                          onAdd={() => addProposalSectionRow('paymentTerms', { milestone: '', description: '', percentage: '' })}
                          onRemove={(index) => removeProposalSectionRow('paymentTerms', index)}
                        />
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

                    <div className="flex max-h-[78vh] flex-col gap-3 overflow-y-auto pl-0 xl:sticky xl:top-4 xl:pl-2">
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

                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm">
                        <div className="flex flex-col gap-2 sm:gap-3">
                          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                            {/* Hidden PDF file input */}
                            <input
                              ref={pdfUploadRef}
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={handleExtractProposalFromPdf}
                            />
                            <button
                              onClick={() => pdfUploadRef.current?.click()}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                            >
                              {extractingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Upload className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">{extractingPdf ? 'Extracting...' : 'Upload PDF'}</span>
                            </button>
                            <button
                              onClick={generateProposalWithAI}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-2 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-fuchsia-700 disabled:opacity-60"
                            >
                              <span className="truncate">Generate with AI</span>
                            </button>
                            <button
                              onClick={() => saveProposal('draft')}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              <span className="truncate">Save Draft</span>
                            </button>
                            <button
                              onClick={() => saveProposal('finalized')}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-2 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <span className="truncate">Save Final</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                            <button
                              onClick={() => generateProposalPdf(false)}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">View PDF</span>
                            </button>
                            <button
                              onClick={() => transition('sent_to_client', 'Proposal completed and ready to send')}
                              disabled={saving || extractingPdf}
                              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              <span className="truncate">Send to Client Stage</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeStage === 'sent_to_client' && (
              <section>
                <StageHeading title="Sent to Client" subtitle="Record when and how the quotation was sent" icon={<Send className="h-4 w-4 text-blue-600" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Sent At" type="datetime-local" value={forms.sentToClient.sentAt} onChange={v => updateForm('sentToClient', 'sentAt', v)} />
                  <Select label="Method" value={forms.sentToClient.method} onChange={v => updateForm('sentToClient', 'method', v)} options={['Email', 'WhatsApp', 'Portal', 'In-Person', 'Other']} />
                  <Input label="Recipient Email" value={forms.sentToClient.recipientEmail} onChange={v => updateForm('sentToClient', 'recipientEmail', v)} />
                  <Textarea label="Send Notes" value={forms.sentToClient.notes} onChange={v => updateForm('sentToClient', 'notes', v)} />
                </div>
                <SectionActions onSave={() => saveSection('sentToClient')} disabled={saving} />
              </section>
            )}

            {activeStage === 'negotiation' && (
              <section>
                <StageHeading title="Negotiation" subtitle="Capture closing date expectations and negotiation notes" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Expected Close Date" type="date" value={forms.negotiation.expectedCloseDate} onChange={v => updateForm('negotiation', 'expectedCloseDate', v)} />
                  <Textarea label="Negotiation Notes" value={forms.negotiation.notes} onChange={v => updateForm('negotiation', 'notes', v)} />
                </div>
                <SectionActions onSave={() => saveSection('negotiation')} disabled={saving} />
              </section>
            )}

            {activeStage === 'won_closed' && (
              <section>
                <StageHeading title="Won / Closed" subtitle="Finalize the outcome and closure details" icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Outcome" value={forms.outcome.status} onChange={v => updateForm('outcome', 'status', v)} options={['open', 'won', 'lost']} />
                  <Input label="Final Value" type="number" value={forms.outcome.finalValue} onChange={v => updateForm('outcome', 'finalValue', v)} />
                  <Input label="Reason" value={forms.outcome.reason} onChange={v => updateForm('outcome', 'reason', v)} />
                  <Textarea label="Outcome Notes" value={forms.outcome.notes} onChange={v => updateForm('outcome', 'notes', v)} />
                </div>
                <SectionActions onSave={() => saveSection('outcome')} disabled={saving} />
              </section>
            )}
          </div>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Stage History</h3>
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
      className={`fixed inset-0 z-[9999] flex items-start sm:items-center p-3 pt-12 sm:p-4 bg-slate-900/30 backdrop-blur-sm ${isAdmin ? 'justify-center lg:justify-end lg:pr-10' : 'justify-center'}`}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 sm:p-2 shadow-inner">
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
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

const StageHeading = ({ title, subtitle, icon }) => (
  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
    <div>
      <div className="flex items-center gap-2">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">{icon}</span>}
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
      </div>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const Badge = ({ status }) => {
  const classes = {
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    revision_requested: 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
    not_submitted: 'bg-slate-100 text-slate-600'
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.not_submitted}`}>{(status || 'not_submitted').replaceAll('_', ' ')}</span>;
};

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
    <span className="mb-0.5 sm:mb-1 block text-xs font-semibold text-slate-600">{label}</span>
    <input type={type} value={value || ''} onChange={(e) => onChange?.(e.target.value)} disabled={disabled} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-600" />
  </label>
);

const Textarea = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-0.5 sm:mb-1 block text-xs font-semibold text-slate-600">{label}</span>
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows="2" className="w-full rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
  </label>
);

const ProposalRowsEditor = ({ title, rows = [], fields, onChange, onAdd, onRemove, compact = false }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
      <button type="button" onClick={onAdd} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] sm:text-xs font-semibold text-slate-600 hover:bg-slate-50">+ Add Row</button>
    </div>
    {compact && (
      <div className={`hidden sm:grid mb-2 gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${fields.length === 2 ? 'grid-cols-[minmax(0,1fr)_120px_auto]' : 'grid-cols-[minmax(0,1fr)_minmax(140px,1fr)_minmax(90px,0.8fr)_auto]'}`}>
        {fields.map(([, label]) => <span key={label}>{label}</span>)}
        <span />
      </div>
    )}
    <div className="space-y-2">
      {asArray(rows).map((row, index) => (
        <div key={`${title}-${index}`} className={`grid gap-1.5 sm:gap-2 rounded-lg bg-slate-50 p-2 ${compact ? (fields.length === 2 ? 'grid-cols-[1fr_80px_24px] sm:grid-cols-[minmax(0,1fr)_120px_auto] items-center' : 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(140px,1fr)_minmax(90px,0.8fr)_auto] items-center') : 'sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))_auto]'}`}>
          {compact ? (
            <>
              {fields.map(([field, label]) => (
                <label key={field} className="block min-w-0">
                  <span className="mb-0.5 block text-[10px] font-medium text-slate-500 sm:hidden">{label}</span>
                  <input
                    value={row?.[field] || ''}
                    onChange={v => onChange(index, field, v.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              ))}
            </>
          ) : (
            fields.map(([field, label]) => (
              <Input key={field} label={label} value={row?.[field]} onChange={v => onChange(index, field, v)} />
            ))
          )}
          <button type="button" onClick={() => onRemove(index)} className="self-center justify-self-end sm:justify-self-auto rounded-lg px-1.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50" title="Remove row">✕</button>
        </div>
      ))}
    </div>
  </div>
);

const EditableAiSection = ({ label, value, onChange, onImprove, disabled, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <button
        type="button"
        onClick={onImprove}
        disabled={disabled}
        className="rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-60"
      >
        Improve with AI
      </button>
    </div>
    {helper && <p className="mb-1 text-[11px] font-medium text-slate-400">{helper}</p>}
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows="4" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
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

  const page = (key, defaultTitle, children) => {
    const title = proposal.sectionTitles?.[key] || defaultTitle;
    return (
      <div className={`proposal-page relative mx-auto mb-3 sm:mb-4 min-h-[460px] sm:min-h-[560px] w-full overflow-hidden rounded-sm bg-white p-3.5 sm:p-6 shadow-md sm:shadow-lg ring-1 ring-slate-300 flex flex-col justify-between ${embedded ? 'max-w-full sm:max-w-[500px]' : 'max-w-full sm:max-w-[440px]'}`}>
        {/* Background Watermark - Brighter Logo */}
        <img
          src="/Taruna-logo-text.png"
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 sm:h-64 sm:w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12]"
        />

        <div className={`relative min-h-[400px] sm:min-h-[500px] ${embedded ? 'text-xs sm:text-[15px]' : 'text-xs sm:text-sm'}`}>
          {/* Decent, Smaller Top Header Logo Only */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
            <img src="/Taruna-logo-text.png" alt="" className={embedded ? 'h-5 sm:h-7 w-auto object-contain' : 'h-4 sm:h-6 w-auto object-contain'} />
            <span className={`${embedded ? 'text-[10px] sm:text-[11px]' : 'text-[9px] sm:text-[10px]'} font-semibold text-fuchsia-600 uppercase tracking-wider`}>{proposal.proposalType || 'Project Proposal'}</span>
          </div>

          {/* Page Title */}
          <div className="mt-2 sm:mt-4 border-l-4 border-fuchsia-500 pl-2.5 sm:pl-3">
            <input
              type="text"
              value={title}
              onChange={e => onTitleChange?.(key, e.target.value)}
              placeholder="Page Title"
              className={`w-full bg-transparent ${embedded ? 'text-base sm:text-[21px]' : 'text-base sm:text-xl'} font-black uppercase leading-tight text-slate-950 outline-none transition focus:bg-fuchsia-50/50 focus:ring-1 focus:ring-fuchsia-300 rounded px-1 -ml-1`}
            />
          </div>

          {/* Children Content */}
          <div className={`mt-3 sm:mt-5 ${embedded ? 'text-xs sm:text-[15px] leading-6 sm:leading-8' : 'text-xs sm:text-sm leading-6 sm:leading-7'} text-slate-700`}>{children}</div>
        </div>
      </div>
    );
  };

  const costRows = asArray(sections.projectCostBreakdown);
  const costTotal = costRows.reduce((sum, row) => sum + Number(row?.cost || 0), 0);

  return (
    <div className="employee-sales-pipeline-preview max-h-[70vh] sm:max-h-[78vh] overflow-y-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-200/80 p-2 sm:p-3">
      {/* Cover Page (First Page - Matching Image 1) */}
      <div className={`proposal-page relative mx-auto mb-3 sm:mb-4 min-h-[460px] sm:min-h-[560px] w-full overflow-hidden rounded-sm bg-white p-3.5 sm:p-6 shadow-md sm:shadow-lg ring-1 ring-slate-300 flex flex-col justify-between ${embedded ? 'max-w-full sm:max-w-[500px]' : 'max-w-full sm:max-w-[440px]'}`}>
        <div className="relative">
          {/* Centered Top Company Logo */}
          <img src="/Taruna-logo-text.png" alt="Taruna Technology" className={embedded ? 'mx-auto h-14 sm:h-22 w-auto object-contain mb-4 sm:mb-6' : 'mx-auto h-12 sm:h-20 w-auto object-contain mb-4 sm:mb-6'} />

          {/* Defined Pink Subtitle */}
          <input
            type="text"
            value={proposal.subtitle || proposal.proposalType || ''}
            onChange={e => onProposalChange?.('subtitle', e.target.value)}
            placeholder="CUSTOM ERP & PRODUCTION MANAGEMENT SYSTEM"
            className={`w-full bg-transparent ${embedded ? 'text-[10px] sm:text-[12px]' : 'text-[9px] sm:text-[11px]'} font-black uppercase tracking-wider text-fuchsia-600 outline-none focus:bg-fuchsia-50/50 rounded px-1 -ml-1`}
          />

          {/* Big Main Title: PROJECT PROPOSAL */}
          <div className="mt-2 text-xl sm:text-3xl font-black uppercase leading-none text-indigo-900">
            <input
              type="text"
              value={proposal.title || 'PROJECT PROPOSAL'}
              onChange={e => onProposalChange?.('title', e.target.value)}
              placeholder="PROJECT PROPOSAL"
              className={`w-full bg-transparent ${embedded ? 'text-lg sm:text-[2.05rem]' : 'text-xl sm:text-3xl'} font-black uppercase leading-tight text-indigo-900 outline-none focus:bg-indigo-50/50 rounded px-1 -ml-1`}
            />
          </div>

          {/* Decorative Circuit Lines on Right */}
          <svg className="absolute right-0 top-36 w-24 h-16 pointer-events-none text-purple-500" viewBox="0 0 100 60" fill="none">
            <path d="M0 20 H50 L70 5 H100 M0 35 H40 L60 50 H100" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="20" r="3" fill="currentColor" />
            <circle cx="40" cy="35" r="3" fill="currentColor" />
          </svg>

          {/* Description Text */}
          <textarea
            value={proposal.description || `Project details and budget projections for ${proposal.proposalType || 'WEB APP Development'}`}
            onChange={e => onProposalChange?.('description', e.target.value)}
            rows={2}
            className={`mt-6 w-full resize-none bg-transparent ${embedded ? 'text-[13px] leading-7' : 'text-xs leading-relaxed'} text-slate-800 outline-none focus:bg-slate-50 rounded p-1`}
          />

          {/* Vertical Pink Accent Bar with Presented Details */}
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

        {/* Decorative Grid of Dots & Bottom Right Arc */}
        <svg className="absolute left-6 bottom-8 w-24 h-16 pointer-events-none text-purple-400 opacity-60" viewBox="0 0 120 80">
          <pattern id="dots-cover" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="currentColor" />
          </pattern>
          <rect width="120" height="80" fill="url(#dots-cover)" />
        </svg>
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full border-[18px] border-fuchsia-600 pointer-events-none" />
      </div>

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

      {/* Thank You / Contact Us Page (Final Dedicated Page - Matching Image 2) */}
      <div className="employee-sales-pipeline-preview proposal-page relative mx-auto mb-4 min-h-[560px] max-w-[440px] overflow-hidden rounded-sm bg-white p-6 shadow-lg ring-1 ring-slate-300 flex flex-col justify-between">
        <div className="relative">
          {/* Centered Top Company Logo */}
          <img src="/Taruna-logo-text.png" alt="Taruna Technology" className="mx-auto h-24 w-auto object-contain mb-8" />

          {/* Heading */}
          <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">
            <span className="text-fuchsia-600 block">FOR INQUIRIES,</span>
            <span className="text-indigo-900 block">CONTACT US</span>
          </h2>

          {/* Contact Details List with Circular Icon Badges */}
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

        {/* Centered Address & Website Footer */}
        <div className="relative mt-12 space-y-2 text-center text-xs text-slate-700">
          <p className="w-full text-center text-[11px] leading-relaxed text-slate-700">{contact.address}</p>
          <p className="text-xs font-bold text-fuchsia-600">{contact.website || 'www.tarunatech.com'}</p>
        </div>

        {/* Decorative Grid of Dots & Bottom Right Arc */}
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
    <button onClick={onSave} disabled={disabled} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
      Save Section
    </button>
  </div>
);

export default SalesPipelineModal;
