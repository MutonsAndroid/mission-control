import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'
import {
  readProtocol,
  writeProtocol,
  deleteProtocol,
  renameProtocol,
} from '@/lib/protocols'
import { getAgentsForProtocol } from '@/lib/protocol-assignment'

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { name } = await params
    const filename = decodeParam(name)
    if (!filename.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid protocol filename' }, { status: 400 })
    }

    const result = readProtocol(filename)
    if (!result) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
    }

    const agents = getAgentsForProtocol(filename)
    return NextResponse.json({
      content: result.content,
      path: result.path,
      meta: result.meta,
      agents,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read protocol' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { name } = await params
    const filename = decodeParam(name)
    if (!filename.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid protocol filename' }, { status: 400 })
    }

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content : ''

    const ok = writeProtocol(filename, content)
    if (!ok) {
      return NextResponse.json({ error: 'Failed to write protocol' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write protocol' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { name } = await params
    const oldFilename = decodeParam(name)
    if (!oldFilename.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid protocol filename' }, { status: 400 })
    }

    const body = await request.json()
    const newFilename = typeof body.filename === 'string' ? body.filename.trim() : ''
    if (!newFilename.endsWith('.md')) {
      return NextResponse.json({ error: 'New filename must end with .md' }, { status: 400 })
    }

    const ok = renameProtocol(oldFilename, newFilename)
    if (!ok) {
      return NextResponse.json({ error: 'Failed to rename protocol' }, { status: 400 })
    }

    return NextResponse.json({ success: true, name: newFilename })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rename protocol' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const { name } = await params
    const filename = decodeParam(name)
    if (!filename.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid protocol filename' }, { status: 400 })
    }

    const ok = deleteProtocol(filename)
    if (!ok) {
      return NextResponse.json({ error: 'Protocol not found or could not be deleted' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete protocol' }, { status: 500 })
  }
}
