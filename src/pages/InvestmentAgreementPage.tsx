import React from 'react';
import { LegalArticlePage } from './LegalArticlePage';

export const InvestmentAgreementPage: React.FC = () => {
    return (
        <LegalArticlePage
            eyebrow="Legal / Investment"
            title="Investment Agreement"
            description="This agreement sets out the core risk disclosures and operating rules for investment activity made through MyAppCEO."
            highlights={[
                {
                    title: 'Risk disclosure',
                    description: 'Startup and app investments can lose value, become illiquid, or fail to meet projections.',
                },
                {
                    title: 'No guaranteed returns',
                    description: 'The platform does not promise profit, performance, or a successful exit for any campaign.',
                },
                {
                    title: 'Payment and allocation',
                    description: 'Contributions are subject to verification, payment processing, and the campaign terms shown before you commit.',
                },
            ]}
            sections={[
                {
                    title: '1. Investment risk',
                    body: 'Investing in startups, digital assets, or app-linked campaigns is speculative. You may lose some or all of the amount you commit, and you should only invest funds you can afford to lock up or lose.',
                    bullets: [
                        'Past performance or traction does not guarantee future results.',
                        'Valuations and forecasts are estimates, not promises.',
                        'Illiquidity is common and exit timing may be delayed or unavailable.',
                    ],
                },
                {
                    title: '2. Platform role',
                    body: 'MyAppCEO provides a workflow for presenting opportunities, collecting commitments, and coordinating payment or allocation steps. Unless explicitly stated in a transaction document, the platform does not act as your investment adviser, custodian, or guarantor of returns.',
                },
                {
                    title: '3. Commitments and payment processing',
                    body: 'When you confirm an investment, the amount, campaign, and any applicable fees are shown in the UI before you continue. Payment flows may be handled by third-party processors and are subject to their technical checks, verification rules, and settlement timing.',
                },
                {
                    title: '4. Ownership, transfer, and updates',
                    body: 'Any equity, revenue share, or other allocation is only effective when the relevant transaction has been completed and any required business, legal, or regulatory conditions have been satisfied. We may update the workflow, disclosures, or supporting documents if the transaction structure changes.',
                    bullets: [
                        'Confirm the target campaign before committing funds.',
                        'Review the final transaction details shown at checkout.',
                        'Keep copies of any confirmation or receipt data you receive.',
                    ],
                },
                {
                    title: '5. Compliance and identity checks',
                    body: 'We may require identity verification, source-of-funds information, or jurisdiction checks before allowing a transaction to proceed. If a campaign or investor is restricted under applicable law, the platform may block or reverse the workflow as needed to stay compliant.',
                },
                {
                    title: '6. Contact and questions',
                    body: 'If you need help understanding the investment flow, contact support before you commit funds. If there is a discrepancy between the in-app view and a signed transaction document, the signed document governs to the extent permitted by law.',
                },
            ]}
        />
    );
};
