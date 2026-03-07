/**
 * Daily rollover guard.
 * If the current day does not yet have a summary, consolidate the previous
 * day's working memory and append it as a new Markdown summary.
 * Append-only: never overwrites existing summaries.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { OpenClawPaths } from './locate'

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function previousDay(d: Date): Date {
  const prev = new Date(d)
  prev.setDate(prev.getDate() - 1)
  return prev
}

/**
 * Run daily rollover: ensure today has a summary.
 * Consolidates previous day's working memory and writes a new summary if missing.
 */
export function runDailyRollover(paths: OpenClawPaths): { created: boolean; summaryPath?: string } {
  const today = toYYYYMMDD(new Date())
  const yesterday = toYYYYMMDD(previousDay(new Date()))

  const todaySummaryPath = path.join(paths.summariesDaily, `${today}.md`)
  if (fs.existsSync(todaySummaryPath)) {
    return { created: false }
  }

  if (!fs.existsSync(paths.working) || !fs.statSync(paths.working).isDirectory()) {
    return { created: false }
  }

  const workingFiles = fs.readdirSync(paths.working)
  const yesterdayFiles = workingFiles.filter((f) => {
    if (!f.endsWith('.md')) return false
    const stem = f.replace(/\.md$/, '')
    return stem.startsWith(yesterday) || stem === yesterday
  })

  const sections: string[] = []
  for (const f of yesterdayFiles.sort()) {
    const fullPath = path.join(paths.working, f)
    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      sections.push(`## From BRAIN/working/${f}\n\n${content}`)
    } catch {
      /* skip unreadable */
    }
  }

  const body =
    sections.length > 0
      ? sections.join('\n\n---\n\n')
      : '_No working memory recorded for the previous day._'

  const summary = `---
type: daily-summary
date: ${today}
participants: [memory-steward]
capability: global
impact: operational
status: complete
tags: [summary, daily, ${today}]
---

# Daily Summary — ${today}

## Executive Summary
Consolidated ${sections.length} source file(s) for ${yesterday}.

## Capability Snapshot
No capability reports found.

## Structural Changes
None recorded.

## Resource & Constraint Health
No resource data recorded.

## Open Strategic Threads
None recorded.

## Integrity Flags
None.

## Tier 3 Governance Flags
None recorded.

## Source Files
${yesterdayFiles.map((f) => `- BRAIN/working/${f}`).join('\n')}

---

## Consolidated Working Memory

${body}
`

  const dir = paths.summariesDaily
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(todaySummaryPath, summary, 'utf-8')
  return { created: true, summaryPath: todaySummaryPath }
}
