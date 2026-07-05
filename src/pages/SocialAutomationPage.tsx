import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocialAutomation, SocialAccount } from '../hooks/useSocialAutomation';
import { SocialHubLayout, OverviewTab, ContentTab, CalendarTab, AutomationsTab, AccountsTab, AnalyticsTab } from '../components/SocialHubLayout';

type TabType = 'overview' | 'content' | 'calendar' | 'automations' | 'accounts' | 'analytics';

export const SocialAutomationPage: React.FC = () => {
    const { user } = useAuth();
    const { getConnectedAccounts, disconnectAccount } = useSocialAutomation();
    const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const appId = user?.defaultAppId || '';

    useEffect(() => {
        const fetchAccounts = async () => {
            if (appId) {
                const result = await getConnectedAccounts(appId);
                const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
                setConnectedAccounts(data);
            }
        };
        fetchAccounts();
    }, [appId]);

    const handleDisconnect = async (accountId: string) => {
        const result = await disconnectAccount(accountId);
        if (result?.success) {
            setConnectedAccounts(prev => prev.filter(a => a.id !== accountId));
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        appId={appId}
                        connectedAccounts={connectedAccounts}
                        onDisconnect={handleDisconnect}
                    />
                );
            case 'content':
                return <ContentTab appId={appId} />;
            case 'calendar':
                return <CalendarTab appId={appId} />;
            case 'automations':
                return <AutomationsTab appId={appId} />;
            case 'accounts':
                return <AccountsTab connectedAccounts={connectedAccounts} />;
            case 'analytics':
                return <AnalyticsTab />;
            default:
                return null;
        }
    };

    if (!appId) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[#1d1d1f]/50 dark:text-white/50">Please select an app to manage social accounts.</p>
            </div>
        );
    }

    return (
        <SocialHubLayout
            appId={appId}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {renderTab()}
        </SocialHubLayout>
    );
};
