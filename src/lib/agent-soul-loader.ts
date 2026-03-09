/**
 * Agent Soul Loader
 *
 * Reads agents/<agent-id>/SOUL.md.
 * Content populates the Soul tab of the agent interface.
 * SOUL.md defines the agent's behavioral framework and internal reasoning style.
 */

import { loadAgentDocs } from './agent-docs'
import { logger } from './logger'

const LOG_PREFIX = '[AgentSoulLoader]'

/**
 * Load SOUL.md content for an agent.
 * Uses agentId (kebab-case) and optionally agentName for directory resolution.
 *
 * @returns Raw SOUL.md content, or null if the file is missing
 */
export function loadAgentSoul(agentId: string, agentName?: string): string | null {
  const docs = loadAgentDocs(agentId, agentName)
  const content = docs.soul ?? null
  if (content) {
    logger.debug({ agentId, length: content.length }, `${LOG_PREFIX} loaded`)
  }
  return content
}
