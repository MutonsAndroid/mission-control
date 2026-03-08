/**
 * Agent hierarchy loading.
 * Source of truth: agents/hierarchy.json (preferred) or IDENTITY.md front-matter (reports_to).
 * Never parses AGENTS.md prose.
 */

import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { loadAgentDocs } from '@/lib/agent-docs'
import { parseIdentityFrontmatter } from '@/lib/identity-frontmatter'

export interface HierarchyNode {
  id: string
  children: HierarchyNode[]
}

export interface HierarchyTree {
  owner: string
  root: HierarchyNode
  nodes: Map<string, HierarchyNode>
}

/**
 * Load hierarchy from agents/hierarchy.json if it exists.
 * Returns null if file missing or invalid.
 */
function loadHierarchyJson(agentsDir: string): HierarchyTree | null {
  const hierarchyPath = path.join(agentsDir, 'hierarchy.json')
  if (!fs.existsSync(hierarchyPath)) return null

  try {
    const raw = fs.readFileSync(hierarchyPath, 'utf-8')
    const data = JSON.parse(raw) as { owner?: string; children?: Record<string, { children?: Record<string, unknown> }> }

    const owner = data.owner || 'owner'
    const nodes = new Map<string, HierarchyNode>()

    function walk(id: string, childrenObj: Record<string, { children?: Record<string, unknown> }> | undefined): HierarchyNode {
      const node: HierarchyNode = { id, children: [] }
      nodes.set(id, node)
      if (childrenObj) {
        for (const [cid, sub] of Object.entries(childrenObj)) {
          node.children.push(walk(cid, sub?.children as Record<string, { children?: Record<string, unknown> }> | undefined))
        }
      }
      return node
    }

    const rootId = owner
    const root = walk(rootId, data.children)
    return { owner: rootId, root, nodes }
  } catch {
    return null
  }
}

/**
 * Build hierarchy from IDENTITY.md front-matter (reports_to) when hierarchy.json is absent.
 */
function buildHierarchyFromIdentity(agentsDir: string): HierarchyTree | null {
  if (!fs.existsSync(agentsDir)) return null

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true })
  const agentDirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'hierarchy.json'
  )
  const reportsTo = new Map<string, string>()
  const allIds = new Set<string>()

  for (const d of agentDirs) {
    allIds.add(d.name)
    const identityPath = path.join(agentsDir, d.name, 'IDENTITY.md')
    const altPath = path.join(agentsDir, d.name, 'identity.md')
    const content = fs.existsSync(identityPath)
      ? fs.readFileSync(identityPath, 'utf-8')
      : fs.existsSync(altPath)
        ? fs.readFileSync(altPath, 'utf-8')
        : null
    if (content) {
      const fm = parseIdentityFrontmatter(content)
      if (fm.reports_to) reportsTo.set(d.name, fm.reports_to)
    }
  }

  if (allIds.size === 0) return null

  const nodes = new Map<string, HierarchyNode>()
  for (const id of allIds) {
    nodes.set(id, { id, children: [] })
  }
  for (const [child, parent] of reportsTo) {
    if (nodes.has(parent)) {
      nodes.get(parent)!.children.push(nodes.get(child)!)
    }
  }

  const roots = [...allIds].filter((id) => !reportsTo.has(id))
  const owner = roots[0] ?? [...allIds][0]
  const rootNode = nodes.get(owner) ?? { id: owner, children: [] }
  return { owner, root: rootNode, nodes }
}

/**
 * Load hierarchy. Prefers hierarchy.json; falls back to IDENTITY.md reports_to.
 */
export function loadHierarchy(): HierarchyTree | null {
  const paths = locateOpenClawInstall()
  if (!paths?.agentsDir) return null

  const fromJson = loadHierarchyJson(paths.agentsDir)
  if (fromJson) return fromJson

  return buildHierarchyFromIdentity(paths.agentsDir)
}
