const fs = require('fs');
const path = require('path');

const files = [
  'AnalyticsPage.tsx', 'AppDetailPage.tsx', 'AppsPage.tsx', 'AuditLogPage.tsx', 
  'AuthPage.tsx', 'BrowsePage.tsx', 'CommunityPage.tsx', 'CreateListingPage.tsx', 
  'CreatorsPage.tsx', 'DashboardPage.tsx', 'DevPortalPage.tsx', 
  'DocumentationCenterPage.tsx', 'EscrowDashboardPage.tsx', 'FinancesPage.tsx', 
  'HomePage.tsx', 'InvestPage.tsx', 'ListingDetailPage.tsx', 'MarketplacePage.tsx', 
  'SettingsPage.tsx', 'StakesPage.tsx', 'SupportPage.tsx'
];

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join('c:/Users/USER/Desktop/PROJECTS/MVPLAB/MVPLABX/apps/MVPLAB_MARKETPLACE/src/pages', file);
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', file);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Replace variety of "MVPLab" patterns
  content = content.replace(/MVPLab X/g, 'MY APPCEO');
  content = content.replace(/MVPLab CEO/g, 'MY APPCEO');
  content = content.replace(/MVPLab/g, 'MY APPCEO');
  content = content.replace(/MVP Lab/g, 'MY APPCEO');

  if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
      console.log('Updated', file);
  }
}

console.log('Done. Updated', updatedCount, 'files.');
