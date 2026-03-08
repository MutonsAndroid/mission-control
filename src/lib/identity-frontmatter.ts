/**
 * Parse IDENTITY.md front-matter for project binding and hierarchy.
 * Safeguards: project (required for isolation), reports_to (for hierarchy fallback).
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

export interface IdentityFrontmatter {
  project?: string
  reports_to?: string
}

/**
 * Extract YAML front-matter from Markdown content.
 * Returns { project, reports_to } or empty object if missing/parse error.
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
  }

  return result
}
