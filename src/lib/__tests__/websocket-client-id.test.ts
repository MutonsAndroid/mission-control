/**
 * Unit test: Gateway handshake client.id must match OpenClaw schema.
 * OpenClaw client-info.ts accepts: openclaw-control-ui, webchat-ui, cli, etc.
 * Mission Control is a control-plane UI → openclaw-control-ui.
 */
import { describe, it, expect } from 'vitest'
import { GATEWAY_CLIENT_ID } from '@/lib/websocket'

describe('Gateway client ID', () => {
  it('client.id must be openclaw-control-ui for OpenClaw gateway handshake', () => {
    expect(GATEWAY_CLIENT_ID).toBe('openclaw-control-ui')
    expect(typeof GATEWAY_CLIENT_ID).toBe('string')
    expect(GATEWAY_CLIENT_ID).not.toBe('openclaw') // old incorrect value
  })
})
