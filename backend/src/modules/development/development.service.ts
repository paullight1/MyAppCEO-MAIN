import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import {
  developmentPhases,
  developmentMilestones,
  developmentTasks,
  progressUpdates,
  deploymentRecords,
  appTeamMembers,
  investorNotifications,
  apps,
  users,
  investmentCommitments,
  crowdfundingCampaigns,
} from '../../database/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { DEFAULT_PHASES } from './default-phases';
import {
  CreatePhaseDto,
  UpdatePhaseDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateProgressUpdateDto,
  CreateDeploymentDto,
  UpdateDeploymentDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/development.dto';

@Injectable()
export class DevelopmentService {
  private readonly logger = new Logger(DevelopmentService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
  ) {}

  async initializeAppPhases(appId: string, userId: string) {
    const app = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!app[0]) {
      throw new NotFoundException('App not found');
    }
    if (app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can initialize development phases');
    }

    const existingPhases = await this.db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.appId, appId));

    if (existingPhases.length > 0) {
      throw new BadRequestException('Phases already initialized for this app');
    }

    for (const phase of DEFAULT_PHASES) {
      const estimatedEndDate = new Date(Date.now() + phase.estimatedDays * 24 * 60 * 60 * 1000);

      const [createdPhase] = await this.db
        .insert(developmentPhases)
        .values({
          appId,
          phaseNumber: phase.phaseNumber,
          name: phase.name,
          description: phase.description,
          estimatedEndDate,
        })
        .returning();

      for (let i = 0; i < phase.milestones.length; i++) {
        await this.db.insert(developmentMilestones).values({
          phaseId: createdPhase.id,
          appId,
          title: phase.milestones[i].title,
          description: phase.milestones[i].description,
          requiresOwnerApproval: phase.milestones[i].requiresOwnerApproval,
          orderIndex: i,
        });
      }
    }

    return this.getAppProgress(appId);
  }

  async getAppProgress(appId: string) {
    const phases = await this.db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.appId, appId))
      .orderBy(asc(developmentPhases.phaseNumber));

    for (const phase of phases) {
      const milestones = await this.db
        .select()
        .from(developmentMilestones)
        .where(eq(developmentMilestones.phaseId, phase.id))
        .orderBy(asc(developmentMilestones.orderIndex));

      phase.milestones = milestones;
    }

    const deployments = await this.db
      .select()
      .from(deploymentRecords)
      .where(eq(deploymentRecords.appId, appId))
      .orderBy(desc(deploymentRecords.createdAt));

    const team = await this.db
      .select({
        id: appTeamMembers.id,
        role: appTeamMembers.role,
        status: appTeamMembers.status,
        canUpdateProgress: appTeamMembers.canUpdateProgress,
        canPostUpdates: appTeamMembers.canPostUpdates,
        canManageTasks: appTeamMembers.canManageTasks,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(appTeamMembers)
      .innerJoin(users, eq(appTeamMembers.userId, users.id))
      .where(and(
        eq(appTeamMembers.appId, appId),
        eq(appTeamMembers.status, 'active')
      ));

    const updates = await this.db
      .select()
      .from(progressUpdates)
      .where(eq(progressUpdates.appId, appId))
      .orderBy(desc(progressUpdates.createdAt))
      .limit(5);

    const totalMilestones = phases.reduce((sum: number, p: any) => sum + (p.milestones?.length || 0), 0);
    const completedMilestones = phases.reduce((sum: number, p: any) => 
      sum + (p.milestones?.filter((m: any) => m.status === 'completed').length || 0), 0);
    const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return {
      phases,
      deployments,
      team,
      updates,
      overallProgress,
      totalMilestones,
      completedMilestones,
    };
  }

  async getPhases(appId: string) {
    return this.db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.appId, appId))
      .orderBy(asc(developmentPhases.phaseNumber));
  }

  async getPhase(phaseId: string) {
    const [phase] = await this.db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.id, phaseId));

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    const milestones = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.phaseId, phaseId))
      .orderBy(asc(developmentMilestones.orderIndex));

    return { ...phase, milestones };
  }

  async updatePhase(phaseId: string, dto: UpdatePhaseDto, userId: string) {
    const [phase] = await this.db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.id, phaseId));

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    await this.verifyAppAccess(phase.appId, userId, 'update');

    const [updated] = await this.db
      .update(developmentPhases)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(developmentPhases.id, phaseId))
      .returning();

    if (dto.status === 'completed') {
      await this.createNotifications(phase.appId, 'phase_completed', `Phase Completed: ${phase.name}`);
    }

    return updated;
  }

  async startPhase(phaseId: string, userId: string) {
    return this.updatePhase(phaseId, { status: 'in_progress', startDate: new Date() }, userId);
  }

  async completePhase(phaseId: string, userId: string) {
    return this.updatePhase(phaseId, { status: 'completed', endDate: new Date(), completionPct: 100 }, userId);
  }

  async getMilestones(phaseId: string) {
    return this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.phaseId, phaseId))
      .orderBy(asc(developmentMilestones.orderIndex));
  }

  async getMilestone(milestoneId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const tasks = await this.db
      .select()
      .from(developmentTasks)
      .where(eq(developmentTasks.milestoneId, milestoneId))
      .orderBy(asc(developmentTasks.orderIndex));

    return { ...milestone, tasks };
  }

  async createMilestone(phaseId: string, appId: string, dto: CreateMilestoneDto, userId: string) {
    await this.verifyAppAccess(appId, userId, 'update');

    const [milestone] = await this.db
      .insert(developmentMilestones)
      .values({
        phaseId,
        appId,
        title: dto.title,
        description: dto.description,
        requiresOwnerApproval: dto.requiresOwnerApproval || false,
        dueDate: dto.dueDate,
      })
      .returning();

    return milestone;
  }

  async updateMilestone(milestoneId: string, dto: UpdateMilestoneDto, userId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.verifyAppAccess(milestone.appId, userId, 'update');

    const [updated] = await this.db
      .update(developmentMilestones)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(developmentMilestones.id, milestoneId))
      .returning();

    return updated;
  }

  async completeMilestone(milestoneId: string, userId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.verifyAppAccess(milestone.appId, userId, 'update');

    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    };

    if (!milestone.requiresOwnerApproval) {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    const [updated] = await this.db
      .update(developmentMilestones)
      .set(updateData)
      .where(eq(developmentMilestones.id, milestoneId))
      .returning();

    await this.updatePhaseProgress(milestone.phaseId);
    await this.createNotifications(milestone.appId, 'milestone_completed', `Milestone Completed: ${milestone.title}`);

    return updated;
  }

  async approveMilestone(milestoneId: string, userId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const app = await this.db.select().from(apps).where(eq(apps.id, milestone.appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can approve milestones');
    }

    const [updated] = await this.db
      .update(developmentMilestones)
      .set({
        approvedBy: userId,
        approvedAt: new Date(),
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(developmentMilestones.id, milestoneId))
      .returning();

    await this.updatePhaseProgress(milestone.phaseId);
    await this.createNotifications(milestone.appId, 'milestone_approved', `Milestone Approved: ${milestone.title}`);

    return updated;
  }

  async rejectMilestone(milestoneId: string, reason: string, userId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const app = await this.db.select().from(apps).where(eq(apps.id, milestone.appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can reject milestones');
    }

    const [updated] = await this.db
      .update(developmentMilestones)
      .set({
        rejectionReason: reason,
        status: 'blocked',
        updatedAt: new Date(),
      })
      .where(eq(developmentMilestones.id, milestoneId))
      .returning();

    return updated;
  }

  async getTasks(milestoneId: string) {
    return this.db
      .select()
      .from(developmentTasks)
      .where(eq(developmentTasks.milestoneId, milestoneId))
      .orderBy(asc(developmentTasks.orderIndex));
  }

  async createTask(milestoneId: string, dto: CreateTaskDto, userId: string) {
    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, milestoneId));

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.verifyAppAccess(milestone.appId, userId, 'update');

    const [task] = await this.db
      .insert(developmentTasks)
      .values({
        milestoneId,
        title: dto.title,
        description: dto.description,
        assignedTo: dto.assignedTo,
        estimatedHours: dto.estimatedHours?.toString(),
      })
      .returning();

    return task;
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
    const [task] = await this.db
      .select()
      .from(developmentTasks)
      .where(eq(developmentTasks.id, taskId));

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const [milestone] = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.id, task.milestoneId));

    await this.verifyAppAccess(milestone.appId, userId, 'update');

    const [updated] = await this.db
      .update(developmentTasks)
      .set({
        ...dto,
        actualHours: dto.actualHours?.toString(),
        completedAt: dto.status === 'done' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(developmentTasks.id, taskId))
      .returning();

    return updated;
  }

  async getProgressUpdates(appId: string, limit = 20, offset = 0) {
    return this.db
      .select({
        id: progressUpdates.id,
        title: progressUpdates.title,
        content: progressUpdates.content,
        visibility: progressUpdates.visibility,
        viewCount: progressUpdates.viewCount,
        createdAt: progressUpdates.createdAt,
        author: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(progressUpdates)
      .innerJoin(users, eq(progressUpdates.authorId, users.id))
      .where(eq(progressUpdates.appId, appId))
      .orderBy(desc(progressUpdates.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createProgressUpdate(appId: string, dto: CreateProgressUpdateDto, userId: string) {
    await this.verifyAppAccess(appId, userId, 'update');

    const [update] = await this.db
      .insert(progressUpdates)
      .values({
        appId,
        title: dto.title,
        content: dto.content,
        phaseId: dto.phaseId,
        milestoneId: dto.milestoneId,
        visibility: dto.visibility || 'investors',
        authorId: userId,
        attachments: dto.attachments || [],
      })
      .returning();

    await this.createNotifications(appId, 'update_posted', dto.title);

    return update;
  }

  async getDeployments(appId: string) {
    return this.db
      .select()
      .from(deploymentRecords)
      .where(eq(deploymentRecords.appId, appId))
      .orderBy(desc(deploymentRecords.createdAt));
  }

  async createDeployment(appId: string, dto: CreateDeploymentDto, userId: string) {
    await this.verifyAppAccess(appId, userId, 'update');

    const [deployment] = await this.db
      .insert(deploymentRecords)
      .values({
        appId,
        platform: dto.platform,
        version: dto.version,
        buildNumber: dto.buildNumber,
        storeUrl: dto.storeUrl,
        downloadUrl: dto.downloadUrl,
        notes: dto.notes,
      })
      .returning();

    return deployment;
  }

  async updateDeployment(deploymentId: string, dto: UpdateDeploymentDto, userId: string) {
    const [deployment] = await this.db
      .select()
      .from(deploymentRecords)
      .where(eq(deploymentRecords.id, deploymentId));

    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    await this.verifyAppAccess(deployment.appId, userId, 'update');

    const updateData: any = { ...dto, updatedAt: new Date() };

    if (dto.status === 'submitted') {
      updateData.submittedAt = new Date();
    } else if (dto.status === 'in_review') {
      updateData.reviewStartedAt = new Date();
    } else if (dto.status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (dto.status === 'rejected') {
      updateData.rejectedAt = new Date();
    } else if (dto.status === 'live') {
      updateData.liveAt = new Date();
      await this.createNotifications(deployment.appId, 'app_launched', 'App is now LIVE!');
    }

    const [updated] = await this.db
      .update(deploymentRecords)
      .set(updateData)
      .where(eq(deploymentRecords.id, deploymentId))
      .returning();

    return updated;
  }

  async getTeam(appId: string, userId: string) {
    const app = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can view team members');
    }

    return this.db
      .select({
        id: appTeamMembers.id,
        role: appTeamMembers.role,
        status: appTeamMembers.status,
        canUpdateProgress: appTeamMembers.canUpdateProgress,
        canPostUpdates: appTeamMembers.canPostUpdates,
        canManageTasks: appTeamMembers.canManageTasks,
        addedAt: appTeamMembers.addedAt,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(appTeamMembers)
      .innerJoin(users, eq(appTeamMembers.userId, users.id))
      .where(eq(appTeamMembers.appId, appId));
  }

  async addTeamMember(appId: string, dto: AddTeamMemberDto, userId: string) {
    const app = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can add team members');
    }

    const [member] = await this.db
      .insert(appTeamMembers)
      .values({
        appId,
        userId: dto.userId,
        role: dto.role,
        canUpdateProgress: dto.canUpdateProgress || false,
        canPostUpdates: dto.canPostUpdates || false,
        canManageTasks: dto.canManageTasks || false,
      })
      .returning();

    return member;
  }

  async updateTeamMember(memberId: string, dto: UpdateTeamMemberDto, userId: string) {
    const [member] = await this.db
      .select()
      .from(appTeamMembers)
      .where(eq(appTeamMembers.id, memberId));

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const app = await this.db.select().from(apps).where(eq(apps.id, member.appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can update team members');
    }

    const [updated] = await this.db
      .update(appTeamMembers)
      .set(dto)
      .where(eq(appTeamMembers.id, memberId))
      .returning();

    return updated;
  }

  async removeTeamMember(memberId: string, userId: string) {
    const [member] = await this.db
      .select()
      .from(appTeamMembers)
      .where(eq(appTeamMembers.id, memberId));

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const app = await this.db.select().from(apps).where(eq(apps.id, member.appId)).limit(1);
    if (!app[0] || app[0].ownerId !== userId) {
      throw new ForbiddenException('Only the app owner can remove team members');
    }

    await this.db
      .update(appTeamMembers)
      .set({ status: 'removed', removedAt: new Date() })
      .where(eq(appTeamMembers.id, memberId));

    return { success: true };
  }

  async getInvestorApps(userId: string) {
    const investments = await this.db
      .select({
        commitment: investmentCommitments,
        campaign: crowdfundingCampaigns,
      })
      .from(investmentCommitments)
      .innerJoin(crowdfundingCampaigns, eq(investmentCommitments.campaignId, crowdfundingCampaigns.id))
      .where(and(
        eq(investmentCommitments.investorId, userId),
        eq(investmentCommitments.status, 'paid')
      ));

    const appIds = investments
      .filter((inv: any) => inv.campaign.appId)
      .map((inv: any) => inv.campaign.appId);

    if (appIds.length === 0) {
      return [];
    }

    const appProgress = await Promise.all(
      appIds.map((appId: string) => this.getAppProgress(appId))
    );

    return investments.map((inv: any, index: number) => ({
      investment: inv.commitment,
      campaign: inv.campaign,
      progress: appProgress[index],
    }));
  }

  async getNotifications(userId: string, limit = 50) {
    return this.db
      .select()
      .from(investorNotifications)
      .where(eq(investorNotifications.investorId, userId))
      .orderBy(desc(investorNotifications.createdAt))
      .limit(limit);
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const [notification] = await this.db
      .select()
      .from(investorNotifications)
      .where(eq(investorNotifications.id, notificationId));

    if (!notification || notification.investorId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const [updated] = await this.db
      .update(investorNotifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(investorNotifications.id, notificationId))
      .returning();

    return updated;
  }

  async markAllNotificationsRead(userId: string) {
    await this.db
      .update(investorNotifications)
      .set({ read: true, readAt: new Date() })
      .where(and(
        eq(investorNotifications.investorId, userId),
        eq(investorNotifications.read, false)
      ));

    return { success: true };
  }

  private async verifyAppAccess(appId: string, userId: string, action: string) {
    const app = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);

    if (!app[0]) {
      throw new NotFoundException('App not found');
    }

    if (app[0].ownerId === userId) {
      return true;
    }

    const [teamMember] = await this.db
      .select()
      .from(appTeamMembers)
      .where(and(
        eq(appTeamMembers.appId, appId),
        eq(appTeamMembers.userId, userId),
        eq(appTeamMembers.status, 'active')
      ));

    if (!teamMember) {
      throw new ForbiddenException('You do not have access to this app');
    }

    if (action === 'update' && !teamMember.canUpdateProgress) {
      throw new ForbiddenException('You do not have permission to update this app');
    }

    return true;
  }

  private async updatePhaseProgress(phaseId: string) {
    const milestones = await this.db
      .select()
      .from(developmentMilestones)
      .where(eq(developmentMilestones.phaseId, phaseId));

    const completed = milestones.filter((m: any) => m.status === 'completed').length;
    const progress = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

    await this.db
      .update(developmentPhases)
      .set({ completionPct: progress, updatedAt: new Date() })
      .where(eq(developmentPhases.id, phaseId));
  }

  private async createNotifications(appId: string, type: string, title: string) {
    const investments = await this.db
      .select({ investorId: investmentCommitments.investorId })
      .from(investmentCommitments)
      .innerJoin(crowdfundingCampaigns, eq(investmentCommitments.campaignId, crowdfundingCampaigns.id))
      .where(and(
        eq(crowdfundingCampaigns.appId, appId),
        eq(investmentCommitments.status, 'paid')
      ));

    const investorIds = [...new Set(investments.map((i: any) => i.investorId))];

    if (investorIds.length === 0) return;

    const notifications = investorIds.map((investorId: string) => ({
      investorId,
      appId,
      type,
      title,
    }));

    await this.db.insert(investorNotifications).values(notifications);
  }
}
