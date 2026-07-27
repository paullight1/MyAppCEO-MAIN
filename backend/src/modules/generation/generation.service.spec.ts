import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  appIdeas,
  generatedArtifacts,
  generationJobs,
  qualityReports,
  reviewSubmissions,
} from '../../database/schema';
import { GenerationService } from './generation.service';
import { GenerationProviderRegistry } from './providers/generation-provider.registry';

describe('GenerationService', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const ideaId = '22222222-2222-2222-2222-222222222222';

  const createDb = () => {
    const state: Record<string, any[]> = {
      appIdeas: [{
        id: ideaId,
        ownerId,
        title: 'OpsPilot',
        description: 'AI operations dashboard',
        category: 'saas',
        platform: 'web',
        prdDocument: {
          features: [{ id: 'f1', name: 'Dashboard', description: 'Track work', priority: 'P0' }],
          pages: [{ id: 'page-1', label: 'Dashboard', children: [] }],
          apiContracts: ['GET /api/tasks'],
          dataModel: ['Task'],
          acceptanceCriteria: ['User can view task status'],
        },
      }],
      generationJobs: [],
      generatedArtifacts: [],
      reviewSubmissions: [],
      qualityReports: [],
    };

    const db: any = {
      state,
      select: jest.fn((shape?: any) => ({
        from: (table: any) => ({
          where: (condition: any) => ({
            limit: () => Promise.resolve(selectRows(state, table, shape, condition)),
            orderBy: () => Promise.resolve(selectRows(state, table, shape, condition)),
          }),
          orderBy: () => Promise.resolve(selectRows(state, table, shape)),
        }),
      })),
      insert: jest.fn((table: any) => ({
        values: (values: any) => ({
          returning: () => {
            const tableName = getMockTableName(table);
            const row = { id: `${tableName}-${state[tableName].length + 1}`, ...values };
            state[tableName].push(row);
            return Promise.resolve([row]);
          },
        }),
      })),
      update: jest.fn((table: any) => ({
        set: (values: any) => ({
          where: () => ({
            returning: () => {
              const row = state[getMockTableName(table)][0];
              Object.assign(row, values);
              return Promise.resolve([row]);
            },
          }),
        }),
      })),
    };

    return db;
  };

  it('creates a build plan artifact for an owned idea', async () => {
    const db = createDb();
    const service = createService(db);

    const result = await service.createBuildPlan(ideaId, ownerId);

    expect(result.success).toBe(true);
    expect(db.state.generationJobs[0]).toMatchObject({
      ownerId,
      ideaId,
      jobType: 'build_plan',
      status: 'completed',
    });
    expect(db.state.generatedArtifacts[0]).toMatchObject({
      ideaId,
      artifactType: 'build_plan',
      metadata: expect.objectContaining({ provider: 'openai', model: expect.any(String) }),
    });
  });

  it('rejects build plan generation for a non-owner', async () => {
    const service = createService(createDb());

    await expect(service.createBuildPlan(ideaId, 'other-user')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a build plan before generating code artifacts', async () => {
    const service = createService(createDb());

    await expect(service.generateCode(ideaId, ownerId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits the latest code artifact for admin review', async () => {
    const db = createDb();
    const service = createService(db);

    await service.createBuildPlan(ideaId, ownerId);
    await service.generateCode(ideaId, ownerId);
    const result = await service.submitForReview(ideaId, ownerId);

    expect(result.success).toBe(true);
    expect(db.state.reviewSubmissions[0]).toMatchObject({
      ownerId,
      ideaId,
      artifactId: db.state.generatedArtifacts[1].id,
      qualityReportId: db.state.qualityReports[0].id,
      itemType: 'generated_code',
      status: 'pending_review',
      submittedBy: ownerId,
    });
  });

  it('submits an explicitly selected owned artifact and quality report for admin review', async () => {
    const db = createDb();
    db.state.generatedArtifacts.push(
      {
        id: 'artifact-old',
        ownerId,
        ideaId,
        artifactType: 'code_scaffold',
        name: 'Old scaffold',
        content: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'artifact-selected',
        ownerId,
        ideaId,
        artifactType: 'code_scaffold',
        name: 'Selected scaffold',
        content: {},
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    );
    db.state.qualityReports.push({
      id: 'quality-selected',
      ownerId,
      ideaId,
      artifactId: 'artifact-selected',
      status: 'passed',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const service = createService(db);

    const result = await service.submitForReview(ideaId, ownerId, {
      artifactId: 'artifact-selected',
      qualityReportId: 'quality-selected',
    });

    expect(result.success).toBe(true);
    expect(db.state.reviewSubmissions[0]).toMatchObject({
      ownerId,
      submittedBy: ownerId,
      ideaId,
      artifactId: 'artifact-selected',
      qualityReportId: 'quality-selected',
      itemType: 'generated_code',
      status: 'pending_review',
    });
  });

  it('does not attach another owner quality report to a generated review submission', async () => {
    const db = createDb();
    db.state.generatedArtifacts.push({
      id: 'artifact-owned',
      ownerId,
      ideaId,
      artifactType: 'code_scaffold',
      name: 'Owned scaffold',
      content: {},
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    db.state.qualityReports.push({
      id: 'quality-other-owner',
      ownerId: 'other-user',
      ideaId,
      artifactId: 'artifact-owned',
      status: 'passed',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const service = createService(db);

    await service.submitForReview(ideaId, ownerId, {
      artifactId: 'artifact-owned',
      qualityReportId: 'quality-other-owner',
    });

    expect(db.state.reviewSubmissions[0]).toMatchObject({
      artifactId: 'artifact-owned',
      qualityReportId: undefined,
    });
  });

  it('can submit a generated artifact as an app submission review item', async () => {
    const db = createDb();
    const service = createService(db);

    await service.createBuildPlan(ideaId, ownerId);
    await service.generateCode(ideaId, ownerId);
    const result = await service.submitForReview(ideaId, ownerId, {
      itemType: 'app_submission',
    });

    expect(result.success).toBe(true);
    expect(db.state.reviewSubmissions[0]).toMatchObject({
      ownerId,
      submittedBy: ownerId,
      ideaId,
      itemType: 'app_submission',
      status: 'pending_review',
    });
  });

  it('uses deterministic fallback metadata for custom provider placeholders', async () => {
    const db = createDb();
    const openai = openaiStub();
    const service = createService(db, openai);
    const originalEndpoint = process.env.CUSTOM_GENERATION_ENDPOINT;
    delete process.env.CUSTOM_GENERATION_ENDPOINT;

    try {
      await service.createBuildPlan(ideaId, ownerId, {
        provider: 'custom',
        model: 'local-ui-model',
      });
    } finally {
      restoreEnv('CUSTOM_GENERATION_ENDPOINT', originalEndpoint);
    }

    expect(openai.chat.completions.create).not.toHaveBeenCalled();
    expect(db.state.generationJobs[0]).toMatchObject({
      provider: 'custom',
      model: 'local-ui-model',
    });
    expect(db.state.generatedArtifacts[0]).toMatchObject({
      metadata: expect.objectContaining({
        provider: 'custom',
        model: 'local-ui-model',
        capability: 'build_plan',
        usedFallback: true,
        generation: expect.objectContaining({
          adapter: 'custom',
          fallbackReason: 'provider_not_configured',
          missingEnv: ['CUSTOM_GENERATION_ENDPOINT'],
        }),
      }),
    });
  });

  it('rejects unsupported generation providers', async () => {
    const service = createService(createDb());

    await expect(service.createBuildPlan(ideaId, ownerId, {
      provider: 'unknown-provider',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records missing provider env fallback metadata for configured placeholder providers', async () => {
    const db = createDb();
    const service = createService(db);
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      await service.createBuildPlan(ideaId, ownerId, {
        provider: 'gemini',
        model: 'gemini-2.5-pro',
      });
    } finally {
      restoreEnv('GEMINI_API_KEY', originalGeminiKey);
    }

    expect(db.state.generatedArtifacts[0]).toMatchObject({
      metadata: expect.objectContaining({
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        capability: 'build_plan',
        usedFallback: true,
        generation: expect.objectContaining({
          adapter: 'gemini',
          fallbackReason: 'provider_not_configured',
          missingEnv: ['GEMINI_API_KEY'],
        }),
      }),
    });
  });

  it('validates provider capability selection against the endpoint capability', async () => {
    const service = createService(createDb());

    await expect(service.createBuildPlan(ideaId, ownerId, {
      provider: 'deterministic',
      capability: 'screen_spec',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates a screen spec artifact from a PRD page node', async () => {
    const db = createDb();
    const service = createService(db);

    const result = await service.generateScreenArtifact(ideaId, 'page-1', ownerId, {
      provider: 'deterministic',
      viewport: 'web',
    });

    expect(result.success).toBe(true);
    expect(db.state.generationJobs[0]).toMatchObject({
      ideaId,
      jobType: 'screen_spec',
      provider: 'deterministic',
    });
    expect(db.state.generatedArtifacts[0]).toMatchObject({
      ideaId,
      artifactType: 'screen_spec',
      metadata: expect.objectContaining({
        nodeId: 'page-1',
        provider: 'deterministic',
        capability: 'screen_spec',
        usedFallback: true,
      }),
    });
    expect(db.state.generatedArtifacts[0].content).toMatchObject({
      screenId: 'page-1',
      title: 'Dashboard',
      viewport: 'web',
    });
  });

  it('requires an owned code scaffold before preparing a sandbox run', async () => {
    const db = createDb();
    db.state.generatedArtifacts.push({
      id: 'artifact-build-plan',
      ownerId,
      ideaId,
      artifactType: 'build_plan',
      name: 'Build plan',
      content: {},
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const service = createService(db);

    await expect(service.createSandboxRun('artifact-build-plan', ownerId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a deterministic sandbox report and quality report for an owned code scaffold', async () => {
    const db = createDb();
    db.state.generatedArtifacts.push({
      id: 'artifact-code',
      ownerId,
      ideaId,
      artifactType: 'code_scaffold',
      name: 'Code scaffold',
      content: {
        files: [{ path: 'src/App.tsx', purpose: 'Application shell' }],
        tests: [{ path: 'src/App.test.tsx', purpose: 'Render smoke test' }],
        verificationCommands: ['npm run lint', 'npm run build', 'npm test'],
      },
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const service = createService(db);

    const result = await service.createSandboxRun('artifact-code', ownerId, {
      provider: 'deterministic',
      idempotencyKey: 'sandbox-key-1',
      runner: 'sandbox-contract-v1',
    });

    expect(result.success).toBe(true);
    expect(db.state.generationJobs[0]).toMatchObject({
      ownerId,
      ideaId,
      jobType: 'sandbox_run',
      status: 'completed',
      idempotencyKey: 'sandbox-key-1',
      provider: 'deterministic',
    });
    expect(db.state.generatedArtifacts[1]).toMatchObject({
      ownerId,
      ideaId,
      artifactType: 'sandbox_report',
      metadata: expect.objectContaining({
        sourceArtifactId: 'artifact-code',
        idempotencyKey: 'sandbox-key-1',
        provider: 'deterministic',
        usedFallback: true,
        dryRun: true,
      }),
    });
    expect(db.state.generatedArtifacts[1].content).toMatchObject({
      contractVersion: 'sandbox-runner-v1',
      mode: 'dry_run',
      status: 'prepared',
      commands: ['npm run lint', 'npm run build', 'npm test'],
      expectedFiles: [{ path: 'src/App.tsx', purpose: 'Application shell', required: true }],
      statuses: expect.objectContaining({
        lint: 'pending_runner',
        test: 'pending_runner',
      }),
    });
    expect(db.state.qualityReports[0]).toMatchObject({
      ownerId,
      ideaId,
      artifactId: 'artifact-code',
      status: 'pending_runner',
      lintStatus: 'pending_runner',
      testStatus: 'pending_runner',
      provider: 'deterministic',
      idempotencyKey: 'sandbox-key-1',
      metadata: expect.objectContaining({
        runner: 'sandbox-contract-v1',
        sandboxReportArtifactId: db.state.generatedArtifacts[1].id,
        dryRun: true,
      }),
    });
  });

  it('rejects sandbox runs for another owner artifact', async () => {
    const db = createDb();
    db.state.generatedArtifacts.push({
      id: 'artifact-other-owner',
      ownerId: 'other-user',
      ideaId,
      artifactType: 'code_scaffold',
      name: 'Other owner scaffold',
      content: {
        files: [{ path: 'src/App.tsx' }],
        tests: [{ path: 'src/App.test.tsx' }],
      },
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const service = createService(db);

    await expect(service.createSandboxRun('artifact-other-owner', ownerId)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

const createService = (db: any, openai = openaiStub()) => (
  new GenerationService(db, new GenerationProviderRegistry(openai as any))
);

const selectRows = (state: Record<string, any[]>, table: any, shape?: any, condition?: any) => {
  const rows = filterRows(state[getMockTableName(table)] || [], condition);
  const sorted = [...rows].sort((a, b) => (
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ));
  if (!shape) return sorted;
  return sorted.map((row) => Object.fromEntries(Object.keys(shape).map((key) => [key, row[key]])));
};

const mockTableNames = new Map<any, string>([
  [appIdeas, 'appIdeas'],
  [generationJobs, 'generationJobs'],
  [generatedArtifacts, 'generatedArtifacts'],
  [qualityReports, 'qualityReports'],
  [reviewSubmissions, 'reviewSubmissions'],
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

const openaiStub = () => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Build plan',
              tasks: [{ id: 'task-1', title: 'Create dashboard', files: ['src/App.tsx'], acceptanceCriteria: ['renders'] }],
              files: [{ path: 'src/App.tsx', purpose: 'Dashboard shell' }],
              commands: ['npm run build'],
              risks: ['Scope creep'],
            }),
          },
        }],
      }),
    },
  },
});

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};
