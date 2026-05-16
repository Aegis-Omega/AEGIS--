"""
SOVEREIGN OMEGA — T0 ↔ T3 Bridge
EPISTEMIC TIER: T0/T3 BOUNDARY
ONE-WAY TELEMETRY PIPE. ZERO WRITE-BACK. ZERO CONTROL AUTHORITY.
ChatGPT synthesis v2.1-Ω — adds sequence ACK guard + idempotency.
"""
import json
import os
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from core_matrix import CoreMatrix

matrix = CoreMatrix()
last_ack_sequence = -1
_lock = threading.Lock()

class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass  # suppress access log

    def do_POST(self):
        global last_ack_sequence
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length)) if length else {}

        if self.path == '/gate_signal':
            seq = data.get('sequence', -1)
            with _lock:
                if seq <= last_ack_sequence:
                    self._respond(400, {'status': 'REJECTED', 'reason': 'SEQUENCE_DESYNC'})
                    return
                last_ack_sequence = seq
            matrix.receive_gate_signal(data['proposal_id'], data['accepted'], seq)
            self._respond(200, {'status': 'ACK', 'sequence': seq})

        elif self.path == '/event':
            payload = bytes.fromhex(data.get('payload_hex', ''))
            verifier = bytes.fromhex(data.get('verifier_hex', '01'))
            context  = bytes.fromhex(data.get('context_hex', ''))
            result = matrix.process_event(payload, verifier, context)
            self._respond(200, result)
        else:
            self._respond(404, {'error': 'NOT_FOUND'})

    def do_GET(self):
        if self.path == '/telemetry':
            self._respond(200, matrix.emit_vcg_telemetry())
        elif self.path == '/health':
            self._respond(200, {'status': 'OK', 'last_ack_sequence': last_ack_sequence})
        else:
            self._respond(404, {'error': 'NOT_FOUND'})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

def run_bridge(port=None):
    port = port or int(os.environ.get('SOVEREIGN_BRIDGE_PORT', '7890'))
    matrix.start()
    server = HTTPServer(('127.0.0.1', port), BridgeHandler)
    print(json.dumps({'event_type': 'BRIDGE_READY', 'port': port}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        matrix.stop()

if __name__ == '__main__':
    run_bridge()
