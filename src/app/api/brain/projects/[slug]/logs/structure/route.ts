import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { appendStructureLog, readStructureLog } from '@/lib/brain-io'

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

    const content = readStructureLog(slug)
    return NextResponse.json({ project: slug, content })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read structure log' }, { status: 500 })
  }
}

export async function POST(
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
    const entry = String(body?.entry || body?.message || '').trim()
    if (!entry) {
      return NextResponse.json({ error: 'Entry content is required' }, { status: 400 })
    }

    appendStructureLog(slug, entry)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to append structure log' }, { status: 500 })
  }
}
