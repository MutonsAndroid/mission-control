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
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      return NextResponse.json({ files: [] })
    }

    const files: { name: string; path: string; mtime: number }[] = []
    function scanDir(dir: string, prefix: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name.startsWith('.')) continue
        const rel = prefix ? `${prefix}/${e.name}` : e.name
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          if (e.name !== 'logs' && e.name !== 'protocols') scanDir(full, rel)
        } else if (/\.(md|txt|json)$/i.test(e.name)) {
          try {
            const stat = fs.statSync(full)
            files.push({ name: e.name, path: rel, mtime: stat.mtimeMs })
          } catch { /* skip */ }
        }
      }
    }
    scanDir(projectDir, '')

    files.sort((a, b) => b.mtime - a.mtime)
    const recent = files.slice(0, 10)

    return NextResponse.json({ files: recent })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain/projects/[slug]/recent error')
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}
