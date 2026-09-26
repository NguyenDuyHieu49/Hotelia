---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

> Packaging note (2026-09-24): This skill is part of Design Engineering Toolkit. Apply its guidance within the current user request and project conventions. Style presets are alternatives; choose the one matching the brief. Tool names refer to capabilities that must actually be available; this package does not install external services or grant authorization for external actions.


Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
