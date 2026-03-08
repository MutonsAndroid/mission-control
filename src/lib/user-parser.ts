/**
 * Parse USER.md Markdown into a structured user profile object.
 * Supports the canonical format used by agents (especially Sampson) to understand the owner.
 */

export interface ParsedUser {
  name: string
  role: string
  authorityLevel: string
  primaryAgent: string

  tone: string
  interactionStyle: string
  decisionStyle: string

  operationalPreferences: string
  notes: string
}

const EMPTY: ParsedUser = {
  name: '',
  role: '',
  authorityLevel: '',
  primaryAgent: '',

  tone: '',
  interactionStyle: '',
  decisionStyle: '',

  operationalPreferences: '',
  notes: '',
}

const KV_RE = /^-\s*\*\*([^*]+):\*\*\s*(.*)$/
const SECTION_RE = /^##\s+(.+)$/

const KEY_ALIASES: Record<string, keyof ParsedUser> = {
  name: 'name',
  role: 'role',
  'authority level': 'authorityLevel',
  authorityLevel: 'authorityLevel',
  'primary agent': 'primaryAgent',
  primaryAgent: 'primaryAgent',
  tone: 'tone',
  'communication tone': 'tone',
  'interaction style': 'interactionStyle',
  interactionStyle: 'interactionStyle',
  'decision style': 'decisionStyle',
  decisionStyle: 'decisionStyle',
}

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function setField(obj: ParsedUser, key: string, value: string): void {
  const k = normalizeKey(key)
  const field = KEY_ALIASES[k]
  if (field && value !== undefined) {
    ;(obj as unknown as Record<string, string>)[field] = value.trim()
  }
}

function parseListFormat(lines: string[], obj: ParsedUser): void {
  for (const line of lines) {
    const m = line.match(KV_RE)
    if (m) {
      const key = m[1].trim()
      const value = (m[2] || '').trim()
      setField(obj, key, value)
    }
  }
}

const SIMPLE_KV_RE = /^-\s*([^:]+):\s*(.*)$/

function extractSection(lines: string[], sectionTitle: string): string[] {
  const items: string[] = []
  let inSection = false
  for (const line of lines) {
    const sectionMatch = line.match(SECTION_RE)
    if (sectionMatch) {
      const title = sectionMatch[1].trim().toLowerCase()
      if (title.includes(sectionTitle.toLowerCase())) {
        inSection = true
      } else {
        inSection = false
      }
      continue
    }
    if (inSection) {
      const kv = line.match(KV_RE)
      if (kv) {
        items.push(`${kv[1].trim()}: ${kv[2]}`)
      } else {
        const simple = line.match(SIMPLE_KV_RE)
        if (simple) {
          items.push(`${simple[1].trim()}: ${simple[2].trim()}`)
        } else {
          const trimmed = line.replace(/^-\s*/, '').trim()
          if (trimmed) items.push(trimmed)
        }
      }
    }
  }
  return items
}

function extractNotes(lines: string[]): string {
  const lines2: string[] = []
  let inNotes = false
  for (const line of lines) {
    const sectionMatch = line.match(SECTION_RE)
    if (sectionMatch) {
      const title = sectionMatch[1].trim().toLowerCase()
      if (title.includes('notes')) {
        inNotes = true
      } else {
        inNotes = false
      }
      continue
    }
    if (inNotes) {
      lines2.push(line)
    }
  }
  return lines2.join('\n').trim()
}

/**
 * Parse USER.md markdown into a structured user profile object.
 */
export function parseUserMarkdown(markdown: string | null | undefined): ParsedUser {
  if (!markdown || typeof markdown !== 'string') return { ...EMPTY }

  const result: ParsedUser = { ...EMPTY }
  const lines = markdown.split(/\r?\n/)

  // Parse core identity list (before first ##)
  const beforeFirstSection: string[] = []
  for (const line of lines) {
    if (line.match(SECTION_RE)) break
    beforeFirstSection.push(line)
  }
  parseListFormat(beforeFirstSection, result)

  // Communication Preferences section → tone, interactionStyle, decisionStyle
  const commItems = extractSection(lines, 'communication')
  for (const item of commItems) {
    const colon = item.indexOf(':')
    if (colon >= 0) {
      const k = normalizeKey(item.slice(0, colon))
      const v = item.slice(colon + 1).trim()
      if (k.includes('tone')) result.tone = v
      else if (k.includes('interaction')) result.interactionStyle = v
      else if (k.includes('decision')) result.decisionStyle = v
    }
  }

  // Operational Preferences section
  const opItems = extractSection(lines, 'operational')
  result.operationalPreferences = opItems.join('\n')

  // Notes section
  result.notes = extractNotes(lines)

  return result
}
