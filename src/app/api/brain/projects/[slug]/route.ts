import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

function slugAllowed(slug: string): boolean {
  return /^[a-z0-9-_]+$/.test(slug) && !slug.includes('..')
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireRole(_request, 'viewer')
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

    const projectDir = path.join(paths.brainProjectsDir, slug)
    const projectMdPath = path.join(projectDir, 'PROJECT.md')
    const altPath = path.join(projectDir, 'project.md')

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const content = fs.existsSync(projectMdPath)
      ? fs.readFileSync(projectMdPath, 'utf-8')
      : fs.existsSync(altPath)
        ? fs.readFileSync(altPath, 'utf-8')
        : ''

    return NextResponse.json({ slug, content })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain/projects/[slug] error')
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    const content = String(body?.content ?? '')

    const paths = locateOpenClawInstall()
    if (!paths?.brainProjectsDir) {
      return NextResponse.json({ error: 'BRAIN not configured' }, { status: 503 })
    }

    const projectDir = path.join(paths.brainProjectsDir, slug)
    const projectMdPath = path.join(projectDir, 'PROJECT.md')

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    fs.writeFileSync(projectMdPath, content, 'utf-8')
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'PUT /api/brain/projects/[slug] error')
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
