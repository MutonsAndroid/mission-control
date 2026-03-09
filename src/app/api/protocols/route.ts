import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'
import {
  listProtocols,
  createProtocol,
  getProtocolsDir,
} from '@/lib/protocols'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const dir = getProtocolsDir()
    if (!dir) {
      return NextResponse.json({ protocols: [] })
    }

    const protocols = listProtocols()
    return NextResponse.json({ protocols })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list protocols' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const body = await request.json()
    const { filename, content } = body

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const name = String(filename).trim()
    if (!name.endsWith('.md')) {
      return NextResponse.json({ error: 'Filename must end with .md' }, { status: 400 })
    }

    const ok = createProtocol(name, typeof content === 'string' ? content : '')
    if (!ok) {
      return NextResponse.json({ error: 'Failed to create protocol (file may already exist)' }, { status: 409 })
    }

    return NextResponse.json({ success: true, name })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create protocol' }, { status: 500 })
  }
}
