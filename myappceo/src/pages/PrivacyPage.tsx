import React from 'react';
import { LegalArticlePage } from './LegalArticlePage';

export const PrivacyPage: React.FC = () => {
    return (
        <LegalArticlePage
            eyebrow="Legal / Privacy"
            title="Privacy Policy"
            description="This policy explains what information MyAppCEO collects, how we use it, and the choices you have over your data."
            highlights={[
                {
                    title: 'Data we collect',
                    description: 'We may collect account details, profile information, usage data, and transaction records needed to operate the product.',
                },
                {
                    title: 'How we use it',
                    description: 'We use data to provide services, secure accounts, process requests, and meet legal or compliance obligations.',
                },
                {
                    title: 'Your controls',
                    description: 'You can review and update your profile, request help, and exercise rights that apply in your jurisdiction.',
                },
            ]}
            sections={[
                {
                    title: '1. Information we collect',
                    body: 'We may collect the information you provide directly, such as account details, profile information, uploads, messages, support requests, and financial or investment inputs. We also collect technical data such as device information, IP address, browser data, and usage events needed to keep the service reliable.',
                    bullets: [
                        'Account and profile data',
                        'Content you submit to the platform',
                        'Payment, campaign, and transaction records',
                        'Device, browser, and analytics data',
                    ],
                },
                {
                    title: '2. How we use information',
                    body: 'We use information to deliver the platform, personalize your experience, secure accounts, detect abuse, process investments and payouts, provide support, and comply with legal obligations. We may also use aggregated or de-identified data for analytics and product improvement.',
                },
                {
                    title: '3. How we share information',
                    body: 'We may share information with service providers that help us host, process payments, send communications, analyze usage, or support customer requests. We may also share information when required by law, to protect rights and security, or when you direct us to share it with another user or third party.',
                    bullets: [
                        'Payment and infrastructure providers',
                        'Counterparties involved in a listing, transfer, or investment workflow',
                        'Regulators, law enforcement, or legal advisers when required',
                    ],
                },
                {
                    title: '4. Retention and security',
                    body: 'We retain information for as long as needed to operate the service, meet legal obligations, resolve disputes, and enforce our agreements. We use administrative, technical, and organizational safeguards, but no online system can be guaranteed to be completely secure.',
                },
                {
                    title: '5. Your choices and rights',
                    body: 'You can review or update certain account details through the app and contact support if you want help with access, deletion, or a privacy question. Depending on your location, you may also have additional rights to access, correct, restrict, or delete personal data.',
                },
                {
                    title: '6. Contact',
                    body: 'If you have a privacy question, contact support through the app and include enough detail for us to identify the account or data request. We will route the request to the appropriate team for follow-up.',
                },
            ]}
        />
    );
};
