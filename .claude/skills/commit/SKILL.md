---
name: commit
description: Review pending changes and recommend a set of well-organized commits. Use when the user wants to commit their work.
argument-hint: [--push]
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep, Edit, Agent, AskUserQuestion
---

# Smart Commit Skill

You are a commit assistant. Your job is to review all pending changes in the working directory and propose a set of **logically grouped commits** with clear, conventional commit messages.

## Step 1: Analyze Changes

Run the following in parallel:
- `git status` (never use `-uall`)
- `git diff` (unstaged changes)
- `git diff --cached` (staged changes)
- `git log --oneline -10` (recent commits for message style reference)

## Step 2: Group Changes into Logical Commits

Analyze ALL pending changes (staged, unstaged, and untracked) and group them into logical commits. Each commit should represent a single coherent change. Consider:

- **Separate concerns**: Don't mix feature code with config changes, tests with implementation, refactors with new features
- **Dependency order**: If commit B depends on commit A, order them correctly
- **Atomic commits**: Each commit should leave the project in a valid state
- **Unrelated files**: Group related files together (e.g., a component and its styles)

## Step 3: Present the Plan

Present a numbered list of proposed commits in order. For each commit:
1. The commit message (title + optional body)
2. The files included
3. A brief rationale for the grouping

Use this format:

```
### Commit Plan

1. **feat: add user authentication flow**
   Files: src/auth.ts, src/components/Login.tsx, src/hooks/useAuth.ts
   → Groups the auth feature implementation together

2. **chore: update dependencies and config**
   Files: package.json, pnpm-lock.yaml, tsconfig.json
   → Config and dependency changes separated from feature work

3. ...
```

## Step 4: Ask for User Decision

After presenting the plan, ask the user to choose:

- **accept** — Execute all commits as proposed
- **accept & push** — Execute all commits and push to the remote
- **change** — User describes what to adjust, then you revise the plan and re-present

If the user passed `--push` as an argument (`$ARGUMENTS` contains `--push`), note that commits will be pushed after creation.

## Step 5: Execute

When the user accepts:

1. For each commit in order:
   - Stage ONLY the specific files for that commit using `git add <file1> <file2> ...`
   - Create the commit with the agreed message. Always append the co-author line. Use a HEREDOC for the message:
     ```
     git commit -m "$(cat <<'EOF'
     commit message here

     Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
     EOF
     )"
     ```
   - Verify the commit succeeded before moving to the next one

2. After all commits, run `git log --oneline -<N>` (where N = number of commits created) to confirm

3. If the user chose "accept & push" or passed `--push`:
   - Push to the remote with `git push`
   - If no upstream is set, use `git push -u origin <branch>`

## Rules

- NEVER use `git add -A` or `git add .` — always add specific files
- NEVER skip hooks (`--no-verify`) or bypass signing
- NEVER amend existing commits — always create new ones
- Do NOT commit files that likely contain secrets (`.env`, credentials, tokens). Warn the user if such files are in the changeset.
- If a pre-commit hook fails, diagnose the issue, fix it, re-stage, and create a NEW commit
- Follow the existing commit message style from `git log` when possible
- Use conventional commit prefixes (feat, fix, chore, refactor, docs, test, style, perf, ci, build) when the repo doesn't have a strong existing style
