/**
 * job.service.ts
 *
 * Thin service layer for job-related operations.  All database access is
 * delegated to JobRepository so the service stays free of raw Prisma calls
 * and the repository can be swapped / mocked in tests.
 *
 * N+1 optimisations live in the repository layer — see
 * src/repositories/job.repository.ts for details.
 */
import { AppError } from '../services/AppError.js'
import { db } from '../db.js'
import { jobRepository } from '../repositories/job.repository.js'

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
  await jobRepository.expireJobs()
  return jobRepository.listJobs(opts)
}

export async function getJob(id: string) {
  await jobRepository.expireJobs()
  const job = await jobRepository.findJobById(id)
  if (!job) throw new AppError('Job not found', 404)
  return job
}

// ── Skill-based recommendations for a worker ─────────────────────────────────

export async function recommendedJobs(workerId: string, limit = 10) {
  await jobRepository.expireJobs()
  const worker = await db.worker.findUnique({ where: { id: workerId }, select: { categoryId: true } })
  if (!worker) throw new AppError('Worker not found', 404)
  return jobRepository.recommendedJobs(worker.categoryId, limit)
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
  return jobRepository.createJob(data, postedById)
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
  return jobRepository.updateJob(id, userId, data)
}

export async function deleteJob(id: string, userId: string) {
  return jobRepository.deleteJob(id, userId)
}

export async function renewJob(id: string, userId: string, daysFromNow = 30) {
  return jobRepository.renewJob(id, userId, daysFromNow)
}

export async function myPostedJobs(userId: string, page = 1, limit = 20) {
  return jobRepository.myPostedJobs(userId, page, limit)
}

export async function myApplications(workerId: string, page = 1, limit = 20) {
  return jobRepository.myApplications(workerId, page, limit)
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  workerId: string,
  coverLetter?: string,
  proposedRate?: number,
) {
  return jobRepository.applyToJob(jobId, workerId, coverLetter, proposedRate)
}

export async function listApplications(jobId: string, userId: string) {
  return jobRepository.listApplications(jobId, userId)
}

export async function updateApplicationStatus(
  jobId: string,
  applicationId: string,
  userId: string,
  status: 'accepted' | 'rejected',
) {
  return jobRepository.updateApplicationStatus(jobId, applicationId, userId, status)
}

export async function withdrawApplication(jobId: string, workerId: string) {
  return jobRepository.withdrawApplication(jobId, workerId)
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function sendMessage(
  jobId: string,
  senderId: string,
  recipientId: string,
  body: string,
) {
  return jobRepository.sendMessage(jobId, senderId, recipientId, body)
}

export async function listMessages(jobId: string, userId: string) {
  return jobRepository.listMessages(jobId, userId)
}
