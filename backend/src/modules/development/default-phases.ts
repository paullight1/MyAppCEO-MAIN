export const DEFAULT_PHASES: DefaultPhase[] = [
  {
    phaseNumber: 1,
    name: 'Planning',
    description: 'Requirements gathering, technical planning, and architecture design',
    estimatedDays: 14,
    milestones: [
      { title: 'Requirements finalized', description: 'All requirements documented and approved', requiresOwnerApproval: true },
      { title: 'Tech stack decided', description: 'Technology choices documented', requiresOwnerApproval: false },
      { title: 'Architecture design', description: 'System architecture documented', requiresOwnerApproval: false },
      { title: 'Sprint planning', description: 'Initial sprints planned out', requiresOwnerApproval: false },
    ],
  },
  {
    phaseNumber: 2,
    name: 'Design',
    description: 'UI/UX design, wireframes, and visual design',
    estimatedDays: 21,
    milestones: [
      { title: 'Wireframes complete', description: 'All screen wireframes created', requiresOwnerApproval: false },
      { title: 'Visual design approved', description: 'Final designs approved by owner', requiresOwnerApproval: true },
      { title: 'Design system created', description: 'Components and style guide ready', requiresOwnerApproval: false },
      { title: 'Prototype ready', description: 'Interactive prototype available', requiresOwnerApproval: false },
    ],
  },
  {
    phaseNumber: 3,
    name: 'Development',
    description: 'Core feature development and backend implementation',
    estimatedDays: 60,
    milestones: [
      { title: 'Backend API complete', description: 'All backend endpoints functional', requiresOwnerApproval: false },
      { title: 'Core features implemented', description: 'MVP features working', requiresOwnerApproval: false },
      { title: 'Integrations complete', description: 'Third-party integrations working', requiresOwnerApproval: false },
      { title: 'Development milestone', description: 'All planned features complete', requiresOwnerApproval: true },
    ],
  },
  {
    phaseNumber: 4,
    name: 'Testing',
    description: 'QA testing, bug fixes, and performance optimization',
    estimatedDays: 21,
    milestones: [
      { title: 'Unit tests written', description: 'Code coverage > 80%', requiresOwnerApproval: false },
      { title: 'Integration tests passing', description: 'All integration tests green', requiresOwnerApproval: false },
      { title: 'UAT complete', description: 'User acceptance testing done', requiresOwnerApproval: true },
      { title: 'Performance optimized', description: 'Performance benchmarks met', requiresOwnerApproval: false },
    ],
  },
  {
    phaseNumber: 5,
    name: 'Pre-Launch',
    description: 'Beta testing, final polish, and launch preparation',
    estimatedDays: 14,
    milestones: [
      { title: 'Beta release', description: 'Beta version released to testers', requiresOwnerApproval: false },
      { title: 'Bug fixes complete', description: 'All critical bugs resolved', requiresOwnerApproval: false },
      { title: 'App store assets ready', description: 'Screenshots, descriptions prepared', requiresOwnerApproval: true },
      { title: 'Launch checklist complete', description: 'All pre-launch items done', requiresOwnerApproval: true },
    ],
  },
  {
    phaseNumber: 6,
    name: 'Launch',
    description: 'App store submission and public release',
    estimatedDays: 14,
    milestones: [
      { title: 'Submitted to stores', description: 'Apps submitted to all platforms', requiresOwnerApproval: false },
      { title: 'Store approval', description: 'All platforms approved', requiresOwnerApproval: false },
      { title: 'Production deploy', description: 'Backend deployed to production', requiresOwnerApproval: false },
      { title: 'App is LIVE', description: 'App publicly available', requiresOwnerApproval: true },
    ],
  },
];

export interface DefaultMilestone {
  title: string;
  description: string;
  requiresOwnerApproval: boolean;
}

export interface DefaultPhase {
  phaseNumber: number;
  name: string;
  description: string;
  estimatedDays: number;
  milestones: DefaultMilestone[];
}