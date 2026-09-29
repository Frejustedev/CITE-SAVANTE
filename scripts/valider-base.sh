#!/usr/bin/env bash
# =============================================================================
# valider-base.sh — validation locale du schéma de Cité Savante
# =============================================================================
# Ce que fait ce script, dans l'ordre, sur une grappe PostgreSQL locale (sans
# Supabase ni Docker) :
#   1. recrée une base jetable (drop puis create), en UTC comme Supabase ;
#   2. y reproduit l'environnement Supabase (supabase/tests/00_stubs_supabase.sql :
#      rôles, schémas auth / storage / extensions, auth.uid(), auth.role()…) ;
#   3. applique les migrations de supabase/migrations/ dans l'ordre, chacune dans
#      une transaction (comme la CLI Supabase), puis les rejoue une seconde fois
#      pour vérifier qu'elles sont idempotentes ;
#   4. charge supabase/seed.sql puis supabase/seed_demo.sql S'ILS EXISTENT (le
#      second avec « set citesavante.demo = 'oui' », sans quoi il refuse de
#      s'exécuter) ;
#   5. exécute chaque test supabase/tests/[0-9]*.test.sql, dans l'ordre ;
#   6. affiche un bilan en français. S'arrête au premier échec (code de sortie 1).
#
# La base de test est laissée en place à la fin, pour inspection.
#
# Variables (toutes facultatives) :
#   PG_BIN     dossier des binaires PostgreSQL
#              (défaut : C:/Users/agbot/Desktop/pgsql/pgsql/bin)
#   PG_HOST    hôte (défaut : localhost)
#   PG_PORT    port de la grappe (défaut : 54390)
#   PG_USER    super-utilisateur de la grappe (défaut : postgres)
#   PG_DB      base jetable, SUPPRIMÉE puis recréée (défaut : citesavante_test).
#              Deux validations lancées en parallèle doivent utiliser deux PG_DB
#              différents. Lettres minuscules, chiffres et « _ » uniquement.
#   SANS_DEMO  1 pour ne pas charger supabase/seed_demo.sql
#   VERBEUX    1 pour afficher chaque vérification réussie des tests
#
# Exemples :
#   pnpm db:valider
#   PG_DB=citesavante_test_2 SANS_DEMO=1 bash scripts/valider-base.sh
# =============================================================================
set -euo pipefail

PG_BIN="${PG_BIN:-C:/Users/agbot/Desktop/pgsql/pgsql/bin}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-54390}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-citesavante_test}"
SANS_DEMO="${SANS_DEMO:-0}"
VERBEUX="${VERBEUX:-0}"

# Messages de psql en anglais non localisés (évite les accents mal encodés de la
# console Windows), échanges avec le serveur en UTF-8.
export LC_ALL=C
export PGCLIENTENCODING=UTF8
export PGAPPNAME=valider-base

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

# ── Contrôles préalables ─────────────────────────────────────────────────────
erreur() {
  printf 'ERREUR : %s\n' "$1" >&2
  exit 1
}

# La base est supprimée : on refuse tout nom qui pourrait désigner autre chose
# qu'une base de test.
if [[ ! "$PG_DB" =~ ^[a-z_][a-z0-9_]*$ ]]; then
  erreur "PG_DB « $PG_DB » invalide : lettres minuscules, chiffres et « _ » uniquement."
fi
case "$PG_DB" in
  postgres | template0 | template1)
    erreur "PG_DB « $PG_DB » refusé : ce script supprime la base indiquée."
    ;;
esac
if [[ ! "$PG_PORT" =~ ^[0-9]+$ ]]; then
  erreur "PG_PORT « $PG_PORT » invalide."
fi

binaire() {
  if [[ -x "$PG_BIN/$1.exe" ]]; then
    printf '%s' "$PG_BIN/$1.exe"
  elif [[ -x "$PG_BIN/$1" ]]; then
    printf '%s' "$PG_BIN/$1"
  else
    erreur "$1 introuvable dans PG_BIN ($PG_BIN)."
  fi
}
PSQL="$(binaire psql)"
PG_ISREADY="$(binaire pg_isready)"

if ! "$PG_ISREADY" -q -h "$PG_HOST" -p "$PG_PORT" > /dev/null 2>&1; then
  cat >&2 << EOF
ERREUR : la grappe PostgreSQL ne répond pas sur $PG_HOST:$PG_PORT.
Pour la grappe du projet, la démarrer avec :
  "$PG_BIN/pg_ctl.exe" -D C:/Users/agbot/Desktop/pgsql/data_citesavante \\
    -l C:/Users/agbot/Desktop/pgsql/data_citesavante.server.log -o "-p $PG_PORT" -w start > /dev/null 2>&1
EOF
  exit 1
fi

