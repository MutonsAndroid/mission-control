import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadHierarchy, type HierarchyNode } from '@/lib/hierarchy'

function findSubtree(root: HierarchyNode, targetId: string): HierarchyNode | null {
  if (root.id === targetId) return root
  for (const child of root.children) {
    const found = findSubtree(child, targetId)
    if (found) return found
  }
  return null
}

function toSerializable(node: HierarchyNode): { id: string; children: unknown[] } {
  return {
    id: node.id,
    children: node.children.map(toSerializable)
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const tree = loadHierarchy()
    if (!tree) {
      return NextResponse.json({ hierarchy: null })
    }

    const { searchParams } = new URL(request.url)
    const projectSlug = searchParams.get('project')

    if (projectSlug && /^[a-z0-9-_]+$/.test(projectSlug)) {
      const pmId = `${projectSlug}-pm`
      const pmNode = findSubtree(tree.root, pmId)
      if (pmNode) {
        return NextResponse.json({
          hierarchy: {
            owner: pmId,
            root: toSerializable(pmNode),
            nodeIds: [...collectIds(pmNode)]
          }
        })
      }
      return NextResponse.json({
        hierarchy: { owner: pmId, root: { id: pmId, children: [] }, nodeIds: [] }
      })
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

function collectIds(node: HierarchyNode): string[] {
  const ids = [node.id]
  for (const child of node.children) {
    ids.push(...collectIds(child))
  }
  return ids
}
