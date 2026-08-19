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
      termsAndConditions: [
        '1. Project Scope\nThe project scope is strictly limited to the features, modules, and functionalities explicitly mentioned in the approved proposal and documentation. Any additional features, integrations, or changes requested beyond the agreed scope will be treated as Change Request and may involve additional cost and timeline.',
        '2. Project Timeline\nThe estimated project timeline will commence after proposal approval, receipt of the initial advance payment, and final requirement confirmation. Delays caused by late feedback, content, approvals, or data from the client side may impact the delivery schedule.',
        '3. Payment Terms\nPayments must be made as per the agreed milestone-based payment schedule. Delays in payment may result in temporary suspension of development or deployment.\n- All payments made are non-refundable once the respective project phase is completed.',
        '4. Client Responsibilities\nClient agrees to provide timely access to required data, nominate a single point of contact, and review deliverables reasonably. Taruna Technology will not be responsible for delays caused due to non-cooperation.',
        '5. Data Security & Confidentiality\nTaruna Technology agrees to maintain strict confidentiality of all client data. While best security practices will be followed, Taruna Technology is not liable for data loss caused by third-party hosting providers, cyber-attacks, or force majeure events.',
        '6. Warranty & Support\n- A 3-month free warranty period is provided post-deployment, covering bug fixes related to delivered features.\n- New features, design changes, or enhancements are not covered under warranty.',
        '7. Intellectual Property Rights\n- Upon full payment, client will receive usage rights for the developed software.\n- Taruna Technology retains the right to reuse non-confidential technical components and frameworks.\n- The software may not be resold, redistributed, or transferred without written consent.',
        '8. Governing Law\nThis agreement shall be governed and interpreted in accordance with the laws of India. Any disputes shall be subject to the jurisdiction of Vadodara, Gujarat.'
      ],
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
const getProposalTypeTemplate = (type = 'ERP Software') =>
  proposalTypeTemplates[Object.keys(proposalTypeTemplates).find(key => key.toLowerCase() === String(type || '').toLowerCase())] ||
  proposalTypeTemplates['ERP Software'];
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
  const template = getProposalTypeTemplate(proposal.proposalType || 'ERP Software');
  return {
    status: proposal.status || 'draft',
    version: Number(proposal.version || 0),
    generatedAt: proposal.generatedAt || null,
    updatedAt: proposal.updatedAt || null,
    generatedBy: proposal.generatedBy || null,
    companyName: proposal.companyName || lead.company || '',
    customerName: proposal.customerName || customerName,
    proposalType: proposal.proposalType || 'ERP Software',
    title: proposal.title || template.title,
    subtitle: proposal.subtitle || template.subtitle || clientDetails.businessNeed || '',
    description: proposal.description || template.description || '',
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
      executiveSummary: proposal.sections?.executiveSummary || template.sections.executiveSummary || '',
      companyIntroduction: proposal.sections?.companyIntroduction || template.sections.companyIntroduction || 'Taruna Technology delivers practical, scalable software solutions for growing businesses.',
      projectObjectives: proposal.sections?.projectObjectives || template.sections.projectObjectives || clientDetails.businessNeed || '',
      proposedSolution: proposal.sections?.proposedSolution || template.sections.proposedSolution || '',
      scopeOfWork: proposal.sections?.scopeOfWork || template.sections.scopeOfWork || clientDetails.requirements || '',
      coreModules: asArray(proposal.sections?.coreModules).length ? proposal.sections.coreModules : asArray(template.sections.coreModules),
      additionalModules: asArray(proposal.sections?.additionalModules),
      technologyStack: asArray(proposal.sections?.technologyStack).length ? proposal.sections.technologyStack : asArray(template.sections.technologyStack),
      systemWorkflow: asArray(proposal.sections?.systemWorkflow).length ? proposal.sections.systemWorkflow : asArray(template.sections.systemWorkflow),
      securityAndDataProtection: asArray(proposal.sections?.securityAndDataProtection).length ? proposal.sections.securityAndDataProtection : asArray(template.sections.securityAndDataProtection),
      hostingAndDeployment: asArray(proposal.sections?.hostingAndDeployment),
      projectCostBreakdown: asArray(proposal.sections?.projectCostBreakdown).length ? proposal.sections.projectCostBreakdown : asArray(template.sections.projectCostBreakdown).length ? template.sections.projectCostBreakdown : buildCostRows(proposal.pricing?.totalPrice || quotation.amount || lead.estimatedValue),
      projectInvestmentDetails: proposal.sections?.projectInvestmentDetails || quotation.notes || '',
      supportAndMaintenance: asArray(proposal.sections?.supportAndMaintenance).length ? proposal.sections.supportAndMaintenance : asArray(template.sections.supportAndMaintenance),
      deliverables: asArray(proposal.sections?.deliverables).length ? proposal.sections.deliverables : asArray(template.sections.deliverables),
      conclusion: proposal.sections?.conclusion || '',
      hostingDetails: asArray(proposal.sections?.hostingDetails),
      commercialClarification: asArray(proposal.sections?.commercialClarification),
      whyUs: asArray(proposal.sections?.whyUs).length ? proposal.sections.whyUs : asArray(template.sections.whyUs),
      agreement: proposal.sections?.agreement || 'This proposal is prepared for review and mutual acceptance. Final scope, timeline, and delivery terms will be confirmed in writing before project kickoff.',
      warrantyAndSupport: proposal.sections?.warrantyAndSupport || '',
      intellectualPropertyRights: proposal.sections?.intellectualPropertyRights || 'Project intellectual property and usage rights will be governed by the mutually agreed commercial agreement.',
      hostingThirdPartyServices: proposal.sections?.hostingThirdPartyServices || 'Hosting, domains, SSL certificates, email, SMS, payment gateways, and other third-party subscriptions are subject to the selected provider plans and renewal charges.',
      termination: proposal.sections?.termination || 'Either party may terminate the engagement through written notice as per the mutually accepted agreement. Completed work and approved costs up to the termination date will remain payable.',
      limitationOfLiability: proposal.sections?.limitationOfLiability || 'Taruna Technology liability is limited to the fees received for the agreed project scope and excludes indirect, incidental, or consequential losses.',
      governingLaw: proposal.sections?.governingLaw || 'This proposal will be governed by the applicable laws agreed between both parties.',
      termsAndConditions: asArray(proposal.sections?.termsAndConditions).length ? proposal.sections.termsAndConditions : asArray(template.sections.termsAndConditions),
      projectTimeline: asArray(proposal.sections?.projectTimeline).length ? proposal.sections.projectTimeline : timelineRows,
      paymentTerms: asArray(proposal.sections?.paymentTerms).length ? proposal.sections.paymentTerms : paymentRows
    },
    contactDetails,
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

