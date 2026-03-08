import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getAgentDiscoveryDiagnostics } from '@/lib/agent-sync'
import { config } from '@/lib/config'
import { readGatewayAuthToken } from '@/lib/openclaw-config'
import { logger } from '@/lib/logger'

/**
 * GET /api/agents/discovery - Agent discovery diagnostics
 * Returns config path, gateway connection info, and agent counts for troubleshooting.
 * Requires admin role.
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const diagnostics = await getAgentDiscoveryDiagnostics()

    const gatewayToken = readGatewayAuthToken()
    const gatewayInfo = {
      host: config.gatewayHost,
      port: config.gatewayPort,
      tokenLoaded: !!gatewayToken,
      tokenLength: gatewayToken ? gatewayToken.length : 0,
    }

    logger.info(
      {
        configPath: diagnostics.configPath,
        runtimeAgentsDetected: diagnostics.runtimeAgentsDetected,
        runtimeAgentNames: diagnostics.runtimeAgentNames,
        databaseAgentsDetected: diagnostics.databaseAgentsDetected,
      },
      'Agent discovery diagnostics'
    )

    return NextResponse.json({
      configPath: diagnostics.configPath,
      runtimeAgentsDetected: diagnostics.runtimeAgentsDetected,
      runtimeAgentNames: diagnostics.runtimeAgentNames,
      configAgentsDetected: diagnostics.configAgentsDetected,
      databaseAgentsDetected: diagnostics.databaseAgentsDetected,
      gatewayConnectionStatus: diagnostics.gatewayConnectionStatus,
      agentDocsDetected: diagnostics.agentDocsDetected,
      docTypes: diagnostics.docTypes,
      docPaths: diagnostics.docPaths,
      config: {
        path: diagnostics.configPath,
        exists: diagnostics.configExists,
        agentCount: diagnostics.configAgentsDetected,
        agentIds: diagnostics.configAgentIds,
      },
      missionControl: {
        agentCount: diagnostics.databaseAgentsDetected,
        agentNames: diagnostics.mcAgentNames,
        workspaceId: diagnostics.workspaceId,
      },
      gateway: gatewayInfo,
    })
  } catch (error: any) {
    logger.error({ err: error }, 'GET /api/agents/discovery error')
    return NextResponse.json({ error: error.message || 'Discovery failed' }, { status: 500 })
  }
}
