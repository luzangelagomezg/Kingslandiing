#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "$script_dir/../.." && pwd)"
bundle_path="$script_dir/kinglanding-vm-bundle.tar.gz"

cd "$project_root"
npm run build

if [[ ! -f server.mjs || ! -f dist/index.html || ! -f node_modules/sql.js/dist/sql-wasm.wasm ]]; then
  printf 'Faltan server.mjs, dist/index.html o el motor SQLite después de compilar.\n' >&2
  exit 1
fi

tar -czf "$bundle_path" -C "$project_root" server.mjs dist node_modules/sql.js
printf 'Bundle listo: %s\n' "$bundle_path"