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

After the pull succeeds, sync security config files to their required locations:

```bash
# Copy security files from .claude/security/ to project root and .github/
if [ -d ".claude/security" ]; then
  cp .claude/security/.gitleaks.toml .gitleaks.toml 2>/dev/null
  cp .claude/security/.pre-commit-config.yaml .pre-commit-config.yaml 2>/dev/null
  mkdir -p .github .github/workflows
  cp .claude/security/dependabot.yml .github/dependabot.yml 2>/dev/null
  cp .claude/security/workflows/security.yml .github/workflows/security.yml 2>/dev/null
  git add .gitleaks.toml .pre-commit-config.yaml .github/dependabot.yml .github/workflows/security.yml
  git diff --cached --quiet || git commit -m "chore: sync security config from .claude/security"
fi
```

Then push to GitHub:

```bash
git push
```

If you get a merge conflict, resolve it manually — project-specific overrides in `.claude/settings.local.json` and `.claude/CLAUDE.local.md` are gitignored and won't be affected.
