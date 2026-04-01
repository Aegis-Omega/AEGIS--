# SOVEREIGN AGI OS & SWARM v8.0 — FULL CONTEXT HANDOFF
**Last Updated:** 2026-04-01
**Operator:** Tarik Skalic, Bihac, Bosnia
**Repo:** `tarikskalic33/myapp`
**Status:** ALL SYSTEMS NOMINAL — swarm_core.py + WebSocket protocol MERGED ✓

*Read this document top-to-bottom before modifying any files.*

---

## 0. What Changed (2026-04-01 — Current Session)

| File | Action | Description |
|------|--------|-------------|
| `swarm_os/swarm/swarm_core.py` | **NEW** | PhotonicResolver (ChromaDB, 384-dim) + QuantumManifold (z-levels, A² dream, audit) |
| `swarm_os/swarm/server.py` | **REWRITTEN** | Full WebSocket protocol: SNAPSHOT / EVENT / MANIFOLD_UPDATE typed envelopes |
| `swarm_os/swarm/index.html` | **NEW** | WebSocket D3 canvas client — nodes orbit by z-level, epiphany arcs, event feed |
| `swarm_os/swarm/config.py` | **NEW** | All constants — PORT, Z_LEVELS, Hz map, SWARM_SELF_AXIOM, paths |
| `swarm_os/swarm/requirements.txt` | **UPDATED** | Added `uvicorn[standard]`, `websockets>=12.0` |
| `swarm_os/swarm/AGENT_BRIEF.md` | **Updated** | Reflects WebSocket protocol + new API endpoints |

**Stale branches to delete** (merged / closed — run from Windows):
```powershell
git push origin --delete `
  claude/swarm-handoff-package-YDdyV `
  codex/fix `
  codex/standardize-websocket-message-handling `
  codex/standardize-websocket-message-handling-d2keap `
  codex/update-boot-logic-and-message-handling `
  codex/update-state-snapshot-with-normalized-collections `
  master
```

---

## 1. Directory Structure & Key Files

This project (`system_rebuild`) is a **decoupled monorepo** containing two isolated pillars: the **S.W.A.R.M. v8.0** cognitive OS and the **Godot 4.6 Game** vertical slice.

```text
system_rebuild/
├── HANDOFF_V8.md                ← THIS FILE (Master Entry Point)
├── .gitignore                   ← Global ignores (excludes .godot, .forge logs, venv)
│
├── godot_client/                ← STANDALONE GODOT PROJECT
│   ├── project.godot            ← Godot Project Root
│   ├── AGENT_GODOT_GUIDE.md     ← Specific guide for Game Developers
│   ├── assets/                  ← Sprites, Tilemaps, Palette
│   ├── scripts/                 ← GDScript logic (Isolated from Python)
│   └── scenes/                  ← Level and Entity scenes
│
└── swarm_os/                    ← COGNITIVE OS & BACKEND
    ├── sovereign_singularity.py ← Master launcher for the OS
    ├── deploy.ps1               ← One-click test + deploy script
    ├── start.ps1                ← One-click local boot (venv + server)
    ├── SWARM_8_0_ARCHITECTURE.md ← 10-Layer Technical Specification
    ├── .forge/                  ← The OS Brain (Knowledge Graph, Audit logs)
    │   └── swarm_audit.jsonl    ← Append-only constitutional audit log
    ├── swarm/                   ← FastAPI Server & Smoke Tests
    │   ├── config.py            ← All constants (PORT, Z_LEVELS, Hz map, paths)  ★ NEW
    │   ├── swarm_core.py        ← PhotonicResolver + QuantumManifold engine       ★ NEW
    │   ├── server.py            ← FastAPI + WebSocket (SNAPSHOT/EVENT/MANIFOLD_UPDATE) ★ REWRITTEN
    │   ├── index.html           ← D3.js WebSocket canvas (z-orbital, epiphany arcs) ★ NEW
    │   ├── demo_seed.py         ← Seeds 12 triplets, no API key needed
    │   ├── start.ps1            ← Windows one-click boot (venv + deps + server + seed + browser)
    │   ├── start.sh             ← Linux/Mac one-click boot
    │   ├── test_endpoints.py    ← Automated smoke tests (7 endpoints)
    │   └── requirements.txt     ← fastapi, uvicorn[standard], websockets, numpy, networkx, chromadb
    ├── tools/                   ← Core Cognitive Implementation (Layers 1-10)
    └── dashboard/               ← Streamlit Visual Cortex & Benchmarks
