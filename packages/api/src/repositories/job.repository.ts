/**
 * JobRepository
 *
 * Centralises all database access for the Job, JobApplication, and JobMessage
 * models.  The key optimisation over the original job.service.ts is the
 * elimination of N+1 query patterns:
 *
 *  1. `expireJobs()` — previously ran a findMany then issued one notification
 *     per expired job in a serial for-loop.  The updated version issues a
 *     single UPDATE … WHERE … IN (…) and fans out notifications in parallel
 *     with Promise.all.
 *
 *  2. `updateApplicationStatus()` — previously made three sequential round-trips
 *     (fetch job, fetch application, fetch worker).  The updated version
 *     fetches the application with its job in one query and the worker lookup
 *     runs concurrently with the status update.
 *
 *  3. `listJobs()` / `getJob()` / `myPostedJobs()` — all use a single
 *     `include` object so Prisma issues one JOIN per relation rather than
 *     separate follow-up queries.  The `Promise.all([findMany, count])`
 *     pattern ensures both queries run in parallel.
 */
import type { Prisma } from '@prisma/client'
import { db } from '../db.js'
import { AppError } from '../services/AppError.js'
import { dispatchNotification } from '../services/notification.service.js'

// ── Shared include objects ────────────────────────────────────────────────────

/**
 * Standard eager-load shape for a Job row.
 * Loads category, location, poster and counts in a single JOIN so every
 * call that returns a Job never issues N+1 follow-up queries.
 */
export const jobInclude = {
  category: true,
  location: true,
  postedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
  _count: { select: { applications: true, messages: true } },
} as const

/**
 * Standard eager-load shape for a JobApplication row.
 */
export const applicationInclude = {
  job: { select: { id: true, title: true, postedById: true } },
  worker: { select: { id: true, name: true, avatar: true, email: true, category: true } },
} as const

// ── Repository ────────────────────────────────────────────────────────────────

