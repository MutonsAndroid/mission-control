/**
 * BRAIN filesystem I/O helpers.
 * Canonical operations for the Sampson ecosystem BRAIN structure.
 */

import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { logger } from '@/lib/logger'

/**
 * Read BRAIN/projects/<project>/logs/structure.md.
 * Returns full content or empty string if file missing.
 */
export function readStructureLog(projectSlug: string): string {
  const paths = locateOpenClawInstall()
  if (!paths) return ''

  const logFile = path.join(paths.brainProjectsDir, projectSlug, 'logs', 'structure.md')
  try {
    if (fs.existsSync(logFile)) {
      return fs.readFileSync(logFile, 'utf-8')
    }
  } catch (err) {
    logger.warn({ err, projectSlug, logFile }, '[brain-io] Failed to read structure log')
  }
  return ''
}

/**
 * Append an entry to BRAIN/projects/<project>/logs/structure.md.
 * Used for agent creation logging per governance.
 */
export function appendStructureLog(projectSlug: string, entry: string): void {
  const paths = locateOpenClawInstall()
  if (!paths) {
    logger.warn('[brain-io] No OpenClaw installation found, cannot append structure log')
    return
  }

  const logDir = path.join(paths.brainProjectsDir, projectSlug, 'logs')
  const logFile = path.join(logDir, 'structure.md')

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const block = `\n${timestamp}\n${entry}\n`
    fs.appendFileSync(logFile, block, 'utf-8')
    logger.info({ projectSlug, logFile }, '[brain-io] Appended structure log entry')
  } catch (err) {
    logger.error({ err, projectSlug, logFile }, '[brain-io] Failed to append structure log')
    throw err
  }
}
