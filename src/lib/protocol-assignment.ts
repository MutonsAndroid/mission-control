/**
 * Agent-to-protocol assignment.
 * Uses agents/<agent-id>/protocols.md to store assigned protocol filenames.
 * Filesystem-backed, no database.
 */

import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'
import { getAgentDirForCreation } from './agent-docs'
import { logger } from './logger'

function getAgentsDir(): string | null {
  const base = config.openclawStateDir
  const workspaceDir = config.openclawHome || (base ? path.join(base, 'workspace') : '')
  if (!workspaceDir) return null
  const dir = path.join(workspaceDir, 'agents')
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? dir : null
}

/**
 * List all agent IDs from the filesystem (agents directory subdirs).
 */
export function listAgentIdsFromFilesystem(): string[] {
  const dir = getAgentsDir()
  if (!dir) return []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

const PROTOCOLS_FILENAME = 'protocols.md'
const PROTOCOLS_HEADER = `# Assigned Protocols

`

/**
 * Get the path to an agent's protocols.md file.
 */
function getProtocolsFilePath(agentId: string): string | null {
  const dir = getAgentDirForCreation(agentId)
  if (!dir) return null
  return path.join(dir, PROTOCOLS_FILENAME)
}

/**
 * Parse protocols.md content into a list of protocol filenames.
 */
function parseProtocolsContent(content: string): string[] {
  const lines = content.split('\n')
  const protocols: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') && trimmed.endsWith('.md')) {
      const filename = trimmed.slice(2).trim()
      if (filename && !protocols.includes(filename)) {
        protocols.push(filename)
      }
    }
  }
  return protocols
}

/**
 * Serialize protocol filenames into protocols.md content.
 */
function serializeProtocols(protocols: string[]): string {
  const lines = protocols.map((p) => `- ${p}`)
  return PROTOCOLS_HEADER + (lines.length ? lines.join('\n') + '\n' : '')
}

/**
 * List protocol filenames assigned to an agent.
 */
export function getProtocolsForAgent(agentId: string): string[] {
  const filePath = getProtocolsFilePath(agentId)
  if (!filePath || !fs.existsSync(filePath)) return []
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseProtocolsContent(content)
  } catch (err) {
    logger.warn({ err, agentId }, 'getProtocolsForAgent failed')
    return []
  }
}

/**
 * Assign a protocol to an agent.
 * Creates protocols.md if needed and appends the filename if not already present.
 */
export function assignProtocol(agentId: string, protocolFilename: string): boolean {
  const dir = getAgentDirForCreation(agentId)
  if (!dir) return false
  const filePath = path.join(dir, PROTOCOLS_FILENAME)

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let protocols = getProtocolsForAgent(agentId)
    if (protocols.includes(protocolFilename)) return true // already assigned

    protocols = [...protocols, protocolFilename].sort()
    fs.writeFileSync(filePath, serializeProtocols(protocols), 'utf-8')
    return true
  } catch (err) {
    logger.error({ err, agentId, protocolFilename }, 'assignProtocol failed')
    return false
  }
}

/**
 * Unassign a protocol from an agent.
 */
export function unassignProtocol(agentId: string, protocolFilename: string): boolean {
  const filePath = getProtocolsFilePath(agentId)
  if (!filePath || !fs.existsSync(filePath)) return true // already unassigned

  try {
    const protocols = getProtocolsForAgent(agentId).filter((p) => p !== protocolFilename)
    if (protocols.length === 0) {
      fs.unlinkSync(filePath)
    } else {
      fs.writeFileSync(filePath, serializeProtocols(protocols), 'utf-8')
    }
    return true
  } catch (err) {
    logger.error({ err, agentId, protocolFilename }, 'unassignProtocol failed')
    return false
  }
}

/**
 * List agents that have a given protocol assigned.
 * Scans agents/<id>/protocols.md for mentions of the protocol filename.
 * If agentIds not provided, scans the filesystem agents directory.
 */
export function getAgentsForProtocol(
  protocolFilename: string,
  agentIds?: string[]
): string[] {
  const ids = agentIds ?? listAgentIdsFromFilesystem()
  const result: string[] = []
  for (const agentId of ids) {
    const protocols = getProtocolsForAgent(agentId)
    if (protocols.includes(protocolFilename)) {
      result.push(agentId)
    }
  }
  return result
}
