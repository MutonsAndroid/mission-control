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
import { appendStructureLog } from './brain-io'

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
 * Get the first candidate directory for an agent (used for creating/writing).
 */
function getFirstCandidateDir(agentId: string, agentName?: string): string | null {
  const dirs = getCandidateDirs(agentId, agentName)
  return dirs[0] ?? null
}

/**
 * Get the path where IDENTITY.md should be written.
 * Prefers the path we read from if identity exists; otherwise uses the first candidate dir.
 */
export function getIdentityWritePath(agentId: string, agentName?: string): string | null {
  const docs = loadAgentDocs(agentId, agentName)
  if (docs.paths.identity) return docs.paths.identity
  const firstDir = getFirstCandidateDir(agentId, agentName)
  if (!firstDir) return null
  return path.join(firstDir, 'IDENTITY.md')
}

/**
 * Get the path where SOUL.md should be written (canonical agents/<id>/ location).
 */
export function getSoulWritePath(agentId: string, agentName?: string): string | null {
  const docs = loadAgentDocs(agentId, agentName)
  if (docs.paths.soul) return docs.paths.soul
  const dir = getAgentDirForCreation(agentId, agentName)
  if (!dir) return null
  return path.join(dir, 'SOUL.md')
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

/** Default IDENTITY.md template content. Optional hierarchy fields in frontmatter for governance. */
const DEFAULT_IDENTITY_TEMPLATE = (
  name: string,
  role: string,
  purpose: string,
  hierarchy?: { project?: string; reports_to?: string; authority_level?: string }
) => {
  const project = hierarchy?.project?.trim() ?? ''
  const reportsTo = hierarchy?.reports_to?.trim() ?? ''
  const authorityLevel = hierarchy?.authority_level?.trim() ?? ''
  const fm = `---
# Optional: for governance hierarchy (project slug, reports_to agent id, authority_level)
project: ${project}
reports_to: ${reportsTo}
authority_level: ${authorityLevel}
---

`
  return `${fm}# IDENTITY.md — Who Am I?

- **Name:** ${name}
- **Role:** ${role}
- **Owner:** Dustin
- **Purpose:** ${purpose}
- **Personality Tone:** Clear, direct, structured
- **Emoji:** 🤖

---

## Responsibilities

- Define responsibilities here
`
}

/** Default SOUL.md template content */
const DEFAULT_SOUL_TEMPLATE = `# SOUL.md — How I Think

## Core Philosophy

Describe how the agent approaches problems.

## Operating Principles

- Remain structured
- Support project goals
- Communicate clearly

## Reasoning Style

Explain the agent's decision-making style.
`

/**
 * Get the agent directory path for creation (creates dir if needed).
 * Uses the first candidate dir: workspace/agents/<agentId>
 */
export function getAgentDirForCreation(agentId: string, agentName?: string): string | null {
  const base = config.openclawStateDir
  const workspaceDir = config.openclawHome || path.join(base || '', 'workspace')
  if (!base) return null
  const normalizedId = agentId
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '')
  if (!normalizedId) return null
  return path.join(workspaceDir, 'agents', normalizedId)
}

export interface EnsureAgentIdentityOptions {
  /** Project slug for structure log and optional IDENTITY frontmatter */
  project?: string
  /** Purpose for structure log entry */
  purpose?: string
  /** Authorized by (username) for structure log */
  authorizedBy?: string
  /** Optional hierarchy metadata for IDENTITY.md frontmatter */
  hierarchy?: { project?: string; reports_to?: string; authority_level?: string }
}

/**
 * Ensure IDENTITY.md and SOUL.md exist for an agent.
 * Creates the agent directory and writes starter templates if files do not exist.
 * When project is provided and files are created, appends to BRAIN/projects/<project>/logs/structure.md.
 */
export function ensureAgentIdentityAndSoul(
  agentId: string,
  agentName: string,
  role: string,
  purpose?: string,
  options?: EnsureAgentIdentityOptions
): { identityPath: string | null; soulPath: string | null } {
  const dir = getAgentDirForCreation(agentId, agentName)
  if (!dir) {
    logger.warn({ agentId }, `${LOG_PREFIX} cannot ensure docs: OpenClaw dir not configured`)
    return { identityPath: null, soulPath: null }
  }

  const identityPath = path.join(dir, 'IDENTITY.md')
  const soulPath = path.join(dir, 'SOUL.md')

  let createdIdentity = false
  let createdSoul = false

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    logger.info({ agentId, dir }, `${LOG_PREFIX} created agent directory`)
  }

  const hierarchy = options?.hierarchy ?? (options?.project ? { project: options.project } : undefined)

  if (!fs.existsSync(identityPath)) {
    const content = DEFAULT_IDENTITY_TEMPLATE(
      agentName,
      role,
      purpose || 'Support project goals and collaborate with the team',
      hierarchy
    )
    fs.writeFileSync(identityPath, content, 'utf-8')
    createdIdentity = true
    logger.info({ agentId, identityPath }, `${LOG_PREFIX} generated IDENTITY.md`)
  }

  if (!fs.existsSync(soulPath)) {
    fs.writeFileSync(soulPath, DEFAULT_SOUL_TEMPLATE, 'utf-8')
    createdSoul = true
    logger.info({ agentId, soulPath }, `${LOG_PREFIX} generated SOUL.md`)
  }

  // Append to structure log when project provided (agent creation audit)
  const projectSlug = options?.project?.trim()
  if (projectSlug && /^[a-z0-9-_]+$/.test(projectSlug)) {
    try {
      const logPurpose = options?.purpose || purpose || 'Created via Mission Control'
      const entry = `Created ${agentName}\nPurpose: ${logPurpose}\nAuthorized by: ${options?.authorizedBy || 'system'}`
      appendStructureLog(projectSlug, entry)
      logger.info({ agentId, projectSlug }, `${LOG_PREFIX} appended structure log`)
    } catch (structureErr: any) {
      logger.warn({ err: structureErr, agentId, projectSlug }, `${LOG_PREFIX} failed to append structure log`)
    }
  }

  return {
    identityPath: createdIdentity ? identityPath : null,
    soulPath: createdSoul ? soulPath : null,
  }
}
