/**
 * Protocol document management.
 * Protocols are Markdown files in BRAIN/_portfolio/protocols/.
 * Filesystem-backed, no database.
 */

import fs from 'node:fs'
import { extractFrontmatter } from './markdown-frontmatter'
import path from 'node:path'
import { config } from './config'
import { ensureDirExists } from './config'
import { logger } from './logger'

/** Canonical protocols directory relative to BRAIN (memoryDir) */
const PROTOCOLS_REL = '_portfolio/protocols'

/**
 * Get the absolute path to the protocols directory.
 * Uses config.memoryDir (BRAIN root) + _portfolio/protocols.
 */
export function getProtocolsDir(): string | null {
  const memoryDir = config.memoryDir
  if (!memoryDir) return null
  return path.join(memoryDir, PROTOCOLS_REL)
}

/**
 * Ensure the protocols directory exists.
 */
export function ensureProtocolsDir(): string | null {
  const dir = getProtocolsDir()
  if (!dir) return null
  ensureDirExists(dir)
  return dir
}

/** Metadata convention: YAML frontmatter at top of each protocol */
export interface ProtocolMeta {
  title?: string
  purpose?: string
  scope?: string
  owner?: string
  status?: string
}

export interface ProtocolFile {
  name: string
  path: string
  size?: number
  modified?: number
  meta?: ProtocolMeta
}

const PROTOCOL_META_KEYS = ['title', 'purpose', 'scope', 'owner', 'status'] as const

/**
 * Parse YAML-like frontmatter for protocol metadata (title, purpose, scope, owner, status).
 */
export function parseProtocolMetadata(content: string): ProtocolMeta {
  const { frontmatter } = extractFrontmatter(content)
  const meta: ProtocolMeta = {}
  const lower = Object.fromEntries(
    Object.entries(frontmatter).map(([k, v]) => [k.toLowerCase(), v])
  )
  for (const k of PROTOCOL_META_KEYS) {
    const v = lower[k]
    if (v !== undefined) (meta as Record<string, string>)[k] = v
  }
  return meta
}

/**
 * List all Markdown protocol files in BRAIN/_portfolio/protocols/.
 * Reads frontmatter from each file for metadata (title, purpose, scope, owner, status).
 */
export function listProtocols(): ProtocolFile[] {
  const dir = getProtocolsDir()
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return []
  }

  const files: ProtocolFile[] = []
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      if (!item.isFile()) continue
      if (!item.name.endsWith('.md')) continue
      const fullPath = path.join(dir, item.name)
      try {
        const stats = fs.statSync(fullPath)
        const entry: ProtocolFile = {
          name: item.name,
          path: item.name,
          size: stats.size,
          modified: stats.mtime.getTime(),
        }
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8').slice(0, 2048)
          entry.meta = parseProtocolMetadata(raw)
        } catch {
          // Ignore metadata parse failures
        }
        files.push(entry)
      } catch {
        // Skip unreadable files
      }
    }
  } catch (err) {
    logger.error({ err, dir }, 'listProtocols failed')
  }

  return files.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Resolve a protocol filename to a safe absolute path within protocols dir.
 */
function resolveProtocolPath(filename: string): string | null {
  const base = getProtocolsDir()
  if (!base) return null
  const normalized = path.normalize(filename).replace(/^\.\//, '')
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    return null
  }
  const fullPath = path.join(base, normalized)
  if (!fullPath.startsWith(path.resolve(base))) return null
  return fullPath
}

/**
 * Read protocol content by filename (e.g. "agent-creation-protocol.md").
 */
export function readProtocol(
  filename: string
): { content: string; path: string; meta: ProtocolMeta } | null {
  const fullPath = resolveProtocolPath(filename)
  if (!fullPath) return null
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    const meta = parseProtocolMetadata(content)
    return { content, path: filename, meta }
  } catch (err) {
    logger.warn({ err, path: fullPath }, 'readProtocol failed')
    return null
  }
}

/**
 * Write protocol content.
 */
export function writeProtocol(filename: string, content: string): boolean {
  const base = getProtocolsDir()
  if (!base) return false
  ensureProtocolsDir()
  const fullPath = resolveProtocolPath(filename)
  if (!fullPath) return false
  try {
    fs.writeFileSync(fullPath, content, 'utf-8')
    return true
  } catch (err) {
    logger.error({ err, path: fullPath }, 'writeProtocol failed')
    return false
  }
}

/** Default frontmatter template for new protocols */
export const DEFAULT_PROTOCOL_TEMPLATE = (baseName: string) => `---
title: ${baseName.replace(/-/g, ' ')}
purpose: 
scope: 
owner: 
status: draft
---

# ${baseName.replace(/-/g, ' ')}

`

/**
 * Upload a Markdown file into BRAIN/_portfolio/protocols/.
 * Overwrites if the file exists. Uses the provided filename as-is (must end with .md).
 */
export function uploadProtocol(filename: string, content: string): boolean {
  const base = getProtocolsDir()
  if (!base) return false
  ensureProtocolsDir()
  const normalized = path.normalize(filename).replace(/^\.\//, '')
  if (!normalized.endsWith('.md')) return false
  if (normalized.includes('..') || path.isAbsolute(normalized)) return false
  const fullPath = path.join(base, normalized)
  try {
    fs.writeFileSync(fullPath, content, 'utf-8')
    return true
  } catch (err) {
    logger.error({ err, path: fullPath }, 'uploadProtocol failed')
    return false
  }
}

/**
 * Create a new protocol file (empty or with content). Fails if file exists.
 */
export function createProtocol(filename: string, content: string = ''): boolean {
  const base = getProtocolsDir()
  if (!base) return false
  ensureProtocolsDir()
  const normalized = path.normalize(filename).replace(/^\.\//, '')
  if (!normalized.endsWith('.md')) return false
  if (normalized.includes('..') || path.isAbsolute(normalized)) return false
  const fullPath = path.join(base, normalized)
  if (fs.existsSync(fullPath)) return false
  const baseName = normalized.replace(/\.md$/, '')
  const initialContent =
    content && content.trim()
      ? content
      : DEFAULT_PROTOCOL_TEMPLATE(baseName)
  try {
    fs.writeFileSync(fullPath, initialContent, 'utf-8')
    return true
  } catch (err) {
    logger.error({ err, path: fullPath }, 'createProtocol failed')
    return false
  }
}

/**
 * Delete a protocol file.
 */
export function deleteProtocol(filename: string): boolean {
  const fullPath = resolveProtocolPath(filename)
  if (!fullPath) return false
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return true
    }
  } catch (err) {
    logger.error({ err, path: fullPath }, 'deleteProtocol failed')
  }
  return false
}

/**
 * Rename a protocol file.
 */
export function renameProtocol(oldFilename: string, newFilename: string): boolean {
  const base = getProtocolsDir()
  if (!base) return false
  const oldPath = resolveProtocolPath(oldFilename)
  const newNormalized = path.normalize(newFilename).replace(/^\.\//, '')
  if (!newNormalized.endsWith('.md') || newNormalized.includes('..') || path.isAbsolute(newNormalized)) {
    return false
  }
  const newPath = path.join(base, newNormalized)
  if (!oldPath || fs.existsSync(newPath)) return false
  try {
    fs.renameSync(oldPath, newPath)
    return true
  } catch (err) {
    logger.error({ err, oldPath, newPath }, 'renameProtocol failed')
    return false
  }
}
