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
}

/**
 * Generate IDENTITY.md in the canonical format.
 */
export function generateIdentityMarkdown(identity: IdentityData): string {
  const name = String(identity.name ?? '').trim()
  const role = String(identity.role ?? '').trim()
  const owner = String(identity.owner ?? '').trim()
  const purpose = String(identity.purpose ?? '').trim()
  const tone = String(identity.tone ?? '').trim()
  const emoji = String(identity.emoji ?? '').trim()
  const responsibilities = Array.isArray(identity.responsibilities)
    ? identity.responsibilities.filter((r) => String(r).trim())
    : []

  const lines: string[] = [
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
    '',
  ]

  for (const r of responsibilities) {
    lines.push(`- ${r.trim()}`)
  }

  if (responsibilities.length === 0) {
    lines.push('')
  }

  return lines.join('\n')
}
