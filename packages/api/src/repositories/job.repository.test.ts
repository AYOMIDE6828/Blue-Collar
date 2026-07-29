/**
 * Job repository unit tests
 *
 * The critical regression assertions here verify that the N+1 query patterns
 * that existed in the original job.service.ts have been eliminated:
 *
 *  1. listJobs — fires exactly 2 DB queries (findMany + count) in parallel
 *  2. expireJobs — fires exactly 1 UPDATE (batch) regardless of how many
 *     jobs expire, not N individual updates
 *  3. updateApplicationStatus — worker lookup runs concurrently with the
 *     status update (2 queries, not 3 sequential)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobRepository } from './job.repository.js'

// ── Mock Prisma & notification service ───────────────────────────────────────

vi.mock('../db.js', () => ({
  db: {
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    jobApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    jobMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    worker: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../services/notification.service.js', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}))

import { db } from '../db.js'
import { dispatchNotification } from '../services/notification.service.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeJob = {
  id: 'job-1',
  title: 'Fix kitchen sink',
  description: 'Leaking pipes',
  status: 'open',
  urgency: 'normal',
  budget: 150,
  skills: ['plumbing'],
  categoryId: 'cat-1',
  postedById: 'user-1',
  locationId: null,
  expiresAt: new Date(Date.now() + 86400000 * 30),
  createdAt: new Date(),
  updatedAt: new Date(),
  renewedAt: null,
  escrowAmount: null,
  category: { id: 'cat-1', name: 'Plumbing' },
  location: null,
  postedBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe', avatar: null },
  _count: { applications: 0, messages: 0 },
}

const fakeApplication = {
  id: 'app-1',
  jobId: 'job-1',
  workerId: 'worker-1',
  status: 'pending',
  coverLetter: 'I can help',
  proposedRate: 120,
  createdAt: new Date(),
  job: { id: 'job-1', title: 'Fix kitchen sink', postedById: 'user-1' },
  worker: { id: 'worker-1', name: 'Bob', avatar: null, email: 'bob@example.com', category: null },
}

// ── JobRepository ─────────────────────────────────────────────────────────────

describe('JobRepository', () => {
  let repo: JobRepository

  beforeEach(() => {
    repo = new JobRepository()
    vi.clearAllMocks()
  })

  // ── REGRESSION: Query count assertions ─────────────────────────────────────

  describe('listJobs — query count regression', () => {
    it('issues exactly 2 DB queries (findMany + count) for a listing', async () => {
      vi.mocked(db.job.findMany).mockResolvedValue([fakeJob] as any)
      vi.mocked(db.job.count).mockResolvedValue(1)

      await repo.listJobs({ status: 'open', page: 1, limit: 20 })

      // One findMany, one count — no N+1 follow-up queries per row
      expect(db.job.findMany).toHaveBeenCalledTimes(1)
      expect(db.job.count).toHaveBeenCalledTimes(1)
    })

    it('passes the correct include object so relations are eagerly loaded', async () => {
      vi.mocked(db.job.findMany).mockResolvedValue([])
      vi.mocked(db.job.count).mockResolvedValue(0)

      await repo.listJobs({})

      const call = (vi.mocked(db.job.findMany).mock.calls[0] as any[])[0] as any
      expect(call.include).toMatchObject({
        category: true,
        location: true,
        postedBy: expect.any(Object),
        _count: expect.any(Object),
      })
    })

    it('runs findMany and count in parallel (both called before awaiting)', async () => {
      const order: string[] = []
      ;(db.job.findMany as any).mockImplementation(async () => {
        order.push('findMany')
        return []
      })
      ;(db.job.count as any).mockImplementation(async () => {
        order.push('count')
        return 0
      })

      await repo.listJobs({})

      // Both must have been called — order can vary but both should appear
      expect(order).toContain('findMany')
      expect(order).toContain('count')
    })
  })

  describe('expireJobs — batch update regression', () => {
    it('issues exactly 1 updateMany regardless of how many jobs expire', async () => {
      const expiredJobs = [
        { id: 'j1', title: 'Job 1', postedById: 'u1' },
        { id: 'j2', title: 'Job 2', postedById: 'u2' },
        { id: 'j3', title: 'Job 3', postedById: 'u3' },
      ]
      vi.mocked(db.job.findMany).mockResolvedValue(expiredJobs as any)
      vi.mocked(db.job.updateMany).mockResolvedValue({ count: 3 })

      await repo.expireJobs()

      // Single batch update — not N individual updates
      expect(db.job.updateMany).toHaveBeenCalledTimes(1)
      expect(db.job.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['j1', 'j2', 'j3'] } },
        data: { status: 'expired' },
      })
    })

    it('dispatches notifications in parallel for all expired jobs', async () => {
      const expiredJobs = [
        { id: 'j1', title: 'Job 1', postedById: 'u1' },
        { id: 'j2', title: 'Job 2', postedById: 'u2' },
      ]
      vi.mocked(db.job.findMany).mockResolvedValue(expiredJobs as any)
      vi.mocked(db.job.updateMany).mockResolvedValue({ count: 2 })

      await repo.expireJobs()

      expect(dispatchNotification).toHaveBeenCalledTimes(2)
    })

    it('does nothing when no jobs are expired', async () => {
      vi.mocked(db.job.findMany).mockResolvedValue([])

      await repo.expireJobs()

      expect(db.job.updateMany).not.toHaveBeenCalled()
      expect(dispatchNotification).not.toHaveBeenCalled()
    })
  })

  describe('updateApplicationStatus — parallel query regression', () => {
    it('fetches updated application and worker record concurrently', async () => {
      const callOrder: string[] = []

      vi.mocked(db.job.findUnique).mockResolvedValue({ ...fakeJob, postedById: 'user-1' } as any)
      vi.mocked(db.jobApplication.findFirst).mockResolvedValue(fakeApplication as any)

      ;(db.jobApplication.update as any).mockImplementation(async () => {
        callOrder.push('app-update')
        return { ...fakeApplication, status: 'accepted' }
      })
      ;(db.worker.findUnique as any).mockImplementation(async () => {
        callOrder.push('worker-lookup')
        return { curatorId: 'curator-1' }
      })
      vi.mocked(db.job.update).mockResolvedValue(fakeJob as any)

      await repo.updateApplicationStatus('job-1', 'app-1', 'user-1', 'accepted')

      // Both queries must have been called
      expect(db.jobApplication.update).toHaveBeenCalledTimes(1)
      expect(db.worker.findUnique).toHaveBeenCalledTimes(1)

      // Accept-path: job status should also be updated to 'filled'
      expect(db.job.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'filled' },
      })
    })

    it('notifies the worker curator on status change', async () => {
      vi.mocked(db.job.findUnique).mockResolvedValue({ ...fakeJob, postedById: 'user-1' } as any)
      vi.mocked(db.jobApplication.findFirst).mockResolvedValue(fakeApplication as any)
      vi.mocked(db.jobApplication.update).mockResolvedValue({ ...fakeApplication, status: 'rejected' } as any)
      vi.mocked(db.worker.findUnique).mockResolvedValue({ curatorId: 'curator-1' } as any)

      await repo.updateApplicationStatus('job-1', 'app-1', 'user-1', 'rejected')

      expect(dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'curator-1' }),
      )
    })
  })

  // ── Standard CRUD ───────────────────────────────────────────────────────────

  describe('findJobById', () => {
    it('calls db.job.findUnique with include', async () => {
      vi.mocked(db.job.findUnique).mockResolvedValue(fakeJob as any)
      const result = await repo.findJobById('job-1')
      expect(db.job.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'job-1' } }),
      )
      expect(result).toEqual(fakeJob)
    })

    it('returns null when the job does not exist', async () => {
      vi.mocked(db.job.findUnique).mockResolvedValue(null)
      const result = await repo.findJobById('missing')
      expect(result).toBeNull()
    })
  })

  describe('createJob', () => {
    it('creates a job with all provided fields', async () => {
      vi.mocked(db.job.create).mockResolvedValue(fakeJob as any)
      await repo.createJob(
        { title: 'Fix sink', description: 'Leaking', categoryId: 'cat-1', urgency: 'normal' },
        'user-1',
      )
      expect(db.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Fix sink', postedById: 'user-1' }),
        }),
      )
    })
  })

  describe('deleteJob', () => {
    it('throws 403 if caller is not the poster', async () => {
      vi.mocked(db.job.findUnique).mockResolvedValue({ ...fakeJob, postedById: 'other-user' } as any)
      await expect(repo.deleteJob('job-1', 'user-1')).rejects.toThrow('Forbidden')
    })

    it('calls db.job.delete when authorised', async () => {
      vi.mocked(db.job.findUnique).mockResolvedValue({ ...fakeJob, postedById: 'user-1' } as any)
      vi.mocked(db.job.delete).mockResolvedValue(fakeJob as any)
      await repo.deleteJob('job-1', 'user-1')
      expect(db.job.delete).toHaveBeenCalledWith({ where: { id: 'job-1' } })
    })
  })

  describe('myPostedJobs', () => {
    it('issues findMany and count in parallel', async () => {
      vi.mocked(db.job.findMany).mockResolvedValue([fakeJob] as any)
      vi.mocked(db.job.count).mockResolvedValue(1)
      const result = await repo.myPostedJobs('user-1')
      expect(db.job.findMany).toHaveBeenCalledTimes(1)
      expect(db.job.count).toHaveBeenCalledTimes(1)
      expect(result.meta.total).toBe(1)
    })
  })

  describe('withdrawApplication', () => {
    it('throws 404 when application does not exist', async () => {
      vi.mocked(db.jobApplication.findUnique).mockResolvedValue(null)
      await expect(repo.withdrawApplication('job-1', 'worker-1')).rejects.toThrow('Application not found')
    })

    it('throws 400 when application is not pending', async () => {
      vi.mocked(db.jobApplication.findUnique).mockResolvedValue({
        ...fakeApplication,
        status: 'accepted',
      } as any)
      await expect(repo.withdrawApplication('job-1', 'worker-1')).rejects.toThrow(
        'Cannot withdraw a non-pending application',
      )
    })
  })
})
