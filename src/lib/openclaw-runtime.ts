/**
 * OpenClaw Runtime Agent Discovery
 *
 * Discovers agents from the OpenClaw runtime (gateway/fs) rather than config.
 * Used as primary source; openclaw.json is fallback.
 */

import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'
import { readGatewayAuthToken } from './openclaw-config'
import { getAgentLiveStatuses } from './sessions'
import { logger } from './logger'

export interface RuntimeAgent {
  id: string
  name: string
  status: string
}

const DISCOVERY_LOG_PREFIX = '[AgentDiscovery]'

/**
 * Parse display name from identity.md content
 */
function parseNameFromIdentity(content: string): string | null {
  if (!content?.trim()) return null
  const firstLine = content.split('\n')[0]?.trim() || ''
  const nameMatch = firstLine.match(/^#+\s*(.+)$/) || firstLine.match(/^([^#\n]+)$/)
  return nameMatch?.[1]?.trim() || null
}

/**
 * Discover agents from the OpenClaw runtime filesystem.
 * Agents are stored at {OPENCLAW_STATE_DIR}/agents/{agentId}/
 * This reflects agents created in the OpenClaw UI or CLI.
 */
function discoverAgentsFromFilesystem(): RuntimeAgent[] {
  const openclawStateDir = config.openclawStateDir
  if (!openclawStateDir) return []

  const agentsDir = path.join(openclawStateDir, 'agents')
  if (!fs.existsSync(agentsDir)) return []

  let entries: string[]
  try {
    entries = fs.readdirSync(agentsDir)
  } catch {
    return []
  }

  const liveStatuses = getAgentLiveStatuses()
  const agents: RuntimeAgent[] = []

  for (const id of entries) {
    const agentPath = path.join(agentsDir, id)
    try {
      const stat = fs.statSync(agentPath)
      if (!stat.isDirectory()) continue
      // Skip hidden/system dirs
      if (id.startsWith('.')) continue

      let name = id
      // Try identity.md in workspace (workspaces/{id} or workspace)
      const workspacePaths = [
        path.join(openclawStateDir, 'workspaces', id),
        path.join(openclawStateDir, 'workspace'),
      ]
      for (const wsp of workspacePaths) {
        const identityPath = path.join(wsp, 'identity.md')
        try {
          if (fs.existsSync(identityPath)) {
            const content = fs.readFileSync(identityPath, 'utf-8')
            const parsed = parseNameFromIdentity(content)
            if (parsed) {
              name = parsed
              break
            }
          }
        } catch {
          // continue
        }
      }
      // Fallback: humanize id (sampson -> Sampson)
      if (name === id && id.length > 0) {
        name = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')
      }

      const statusInfo = liveStatuses.get(id)
      const status = statusInfo?.status ?? 'offline'

      agents.push({ id, name, status })
    } catch {
      // Skip unreadable entries
    }
  }

  return agents
}

/**
 * Try to fetch agents from the OpenClaw gateway via HTTP.
 * Returns agents if the gateway responds with a valid list; null on failure.
 */
async function discoverAgentsFromGateway(): Promise<RuntimeAgent[] | null> {
  const host = config.gatewayHost || '127.0.0.1'
  const port = config.gatewayPort || 18789
  const token = readGatewayAuthToken()
  const baseUrl = `http://${host}:${port}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Try common gateway HTTP paths
  const endpoints = ['/v1/agents', '/agents', '/api/agents', '/']
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) continue

      const data = await res.json()
      if (Array.isArray(data)) {
        return data
          .filter((a: any) => a && (a.id || a.name))
          .map((a: any) => ({
            id: String(a.id ?? a.name ?? ''),
            name: String(a.name ?? a.id ?? ''),
            status: String(a.status ?? 'offline'),
          }))
      }
      if (data?.agents && Array.isArray(data.agents)) {
        return data.agents
          .filter((a: any) => a && (a.id || a.name))
          .map((a: any) => ({
            id: String(a.id ?? a.name ?? ''),
            name: String(a.name ?? a.id ?? ''),
            status: String(a.status ?? 'offline'),
          }))
      }
    } catch {
      // Endpoint not available or invalid response
    }
  }

  return null
}

/**
 * Discover agents from the OpenClaw runtime.
 * Priority: 1) Gateway HTTP, 2) Filesystem (agents dir).
 *
 * Returns array of { id, name, status }.
 */
export async function discoverRuntimeAgents(): Promise<{
  agents: RuntimeAgent[]
  source: 'gateway' | 'filesystem'
  gatewayReachable: boolean
}> {
  // Try gateway first
  const gatewayAgents = await discoverAgentsFromGateway()
  if (gatewayAgents && gatewayAgents.length > 0) {
    logger.info(
      { count: gatewayAgents.length, names: gatewayAgents.map((a) => a.name) },
      `${DISCOVERY_LOG_PREFIX} runtime agents detected from gateway: ${gatewayAgents.length}`
    )
    return {
      agents: gatewayAgents,
      source: 'gateway',
      gatewayReachable: true,
    }
  }

  // Fallback to filesystem (runtime agent dirs)
  const fsAgents = discoverAgentsFromFilesystem()
  if (fsAgents.length > 0) {
    logger.info(
      { count: fsAgents.length, names: fsAgents.map((a) => a.name) },
      `${DISCOVERY_LOG_PREFIX} runtime agents detected from filesystem: ${fsAgents.length}`
    )
    return {
      agents: fsAgents,
      source: 'filesystem',
      gatewayReachable: false,
    }
  }

  return {
    agents: [],
    source: 'filesystem',
    gatewayReachable: false,
  }
}
