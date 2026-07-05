export type LicenseApplicationField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'url';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type LicenseApplicationProfile = {
  logoDomain: string;
  regulatorSummary: string;
  officialApplicationUrl: string;
  officialRequirementsUrl?: string;
  requiredDocuments: string[];
  applicationFields: LicenseApplicationField[];
  reviewChecklist: string[];
};

const entityFields: LicenseApplicationField[] = [
  { name: 'businessName', label: 'Registered business name', type: 'text', placeholder: 'e.g. MyAppCEO Technologies Ltd', required: true },
  { name: 'registrationNumber', label: 'CAC registration number', type: 'text', placeholder: 'RC / BN number where available' },
  { name: 'businessAddress', label: 'Registered business address', type: 'textarea', placeholder: 'Full Nigerian business address', required: true },
  {
    name: 'businessType',
    label: 'Business type',
    type: 'select',
    required: true,
    options: [
      { label: 'Business Name', value: 'business_name' },
      { label: 'Limited Liability Company', value: 'limited_company' },
      { label: 'Partnership', value: 'partnership' },
      { label: 'Non-profit / Incorporated Trustee', value: 'non_profit' },
    ],
  },
];

const complianceContactFields: LicenseApplicationField[] = [
  { name: 'complianceOfficer', label: 'Compliance officer / lead', type: 'text', placeholder: 'Name of person responsible for compliance', required: true },
  { name: 'productUrl', label: 'App or product URL', type: 'url', placeholder: 'https://...' },
  { name: 'userCount', label: 'Estimated Nigerian users', type: 'number', placeholder: 'e.g. 5000' },
];

