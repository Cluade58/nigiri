# UI design expectations

**Chosen direction: B, Highlighter.** Tokens, type and rules are in [product-brief.md §6](product-brief.md); the reference is `mockups/today-b-highlighter.html`. New screens extend that system rather than proposing new directions.

Use frontend-design for design direction and Impeccable's critique workflow to evaluate rendered results. Follow two passes: write the design plan from the product, audience, main action, real example content and constraints, then review it against the brief before any authorized prototype or implementation. Make typography, composition, colour and interaction choices explicit and explain how they support the main user action.

Audience: high school students, phone-first. Plan at 390 CSS px, then check a smaller phone (360), larger text (200%), desktop, keyboard input and screen readers.

## Connected flows to design

Today → deck library → flashcard session → test detail and readiness → assignment capture → backup and restore.

For each flow, define what the student sees and does at each step, and design these states:
- empty
- populated
- long content
- saving
- failure
- **offline**
- completion

**Explain readiness where it's shown.** Next to the number or strip, say in plain words what it measures ("predicted recall on test day if you stopped now"). Show coverage ("18 of 60 not started") and the "Early estimate" label when evidence is thin (spec §2).

Useful pattern references: Things for task hierarchy, Structured for the daily agenda, Mochi for readable study content, Quizlet for question focus, RemNote for entering a practice queue. Treat them as patterns to evaluate, not to copy. Research current examples before relying on a particular interaction. [Things](https://culturedcode.com/things/features/), [Structured](https://structured.app/), [Mochi](https://mochi.cards/), [Quizlet](https://quizlet.com/features/learn), [RemNote](https://help.remnote.com/en/articles/7925835-the-flashcard-home)

## Rules

Design the main action and the information around it together. Make an empty state inviting and useful, with a clear way to begin. Give populated screens readable organization and distinguish primary actions from secondary controls.

Use labeled controls, semantic structure, visible keyboard focus, comfortable touch targets (at least 48px), readable contrast, text alongside status colours, and reduced-motion support. Modal forms need clear actions, Escape dismissal, and appropriate focus handling.

For flashcards, put one question in focus, reveal the answer on request, and keep rating controls predictable. Use the app's actual scheduling rules and measured progress. For planning, distinguish a deadline from a scheduled work block and show the next action clearly.

## Review

Compare matching before and after screenshots for existing screens. For a new screen, compare the first render with its revised version. Review empty and representative populated states using isolated development data. Check hierarchy, spacing, type, contrast, generic-looking defaults, keyboard focus, reduced motion and horizontal overflow.

Technical checks and visual critique both contribute to the final acceptance decision, but keep them separate: a screenshot is visual evidence only. Persistence and scheduling are verified through interactions and targeted tests.
