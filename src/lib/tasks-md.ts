/**
 * Parse and serialize TASKS.md format.
 * Format: ## TASK-ID\nstatus: x\npriority: x\nowner: x\n\nDescription
 */

export interface ParsedTask {
  id: string
  status: string
  priority: string
  owner: string
  description: string
  rawBlock: string
}

const TASK_BLOCK_RE = /^##\s+(TASK-\d+|TASK-[A-Z0-9-]+)\s*$/m
const METADATA_RE = /^(\w+):\s*(.+)$/m

export function parseTasksMd(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const blocks = content.split(/(?=^##\s+TASK-)/m).filter(Boolean)

  for (const block of blocks) {
    const idMatch = block.match(/^##\s+(TASK-[A-Z0-9-]+)\s*$/m)
    if (!idMatch) continue

    const id = idMatch[1]
    const rest = block.slice(idMatch[0].length).trim()
    const lines = rest.split(/\r?\n/)
    let status = 'pending'
    let priority = 'medium'
    let owner = ''
    let descLines: string[] = []
    let inBody = false

    for (const line of lines) {
      const metaMatch = line.match(/^(\w+):\s*(.*)$/)
      if (metaMatch && !inBody) {
        const [, key, val] = metaMatch
        const v = val.trim()
        if (key === 'status') status = v
        else if (key === 'priority') priority = v
        else if (key === 'owner') owner = v
      } else {
        inBody = true
        descLines.push(line)
      }
    }

    const description = descLines.join('\n').trim()
    tasks.push({ id, status, priority, owner, description, rawBlock: block })
  }

  return tasks
}

export function formatTask(task: Omit<ParsedTask, 'rawBlock'>): string {
  return `## ${task.id}
status: ${task.status}
priority: ${task.priority}
owner: ${task.owner}

${task.description}
`
}
