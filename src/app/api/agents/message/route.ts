import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, db_helpers } from '@/lib/db'
import { runOpenClaw } from '@/lib/command'
import { requireRole } from '@/lib/auth'
import { validateBody, createMessageSchema } from '@/lib/validation'
import { mutationLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getBootPaths } from '@/lib/mission-control-boot'
import { runRecall } from '@/lib/memory'

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const result = await validateBody(request, createMessageSchema)
    if ('error' in result) return result.error
    const { to, message } = result.data
    const from = auth.user.display_name || auth.user.username || 'system'

    const db = getDatabase()
    const workspaceId = auth.user.workspace_id ?? 1
    let agent = db
      .prepare('SELECT * FROM agents WHERE lower(name) = lower(?) AND workspace_id = ?')
      .get(to, workspaceId) as any

    // Fallback: allow messaging Sampson even when not in DB (virtual registry entry)
    if (!agent && String(to).toLowerCase() === 'sampson') {
      agent = { id: 'sampson', name: 'Sampson', session_key: null, config: JSON.stringify({ openclawId: 'sampson' }) }
    }

    if (!agent) {
      return NextResponse.json({ error: 'Recipient agent not found' }, { status: 404 })
    }

    const openclawAgentId = (() => {
      if (agent?.config) {
        try {
          const cfg = JSON.parse(agent.config)
          if (cfg?.openclawId && typeof cfg.openclawId === 'string') return cfg.openclawId
        } catch { /* ignore */ }
      }
      return String(to).toLowerCase().replace(/\s+/g, '-')
    })()

    const paths = getBootPaths()
    if (paths) {
      runRecall(paths, `Message from ${from} to ${to}: ${message}`)
    }

    if (agent.session_key) {
      await runOpenClaw(
        [
          'gateway',
          'sessions_send',
          '--session',
          agent.session_key,
          '--message',
          `Message from ${from}: ${message}`
        ],
        { timeoutMs: 10000 }
      )
    } else if (openclawAgentId) {
      await runOpenClaw(
        [
          'gateway',
          'call',
          'agent',
          '--timeout',
          '10000',
          '--params',
          JSON.stringify({
            message: `Message from ${from}: ${message}`,
            agentId: openclawAgentId,
            deliver: false,
          }),
          '--json',
        ],
        { timeoutMs: 12000 }
      )
    } else {
      return NextResponse.json(
        { error: 'Recipient agent has no session or openclaw ID configured' },
        { status: 400 }
      )
    }

    const agentIdForLog = typeof agent.id === 'number' ? agent.id : 0
    db_helpers.createNotification(
      to,
      'message',
      'Direct Message',
      `${from}: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`,
      'agent',
      agentIdForLog,
      workspaceId
    )

    db_helpers.logActivity(
      'agent_message',
      'agent',
      agentIdForLog,
      from,
      `Sent message to ${to}`,
      { to },
      workspaceId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'POST /api/agents/message error')
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
