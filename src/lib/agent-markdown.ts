/**
 * Agent Markdown Loader + Parser
 *
 * Single source of truth: IDENTITY.md and SOUL.md.
 * Parses Markdown into structured objects; always returns rawMarkdown for the Markdown view.
 */

import { loadAgentDocs } from './agent-docs'
import { parseIdentityMarkdown } from './identity-parser'
import { parseIdentityFrontmatter } from './identity-frontmatter'
import type { ParsedIdentity } from './identity-parser'

export interface StructuredIdentity {
  name: string
  role: string
  owner: string
  purpose: string
  personalityTone: string
  emoji: string
  responsibilities: string[]
  /** Governance from frontmatter */
  project?: string
  reports_to?: string
  authority_level?: string
  rawMarkdown: string
}

export interface StructuredSoul {
  philosophy: string
  operatingModel: string
  reasoningStyle: string
  communicationStyle: string
  directives: string[]
  rawMarkdown: string
}

/**
 * Extract content under a heading. Supports # Heading and ## Heading.
 * Returns the content (paragraphs, lists) until the next heading of same or higher level.
 */
function extractSection(lines: string[], headingPattern: string): string {
  const tryLevel = (prefix: string) => {
    const re = new RegExp(`^${prefix}\\s+${headingPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    const result: string[] = []
    let inSection = false
    for (const line of lines) {
      if (new RegExp(`^${prefix}\\s+`).test(line)) {
        if (re.test(line)) {
          inSection = true
          continue
        }
        if (inSection) break
      }
      if (inSection) result.push(line)
    }
    return result.join('\n').trim()
  }
  return tryLevel('#') || tryLevel('##')
}

/**
 * Parse raw SOUL markdown string into structured sections.
 * Use when content comes from DB or other source (not from loadAgentSoul).
 */
export function parseSoulMarkdown(markdown: string | null): Omit<StructuredSoul, 'rawMarkdown'> {
  return parseSoulMarkdownInternal(markdown)
}

/** Parse directives as bullet list items under ## Directives */
function parseDirectives(lines: string[]): string[] {
  const items: string[] = []
  let inSection = false
  for (const line of lines) {
    if (/^#+\s+Directives/i.test(line)) {
      inSection = true
      continue
    }
    if (inSection && /^#+\s+/.test(line)) break
    if (inSection) {
      const m = line.match(/^-\s+(.+)$/)
      if (m) items.push(m[1].trim())
    }
  }
  return items
}

/**
 * Parse SOUL.md into structured sections.
 * Supports: # Core Philosophy, # Operating Model, # Reasoning Style, # Communication Style, # Directives
 * Also accepts ## headings and common aliases (Operating Principles -> operatingModel).
 */
function parseSoulMarkdownInternal(markdown: string | null): Omit<StructuredSoul, 'rawMarkdown'> {
  const empty = {
    philosophy: '',
    operatingModel: '',
    reasoningStyle: '',
    communicationStyle: '',
    directives: [],
  }
  if (!markdown || typeof markdown !== 'string') return empty

  const lines = markdown.split(/\r?\n/)

  const philosophy = extractSection(lines, 'Core Philosophy')
  const operatingModel =
    extractSection(lines, 'Operating Model') ||
    extractSection(lines, 'Operating Principles')
  const reasoningStyle = extractSection(lines, 'Reasoning Style')
  const communicationStyle = extractSection(lines, 'Communication Style')
  const directives = parseDirectives(lines)

  return {
    philosophy,
    operatingModel,
    reasoningStyle,
    communicationStyle,
    directives,
  }
}

/**
 * Load IDENTITY.md for an agent.
 * Returns structured data + rawMarkdown. Uses frontmatter when present.
 */
export function loadAgentIdentity(
  agentId: string,
  agentName?: string
): StructuredIdentity | null {
  const docs = loadAgentDocs(agentId, agentName)
  const content = docs.identity
  if (!content) return null

  const parsed: ParsedIdentity = parseIdentityMarkdown(content)
  const fm = parseIdentityFrontmatter(content)

  return {
    name: parsed.name ?? '',
    role: parsed.role ?? '',
    owner: parsed.owner ?? '',
    purpose: parsed.purpose ?? '',
    personalityTone: parsed.tone ?? '',
    emoji: parsed.emoji ?? '',
    responsibilities: Array.isArray(parsed.responsibilities)
      ? parsed.responsibilities.filter((r) => String(r).trim())
      : [],
    ...(fm.project?.trim() && { project: fm.project.trim() }),
    ...(fm.reports_to?.trim() && { reports_to: fm.reports_to.trim() }),
    ...(fm.authority_level?.trim() && { authority_level: fm.authority_level.trim() }),
    rawMarkdown: content,
  }
}

/**
 * Load SOUL.md for an agent.
 * Returns structured sections + rawMarkdown.
 */
export function loadAgentSoul(
  agentId: string,
  agentName?: string
): StructuredSoul | null {
  const docs = loadAgentDocs(agentId, agentName)
  const content = docs.soul ?? null
  if (content == null) return null

  const structured = parseSoulMarkdownInternal(content)
  return {
    ...structured,
    rawMarkdown: content,
  }
}
