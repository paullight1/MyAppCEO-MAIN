import { ForbiddenException } from '@nestjs/common';
import { appIdeas, prdVersions } from '../../database/schema';
import { IdeasService } from './ideas.service';

const ownerId = '11111111-1111-1111-1111-111111111111';
const ideaId = '22222222-2222-2222-2222-222222222222';

describe('IdeasService PRD graph operations', () => {
  const createService = () => {
    const db = createDb();
    const service = new IdeasService(db, {} as any, {} as any);
    return { service, db };
  };

  it('rejects PRD node patching for non-owners before mutating', async () => {
    const { service, db } = createService();

    await expect(
      service.patchPRDNode(ideaId, 'page-dashboard', { label: 'Hacked' }, 'other-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(db.update).not.toHaveBeenCalled();
    expect(db.state.prdVersions).toHaveLength(0);
  });

  it('patches a PRD node while retaining graph metadata and children', async () => {
    const { service, db } = createService();

    const result = await service.patchPRDNode(
      ideaId,
      'page-dashboard',
      {
        description: 'Updated command center for founders',
        acceptanceCriteria: ['Founder can inspect core KPIs'],
        dependencies: ['component-kpi-card'],
        screenId: 'screen-dashboard-v2',
      },
      ownerId,
    );

    expect(result.success).toBe(true);
    expect(result.node).toMatchObject({
      id: 'page-dashboard',
      description: 'Updated command center for founders',
      acceptanceCriteria: ['Founder can inspect core KPIs'],
      dependencies: ['component-kpi-card'],
      screenId: 'screen-dashboard-v2',
      version: 2,
    });
    expect(result.node.children).toHaveLength(1);
    expect(db.state.appIdeas[0].prdDocument.nodes[0].description).toBe('Updated command center for founders');
    expect(db.state.prdVersions[0]).toMatchObject({
      ideaId,
      version: 1,
      generatedBy: 'user',
    });
  });

  it('validates missing fields and dependency integrity with structured counts', async () => {
    const { service } = createService();

    const result = await service.validatePRD(ideaId, ownerId);

    expect(result.success).toBe(true);
    expect(result.validation.summary).toMatchObject({
      totalNodes: 2,
      ready: 1,
      missing: 4,
      blocked: 1,
    });
    expect(result.validation.nodeIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'page-dashboard',
          issues: expect.arrayContaining([
            expect.objectContaining({ field: 'description' }),
            expect.objectContaining({ field: 'screenId' }),
            expect.objectContaining({ field: 'dependencies', severity: 'error' }),
          ]),
        }),
      ]),
    );
  });

  it('returns minimal PRD version history without version content', async () => {
    const { service, db } = createService();
    db.state.prdVersions.push(
      {
        id: 'version-1',
        ideaId,
        version: 1,
        content: { nodes: [{ id: 'old-node' }] },
        generatedBy: 'ai',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 'version-2',
        ideaId,
        version: 2,
        content: { nodes: [{ id: 'new-node' }] },
        generatedBy: 'user',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    );

    const result = await service.getPRDVersionHistory(ideaId, ownerId);

    expect(result.currentVersion).toBe(2);
    expect(result.versions).toEqual([
      {
        id: 'version-2',
        version: 2,
        generatedBy: 'user',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        isCurrent: true,
      },
      {
        id: 'version-1',
        version: 1,
        generatedBy: 'ai',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        isCurrent: false,
      },
    ]);
    expect(result.versions[0]).not.toHaveProperty('content');
  });

  it('refines a node with deterministic fallback details', async () => {
    const { service, db } = createService();

    const result = await service.refinePRDNode(
      ideaId,
      'page-dashboard',
      { instructions: 'Make this ready for build planning' },
      ownerId,
    );

    expect(result.refinement.mode).toBe('deterministic_fallback');
    expect(result.node).toMatchObject({
      id: 'page-dashboard',
      validationStatus: 'needs_review',
      version: 2,
    });
    expect(result.node.acceptanceCriteria).toHaveLength(2);
    expect(result.node.apiContracts).toEqual(['GET /api/dashboard']);
    expect(result.node.dataEntities).toEqual(['Dashboard']);
    expect(result.node.reviewNotes).toContain('Refined with instruction: Make this ready for build planning');
    expect(db.state.prdVersions[0].generatedBy).toBe('ai_fallback');
  });

  it('expands a node with deterministic implementation detail children', async () => {
    const { service, db } = createService();

    const result = await service.expandPRDNode(
      ideaId,
      'page-dashboard',
      { instructions: 'Include build-ready data contracts' },
      ownerId,
    );

    expect(result.expansion.mode).toBe('deterministic_fallback');
    expect(result.addedNodes.map((node: any) => node.id)).toEqual([
      'page-dashboard-requirements',
      'page-dashboard-data-contracts',
    ]);
    expect(result.node.children).toHaveLength(3);
    expect(result.node.version).toBe(2);
    expect(db.state.appIdeas[0].prdDocument.nodes[0].children.map((node: any) => node.id)).toEqual([
      'component-kpi-card',
      'page-dashboard-requirements',
      'page-dashboard-data-contracts',
    ]);
  });
});

