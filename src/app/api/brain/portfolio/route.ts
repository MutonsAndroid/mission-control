import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { locateOpenClawInstall } from '@/lib/memory/locate'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

/** Allowed relative paths under BRAIN/_portfolio/ (no .., no absolute) */
const ALLOWED_PATHS: Record<string, string> = {
  'active-recall': 'runtime/active-recall.md',
  'escalations': 'escalations.md',
  'expansion-requests': 'expansion-requests.md',
  'recent-reports': 'recent-reports.md',
}

/** List files in portfolio summaries/daily */
function listDailySummaries(portfolioDir: string): string[] {
  const dailyDir = path.join(portfolioDir, 'summaries', 'daily')
  if (!fs.existsSync(dailyDir) || !fs.statSync(dailyDir).isDirectory()) return []
  try {
    return fs.readdirSync(dailyDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 7)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const paths = locateOpenClawInstall()
    if (!paths?.portfolio) {
      return NextResponse.json({ error: 'Portfolio not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const fileKey = searchParams.get('file')
    const list = searchParams.get('list')

    if (list === 'daily') {
      const files = listDailySummaries(paths.portfolio)
      const summaries: { date: string; content: string }[] = []
      for (const f of files) {
        const fullPath = path.join(paths.portfolio, 'summaries', 'daily', f)
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          summaries.push({ date: f.replace('.md', ''), content })
        } catch {
          summaries.push({ date: f.replace('.md', ''), content: '' })
        }
      }
      return NextResponse.json({ summaries })
    }

    if (fileKey && ALLOWED_PATHS[fileKey]) {
      const relPath = ALLOWED_PATHS[fileKey]
      const fullPath = path.join(paths.portfolio, relPath)
      if (!fullPath.startsWith(path.resolve(paths.portfolio))) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      try {
        const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : ''
        return NextResponse.json({ file: fileKey, path: relPath, content })
      } catch (err) {
        logger.warn({ err, fullPath }, 'GET /api/brain/portfolio: read error')
        return NextResponse.json({ file: fileKey, path: relPath, content: '' })
      }
    }

    // Default: return all known portfolio files
    const result: Record<string, string> = {}
    for (const [key, relPath] of Object.entries(ALLOWED_PATHS)) {
      const fullPath = path.join(paths.portfolio, relPath)
      try {
        result[key] = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : ''
      } catch {
        result[key] = ''
      }
    }
    const today = new Date().toISOString().slice(0, 10)
    const todayPath = path.join(paths.portfolio, 'summaries', 'daily', `${today}.md`)
    result['morning-brief'] = fs.existsSync(todayPath) ? fs.readFileSync(todayPath, 'utf-8') : ''
    if (paths.activeRecall && fs.existsSync(paths.activeRecall)) {
      result['active-recall'] = fs.readFileSync(paths.activeRecall, 'utf-8')
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, 'GET /api/brain/portfolio error')
    return NextResponse.json({ error: 'Failed to read portfolio' }, { status: 500 })
  }
}
