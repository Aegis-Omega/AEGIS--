#!/bin/bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(cd "$ROOT/hub" && npm install && npm run build)

mkdir -p "$ROOT/dist"
cp -r "$ROOT/hub/dist/." "$ROOT/dist/"
