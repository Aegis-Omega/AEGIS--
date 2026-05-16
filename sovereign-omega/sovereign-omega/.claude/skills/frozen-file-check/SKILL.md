---
name: frozen-file-check
description: Automatically invoked when the user mentions gate.py, dna.py, router.py, or the integrated spec, or when any write operation is attempted on a constitutional file. Enforces frozen file protection and blocks unauthorised modifications.
---

# Frozen File Protection Skill

When invoked, immediately run: `node scripts/verify-hashes.mjs`

If a write to a frozen file has been requested, reject it with:
FROZEN FILE PROTECTION: [filename] is a constitutional file with status FROZEN.
Modification requires a /guardian APPROVED verdict. This write has been blocked.

Frozen files and their expected SHA256 hashes:
- gate.py: 72196f38974ad22130c18657c88106316cacbb13a57328990f4e5872f5fdb1e9
- dna.py: 9c4d38d80b236d655057f16304ea2d202f644ec0c7ca21db8df0bdcd503971a9
- router.py: c96e566ce6eb9cec358b2112757142bc88ea4fea9160edb2914c8d711007ac769
- docs/SOVEREIGN_OMEGA_INTEGRATED_SPEC_v2.md: architecture frozen at ChatGPT 0.99

Do not attempt to restore, recreate, or work around a modified frozen file.
Report the violation and halt.
