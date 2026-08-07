#!/bin/sh
# Repack this skill into the frontend's public dir, where the MCP page links it
# as /blinkbox-skill.zip. Run after editing any file here.
set -e
root=$(cd "$(dirname "$0")/../../.." && pwd)
out="$root/apps/frontend/public/blinkbox-skill.zip"
rm -f "$out"
cd "$root/.claude/skills"
zip -rX -9 "$out" blinkbox -x '*.DS_Store' 'blinkbox/pack.sh' >/dev/null
echo "packed → $out"
unzip -l "$out"
