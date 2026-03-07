import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { readGatewayAuthToken } from '@/lib/openclaw-config'

interface GatewayEntry {
  id: number
  name: string
  host: string
  port: number
  token: string
  is_primary: number
}

/**
 * GET /api/gateways/[id]/connection - Return connection params (host, port, token) for WebSocket
 * Used by the frontend when establishing a gateway WebSocket connection.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const gatewayId = parseInt(id, 10)
  if (isNaN(gatewayId)) {
    return NextResponse.json({ error: 'Invalid gateway id' }, { status: 400 })
  }

  const db = getDatabase()
  const gw = db.prepare('SELECT id, name, host, port, token FROM gateways WHERE id = ?').get(gatewayId) as GatewayEntry | undefined
  if (!gw) {
    return NextResponse.json({ error: 'Gateway not found' }, { status: 404 })
  }

  const fallbackToken = readGatewayAuthToken()
  return NextResponse.json({
    host: gw.host,
    port: gw.port,
    token: gw.token || fallbackToken || '',
  })
}