const fallbackContent = ({ clientDetails = {}, quotation = {}, proposalInputs = {} }) => {
  const template = getProposalTypeTemplate(proposalInputs.proposalType || 'ERP Software');
  const sections = template.sections || {};
  return {
    executiveSummary: proposalInputs.sections?.executiveSummary || sections.executiveSummary || `This proposal outlines a focused ${proposalInputs.proposalType || 'software'} solution for ${proposalInputs.companyName || 'the client'}.`,
    companyIntroduction: proposalInputs.sections?.companyIntroduction || sections.companyIntroduction || 'Taruna Technology provides custom software, automation, and business workflow systems with a focus on reliable delivery and clear support.',
    projectObjectives: asArray(proposalInputs.sections?.projectObjectives).length ? proposalInputs.sections.projectObjectives : asArray(sections.projectObjectives).length ? sections.projectObjectives : [clientDetails.businessNeed || 'Centralize business operations in one reliable software platform.', 'Improve visibility, tracking, and reporting across daily workflows.'],
    proposedSolution: proposalInputs.sections?.proposedSolution || sections.proposedSolution || `A configurable ${proposalInputs.proposalType || 'software'} platform tailored to the supplied business requirements.`,
    scopeOfWork: proposalInputs.sections?.scopeOfWork || sections.scopeOfWork || clientDetails.requirements || '',
    coreModules: proposalInputs.sections?.coreModules?.length ? proposalInputs.sections.coreModules : asArray(sections.coreModules),
    additionalModules: proposalInputs.sections?.additionalModules || [],
    technologyStack: proposalInputs.sections?.technologyStack?.length ? proposalInputs.sections.technologyStack : asArray(sections.technologyStack),
    systemWorkflow: proposalInputs.sections?.systemWorkflow?.length ? proposalInputs.sections.systemWorkflow : asArray(sections.systemWorkflow),
    securityAndDataProtection: proposalInputs.sections?.securityAndDataProtection?.length ? proposalInputs.sections.securityAndDataProtection : asArray(sections.securityAndDataProtection),
    hostingAndDeployment: proposalInputs.sections?.hostingAndDeployment || [],
    supportAndMaintenance: proposalInputs.sections?.supportAndMaintenance?.length ? proposalInputs.sections.supportAndMaintenance : asArray(sections.supportAndMaintenance),
    deliverables: proposalInputs.sections?.deliverables?.length ? proposalInputs.sections.deliverables : asArray(sections.deliverables),
    conclusion: proposalInputs.sections?.conclusion || 'We look forward to collaborating and delivering a practical, scalable solution.',
    whyUs: proposalInputs.sections?.whyUs?.length ? proposalInputs.sections.whyUs : asArray(sections.whyUs),
    commercialClarification: proposalInputs.sections?.commercialClarification?.length ? proposalInputs.sections.commercialClarification : [quotation.notes].filter(Boolean),
    termsAndConditions: proposalInputs.sections?.termsAndConditions?.length ? proposalInputs.sections.termsAndConditions : asArray(sections.termsAndConditions),
    warrantyAndSupport: proposalInputs.sections?.warrantyAndSupport || 'Warranty and support will be provided as mutually agreed in the final project agreement.',
    intellectualPropertyRights: proposalInputs.sections?.intellectualPropertyRights || 'Ownership, usage, and source-code access will be handled as per the final commercial agreement.',
    governingLaw: proposalInputs.sections?.governingLaw || 'Governing law and dispute handling will be finalized in the signed agreement.'
  };
};

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
