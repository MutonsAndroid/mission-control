/**
 * Agent Enrichment
 *
 * Merges IDENTITY.md and SOUL.md into agent objects.
 * When identity/soul files exist, they override database fields.
 * Markdown is the authority.
 */

import { loadAgentIdentity } from './agent-markdown'
import { loadAgentSoul } from './agent-soul-loader'

export interface EnrichedAgent {
  /** From IDENTITY.md or fallback to DB */
  name: string
  /** From IDENTITY.md or fallback to DB */
  role: string
  /** From IDENTITY.md purpose */
  description?: string
  /** From IDENTITY.md emoji */
  avatarEmoji?: string
  /** From IDENTITY.md owner */
  owner?: string
  /** Filesystem/OpenClaw agent ID for API lookups (e.g. /api/brain/agents/:id) */
  agentId?: string
  /** Governance: project slug (from IDENTITY.md frontmatter) */
  project?: string
  /** Governance: reports to agent id (from IDENTITY.md frontmatter) */
  reports_to?: string
  /** Governance: authority level (from IDENTITY.md frontmatter) */
  authority_level?: string
  /** Parsed identity metadata (when IDENTITY.md exists) */
  identity?: {
    name: string
    role: string
    owner: string
    purpose: string
    tone: string
    emoji: string
    responsibilities: string[]
    project?: string
    reports_to?: string
    authority_level?: string
  }
  /** SOUL content from SOUL.md (preferred over soul_content when present) */
  soul_content?: string | null
}

function getAgentFsId(agent: { name: string; config?: any }): string {
  const cfg = agent.config
  if (cfg && typeof cfg.openclawId === 'string' && cfg.openclawId.trim()) {
    return cfg.openclawId
  }
  return agent.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Enrich an agent with identity and soul from IDENTITY.md and SOUL.md.
 * IDENTITY.md overrides agent.name, agent.role, etc.
 * SOUL.md overrides agent.soul_content when present.
 */
export function enrichAgentWithIdentity(agent: Record<string, unknown>): Record<string, unknown> {
  const fsId = getAgentFsId(agent as { name: string; config?: any })
  const agentName = String(agent.name || '')
  const identity = loadAgentIdentity(fsId, agentName)
  const soulContent = loadAgentSoul(fsId, agentName)

  const result = { ...agent }

  result.agentId = fsId

  if (identity) {
    if (identity.name) result.name = identity.name
    if (identity.role) result.role = identity.role
    result.owner = identity.owner
    result.description = identity.purpose
    result.avatarEmoji = identity.emoji
    result.project = identity.project
    result.reports_to = identity.reports_to
    result.authority_level = identity.authority_level
    result.identity = {
      name: identity.name,
      role: identity.role,
      owner: identity.owner,
      purpose: identity.purpose,
      tone: identity.personalityTone,
      emoji: identity.emoji,
      responsibilities: identity.responsibilities,
      ...(identity.project && { project: identity.project }),
      ...(identity.reports_to && { reports_to: identity.reports_to }),
      ...(identity.authority_level && { authority_level: identity.authority_level }),
    }
  }

  if (soulContent != null) {
    result.soul_content = soulContent
  }

  return result
}
