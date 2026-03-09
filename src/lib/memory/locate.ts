/**
 * Locate the OpenClaw installation and memory structure.
 * Does not modify any files.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { config } from '@/lib/config'

const CANDIDATE_ROOTS = [
  path.join(os.homedir(), '.openclaw'),
  path.join(os.homedir(), 'openclaw'),
  path.join(os.homedir(), 'OpenClaw'),
]

export interface OpenClawPaths {
  root: string
  workspace: string
  brain: string
  brainIndex: string
  brainProjectsDir: string
  brainSummariesDir: string
  brainCapabilitiesDir: string
  portfolio: string
  protocolsDir: string
  portfolioSummariesDaily: string
  portfolioEscalations: string
  portfolioExpansionRequests: string
  portfolioRecentReports: string
  summariesDaily: string
  working: string
  semanticIndex: string
  runtime: string
  activeRecall: string
  agents: string
  agentsDir: string
  hierarchyPath: string
  logsDir: string
  soul: string
  user: string
}

/**
 * Scan home directory for OpenClaw installation.
 * Returns the first candidate that contains workspace/BRAIN and governance files.
 */
export function locateOpenClawInstall(): OpenClawPaths | null {
  const explicitWorkspace =
    process.env.OPENCLAW_WORKSPACE_DIR || process.env.MISSION_CONTROL_OPENCLAW_WORKSPACE_DIR

  if (explicitWorkspace && fs.existsSync(explicitWorkspace)) {
    const workspace = path.resolve(explicitWorkspace)
    const brain = path.join(workspace, 'BRAIN')
    if (fs.existsSync(brain) && fs.statSync(brain).isDirectory()) {
      const root = path.dirname(workspace)
      return buildPaths(root, workspace)
    }
  }

  const stateDir = config.openclawStateDir
  if (stateDir) {
    const workspace = path.join(stateDir, 'workspace')
    if (fs.existsSync(workspace) && fs.statSync(workspace).isDirectory()) {
      const brain = path.join(workspace, 'BRAIN')
      if (fs.existsSync(brain) && fs.statSync(brain).isDirectory()) {
        return buildPaths(stateDir, workspace)
      }
    }
  }

  for (const root of CANDIDATE_ROOTS) {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue
    const workspace = path.join(root, 'workspace')
    if (!fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) continue
    const brain = path.join(workspace, 'BRAIN')
    if (!fs.existsSync(brain) || !fs.statSync(brain).isDirectory()) continue
    return buildPaths(root, workspace)
  }

  return null
}

function buildPaths(root: string, workspace: string): OpenClawPaths {
  const brain = path.join(workspace, 'BRAIN')
  const portfolio = path.join(brain, '_portfolio')
  const agentsDir = path.join(workspace, 'agents')
  return {
    root,
    workspace,
    brain,
    brainIndex: path.join(brain, 'index.md'),
    brainProjectsDir: path.join(brain, 'projects'),
    brainSummariesDir: path.join(brain, 'summaries'),
    brainCapabilitiesDir: path.join(brain, 'capabilities'),
    portfolio,
    protocolsDir: path.join(portfolio, 'protocols'),
    portfolioSummariesDaily: path.join(portfolio, 'summaries', 'daily'),
    portfolioEscalations: path.join(portfolio, 'escalations.md'),
    portfolioExpansionRequests: path.join(portfolio, 'expansion-requests.md'),
    portfolioRecentReports: path.join(portfolio, 'recent-reports.md'),
    summariesDaily: path.join(brain, 'summaries', 'daily'),
    working: path.join(brain, 'working'),
    semanticIndex: path.join(portfolio, 'semantic-index'),
    runtime: path.join(portfolio, 'runtime'),
    activeRecall: path.join(portfolio, 'runtime', 'active-recall.md'),
    agents: path.join(workspace, 'AGENTS.md'),
    agentsDir,
    hierarchyPath: path.join(agentsDir, 'hierarchy.json'),
    logsDir: path.join(workspace, 'logs'),
    soul: path.join(workspace, 'SOUL.md'),
    user: path.join(workspace, 'USER.md'),
  }
}
