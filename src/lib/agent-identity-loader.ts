/**
 * Agent Identity Loader
 *
 * Reads and parses agents/<agent-id>/IDENTITY.md.
 * Returns normalized metadata for propagation throughout the system.
 * IDENTITY.md is the source of truth; it overrides database fields.
 */

import { loadAgentDocs } from './agent-docs'
import { parseIdentityMarkdown } from './identity-parser'
import { parseIdentityFrontmatter } from './identity-frontmatter'
import { logger } from './logger'

const LOG_PREFIX = '[AgentIdentityLoader]'

export interface AgentIdentityMetadata {
  id: string
  name: string
  role: string
  owner: string
  purpose: string
  tone: string
  emoji: string
  responsibilities: string[]
  /** Governance hierarchy: project slug, reports_to agent id, authority_level */
  project?: string
  reports_to?: string
  authority_level?: string
}

/**
 * Load and parse IDENTITY.md for an agent.
 * Uses agentId (kebab-case) and optionally agentName for directory resolution.
 *
 * @returns Normalized metadata, or null if IDENTITY.md is missing
 */
export function loadAgentIdentity(
  agentId: string,
  agentName?: string
): AgentIdentityMetadata | null {
  const docs = loadAgentDocs(agentId, agentName)
  const content = docs.identity
  if (!content) {
    return null
  }

  const parsed = parseIdentityMarkdown(content)
  const fm = parseIdentityFrontmatter(content)
  const normalizedId = agentId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const name = (parsed.name || '').trim()
  const role = (parsed.role || '').trim()

  // Reject placeholder names like "IDENTITY.md - Who Am I?" — treat as empty
  const isPlaceholderName =
    !name ||
    /^identity\.md\s*[-—]\s*who am i\?$/i.test(name) ||
    /^#\s*identity/i.test(name)

  const metadata: AgentIdentityMetadata = {
    id: normalizedId,
    name: isPlaceholderName ? '' : name,
    role: role || '',
    owner: (parsed.owner || '').trim(),
    purpose: (parsed.purpose || '').trim(),
    tone: (parsed.tone || '').trim(),
    emoji: (parsed.emoji || '').trim(),
    responsibilities: Array.isArray(parsed.responsibilities)
      ? parsed.responsibilities.filter((r) => String(r).trim())
      : [],
    ...(fm.project?.trim() && { project: fm.project.trim() }),
    ...(fm.reports_to?.trim() && { reports_to: fm.reports_to.trim() }),
    ...(fm.authority_level?.trim() && { authority_level: fm.authority_level.trim() }),
  }

  logger.debug({ agentId, name: metadata.name, role: metadata.role }, `${LOG_PREFIX} loaded`)
  return metadata
}
