# AEGIS Architecture

## System Overview

```mermaid
graph TD
    HUB["🏠 hub/<br/>Landing Page<br/>(Vite + React)"]

    HUB --> PP["🎯 platform-picker/<br/>Platform Picker<br/>$19"]
    HUB --> HG["⚡ hook-generator/<br/>Hook Generator<br/>$19"]
    HUB --> CC["📅 content-calendar/<br/>Content Calendar<br/>$19"]

    PP --> SHARED["📦 packages/shared/<br/>callDashScope · useAsyncForm<br/>ErrorAlert · LoadingSpinner<br/>ScoreBar · ToolkitFooter"]
    HG --> SHARED
    CC --> SHARED

    SHARED --> DASH["☁️ DashScope API<br/>dashscope.aliyuncs.com<br/>Qwen model (buyer key)"]

    COCKPIT["🖥️ cockpit/<br/>AEGIS Cockpit<br/>Dual-mode streaming chat"]
    COCKPIT --> DASH
    COCKPIT --> OLLAMA["🦙 Ollama<br/>localhost:11434<br/>(ECS server)"]
    COCKPIT --> BRIDGE["🔌 sovereign-omega-v2/<br/>python/bridge.py<br/>port 7890"]

    BRIDGE --> MATRIX["🧠 CoreMatrix<br/>PGCS · TGCS · AFSE<br/>Epoch failsafe · VCG"]

    SOVTS["📐 sovereign-omega-v2/<br/>TypeScript Runtime<br/>8 gates · 184 tests"]
    SOVTS --> BRIDGE
```

## Products (Track B — Revenue)

| Product | Price | Stack | Deploy |
|---------|-------|-------|--------|
| Platform Picker | $19 | Vite + React + Tailwind + DashScope | Vercel |
| Hook Generator | $19 | Vite + React + Tailwind + DashScope | Vercel |
| Content Calendar | $19 | Vite + React + Tailwind + DashScope | Vercel |
| Bundle (any 2) | $29 | — | — |
| Full Toolkit (all 3) | $39 | — | — |

## Shared Infrastructure (`packages/shared/`)

| Module | Purpose |
|--------|---------|
| `lib/dashscope.ts` | Generic `callDashScope<T>()` — single DashScope fetch, JSON parse, fence-strip |
| `hooks/useAsyncForm.ts` | `idle → loading → results → error` state machine with `submit` / `reset` |
| `components/ErrorAlert.tsx` | Unified red error banner (lucide AlertCircle) |
| `components/LoadingSpinner.tsx` | Animated spinner with configurable color class and message |
| `components/ScoreBar.tsx` | Reusable 0–N score progress bar |
| `components/ToolkitFooter.tsx` | Cross-product "Also in the toolkit" footer strip |

## Sovereign Omega v2 (Track A — Governance)

```
TypeScript Runtime (src/)          Python Core Matrix (python/)
├── core/
│   ├── canonicalize.ts  Gate 1    ├── pgcs.py   — swap I/O criterion
│   ├── fixedpoint.ts    Gate 6    ├── tgcs.py   — variance tracking
│   ├── semantics.ts     Ω⁵.5     ├── afse.py   — R² estimation
│   └── wasm-interface.ts Ω⁵.7    ├── core_matrix.py — M1/M2/M3
├── event/                          └── bridge.py  — HTTP port 7890
│   ├── store.ts         Gate 2          GET /telemetry → cockpit
│   ├── workflow.ts      E5 schemas      POST /event
│   └── workflow-recorder.ts Ω⁵.8       POST /gate_signal
├── gate/                               GET /health
│   ├── hoeffding.ts     Gate 6
│   └── risk.ts          Gate 6
├── calibration/vcg.ts   Gate 5
├── projection/reducer.ts Gate 4
├── pipeline/index.ts    Gate 7
├── registry/ (22 nodes) Ω⁵
└── runtime/             Gate 8
```

### Semantic Particle Registry (src/registry/)

22 classified T0/T1 nodes, each with: epistemic tier, gate coverage, proof coverage,
ancestry edges, holonic scale, mutation authority. No T4/T5 entries permitted.

## Cockpit Telemetry Flow

```
sovereign-omega-v2/python/bridge.py
  └─ GET /telemetry (every 5s) ──→ cockpit/src/lib/telemetry.ts
                                      └─ subscribeTelemetry()
                                           └─ TelemetryPanel.tsx
                                                (Sidebar → Runtime section)
```

## Environment Variables

Every product uses the same key:
```
VITE_DASHSCOPE_API_KEY=sk-...       # required
VITE_DASHSCOPE_MODEL=qwen-plus      # optional, default: qwen-plus
```

Cockpit additionally uses:
```
VITE_OLLAMA_BASE_URL=http://ECS_IP:11434/v1
```
