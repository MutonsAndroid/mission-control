/**
 * Semantic index loader.
 * Scans the entire BRAIN directory, chunks Markdown by headings,
 * and builds an index stored in BRAIN/_portfolio/semantic-index/.
 * Never modifies canonical Markdown.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { OpenClawPaths } from './locate'

export interface IndexChunk {
  file: string
  heading: string
  content: string
  excerpt: string
  terms: string[]
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/m
const MAX_EXCERPT_LEN = 500

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function extractChunks(filePath: string, content: string, brainRelPath: string): IndexChunk[] {
  const chunks: IndexChunk[] = []
  const lines = content.split('\n')
  let currentHeading = ''
  let currentContent: string[] = []

  const flush = () => {
    if (!currentHeading && currentContent.length === 0) return
    const block = currentContent.join('\n').trim()
    if (!block) return
    const excerpt =
      block.length > MAX_EXCERPT_LEN ? block.slice(0, MAX_EXCERPT_LEN) + '...' : block
    chunks.push({
      file: brainRelPath,
      heading: currentHeading || '(no heading)',
      content: block,
      excerpt,
      terms: [...new Set(tokenize(currentHeading + ' ' + block))],
    })
  }

  for (const line of lines) {
    const m = line.match(HEADING_RE)
    if (m) {
      flush()
      currentHeading = m[2].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  flush()
  return chunks
}

function scanBrain(brainDir: string, baseRel = ''): IndexChunk[] {
  const chunks: IndexChunk[] = []
  const dir = path.join(brainDir, baseRel)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return chunks

  const items = fs.readdirSync(dir)
  for (const item of items) {
    const relPath = baseRel ? `${baseRel}/${item}` : item
    const fullPath = path.join(dir, item)

    if (item.startsWith('.') || item === '_portfolio') continue

    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      chunks.push(...scanBrain(brainDir, relPath))
    } else if (stat.isFile() && item.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const brainRel = `BRAIN/${relPath}`
        chunks.push(...extractChunks(fullPath, content, brainRel))
      } catch {
        /* skip */
      }
    }
  }
  return chunks
}

/**
 * Rebuild the semantic index from BRAIN Markdown.
 * Writes only to BRAIN/_portfolio/semantic-index/.
 */
export function rebuildSemanticIndex(paths: OpenClawPaths): { chunkCount: number; indexPath: string } {
  const chunks = scanBrain(paths.brain)
  const indexDir = paths.semanticIndex
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true })
  }

  const indexFile = path.join(indexDir, 'chunks.json')
  fs.writeFileSync(indexFile, JSON.stringify(chunks, null, 0), 'utf-8')

  const metaPath = path.join(indexDir, 'index-metadata.json')
  const metadata = {
    builtAt: new Date().toISOString(),
    source: 'BRAIN',
    fileCount: new Set(chunks.map((c) => c.file)).size,
    chunkCount: chunks.length,
  }
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8')

  return { chunkCount: chunks.length, indexPath: indexFile }
}
