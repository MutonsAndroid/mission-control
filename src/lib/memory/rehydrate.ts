/**
 * Rehydrate OpenClaw memory from the filesystem.
 * Loads governance files and BRAIN content as plain Markdown.
 * Does not modify any files.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { OpenClawPaths } from './locate'

export interface BootContext {
  soul: string
  agents: string
  user: string
  brainIndex: string
  latestSummary: string
  charters: string[]
}

function readIfExists(filePath: string): string {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
  } catch {
    /* ignore */
  }
  return ''
}

function findLatestDailySummary(summariesDir: string): string {
  if (!fs.existsSync(summariesDir) || !fs.statSync(summariesDir).isDirectory()) {
    return ''
  }
  const files = fs.readdirSync(summariesDir)
  const mdFiles = files
    .filter((f) => f.endsWith('.md') && /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse()
  if (mdFiles.length === 0) return ''
  return readIfExists(path.join(summariesDir, mdFiles[0]))
}

function loadCharters(brainDir: string): string[] {
  const charters: string[] = []
  const capabilitiesDir = path.join(brainDir, 'capabilities')
  if (!fs.existsSync(capabilitiesDir) || !fs.statSync(capabilitiesDir).isDirectory()) {
    return charters
  }
  const caps = fs.readdirSync(capabilitiesDir)
  for (const cap of caps) {
    const charterDir = path.join(capabilitiesDir, cap, 'charter')
    if (!fs.existsSync(charterDir) || !fs.statSync(charterDir).isDirectory()) continue
    const files = fs.readdirSync(charterDir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const content = readIfExists(path.join(charterDir, f))
      if (content) charters.push(content)
    }
  }
  return charters
}

/**
 * Load boot context from OpenClaw paths.
 * Returns an object with all available memory content.
 */
export function rehydrateMemory(paths: OpenClawPaths): BootContext {
  return {
    soul: readIfExists(paths.soul),
    agents: readIfExists(paths.agents),
    user: readIfExists(paths.user),
    brainIndex: readIfExists(paths.brainIndex),
    latestSummary: findLatestDailySummary(paths.summariesDaily),
    charters: loadCharters(paths.brain),
  }
}
