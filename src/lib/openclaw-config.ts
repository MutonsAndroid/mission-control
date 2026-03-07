import fs from 'node:fs'
import { config } from '@/lib/config'

let cachedToken: string | null | undefined

/**
 * Read the gateway auth token from ~/.openclaw/openclaw.json.
 * Used as a fallback when the gateway record in the database has no token.
 *
 * Returns parsed?.gateway?.auth?.token ?? null.
 * Never throws — returns null on file missing, JSON parse failure, or unexpected structure.
 * Cached after first read to avoid repeated disk I/O.
 */
export function readGatewayAuthToken(): string | null {
  if (cachedToken !== undefined) return cachedToken
  try {
    const raw = fs.readFileSync(config.openclawConfigPath, 'utf-8')
    const parsed = JSON.parse(raw)
    cachedToken = parsed?.gateway?.auth?.token ?? null
  } catch {
    cachedToken = null
  }
  return cachedToken ?? null
}
