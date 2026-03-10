/**
 * Parse IDENTITY.md Markdown into a structured identity object.
 * Supports the canonical format with key-value list and responsibilities.
 * Also handles YAML front-matter for compatibility with existing files.
 */

import { extractFrontmatter } from './markdown-frontmatter'

export interface ParsedIdentity {
  name: string
  role: string
  owner: string
  purpose: string
  tone: string
  emoji: string
  responsibilities: string[]
}

const EMPTY: ParsedIdentity = {
  name: '',
  role: '',
  owner: '',
  purpose: '',
  tone: '',
  emoji: '',
  responsibilities: [],
}

/** Match list items like "- **Name:** value" or "- **Personality Tone:** value" */
const KV_RE = /^-\s*\*\*([^*]+):\*\*\s*(.*)$/

const KEY_ALIASES: Record<string, keyof ParsedIdentity> = {
  name: 'name',
  role: 'role',
  owner: 'owner',
  purpose: 'purpose',
  'personality tone': 'tone',
  tone: 'tone',
  emoji: 'emoji',
}

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function setField(obj: ParsedIdentity, key: string, value: string): void {
  const k = normalizeKey(key)
  const field = KEY_ALIASES[k]
  if (field && value !== undefined) {
    ;(obj as unknown as Record<string, string | string[]>)[field] = value.trim()
  }
}

/**
 * Parse the canonical list format:
 * - **Name:** Sampson
 * - **Role:** AI Assistant
 * etc.
 */
function parseListFormat(lines: string[], obj: ParsedIdentity): void {
  for (const line of lines) {
    const m = line.match(KV_RE)
    if (m) {
      const key = m[1].trim()
      const value = (m[2] || '').trim()
      setField(obj, key, value)
    }
  }
}

/** Match simple key: value lines (theme:, emoji:, etc.) */
const SIMPLE_KV_RE = /^(\w[\w_-]*):\s*(.*)$/

/**
 * Parse simple key:value lines (e.g. theme: x, emoji: x) for legacy format.
 */
function parseSimpleKv(lines: string[], obj: ParsedIdentity): void {
  for (const line of lines) {
    const m = line.match(SIMPLE_KV_RE)
    if (m) {
      const k = m[1].toLowerCase()
      const v = (m[2] || '').trim()
      if (k === 'name') obj.name = v
      else if (k === 'role' || k === 'theme') obj.role = obj.role || v
      else if (k === 'owner') obj.owner = v
      else if (k === 'purpose') obj.purpose = v
      else if (k === 'tone' || k === 'personality_tone') obj.tone = v
      else if (k === 'emoji') obj.emoji = v
    }
  }
}

/**
 * Extract first # heading as name if name is empty.
 */
function parseFirstHeading(lines: string[], obj: ParsedIdentity): void {
  if (obj.name) return
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/)
    if (m) {
      obj.name = m[1].trim()
      break
    }
  }
}

/**
 * Map frontmatter object to ParsedIdentity fields.
 */
function applyFrontmatter(fm: Record<string, string>, obj: ParsedIdentity): void {
  const v = (k: string) => fm[k]
  if (v('name')) obj.name = v('name')!
  if (v('role')) obj.role = v('role')!
  if (v('owner')) obj.owner = v('owner')!
  if (v('purpose')) obj.purpose = v('purpose')!
  if (v('tone') || v('personality_tone')) obj.tone = v('tone') || v('personality_tone') || ''
  if (v('emoji')) obj.emoji = v('emoji')!
}

/**
 * Extract responsibilities from "## Responsibilities" section.
 * Collects list items (- item) until next ## or end.
 */
function parseResponsibilities(lines: string[]): string[] {
  const items: string[] = []
  let inSection = false
  for (const line of lines) {
    if (/^##\s+/i.test(line)) {
      if (/^##\s+Responsibilities/i.test(line)) {
        inSection = true
      } else {
        inSection = false
      }
      continue
    }
    if (inSection) {
      const m = line.match(/^-\s+(.+)$/)
      if (m) items.push(m[1].trim())
    }
  }
  return items
}

/**
 * Parse IDENTITY.md markdown into a structured identity object.
 */
export function parseIdentityMarkdown(markdown: string | null | undefined): ParsedIdentity {
  if (!markdown || typeof markdown !== 'string') return { ...EMPTY }

  const result: ParsedIdentity = { ...EMPTY }
  const { frontmatter, body } = extractFrontmatter(markdown)
  applyFrontmatter(frontmatter, result)
  const bodyLines = body.split(/\r?\n/)
  const lines = markdown.split(/\r?\n/)

  // Parse list-format key-values from body
  parseListFormat(bodyLines, result)
  // Parse simple key:value for legacy format (theme:, emoji:, etc.)
  parseSimpleKv(bodyLines, result)
  // Use first # heading as name if not set
  parseFirstHeading(bodyLines, result)

  // Extract responsibilities
  result.responsibilities = parseResponsibilities(lines)

  return result
}
