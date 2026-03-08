/**
 * Generate USER.md Markdown from a structured user profile object.
 * Produces the canonical format used by agents (especially Sampson) to understand the owner.
 */

export interface UserData {
  name?: string
  role?: string
  authorityLevel?: string
  primaryAgent?: string

  tone?: string
  interactionStyle?: string
  decisionStyle?: string

  operationalPreferences?: string
  notes?: string
}

/**
 * Generate USER.md in the canonical format.
 */
export function generateUserMarkdown(user: UserData): string {
  const name = String(user.name ?? '').trim()
  const role = String(user.role ?? '').trim()
  const authorityLevel = String(user.authorityLevel ?? '').trim()
  const primaryAgent = String(user.primaryAgent ?? '').trim()

  const tone = String(user.tone ?? '').trim()
  const interactionStyle = String(user.interactionStyle ?? '').trim()
  const decisionStyle = String(user.decisionStyle ?? '').trim()

  const operationalPreferences = String(user.operationalPreferences ?? '').trim()
  const notes = String(user.notes ?? '').trim()

  const lines: string[] = [
    '# USER.md — System Owner',
    '',
    '- **Name:** ' + name,
    '- **Role:** ' + role,
    '- **Authority Level:** ' + authorityLevel,
    '- **Primary Agent:** ' + primaryAgent,
    '',
    '---',
    '',
    '## Communication Preferences',
    '',
  ]

  if (tone) lines.push('- Tone: ' + tone)
  if (decisionStyle) lines.push('- Decision Style: ' + decisionStyle)
  if (interactionStyle) lines.push('- Interaction Style: ' + interactionStyle)
  if (!tone && !decisionStyle && !interactionStyle) {
    lines.push('')
  }

  lines.push('', '---', '', '## Operational Preferences', '')

  for (const line of operationalPreferences.split(/\r?\n/)) {
    const t = line.trim()
    if (t) lines.push('- ' + t)
  }
  if (!operationalPreferences) lines.push('')

  lines.push('', '---', '', '## Notes', '')

  if (notes) {
    for (const line of notes.split(/\r?\n/)) {
      lines.push(line || '')
    }
  }

  return lines.join('\n')
}
