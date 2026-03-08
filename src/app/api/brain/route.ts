import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { requireRole } from '@/lib/auth'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { ensureDirExists } from '@/lib/config'
import { logger } from '@/lib/logger'

function resolvePath(pathParam: string | null): { fullPath: string; base: string } | null {
  if (!pathParam || typeof pathParam !== 'string') return null
  const normalized = pathParam.trim().toUpperCase()
  if (normalized !== 'USER.MD') return null

  const paths = locateOpenClawInstall()
  if (!paths) return null

  const fullPath = paths.user
  const base = paths.workspace
  if (!fullPath.startsWith(base)) return null
  return { fullPath, base }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const pathParam = request.nextUrl.searchParams.get('path')
    const resolved = resolvePath(pathParam)
    if (!resolved) {
      return NextResponse.json(
        { error: 'Invalid or missing path. Use ?path=USER.md' },
        { status: 400 }
      )
    }

    let content = ''
    if (fs.existsSync(resolved.fullPath)) {
      content = fs.readFileSync(resolved.fullPath, 'utf-8')
    }

    return NextResponse.json({ content, path: pathParam })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain error')
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const pathParam = request.nextUrl.searchParams.get('path')
    const resolved = resolvePath(pathParam)
    if (!resolved) {
      return NextResponse.json(
        { error: 'Invalid or missing path. Use ?path=USER.md' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const content = String(body?.content ?? body?.markdown ?? '')

    const dir = path.dirname(resolved.fullPath)
    ensureDirExists(dir)
    fs.writeFileSync(resolved.fullPath, content, 'utf-8')
    logger.info({ path: pathParam, fullPath: resolved.fullPath }, 'PUT /api/brain: wrote file')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'PUT /api/brain error')
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 })
  }
}
