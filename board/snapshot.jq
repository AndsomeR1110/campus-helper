# Builds board/site/data.json from three GitHub API responses (see
# .github/workflows/board.yml). Keeps only the fields the page reads.
#   jq -n --slurpfile issues i.json --slurpfile open o.json --slurpfile closed c.json \
#     --argjson at <ms> -f board/snapshot.jq
def pr:
  {
    number, title, body, html_url, draft, updated_at, merged_at,
    user: { login: .user.login },
    base: { ref: .base.ref },
    head: { repo: (if .head.repo then { full_name: .head.repo.full_name } else null end) }
  };
{
  at: $at,
  issues: [
    $issues[0][] | {
      number, title, body, state, html_url, updated_at, closed_at, pull_request,
      labels: [.labels[] | { name: (if type == "string" then . else .name end) }],
      assignees: [.assignees[] | { login }]
    }
  ],
  openPulls: [$open[0][] | pr],
  closedPulls: [$closed[0][] | pr]
}
