#!/bin/sh
# Stack spr: un branch locale usa-e-getta per ogni stack, MAI commit sul main locale.
#
#   git newstack <nome>        crea stack/<nome> da origin/main appena aggiornato
#   git delstack [-f] [nome]   riporta main allineato a origin/main ed elimina stack/<nome> (senza nome: lo stack su cui si è presente)
#
# delstack rifiuta se lo stack ha commit non ancora su main (PR aperte o chiuse senza merge).
# Con -f elimina comunque: serve per stack abbandonati o mergiati con squash di più commit,
# che git non riesce a riconoscere come già presenti.
set -eu

REMOTE=origin
TRUNK=main
PREFIX=stack/

die() { printf 'errore: %s\n' "$*" >&2; exit 1; }

cmd_new() {
  [ $# -eq 1 ] || die "uso: git newstack <nome>"
  b="$PREFIX$1"
  git check-ref-format --branch "$b" >/dev/null 2>&1 || die "nome non valido: '$1'"
  ! git show-ref --verify --quiet "refs/heads/$b" || die "esiste già: $b"
  git fetch --quiet --prune "$REMOTE"
  git switch --quiet -c "$b" "$REMOTE/$TRUNK"
  printf 'Sei su %s, partito da %s/%s (%s).\n' "$b" "$REMOTE" "$TRUNK" "$(git rev-parse --short HEAD)"
}

cmd_del() {
  force=0
  if [ "${1:-}" = "-f" ]; then force=1; shift; fi
  [ $# -le 1 ] || die "uso: git delstack [-f] [nome]"

  current=$(git symbolic-ref --quiet --short HEAD || true)
  if [ $# -eq 1 ]; then
    b="$PREFIX$1"
  else
    case "$current" in
      "$PREFIX"*) b=$current ;;
      *) die "non sei su uno stack: indica il nome (git delstack <nome>)" ;;
    esac
  fi
  git show-ref --verify --quiet "refs/heads/$b" || die "non esiste: $b"
  [ -z "$(git status --porcelain --untracked-files=no)" ] \
    || die "modifiche non committate: committale o fai git stash prima"

  git fetch --quiet --prune "$REMOTE"

  # Commit dello stack senza un equivalente (stesso patch-id) su origin/main.
  pending=$(git cherry "$REMOTE/$TRUNK" "$b" | grep -c '^+' || true)
  if [ "$pending" -gt 0 ] && [ "$force" -eq 0 ]; then
    git cherry -v "$REMOTE/$TRUNK" "$b" | grep '^+' >&2
    die "$b ha $pending commit non presenti su $REMOTE/$TRUNK.
  PR ancora aperte? Aspetta il merge.
  Stack abbandonato, o mergiato con squash di più commit? git delstack -f"
  fi

  # Il main locale deve restare uno specchio di origin/main.
  if git show-ref --verify --quiet "refs/heads/$TRUNK"; then
    ahead=$(git rev-list --count "$REMOTE/$TRUNK..$TRUNK")
    if [ "$ahead" -gt 0 ]; then
      bk="backup/$TRUNK-$(date +%Y%m%d-%H%M%S)"
      git branch "$bk" "$TRUNK"
      printf 'attenzione: %s aveva %s commit locali, salvati in %s\n' "$TRUNK" "$ahead" "$bk" >&2
    fi
  fi
  git switch --quiet -C "$TRUNK" "$REMOTE/$TRUNK"
  git branch --quiet -D "$b"
  printf 'Eliminato %s. Sei su %s allineato a %s/%s (%s).\n' \
    "$b" "$TRUNK" "$REMOTE" "$TRUNK" "$(git rev-parse --short HEAD)"
}

case "${1:-}" in
  new) shift; cmd_new "$@" ;;
  del) shift; cmd_del "$@" ;;
  *) die "uso: git newstack <nome> | git delstack [-f] [nome]" ;;
esac
