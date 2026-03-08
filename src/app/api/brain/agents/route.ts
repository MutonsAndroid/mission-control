import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { requireRole } from '@/lib/auth'
import { appendStructureLog } from '@/lib/brain-io'
import { addAgentToHierarchy } from '@/lib/hierarchy-write'
import { logger } from '@/lib/logger'

function slugAllowed(s: string): boolean {
  return /^[a-z0-9-_]+$/.test(s)
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const template = String(body?.template || 'developer').trim()
    const role = String(body?.role || '').trim()
    const reportsTo = String(body?.reports_to || '').trim()
    const model = String(body?.model || 'gpt-5-mini').trim()
    const emoji = String(body?.emoji || '🤖').trim()
    const project = String(body?.project || '').trim()

    if (!project || !slugAllowed(project)) {
      return NextResponse.json({ error: 'Valid project is required' }, { status: 400 })
    }
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }
    if (!reportsTo) {
      return NextResponse.json({ error: 'Reports To is required' }, { status: 400 })
    }

    const agentId = role
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'agent'

    const paths = locateOpenClawInstall()
    if (!paths?.agentsDir) {
      return NextResponse.json({ error: 'OpenClaw agents not configured' }, { status: 503 })
    }

    const agentDir = path.join(paths.agentsDir, agentId)
    if (fs.existsSync(agentDir)) {
      return NextResponse.json({ error: `Agent "${agentId}" already exists` }, { status: 409 })
    }

    const authorityLevel = reportsTo === 'sampson' ? 'manager' : 'agent'

    const identityMd = `---
name: ${role}
role: ${role}
project: ${project}
reports_to: ${reportsTo}
authority_level: ${authorityLevel}
---

# ${role}

${role} for project ${project}. Reports to ${reportsTo}.
`

    const soulMd = `# Soul

${role}. Execute tasks as assigned by ${reportsTo}.
`

    fs.mkdirSync(agentDir, { recursive: true })
    fs.writeFileSync(path.join(agentDir, 'IDENTITY.md'), identityMd, 'utf-8')
    fs.writeFileSync(path.join(agentDir, 'SOUL.md'), soulMd, 'utf-8')

    addAgentToHierarchy(agentId, reportsTo)

    const entry = `Created agent ${agentId}\nRole: ${role}\nReports to: ${reportsTo}\nAuthorized by: ${auth.user?.username || 'operator'}`
    appendStructureLog(project, entry)

    logger.info({ agentId, project, reportsTo }, 'POST /api/brain/agents: created agent')

    return NextResponse.json({
      success: true,
      agentId,
      project,
      reportsTo,
    }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create agent'
    logger.error({ err: error }, 'POST /api/brain/agents error')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
