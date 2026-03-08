'use client'

import { useState, useEffect } from 'react'
import { AgentAvatar } from '@/components/ui/agent-avatar'

interface HierarchyNode {
  id: string
  children: HierarchyNode[]
}

interface HierarchyData {
  owner: string
  root: HierarchyNode
  nodeIds: string[]
}

type AgentLike = { id: number; name: string; role: string; status: string; session_key?: string }

interface AgentHierarchyTreeProps {
  agents: AgentLike[]
  onSelectAgent: (agent: AgentLike) => void
}

function TreeNode({
  node,
  depth,
  agents,
  onSelect
}: {
  node: HierarchyNode
  depth: number
  agents: AgentLike[]
  onSelect: (agent: AgentLike) => void
}) {
  const agent = agents.find(
    (a) => a.name.toLowerCase().replace(/\s+/g, '-') === node.id || a.name === node.id
  )
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="ml-4" style={{ marginLeft: `${depth * 16}px` }}>
      <div className="flex items-center gap-2 py-1.5 group">
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {expanded ? '−' : '+'}
          </button>
        )}
        {node.children.length === 0 && <span className="w-5" />}
        <div
          className={`flex items-center gap-2 flex-1 rounded px-2 py-1 cursor-pointer hover:bg-secondary/50 ${
            agent ? '' : 'opacity-70'
          }`}
          onClick={() => agent && onSelect(agent)}
        >
          {agent ? (
            <AgentAvatar name={agent.name} size="sm" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-xs">
              ?
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {agent?.name ?? node.id}
          </span>
          {agent && (
            <span className="text-xs text-muted-foreground">{agent.status}</span>
          )}
        </div>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="border-l border-border ml-2 pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              agents={agents}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function AgentHierarchyTree({ agents, onSelectAgent }: AgentHierarchyTreeProps) {
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brain/hierarchy')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHierarchy(data?.hierarchy ?? null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (!hierarchy?.root) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No hierarchy. Add agents/hierarchy.json or reports_to in IDENTITY.md.
      </div>
    )
  }

  return (
    <div className="py-2">
      <TreeNode
        node={hierarchy.root}
        depth={0}
        agents={agents}
        onSelect={onSelectAgent}
      />
    </div>
  )
}
