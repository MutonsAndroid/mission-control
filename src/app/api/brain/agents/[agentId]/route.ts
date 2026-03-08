import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { requireRole } from '@/lib/auth'
import { loadAgentDocs, getIdentityWritePath } from '@/lib/agent-docs'
import { parseIdentityFrontmatter } from '@/lib/identity-frontmatter'
import { ensureDirExists } from '@/lib/config'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { agentId } = await params
    const docs = loadAgentDocs(agentId)

    const identityContent = docs.identity
    const soulContent = docs.soul
    const frontmatter = identityContent ? parseIdentityFrontmatter(identityContent) : {}

    return NextResponse.json({
      identity: identityContent ?? null,
      soul: soulContent ?? null,
      project: frontmatter.project ?? null,
      reportsTo: frontmatter.reports_to ?? null
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load agent docs' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { agentId } = await params
    const body = await request.json()
    const content = String(body?.identity ?? body?.content ?? '')

    const writePath = getIdentityWritePath(agentId)
    if (!writePath) {
      return NextResponse.json({ error: 'OpenClaw agents dir not configured' }, { status: 503 })
    }

    const dir = path.dirname(writePath)
    ensureDirExists(dir)
    fs.writeFileSync(writePath, content, 'utf-8')
    logger.info({ agentId, path: writePath }, 'PUT /api/brain/agents/[agentId]: wrote IDENTITY.md')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'PUT /api/brain/agents/[agentId] error')
    return NextResponse.json({ error: 'Failed to save identity' }, { status: 500 })
  }
}
