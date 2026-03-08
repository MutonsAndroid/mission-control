import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { createProject } from '@/lib/brain-project-create'

export interface BrainProject {
  slug: string
  name: string
  hasProjectMd: boolean
  hasTasksMd: boolean
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const paths = locateOpenClawInstall()
    if (!paths?.brainProjectsDir || !fs.existsSync(paths.brainProjectsDir)) {
      return NextResponse.json({ projects: [] })
    }

    const entries = fs.readdirSync(paths.brainProjectsDir, { withFileTypes: true })
    const projects: BrainProject[] = []

    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue

      const dirPath = path.join(paths.brainProjectsDir, e.name)
      const projectMdPath = path.join(dirPath, 'PROJECT.md')
      const tasksMdPath = path.join(dirPath, 'TASKS.md')
      const projectMdPathLower = path.join(dirPath, 'project.md')

      let name = e.name
      if (fs.existsSync(projectMdPath)) {
        try {
          const content = fs.readFileSync(projectMdPath, 'utf-8')
          const firstLine = content.split('\n')[0]?.trim() || ''
          if (firstLine.startsWith('# ')) name = firstLine.slice(2).trim()
        } catch {
          // keep slug as name
        }
      } else if (fs.existsSync(projectMdPathLower)) {
        try {
          const content = fs.readFileSync(projectMdPathLower, 'utf-8')
          const firstLine = content.split('\n')[0]?.trim() || ''
          if (firstLine.startsWith('# ')) name = firstLine.slice(2).trim()
        } catch {
          // keep slug as name
        }
      }

      projects.push({
        slug: e.name,
        name,
        hasProjectMd: fs.existsSync(projectMdPath) || fs.existsSync(projectMdPathLower),
        hasTasksMd: fs.existsSync(tasksMdPath)
      })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain/projects error')
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const name = String(body?.name || '').trim()
    const mission = String(body?.mission || '').trim()
    const projectManagerModel = String(body?.projectManagerModel || 'gpt-5-mini').trim()
    const notes = body?.notes ? String(body.notes).trim() : undefined

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }
    if (!mission) {
      return NextResponse.json({ error: 'Project mission is required' }, { status: 400 })
    }

    const result = createProject(
      { name, mission, projectManagerModel, notes },
      auth.user?.username
    )

    return NextResponse.json({
      success: true,
      slug: result.slug,
      pmId: result.pmId,
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project'
    logger.error({ err: error }, 'POST /api/brain/projects error')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
