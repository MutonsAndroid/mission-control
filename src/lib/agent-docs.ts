/**
 * Agent Document Discovery
 *
 * Locates and loads Markdown documents for OpenClaw agents from the filesystem.
 * OpenClaw is the source of truth; Mission Control discovers and hydrates.
 *
 * Search locations (in order):
 *   ~/.openclaw/agents/<agentId>/
 *   ~/.openclaw/agents/<agentName>/
 *   ~/.openclaw/workspaces/<agentId>/
 *   ~/.openclaw/<agentId>/
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from './config'
import { logger } from './logger'

const LOG_PREFIX = '[AgentDocs]'

/** Supported document types (filename without .md) */
const DOC_TYPES = ['soul', 'identity', 'constitution', 'charter', 'memory'] as const

export type AgentDocType = (typeof DOC_TYPES)[number]

export interface AgentDocsResult {
  soul?: string
  identity?: string
  constitution?: string
  charter?: string
  memory?: string
  /** Paths for each loaded doc type */
  paths: Record<string, string>
}

/**
 * Build candidate directory paths for an agent.
 * Uses OPENCLAW_STATE_DIR (defaults to ~/.openclaw) as base.
 * Also checks workspace/agents/<id> when OpenClaw workspace exists (Sampson ecosystem).
 */
function getCandidateDirs(agentId: string, agentName?: string): string[] {
  const base = config.openclawStateDir
  const workspaceDir = config.openclawHome || path.join(base || '', 'workspace')
  if (!base) return []

  const normalizedId = agentId.toLowerCase().replace(/\s+/g, '-')
  const normalizedName =
    agentName && agentName !== agentId
      ? agentName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      : null

  const dirs: string[] = [
    path.join(workspaceDir, 'agents', normalizedId),
    path.join(base, 'agents', normalizedId),
    path.join(base, 'workspaces', normalizedId),
    path.join(base, normalizedId),
  ]
  if (normalizedName && normalizedName !== normalizedId) {
    dirs.push(path.join(workspaceDir, 'agents', normalizedName))
    dirs.push(path.join(base, 'agents', normalizedName))
  }
  return dirs
}

/**
 * Load a Markdown file if it exists.
 * Supports both lowercase (identity.md) and uppercase (IDENTITY.md) for identity/soul.
 */
function loadMarkdownFile(dir: string, docType: string): { content: string; fullPath: string } | null {
  const candidates =
    docType === 'identity' || docType === 'soul'
      ? [`${docType}.md`, `${docType.toUpperCase()}.md`]
      : [`${docType}.md`]
  for (const name of candidates) {
    const fullPath = path.join(dir, name)
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        return { content, fullPath }
      }
    } catch (err) {
      logger.warn({ err, fullPath }, `${LOG_PREFIX} failed to read ${name}`)
    }
  }
  return null
}

/**
 * Load agent documents from the filesystem.
 * Given an agent ID (e.g. "sampson"), searches known OpenClaw paths
 * and returns loaded Markdown content for each found document.
 */
export function loadAgentDocs(
  agentId: string,
  agentName?: string
): AgentDocsResult {
  const result: AgentDocsResult = {
    paths: {},
  }

  const dirs = getCandidateDirs(agentId, agentName)
  const firstDir = dirs[0]
  if (firstDir) {
    logger.info({ agentId, path: firstDir }, `${LOG_PREFIX} scanning ${firstDir}`)
  }

  const resultContent: Record<string, string> = {}
  for (const dir of dirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue

    for (const docType of DOC_TYPES) {
      if (result.paths[docType]) continue // already found in a prior dir
      const loaded = loadMarkdownFile(dir, docType)
      if (loaded) {
        resultContent[docType] = loaded.content
        result.paths[docType] = loaded.fullPath
        logger.info({ path: loaded.fullPath }, `${LOG_PREFIX} ${docType}.md loaded`)
      }
    }
  }
  Object.assign(result, resultContent)

  return result
}

/**
 * Get list of doc types and paths for diagnostics.
 */
export function getAgentDocsDiagnostics(agentId: string): {
  agentDocsDetected: boolean
  docTypes: string[]
  docPaths: string[]
} {
  const docs = loadAgentDocs(agentId)
  const docTypes = Object.keys(docs.paths)
  const docPaths = Object.values(docs.paths)
  return {
    agentDocsDetected: docTypes.length > 0,
    docTypes,
    docPaths,
  }
}
