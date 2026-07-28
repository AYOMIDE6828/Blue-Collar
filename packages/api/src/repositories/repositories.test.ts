import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '../repositories/user.repository.js'
import { WorkerRepository } from '../repositories/worker.repository.js'
import { CategoryRepository } from '../repositories/category.repository.js'
import { NotificationPreferencesRepository } from '../repositories/notificationPreferences.repository.js'
import { JobRepository } from '../repositories/job.repository.js'

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock('../db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    worker: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notificationPreferences: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    job: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    jobApplication: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    review: {
      groupBy: vi.fn(),
    },
  },
}))

import { db } from '../db.js'

// ── UserRepository ────────────────────────────────────────────────────────────

describe('UserRepository', () => {
  let repo: UserRepository

  beforeEach(() => {
    repo = new UserRepository()
    vi.clearAllMocks()
  })

  it('findById calls db.user.findUnique with id', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: '1' } as any)
    const result = await repo.findById('1')
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } })
    expect(result).toEqual({ id: '1' })
  })

  it('findByEmail calls db.user.findUnique with email', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ email: 'a@b.com' } as any)
    await repo.findByEmail('a@b.com')
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } })
  })

  it('findByGoogleId calls db.user.findUnique with googleId', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    await repo.findByGoogleId('gid123')
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { googleId: 'gid123' } })
  })

  it('findByReferralCode calls db.user.findUnique with referralCode', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    await repo.findByReferralCode('REF123')
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { referralCode: 'REF123' } })
  })

  it('findByResetToken calls db.user.findFirst with token and expiry check', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null)
    await repo.findByResetToken('tok')
    expect(db.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ resetToken: 'tok' }) })
    )
  })

  it('findByVerificationToken calls db.user.findFirst', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null)
    await repo.findByVerificationToken('vtok')
    expect(db.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ verificationToken: 'vtok' }) })
    )
  })

  it('create calls db.user.create', async () => {
    const data = { email: 'x@y.com', firstName: 'X', lastName: 'Y', password: 'hash' } as any
    vi.mocked(db.user.create).mockResolvedValue({ id: '2', ...data } as any)
    await repo.create(data)
    expect(db.user.create).toHaveBeenCalledWith({ data })
  })

  it('update calls db.user.update', async () => {
    vi.mocked(db.user.update).mockResolvedValue({ id: '1' } as any)
    await repo.update('1', { firstName: 'New' })
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { firstName: 'New' } })
  })

  it('delete calls db.user.delete', async () => {
    vi.mocked(db.user.delete).mockResolvedValue({ id: '1' } as any)
    await repo.delete('1')
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: '1' } })
  })

  it('count calls db.user.count', async () => {
    vi.mocked(db.user.count).mockResolvedValue(5)
    const n = await repo.count()
    expect(n).toBe(5)
  })
})

// ── WorkerRepository ──────────────────────────────────────────────────────────

describe('WorkerRepository', () => {
  let repo: WorkerRepository

  beforeEach(() => {
    repo = new WorkerRepository()
    vi.clearAllMocks()
  })

  it('findById calls db.worker.findUnique', async () => {
    vi.mocked(db.worker.findUnique).mockResolvedValue({ id: 'w1' } as any)
    await repo.findById('w1')
    expect(db.worker.findUnique).toHaveBeenCalledWith({ where: { id: 'w1' } })
  })

  it('findByCurator calls db.worker.findMany with curatorId', async () => {
    vi.mocked(db.worker.findMany).mockResolvedValue([])
    await repo.findByCurator('c1')
    expect(db.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { curatorId: 'c1' } })
    )
  })

  it('findActive filters by isActive: true', async () => {
    vi.mocked(db.worker.findMany).mockResolvedValue([])
    await repo.findActive()
    expect(db.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    )
  })

  it('findByCategory filters by categoryId and isActive', async () => {
    vi.mocked(db.worker.findMany).mockResolvedValue([])
    await repo.findByCategory('cat1')
    expect(db.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 'cat1', isActive: true } })
    )
  })

  it('toggleActive flips isActive', async () => {
    vi.mocked(db.worker.findUniqueOrThrow).mockResolvedValue({ id: 'w1', isActive: true } as any)
    vi.mocked(db.worker.update).mockResolvedValue({ id: 'w1', isActive: false } as any)
    const result = await repo.toggleActive('w1')
    expect(db.worker.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { isActive: false } })
    expect(result).toEqual({ id: 'w1', isActive: false })
  })

  it('delete calls db.worker.delete', async () => {
    vi.mocked(db.worker.delete).mockResolvedValue({ id: 'w1' } as any)
    await repo.delete('w1')
    expect(db.worker.delete).toHaveBeenCalledWith({ where: { id: 'w1' } })
  })
})

// ── CategoryRepository ────────────────────────────────────────────────────────

