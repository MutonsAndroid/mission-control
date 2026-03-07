/**
 * Mission Control boot pipeline.
 * Loads OpenClaw memory before agents start.
 * Startup order:
 * 1. locateOpenClawInstall()
 * 2. rehydrateMemory()
 * 3. runDailyRollover()
 * 4. rebuildSemanticIndex()
 * 5. startAgents()
 *
 * Agents must never start before memory rehydration completes.
 */

import { logger } from '@/lib/logger'
import {
  locateOpenClawInstall,
  rehydrateMemory,
  runDailyRollover,
  rebuildSemanticIndex,
  runRecall,
  startWatchBrain,
  type OpenClawPaths,
  type BootContext,
} from '@/lib/memory'

let bootPaths: OpenClawPaths | null = null
let bootContext: BootContext | null = null
let bootComplete = false

export function getBootPaths(): OpenClawPaths | null {
  return bootPaths
}

export function getBootContext(): BootContext | null {
  return bootContext
}

export function isBootComplete(): boolean {
  return bootComplete
}

/**
 * Get the canonical SOUL content for Sampson from the OpenClaw workspace.
 * Use when injecting personality context for the primary agent.
 */
export function getCanonicalSoul(): string {
  return bootContext?.soul ?? ''
}

/**
 * Run the full boot pipeline.
 * Safe to call multiple times; re-runs only if OpenClaw is located.
 */
export async function runBootPipeline(): Promise<{ ok: boolean; paths?: OpenClawPaths; error?: string }> {
  if (bootComplete && bootPaths) {
    return { ok: true, paths: bootPaths }
  }

  const paths = locateOpenClawInstall()
  if (!paths) {
    logger.info('OpenClaw memory: no installation found, skipping boot pipeline')
    return { ok: false, error: 'OpenClaw installation not found' }
  }

  try {
    bootPaths = paths
    logger.info({ workspace: paths.workspace }, 'OpenClaw memory: located, rehydrating')

    bootContext = rehydrateMemory(paths)
    logger.info(
      {
        soulLen: bootContext.soul.length,
        agentsLen: bootContext.agents.length,
        brainIndexLen: bootContext.brainIndex.length,
        chartersCount: bootContext.charters.length,
      },
      'OpenClaw memory: rehydrated'
    )

    const rollover = runDailyRollover(paths)
    if (rollover.created) {
      logger.info({ summaryPath: rollover.summaryPath }, 'OpenClaw memory: daily rollover created')
    }

    const indexResult = rebuildSemanticIndex(paths)
    logger.info(
      { chunkCount: indexResult.chunkCount, indexPath: indexResult.indexPath },
      'OpenClaw memory: semantic index rebuilt'
    )

    runRecall(paths)
    startWatchBrain(paths)
    logger.info('OpenClaw memory: active recall written')

    bootComplete = true
    logger.info('OpenClaw memory: boot pipeline complete')
    return { ok: true, paths }
  } catch (err) {
    logger.error({ err }, 'OpenClaw memory: boot pipeline failed')
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
