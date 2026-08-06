# Week nav hanging controls — design

Date: 2026-08-06  
Project: jira-assistant  
Status: Approved for implementation

## Goal

Replace the top-row week prev/next buttons with hanging controls beside the day-card row, using soft accent discs — without restyling the rest of the app.

## Decisions

| Choice | Decision |
|--------|----------|
| Placement | **B · Fully outside** — controls in side margins, never covering day chips |
| Style | **3 · Soft accent disc** — white floating circle + blue chevron (frosted glass tried, too subtle) |
| Scope | **Week nav only** — month nav and other buttons unchanged |
| Label | Stays centered above the carousel; no buttons in that row |
| Swipe / keyboard | Keep existing threshold swipe and Left/Right keys |

## Behavior

- Prev/Next vertically centered on the week card row
- Soft accent discs: surface fill, blue chevron, elevation, subtle blue ring
- Disabled at ends of the loaded week window (low opacity)
- Hover: stronger shadow + slight scale; focus-visible ring for keyboard
- Top `week-nav` button row removed; label-only header remains
- Pager ignores pointerdowns on day chips so the day drawer still opens; pointer capture only after drag deadzone

## Out of scope

- Month prev/next restyle
- Global button system redesign
- Changes to swipe threshold or week data window
