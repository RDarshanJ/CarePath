# shellcheck shell=bash
# Shared gate environment (checkpoint C1, section 4). Source it from the repo root:
#   source scripts/gate-env.sh <name> <api_port> [web_port]
# It takes a lease on the shared cluster (starting it if needed), gives this run its own
# database carepath_<name>_<pid>, and on exit drops that database and releases the lease.
# The cluster is stopped on exit only if this lease started it and no other lease is live.
# Gates never call scripts/db.sh stop or reset.
if [ "$#" -lt 2 ]; then
  echo "usage: source scripts/gate-env.sh <name> <api_port> [web_port]" >&2
  return 2 2>/dev/null || exit 2
fi
export DB_LEASE_PID=$$
export CAREPATH_DB="carepath_${1}_$$"
export DATABASE_URL="postgresql://carepath:carepath@127.0.0.1:${DB_PORT:-54329}/${CAREPATH_DB}"
export API_PORT="$2" WEB_PORT="${3:-}"
if [ -n "$WEB_PORT" ]; then export CORS_ORIGINS="http://127.0.0.1:${WEB_PORT}"; fi
scripts/db.sh acquire
trap 'scripts/db.sh drop >/dev/null 2>&1 || true; scripts/db.sh release || true' EXIT
