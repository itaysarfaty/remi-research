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

Present the commit plan using this exact format. Use markdown headers, tables, and horizontal rules for clear visual separation. Do NOT number the commits — use spacing and dividers instead.

For each commit:
1. An `####` header with the prefix in a code span followed by the description (e.g., `#### \`refactor\` relocate modules`)
2. A table listing each affected file, one per row, with the action (**create**, **modify**, or **delete**) in the first column and the file path in a code span in the second column
3. A `---` horizontal rule after each commit

Example:

---

#### `feat` add user authentication flow

| | |
|---|---|
| **create** | `src/auth.ts` |
| **create** | `src/hooks/useAuth.ts` |
| **modify** | `src/components/Login.tsx` |

---

#### `chore` update dependencies and config

| | |
|---|---|
| **modify** | `package.json` |
| **modify** | `pnpm-lock.yaml` |
| **modify** | `tsconfig.json` |

---

IMPORTANT: Never use comma-separated file lists. Every file gets its own row in the table.

### Commit message rules

Every commit message MUST use a conventional commit prefix. Pick the most appropriate one:

| Prefix       | Use when...                                      |
|------------- |--------------------------------------------------|
| `feat:`      | Adding new functionality                         |
| `fix:`       | Fixing a bug                                     |
| `chore:`     | Maintenance tasks, deps, config, no logic change |
| `refactor:`  | Restructuring code without changing behavior     |
| `docs:`      | Documentation only                               |
| `test:`      | Adding or updating tests                         |
| `style:`     | Formatting, whitespace, semicolons (no logic)    |
| `perf:`      | Performance improvements                         |
| `ci:`        | CI/CD pipeline changes                           |
| `build:`     | Build system or external dependency changes      |

Keep the subject line under 72 characters. Use imperative mood ("add", not "added"). Do not end the subject with a period.

## Step 4: Ask for User Decision

After presenting the plan, use the `AskUserQuestion` tool to let the user pick an action interactively. Present these options:

- **Accept** — Execute all commits as proposed
- **Accept & push** — Execute all commits and push to the remote
- **Edit** — User describes adjustments, then you revise and re-present

If the user passed `--push` as an argument (`$ARGUMENTS` contains `--push`), skip the question and go straight to execution — commits will be pushed after creation.

If the user selects "Edit" (or provides custom input via "Other"), revise the plan based on their feedback and present the updated plan again with a new `AskUserQuestion`.

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

3. If the user chose "Accept & push" or passed `--push`:
   - Push to the remote with `git push`
   - If no upstream is set, use `git push -u origin <branch>`
   - If no remote repository exists yet, create one using the GitHub CLI: `gh repo create <repo-name> --private --source=. --push` (ask the user for public/private preference if unclear)

## GitHub CLI

Use the `gh` CLI for any GitHub operations:
- Creating repos: `gh repo create`
- Viewing repo info: `gh repo view`
- If `gh` is not authenticated or unavailable, inform the user and fall back to raw git commands where possible

## Rules

- NEVER use `git add -A` or `git add .` — always add specific files
- NEVER skip hooks (`--no-verify`) or bypass signing
- NEVER amend existing commits — always create new ones
- Do NOT commit files that likely contain secrets (`.env`, credentials, tokens). Warn the user if such files are in the changeset.
- If a pre-commit hook fails, diagnose the issue, fix it, re-stage, and create a NEW commit
- Every commit message MUST have a conventional commit prefix (`feat:`, `fix:`, `chore:`, etc.)
- Keep subject lines under 72 characters, imperative mood, no trailing period