```

---

## 2. Current State & Recent Fixes

1. **Monorepo decoupled:** `swarm_os/` and `godot_client/` are fully isolated pillars. `.gitignore` covers `.godot/`, `.forge/chroma*`, `.venv/`, `__pycache__`.
2. **Core engine merged (2026-04-01):**
   - `swarm_core.py` now exists — `PhotonicResolver` (ChromaDB cosine similarity) + `QuantumManifold` (z-level hierarchy, A² Dream State, audit log).
   - Z-level = continuous HD score per node: z=4 (SOVEREIGN_EGO, HD≈0) → z=0 (INERTIA, HD≈0.9).
3. **WebSocket protocol live (2026-04-01):**
   - `server.py` rewritten with typed envelopes: `SNAPSHOT` (on connect), `EVENT` (from POST /event), `MANIFOLD_UPDATE` (from POST /ingest and POST /dream).
   - `index.html` serves the real WebSocket D3 canvas — nodes orbit in z-level rings, epiphany arcs on dream discoveries.
4. **Start server:** `.\swarm\start.ps1` — venv → deps → server → seed → browser.
5. **Deploy:** `.\deploy.ps1` — smoke tests → commit → push → Cloud Run (`swarm-manifold`, `europe-west1`, `lifequestplatinum`).

---

## 3. The 10-Layer SWARM Architecture Overview

S.W.A.R.M. (Sovereign Web Architecture for Relational Memory) is the knowledge graphing engine for the Sovereign AGI OS. It measures **Hallucination Delta (HD)** to gauge LLM self-awareness.

*   `HD = |claimed - actual|`
*   `HD 0.0` = Perfect Homeostasis / Truth
*   `HD 1.0` = Total Delusion / Failure

**The 10 Layers:**
1. **Geometric Core** (`orchestrator.py`): Triangle Protocol. All triplets must form closed A-B-C-A loops.
2. **Photonic Memory** (`photonic_resolver.py`): Time rotated vector storage.
3. **Quantum Manifold** (`quantum_manifold.py`): Uncertainty floor integration.
4. **Mirror Core / Ego** (`quantum_manifold.SovereignSelf`): Identity Eigenstate tracking.
5. **Russell Cosmology** (`russell_cosmology.py`): G+R=constant, 9 octaves of scale.
6. **Sovereign Framework** (`sovereign_framework.py`): Multiverse proofs.
7. **Dream State** (`dream_state.py`): Runs matrix multiplication to find hidden second-order connections during REM.
8. **Forager** (`forager.py`): Autonomous Wikipedia scraper.
9. **Equilibrium Server** (`equilibrium_server.py`): FastAPI backend endpoints.
10. **Consciousness Probe** (`sovereign_singularity.ConsciousnessProbe`): Validates model predictions against local ground-truth context in real-time.

---

## 4. Immutable Constitutional Laws
Any agent working on this codebase MUST follow these rules:

1. **NO DIRECT STATE MUTATION**: Do not write to `state.json` or `knowledge_graph.json` directly. You must use atomic `.tmp` renames. 
2. **NO GUESSING**: If there is ambiguity in requirements, throw a `FATAL_BLOCKER` and ask the user. Do not assume logic.
3. **NO UNAUTHORIZED CONNECTIONS**: When working on the Game slice, Node inter-communication MUST use `EventBus.gd` signals, not tight coupling or direct dot-access.

---

## 5. Next Steps for Incoming Agent

### Start locally (Zero Labor)
From the repository root:
```powershell
.\run-swarm.ps1            # venv + deps + server + seed + opens browser
# Open http://localhost:8000/ — WebSocket canvas auto-connects
```

### Deploy (Zero Labor)
From the repository root:
```powershell
.\deploy-swarm.ps1         # test → commit → push → Cloud Run (if gcloud available)
.\deploy-swarm.ps1 -SkipTests
.\deploy-swarm.ps1 -Message "feat: my change"
```

### Delete stale branches (run from Windows once)
```powershell
git push origin --delete `
  claude/swarm-handoff-package-YDdyV `
  codex/fix `
  codex/standardize-websocket-message-handling `
  codex/standardize-websocket-message-handling-d2keap `
  codex/update-boot-logic-and-message-handling `
  codex/update-state-snapshot-with-normalized-collections `
  master
```

### Sovereign OS Integration (post April 17)
- Set `NVIDIA_NIM_API_KEY` in `swarm_os/.env` or system environment
- `QuantumManifold` in `swarm_core.py` is the integration point — call `.ingest()` from the NIM forager
- Benchmark runner: `python benchmark/multi_model_runner.py`

*Note:* Godot work lives entirely in `godot_client/`. See `godot_client/AGENT_GODOT_GUIDE.md`.

---

## 6. Known Caveats & Agent Recommendations

If you are an AI agent picking up this repo, pay attention to the following friction points I encountered during setup:
1. **ChromaDB Locks:** If `swarm_os/swarm/server.py` crashes or is killed ungracefully during tests, `chromadb` may leave locked `.sqlite3` files in `.forge/chroma_ontology/`. If the server hangs indefinitely on startup, run `Stop-Process -Name "python" -Force` and delete the sqlite3 files.
2. **Path Resolution:** Automation scripts (like `deploy.ps1` and `test_endpoints.py`) rely on relative paths like `os.path.dirname(__file__)` to find `.forge`. ALWAYS run Python scripts from within the `swarm_os/` directory so paths don't break.
3. **Demo Mode Fallback:** If you see `Core engine not available: cannot import name 'router'`, the server is safely falling back to canvas-only demo mode. This is expected if the advanced NIM dependencies or core keys are missing. Do not try to "fix" the import unless you are specifically tasked with activating the live core.
4. **Git Push Timeouts:** The initial 100,000+ line repository push occasionally triggered HTTP 408 errors due to size constraints. If Godot binary assets get large, ensure you've configured `git config http.postBuffer 524288000`.

*End of Handoff.*
