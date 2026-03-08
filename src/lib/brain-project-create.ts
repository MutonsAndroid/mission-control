/**
 * Create a new BRAIN project and Project Manager agent.
 * Canonical structure per OpenClaw governance.
 */

import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { appendStructureLog } from '@/lib/brain-io'
import { addAgentToHierarchy } from '@/lib/hierarchy-write'
import { logger } from '@/lib/logger'

export interface CreateProjectInput {
  name: string
  mission: string
  initialAgentCount?: number
  projectManagerModel?: string
  notes?: string
}

export interface CreateProjectResult {
  slug: string
  projectDir: string
  pmId: string
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project'
}

/**
 * Create BRAIN/projects/<slug>/ with PROJECT.md, TASKS.md, logs/structure.md, protocols/
 */
export function createProjectStructure(
  slug: string,
  name: string,
  mission: string,
  notes?: string
): string {
  const paths = locateOpenClawInstall()
  if (!paths?.brainProjectsDir) {
    throw new Error('OpenClaw BRAIN not configured')
  }

  const projectDir = path.join(paths.brainProjectsDir, slug)
  if (fs.existsSync(projectDir)) {
    throw new Error(`Project "${slug}" already exists`)
  }

  fs.mkdirSync(projectDir, { recursive: true })

  const projectMd = `# ${name}

${mission}
${notes ? `\n## Notes\n${notes}` : ''}
`

  const tasksMd = `# Tasks

`
  fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), projectMd, 'utf-8')
  fs.writeFileSync(path.join(projectDir, 'TASKS.md'), tasksMd, 'utf-8')

  const logsDir = path.join(projectDir, 'logs')
  fs.mkdirSync(logsDir, { recursive: true })
  const structureLog = ''
  fs.writeFileSync(path.join(logsDir, 'structure.md'), structureLog, 'utf-8')

  const protocolsDir = path.join(projectDir, 'protocols')
  fs.mkdirSync(protocolsDir, { recursive: true })

  logger.info({ slug, projectDir }, '[brain-project-create] Created project structure')
  return projectDir
}

/**
 * Create Project Manager agent at agents/<slug>-pm/ with IDENTITY.md and SOUL.md
 */
export function createProjectManagerAgent(
  slug: string,
  name: string,
  model?: string,
  authorizedBy?: string
): string {
  const paths = locateOpenClawInstall()
  if (!paths?.agentsDir) {
    throw new Error('OpenClaw agents dir not configured')
  }

  const pmId = `${slug}-pm`
  const agentDir = path.join(paths.agentsDir, pmId)
  if (fs.existsSync(agentDir)) {
    throw new Error(`Project Manager "${pmId}" already exists`)
  }

  fs.mkdirSync(agentDir, { recursive: true })

  const identityMd = `---
name: ${name} (PM)
role: Project Manager
project: ${slug}
reports_to: sampson
authority_level: manager
---

# ${name} — Project Manager

Manages the ${name} project. Reports to Sampson.
`

  const soulMd = `# Soul

Project Manager for ${name}. Coordinate tasks, delegate to sub-agents, report to Sampson.
`

  fs.writeFileSync(path.join(agentDir, 'IDENTITY.md'), identityMd, 'utf-8')
  fs.writeFileSync(path.join(agentDir, 'SOUL.md'), soulMd, 'utf-8')

  addAgentToHierarchy(pmId, 'sampson')

  const entry = `Created Project Manager\nProject: ${slug}\nAuthorized by: ${authorizedBy || 'Sampson'}`
  appendStructureLog(slug, entry)

  logger.info({ pmId, slug }, '[brain-project-create] Created Project Manager agent')
  return pmId
}

/**
 * Full project creation: structure + PM agent.
 */
export function createProject(
  input: CreateProjectInput,
  authorizedBy?: string
): CreateProjectResult {
  const slug = slugFromName(input.name)
  createProjectStructure(slug, input.name, input.mission, input.notes)
  const pmId = createProjectManagerAgent(
    slug,
    input.name,
    input.projectManagerModel,
    authorizedBy
  )
  return { slug, projectDir: path.join(locateOpenClawInstall()!.brainProjectsDir, slug), pmId }
}
