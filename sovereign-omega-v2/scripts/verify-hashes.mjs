#!/usr/bin/env node
// ============================================================
// SOVEREIGN OMEGA — Frozen File Hash Verification
// Run before any session that touches constitutional files.
//
// Exit codes:
//   0 — all files present and hash-correct
//   1 — at least one file present but hash WRONG (constitutional violation)
//   2 — at least one file absent (not yet authored; /guardian decision pending)
//       A missing constitutional file is NOT the same as a passing check.
// ============================================================

import { createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'

const FROZEN_FILES = {
  'gate.py': '72196f38974ad22130c18657c88106316cacbb13a57328990f4e5872f5fdb1e9',
  'dna.py':  '9c4d38d80b236d655057f16304ea2d202f644ec0c7ca21db8df0bdcd503971a9',
  'router.py': 'c96e566ce6eb9cec358b2112757142bc88ea4fea9160edb2914c8d711007ac769',
}

let hashFailed = false
let filesMissing = false

for (const [file, expectedHash] of Object.entries(FROZEN_FILES)) {
  if (!existsSync(file)) {
    console.warn(`  WARN: ${file} — file not present; constitutional check INCOMPLETE`)
    filesMissing = true
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
    hashFailed = true
  }
}

if (hashFailed) {
  console.error('\n[FROZEN FILE VIOLATION] One or more constitutional files have been modified.')
  console.error('Requires /guardian APPROVED verdict before proceeding.')
  process.exit(1)
}

if (filesMissing) {
  console.warn('\n[CONSTITUTIONAL FILES ABSENT] gate.py / dna.py / router.py do not exist.')
  console.warn('Integrity check is INCOMPLETE — not a pass.')
  console.warn('Operator must decide: migrate from sovereign-omega/ or author new implementations.')
  console.warn('Creation requires /guardian APPROVED verdict.')
  process.exit(2)
}

console.log('\nAll frozen files present and hash-verified.')

