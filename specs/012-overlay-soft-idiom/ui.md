# UI Spec 012 — Overlay Soft Idiom

Conventions inherited from ui.md 001–011 except where this doc supersedes
006's E45 overlay idiom (E74). Class strings below are the target recipe.

## Soft overlay idiom (E160–E163 — normative for every dialog/sheet/popover)

```
scrim:      fixed inset-0 bg-black/40
panel fill: bg-[#101010] border border-white/10 backdrop-blur-xl
            shadow-[0_16px_48px_rgba(0,0,0,0.5)]
sheet:      rounded-t-[1.5rem], top border only (or no side borders);
            decorative drag handle above header/content
            (h-1 w-9 rounded-full bg-white/20, aria-hidden)
modal:      rounded-2xl, full border, max-w-sm (unchanged)
popover:    rounded-xl, full border; fade+scale enter/exit
title:      font-display italic text-snow text-lg
body text:  text-sm text-snow / text-muted
input/select (in dialogs): border border-white/10 bg-white/5 px-3 py-2
            text-sm text-snow rounded-lg
            focus:border-yellow focus:outline-none
primary:    bg-yellow text-[#080808] font-mono text-[10px] uppercase
            tracking-widest px-4 py-2.5 rounded-lg
destructive: same shape, bg-red-600 text-white rounded-lg
secondary/cancel: font-mono text-[10px] uppercase tracking-widest
            text-muted hover:text-snow (borderless)
rating prompt: sibling pills — RatingControl (`rounded-full` void/blur
            shell) + skip control (same pill chrome); no shared card panel
```

<!-- DECISION: rating prompt dropped the shared rounded-xl card in favor of
     SectionPill-matching sibling pills so Library / Settings / rating share
     one chrome language. Soft idiom still applies to Modal / ConfirmDialog. -->

**Supersedes** `specs/006-design-conformance/ui.md` §E45 overlay idiom for
overlay shells and dialog chrome listed above. 006 E80's ban on panel
`rounded-*` no longer applies to Modal / ConfirmDialog / RatingControl pills.

Applies to: every `Modal` consumer (WatchDateDialog, DeleteAccountDialog,
ResetLibraryDialog, EpisodeDetailsModal, SeriesDetailsSheet, AddSectionBar,
menus with `desktop="popover"`, ConfirmDialog wrappers, orphan Storybook
dialogs), plus the EpisodeRow post-watch rating prompt.
Behavior, props, aria, focus handling: unchanged aside from sheet
swipe-to-dismiss (E162). ≥44px touch targets preserved.