const createDb = () => {
  const state: Record<string, any[]> = {
    appIdeas: [{
      id: ideaId,
      ownerId,
      title: 'OpsPilot',
      description: 'AI operations dashboard',
      category: 'saas',
      platform: 'web',
      status: 'prd_generated',
      prdDocument: {
        executiveSummary: 'OpsPilot helps founders understand operations.',
        nodes: [{
          id: 'page-dashboard',
          type: 'page',
          label: 'Dashboard',
          description: '',
          status: 'pending',
          dependencies: ['missing-node'],
          children: [{
            id: 'component-kpi-card',
            type: 'component',
            label: 'KPI card',
            description: 'Shows one business metric.',
            status: 'approved',
            acceptanceCriteria: ['Metric value is visible'],
            dependencies: [],
            children: [],
          }],
        }],
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }],
    prdVersions: [],
  };

  const db: any = {
    state,
    select: jest.fn(() => ({
      from: (table: any) => createSelectQuery(state, table),
    })),
    update: jest.fn((table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => ({
          returning: () => {
            const rows = selectRows(state, table, condition);
            if (!rows[0]) return Promise.resolve([]);
            Object.assign(rows[0], values);
            return Promise.resolve([rows[0]]);
          },
        }),
      }),
    })),
    insert: jest.fn((table: any) => ({
      values: (values: any) => ({
        returning: () => Promise.resolve([insertRow(state, table, values)]),
        then: (resolve: any) => resolve(insertRow(state, table, values)),
      }),
    })),
  };

  return db;
};

const createSelectQuery = (state: Record<string, any[]>, table: any) => {
  let currentCondition: any;
  const query: any = {
    where: (condition: any) => {
      currentCondition = condition;
      return query;
    },
    orderBy: () => Promise.resolve(selectRows(state, table, currentCondition)),
    then: (resolve: any) => resolve(selectRows(state, table, currentCondition)),
  };
  return query;
};

const insertRow = (state: Record<string, any[]>, table: any, values: any) => {
  const tableName = getMockTableName(table);
  const existing = state[tableName].find((row) => (
    row.ideaId === values.ideaId
    && row.version === values.version
    && row.generatedBy === values.generatedBy
  ));
  if (existing) return existing;
  const row = { id: `${tableName}-${state[tableName].length + 1}`, ...values };
  state[tableName].push(row);
  return row;
};

const selectRows = (state: Record<string, any[]>, table: any, condition?: any) => {
  return filterRows(state[getMockTableName(table)] || [], condition);
};

const mockTableNames = new Map<any, string>([
  [appIdeas, 'appIdeas'],
  [prdVersions, 'prdVersions'],
]);

const getMockTableName = (table: any) => {
  const tableName = mockTableNames.get(table);
  if (!tableName) throw new Error('Unmapped mock table');
  return tableName;
};

const filterRows = (rows: any[], condition: any) => {
  const values = extractConditionValues(condition);
  if (!values.length) return rows;
  return rows.filter((row) => values.every((value) => Object.values(row).includes(value)));
};

const extractConditionValues = (condition: any): any[] => {
  if (!condition?.queryChunks) return [];
  const values: any[] = [];

  const visit = (chunk: any) => {
    if (Array.isArray(chunk?.queryChunks)) {
      chunk.queryChunks.forEach(visit);
      return;
    }
    if ('value' in (chunk || {}) && !Array.isArray(chunk.value)) {
      values.push(chunk.value);
    }
  };

  condition.queryChunks.forEach(visit);
  return values;
};
