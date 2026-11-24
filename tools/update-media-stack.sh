#!/bin/sh
# Werkt Overseerr, Radarr en Sonarr in één keer bij op een QNAP NAS (Container Station).
#
# Gebruik (via SSH op de NAS):
#   sh update-media-stack.sh                # werk de standaardcontainers bij
#   sh update-media-stack.sh --dry-run      # laat alleen zien wat er zou gebeuren
#   sh update-media-stack.sh --no-prune     # oude, ongebruikte images niet opruimen
#   CONTAINERS="overseerr radarr sonarr prowlarr" sh update-media-stack.sh
#
# Containers die met docker compose (of als Container Station-"applicatie") zijn gemaakt,
# worden automatisch opnieuw aangemaakt met het nieuwe image; je instellingen blijven
# behouden zolang /config op een volume of gedeelde map staat. Containers die met een
# losse "docker run" zijn gemaakt, worden alleen gemeld: die moet je zelf opnieuw maken.

set -eu

CONTAINERS="${CONTAINERS:-overseerr radarr sonarr}"
DRY_RUN=0
PRUNE=1

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-prune) PRUNE=0 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Onbekende optie: $arg (zie --help)" >&2; exit 2 ;;
  esac
done

log() { printf '%s  %s\n' "$(date '+%H:%M:%S')" "$*"; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then log "  [dry-run] $*"; else "$@"; fi
}

# --- docker vinden: bij SSH op een QNAP staat die vaak niet in PATH ---------------
find_docker() {
  if command -v docker >/dev/null 2>&1; then command -v docker; return 0; fi
  if command -v getcfg >/dev/null 2>&1; then
    cs_path=$(getcfg container-station Install_Path -f /etc/config/qpkg.conf 2>/dev/null || true)
    if [ -n "$cs_path" ] && [ -x "$cs_path/bin/docker" ]; then echo "$cs_path/bin/docker"; return 0; fi
  fi
  for p in /share/CACHEDEV*_DATA/.qpkg/container-station/bin/docker; do
    if [ -x "$p" ]; then echo "$p"; return 0; fi
  done
  return 1
}

DOCKER=$(find_docker) || {
  echo "docker niet gevonden. Is Container Station geïnstalleerd en gestart?" >&2
  exit 1
}
PATH="$(dirname "$DOCKER"):$PATH"
export PATH

compose() {
  if "$DOCKER" compose version >/dev/null 2>&1; then
    "$DOCKER" compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "docker compose niet gevonden" >&2
    return 1
  fi
}

# Leest één veld van een container; lege string als het label ontbreekt.
field() {
  v=$("$DOCKER" inspect -f "$2" "$1" 2>/dev/null || true)
  [ "$v" = "<no value>" ] && v=""
  printf '%s' "$v"
}
label() { field "$1" "{{index .Config.Labels \"$2\"}}"; }

wait_running() {
  i=0
  while [ $i -lt 30 ]; do
    [ "$(field "$1" '{{.State.Status}}')" = "running" ] && return 0
    sleep 2
    i=$((i + 2))
  done
  return 1
}

UPDATED=""; CURRENT=""; MANUAL=""; FAILED=""; MISSING=""

update_one() {
  name=$1
  if ! "$DOCKER" inspect "$name" >/dev/null 2>&1; then
    log "$name: container niet gevonden, overgeslagen"
    MISSING="$MISSING $name"
    return 0
  fi

  image=$(field "$name" '{{.Config.Image}}')
  old_id=$(field "$name" '{{.Image}}')
  project=$(label "$name" com.docker.compose.project)
  workdir=$(label "$name" com.docker.compose.project.working_dir)
  files=$(label "$name" com.docker.compose.project.config_files)
  service=$(label "$name" com.docker.compose.service)

  if [ -n "$project" ] && [ -n "$service" ] && [ -n "$files" ]; then
    # Compose-bestanden opbouwen als -f argumenten (label is komma-gescheiden).
    set --
    old_ifs=$IFS
    IFS=,
    for f in $files; do
      case "$f" in /*) ;; *) f="$workdir/$f" ;; esac
      if [ ! -f "$f" ]; then
        IFS=$old_ifs
        log "$name: compose-bestand $f bestaat niet meer, overgeslagen"
        FAILED="$FAILED $name"
        return 0
      fi
      set -- "$@" -f "$f"
    done
    IFS=$old_ifs

    log "$name: compose-project '$project', service '$service' ($image)"
    if ! run compose -p "$project" --project-directory "$workdir" "$@" pull "$service" \
      || ! run compose -p "$project" --project-directory "$workdir" "$@" up -d --no-deps "$service"; then
      log "$name: bijwerken MISLUKT"
      FAILED="$FAILED $name"
      return 0
    fi
    [ "$DRY_RUN" -eq 1 ] && return 0

    if ! wait_running "$name"; then
      log "$name: draait niet na het bijwerken! Bekijk: docker logs $name"
      FAILED="$FAILED $name"
    elif [ "$(field "$name" '{{.Image}}')" != "$old_id" ]; then
      log "$name: bijgewerkt en draait"
      UPDATED="$UPDATED $name"
    else
      log "$name: was al de nieuwste versie"
      CURRENT="$CURRENT $name"
    fi
  else
    log "$name: geen compose-labels gevonden, alleen image ophalen ($image)"
    if ! run "$DOCKER" pull "$image"; then
      log "$name: ophalen MISLUKT"
      FAILED="$FAILED $name"
      return 0
    fi
    [ "$DRY_RUN" -eq 1 ] && return 0
    new_id=$("$DOCKER" image inspect -f '{{.Id}}' "$image" 2>/dev/null || true)
    if [ "$new_id" = "$old_id" ]; then
      log "$name: was al de nieuwste versie"
      CURRENT="$CURRENT $name"
    else
      log "$name: nieuw image binnen, maar container is met 'docker run' gemaakt: maak hem zelf opnieuw aan"
      MANUAL="$MANUAL $name"
    fi
  fi
}

log "docker: $DOCKER"
[ "$DRY_RUN" -eq 1 ] && log "DRY-RUN: er wordt niets gewijzigd"

for c in $CONTAINERS; do
  update_one "$c"
done

if [ "$PRUNE" -eq 1 ] && [ "$DRY_RUN" -eq 0 ]; then
  log "Oude, ongebruikte images opruimen"
  "$DOCKER" image prune -f >/dev/null || log "Opruimen mislukt (niet erg)"
fi

echo
echo "===== Samenvatting ====="
[ -n "$UPDATED" ] && echo "Bijgewerkt:         $UPDATED"
[ -n "$CURRENT" ] && echo "Al actueel:         $CURRENT"
[ -n "$MANUAL" ]  && echo "Handmatig opnieuw:  $MANUAL"
[ -n "$MISSING" ] && echo "Niet gevonden:      $MISSING"
[ -n "$FAILED" ]  && echo "MISLUKT:            $FAILED"

[ -z "$FAILED" ]
