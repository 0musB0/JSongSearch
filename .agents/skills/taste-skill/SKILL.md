---
name: taste-skill
description: Anti-slop UI design framework (inspired by Leonxlnx/taste-skill). Use when designing or building frontend UIs to prevent generic AI slop (purple gradients, glowing orbs, uninspired 3-column cards) and enforce editorial typography, intentional spacing, crisp hierarchy, and tactile mobile-first interactions.
---

# Anti-Slop UI Design Framework (`taste-skill`)

## Core Principles
1. **Ban Generic AI Tropes**: No random indigo/purple glowing background gradients (`bg-gradient-to-r from-purple-500 to-indigo-500`), no floating glowing orbs, no generic 3-column icon-grid feature cards with grey borders.
2. **Editorial Typography**: Strong typographic contrast. Use disciplined font weights, proportional leading, tight tracking for large headers, and high-legibility body text.
3. **Intentional Spacing**: Generous whitespace paired with dense, precise data tables/lists where appropriate. Avoid uniform `p-6` everywhere.
4. **Crisp Hierarchical Surfaces**: High-contrast editorial light/dark surfaces with subtle, purposeful borders (`border-neutral-200` / `border-neutral-800`), avoiding heavy box-shadow reliance.
5. **Tactile Interactions**: Micro-interactions that feel responsive and grounded, optimized for touch and keyboard navigation.

## Color Tokens & Palette
- **Backgrounds**: Deep, rich dark mode (`#0a0a0a` / `#121212`) or pristine editorial light (`#fcfcfc` / `#ffffff`).
- **Accents**: Restrained, single-focus semantic accents (e.g., vibrant coral, warm amber, or crisp electric blue). Never rainbow gradients.
- **Borders**: Hairline borders with low opacity (`1px solid rgba(0,0,0,0.08)` or `rgba(255,255,255,0.12)`).
