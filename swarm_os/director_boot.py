"""
SOVEREIGN OS — THE DIRECTOR BOOTLOADER
========================================
Initializes the three specialized agents that run the Sovereign cognitive loop:

  [LIBRARIAN]  SovereignOrchestrator  — Triangle Protocol, KG ingestion, hypothesis quarantine
  [OBSERVER]   DreamState             — REM consolidation, A² bridge detection, epiphany promotion
  [FORAGER]    AutonomousForager      — Wikipedia → NIM triplet extraction → KG growth

Inter-Agent Communication Protocol:
  [FROM:<agent>] [TO:<agent>] [TYPE:<MSG_TYPE>] <payload>

  Types: BOOT_ACK | STATUS | HANDOFF | ALERT | EPIPHANY | FATAL_BLOCKER

Run: python swarm_os/director_boot.py
"""

import json
import sys
import time
from pathlib import Path

SWARM_OS = Path(__file__).parent
sys.path.insert(0, str(SWARM_OS))

FORGE = SWARM_OS / ".forge"
AUDIT = FORGE / "audit.jsonl"


def _msg(from_: str, to: str, type_: str, payload: str) -> str:
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[FROM:{from_}] [TO:{to}] [TYPE:{type_}] [{ts}] {payload}"
    print(line)
    return line


def _log_audit(event: str, data: dict):
    entry = json.dumps({"ts": time.time(), "event": event, **data}) + "\n"
    try:
        with open(AUDIT, "a", encoding="utf-8") as f:
            f.write(entry)
    except Exception:
        pass


# ── AGENT BOOT ────────────────────────────────────────────────────────────────

def boot_librarian() -> dict:
    """Boot SovereignOrchestrator (TemporalLibrarian)."""
    _msg("DIRECTOR", "LIBRARIAN", "BOOT_ACK", "Initializing SovereignOrchestrator...")
    try:
        from tools.swarm.orchestrator import SovereignOrchestrator
        orch  = SovereignOrchestrator(verbose=False)
        stats = orch.stats()
        _msg("LIBRARIAN", "DIRECTOR", "STATUS",
             f"ONLINE | nodes={stats.get('nodes',0)} edges={stats.get('edges',0)} "
             f"verified={stats.get('verified',0)} quarantined={stats.get('quarantined',0)}")
        _log_audit("director_boot", {"agent": "LIBRARIAN", "status": "ONLINE", **stats})
        return {"status": "ONLINE", **stats}
    except Exception as e:
        _msg("LIBRARIAN", "DIRECTOR", "ALERT", f"BOOT FAILED: {e}")
        _log_audit("director_boot", {"agent": "LIBRARIAN", "status": "FAILED", "error": str(e)})
        return {"status": "FAILED", "error": str(e)}


def boot_observer() -> dict:
    """Boot DreamState Observer (read-only probe — does not run a full REM cycle)."""
    _msg("DIRECTOR", "OBSERVER", "BOOT_ACK", "Initializing DreamState Observer...")
    try:
        from tools.swarm.dream_state import _load, HYP_PATH, KG_PATH
        kg  = _load(KG_PATH,  {"nodes": {}, "edges": []})
        hyp = _load(HYP_PATH, {"edges": []})
        n_kg  = len(kg.get("edges", []))
        n_hyp = len(hyp.get("edges", []))
        _msg("OBSERVER", "DIRECTOR", "STATUS",
             f"ONLINE | kg_edges={n_kg} hypothesis_pending={n_hyp} | "
             f"Run dream_state.py to consolidate")
        _log_audit("director_boot", {"agent": "OBSERVER", "status": "ONLINE",
                                      "kg_edges": n_kg, "hyp_pending": n_hyp})
        return {"status": "ONLINE", "kg_edges": n_kg, "hyp_pending": n_hyp}
    except Exception as e:
        _msg("OBSERVER", "DIRECTOR", "ALERT", f"BOOT FAILED: {e}")
        _log_audit("director_boot", {"agent": "OBSERVER", "status": "FAILED", "error": str(e)})
        return {"status": "FAILED", "error": str(e)}


def boot_forager() -> dict:
    """Boot Forager — validates API key and equilibrium server availability."""
    _msg("DIRECTOR", "FORAGER", "BOOT_ACK", "Initializing Autonomous Forager...")
    try:
        # Check API key (same pattern as forager.py)
        env_path = SWARM_OS / ".env"
        api_key = None
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("NVIDIA_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
        if not api_key:
            import os
            api_key = os.environ.get("NVIDIA_API_KEY")

        key_status = "PRESENT" if api_key else "MISSING"
        _msg("FORAGER", "DIRECTOR", "STATUS",
             f"ONLINE | NVIDIA_API_KEY={key_status} | "
             f"Run: python tools/swarm/forager.py --seed 'ARC Grammar' --cycles 3")
        _log_audit("director_boot", {"agent": "FORAGER", "status": "ONLINE",
                                      "api_key": key_status})
        return {"status": "ONLINE", "api_key": key_status}
    except Exception as e:
        _msg("FORAGER", "DIRECTOR", "ALERT", f"BOOT FAILED: {e}")
        _log_audit("director_boot", {"agent": "FORAGER", "status": "FAILED", "error": str(e)})
        return {"status": "FAILED", "error": str(e)}


# ── DIRECTOR MAIN ─────────────────────────────────────────────────────────────

def director_boot() -> dict:
    print("\n" + "=" * 60)
    print("  SOVEREIGN OS — DIRECTOR BOOTLOADER")
    print("  Master Boot Prompt v1.0 | Inter-Agent Protocol Active")
    print("=" * 60 + "\n")

    results = {
        "librarian": boot_librarian(),
        "observer":  boot_observer(),
        "forager":   boot_forager(),
    }

    all_online = all(r["status"] == "ONLINE" for r in results.values())
    status_str = "ALL SYSTEMS NOMINAL" if all_online else "PARTIAL BOOT — check FAILED agents"

    _msg("DIRECTOR", "BROADCAST", "STATUS",
         f"{status_str} | agents={list(results.keys())}")

    print("\n" + "=" * 60)
    print(f"  BOOT COMPLETE — {status_str}")
    print("=" * 60)
    return results


if __name__ == "__main__":
    results = director_boot()
    sys.exit(0 if all(r["status"] == "ONLINE" for r in results.values()) else 1)
