import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { parseTasksMd, formatTask } from '@/lib/tasks-md'

function slugAllowed(slug: string): boolean {
  return /^[a-z0-9-_]+$/.test(slug) && !slug.includes('..')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { slug } = await params
    if (!slugAllowed(slug)) {
      return NextResponse.json({ error: 'Invalid project slug' }, { status: 400 })
    }

    const paths = locateOpenClawInstall()
    if (!paths?.brainProjectsDir) {
      return NextResponse.json({ error: 'BRAIN not configured' }, { status: 503 })
    }

    const tasksPath = path.join(paths.brainProjectsDir, slug, 'TASKS.md')
    if (!fs.existsSync(tasksPath)) {
      return NextResponse.json({ project: slug, tasks: [] })
    }

    const content = fs.readFileSync(tasksPath, 'utf-8')
    const tasks = parseTasksMd(content)

    const ownerFilter = request.nextUrl.searchParams.get('owner')
    const filtered = ownerFilter
      ? tasks.filter((t) => t.owner.toLowerCase() === ownerFilter.toLowerCase())
      : tasks

    return NextResponse.json({ project: slug, tasks: filtered })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain/projects/[slug]/tasks error')
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { slug } = await params
    if (!slugAllowed(slug)) {
      return NextResponse.json({ error: 'Invalid project slug' }, { status: 400 })
    }

    const paths = locateOpenClawInstall()
    if (!paths?.brainProjectsDir) {
      return NextResponse.json({ error: 'BRAIN not configured' }, { status: 503 })
    }

    const body = await request.json()
    const action = body?.action

    const projectDir = path.join(paths.brainProjectsDir, slug)
    const tasksPath = path.join(projectDir, 'TASKS.md')

    if (action === 'add') {
      const title = String(body?.title || '').trim()
      const owner = String(body?.owner || '').trim()
      const priority = String(body?.priority || 'medium').toLowerCase()
      const status = String(body?.status || 'pending').toLowerCase()

      if (!title) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
      }

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }

      let content = ''
      let nextNum = 1
      if (fs.existsSync(tasksPath)) {
        content = fs.readFileSync(tasksPath, 'utf-8')
        const tasks = parseTasksMd(content)
        const nums = tasks.map((t) => {
          const m = t.id.match(/TASK-(\d+)/)
          return m ? parseInt(m[1], 10) : 0
        })
        nextNum = Math.max(0, ...nums) + 1
      }

      const newTask = {
        id: `TASK-${String(nextNum).padStart(3, '0')}`,
        status,
        priority,
        owner: owner || 'unassigned',
        description: title
      }

      const block = '\n\n' + formatTask(newTask)
      fs.appendFileSync(tasksPath, block, 'utf-8')

      return NextResponse.json({ success: true, task: newTask }, { status: 201 })
    }

    if (action === 'update') {
      const taskId = String(body?.id || '').trim()
      const updates = body?.updates || {}
      if (!taskId || !fs.existsSync(tasksPath)) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const content = fs.readFileSync(tasksPath, 'utf-8')
      const tasks = parseTasksMd(content)
      const idx = tasks.findIndex((t) => t.id === taskId)
      if (idx < 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const task = tasks[idx]
      if (updates.status != null) task.status = String(updates.status)
      if (updates.priority != null) task.priority = String(updates.priority)
      if (updates.owner != null) task.owner = String(updates.owner)
      if (updates.description != null) task.description = String(updates.description)

      const before = tasks.slice(0, idx).map((t) => t.rawBlock).join('\n\n')
      const after = tasks.slice(idx + 1).map((t) => t.rawBlock).join('\n\n')
      const newContent = [before, formatTask(task), after].filter(Boolean).join('\n\n') + '\n'
      fs.writeFileSync(tasksPath, newContent, 'utf-8')

      return NextResponse.json({ success: true, task })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.error({ err: error }, 'POST /api/brain/projects/[slug]/tasks error')
    return NextResponse.json({ error: 'Failed to update tasks' }, { status: 500 })
  }
}
