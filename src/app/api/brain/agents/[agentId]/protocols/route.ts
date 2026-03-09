import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'
import {
  getProtocolsForAgent,
  assignProtocol,
  unassignProtocol,
} from '@/lib/protocol-assignment'

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { agentId } = await params
    const id = decodeParam(agentId)
    const protocols = getProtocolsForAgent(id)
    return NextResponse.json({ protocols })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list agent protocols' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { agentId } = await params
    const id = decodeParam(agentId)
    const body = await request.json()
    const protocolFilename = typeof body.protocol === 'string' ? body.protocol.trim() : ''

    if (!protocolFilename.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid protocol filename' }, { status: 400 })
    }

    const ok = assignProtocol(id, protocolFilename)
    if (!ok) {
      return NextResponse.json({ error: 'Failed to assign protocol' }, { status: 500 })
    }

    const protocols = getProtocolsForAgent(id)
    return NextResponse.json({ success: true, protocols })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign protocol' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { agentId } = await params
    const id = decodeParam(agentId)
    const { searchParams } = new URL(request.url)
    const protocol = searchParams.get('protocol')

    if (!protocol || !protocol.endsWith('.md')) {
      return NextResponse.json({ error: 'protocol query param required (e.g. ?protocol=foo.md)' }, { status: 400 })
    }

    const ok = unassignProtocol(id, protocol)
    if (!ok) {
      return NextResponse.json({ error: 'Failed to unassign protocol' }, { status: 500 })
    }

    const protocols = getProtocolsForAgent(id)
    return NextResponse.json({ success: true, protocols })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unassign protocol' }, { status: 500 })
  }
}
