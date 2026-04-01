"""
swarm_core.py — S.W.A.R.M. OS v6.0
"""
import time, hashlib, json, os
import numpy as np
import networkx as nx
import chromadb
from scipy.fft import fft
from datetime import datetime, timezone

FORGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".forge")
os.makedirs(FORGE_DIR, exist_ok=True)
AUDIT_PATH = os.path.join(FORGE_DIR, "swarm_audit.jsonl")

def audit(event: str, data: dict):
    entry = {"ts": datetime.now(timezone.utc).isoformat(), "event": event, **data}
    with open(AUDIT_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"[AUDIT] {entry['ts']} | {event} | {data}")

LEVEL_NAMES = {0:"INERTIA",1:"RADIATION",2:"EQUILIBRATION",3:"VECTOR_RESOLUTION",4:"SOVEREIGN_EGO"}

def get_frequency(level: int) -> float:
    return 261.63 * (4 ** (max(0,min(9,level)) / 9))

class PhotonicResolver:
    def __init__(self):
        self.client = chromadb.Client()
        self.ontology = self.client.get_or_create_collection(name="swarm_ontology", metadata={"hnsw:space":"cosine"})
        audit("RESOLVER_INIT", {"status":"ok"})

    def resolve(self, term: str) -> dict:
        term = term.lower().strip()
        res = self.ontology.query(query_texts=[term], n_results=1, include=['metadatas','documents','distances'])
        if res['distances'] and res['distances'][0] and res['distances'][0][0] < 0.22:
            meta = res['metadatas'][0][0]
            audit("RESOLVE_HIT", {"query":term,"resolved":res['documents'][0][0],"z_level":meta['z_level']})
            return {"term":res['documents'][0][0],"phase":meta['phase'],"z_level":meta['z_level']}
        vec = np.random.rand(384)
        phase = float(np.angle(fft(vec)).mean())
        self.ontology.add(documents=[term], ids=[term], embeddings=[vec.tolist()], metadatas=[{"phase":phase,"z_level":0}])
        audit("RESOLVE_NEW", {"term":term,"z_level":0,"phase":round(phase,4)})
        return {"term":term,"phase":phase,"z_level":0}

    def mutate_phase(self, term: str, eta: float, resonance: float):
        res = self.ontology.get(ids=[term], include=['metadatas'])
        if res and res['metadatas'] and res['metadatas'][0]:
            meta = res['metadatas'][0][0]
            old = meta['phase']
            new = old + (eta * resonance)
            self.ontology.update(ids=[term], metadatas=[{"phase":new,"z_level":meta['z_level']}])
            audit("OBSERVER_EFFECT", {"term":term,"delta":round(eta*resonance,6)})

class QuantumManifold:
    def __init__(self):
        self.resolver = PhotonicResolver()
        self.hyperedges = {}
        self.epoch = time.time()
        self.eta = 0.005
        self.dream_cycle_count = 0
        self.epiphany_count = 0
        self.ego_id = "SWARM_SELF_AXIOM"
        self.resolver.ontology.add(documents=[self.ego_id], ids=[self.ego_id], embeddings=[np.ones(384).tolist()], metadatas=[{"phase":0.0,"z_level":4}])
        audit("EGO_INIT", {"ego_id":self.ego_id,"z_level":4,"level":LEVEL_NAMES[4]})

    def ingest(self, s_raw: str, r: str, o_raw: str, context: list):
        s_data = self.resolver.resolve(s_raw)
        o_data = self.resolver.resolve(o_raw)
        s, o = s_data['term'], o_data['term']
        dt = time.time() - self.epoch
        omega = (get_frequency(s_data['z_level']) + get_frequency(o_data['z_level'])) / 2
        resonance = float(np.exp(-1j * omega * dt).real)
        edge_id = hashlib.sha256(f"{s}_{r}_{o}_{sorted(context)}".encode()).hexdigest()[:12]
        self.hyperedges[edge_id] = {"s":s,"r":r,"o":o,"context":context,"nodes":list(set([s,o]+context)),"resonance":resonance,"ts":time.time()}
        audit("INGEST", {"edge_id":edge_id,"subject":s,"relation":r,"object":o,"resonance":round(resonance,6),"total_edges":len(self.hyperedges)})
        return edge_id

    def dream_state_cycle(self):
        if len(self.hyperedges) < 3:
            audit("DREAM_SKIPPED", {"edge_count":len(self.hyperedges),"required":3})
            return
        self.dream_cycle_count += 1
        audit("DREAM_START", {"cycle":self.dream_cycle_count,"edge_count":len(self.hyperedges)})
        G = nx.Graph()
        for eid, data in self.hyperedges.items():
            G.add_edge(data['s'], data['o'], weight=abs(data['resonance']))
        nodes = list(G.nodes())
        adj = nx.to_numpy_array(G, nodelist=nodes)
        paths_2 = np.dot(adj, adj)
        cycle_epiphanies = 0
        for i in range(len(nodes)):
            for j in range(i+1, len(nodes)):
                if adj[i,j] == 0 and paths_2[i,j] > 0.5:
                    u, v = nodes[i], nodes[j]
                    self.epiphany_count += 1
                    cycle_epiphanies += 1
                    audit("EPIPHANY", {"cycle":self.dream_cycle_count,"node_a":u,"node_b":v,"path_weight":round(float(paths_2[i,j]),6),"total_epiphanies":self.epiphany_count})
                    self.ingest(u, "resonates_with", v, ["dream_state_epiphany"])
                    for term in [u, v]:
                        mr = self.resolver.ontology.get(ids=[term], include=['metadatas'])
                        if mr and mr['metadatas'] and mr['metadatas'][0]:
                            meta = mr['metadatas'][0][0]
                            old_z = meta['z_level']
                            new_z = min(4, old_z+1)
                            self.resolver.ontology.update(ids=[term], metadatas=[{"phase":meta['phase'],"z_level":new_z}])
                            if new_z != old_z:
                                audit("SYNTROPY_PROMOTION", {"term":term,"old_z":old_z,"new_z":new_z,"new_level":LEVEL_NAMES.get(new_z)})
        audit("DREAM_COMPLETE", {"cycle":self.dream_cycle_count,"epiphanies_this_cycle":cycle_epiphanies,"total_epiphanies":self.epiphany_count,"total_edges":len(self.hyperedges)})

    def get_state_snapshot(self) -> dict:
        return {"ts":datetime.now(timezone.utc).isoformat(),"version":"swarm-6.0.0","total_hyperedges":len(self.hyperedges),"dream_cycles_completed":self.dream_cycle_count,"total_epiphanies":self.epiphany_count,"ego_id":self.ego_id,"ego_z_level":4,"eta":self.eta}
