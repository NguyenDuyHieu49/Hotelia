---
name: project-craft
description: Choose and combine Design Engineering Toolkit skills when a project request spans UI design and software engineering, or the user asks which toolkit workflow to use.
---

# Project craft

Read the user's current request and project conventions first. Use only the relevant skill files from sibling directories; do not load the whole toolkit.

## Select the workflow

- UI audits, refinement, accessibility, responsive behavior, or a complete UI design workflow: read [impeccable](../impeccable/SKILL.md).
- A new visual direction for a landing page or portfolio: read [design-taste-frontend](../design-taste-frontend/SKILL.md). This is Taste v2 experimental; use [design-taste-frontend-v1](../design-taste-frontend-v1/SKILL.md) only for requested compatibility.
- A named aesthetic: choose one of [minimalist-ui](../minimalist-ui/SKILL.md), [industrial-brutalist-ui](../industrial-brutalist-ui/SKILL.md), or [high-end-visual-design](../high-end-visual-design/SKILL.md). Do not combine conflicting preset rules.
- Upgrade an existing interface: [redesign-existing-projects](../redesign-existing-projects/SKILL.md); keep behavior and factual content within the requested scope.
- Generated reference images: [imagegen-frontend-web](../imagegen-frontend-web/SKILL.md), [imagegen-frontend-mobile](../imagegen-frontend-mobile/SKILL.md), or [brandkit](../brandkit/SKILL.md), according to the requested deliverable.
- Implement from generated design references: [image-to-code](../image-to-code/SKILL.md). Specialized GSAP work: [gpt-taste](../gpt-taste/SKILL.md). Stitch design documents: [stitch-design-taste](../stitch-design-taste/SKILL.md).
- Debugging: [diagnosing-bugs](../diagnosing-bugs/SKILL.md). Test-first work: [tdd](../tdd/SKILL.md). Change review: [code-review](../code-review/SKILL.md).
- Domain vocabulary: [domain-modeling](../domain-modeling/SKILL.md). Module boundaries: [codebase-design](../codebase-design/SKILL.md). Prototype questions: [prototype](../prototype/SKILL.md). Research: [research](../research/SKILL.md).

For planning, specification, ticketing, implementation, teaching, or handoffs, consult the packaged catalog in ../../README.md and select the requested workflow. Preserve explicit-only invocation policies from upstream; suggest those workflows without silently starting them.

## Combine deliberately

For a task spanning design and implementation, select one primary design workflow, then add the engineering discipline that the task needs. Let the user's brief and existing design system settle conflicting font, color, layout, motion, and framework advice. Do not force a redesign for a small fix. Keep each project's product facts and design choices in that project, not in the shared plugin. Match the user's language.

## Runtime boundaries

Resolve skill-relative resources from their installed skill directory. Impeccable's included launcher can fetch a pinned engine on first use; honor the host's network and filesystem permissions. Its documented direct-reading fallback remains available when the engine cannot run. The engine binary, browser extension, global agent registration, and edit hooks are not installed by this package.

Image tools, browser tools, Google Stitch, GitHub/GitLab CLIs, and issue trackers are optional external capabilities, not bundled integrations. Check availability for the selected workflow. Use local artifacts when suitable and report any operation that could not be performed. Do not claim a screenshot, test, deployment, or external mutation happened without its actual result.
