#!/usr/bin/env bash
# Push blvck0ut updates to the Pi, register slash commands, and restart pm2.
# Syncs the entire cord/ folder (minus node_modules, .env, DB files, Mac cruft).
# Run from anywhere — paths are absolute.

set -euo pipefail

PI_HOST="armaankhehra@192.168.2.143"
PI_PATH="~/cord"
LOCAL_PATH="$HOME/Desktop/cord"

echo "▼ blvck0ut → pi deploy"
echo "  host:  $PI_HOST"
echo "  local: $LOCAL_PATH"
echo "  pi:    $PI_PATH"
echo

# 1) Sync the whole folder to the Pi, excluding stuff the Pi generates / shouldn't get from the Mac
echo "[1/3] Syncing files..."
rsync -avz \
    --exclude node_modules \
    --exclude .env \
    --exclude '*.db' \
    --exclude '*.sqlite' \
    --exclude '*.sqlite-journal' \
    --exclude .git \
    --exclude .DS_Store \
    --exclude 'data/*.sqlite*' \
    "$LOCAL_PATH/" "$PI_HOST:$PI_PATH/"

# 2) Register slash commands on the Pi (so Discord sees the latest schema + the Pi bot code matches)
echo
echo "[2/3] Registering slash commands..."
ssh "$PI_HOST" "cd $PI_PATH && node deploy-commands.js"

# 3) Restart pm2 so the bot picks up code changes
echo
echo "[3/3] Restarting pm2..."
ssh "$PI_HOST" "pm2 restart blvck0ut"

echo
echo "✓ deployed — check Discord in a few seconds."
