import type { Prisma } from '@prisma/client'
import { AppError } from '../services/AppError.js'
import { dispatchNotification } from '../services/notification.service.js'
import { jobRepository } from '../repositories/job.repository.js'

/** Auto-expire jobs whose expiresAt has passed, and notify the poster. */
async function expireJobs() {
  const expired = await jobRepository.findExpired()
  if (expired.length === 0) return

  await jobRepository.updateMany(
    { id: { in: expired.map((j) => j.id) } },
    { status: 'expired' },
  )

  // Notify each poster (fire-and-forget)
  for (const job of expired) {
    dispatchNotification({
      userId: job.postedById,
      type: 'system',
      title: 'Job listing expired',
      message: `Your job "${job.title}" has expired. Renew it to keep receiving applications.`,
      href: `/jobs/${job.id}`,
      channels: ['inapp', 'email'],
    }).catch(() => {})
  }
}

// ── List / Search ─────────────────────────────────────────────────────────────

export async function listJobs(opts: {
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
  await expireJobs()
  const { categoryId, status = 'open', search, skills, urgency, minBudget, maxBudget, page = 1, limit = 20 } = opts

  const where: Prisma.JobWhereInput = {
    ...(status !== 'all' ? { status: status as Prisma.JobWhereInput['status'] } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(urgency ? { urgency } : {}),
    ...(minBudget !== undefined || maxBudget !== undefined
      ? { budget: { ...(minBudget !== undefined ? { gte: minBudget } : {}), ...(maxBudget !== undefined ? { lte: maxBudget } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(skills && skills.length > 0
      ? { skills: { hasSome: skills } }
      : {}),
  }

  const { data, total } = await jobRepository.list(where, { skip: (page - 1) * limit, take: limit })
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
}

export async function getJob(id: string) {
  await expireJobs()
  const job = await jobRepository.findByIdWithApplications(id)
  if (!job) throw new AppError('Job not found', 404)
  return job
}

// ── Skill-based recommendations for a worker ─────────────────────────────────

export async function recommendedJobs(workerId: string, limit = 10) {
  await expireJobs()
  // Import db lazily here to avoid circular deps — worker lookup only
  const { db } = await import('../db.js')
  const worker = await db.worker.findUnique({ where: { id: workerId }, select: { categoryId: true } })
  if (!worker) throw new AppError('Worker not found', 404)

  return jobRepository.findOpenByCategory(worker.categoryId, limit)
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createJob(
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
  return jobRepository.create({
    title: data.title,
    description: data.description,
    budget: data.budget,
    skills: data.skills ?? [],
    urgency: data.urgency ?? 'normal',
    category: { connect: { id: data.categoryId } },
    ...(data.locationId ? { location: { connect: { id: data.locationId } } } : {}),
    postedBy: { connect: { id: postedById } },
    escrowAmount: data.escrowAmount,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
  })
}

export async function updateJob(
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
  const job = await jobRepository.findById(id)
  if (!job) throw new AppError('Job not found', 404)
  if (job.postedById !== userId) throw new AppError('Forbidden', 403)

  return jobRepository.update(id, { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined } as any)
}

export async function deleteJob(id: string, userId: string) {
  const job = await jobRepository.findById(id)
  if (!job) throw new AppError('Job not found', 404)
  if (job.postedById !== userId) throw new AppError('Forbidden', 403)
  await jobRepository.delete(id)
}

// ── Renewal ───────────────────────────────────────────────────────────────────

export async function renewJob(id: string, userId: string, daysFromNow = 30) {
  const job = await jobRepository.findById(id)
  if (!job) throw new AppError('Job not found', 404)
  if (job.postedById !== userId) throw new AppError('Forbidden', 403)
  if (job.status !== 'open' && job.status !== 'expired') throw new AppError('Only open or expired jobs can be renewed', 400)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + daysFromNow)

  return jobRepository.update(id, { status: 'open', expiresAt, renewedAt: new Date() })
}

// ── My posted jobs ────────────────────────────────────────────────────────────

export async function myPostedJobs(userId: string, page = 1, limit = 20) {
  const { data, total } = await jobRepository.findByPostedBy(userId, { skip: (page - 1) * limit, take: limit })
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
}

// ── Worker's own applications ─────────────────────────────────────────────────

export async function myApplications(workerId: string, page = 1, limit = 20) {
  const { data, total } = await jobRepository.listWorkerApplications(workerId, { skip: (page - 1) * limit, take: limit })
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  workerId: string,
  coverLetter?: string,
  proposedRate?: number,
) {
  const job = await jobRepository.findById(jobId)
  if (!job) throw new AppError('Job not found', 404)
  if (job.status !== 'open') throw new AppError('Job is not accepting applications', 400)

  const existing = await jobRepository.findApplication({ jobId_workerId: { jobId, workerId } })
  if (existing) throw new AppError('Already applied to this job', 409)

  const application = await jobRepository.createApplication({
    job: { connect: { id: jobId } },
    worker: { connect: { id: workerId } },
    coverLetter,
    proposedRate,
  })

  // Notify job poster about the new application
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

export async function listApplications(jobId: string, userId: string) {
  const job = await jobRepository.findById(jobId)
  if (!job) throw new AppError('Job not found', 404)
  if (job.postedById !== userId) throw new AppError('Forbidden', 403)
  return jobRepository.listApplications(jobId)
}

export async function updateApplicationStatus(
  jobId: string,
  applicationId: string,
  userId: string,
  status: 'accepted' | 'rejected',
) {
  const job = await jobRepository.findById(jobId)
  if (!job) throw new AppError('Job not found', 404)
  if (job.postedById !== userId) throw new AppError('Forbidden', 403)

  const app = await jobRepository.findApplicationFirst({ id: applicationId, jobId })
  if (!app) throw new AppError('Application not found', 404)

  const updated = await jobRepository.updateApplication(applicationId, { status })

  if (status === 'accepted') {
    await jobRepository.update(jobId, { status: 'filled' })
  }

  // Notify the worker (curator who owns the worker profile) about status change
  const { db } = await import('../db.js')
  const workerRecord = await db.worker.findUnique({
    where: { id: app.workerId },
    select: { curatorId: true },
  })
  if (workerRecord) {
    dispatchNotification({
      userId: workerRecord.curatorId,
      type: 'system',
      title: `Application ${status}`,
      message: `Your application for "${(updated as any).job.title}" has been ${status}.`,
      href: `/jobs/${jobId}`,
      channels: ['inapp', 'email'],
    }).catch(() => {})
  }

  return updated
}

export async function withdrawApplication(jobId: string, workerId: string) {
  const app = await jobRepository.findApplication({ jobId_workerId: { jobId, workerId } })
  if (!app) throw new AppError('Application not found', 404)
  if (app.status !== 'pending') throw new AppError('Cannot withdraw a non-pending application', 400)
  return jobRepository.updateApplication(app.id, { status: 'withdrawn' })
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function sendMessage(jobId: string, senderId: string, recipientId: string, body: string) {
  const job = await jobRepository.findById(jobId)
  if (!job) throw new AppError('Job not found', 404)

  const { db } = await import('../db.js')
  return db.jobMessage.create({
    data: { jobId, senderId, recipientId, body },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  })
}

export async function listMessages(jobId: string, userId: string) {
  const job = await jobRepository.findById(jobId)
  if (!job) throw new AppError('Job not found', 404)

  const { db } = await import('../db.js')

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
