"""server.py — SWARM FastAPI server.

Endpoints:
  GET  /               → serves index.html
  GET  /state          → full current state snapshot (JSON)
  POST /event          → ingest event from forager
  POST /ingest         → ingest a knowledge triplet into QuantumManifold
  POST /dream          → trigger a dream-state cycle on the manifold
  GET  /audit          → return last N lines from swarm_audit.jsonl (?last_n=N)
  WS   /ws             → real-time broadcast to dashboard clients
"""

import json
import os
import pathlib
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import List, Set

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from config import HOST, MAX_EVENTS, PORT
from swarm_core import QuantumManifold, AUDIT_PATH

app = FastAPI(title="SWARM Server")

# ── Manifold (singleton) ──────────────────────────────────────────────────────
manifold = QuantumManifold()

# ── Event bus state ───────────────────────────────────────────────────────────
events: deque = deque(maxlen=MAX_EVENTS)
epiphanies: List[dict] = []
agents: dict = {}
ws_clients: Set[WebSocket] = set()

# ── Models ────────────────────────────────────────────────────────────────────
class Event(BaseModel):
    id: str = ""
    timestamp: str = ""
    agent_id: str
    type: str
    content: str
    cycle: int = 0

class Triplet(BaseModel):
    subject: str
    relation: str
    object: str
    context: List[str] = []


# ── Helpers ───────────────────────────────────────────────────────────────────
def _stamp(ev: Event) -> dict:
    d = ev.model_dump()
    if not d["id"]:
        d["id"] = str(uuid.uuid4())
    if not d["timestamp"]:
        d["timestamp"] = datetime.now(timezone.utc).isoformat()
    return d


async def _broadcast(payload: dict):
    dead = set()
    message = json.dumps(payload)
    for ws in ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = pathlib.Path(__file__).parent / "index.html"
    if html_path.exists():
        return HTMLResponse(html_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h2>SWARM — place index.html in the same directory as server.py</h2>")


@app.get("/state")
async def get_state():
    snap = manifold.get_state_snapshot()
    return JSONResponse({
        "events": list(events),
        "epiphanies": epiphanies,
        "agents": agents,
        "event_count": len(events),
        "epiphany_count": len(epiphanies),
        "agent_count": len(agents),
        "manifold": snap,
    })


@app.post("/event", status_code=202)
async def ingest_event(ev: Event):
    stamped = _stamp(ev)
    events.append(stamped)
    if ev.agent_id not in agents:
        agents[ev.agent_id] = {"first_seen": stamped["timestamp"], "cycle_count": 0}
    agents[ev.agent_id]["last_seen"] = stamped["timestamp"]
    agents[ev.agent_id]["cycle_count"] += 1
    if ev.type == "EPIPHANY":
        epiphanies.append(stamped)
    await _broadcast({"type": "EVENT", "event": stamped})
    return {"ok": True, "id": stamped["id"]}


@app.post("/ingest")
async def ingest_triplet(triplet: Triplet):
    edge_id = manifold.ingest(
        triplet.subject,
        triplet.relation,
        triplet.object,
        triplet.context,
    )
    snap = manifold.get_state_snapshot()
    await _broadcast({"type": "MANIFOLD_UPDATE", "manifold": snap})
    return {"ok": True, "edge_id": edge_id, "total_hyperedges": snap["total_hyperedges"]}


@app.post("/dream")
async def trigger_dream():
    before_epiphanies = manifold.epiphany_count
    manifold.dream_state_cycle()
    snap = manifold.get_state_snapshot()
    new_epiphanies = manifold.epiphany_count - before_epiphanies
    await _broadcast({"type": "MANIFOLD_UPDATE", "manifold": snap})
    return {
        "ok": True,
        "dream_cycle": snap["dream_cycles_completed"],
        "new_epiphanies": new_epiphanies,
        "total_epiphanies": snap["total_epiphanies"],
        "total_hyperedges": snap["total_hyperedges"],
        "manifold": snap,
    }


@app.get("/audit")
async def get_audit(last_n: int = Query(default=50, ge=1, le=1000)):
    if not os.path.exists(AUDIT_PATH):
        return JSONResponse({"entries": [], "count": 0})
    with open(AUDIT_PATH) as f:
        lines = f.readlines()
    tail = lines[-last_n:]
    entries = []
    for line in tail:
        try:
            entries.append(json.loads(line.strip()))
        except Exception:
            pass
    return JSONResponse({"entries": entries, "count": len(entries)})


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    await ws.send_text(json.dumps({
        "type": "SNAPSHOT",
        "events": list(events)[-50:],
        "epiphanies": epiphanies,
        "manifold": manifold.get_state_snapshot(),
    }))
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_clients.discard(ws)


# ── Entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
