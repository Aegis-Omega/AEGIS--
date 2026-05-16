#!/usr/bin/env node
// ============================================================
// SOVEREIGN OMEGA — Frozen File Hash Verification
// Run before any session that touches constitutional files.
// ============================================================

import { createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'

const FROZEN_FILES = {
  'gate.py': '72196f38974ad22130c18657c88106316cacbb13a57328990f4e5872f5fdb1e9',
  'dna.py':  '9c4d38d80b236d655057f16304ea2d202f644ec0c7ca21db8df0bdcd503971a9',
  'router.py': 'c96e566ce6eb9cec358b2112757142bc88ea4fea9160edb2914c8d711007ac769',
}

let allOk = true

for (const [file, expectedHash] of Object.entries(FROZEN_FILES)) {
  if (!existsSync(file)) {
    console.log(`  SKIP: ${file} — not present in this directory`)
    continue
  }
  const content = readFileSync(file)
  const actualHash = createHash('sha256').update(content).digest('hex')
  if (actualHash === expectedHash) {
    console.log(`  OK:   ${file}`)
  } else {
    console.error(`  FAIL: ${file}`)
    console.error(`        Expected: ${expectedHash}`)
    console.error(`        Got:      ${actualHash}`)
    allOk = false
  }
}

if (!allOk) {
  console.error('\n[FROZEN FILE VIOLATION] Constitutional files have been modified.')
  console.error('Requires /guardian APPROVED verdict before proceeding.')
  process.exit(1)
}

console.log('\nAll present frozen files verified.')
