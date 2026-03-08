/**
 * Parse IDENTITY.md front-matter for project binding and hierarchy.
 * Required fields: project, reports_to (except for Sampson), authority_level.
 * Source of truth for hierarchy is agents/hierarchy.json; this validates IDENTITY.md consistency.
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

export interface IdentityFrontmatter {
  project?: string
  reports_to?: string
  authority_level?: string
}

/**
 * Extract YAML front-matter from Markdown content.
 * Returns { project, reports_to, authority_level } or empty object if missing/parse error.
 */
export function parseIdentityFrontmatter(content: string): IdentityFrontmatter {
  if (!content || typeof content !== 'string') return {}

  const m = content.match(FRONTMATTER_RE)
  if (!m) return {}

  const yaml = m[1]
  const result: IdentityFrontmatter = {}

  for (const line of yaml.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key === 'project') result.project = value
    if (key === 'reports_to') result.reports_to = value
    if (key === 'authority_level') result.authority_level = value
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
