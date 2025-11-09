#!/bin/bash
set -e

# Fix permissions on /data directory if running as root
if [ "$(id -u)" = "0" ]; then
    echo "Fixing /data permissions..."
    chown -R 1001:0 /data 2>/dev/null || true
    chmod -R g+w /data 2>/dev/null || true
    echo "Switching to user 1001..."
    exec setpriv --reuid=1001 --regid=0 --clear-groups "$@"
fi

# If not root, just execute the command
exec "$@"