export const LEGAL_LICENSE_PROFILES: Record<string, LicenseApplicationProfile> = {
  CAC_COMPANY_REGISTRATION: {
    logoDomain: 'cac.gov.ng',
    regulatorSummary: 'Company incorporation or business-name registration needed before banking, contracts, tax setup, and most regulated app activity.',
    officialApplicationUrl: 'https://www.cac.gov.ng/companies/',
    officialRequirementsUrl: 'https://www.cac.gov.ng/companies/',
    requiredDocuments: ['Name reservation details', 'Founder/director identity document', 'Registered office address', 'Shareholding or ownership structure', 'Nature of business description'],
    applicationFields: [
      ...entityFields,
      { name: 'proposedNames', label: 'Proposed business names', type: 'textarea', placeholder: 'List 2 preferred names in order', required: true },
      { name: 'shareCapital', label: 'Share capital / ownership split', type: 'textarea', placeholder: 'Founder names and ownership percentages' },
    ],
    reviewChecklist: ['Confirm name availability', 'Prepare director/proprietor IDs', 'Confirm registered address', 'Choose entity type before filing'],
  },
  NDPC_DATA_PROTECTION: {
    logoDomain: 'ndpc.gov.ng',
    regulatorSummary: 'Privacy and data protection compliance for apps collecting user data, device data, payments, location, health, education, or behavioral information.',
    officialApplicationUrl: 'https://services.ndpc.gov.ng/',
    officialRequirementsUrl: 'https://ndpc.gov.ng/dpco-registration-requirements/',
    requiredDocuments: ['Privacy policy', 'Data processing inventory', 'Consent and lawful-basis record', 'Security controls summary', 'Data breach response process'],
    applicationFields: [
      ...entityFields,
      ...complianceContactFields,
      { name: 'dataCategories', label: 'Personal data collected', type: 'textarea', placeholder: 'Names, phone numbers, location, payment data, analytics events...', required: true },
      { name: 'processingPurpose', label: 'Purpose of processing', type: 'textarea', placeholder: 'Explain why the app collects and processes the data', required: true },
      { name: 'privacyNoticeUrl', label: 'Privacy notice URL', type: 'url', placeholder: 'https://yourapp.com/privacy', required: true },
      { name: 'dpoContact', label: 'DPO / privacy contact', type: 'text', placeholder: 'Name or email of the privacy lead', required: true },
    ],
    reviewChecklist: ['Map all data collected by the app', 'Publish privacy notice', 'Assign a compliance owner', 'Prepare audit evidence where applicable'],
  },
  FIRS_TIN_VAT: {
    logoDomain: 'firs.gov.ng',
    regulatorSummary: 'Tax registration for revenue-generating apps, subscriptions, marketplaces, platform fees, and business invoicing.',
    officialApplicationUrl: 'https://ecitizen.firs.gov.ng/en/signup',
    officialRequirementsUrl: 'https://ecitizen.firs.gov.ng/en/signup',
    requiredDocuments: ['CAC certificate', 'Director/proprietor tax information', 'Business address proof', 'Bank details where applicable', 'Revenue model summary'],
    applicationFields: [
      ...entityFields,
      { name: 'taxIdentificationNumber', label: 'Tax identification number', type: 'text', placeholder: 'TIN / NRS / JTB number', required: true },
      { name: 'companyState', label: 'Company state', type: 'text', placeholder: 'State of registration or operation', required: true },
      { name: 'bankName', label: 'Bank name', type: 'text', placeholder: 'e.g. GTBank', required: true },
      { name: 'bankAccountNumber', label: 'Bank account number', type: 'text', placeholder: 'Company account number', required: true },
      { name: 'revenueModel', label: 'Revenue model', type: 'textarea', placeholder: 'Subscription, marketplace fees, ads, commission, one-time sales...', required: true },
      { name: 'expectedMonthlyRevenue', label: 'Expected monthly revenue', type: 'text', placeholder: 'e.g. NGN 2,000,000' },
    ],
    reviewChecklist: ['Confirm CAC registration', 'Prepare tax contact details', 'Document revenue channels', 'Confirm VAT applicability'],
  },
  CBN_PSSP: {
    logoDomain: 'cbn.gov.ng',
    regulatorSummary: 'Payment infrastructure authorization for gateways, payment processing, merchant payment tools, and payment-solution services.',
    officialApplicationUrl: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
    officialRequirementsUrl: 'https://www.cbn.gov.ng/out/2021/ccd/approved%20new%20licence%20categorization%20requirements%20consolidated%20-%202021.pdf',
    requiredDocuments: ['CAC documents', 'Business plan', 'Technical architecture', 'Risk management framework', 'AML/CFT policy', 'Capital and financial evidence'],
    applicationFields: [
      ...entityFields,
      ...complianceContactFields,
      { name: 'paymentFlow', label: 'Payment flow description', type: 'textarea', placeholder: 'Describe who pays, who receives funds, settlement flow, and partners', required: true },
      { name: 'settlementPartners', label: 'Banks / processors / partners', type: 'textarea', placeholder: 'List settlement banks, processors, or switching partners' },
      { name: 'capitalEvidence', label: 'Capital evidence summary', type: 'textarea', placeholder: 'Describe shareholder funds, escrow, or proof of capital readiness', required: true },
    ],
    reviewChecklist: ['Document payment architecture', 'Prepare compliance policies', 'Confirm capital requirements', 'Identify settlement partners'],
  },
  CBN_MMO: {
    logoDomain: 'cbn.gov.ng',
    regulatorSummary: 'Mobile money license path for wallets, stored value, transfers, agent networks, and mobile-money operations.',
    officialApplicationUrl: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
    officialRequirementsUrl: 'https://www.cbn.gov.ng/out/2021/ccd/approved%20new%20licence%20categorization%20requirements%20consolidated%20-%202021.pdf',
    requiredDocuments: ['CAC documents', 'Capital evidence', 'AML/CFT policy', 'Wallet operations plan', 'Agent network plan', 'Consumer protection process'],
    applicationFields: [
      ...entityFields,
      ...complianceContactFields,
      { name: 'walletModel', label: 'Wallet / stored-value model', type: 'textarea', placeholder: 'Explain balances, transfers, cash-in/cash-out, and limits', required: true },
      { name: 'agentNetwork', label: 'Agent or partner network', type: 'textarea', placeholder: 'Describe agents, branches, or distribution partners' },
      { name: 'consumerProtection', label: 'Consumer protection process', type: 'textarea', placeholder: 'Explain complaints, disputes, reversals, and customer support', required: true },
    ],
    reviewChecklist: ['Prepare wallet operations plan', 'Define transaction limits', 'Document AML monitoring', 'Confirm customer support and dispute flow'],
  },
  CBN_PTSP: {
    logoDomain: 'cbn.gov.ng',
    regulatorSummary: 'Authorization for POS terminal deployment, terminal support, merchant devices, and payment terminal service operations.',
    officialApplicationUrl: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
    officialRequirementsUrl: 'https://www.cbn.gov.ng/out/2021/ccd/approved%20new%20licence%20categorization%20requirements%20consolidated%20-%202021.pdf',
    requiredDocuments: ['CAC documents', 'Terminal management process', 'Technical certification', 'Merchant support plan', 'Risk and dispute process'],
    applicationFields: [
      ...entityFields,
      { name: 'terminalModel', label: 'Terminal service model', type: 'textarea', placeholder: 'Describe devices, merchant onboarding, and support operations', required: true },
      { name: 'devicePartners', label: 'Device or processor partners', type: 'textarea', placeholder: 'List device vendors, processors, or banks' },
      { name: 'supportStrategy', label: 'Support and uptime strategy', type: 'textarea', placeholder: 'Explain 24/7 support, replacement, and issue-resolution timelines', required: true },
    ],
    reviewChecklist: ['Document terminal lifecycle', 'Prepare support process', 'Confirm device certification path', 'Define merchant dispute flow'],
  },
  NCC_VAS: {
    logoDomain: 'ncc.gov.ng',
    regulatorSummary: 'Telecom-facing approval for SMS, USSD, carrier billing, mobile content, and operator-integrated app services.',
    officialApplicationUrl: 'https://ncc.gov.ng/sites/default/files/2024-11/Documents/Technical%20Standard-Short%20Code_Application%20Form221214.pdf',
    officialRequirementsUrl: 'https://ncc.gov.ng/sites/default/files/2024-11/Documents/Technical%20Standard-Short%20Code_Application%20Form221214.pdf',
    requiredDocuments: ['CAC documents', 'MNO MoU or prerequisite licence evidence', 'Network architecture', 'Short code / VAS application form', 'Telecom partner evidence'],
    applicationFields: [
      ...entityFields,
      { name: 'telecomService', label: 'Telecom service type', type: 'textarea', placeholder: 'SMS, USSD, carrier billing, subscription content, telco API...', required: true },
      { name: 'shortCodeRequest', label: 'Short code / VAS request', type: 'textarea', placeholder: 'Explain the short code, service flow, and operator dependency', required: true },
      { name: 'operatorPartners', label: 'Operator / aggregator partners', type: 'textarea', placeholder: 'MTN, Airtel, Glo, 9mobile, aggregators, or API partners', required: true },
      { name: 'licenseEvidence', label: 'Primary licence evidence', type: 'textarea', placeholder: 'CBN mobile money, lottery, or other prerequisite licence if applicable' },
    ],
    reviewChecklist: ['Confirm telco integration model', 'Document consumer pricing', 'Prepare opt-in and opt-out flow', 'Prepare partner evidence'],
  },
  FCCPC_DML: {
    logoDomain: 'fccpc.gov.ng',
    regulatorSummary: 'Digital lending registration for loan apps, BNPL, salary advances, and consumer credit products.',
    officialApplicationUrl: 'https://fccpc.gov.ng/wp-content/uploads/2025/12/DEON-Consumer-Lending-Application-Forms.pdf',
    officialRequirementsUrl: 'https://fccpc.gov.ng/wp-content/uploads/2025/12/DEON-Consumer-Lending-Application-Forms.pdf',
    requiredDocuments: [
      'Forms 001, 002, and 003',
      'CAC incorporation documents and MEMART',
      'Board and key management profile',
      'Shareholder and beneficial ownership details',
      'Operational bank account details',
      'Company terms of use, privacy policy, and code of conduct',
      'Compliance audit / privacy impact report',
      'Complaint resolution process',
      'Tax payment evidence or waiver',
      'Sector licence evidence where applicable',
    ],
    applicationFields: [
      ...entityFields,
      ...complianceContactFields,
      { name: 'websiteUrl', label: 'Business website', type: 'url', placeholder: 'https://...', required: true },
      { name: 'creditProduct', label: 'Credit product description', type: 'textarea', placeholder: 'Loan size, tenure, pricing, eligibility, and recovery approach', required: true },
      { name: 'fundingSources', label: 'Funding sources', type: 'textarea', placeholder: 'Equity, debt, partners, or other financing sources', required: true },
      { name: 'consumerProtection', label: 'Consumer protection process', type: 'textarea', placeholder: 'Complaints, disclosures, collections, and dispute resolution', required: true },
      { name: 'appList', label: 'Apps or web links in operation', type: 'textarea', placeholder: 'List every app, web link, or lender-facing URL', required: true },
    ],
    reviewChecklist: ['Document lending terms clearly', 'Review collection practices', 'Prepare privacy and consent flow', 'Prepare customer complaints process'],
  },
  SEC_CROWDFUNDING: {
    logoDomain: 'sec.gov.ng',
    regulatorSummary: 'Capital-market registration path for crowdfunding portals, securities products, investment apps, and regulated fintech investment products.',
    officialApplicationUrl: 'https://sec.gov.ng/about/resources/checklists/individual-registration-requirements-for-each-cmo/crowdfunding-intermediary-registration-requirements/',
    officialRequirementsUrl: 'https://sec.gov.ng/about/resources/checklists/individual-registration-requirements-for-each-cmo/crowdfunding-intermediary-registration-requirements/',
    requiredDocuments: [
      'Forms SEC 3 and 3B for the company',
      'Forms SEC 2 and 2D for sponsored individuals and directors',
      'Evidence of filing, processing, and registration fees',
      'Audited accounts or statement of affairs',
      'Operational manual and risk controls',
      'Minimum capital and fidelity bond evidence',
      'Domain names and online identifiers for the portal',
      'Board / sponsored-individual governance documentation',
      'Investor risk disclosures and trust account controls',
    ],
    applicationFields: [
      ...entityFields,
      ...complianceContactFields,
      { name: 'portalDomain', label: 'Crowdfunding portal domain', type: 'url', placeholder: 'https://portal.example.com', required: true },
      { name: 'investmentModel', label: 'Investment model', type: 'textarea', placeholder: 'Crowdfunding, securities, pooled investment, digital sub-broker, tokenized offer...', required: true },
      { name: 'sponsoredIndividuals', label: 'Sponsored individuals', type: 'textarea', placeholder: 'List at least three sponsored individuals and their roles', required: true },
      { name: 'investorProtection', label: 'Investor protection controls', type: 'textarea', placeholder: 'Risk disclosures, suitability, custody, reporting, complaints', required: true },
      { name: 'minimumCapitalEvidence', label: 'Minimum capital / fidelity bond', type: 'textarea', placeholder: 'Describe capital proof and fidelity bond coverage', required: true },
    ],
    reviewChecklist: ['Confirm whether product is a security', 'Prepare investor disclosures', 'Document custody and governance', 'Prepare AML/CFT controls'],
  },
  NDIC_DEPOSIT_INSURANCE: {
    logoDomain: 'ndic.gov.ng',
    regulatorSummary: 'Deposit insurance compliance relevant to licensed banks, microfinance banks, and deposit-taking institutions.',
    officialApplicationUrl: 'https://ndic.gov.ng/project/deposit-insurance/',
    officialRequirementsUrl: 'https://ndic.gov.ng/project/deposit-insurance/',
    requiredDocuments: ['CBN license pathway evidence', 'Deposit-taking approval', 'Customer deposit records process', 'Regulatory returns process', 'Resolution and reporting controls'],
    applicationFields: [
      ...entityFields,
      { name: 'cbnLicenseStatus', label: 'CBN license status', type: 'textarea', placeholder: 'Existing license, application stage, or sponsor institution', required: true },
      { name: 'depositModel', label: 'Deposit model', type: 'textarea', placeholder: 'Explain customer balances, deposit products, and institution backing', required: true },
    ],
    reviewChecklist: ['Confirm CBN deposit-taking license path', 'Document customer deposit records', 'Prepare reporting process', 'Confirm institutional sponsor where needed'],
  },
  NAICOM_INSURANCE: {
    logoDomain: 'naicom.gov.ng',
    regulatorSummary: 'Insurance-sector approval for insurtech apps, policy comparison, aggregators, and embedded insurance distribution.',
    officialApplicationUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/07/Guidelines-for-Insurtech-Operations-in-Nigeria.pdf',
    officialRequirementsUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/07/Guidelines-for-Insurtech-Operations-in-Nigeria.pdf',
    requiredDocuments: [
      'Letter of intent from promoters',
      'Completed application form and fee evidence',
      'Certificate of incorporation as insurtech limited liability company',
      'CAC certified documents and memorandum/articles',
      'SLA or partnership agreement with insurer',
      'Five-year business plan and feasibility study',
      'Principal officer and senior officer appointments',
      'Board approval and no-objection / approval where required',
      'Evidence of minimum statutory deposit or sandbox requirements where applicable',
    ],
    applicationFields: [
      ...entityFields,
      { name: 'applicationType', label: 'Application type', type: 'select', required: true, options: [
        { label: 'Standalone insurtech', value: 'standalone' },
        { label: 'Partnering insurtech', value: 'partnering' },
      ] },
      { name: 'insuranceProducts', label: 'Insurance products', type: 'textarea', placeholder: 'Policy types, underwriters, distribution model, and commissions', required: true },
      { name: 'insurancePartners', label: 'Licensed insurance partners', type: 'textarea', placeholder: 'List insurers, brokers, or underwriters', required: true },
      { name: 'businessPlanSummary', label: 'Five-year business plan summary', type: 'textarea', placeholder: 'Revenue model, projections, and operating assumptions', required: true },
      { name: 'principalOfficer', label: 'Principal officer', type: 'text', placeholder: 'Name of the principal officer', required: true },
    ],
    reviewChecklist: ['Confirm licensed insurance partner', 'Prepare product disclosures', 'Document claims/complaints flow', 'Review data protection controls'],
  },
  NOTAP_TECH_TRANSFER: {
    logoDomain: 'notap.gov.ng',
    regulatorSummary: 'Registration support for foreign software licensing, IP licensing, technical service, and technology-transfer agreements.',
    officialApplicationUrl: 'https://notap.gov.ng/services/ttr.html',
    officialRequirementsUrl: 'https://www.notap.gov.ng/assets/docs/Registration_Technology_Transfer%20Agreements_%20Requirements.pdf',
    requiredDocuments: [
      'Completed NOTAP questionnaire/application forms',
      'Technology transfer agreement or software license agreement',
      'CAC incorporation documents and MEMART',
      'Foreign company / licensor profile',
      'TIN and tax clearance certificate',
      'Audited accounts and turnover evidence',
      'Fee, royalty, or service structure',
      'IP ownership and capital importation evidence where applicable',
    ],
    applicationFields: [
      ...entityFields,
      { name: 'agreementType', label: 'Agreement type', type: 'select', required: true, options: [
        { label: 'Software license', value: 'software_license' },
        { label: 'Technical know-how', value: 'technical_know_how' },
        { label: 'Technical services', value: 'technical_services' },
        { label: 'Consultancy services', value: 'consultancy_services' },
        { label: 'Management services', value: 'management_services' },
      ] },
      { name: 'foreignPartner', label: 'Foreign technology partner', type: 'text', placeholder: 'Company / licensor name', required: true },
      { name: 'technologyScope', label: 'Technology or IP scope', type: 'textarea', placeholder: 'Describe software, IP, technical support, fees, and duration', required: true },
      { name: 'feeStructure', label: 'Fee or royalty structure', type: 'textarea', placeholder: 'Describe lump-sum, annual technical support, royalty, or per diem terms', required: true },
      { name: 'ipOwnership', label: 'IP ownership / registration evidence', type: 'textarea', placeholder: 'Trademark, patent, know-how, or related registration evidence', required: true },
    ],
    reviewChecklist: ['Prepare signed draft agreement', 'Document IP ownership', 'Confirm fee and royalty terms', 'Map services to Nigerian business need'],
  },
};

export const getLicenseApplicationProfile = (code?: string): LicenseApplicationProfile => {
  if (code && LEGAL_LICENSE_PROFILES[code]) return LEGAL_LICENSE_PROFILES[code];
  const regulator = code?.split('_')[0];
  const fallbackKey = Object.keys(LEGAL_LICENSE_PROFILES).find(key => key.startsWith(`${regulator}_`));
  return fallbackKey ? LEGAL_LICENSE_PROFILES[fallbackKey] : LEGAL_LICENSE_PROFILES.CAC_COMPANY_REGISTRATION;
};
