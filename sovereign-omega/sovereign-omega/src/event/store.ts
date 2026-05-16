// ============================================================
// SOVEREIGN OMEGA — Event Store
// EPISTEMIC TIER: T0
// BUILD GATE 2: Atomic sequence assignment, collision rejection
// PRIMITIVE 1: Cryptographic Event Sourcing
// ============================================================
// Sequence numbers are assigned atomically inside an IndexedDB
// transaction WITH the event append. NEVER derived from length.
// NEVER generated client-side before persistence.
// ============================================================

import type { EventEnvelope, EventType, RetentionClass, UUIDv7, SHA256Hex, SequenceNumber } from '../core/types.js'
import { hashValue } from '../core/hashing.js'
import { canonicalizeJCS } from '../core/canonicalize.js'
import { generateUUIDv7 } from './uuid.js'

const DB_NAME = 'sovereign-omega-events'
const DB_VERSION = 1
const EVENTS_STORE = 'events'
const SEQUENCES_STORE = 'sequences'

export class EventStore {
  private db: IDBDatabase | null = null
  private streamId: UUIDv7

  constructor(streamId: UUIDv7) {
    this.streamId = streamId
  }

  async open(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION)
  }

  /**
   * Append an event to the store.
   * Sequence number is assigned atomically within the IndexedDB transaction.
   * The prev_hash and self_hash are computed and attached before storage.
   *
   * INVARIANT: This is the ONLY path by which events enter the store.
   * INVARIANT: sequence is never derived from array.length or client state.
   */
  async append<TPayload>(
    event_type: EventType,
    payload: TPayload,
    producer_id: string,
    producer_version: string,
    payload_schema_version: string,
    retention_class: RetentionClass,
    timestamp_ms: number  // MUST come from the caller's event context, not Date.now()
  ): Promise<EventEnvelope<TPayload>> {
    const db = this.requireDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([EVENTS_STORE, SEQUENCES_STORE], 'readwrite')
      const eventsStore = tx.objectStore(EVENTS_STORE)
      const sequencesStore = tx.objectStore(SEQUENCES_STORE)

      // Get and atomically increment the sequence counter
      const seqReq = sequencesStore.get(this.streamId)

      seqReq.onsuccess = async () => {
        try {
          const currentSeq: number = seqReq.result ?? -1
          const nextSeq = currentSeq + 1

          // Get the previous event's hash for chain integrity
          const prevHashReq = eventsStore.index('by_stream_sequence')
            .get(IDBKeyRange.only([this.streamId, currentSeq]))

          // We need to compute the hash after getting prev hash
          // Use a nested request pattern for IndexedDB
          prevHashReq.onsuccess = async () => {
            try {
              const prevEvent = prevHashReq.result as EventEnvelope | null
              const prevHash = prevEvent?.self_hash ?? ('0'.repeat(64) as SHA256Hex)

              const event_id = generateUUIDv7() as UUIDv7

              // Compute self_hash over the envelope WITHOUT self_hash field
              const envelopeForHashing = {
                event_id,
                stream_id: this.streamId,
                event_type,
                timestamp_ms,
                sequence: String(nextSeq),  // BigInt serialised as string for hashing
                producer_id,
                producer_version,
                payload_schema_version,
                payload,
                prev_hash: prevHash,
                retention_class,
              }

              const canonical = canonicalizeJCS(envelopeForHashing)
              const selfHashBytes = await (async () => {
                if (typeof globalThis.crypto?.subtle !== 'undefined') {
                  const digest = await globalThis.crypto.subtle.digest('SHA-256', canonical)
                  return new Uint8Array(digest)
                }
                const { createHash } = await import('crypto')
                return new Uint8Array(createHash('sha256').update(canonical).digest())
              })()
              const self_hash = Array.from(selfHashBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('') as SHA256Hex

              const envelope: EventEnvelope<TPayload> = Object.freeze({
                event_id,
                stream_id: this.streamId,
                event_type,
                timestamp_ms,
                sequence: BigInt(nextSeq) as SequenceNumber,
                producer_id,
                producer_version,
                payload_schema_version,
                payload: Object.freeze(payload) as TPayload,
                prev_hash: prevHash,
                self_hash,
                retention_class,
              })

              // Atomically store event and update sequence counter
              eventsStore.put({ ...envelope, sequence: nextSeq })
              sequencesStore.put(nextSeq, this.streamId)

              tx.oncomplete = () => resolve(envelope)
              tx.onerror = () => reject(new EventStoreError('Transaction failed during append'))
            } catch (err) {
              reject(err)
            }
          }
          prevHashReq.onerror = () => reject(new EventStoreError('Failed to retrieve previous event'))
        } catch (err) {
          reject(err)
        }
      }

      seqReq.onerror = () => reject(new EventStoreError('Failed to read sequence counter'))
      tx.onerror = (e) => reject(new EventStoreError(`Transaction error: ${e}`))
    })
  }

  /**
   * Retrieve all events for this stream, ordered by sequence number.
   * Used for deterministic projection replay.
   */
  async getAll(): Promise<readonly EventEnvelope[]> {
    const db = this.requireDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readonly')
      const store = tx.objectStore(EVENTS_STORE)
      const index = store.index('by_stream_sequence')
      const range = IDBKeyRange.bound(
        [this.streamId, 0],
        [this.streamId, Number.MAX_SAFE_INTEGER]
      )
      const req = index.getAll(range)
      req.onsuccess = () => {
        const events = (req.result as EventEnvelope[]).map(e => ({
          ...e,
          sequence: BigInt(e.sequence as unknown as number) as SequenceNumber,
        }))
        resolve(Object.freeze(events))
      }
      req.onerror = () => reject(new EventStoreError('Failed to retrieve events'))
    })
  }

  /**
   * Retrieve events since a given sequence number (inclusive).
   */
  async getSince(fromSequence: SequenceNumber): Promise<readonly EventEnvelope[]> {
    const db = this.requireDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readonly')
      const store = tx.objectStore(EVENTS_STORE)
      const index = store.index('by_stream_sequence')
      const range = IDBKeyRange.bound(
        [this.streamId, Number(fromSequence)],
        [this.streamId, Number.MAX_SAFE_INTEGER]
      )
      const req = index.getAll(range)
      req.onsuccess = () => {
        const events = (req.result as EventEnvelope[]).map(e => ({
          ...e,
          sequence: BigInt(e.sequence as unknown as number) as SequenceNumber,
        }))
        resolve(Object.freeze(events))
      }
      req.onerror = () => reject(new EventStoreError('Failed to retrieve events since sequence'))
    })
  }

  /**
   * Verify the hash chain integrity of the event log.
   * Returns the first broken link, or null if the chain is intact.
   */
  async verifyChain(): Promise<{ broken_at_sequence: number; expected: string; got: string } | null> {
    const events = await this.getAll()
    const genesisHash = '0'.repeat(64) as SHA256Hex

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!
      const expectedPrevHash = i === 0 ? genesisHash : events[i - 1]!.self_hash

      if (event.prev_hash !== expectedPrevHash) {
        return {
          broken_at_sequence: Number(event.sequence),
          expected: expectedPrevHash,
          got: event.prev_hash,
        }
      }
    }

    return null
  }

  private requireDB(): IDBDatabase {
    if (!this.db) throw new EventStoreError('EventStore not opened. Call open() first.')
    return this.db
  }
}

// ─── IndexedDB Setup ───────────────────────────────────────

function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'event_id' })
        eventsStore.createIndex('by_stream_sequence', ['stream_id', 'sequence'], { unique: true })
        eventsStore.createIndex('by_event_type', 'event_type')
        eventsStore.createIndex('by_stream', 'stream_id')
      }

      if (!db.objectStoreNames.contains(SEQUENCES_STORE)) {
        db.createObjectStore(SEQUENCES_STORE)
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new EventStoreError(`Failed to open database: ${req.error?.message}`))
  })
}

// ─── Error Types ───────────────────────────────────────────

export class EventStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventStoreError'
  }
}
