#!/usr/bin/env bash
# M1 acceptance (checkpoint C1, section 4): one shell holds a lease on carepath_hold, two
# `pnpm verify` runs start together, and afterwards the cluster is still up, carepath_hold is
# untouched and no carepath_verify_* database remains. Also checks that stop and reset refuse
# while a lease is live, and that the last release stops a cluster that a lease started.
# Exit code is the truth. Run from any directory; logs go to .data/concurrency/.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

LOGS=.data/concurrency
mkdir -p "$LOGS"
PSQL=(psql -h 127.0.0.1 -p "${DB_PORT:-54329}" -U carepath -qtA -v ON_ERROR_STOP=1)
fail() { echo "FAIL: $*" >&2; exit 1; }

if scripts/db.sh status >/dev/null 2>&1; then
  echo "note: cluster already running before the test; the final stop check is skipped"
  started_before=1
else
  started_before=0
fi

# 1. Hold a lease in a background process for the whole test.
holder_pid_file="$LOGS/holder.pid"
(
  export CAREPATH_DB=carepath_hold DB_LEASE_PID=$BASHPID
  scripts/db.sh acquire
  echo "$BASHPID" >"$holder_pid_file"
  # Keep the lease alive until the test kills this subshell.
  while :; do sleep 1; done
) >"$LOGS/holder.log" 2>&1 &
holder=$!
for _ in $(seq 1 60); do [ -s "$holder_pid_file" ] && break; sleep 0.5; done
[ -s "$holder_pid_file" ] || fail "holder did not acquire a lease"
cat "$LOGS/holder.log"
"${PSQL[@]}" -d carepath_hold -c "DROP TABLE IF EXISTS hold_marker" \
  -c "CREATE TABLE hold_marker (v text)" -c "INSERT INTO hold_marker VALUES ('held')"
echo "holder: lease held by pid $(cat "$holder_pid_file"), marker row written to carepath_hold"

# 2. stop and reset refuse while the lease is live.
set +e
scripts/db.sh stop >"$LOGS/stop.out" 2>&1
stop_rc=$?
scripts/db.sh reset >"$LOGS/reset.out" 2>&1
reset_rc=$?
set -e
cat "$LOGS/stop.out" "$LOGS/reset.out"
[ "$stop_rc" = 3 ] || fail "stop exited $stop_rc, expected 3"
[ "$reset_rc" = 3 ] || fail "reset exited $reset_rc, expected 3"
echo "stop and reset refused with exit 3 while leased"

# 3. Two verify runs started together.
pnpm verify >"$LOGS/verify-a.log" 2>&1 &
a=$!
pnpm verify >"$LOGS/verify-b.log" 2>&1 &
b=$!
set +e
wait "$a"
rc_a=$?
wait "$b"
rc_b=$?
set -e
echo "verify A exit $rc_a: $(grep -m1 '^database:' "$LOGS/verify-a.log")"
tail -n 3 "$LOGS/verify-a.log"
echo "verify B exit $rc_b: $(grep -m1 '^database:' "$LOGS/verify-b.log")"
tail -n 3 "$LOGS/verify-b.log"
[ "$rc_a" = 0 ] || fail "verify A exited $rc_a (log: $LOGS/verify-a.log)"
[ "$rc_b" = 0 ] || fail "verify B exited $rc_b (log: $LOGS/verify-b.log)"

# 4. Cluster still up, hold database untouched, no verify databases left.
scripts/db.sh status || fail "cluster stopped under a live lease"
[ "$("${PSQL[@]}" -d carepath_hold -c "SELECT v FROM hold_marker")" = "held" ] ||
  fail "carepath_hold changed"
echo "carepath_hold untouched: hold_marker = held"
left="$("${PSQL[@]}" -d postgres -c "SELECT count(*) FROM pg_database WHERE datname LIKE 'carepath_verify_%'")"
[ "$left" = 0 ] || fail "$left carepath_verify_* database(s) remain"
echo "no carepath_verify_* database remains"

# 5. Release the hold. If its lease started the cluster, the release stops it.
kill "$holder" 2>/dev/null || true
wait "$holder" 2>/dev/null || true
CAREPATH_DB=carepath_hold scripts/db.sh drop
CAREPATH_DB=carepath_hold DB_LEASE_PID="$(cat "$holder_pid_file")" scripts/db.sh release
rm -f "$holder_pid_file"
if [ "$started_before" = 0 ]; then
  if scripts/db.sh status >/dev/null 2>&1; then fail "cluster still running after the last release"; fi
  echo "last release stopped the lease-started cluster"
fi
echo "concurrency acceptance: PASSED"
