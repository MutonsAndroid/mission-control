/**
 * Generate IDENTITY.md Markdown from a structured identity object.
 * Produces the canonical format used by the identity editor.
 */

export interface IdentityData {
  name?: string
  role?: string
  owner?: string
  purpose?: string
  tone?: string
  emoji?: string
  responsibilities?: string[]
  project?: string
  reports_to?: string
  authority_level?: string
}

export interface IdentityFrontmatterOptions {
  project?: string
  reports_to?: string
  authority_level?: string
}

/**
 * Generate IDENTITY.md in the canonical format.
 * Optionally prepends YAML frontmatter when frontmatter options are provided.
 */
export function generateIdentityMarkdown(
  identity: IdentityData,
  frontmatter?: IdentityFrontmatterOptions
): string {
  const name = String(identity.name ?? '').trim()
  const role = String(identity.role ?? '').trim()
  const owner = String(identity.owner ?? '').trim()
  const purpose = String(identity.purpose ?? '').trim()
  const tone = String(identity.tone ?? '').trim()
  const emoji = String(identity.emoji ?? '').trim()
  const responsibilities = Array.isArray(identity.responsibilities)
    ? identity.responsibilities.filter((r) => String(r).trim())
    : []

  const fm = frontmatter ?? {
    ...(identity.project && { project: identity.project }),
    ...(identity.reports_to && { reports_to: identity.reports_to }),
    ...(identity.authority_level && { authority_level: identity.authority_level }),
  }
  const hasFm = fm && (fm.project || fm.reports_to || fm.authority_level)

  const lines: string[] = []
  if (hasFm) {
    lines.push('---')
    if (fm.project) lines.push(`project: ${fm.project}`)
    if (fm.reports_to) lines.push(`reports_to: ${fm.reports_to}`)
    if (fm.authority_level) lines.push(`authority_level: ${fm.authority_level}`)
    lines.push('---', '')
  }
  lines.push(
    '# IDENTITY.md — Who Am I?',
    '',
    `- **Name:** ${name}`,
    `- **Role:** ${role}`,
    `- **Owner:** ${owner}`,
    `- **Purpose:** ${purpose}`,
    `- **Personality Tone:** ${tone}`,
    `- **Emoji:** ${emoji}`,
    '',
    '---',
    '',
    '## Responsibilities',
    ''
  )

  for (const r of responsibilities) {
    lines.push(`- ${r.trim()}`)
  }

  if (responsibilities.length === 0) {
    lines.push('')
  }

  return lines.join('\n')
}
