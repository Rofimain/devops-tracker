#!/bin/sh
set -e

# Named volume /app/uploads is often root-owned; app runs as nextjs (uid 1001).
mkdir -p /app/uploads/docs /app/uploads/report-monitoring
chown -R nextjs:nodejs /app/uploads

exec su-exec nextjs "$@"
