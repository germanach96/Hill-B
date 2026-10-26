#!/usr/bin/env bash
# PreToolUse (Bash): Claude Code only changes `main` through pull requests.
# Blocks pushes that target main and commits/merges/rebases made while main is checked out.
cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0
echo "$cmd" | grep -Eq '\bgit\b' || exit 0

block() {
  echo "Bloqueado: en este repo main solo recibe cambios por pull request. $1 Trabaja en otra rama y abre un PR hacia main." >&2
  exit 2
}

# A push whose refspec names main: `main`, `HEAD:main`, `x:refs/heads/main`, `+main`, `:main`.
if echo "$cmd" | grep -Eq '\bgit\b[^;&|]*\bpush\b[^;&|]*([[:space:]:+]|refs/heads/)main([[:space:];&|]|$)'; then
  block 'El comando hace push a main.'
fi

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
if [ "$branch" = "main" ] && echo "$cmd" | grep -Eq '\bgit\b[^;&|]*\b(commit|merge|rebase|cherry-pick|revert|am|push)\b'; then
  block 'La rama actual es main.'
fi
exit 0
