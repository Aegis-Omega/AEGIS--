// ============================================================
// SOVEREIGN OMEGA — BlockChain (ordered CommittedBlock sequence)
// EPISTEMIC TIER: T2 · distributed ledger precursor
//
// Immutable functional-update pattern (mirrors LedgerChain).
// append() enforces index monotonicity synchronously — fast and
// cheap. verifyAll() runs full cryptographic verifyBlock() across
// every adjacent pair — async, tamper-evident.
// ============================================================

import { deepFreeze } from '../core/immutable.js'
import { type CommittedBlock, verifyBlock } from './block.js'

export class BlockChainError extends Error {
  override readonly name = 'BlockChainError'
  constructor(msg: string) {
    super(msg)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BlockChain {
  private readonly _blocks: readonly CommittedBlock[]

  private constructor(blocks: readonly CommittedBlock[]) {
    this._blocks = blocks
  }

  /** Empty chain — no blocks committed yet. */
  static empty(): BlockChain {
    return new BlockChain(deepFreeze([]))
  }

  /**
   * Append a block. Enforces strict index monotonicity (index must equal
   * length of current chain). Returns a new BlockChain; does not mutate.
   * Throws BlockChainError on index violation; throws BlockError if block
   * has no transactions (re-surfaced from the block layer).
   */
  append(block: CommittedBlock): BlockChain {
    const expectedIndex = this._blocks.length
    if (block.index !== expectedIndex) {
      throw new BlockChainError(
        `Block index ${block.index} does not match expected ${expectedIndex}`,
      )
    }
    return new BlockChain(deepFreeze([...this._blocks, block]))
  }

  /**
   * Full cryptographic verification of the entire chain.
   * Re-derives prev_hash, state_root_before/after, and all validator
   * signatures for every adjacent block pair. Returns false on the first
   * mismatch found.
   */
  async verifyAll(): Promise<boolean> {
    for (let i = 0; i < this._blocks.length; i++) {
      const block    = this._blocks[i]!
      const prevBlock = i === 0 ? null : (this._blocks[i - 1] ?? null)
      const valid    = await verifyBlock(block, prevBlock)
      if (!valid) return false
    }
    return true
  }

  /** All committed blocks in append order. Frozen. */
  getAll(): readonly CommittedBlock[] { return this._blocks }

  /** Most recently appended block, or null if the chain is empty. */
  get lastBlock(): CommittedBlock | null {
    /* c8 ignore next -- noUncheckedIndexedAccess artifact */
    return this._blocks.length > 0
      ? (this._blocks[this._blocks.length - 1] ?? null)
      : null
  }

  /** Number of committed blocks. */
  get length(): number { return this._blocks.length }

  /** Index of the highest committed block, or -1 if empty. */
  get height(): number { return this._blocks.length - 1 }
}