shopt -s nullglob
MIGRATIONS=(supabase/migrations/*.sql)
TESTS=(supabase/tests/[0-9]*.test.sql)
STUBS="supabase/tests/00_stubs_supabase.sql"

[[ -f "$STUBS" ]] || erreur "$STUBS introuvable."
((${#MIGRATIONS[@]} > 0)) || erreur "aucune migration dans supabase/migrations/."

JOURNAUX="$(mktemp -d)"
trap 'rm -rf "$JOURNAUX"' EXIT

DEBUT=$SECONDS
TOTAL_VERIFS=0
declare -a BILAN_TESTS=()

# ── Exécution d'un fichier SQL ───────────────────────────────────────────────
# executer <étiquette> <mode> <fichier> [options psql supplémentaires…]
#   mode « transaction » : tout le fichier dans une transaction, avertissements
#                          seulement (migrations, stubs, seeds) ;
#   mode « test »        : le fichier gère lui-même sa transaction, les NOTICE
#                          « OK | … » sont comptées.
# En cas d'échec : affiche la sortie de psql et arrête le script.
DERNIER_JOURNAL=""
executer() {
  local etiquette="$1" mode="$2" fichier="$3"
  shift 3
  local journal
  journal="$JOURNAUX/$(basename "$fichier").$RANDOM.log"
  local -a options=(-X -q -v ON_ERROR_STOP=1 -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB")
  local niveau="warning"
  if [[ "$mode" == "transaction" ]]; then
    options+=(-1)
  else
    niveau="notice"
  fi
  if ! PGOPTIONS="-c client_min_messages=$niveau" "$PSQL" "${options[@]}" "$@" -f "$fichier" > "$journal" 2>&1; then
    printf '\n[ÉCHEC] %s (%s)\n' "$etiquette" "$fichier"
    printf -- '--- sortie de psql ---\n'
    tail -n 80 "$journal"
    printf -- '----------------------\n'
    printf '\nVALIDATION ÉCHOUÉE après %s s (base %s conservée pour inspection).\n' "$((SECONDS - DEBUT))" "$PG_DB"
    exit 1
  fi
  DERNIER_JOURNAL="$journal"
}

printf 'Validation de la base — Cité Savante\n'
printf 'Grappe %s:%s, base jetable « %s »\n\n' "$PG_HOST" "$PG_PORT" "$PG_DB"

# ── 1. Base jetable ──────────────────────────────────────────────────────────
printf '1. Création de la base %s (fuseau UTC, comme Supabase)\n' "$PG_DB"
if ! "$PSQL" -X -q -v ON_ERROR_STOP=1 -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
  -c "set client_min_messages = warning" \
  -c "drop database if exists \"$PG_DB\" with (force)" \
  -c "create database \"$PG_DB\"" \
  -c "alter database \"$PG_DB\" set timezone to 'UTC'" > "$JOURNAUX/creation.log" 2>&1; then
  cat "$JOURNAUX/creation.log"
  erreur "impossible de recréer la base $PG_DB."
fi

# ── 2. Environnement Supabase simulé ─────────────────────────────────────────
printf '2. Environnement Supabase simulé (%s)\n' "$STUBS"
executer "environnement Supabase simulé" transaction "$STUBS"

# ── 3. Migrations, puis rejeu ────────────────────────────────────────────────
printf '3. Migrations (%s fichiers)\n' "${#MIGRATIONS[@]}"
for migration in "${MIGRATIONS[@]}"; do
  executer "migration $(basename "$migration")" transaction "$migration"
  printf '   [OK] %s\n' "$(basename "$migration")"
done
printf '   Rejeu des migrations (idempotence)\n'
for migration in "${MIGRATIONS[@]}"; do
  executer "rejeu de $(basename "$migration")" transaction "$migration"
done
printf '   [OK] les %s migrations se rejouent sans erreur\n' "${#MIGRATIONS[@]}"

# ── 4. Données initiales ─────────────────────────────────────────────────────
printf '4. Données initiales\n'
ETAT_SEED="absent (ignoré)"
if [[ -f supabase/seed.sql ]]; then
  executer "supabase/seed.sql" transaction supabase/seed.sql
  ETAT_SEED="chargé"
fi
printf '   seed.sql      : %s\n' "$ETAT_SEED"

ETAT_DEMO="absent (ignoré)"
if [[ "$SANS_DEMO" == "1" ]]; then
  ETAT_DEMO="non chargé (SANS_DEMO=1)"
elif [[ -f supabase/seed_demo.sql ]]; then
  executer "supabase/seed_demo.sql" transaction supabase/seed_demo.sql -c "set citesavante.demo = 'oui'"
  ETAT_DEMO="chargé"
fi
printf '   seed_demo.sql : %s\n' "$ETAT_DEMO"

# ── 5. Tests ─────────────────────────────────────────────────────────────────
printf '5. Tests (%s fichiers)\n' "${#TESTS[@]}"
for test in "${TESTS[@]}"; do
  executer "test $(basename "$test")" test "$test"
  n=$(grep -c 'NOTICE:  OK | ' "$DERNIER_JOURNAL" || true)
  if ((n == 0)); then
    printf '\n[ÉCHEC] %s : aucune vérification exécutée (NOTICE « OK | … » absentes).\n' "$(basename "$test")"
    exit 1
  fi
  TOTAL_VERIFS=$((TOTAL_VERIFS + n))
  BILAN_TESTS+=("$(printf '%-28s %4s vérifications' "$(basename "$test")" "$n")")
  printf '   [OK] %-28s %4s vérifications\n' "$(basename "$test")" "$n"
  if [[ "$VERBEUX" == "1" ]]; then
    grep 'NOTICE:  OK | ' "$DERNIER_JOURNAL" | sed 's/^.*NOTICE:  OK | /        - /'
  fi
done

# ── 6. Bilan ─────────────────────────────────────────────────────────────────
printf '\n==============================================================\n'
printf 'Bilan de la validation (base %s, port %s)\n' "$PG_DB" "$PG_PORT"
printf '==============================================================\n'
printf '  Environnement Supabase simulé : appliqué\n'
printf '  Migrations                    : %s appliquées, rejouées sans erreur\n' "${#MIGRATIONS[@]}"
printf '  seed.sql                      : %s\n' "$ETAT_SEED"
printf '  seed_demo.sql                 : %s\n' "$ETAT_DEMO"
printf '  Tests                         : %s fichiers, %s vérifications, 0 échec\n' "${#TESTS[@]}" "$TOTAL_VERIFS"
for ligne in "${BILAN_TESTS[@]}"; do
  printf '    - %s\n' "$ligne"
done
printf '  Durée                         : %s s\n' "$((SECONDS - DEBUT))"
printf '\nVALIDATION RÉUSSIE\n'
