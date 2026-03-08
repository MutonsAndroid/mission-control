import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadAgentDocs } from '@/lib/agent-docs'
import { parseIdentityFrontmatter } from '@/lib/identity-frontmatter'

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
