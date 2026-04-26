# Codex Working Rules

## Execution Style

- Work autonomously until the task is complete.
- Do not stop to ask for confirmation unless the request is ambiguous, destructive, or blocked by missing information.
- Prefer finishing the current task over narrating every minor step.
- Keep updates brief and only include them when they materially help.

## Context Use

- Read the smallest relevant set of files first, then expand only if needed.
- Prefer exact, local context over broad repo scans.
- Do not restate large amounts of existing code or documentation unless necessary.

## Code Changes

- Make the smallest change that fully solves the problem.
- Preserve existing architecture and conventions unless there is a clear reason to change them.
- Avoid speculative refactors.
- Do not rename files, symbols, or APIs unless required.

## Quality Bar

- Before finishing, check for obvious regressions, edge cases, and missing imports.
- Run the narrowest useful validation available for changed code.
- Prefer targeted tests, lint, or typecheck over broad full-project runs unless the task justifies it.
- When code changes touch auth, permissions, policy, secrets, tokens, SQL, webhooks, sessions, payments, crypto, file handling, or raw network input, do a short security pass before finishing.
- If validation cannot be run, say exactly what was not run and why; do not imply verification happened.

## Metrics Feedback Loop

- Use the global task metrics dashboard at `http://127.0.0.1:8765/` to spot repeated weaknesses in code quality, bugs/defects, security, and completeness.
- Treat repeated low scores as workflow feedback: improve the smallest relevant AGENTS rule or skill, then observe several comparable tasks before making another prompt change.
- Prefer changes that reduce rework: smaller diffs, closer local examples, fewer speculative reads, and one narrow validation command tied to the edited behavior.
- Keep token usage lean by reading the smallest useful local context first, summarizing large findings, and avoiding broad scans unless the local evidence is insufficient.
- For long tasks, checkpoint internally around implementation and validation so the final answer does not discover missing tests, imports, or credentials late.

## Review Mindset

- Treat every change as if it will be code reviewed.
- Flag risky assumptions, security issues, and breaking changes explicitly.
- When reviewing, lead with concrete findings, severity, and affected files.

## Bug-Hunting Workflow

- When the user asks for a bug hunt, security review, exploit search, or vulnerability validation, start by ranking files on a 1-5 bug-likelihood scale and work from highest risk to lowest risk.
- Use this ranking:
  - `1` = little or no exploitable surface, such as constants or static config
  - `5` = high-risk surface, such as auth, raw network input, parsing, file handling, payment, or permission boundaries
- Treat that ranking as the processing queue and document the highest-risk files first.
- If parallel sub-agents are explicitly requested and allowed in the current environment, assign one file per agent starting from the highest-ranked files. Otherwise run the same queue sequentially yourself.
- For each file under review:
  - read the code and form concrete vulnerability hypotheses
  - validate each hypothesis by running the project or the narrowest useful reproduction path
  - add temporary debug logic only when needed to confirm or reject the issue
  - keep iterating until confident the issue is real or ruled out
- For each file reviewed, output either `no bug` or a bug report containing:
  - vulnerability description
  - proof-of-concept exploit
  - exact reproduction steps
- After a bug report is produced, run a final validation pass whose job is: "I have received the following bug report. Can you please confirm if it's real and interesting?"
- Use that final pass to filter out edge-case or low-value reports so the user sees the most meaningful findings first.

## Long-Running Execution

- When the user asks to begin or continue a roadmap phase, treat that as a request to complete the entire phase, not just a slice, unless the user explicitly asks for an incremental rollout.
- Do not stop after a milestone, kickoff, or partial implementation if additional work in the same phase is still actionable.
- Continue through implementation, validation, deployment, and documentation until the full phase is complete or you are truly blocked by missing credentials, external approvals, or unavailable information.
- If the phase is too large for one uninterrupted pass, maintain an internal checklist and keep executing the next items without asking whether to continue.
- Report progress periodically, but do not treat reporting as a stopping point.

## Git Workflow

- Once a coding session is complete, auto-generate a commit message, commit the relevant changes, and push or sync the current branch without waiting for a separate prompt.
- If unrelated local changes, missing credentials, or branch-state conflicts make an automatic commit or push unsafe, stop and report that specific blocker instead of bundling risky changes blindly.

## Output

- Be concise.
- State what changed, why, and what was validated.
- Include any residual risk or unverified areas.

## Preflight Checks

- Before reporting success on any build, deploy, release, submission, migration, or store upload task, run the basic preflight checks first instead of discovering them through a failed remote job.
- Verify version numbers, build numbers, release train status, platform metadata, required config files, credentials, and working-directory assumptions before starting the expensive step.
- If a likely failure can be detected locally from repo config, tooling output, or platform documentation, catch it proactively and call it out before spending build time or compute.

## Repository Addendum

- After each completed session, write a concise commit message and push the finished changes to `origin`.
- If pushing is blocked, say what blocked it and stop there rather than leaving the publish step ambiguous.
