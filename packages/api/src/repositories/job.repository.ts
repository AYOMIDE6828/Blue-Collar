import type { Job, JobApplication, Prisma } from '@prisma/client'
import { db } from '../db.js'

// ── Shared include objects (eager loading — prevents N+1) ────────────────────

export const jobInclude = {
  category: true,
  location: true,
  postedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
  _count: { select: { applications: true, messages: true } },
} as const

export const applicationInclude = {
  job: { select: { id: true, title: true, postedById: true } },
  worker: { select: { id: true, name: true, avatar: true, email: true, category: true } },
} as const

// ── Repository ───────────────────────────────────────────────────────────────

export class JobRepository {
  // ── Queries ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<(Job & { category: unknown; location: unknown; postedBy: unknown; _count: unknown }) | null> {
    return db.job.findUnique({ where: { id }, include: jobInclude }) as any
  }

  async findByIdWithApplications(id: string) {
    return db.job.findUnique({
      where: { id },
      include: { ...jobInclude, applications: { include: applicationInclude } },
    })
  }

  async list(
    where: Prisma.JobWhereInput,
    opts: { skip: number; take: number },
  ) {
    const [data, total] = await Promise.all([
      db.job.findMany({ where, skip: opts.skip, take: opts.take, include: jobInclude, orderBy: { createdAt: 'desc' } }),
      db.job.count({ where }),
    ])
    return { data, total }
  }

  async findByPostedBy(postedById: string, opts: { skip: number; take: number }) {
    return this.list({ postedById }, opts)
  }

  async findOpenByCategory(categoryId: string, limit: number) {
    return db.job.findMany({
      where: { status: 'open', categoryId },
      take: limit,
      include: jobInclude,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async findExpired() {
    return db.job.findMany({
      where: { status: 'open', expiresAt: { lt: new Date() } },
      select: { id: true, title: true, postedById: true },
    })
  }

  async count(where: Prisma.JobWhereInput): Promise<number> {
    return db.job.count({ where })
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async create(data: Prisma.JobCreateInput) {
    return db.job.create({ data, include: jobInclude })
  }

  async update(id: string, data: Prisma.JobUpdateInput) {
    return db.job.update({ where: { id }, data, include: jobInclude })
  }

  async updateMany(where: Prisma.JobWhereInput, data: Prisma.JobUpdateManyMutationInput) {
    return db.job.updateMany({ where, data })
  }

  async delete(id: string) {
    return db.job.delete({ where: { id } })
  }

  // ── Applications ─────────────────────────────────────────────────────────────

  async findApplication(where: Prisma.JobApplicationWhereUniqueInput): Promise<JobApplication | null> {
    return db.jobApplication.findUnique({ where })
  }

  async findApplicationFirst(where: Prisma.JobApplicationWhereInput): Promise<JobApplication | null> {
    return db.jobApplication.findFirst({ where })
  }

  async listApplications(jobId: string) {
    return db.jobApplication.findMany({
      where: { jobId },
      include: applicationInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  async listWorkerApplications(workerId: string, opts: { skip: number; take: number }) {
    const [data, total] = await Promise.all([
      db.jobApplication.findMany({ where: { workerId }, skip: opts.skip, take: opts.take, include: applicationInclude, orderBy: { createdAt: 'desc' } }),
      db.jobApplication.count({ where: { workerId } }),
    ])
    return { data, total }
  }

  async createApplication(data: Prisma.JobApplicationCreateInput) {
    return db.jobApplication.create({ data, include: applicationInclude })
  }

  async updateApplication(id: string, data: Prisma.JobApplicationUpdateInput) {
    return db.jobApplication.update({ where: { id }, data, include: applicationInclude })
  }
}

export const jobRepository = new JobRepository()
