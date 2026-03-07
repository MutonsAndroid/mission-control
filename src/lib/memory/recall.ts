/**
 * Runtime recall injection.
 * Before any agent response:
 * 1. Query the semantic index
 * 2. Retrieve relevant memory snippets
 * 3. Write to BRAIN/_portfolio/runtime/active-recall.md
 *
 * Mission Control should inject this file into the agent prompt context.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { OpenClawPaths } from './locate'
import type { IndexChunk } from './semantic-index'

const CHUNKS_FILE = 'chunks.json'
const EMBEDDINGS_FILE = 'embeddings.jsonl'
const MAX_SNIPPETS = 15
const SNIPPET_EXCERPT_LEN = 400

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)
  )
}

function scoreChunk(chunk: { terms: string[]; excerpt: string }, queryTerms: Set<string>): number {
  const chunkTerms = new Set(chunk.terms.map((t) => t.toLowerCase()))
  let score = 0
  for (const q of queryTerms) {
    if (chunkTerms.has(q)) score += 1
  }
  return score
}

function loadChunksFromJson(indexDir: string): IndexChunk[] | null {
  const p = path.join(indexDir, CHUNKS_FILE)
  if (!fs.existsSync(p)) return null
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    return JSON.parse(raw) as IndexChunk[]
  } catch {
    return null
  }
}

function loadChunksFromEmbeddings(indexDir: string): IndexChunk[] | null {
  const p = path.join(indexDir, EMBEDDINGS_FILE)
  if (!fs.existsSync(p)) return null
  const chunks: IndexChunk[] = []
  try {
    const lines = fs.readFileSync(p, 'utf-8').split('\n').filter(Boolean)
    for (const line of lines) {
      const obj = JSON.parse(line) as { file: string; heading: string; excerpt: string; terms: string[] }
      chunks.push({
        file: obj.file,
        heading: obj.heading,
        content: obj.excerpt,
        excerpt: obj.excerpt.slice(0, SNIPPET_EXCERPT_LEN),
        terms: obj.terms || [],
      })
    }
    return chunks.length > 0 ? chunks : null
  } catch {
    return null
  }
}

function loadChunks(indexDir: string): IndexChunk[] {
  const fromJson = loadChunksFromJson(indexDir)
  if (fromJson && fromJson.length > 0) return fromJson
  const fromEmbed = loadChunksFromEmbeddings(indexDir)
  return fromEmbed ?? []
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen).trimEnd() + '...'
}

/**
 * Query the semantic index and write active-recall.md.
 * Call before agent response to inject relevant memory into context.
 */
export function runRecall(paths: OpenClawPaths, query?: string): { snippetCount: number; outputPath: string } {
  const chunks = loadChunks(paths.semanticIndex)
  const queryTerms = query ? tokenize(query) : new Set<string>()
  const today = new Date().toISOString().slice(0, 10)

  let selected: IndexChunk[]
  if (queryTerms.size > 0) {
    const scored = chunks
      .map((c) => ({ chunk: c, score: scoreChunk(c, queryTerms) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
    selected = scored.slice(0, MAX_SNIPPETS).map((s) => s.chunk)
  } else {
    selected = chunks.slice(0, MAX_SNIPPETS)
  }

  const sections = selected.map(
    (c, i) =>
      `## ${i + 1}. ${c.heading}\n_Source: ${c.file}_\n\n${truncate(c.excerpt || c.content, SNIPPET_EXCERPT_LEN)}\n\n---`
  )

  const header = `---
type: recall
date: ${today}
participants: [memory-recall]
capability: global
impact: operational
status: active
tags: [recall, pre-response]
---

# Active Recall — Pre-Response Context

Relevant memory snippets injected before this response.

`
  const body = sections.length > 0 ? sections.join('\n\n') : '_No matching memory snippets._\n'

  const runtimeDir = paths.runtime
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true })
  }
  const outputPath = paths.activeRecall
  fs.writeFileSync(outputPath, header + body, 'utf-8')
  return { snippetCount: selected.length, outputPath }
}

/**
 * Read the current active-recall content for injection into agent prompt.
 */
export function readActiveRecall(paths: OpenClawPaths): string {
  try {
    if (fs.existsSync(paths.activeRecall)) {
      return fs.readFileSync(paths.activeRecall, 'utf-8')
    }
  } catch {
    /* ignore */
  }
  return ''
}
