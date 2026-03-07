/**
 * OpenClaw memory integration.
 * Exports all memory modules for use by the boot pipeline and agent runtime.
 */

export { locateOpenClawInstall, type OpenClawPaths } from './locate'
export { rehydrateMemory, type BootContext } from './rehydrate'
export { runDailyRollover } from './rollover'
export { rebuildSemanticIndex, type IndexChunk } from './semantic-index'
export { runRecall, readActiveRecall } from './recall'
export { startWatchBrain, stopWatchBrain } from './watch-brain'
