---
name: iterate-project
description: Coordinate research, product decisions, UI design, implementation, QA, and code review for a new or existing project.
argument-hint: "[goal or approved plan to execute]"
disable-model-invocation: true
---

The user’s requested goal is supplied below.

$ARGUMENTS

Coordinate competitor-researcher, product-planner, ui-designer, frontend-builder, qa-tester, and code-reviewer from this main conversation.

## Establish the current goal

Read CLAUDE.md, PROJECT-BRIEF.md, UI-DESIGN-BRIEF.md, and relevant repository instructions when present. Inspect the current files and Git status. For an empty project, identify the minimum usable foundation for the user’s goal. For an existing project, establish what already works. Discover project commands and any preview address from actual configuration or server output.

If no goal was supplied, infer the next useful action from an approved plan or the current conversation. Ask a concise question when a missing product decision prevents meaningful progress. Verify that the required named agents are available before dispatching them.

## Choose the entry point

The project is in planning until the user explicitly says to start implementation. Approval of a plan confirms its scope and decisions. During planning, dispatch research, product planning, and written UI planning; QA and code review may assess acceptance checks and failure cases. Begin scaffolding or app-code edits only after explicit implementation authorization. An authorized prototype is limited to the scope the user approved.

For an approved plan, reuse its research, product decisions, and acceptance checks. Fill material gaps through the relevant agent. Once the user explicitly authorizes implementation and the session permits editing, begin the build-and-review cycle.

For a new feature or UI goal, send the goal, audience, constraints, and current feature set to competitor-researcher. Pass the full sourced report to product-planner. The planner rates benefit, fit, confidence, build effort, dependencies, and maintenance, then decides Build now, Prototype, Later, or Pass. It selects one primary outcome and returns the implementation sequence and three to five acceptance checks. Resolve uncertain source claims through targeted follow-up research.

For a focused bug, establish its reproduction and route it to the builder and relevant reviewers, using existing planning context.

For UI work, send the selected scope and available screenshots to ui-designer. Its skill sources are frontend-design and Impeccable critique. For a fresh project, get a concrete layout proposal before the first render. For an existing interface, capture its current state. If the user explicitly requested plan review, present the plan and wait for approval. If implementation is authorized and the session permits editing, proceed. Plan Mode remains a planning step until the user approves implementation.

## Build, verify, and refine

Send the scope, design decisions, relevant files, and acceptance checks to frontend-builder. Let the builder finish before reviewing the resulting version. Keep application-code editing under that role and run the stages sequentially.

Send the handoff to qa-tester. For UI work, obtain screenshots of the actual rendered result and send them to ui-designer for critique. The main conversation can capture evidence when browser tools are available there. Give code-reviewer the current diff, changed or new files, acceptance checks, and QA evidence.

Count the initial build and its reviews as pass 1. Complete at most three build-and-review passes per invocation. End as soon as the agreed functional checks pass, the UI reviewer passes for a UI goal, and no correctness finding remains within scope.

Combine actionable findings into one repair handoff for frontend-builder. Resolve contradictory advice against the user goal and evidence. Retest fixed issues and newly affected behavior. Reuse unchanged research and valid earlier checks. Keep optional preferences in follow-ups.

If a verification capability is missing, identify exactly which check remains pending and obtain the evidence through the main conversation when possible. Report an unresolved dependency or repeated failure when it prevents progress. After the third pass, report any remaining issues and the next concrete action.

## Report the outcome

Return the resulting behavior, adopted ideas and source links, agent runs, changed files, number of passes, checks performed, screenshots when available, and remaining work. Make completion claims only for checks backed by evidence. Follow the project’s existing authorization rules for publishing, paid services, destructive actions, and Git operations.
