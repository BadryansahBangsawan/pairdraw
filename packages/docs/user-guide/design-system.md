---
title: Building a Design System
description: A step-by-step tutorial that builds a themed Button and Card library with variables, variants, component properties, and slots.
---

# Building a Design System

This tutorial builds a small design system from scratch: color and size tokens with a light and a dark theme, a **Button** with two variants, and a **Card** whose content and actions are slots. Every step uses features described in more detail in [Variables](./variables), [Auto Layout](./auto-layout), and [Components](./components).

[Download the finished file](/examples/design-system.fig){download} to compare with your own, or to start from it. It has two pages: **Components** holds the main components, and **Examples** shows the same cards in the Light and Dark modes.

## 1. Define the tokens

Tokens are variables that every component reads, so a theme change happens in one place.

1. Open **View → Variables…**.
2. Click **+** next to **Collections** and name the collection `Theme`. Rename its first mode to `Light`, then click **+** next to **Modes** and name the new mode `Dark`.
3. Click **Create variable**, choose **Color**, and add these variables with a value for each mode. A slash in a name groups variables, so `color/primary` appears as *primary* under *color*.

   | Variable | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Create a second collection named `Size` with **Number** variables: `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16, and `space/lg` = 24. Sizes do not change with the theme, so this collection keeps a single mode.

The stylesheet under the list already shows the result: the Light values in `:root` and the Dark values under `[data-theme="dark"]`.

## 2. Build the Button

1. Rename the page `Components`. Draw a frame, press <kbd>⇧</kbd><kbd>A</kbd> to give it auto layout, and set both axes to **Hug**.
2. Add a text layer that reads `Button`, in Inter Medium at 14 px, and name it `Label`.
3. Bind the tokens. In **Fill**, use **Apply variable** to bind the frame's fill to `color/primary` and the text's fill to `color/on-primary`. Number fields take variables the same way: bind the corner radius to `radius/control` and the left and right padding to `space/md`, and set the top and bottom padding to 10.
4. Press <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>) to make it a component.
5. Double-click into the component and select the Label layer. Next to its text in **Typography**, use **Apply variable/property → Create property…** to create a text property named `Label`. Instances now set their label without detaching.
6. Select the component and click **Add variant** in the panel header. The component becomes a set with two variants. In **Properties**, rename the variant property to `Variant` and its values to `Primary` and `Secondary`, then name the set `Button`.
7. In the Secondary variant, bind the fill to `color/secondary` and the label's fill to `color/text`.
8. Select the set and, in **Behaviour**, click **+** and choose **Button**. Preview (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) now runs it as a real button.

## 3. Build the Card

1. Draw a frame 320 px wide, give it vertical auto layout, and set its height to **Hug**. Bind its padding to `space/lg`, its gap to `space/md`, its corner radius to `radius/card`, its fill to `color/surface`, and a 1 px stroke to `color/border`.
2. Add a text layer that reads `Card title`, in Inter Semi Bold at 18 px, and name it `Title`. Bind its fill to `color/text` and set its width to **Fill**.
3. Below it, add a frame named `Content` with vertical auto layout, no fill, **Fill** width, and **Hug** height. Put a text layer in it, such as `Slots hold content that each card chooses for itself.`, in Inter Regular at 14 px, bound to `color/text-muted`, and name it `Body`.
4. Add a frame named `Actions` with horizontal auto layout and a gap bound to `space/sm`. From **Assets**, drag a Button into it.
5. Select the outer frame and make it a component named `Card`. Link the title to a text property named `Title`, as you did for the button's label.
6. Select the `Content` frame and choose **Create slot** from the context menu or the **Slots** section. Do the same for `Actions`. Each instance can now replace what these frames hold, and the main component's content becomes the default.

Slot settings can describe a slot, limit how many layers it holds, and name preferred components; for example, `Actions` could prefer `Button` and hold at most 2 layers.

## 4. Use the components

1. Add a page named `Examples` and draw a frame named `Light` with vertical auto layout, padding and gap bound to `space/lg`, and a fill bound to `color/background`.
2. Place two Card instances in it: right-click the Card and choose **Create instance**, or drag it from **Assets**. Set their **Title** properties to `Welcome back` and `Pro plan`.
3. In the second card, select the button in the `Actions` slot and delete it, then paste or drag in two Button instances: a Secondary one with the label `Not now` and a Primary one with `Upgrade`. Edit the text in its `Content` slot. Slot content belongs to the instance, so it stays when the Card changes; **Reset slot** in the slot's menu brings back the component's content.
4. Duplicate the `Light` frame and name the copy `Dark`. In **Appearance**, use **Apply variable mode** to set the `Theme` collection to `Dark`. Every bound color in the frame switches, while the cards stay linked to their components.

Now edit a token or a main component, for example `radius/card` or the Button's padding, and watch both frames update.

## 5. Take it further

- **Publish it as a library.** Open **Assets → Manage libraries → Publish library** so other files can use the Button and Card, and accept updates when you change them ([Component Libraries](./components#component-libraries)).
- **Hand the tokens to code.** `pairdraw tokens design-system.fig` prints the variables as CSS custom properties, `--format tailwind` as a Tailwind v4 theme, and `--format dtcg --out tokens/` as W3C design token files. HTML export writes the bound values as `var()` references to the same properties ([Exporting](./exporting)).
- **Check it.** [Checking Designs](/user-guide/checking-designs) and `pairdraw lint design-system.fig --fix -o fixed.fig` find colors that match a token but are not bound to it, and bind them.
- **Track changes.** Keep the file in Git and review changes with [`pairdraw diff files`](/programmable/cli/git).

## Build the example with a script

The example file is generated by this script, which uses the same [Figma-compatible plugin API](/programmable/cli/scripting) as `pairdraw eval`. Run it to build the file yourself, or change it to try your own tokens:

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
