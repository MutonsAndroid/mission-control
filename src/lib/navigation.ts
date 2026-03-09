'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function panelHref(panel: string, slug?: string): string {
  if (panel === 'sampson' || panel === 'overview') return '/'
  if (panel === 'project' && slug) return `/projects/${slug}`
  if (panel === 'projects/create') return '/projects/create'
  if (panel === 'protocols' && slug) return `/protocols?selected=${encodeURIComponent(slug)}`
  return `/${panel}`
}

export function useNavigateToPanel() {
  const router = useRouter()
  return useCallback((panel: string, slug?: string) => {
    router.push(panelHref(panel, slug))
  }, [router])
}
