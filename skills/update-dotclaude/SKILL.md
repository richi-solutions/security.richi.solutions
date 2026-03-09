---
name: update-dotclaude
description: Pulls latest .claude/ configuration from the central GitHub repo into the current project via git subtree. Use after updates to the central .claude template.
disable-model-invocation: true
allowed-tools: Bash
---

Pull the latest `.claude/` template into this project:

```bash
git subtree pull --prefix=.claude https://github.com/richi-solutions/.claude.git main --squash
```

After the pull succeeds, sync config files to their required locations:

```bash
# Copy all synced files from .claude/sync/ to project root
# The sync/ directory mirrors the target repo layout — no mapping needed
if [ -d ".claude/sync" ]; then
  cp -r .claude/sync/. .
  git add -A -- .gitleaks.toml .pre-commit-config.yaml commitlint.config.cjs \
    .github/dependabot.yml .github/workflows/security.yml .github/workflows/commitlint.yml
  git diff --cached --quiet || git commit -m "chore: sync config from .claude/sync"
fi
```

Then push to GitHub:

```bash
git push
```

If you get a merge conflict, resolve it manually — project-specific overrides in `.claude/settings.local.json` and `.claude/CLAUDE.local.md` are gitignored and won't be affected.
