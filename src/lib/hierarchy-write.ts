/**
 * Update agents/hierarchy.json (single source of truth for reporting structure).
 * Use this when adding, replacing, or removing agents.
 */

import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { logger } from '@/lib/logger'

export interface HierarchyJsonNode {
  children?: Record<string, HierarchyJsonNode>
}

export interface HierarchyJson {
  owner: string
  children?: Record<string, HierarchyJsonNode>
}

/**
 * Load raw hierarchy.json content. Returns null if missing or invalid.
 */
export function loadHierarchyJson(): HierarchyJson | null {
  const paths = locateOpenClawInstall()
  if (!paths?.hierarchyPath || !fs.existsSync(paths.hierarchyPath)) return null

  try {
    const raw = fs.readFileSync(paths.hierarchyPath, 'utf-8')
    return JSON.parse(raw) as HierarchyJson
  } catch {
    return null
  }
}

/**
 * Add an agent as a child of parentId in hierarchy.json.
 * Creates hierarchy.json with owner=sampson if it does not exist.
 * parentId is the agent ID of the direct superior (e.g. "sampson" or "mission-control-pm").
 */
export function addAgentToHierarchy(agentId: string, parentId: string): void {
  const paths = locateOpenClawInstall()
  if (!paths?.agentsDir) {
    throw new Error('OpenClaw installation not found')
  }

  const hierarchyPath = paths.hierarchyPath
  const loaded = loadHierarchyJson()
  const data: HierarchyJson = loaded ?? { owner: 'sampson', children: {} }
  if (!data.children) data.children = {}

  const parentNode = parentId === data.owner
    ? { children: data.children }
    : findNode(data.children, parentId)

  if (!parentNode) {
    throw new Error(`Parent agent "${parentId}" not found in hierarchy`)
  }

  if (!parentNode.children) parentNode.children = {}
  parentNode.children[agentId] = { children: {} }

  fs.mkdirSync(path.dirname(hierarchyPath), { recursive: true })
  fs.writeFileSync(hierarchyPath, JSON.stringify(data, null, 2), 'utf-8')
  logger.info({ agentId, parentId, hierarchyPath }, '[hierarchy-write] Added agent to hierarchy')
}

function findNode(children: Record<string, HierarchyJsonNode>, id: string): HierarchyJsonNode | null {
  if (children[id]) return children[id]
  for (const child of Object.values(children)) {
    if (child.children) {
      const found = findNode(child.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Remove an agent from hierarchy.json.
 */
export function removeAgentFromHierarchy(agentId: string): void {
  const paths = locateOpenClawInstall()
  if (!paths?.hierarchyPath) return

  const data = loadHierarchyJson()
  if (!data?.children) return

  function removeFrom(node: Record<string, HierarchyJsonNode>): boolean {
    if (node[agentId]) {
      delete node[agentId]
      return true
    }
    for (const child of Object.values(node)) {
      if (child.children && removeFrom(child.children)) return true
    }
    return false
  }

  if (removeFrom(data.children)) {
    fs.writeFileSync(paths.hierarchyPath, JSON.stringify(data, null, 2), 'utf-8')
    logger.info({ agentId }, '[hierarchy-write] Removed agent from hierarchy')
  }
}
