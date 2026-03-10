/**
 * Parse IDENTITY.md front-matter for project binding and hierarchy.
 * Required fields: project, reports_to (except for Sampson), authority_level.
 * Source of truth for hierarchy is agents/hierarchy.json; this validates IDENTITY.md consistency.
 */

import { extractFrontmatter } from './markdown-frontmatter'

export interface IdentityFrontmatter {
  project?: string
  reports_to?: string
  authority_level?: string
}

const IDENTITY_KEYS = ['project', 'reports_to', 'authority_level'] as const

/**
 * Extract YAML front-matter from Markdown content.
 * Returns { project, reports_to, authority_level } or empty object if missing/parse error.
 */
export function parseIdentityFrontmatter(content: string): IdentityFrontmatter {
  const { frontmatter } = extractFrontmatter(content)
  const result: IdentityFrontmatter = {}
  for (const k of IDENTITY_KEYS) {
    const v = frontmatter[k]
    if (v !== undefined) (result as Record<string, string>)[k] = v
  }
  return result
}

/**
 * Validate required IDENTITY.md fields for non-Sampson agents.
 * Sampson (project: "portfolio") may omit reports_to.
 * Returns { valid: boolean, missing: string[] }.
 */
export function validateIdentityFrontmatter(fm: IdentityFrontmatter, agentId: string): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!fm.project || !fm.project.trim()) missing.push('project')
  if (!fm.authority_level || !fm.authority_level.trim()) missing.push('authority_level')
  // reports_to required for all agents except Sampson (project: "portfolio")
  if (fm.project !== 'portfolio' && (!fm.reports_to || !fm.reports_to.trim())) {
    missing.push('reports_to')
  }
  return { valid: missing.length === 0, missing }
}