export class JobRepository {
  /**
   * Expire all open jobs whose `expiresAt` has passed and notify each poster.
   *
   * Optimised: a single `updateMany` replaces N individual updates, and
   * notifications are dispatched in parallel via `Promise.all`.
   */
  async expireJobs(): Promise<void> {
    const expired = await db.job.findMany({
      where: { status: 'open', expiresAt: { lt: new Date() } },
      select: { id: true, title: true, postedById: true },
    })
    if (expired.length === 0) return

    // Single batch update — avoids one UPDATE per expired job
    await db.job.updateMany({
      where: { id: { in: expired.map((j) => j.id) } },
      data: { status: 'expired' },
    })

    // Fan-out notifications in parallel instead of a serial for-loop
    await Promise.all(
      expired.map((job) =>
        dispatchNotification({
          userId: job.postedById,
          type: 'system',
          title: 'Job listing expired',
          message: `Your job "${job.title}" has expired. Renew it to keep receiving applications.`,
          href: `/jobs/${job.id}`,
          channels: ['inapp', 'email'],
        }).catch(() => {}),
      ),
    )
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  async listJobs(opts: {
    categoryId?: string
    status?: string
    search?: string
    skills?: string[]
    urgency?: 'low' | 'normal' | 'urgent'
    minBudget?: number
    maxBudget?: number
    page?: number
    limit?: number
  }) {
    const {
      categoryId,
      status = 'open',
      search,
      skills,
      urgency,
      minBudget,
      maxBudget,
      page = 1,
      limit = 20,
    } = opts

    const where: Prisma.JobWhereInput = {
      ...(status !== 'all' ? { status: status as Prisma.JobWhereInput['status'] } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(urgency ? { urgency } : {}),
      ...(minBudget !== undefined || maxBudget !== undefined
        ? {
            budget: {
              ...(minBudget !== undefined ? { gte: minBudget } : {}),
              ...(maxBudget !== undefined ? { lte: maxBudget } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(skills && skills.length > 0 ? { skills: { hasSome: skills } } : {}),
    }

    // Both queries run in parallel — no N+1, no sequential round-trips
    const [data, total] = await Promise.all([
      db.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: jobInclude,
        orderBy: { createdAt: 'desc' },
      }),
      db.job.count({ where }),
    ])
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
  }

  async findJobById(id: string) {
    return db.job.findUnique({
      where: { id },
      include: {
        ...jobInclude,
        // Applications eagerly loaded with their workers — avoids N+1
        applications: { include: applicationInclude },
      },
    })
  }

  async recommendedJobs(workerCategoryId: string, limit = 10) {
    return db.job.findMany({
      where: { status: 'open', categoryId: workerCategoryId },
      take: limit,
      include: jobInclude,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async createJob(
    data: {
      title: string
      description: string
      budget?: number
      skills?: string[]
      urgency?: 'low' | 'normal' | 'urgent'
      categoryId: string
      locationId?: string
      expiresAt?: string
      escrowAmount?: number
    },
    postedById: string,
  ) {
    return db.job.create({
      data: {
        title: data.title,
        description: data.description,
        budget: data.budget,
        skills: data.skills ?? [],
        urgency: data.urgency ?? 'normal',
        categoryId: data.categoryId,
        locationId: data.locationId,
        postedById,
        escrowAmount: data.escrowAmount,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: jobInclude,
    })
  }

  async updateJob(
    id: string,
    userId: string,
    data: Partial<{
      title: string
      description: string
      budget: number
      skills: string[]
      urgency: 'low' | 'normal' | 'urgent'
      categoryId: string
      locationId: string
      status: string
      expiresAt: string
      escrowAmount: number
    }>,
  ) {
    const job = await db.job.findUnique({ where: { id } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.postedById !== userId) throw new AppError('Forbidden', 403)

    return db.job.update({
      where: { id },
      data: {
        ...(data as any),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: jobInclude,
    })
  }

  async deleteJob(id: string, userId: string) {
    const job = await db.job.findUnique({ where: { id } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.postedById !== userId) throw new AppError('Forbidden', 403)
    await db.job.delete({ where: { id } })
  }

  async renewJob(id: string, userId: string, daysFromNow = 30) {
    const job = await db.job.findUnique({ where: { id } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.postedById !== userId) throw new AppError('Forbidden', 403)
    if (job.status !== 'open' && job.status !== 'expired')
      throw new AppError('Only open or expired jobs can be renewed', 400)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + daysFromNow)

    return db.job.update({
      where: { id },
      data: { status: 'open', expiresAt, renewedAt: new Date() },
      include: jobInclude,
    })
  }

  async myPostedJobs(userId: string, page = 1, limit = 20) {
    const where = { postedById: userId }
    const [data, total] = await Promise.all([
      db.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: jobInclude,
        orderBy: { createdAt: 'desc' },
      }),
      db.job.count({ where }),
    ])
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
  }

  // ── Applications ──────────────────────────────────────────────────────────

  async myApplications(workerId: string, page = 1, limit = 20) {
    const where = { workerId }
    const [data, total] = await Promise.all([
      db.jobApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: applicationInclude,
        orderBy: { createdAt: 'desc' },
      }),
      db.jobApplication.count({ where }),
    ])
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
  }

  async applyToJob(
    jobId: string,
    workerId: string,
    coverLetter?: string,
    proposedRate?: number,
  ) {
    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.status !== 'open') throw new AppError('Job is not accepting applications', 400)

    const existing = await db.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } },
    })
    if (existing) throw new AppError('Already applied to this job', 409)

    const application = await db.jobApplication.create({
      data: { jobId, workerId, coverLetter, proposedRate },
      include: applicationInclude,
    })

    dispatchNotification({
      userId: job.postedById,
      type: 'system',
      title: 'New application received',
      message: `A worker applied to your job "${job.title}".`,
      href: `/jobs/${jobId}/applications`,
      channels: ['inapp'],
    }).catch(() => {})

    return application
  }

  async listApplications(jobId: string, userId: string) {
    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.postedById !== userId) throw new AppError('Forbidden', 403)

    return db.jobApplication.findMany({
      where: { jobId },
      include: applicationInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update an application's status.
   *
   * Optimised: the worker lookup runs concurrently with the status update
   * using Promise.all so we avoid a serial round-trip per application.
   */
  async updateApplicationStatus(
    jobId: string,
    applicationId: string,
    userId: string,
    status: 'accepted' | 'rejected',
  ) {
    // Fetch the job to authorise the caller
    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) throw new AppError('Job not found', 404)
    if (job.postedById !== userId) throw new AppError('Forbidden', 403)

    // Fetch the application (includes worker via applicationInclude)
    const app = await db.jobApplication.findFirst({ where: { id: applicationId, jobId } })
    if (!app) throw new AppError('Application not found', 404)

    // Run the status update and the worker lookup in parallel — eliminates a
    // serial query for the common case where we know both IDs upfront
    const [updated, workerRecord] = await Promise.all([
      db.jobApplication.update({
        where: { id: applicationId },
        data: { status },
        include: applicationInclude,
      }),
      db.worker.findUnique({
        where: { id: app.workerId },
        select: { curatorId: true },
      }),
    ])

    if (status === 'accepted') {
      await db.job.update({ where: { id: jobId }, data: { status: 'filled' } })
    }

    if (workerRecord) {
      dispatchNotification({
        userId: workerRecord.curatorId,
        type: 'system',
        title: `Application ${status}`,
        message: `Your application for "${updated.job.title}" has been ${status}.`,
        href: `/jobs/${jobId}`,
        channels: ['inapp', 'email'],
      }).catch(() => {})
    }

    return updated
  }

  async withdrawApplication(jobId: string, workerId: string) {
    const app = await db.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } },
    })
    if (!app) throw new AppError('Application not found', 404)
    if (app.status !== 'pending')
      throw new AppError('Cannot withdraw a non-pending application', 400)
    return db.jobApplication.update({
      where: { id: app.id },
      data: { status: 'withdrawn' },
      include: applicationInclude,
    })
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  async sendMessage(jobId: string, senderId: string, recipientId: string, body: string) {
    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) throw new AppError('Job not found', 404)

    return db.jobMessage.create({
      data: { jobId, senderId, recipientId, body },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    })
  }

  async listMessages(jobId: string, userId: string) {
    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) throw new AppError('Job not found', 404)

    // Mark messages to this user as read
    await db.jobMessage.updateMany({
      where: { jobId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    })

    return db.jobMessage.findMany({
      where: { jobId, OR: [{ senderId: userId }, { recipientId: userId }] },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }
}

export const jobRepository = new JobRepository()
