import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadHierarchy, type HierarchyNode } from '@/lib/hierarchy'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const tree = loadHierarchy()
    if (!tree) {
      return NextResponse.json({ hierarchy: null })
    }

    function toSerializable(node: HierarchyNode): { id: string; children: unknown[] } {
      return {
        id: node.id,
        children: node.children.map(toSerializable)
      }
    }

    return NextResponse.json({
      hierarchy: {
        owner: tree.owner,
        root: toSerializable(tree.root),
        nodeIds: [...tree.nodes.keys()]
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load hierarchy' }, { status: 500 })
  }
}
