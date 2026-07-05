import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage').then((m) => ({ default: m.ListingDetailPage })));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage').then((m) => ({ default: m.CreateListingPage })));
const EditListingPage = lazy(() => import('./pages/EditListingPage').then((m) => ({ default: m.EditListingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AppDetailPage = lazy(() => import('./pages/AppDetailPage').then((m) => ({ default: m.AppDetailPage })));
const AppsPage = lazy(() => import('./pages/AppsPage').then((m) => ({ default: m.AppsPage })));
const AppIntakePage = lazy(() => import('./pages/AppIntakePage').then((m) => ({ default: m.AppIntakePage })));
const PromotionHubPage = lazy(() => import('./pages/PromotionHubPage').then((m) => ({ default: m.PromotionHubPage })));
const CreatorMarketplacePage = lazy(() => import('./pages/CreatorMarketplacePage').then((m) => ({ default: m.CreatorMarketplacePage })));
const PromotionAnalyticsPage = lazy(() => import('./pages/PromotionAnalyticsPage').then((m) => ({ default: m.PromotionAnalyticsPage })));
const FinancesPage = lazy(() => import('./pages/FinancesPage').then((m) => ({ default: m.FinancesPage })));
const StakesPage = lazy(() => import('./pages/StakesPage').then((m) => ({ default: m.StakesPage })));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage').then((m) => ({ default: m.ConnectionsPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const TopicDetailPage = lazy(() => import('./pages/TopicDetailPage').then((m) => ({ default: m.TopicDetailPage })));
const CommunityProfilePage = lazy(() => import('./pages/CommunityProfilePage').then((m) => ({ default: m.CommunityProfilePage })));
const CommunityStarsPage = lazy(() => import('./pages/CommunityStarsPage').then((m) => ({ default: m.CommunityStarsPage })));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage').then((m) => ({ default: m.MarketplacePage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage })));
const DevPortalPage = lazy(() => import('./pages/DevPortalPage').then((m) => ({ default: m.DevPortalPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const ManageListingsPage = lazy(() => import('./pages/ManageListingsPage').then((m) => ({ default: m.ManageListingsPage })));
const AdminReviewQueuePage = lazy(() => import('./pages/AdminReviewQueuePage').then((m) => ({ default: m.AdminReviewQueuePage })));
const AdminNotificationPage = lazy(() => import('./pages/AdminNotificationPage').then((m) => ({ default: m.AdminNotificationPage })));
const AdminBlogPage = lazy(() => import('./pages/AdminBlogPage').then((m) => ({ default: m.AdminBlogPage })));
const AdminVerificationQueuePage = lazy(() => import('./pages/AdminVerificationQueuePage').then((m) => ({ default: m.AdminVerificationQueuePage })));
const InvestPage = lazy(() => import('./pages/InvestPage').then((m) => ({ default: m.InvestPage })));
const BrowsePage = lazy(() => import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage })));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const VerificationPage = lazy(() => import('./pages/VerificationPage').then((m) => ({ default: m.VerificationPage })));
const DocumentationCenterPage = lazy(() => import('./pages/DocumentationCenterPage').then((m) => ({ default: m.DocumentationCenterPage })));
const DocsRedirectPage = lazy(() => import('./pages/DocsRedirectPage').then((m) => ({ default: m.DocsRedirectPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const InvestmentAgreementPage = lazy(() => import('./pages/InvestmentAgreementPage').then((m) => ({ default: m.InvestmentAgreementPage })));
const CreateIdeaPage = lazy(() => import('./pages/CreateIdeaPage').then((m) => ({ default: m.CreateIdeaPage })));
const IdeaDetailPage = lazy(() => import('./pages/IdeaDetailPage').then((m) => ({ default: m.IdeaDetailPage })));
const MyIdeasPage = lazy(() => import('./pages/MyIdeasPage').then((m) => ({ default: m.MyIdeasPage })));
const CreateCampaignPage = lazy(() => import('./pages/CreateCampaignPage').then((m) => ({ default: m.CreateCampaignPage })));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })));
const MyCampaignsPage = lazy(() => import('./pages/MyCampaignsPage').then((m) => ({ default: m.MyCampaignsPage })));
const MyInvestmentsPage = lazy(() => import('./pages/MyInvestmentsPage').then((m) => ({ default: m.MyInvestmentsPage })));
const AppDashboardPage = lazy(() => import('./pages/AppDashboardPage').then((m) => ({ default: m.AppDashboardPage })));
const InvestorPortfolioPage = lazy(() => import('./pages/InvestorPortfolioPage').then((m) => ({ default: m.InvestorPortfolioPage })));
const CampaignInvestPage = lazy(() => import('./pages/CampaignInvestPage').then((m) => ({ default: m.CampaignInvestPage })));
const BrowseCampaignsPage = lazy(() => import('./pages/BrowseCampaignsPage').then((m) => ({ default: m.BrowseCampaignsPage })));
const PhaseDetailPage = lazy(() => import('./pages/PhaseDetailPage').then((m) => ({ default: m.PhaseDetailPage })));
const CreateDeploymentPage = lazy(() => import('./pages/CreateDeploymentPage').then((m) => ({ default: m.CreateDeploymentPage })));
const PRDMindMapPage = lazy(() => import('./pages/PRDMindMapPage').then((m) => ({ default: m.PRDMindMapPage })));
const DesignStudioPage = lazy(() => import('./pages/DesignStudioPage').then((m) => ({ default: m.DesignStudioPage })));
const CapTablePage = lazy(() => import('./pages/CapTablePage').then((m) => ({ default: m.CapTablePage })));
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const EquitySplitPage = lazy(() => import('./pages/EquitySplitPage').then((m) => ({ default: m.EquitySplitPage })));
const LegalEntityPage = lazy(() => import('./pages/LegalEntityPage').then((m) => ({ default: m.LegalEntityPage })));
const StakeMonitorPage = lazy(() => import('./pages/StakeMonitorPage').then((m) => ({ default: m.StakeMonitorPage })));
const StoreAppDetailPage = lazy(() => import('./pages/StoreAppDetailPage').then((m) => ({ default: m.StoreAppDetailPage })));
const EscrowDashboardPage = lazy(() => import('./pages/EscrowDashboardPage').then((m) => ({ default: m.EscrowDashboardPage })));
const EscrowDealDetailPage = lazy(() => import('./pages/EscrowDealDetailPage').then((m) => ({ default: m.EscrowDealDetailPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
);

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/browse" element={<BrowsePage />} />
                    <Route path="/marketplace" element={<MarketplacePage />} />
                    <Route path="/app/:id" element={<AppDetailPage />} />
                    <Route path="/listings/:id" element={<ListingDetailPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/community/topic/:slug" element={<TopicDetailPage />} />
                    <Route path="/community/profile/:userId" element={<CommunityProfilePage />} />
                    <Route path="/community/stars" element={<CommunityStarsPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/category/:category" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/oauth-callback/meta" element={<OAuthCallbackPage />} />
                    <Route path="/oauth-callback/tiktok" element={<OAuthCallbackPage />} />
                    <Route path="/oauth-callback/twitter" element={<OAuthCallbackPage />} />
                    <Route path="/promote" element={<PromotionHubPage />} />
                    <Route path="/promote/creators" element={<CreatorMarketplacePage />} />
                    <Route path="/promote/analytics" element={<PromotionAnalyticsPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/investment-terms" element={<InvestmentAgreementPage />} />
                    <Route path="/invest" element={<InvestPage />} />
                    <Route path="/campaigns" element={<BrowseCampaignsPage />} />
                    <Route path="/documentation" element={<DocumentationCenterPage />} />
                    <Route path="/ideas/:id" element={<IdeaDetailPage />} />
                    <Route path="/store-apps/:platform/:id" element={<StoreAppDetailPage />} />
                    <Route path="/docs" element={<DocsRedirectPage />} />

                    {/* Protected routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/apps" element={<ProtectedRoute><AppsPage /></ProtectedRoute>} />
                    <Route path="/apps/new" element={<ProtectedRoute><AppIntakePage /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/verify" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
                    <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
                    <Route path="/developers" element={<ProtectedRoute><DevPortalPage /></ProtectedRoute>} />
                    <Route path="/audit-log" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
                    <Route path="/manage-listings" element={<ProtectedRoute><ManageListingsPage /></ProtectedRoute>} />
                    <Route path="/admin/review" element={<ProtectedRoute><AdminReviewQueuePage /></ProtectedRoute>} />
                    <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotificationPage /></ProtectedRoute>} />
                    <Route path="/admin/blog" element={<ProtectedRoute><AdminBlogPage /></ProtectedRoute>} />
                    <Route path="/admin/verifications" element={<ProtectedRoute><AdminVerificationQueuePage /></ProtectedRoute>} />
                    <Route path="/finances" element={<ProtectedRoute><FinancesPage /></ProtectedRoute>} />
                    <Route path="/stakes" element={<ProtectedRoute><StakesPage /></ProtectedRoute>} />
                    <Route path="/stakes/monitor" element={<ProtectedRoute><StakeMonitorPage /></ProtectedRoute>} />
                    <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
                    <Route path="/listings/new" element={<ProtectedRoute><CreateListingPage /></ProtectedRoute>} />
                    <Route path="/listings/:id/edit" element={<ProtectedRoute><EditListingPage /></ProtectedRoute>} />
                    <Route path="/ideas/new" element={<ProtectedRoute><CreateIdeaPage /></ProtectedRoute>} />
                    <Route path="/my-ideas" element={<ProtectedRoute><MyIdeasPage /></ProtectedRoute>} />
                    <Route path="/campaigns/new" element={<ProtectedRoute><CreateCampaignPage /></ProtectedRoute>} />
                    <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetailPage /></ProtectedRoute>} />
                    <Route path="/campaigns/:id/invest" element={<ProtectedRoute><CampaignInvestPage /></ProtectedRoute>} />
                    <Route path="/my-campaigns" element={<ProtectedRoute><MyCampaignsPage /></ProtectedRoute>} />
                    <Route path="/my-investments" element={<ProtectedRoute><MyInvestmentsPage /></ProtectedRoute>} />
                    <Route path="/escrow" element={<ProtectedRoute><EscrowDashboardPage /></ProtectedRoute>} />
                    <Route path="/escrow/:id" element={<ProtectedRoute><EscrowDealDetailPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/dashboard" element={<ProtectedRoute><AppDashboardPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/cap-table" element={<ProtectedRoute><CapTablePage /></ProtectedRoute>} />
                    <Route path="/legal" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/legal" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/equity" element={<ProtectedRoute><EquitySplitPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/formation" element={<ProtectedRoute><LegalEntityPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/phases/:phaseId" element={<ProtectedRoute><PhaseDetailPage /></ProtectedRoute>} />
                    <Route path="/apps/:id/deployments/new" element={<ProtectedRoute><CreateDeploymentPage /></ProtectedRoute>} />
                    <Route path="/portfolio" element={<ProtectedRoute><InvestorPortfolioPage /></ProtectedRoute>} />
                    <Route path="/portfolio/:appId" element={<ProtectedRoute><InvestorPortfolioPage /></ProtectedRoute>} />
                    <Route path="/prd-mindmap" element={<ProtectedRoute><PRDMindMapPage /></ProtectedRoute>} />
                    <Route path="/prd-mindmap/:id" element={<ProtectedRoute><PRDMindMapPage /></ProtectedRoute>} />
                    <Route path="/design-studio/:id" element={<ProtectedRoute><DesignStudioPage /></ProtectedRoute>} />

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </Suspense>
            </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
