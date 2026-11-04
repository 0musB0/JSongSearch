---
name: ponytail
description: Senior engineer YAGNI decision ladder skill. Use before adding dependencies, wrappers, or abstractions to enforce standard browser/platform primitives first.
---

# Senior Engineer YAGNI Decision Ladder (`ponytail`)

## The Ponytail Decision Ladder
Before introducing any new dependency, npm package, wrapper, helper library, or architectural abstraction, evaluate this strict 4-step ladder:

1. **Does this need to exist at all?**
   - Can we achieve the requirement with existing code or by deleting code?
2. **Can native HTML/CSS/JS or platform built-ins do it?**
   - Use browser primitives (`fetch`, CSS grid/flex, native dialogs, CSS variables, URLSearchParams) before reaching for heavy libraries.
3. **Can it be 20 lines of plain code instead of an external package?**
   - Write small, focused utility functions inline rather than pulling in external dependencies for minor helpers (e.g., simple debounce, class merging, formatters).
4. **Zero Unnecessary Wrappers**
   - Avoid creating abstraction layers over APIs or SDKs unless there is a concrete, multi-provider abstraction requirement. Keep code direct, transparent, and debuggable.
