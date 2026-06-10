/**
 * PlatformClient — consume-side envelope validation tests
 * EPISTEMIC TIER: T1
 *
 * Tests that the client rejects malformed PlatformEnvelope responses before
 * they propagate into consuming code (brief §4: validate on both produce AND
 * consume; §8: schema rejection as a layer of injection/confusion defence).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlatformClient, PlatformApiError } from '../../../packages/shared/lib/platform-client.js'

const VALID_ENVELOPE = {
  contract_version: '1.0.0',
  execution_id: 'exec-abc-123',
  timestamp: '2026-06-10T00:00:00Z',
  is_replay_reconstructable: true,
  data: { version: '1.0.0', chain_valid: true, total_agents: 39, available: true, contract_version: '1.0.0', audit_chain_hash: '0'.repeat(64) },
}

function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    body: null,
  }) as unknown as typeof fetch
}

beforeEach(() => { vi.restoreAllMocks() })

const client = new PlatformClient('aegis_test_key', 'http://localhost:7890')

describe('PlatformClient envelope validation', () => {
  it('passes through a well-formed PlatformEnvelope', async () => {
    mockFetch(VALID_ENVELOPE)
    const result = await client.status()
    expect(result).toEqual(VALID_ENVELOPE.data)
  })

  it('rejects response missing contract_version', async () => {
    const { contract_version: _, ...bad } = VALID_ENVELOPE
    mockFetch(bad)
    await expect(client.status()).rejects.toThrow(PlatformApiError)
    await expect(client.status()).rejects.toMatchObject({ code: 'INTERNAL' })
  })

  it('rejects response missing execution_id', async () => {
    const { execution_id: _, ...bad } = VALID_ENVELOPE
    mockFetch(bad)
    await expect(client.status()).rejects.toThrow(PlatformApiError)
  })

  it('rejects response missing timestamp', async () => {
    const { timestamp: _, ...bad } = VALID_ENVELOPE
    mockFetch(bad)
    await expect(client.status()).rejects.toThrow(PlatformApiError)
  })

  it('rejects response with is_replay_reconstructable !== true', async () => {
    mockFetch({ ...VALID_ENVELOPE, is_replay_reconstructable: false })
    await expect(client.status()).rejects.toThrow(PlatformApiError)
  })

  it('rejects response with is_replay_reconstructable missing', async () => {
    const { is_replay_reconstructable: _, ...bad } = VALID_ENVELOPE
    mockFetch(bad)
    await expect(client.status()).rejects.toThrow(PlatformApiError)
  })

  it('surfaces HTTP error with PlatformError code on 4xx', async () => {
    mockFetch({ error: 'Invalid or revoked API key', code: 'UNAUTHORIZED' }, 401)
    await expect(client.status()).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
  })

  it('surfaces HTTP error on 429 rate limit', async () => {
    mockFetch({ error: 'Usage limit reached', code: 'RATE_LIMITED' }, 429)
    await expect(client.status()).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 })
  })

  it('is_replay_reconstructable: true is the exact boolean true, not truthy', async () => {
    mockFetch({ ...VALID_ENVELOPE, is_replay_reconstructable: 1 })
    await expect(client.status()).rejects.toThrow(PlatformApiError)
  })
})
