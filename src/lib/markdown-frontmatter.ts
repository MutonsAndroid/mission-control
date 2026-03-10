/**
 * Shared frontmatter extraction for Markdown files.
 * Used by: IDENTITY.md, SOUL.md, BRAIN/_portfolio/protocols/*.md
 * Domain-specific parsers filter for the keys they care about.
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

/**
 * Extract YAML-style frontmatter from Markdown content.
 * Parses `key: value` lines into an object; returns the remaining body separately.
 */
export function extractFrontmatter(content: string): {
  frontmatter: Record<string, string>
  body: string
} {
  if (!content || typeof content !== 'string') {
    return { frontmatter: {}, body: content ?? '' }
  }

  const m = content.match(FRONTMATTER_RE)
  if (!m) {
    return { frontmatter: {}, body: content }
  }

  const yaml = m[1]
  const body = m[2]
  const frontmatter: Record<string, string> = {}

  for (const line of yaml.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) frontmatter[key] = value
  }

  return { frontmatter, body }
}
