---
name: iterate-project
description: Give chief-officer management of the current goal, including decisions, specialist delegation, delivery, and acceptance.
argument-hint: "[goal or approved plan to execute]"
disable-model-invocation: true
---

$ARGUMENTS

## Dispatch the manager

Read CLAUDE.md and the current user request to establish phase and authorization. The project is currently in planning unless the user subsequently authorizes implementation. Preserve later revocations and any assessment-only instruction. Do not treat this command as authorization to build.

Invoke chief-officer once as the accountable manager. Pass the goal, current phase and authorization reference, accepted requirements, pointers to relevant briefs and PROJECT-STATE.md, existing evidence, and the current pass count if resuming a cycle. It makes routine decisions and directly delegates to the appropriate named specialists using Agent. Do not run a competing main-conversation management loop or repeat the same research/reviews outside the chief's cycle.

The chief's definition owns routing, decision authority, assignment contracts, evidence standards, and stopping rules. Read that definition instead of duplicating it here. Its tools include delegation and coordination-document editing. frontend-builder remains the sole app-code editor. Specialist references to their 'main conversation' mean their coordinating caller for handoffs.

## Preserve phase and quality boundaries

During planning, the chief manages research, product choices, written UX/UI design, architecture, and acceptance checks. App code and rendered prototypes require their corresponding user authorization. learning-specialist and feedback-analyst stay inactive during planning.

After implementation authorization, the chief manages the builder, QA, UI critique, independent code review, and scoped repairs. It invokes learning-specialist only for relevant study-mechanics changes and feedback-analyst for real tester evidence. All roles share at most three build-and-review passes, including the initial build. During planning, allow one focused revision round after initial review. Chief acceptance cannot replace required evidence or independent findings.

## Handle unavailable delegation

Check the actual tool result. If the chief cannot delegate because the installed runtime, permissions, or nesting settings withhold Agent, report the limitation. Offer a supported main-agent run with `claude --agent chief-officer`, or relay its explicit assignments through the main conversation when the tool is available there. In relay mode the chief retains decision ownership, and the main conversation executes its dispatches and returns the actual results for judgment. Do not claim nested execution occurred. Never change permissions or spawn-depth settings without the relevant authorization.

## Return the outcome

Return the chief's decision, real delegated work, scoped verdict, evidence, changed files if any, and remaining action. Retain the compact project-state record and accepted decisions. Existing user authorization rules for Git operations, publishing, paid services, communication, and destructive actions remain in force.
