/**
 * Next.js instrumentation — runs once when the Node.js server starts.
 * Executes the Mission Control boot pipeline to load OpenClaw memory
 * before the server accepts requests.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { runBootPipeline } = await import('./src/lib/mission-control-boot')
  await runBootPipeline()
}
