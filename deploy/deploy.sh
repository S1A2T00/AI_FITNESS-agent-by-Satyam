#!/bin/sh
# Zero-guesswork deploy for one Docker host.
#
#   sh deploy.sh <image-ref>        deploy that exact image, roll back on failure
#   sh deploy.sh --rollback         go back to the previously deployed image
#
# Runs from the directory holding docker-compose.prod.yml and .env.
# The app only counts as deployed once its Docker HEALTHCHECK (which calls
# /api/health, including the database) reports "healthy".
set -eu

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.prod.yml"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

log() { printf '[deploy] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

[ -f .env ] || die ".env not found in $(pwd). Copy .env.production.example to .env first."

current_image() { sed -n 's/^APP_IMAGE=//p' .env | tail -n 1; }

set_image() {
  if grep -q '^APP_IMAGE=' .env; then
    # Use | as the sed delimiter: image refs contain / and :
    sed -i "s|^APP_IMAGE=.*|APP_IMAGE=$1|" .env
  else
    printf '\nAPP_IMAGE=%s\n' "$1" >> .env
  fi
}

wait_healthy() {
  cid="$($COMPOSE ps -q app)"
  [ -n "$cid" ] || return 1
  elapsed=0
  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo missing)"
    case "$status" in
      healthy) return 0 ;;
      unhealthy|missing) return 1 ;;
    esac
    sleep 3
    elapsed=$((elapsed + 3))
  done
  return 1
}

start() {
  [ "${SKIP_PULL:-0}" = 1 ] || $COMPOSE pull app || return 1
  $COMPOSE up -d --remove-orphans || return 1
  wait_healthy
}

if [ "${1:-}" = "--rollback" ]; then
  [ -f .previous_image ] || die "No previous image recorded; nothing to roll back to."
  target="$(cat .previous_image)"
else
  target="${1:-}"
  [ -n "$target" ] || die "Usage: deploy.sh <image-ref> | --rollback"
fi

previous="$(current_image)"
log "current:  ${previous:-<none>}"
log "deploying: $target"

set_image "$target"
if start; then
  [ -n "$previous" ] && [ "$previous" != "$target" ] && printf '%s\n' "$previous" > .previous_image
  docker image prune -f >/dev/null 2>&1 || true
  log "SUCCESS: $target is healthy."
  exit 0
fi

log "New version failed its health check. Recent logs:"
$COMPOSE logs --tail 50 app || true

if [ -n "$previous" ] && [ "$previous" != "$target" ]; then
  log "Rolling back to $previous"
  set_image "$previous"
  if start; then
    log "Rolled back; $previous is healthy again."
  else
    log "Rollback also failed. Manual attention needed."
  fi
fi
exit 1
