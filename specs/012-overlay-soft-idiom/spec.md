# Spec 012 — Overlay Soft Idiom (iOS-like sheets)

**Status:** Active · **Owner:** xava · **Created:** 2026-07-20
**Scope:** Web-only overlay presentation. No core/server/API/zip changes.
Delta over 001–011; **012 wins on overlap** for Modal / sheet / popover /
ConfirmDialog chrome and the episode rating prompt.

## Summary

Replace the sharp 006 E74 overlay shells with an iOS-like soft system:
large top radius + drag handle on mobile sheets, rounded desktop modals and
popovers, softer scrim, and matching soft corners on ConfirmDialog actions
and the hand-rolled post-watch rating popup.

Behavior (Escape, scrim dismiss, focus trap, scroll lock, portal stacking)
is unchanged except for optional swipe-down dismiss on sheets.

## Edge-case decisions

| ID | Question | Decision |
|----|----------|----------|
| E160 | Does 006 E74 still forbid `rounded-*` on overlay shells? | **No.** Soft idiom supersedes E74 for Modal sheet/modal/popover containers, ConfirmDialog action buttons, dialog-local inputs that share the overlay chrome, and RatingControl / rating-prompt pills (`rounded-full`). Page panels (Login, Import, calendar cards, etc.) stay sharp unless a later spec softens them. <!-- DECISION: rating prompt is sibling pills (SectionPill language), not a shared rounded-xl card. --> |
| E161 | Sheet chrome? | Top radius `1.5rem` (24px); decorative centered drag handle (`aria-hidden`); softer scrim `bg-black/40`; panel fill stays `#101010` with `backdrop-blur-xl` and a soft lift shadow. |
| E162 | Swipe to dismiss? | Yes on mobile sheets: pointer drag from handle/header; dismiss when dragged down ~100px or with a quick downward fling. Respect `prefers-reduced-motion` (no drag transform; click/Escape/scrim still work). |
| E163 | Popover motion? | Popovers use the same fade+scale enter/exit as centered modals (no snap open/close). |
| E164 | Orphan dialogs? | `TmdbKeyDialog` / `RestoreBackupDialog` remain in the Storybook catalog; they inherit Modal shell and get soft button/input corners. No production deletion in this spec. |

## Acceptance

- [x] Modal sheet shows handle + top radius; desktop modal/popover are rounded
- [x] Scrim is softer (`bg-black/40`); Escape/scrim/close still dismiss
- [x] Sheet swipe-down dismiss works on touch/pointer
- [x] ConfirmDialog + dialog inputs use soft corners; rating prompt matches
- [x] 006 ui.md §E45 overlay recipe marked superseded by 012
