#!/usr/bin/env bash
# Checks VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID against Vercel's API before the CLI runs, and names
# the wrong one - the CLI itself only says "Project not found" or "Could not retrieve Project Settings".
#
# Mirrors what `vercel pull` needs (its getLinkedProject): the owner - GET /teams/<team_...>, or /v2/user for a
# personal account - then GET /v9/projects/<prj_...>. A token scoped to a team or a project cannot read /v2/user
# (404), so that is only asked for personal accounts. A mistyped or revoked token gets 403 with invalidToken:
# true; a valid token that may not act for the owner gets a plain 403. A token scoped to the project alone reads
# the project but not its team, and the CLI needs both (vercel/vercel#17506).
set -euo pipefail
: "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}"

api() { curl -sS -o "$2" -w '%{http_code}' -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com$1"; }
why() { jq -r '.error | "Vercel: \(.code // "?") - \(.message // "?")"' "$1" 2>/dev/null || echo "no error body"; }
stop() {  # stop <what is wrong> <what to do>
  echo "::error::$1"
  printf '### Deploy stopped before Vercel\n\n**%s.**\n\n%s\n' "$1" "$2" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  exit 1
}
token_fix='Create a token under Account Settings → Tokens with Scope = the team that owns the project (or Full Account - a token scoped to the project alone cannot deploy, vercel/vercel#17506) and replace VERCEL_TOKEN.'
invalid() { if jq -e '.error.invalidToken == true' "$1" >/dev/null 2>&1; then
  stop "VERCEL_TOKEN is not a valid token ($(why "$1"))" "It is mistyped, expired or revoked. $token_fix"; fi; }
status_page="Re-run the workflow; if it persists, check https://www.vercel-status.com."

# 1. The owner named by VERCEL_ORG_ID: a team, or a personal account.
case "$VERCEL_ORG_ID" in
  team_*)
    code=$(api "/teams/$VERCEL_ORG_ID" /tmp/org.json)
    case "$code" in
      200) scope="team $(jq -r .slug /tmp/org.json)"; q="?teamId=$VERCEL_ORG_ID" ;;
      403) invalid /tmp/org.json
           if [ "$(api "/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID" /tmp/project.json)" = 200 ]; then
             owner=$(jq -r '.accountId // "?"' /tmp/project.json)
             [ "$owner" != "$VERCEL_ORG_ID" ] || stop "the token is scoped to the project alone: it reads the project but not its team ($(why /tmp/org.json))" "VERCEL_ORG_ID and VERCEL_PROJECT_ID are right. $token_fix"
             stop "the project belongs to $owner, not to VERCEL_ORG_ID" "Set VERCEL_ORG_ID to $owner; the token's Scope must be that team."
           fi
           stop "the token cannot act for team $VERCEL_ORG_ID ($(why /tmp/org.json))" "Its Scope is another team or a project, its account is not a member of the team, or VERCEL_ORG_ID is the wrong team (Team → Settings → General → Team ID). $token_fix" ;;
      404) stop "VERCEL_ORG_ID names no team ($(why /tmp/org.json))" "Use the Team ID from Team → Settings → General." ;;
      *)   stop "Vercel answered HTTP $code for the team ($(why /tmp/org.json))" "$status_page" ;;
    esac ;;
  *)
    code=$(api /v2/user /tmp/user.json)
    case "$code" in
      200) user=$(jq -r .user.id /tmp/user.json)
           [ "$user" = "$VERCEL_ORG_ID" ] || stop "VERCEL_ORG_ID is neither the token's user id ($user) nor a team id" "Use $user for a personal account, or the team's id (team_..., not its slug)."
           scope="the personal account of $(jq -r .user.username /tmp/user.json)"; q="" ;;
      403) invalid /tmp/user.json; stop "the token cannot read its own account ($(why /tmp/user.json))" "$token_fix" ;;
      404) stop "the token is scoped to a team or a project, yet VERCEL_ORG_ID is not a team id ($(why /tmp/user.json))" "Set VERCEL_ORG_ID to the team's id (team_...), or use a Full Account token for a personal account." ;;
      *)   stop "Vercel answered HTTP $code for the account ($(why /tmp/user.json))" "$status_page" ;;
    esac ;;
esac

# 2. The project, in that owner. vercel.json overrides Framework Preset and Root Directory is not overridable.
code=$(api "/v9/projects/$VERCEL_PROJECT_ID$q" /tmp/project.json)
case "$code" in
  200) echo "Vercel project '$(jq -r .name /tmp/project.json)' found in $scope; the token can act for it."
       root=$(jq -r '.rootDirectory // ""' /tmp/project.json)
       [ -z "$root" ] || echo "::warning::The project's Root Directory is '$root'; it must stay empty - the CLI already runs inside js/ui." ;;
  404) api "/v9/projects?limit=100${q:+&${q#?}}" /tmp/projects.json >/dev/null || true
       stop "VERCEL_PROJECT_ID names no project in $scope ($(why /tmp/project.json))" "Projects there: $(jq -r '[.projects[]? | "\(.name) = \(.id)"] | join(", ")' /tmp/projects.json 2>/dev/null || echo none). The id (prj_...) is under Project → Settings → General." ;;
  403) invalid /tmp/project.json; stop "the token may not read project $VERCEL_PROJECT_ID in $scope ($(why /tmp/project.json))" "$token_fix" ;;
  *)   stop "Vercel answered HTTP $code for the project ($(why /tmp/project.json))" "$status_page" ;;
esac
