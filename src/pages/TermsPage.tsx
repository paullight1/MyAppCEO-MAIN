import React from 'react';
import { LegalArticlePage } from './LegalArticlePage';

export const TermsPage: React.FC = () => {
    return (
        <LegalArticlePage
            eyebrow="Legal / Terms"
            title="Terms of Service"
            description="These terms govern your use of MyAppCEO, including browsing the marketplace, managing app assets, and using investment tools."
            highlights={[
                {
                    title: 'Platform use',
                    description: 'You may use the product only for lawful activity and only if you are authorized to act on the account you access.',
                },
                {
                    title: 'Account responsibility',
                    description: 'Keep your credentials secure, maintain accurate information, and review activity linked to your account.',
                },
                {
                    title: 'Third-party services',
                    description: 'Payments, stores, and external integrations are subject to their own terms, policies, and availability.',
                },
            ]}
            sections={[
                {
                    title: '1. Acceptance and eligibility',
                    body: 'By accessing MyAppCEO you agree to these terms and confirm that you have authority to use the account and to act on behalf of any business, app, or campaign you manage here.',
                    bullets: [
                        'Do not use the platform if you do not agree to these terms.',
                        'Do not create accounts or submit content for someone else without permission.',
                        'You are responsible for complying with local laws that apply to your use of the service.',
                    ],
                },
                {
                    title: '2. Platform services',
                    body: 'MyAppCEO provides tools for app listings, documentation, operations, legal readiness, and investment workflows. We may add, change, suspend, or retire features to keep the platform working safely and efficiently.',
                },
                {
                    title: '3. Accounts and security',
                    body: 'You are responsible for maintaining the confidentiality of your login credentials and for any activity that occurs under your account. Notify us promptly if you suspect unauthorized use or account compromise.',
                    bullets: [
                        'Keep profile, ownership, and payment details accurate.',
                        'Review notifications, transfers, and investment activity regularly.',
                        'Use strong passwords and secure authentication methods where available.',
                    ],
                },
                {
                    title: '4. Marketplace and investment activity',
                    body: 'Listings, valuations, campaigns, and investment materials may rely on user-provided information and third-party data. Verify the underlying asset, legal status, and commercial terms before relying on any page, projection, or workflow in the app.',
                },
                {
                    title: '5. Prohibited use and enforcement',
                    body: 'You may not abuse the service, misrepresent ownership, upload unlawful content, interfere with other users, or attempt to bypass security, rate limits, or access controls. We may restrict or suspend access when activity appears unsafe, fraudulent, or non-compliant.',
                },
                {
                    title: '6. Disclaimers and liability',
                    body: 'The service is provided on an "as available" basis to the extent permitted by law. We do not guarantee uninterrupted availability, investment outcomes, or the accuracy of third-party data, and you remain responsible for your own commercial decisions.',
                },
            ]}
        />
    );
};
