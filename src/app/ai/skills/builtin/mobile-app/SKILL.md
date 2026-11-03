---
name: mobile-app
description: Design native-feeling iOS or Android app screens and flows at phone size, with status bar, navigation, safe areas, and touch-sized controls. Use when the user asks for a mobile app, phone screen, app flow, onboarding screens, or an iOS or Android UI.
---

# Mobile app

Phone screens are small, held in one hand, and used in short bursts. Design for the thumb, for glanceable hierarchy, and for flows rather than single screens.

## Frame and platform

- Default to a 390 × 844 frame (a current iPhone). Use 360 × 800 when the user says Android. One top-level frame per screen, named for what the screen does ("Checkout – Payment"), placed left to right in flow order with `arrange`.
- Ask yourself which platform the app follows and stay consistent: iOS uses a large title and a bottom tab bar; Android (Material) uses a top app bar and a bottom navigation bar or a navigation drawer. If the user did not say, pick iOS conventions and say so.
- Reserve the status bar (47 on iOS, 24–32 on Android) and the home indicator area (34 on iOS) as safe areas. Do not put controls in them.

## Screen anatomy

Make each screen a vertical auto-layout column with `h` fixed to the device height and the content area set to `grow` so the bottom bar stays at the bottom:

1. Status bar row (time, signal, battery icons) at the top.
2. Navigation bar: back button or menu, title, at most two actions.
3. Content: a scrolling column. Give long content `overflow="hidden"` on the screen frame, not on the text.
4. Bottom navigation (three to five destinations, icon plus short label) or a primary action pinned above the home indicator.

## Touch and spacing

- Tap targets at least 44 × 44 (48 on Android), even when the icon is 20–24.
- Screen side padding 16–20. Space list rows 12–16 apart; cards 12–16 apart with 16 padding.
- Put the primary action within the bottom third of the screen, full width or near it, 48–56 tall.
- Body text 15–17, secondary text 13, never below 11. Titles 28–34 for large titles, 17–20 for bar titles.

## Components

- Build repeated pieces once as components: list row, card, button, tab bar item, input field. Use `create_component` or `Component` in `render`, then `Instance` for every use, so a change to one row updates every screen.
- Interactive controls (switch, segmented control, slider, text field) get behaviours with Reka names (`Switch.Root`, `Tabs.Root`) so they work in preview.
- Use `Icon` from one icon set at one stroke weight; outline icons for inactive tabs, filled for the active one is a common and readable convention.

## Flows

- When the request is a flow (onboarding, sign-up, checkout), sketch the steps as a list first, then build one screen per step with consistent navigation, progress indication, and the same primary button position on every screen.
- Show empty, loading, and error states for the main screen when they would affect the design (an empty inbox, a failed payment).

## Visual style

- Respect the device: system-like fonts (Inter, SF Pro substitutes, Roboto) unless the brand says otherwise.
- Use color for state and action, not decoration. Light and dark modes are common on phones: if the user mentions both, define color variables with a Light and a Dark mode and bind fills to them (see the `dark-mode` skill).

## Finish

Export the screens with `export_image`, check that nothing overflows the frame, that text fits at the given widths, and that tap targets are large enough. Arrange the screens in flow order, select them, and summarize the flow in two or three lines.