describe('CategoryRepository', () => {
  let repo: CategoryRepository

  beforeEach(() => {
    repo = new CategoryRepository()
    vi.clearAllMocks()
  })

  it('findAll returns categories ordered by name', async () => {
    vi.mocked(db.category.findMany).mockResolvedValue([])
    await repo.findAll()
    expect(db.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } })
    )
  })

  it('findByName calls db.category.findUnique', async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue({ id: 'c1', name: 'Plumber' } as any)
    await repo.findByName('Plumber')
    expect(db.category.findUnique).toHaveBeenCalledWith({ where: { name: 'Plumber' } })
  })

  it('create calls db.category.create', async () => {
    const data = { name: 'Electrician' } as any
    vi.mocked(db.category.create).mockResolvedValue({ id: 'c2', ...data } as any)
    await repo.create(data)
    expect(db.category.create).toHaveBeenCalledWith({ data })
  })

  it('count calls db.category.count', async () => {
    vi.mocked(db.category.count).mockResolvedValue(10)
    const n = await repo.count()
    expect(n).toBe(10)
  })
})

// ── NotificationPreferencesRepository ────────────────────────────────────────

describe('NotificationPreferencesRepository', () => {
  let repo: NotificationPreferencesRepository

  beforeEach(() => {
    repo = new NotificationPreferencesRepository()
    vi.clearAllMocks()
  })

  it('findByUserId calls db.notificationPreferences.findUnique', async () => {
    vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null)
    await repo.findByUserId('u1')
    expect(db.notificationPreferences.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })

  it('findOrCreate returns existing prefs if found', async () => {
    const existing = { id: 'p1', userId: 'u1' }
    vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(existing as any)
    const result = await repo.findOrCreate('u1')
    expect(db.notificationPreferences.create).not.toHaveBeenCalled()
    expect(result).toEqual(existing)
  })

  it('findOrCreate creates defaults when not found', async () => {
    vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null)
    vi.mocked(db.notificationPreferences.create).mockResolvedValue({ id: 'p2', userId: 'u1' } as any)
    await repo.findOrCreate('u1')
    expect(db.notificationPreferences.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) }),
    )
  })

  it('upsert calls db.notificationPreferences.upsert with userId and updates', async () => {
    vi.mocked(db.notificationPreferences.upsert).mockResolvedValue({ id: 'p1', userId: 'u1' } as any)
    await repo.upsert('u1', { announcements: false })
    expect(db.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        update: { announcements: false },
      }),
    )
  })

  it('isEnabled returns true when prefs not found (opt-in by default)', async () => {
    vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null)
    const result = await repo.isEnabled('u1', 'announcements')
    expect(result).toBe(true)
  })

  it('isEnabled returns the stored boolean value when prefs exist', async () => {
    vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue({
      id: 'p1', userId: 'u1', announcements: false,
    } as any)
    const result = await repo.isEnabled('u1', 'announcements')
    expect(result).toBe(false)
  })

  it('seedDefaults calls db.notificationPreferences.upsert', async () => {
    vi.mocked(db.notificationPreferences.upsert).mockResolvedValue({ id: 'p1' } as any)
    await repo.seedDefaults('u1')
    expect(db.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, update: {} }),
    )
  })
})

// ── JobRepository ─────────────────────────────────────────────────────────────

describe('JobRepository', () => {
  let repo: JobRepository

  beforeEach(() => {
    repo = new JobRepository()
    vi.clearAllMocks()
  })

  it('findById calls db.job.findUnique', async () => {
    vi.mocked(db.job.findUnique).mockResolvedValue({ id: 'j1' } as any)
    await repo.findById('j1')
    expect(db.job.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'j1' } }),
    )
  })

  it('list runs findMany + count in parallel and returns paginated result', async () => {
    vi.mocked(db.job.findMany).mockResolvedValue([{ id: 'j1' }] as any)
    vi.mocked(db.job.count).mockResolvedValue(1)
    const result = await repo.list({ status: 'open' }, { skip: 0, take: 20 })
    expect(db.job.findMany).toHaveBeenCalled()
    expect(db.job.count).toHaveBeenCalled()
    expect(result).toEqual({ data: [{ id: 'j1' }], total: 1 })
  })

  it('list uses eager-loading jobInclude (no N+1)', async () => {
    vi.mocked(db.job.findMany).mockResolvedValue([] as any)
    vi.mocked(db.job.count).mockResolvedValue(0)
    await repo.list({}, { skip: 0, take: 20 })
    const call = vi.mocked(db.job.findMany).mock.calls[0]?.[0] as any
    // Assert relations are included eagerly
    expect(call?.include).toBeDefined()
    expect(call?.include?.category).toBe(true)
    expect(call?.include?.location).toBe(true)
    expect(call?.include?.postedBy).toBeDefined()
    expect(call?.include?._count).toBeDefined()
  })

  it('findExpired queries only open jobs past expiresAt', async () => {
    vi.mocked(db.job.findMany).mockResolvedValue([] as any)
    await repo.findExpired()
    const call = vi.mocked(db.job.findMany).mock.calls[0]?.[0] as any
    expect(call?.where?.status).toBe('open')
    expect(call?.where?.expiresAt?.lt).toBeDefined()
  })

  it('create calls db.job.create with include', async () => {
    vi.mocked(db.job.create).mockResolvedValue({ id: 'j2' } as any)
    await repo.create({ title: 'Plumber needed' } as any)
    expect(db.job.create).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Object) }),
    )
  })

  it('delete calls db.job.delete', async () => {
    vi.mocked(db.job.delete).mockResolvedValue({ id: 'j1' } as any)
    await repo.delete('j1')
    expect(db.job.delete).toHaveBeenCalledWith({ where: { id: 'j1' } })
  })
})
