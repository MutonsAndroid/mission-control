/**
 * File watcher for BRAIN Markdown files.
 * Rebuilds the semantic index when any .md file under BRAIN changes.
 */

import chokidar from 'chokidar'
import { logger } from '@/lib/logger'
import { rebuildSemanticIndex } from './semantic-index'
import { runRecall } from './recall'
import type { OpenClawPaths } from './locate'

const DEBOUNCE_MS = 500
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRebuild(paths: OpenClawPaths) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    try {
      const result = rebuildSemanticIndex(paths)
      runRecall(paths)
      logger.info({ chunkCount: result.chunkCount }, 'BRAIN: semantic index rebuilt (watcher)')
    } catch (err) {
      logger.error({ err }, 'BRAIN: semantic index rebuild failed (watcher)')
    }
  }, DEBOUNCE_MS)
}

let watcher: ReturnType<typeof chokidar.watch> | null = null

/**
 * Start watching BRAIN Markdown files and rebuild the semantic index on changes.
 * Call stopWatchBrain() to clean up.
 */
export function startWatchBrain(paths: OpenClawPaths): void {
  if (watcher) return

  const pattern = paths.brain + '/**/*.md'
  watcher = chokidar.watch(pattern, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  })

  watcher.on('add', (p) => {
    logger.debug({ path: p }, 'BRAIN: file added')
    scheduleRebuild(paths)
  })
  watcher.on('change', (p) => {
    logger.debug({ path: p }, 'BRAIN: file changed')
    scheduleRebuild(paths)
  })
  watcher.on('unlink', (p) => {
    logger.debug({ path: p }, 'BRAIN: file removed')
    scheduleRebuild(paths)
  })

  logger.info({ pattern }, 'BRAIN: file watcher started')
}

/**
 * Stop the BRAIN file watcher.
 */
export function stopWatchBrain(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
    logger.info('BRAIN: file watcher stopped')
  }
}
