# Changelog

## Unreleased

## 0.19.1 — 2026-11-21

Pairdraw 0.19.1 makes the built-in browser's screenshots and page imports work, keeps the macOS icon orange in the dark icon style, updates installed CLI, MCP, and Harness companions together with the app, and shows each agent's logo. Pairdraw 0.16.1 and later offer this release in the app.

### Changed

- The people list and the Following bar show each agent with the logo of the model or coding agent it runs on, such as Claude Code or OpenAI, and keep the sparkle for an agent they cannot identify.
- Claude Code's Agent, Fast mode, and Ultracode controls in the chat composer each have their own icon instead of the same sliders.
- When the desktop app updates itself, it also updates the Pairdraw MCP server, CLI, and Harness companion already installed on the computer to its own version, once per version, with the package manager that installed each; a failed update still offers guided setup.

### Fixed

- The built-in browser's screenshots work on macOS: each button places a picture instead of failing with "The page returned no picture", a page screenshot holds the whole page down to its last line (up to 4096 points, and at any zoom) instead of only the part the screen fits, and the view screenshot no longer ends in an empty strip.
- **Import page**, **Import element**, and **Screenshot of an element** in the built-in browser no longer fail at once with "The page returned nothing"; they wait for the capture or for the click in the page.
- On macOS 26 in the dark icon style, the Dock shows the Pairdraw icon on its orange tile instead of a dark gray one.

### Security

- Release builds of the desktop app no longer open the Web Inspector from Inspect Element or Safari's Develop menu; development builds keep it.

## 0.19.0 — 2026-11-21

Pairdraw 0.19.0 moves the properties panel into the left sidebar as the Design tab, opens large `.fig` files faster and in less memory, lets agents read and write prototype connections, hardens Cloud access, and fixes a long list of round-trip, layout, text, component, desktop, collaboration, CLI, and export problems. Pairdraw 0.16.1 and later offer this release in the app.

### Breaking changes

- Layers inside an instance no longer resize: their corner handles are gone, their width and height fields are disabled, and a `.fig` export records no size for them, as in Figma; files that already carry such a size still open with it.

### Added

- `get_node` and `get_page_tree` find a layer by its ID on a page that has not been opened yet, loading that page as Figma's dynamic-page mode does, and scripts can load pages with `page.loadAsync`, `setCurrentPageAsync`, and `loadAllPagesAsync`.
- Agent tools can read and write prototype connections: `get_reactions` and `set_reactions` use Figma's plugin shape, keep a change undoable like the Prototype panel, and refuse a trigger, action, or destination the prototype play cannot run.
- Dragging a fill, stroke, or effect row onto another row reorders the list, as in Figma; undo restores the previous order.
- An instance offers Reset all changes in the canvas menu, the Object menu, and its Design panel header, putting it and the instances inside it back over one undo step.
- The design token import offers to pick the folder that holds a resolver's files when they were not picked with it.
- Plugin scripts can keep values between runs with `figma.clientStorage`.

### Changed

- The properties panel now shows in the left sidebar as the fourth tab, Design, beside Layers, Assets, and Slides: selecting a layer no longer opens a panel or changes the sidebar's tab.
- Desktop sign-in approval asks for the code the app shows instead of telling you to compare it.
- `batch_update` changes nothing when one of its operations names a missing layer or an invalid property, instead of applying the rest.
- The authoring reference names the `textDecoration` and `textCase` values; decoration details, not the property itself, take CSS names.
- The MCP reference lists every shared design tool, and the docs state the current count.
- The JSX copy reference names the exported `renderJSX()` in every language.
- The docs state that the MCP server works with the document open in the running editor, and that `eval` is off by default over both transports rather than only HTTP.

### Performance

- Opening a large `.fig` no longer re-derives the whole document for each page it reads, and a page reaches the editor from the reader worker without a second deep copy of every layer, so a document with hundreds of thousands of layers opens faster and in less memory.
- Opening a `.fig` moves the file to the reader worker instead of copying it for the worker, the archive, and the recovery copy, and keeps each unzipped image once instead of copying it into the document again, cutting the peak memory of opening a large file; if the worker fails after taking the file, the file is read again.
- Moving a selection with the arrow keys no longer lays out the whole subtree of every moved layer, nor does undo or redo, so nudging stays instant on large auto layout documents.
- Deleting a large layer captures its subtree once instead of twice, halving the work of a big delete.
- Dragging an effect slider keeps a bounded number of cached filters, so a long session no longer grows with every value the drag passed.
- The first Chinese, Japanese, or Korean text loads only the system fonts its characters need, keeps one copy of each face shared by every canvas, and no longer registers fallback faces as browser fonts, using hundreds of megabytes less memory.
- Paragraphs built from one font provider share one font collection, so a document of many CJK texts no longer copies a variable font's instance per paragraph and fills the heap while opening.
- Undo steps past the history limit are freed again, and a document that is never saved no longer pins its history, so a long session keeps its memory bounded.
- Surfaces and the profiler's font are freed on replacement and teardown, so a long session that switches surfaces keeps handing their pixel buffers back.

### Security

- Someone removed from a workspace loses access to the documents they made there, though an invitation can still let them back in.
- A document grant changes only access that starts from an accepted invitation, so a new grant cannot reach someone who has no access.
- Sending invitations is capped at 100 a day per sender and 5 a day to one address, counted across workspaces and documents, so they cannot be used to send spam.
- A per-document or per-workspace budget, such as invitations or uploads, no longer resets by naming another document or workspace: one account has a cap across all of them.
- The sharing API no longer answers whether an email address has a cloud account.
- A share link stops working while whoever made the link or the document is banned.
- A collaboration room stops taking edits once its document reaches the room size limit, while deletions that free space still go through.
- A Cloud API request over 8 MB is refused with a 413 at the body limit before the handler runs, and a query serving a request is cancelled after 30 seconds.
- Cloud pages carry a content security policy that lets only the site's own scripts and Turnstile's run, keeps plugins off, and stops another site from framing them.
- An official cloud deployment requires MFA for deployment administrators.
- A crafted `.fig` archive can no longer make the app inflate unbounded data: entries and total size are capped.

### Fixed

#### Documents and files

- A page added or moved among pages whose order keys Figma numbered, such as a shadcn/ui kit, is saved where it now sits instead of sorting into another place on reopen.
- Documents opened from `.fig` files save and load pages again after a layer of a component is deleted, including when an instance sits inside a frame of that component.
- A page opened for only some of its components keeps every sibling layer in the order the file saved it, including a reorder made before its other component pages load.
- A layer from an opened `.fig` file that is grouped or moved into a frame keeps its place after the file is saved and reopened.
- An instance keeps the place its own record gives it in its parent rather than inheriting its component's alignment, grow, positioning, and constraints.
- Spreading a pile of layers gives the same result on every run instead of a different arrangement each time.
- A rescaled instance draws its vector at the instance size after the file is reopened, instead of at the component's outline size.
- Pasting a layer copied out of a component while it is bound to one of the component properties pastes it unbound instead of failing.
- A fill, stroke, or effect bound to a variable keeps its binding when another entry in the list is added, removed, or moved.
- The Plugin API `componentPropertyReferences` reports the bindings of any layer in a component or instance, not only frames, text, components, and instances.
- Tools and scripts that read a page not yet opened load its layers first, and switch to the page that was asked for last instead of one that finished loading later.
- Agent tools, including `render`, `import_svg`, `import_mermaid`, `import_html`, `insert_icon`, and `insert_library_component`, refuse a parent inside an instance instead of adding layers the document cannot save as `.fig`; layers added to an instance slot still save.
- Pages of a large `.fig` keep loading in the reader worker after the document is edited, instead of falling back to a main-thread load that freezes the editor; a page that arrives while an edit is open stays out of that edit's undo step.
- A large `.fig` page applies in pieces as it arrives from the reader worker, so the editor keeps responding instead of freezing for the whole page; a load that fails takes back only its own layers.
- Saving a `.fig` keeps the document when drawing its optional file preview fails: the save falls back to the placeholder thumbnail instead of rejecting.
- Text whose glyphs cannot all be outlined, such as a script drawn in a substituted face, is saved without derived glyph data, so Figma lays it out with its own fonts instead of drawing holes.
- An image fill or stroke keeps its exposure, contrast, saturation, temperature, tint, highlights, and shadows adjustments when a `.fig` file is saved after that image is edited.
- A dashed stroke keeps its dash pattern when a `.fig` file is saved and reopened, including on instance layers, where a stroke weight or dash set on the copy also survives a component edit or a variant swap.
- An instance text draws the size, font, spacing, decoration, and case of the text style it inherits, including the style's variables, over values its own record claims, and a text range that names a fill style draws in that style's paints.
- Converting a document to `.pen` keeps every vector layer's path geometry instead of writing empty paths, and keeps each layer's variable mode (theme) instead of dropping back to the default one.
- `save_file` and a save on close refuse a destination that is not the document's archive (`.fig`, or `.jam` for a board) before writing anything, and name the path to use instead.
- A `.pen` instance draws the children its `ref` passes in place of its component's layers, with or without a declared slot, and a `fit_content(N)` fallback holds only while the instance is empty.
- A hugging `.pen` frame with `space_between` keeps the gap between its children instead of packing them together, and a `.pen` padding of four values is read as top, right, bottom, and left instead of dropping the bottom and left.
- A `.pen` image whose path is percent-encoded, as pen.dev writes `My%20Design-assets/…`, now loads: the path is decoded a step at a time, keeping escapes that would name another folder.
- Icons and other layers overridden through a `.pen` instance inside a component keep their override when that component is used, instead of falling back to the component's default.
- Opening a second document over automation while another is still loading answers both calls, instead of the first timing out after 20 seconds.
- Undo after another document replaced the open one no longer edits the new document's layers, and each document keeps its own history.
- A document reloaded from disk shows the page it was on with its layers, instead of that page empty, and opening a file's metadata alone no longer counts as a change.
- A recent file stays in Recent files when opening it is cancelled, so it can be opened again.
- A save or export the VS Code editor never answers fails with a message after a minute instead of leaving the document saving forever, and a document reopened after VS Code restarts loads the backup hot exit wrote instead of dropping the edits made before the restart.

#### Text and fonts

- Text measured in a substitute font takes its own font's size, and its auto-layout frames follow, once a face of its family loads.
- Text without style runs wraps and outlines in the face it is drawn in, at its weight, letter spacing, and variable-font axes, instead of the browser's default font.
- Text set in a missing family draws in the default family at the text's own weight, a weight the text sets explicitly still wins, and its italic comes from the default family's italic, so the canvas and the file agree instead of slanting or faux-bolding the wrong face.
- The Typography and Fill sections show the style a text's characters are drawn in and style every character when changed, as Figma's node setters do, so a range no longer hides a new size or colour; font-axis edits keep the other axes a range sets.
- A `.pen` document's bundled fonts are read, so its text draws in them instead of being substituted, and `.fig` exports name the real family and style, such as Geist SemiBold.
- `figma.listAvailableFontsAsync()` lists every style of installed and bundled families, and of online families once a font of theirs is loaded, instead of only Regular; in the CLI and the MCP server it lists the bundled and online families instead of none.
- Browsers set to Chinese (`zh`, `zh-SG`, `zh-Hans`) open the app in Simplified Chinese instead of English, and Traditional-only Han is told apart by OpenCC's table instead of a hand-picked list that counted shared characters such as 警 as Traditional.
- Arabic and other right-to-left text lays itself out right to left when its direction is unset, and text copied into Figma carries the direction its saved lines were laid out in, so right-to-left text keeps its glyphs.
- The empty line a closing line break opens starts where the text ends, so its line metrics no longer overlap the line before it and a saved text no longer carries a baseline over the break.
- Letter spacing and line height bound to a variable export as that variable's token when they are in pixels, while a percent of the font size stays literal.
- Text taller than its box overflows on the side away from its vertical alignment, as in Figma: a bottom-aligned box draws its first line above it, and its blur, mask, and saved file bounds cover it.
- Characters typed at the edge of a styled run keep that run's colour, font, weight, decoration, and variable bindings, whether typed at the end of a line, at the start of the text, over a selection, through an input method, or pasted.
- Text that sizes its own width wraps at its max width, raised to its min width as auto layout does, so a max width wraps or truncates it when the engine lays it out, not only in its saved glyphs.
- A text box set to truncate clips to the lines its height holds and ends the last with an ellipsis, instead of drawing every line past its box.
- Lines space by their exact line height, landing each baseline on a whole pixel as Figma does.
- A text layer is named by its characters, trimmed to one line, until it is renamed, whether it is typed on the canvas, drawn by a script, or written through design JSX, HTML, or SVG import; renaming it keeps that name through later edits, as in Figma.
- A script's text sizes to its content on one line unless the script gives it a width.
- A vector's corner radius rounds its fill as well as its stroke, whether the radius is set on a point or on the layer.
- A pen path of two points closes into a shape when its first point is pressed, as in Figma.
- Text layers keep their stroke when exported to SVG, with an outside stroke painted behind the glyphs as the canvas draws it.

#### Canvas, layout, and export

- Text drawn from a file's saved glyphs is antialiased at every size, as in Figma.
- Tiles repaint when the page colour changes without an edit, such as switching the app theme.
- Text the canvas held back while its fonts loaded is drawn as soon as they arrive, without waiting for the next edit.
- The canvas stays sharp when a panel leaves it a fraction of a pixel short of a whole one.
- Opening a document, Zoom to fit, and Zoom to selection keep the content clear of the tool rail and the controls floating over the canvas, fitting it into the room they leave.
- Nested instances and other non-vector layers draw, export, and save their stroke at their current size after auto layout, a component sync, or a resize.
- Negative padding in an auto layout frame places its children past the frame edge, as Figma does.
- A negative gap in an auto layout frame overlaps its children by it, in either direction, and a row hugs to the width its overlapped children take.
- A document whose layers nest more than 128 auto-layout frames deep is refused with a clear error instead of crashing the layout engine for the rest of the session.
- Groups shrink to the layers left in them after a delete, a move to another page, or a layers-panel drag, and an auto layout around them makes room.
- Duplicating a layer inside an auto layout places the copy in the flow and resizes a hugging parent, with undo and redo doing the same.
- Add auto layout to a selection keeps the spacing its layers already have, so a row 20 px apart does not jump together.
- A frame's "Reverse Z-index" draws and hit-tests its layers in the reverse order, so the first layer sits on top, as Figma's does.
- Layers that ignore auto layout keep their place when the Hug frame around them is resized again, because layout places them from the size they were last placed for.
- A constraint resize keeps a layer's fractional box, and Left & right shrunk past zero turns the layer over instead of clipping its size.
- A width or height typed in the Design panel places the frame's layers by their constraints, as dragging its corner does.
- A script that edits layers and then moves or sizes one lays out the recorded edits first, so the layer lands where Figma puts it when its frame changed size.
- A grid child's `colSpan` without a `colStart` spans its columns and is placed automatically, as CSS Grid does.
- Layers a frame places by hand keep their constraints in exported HTML: Right and Bottom sit on the end edges, Center keeps its offset, Left and Right and Scale size from the frame, and offsets are measured inside its border.
- A dashed vector with several closed contours, such as a ring or a letter with a counter, dashes every contour instead of drawing all but the first solid.
- SVG export clips a rounded frame's children to its rounded or smoothed corners, and fills smoothed rectangles and frames with their smoothed outline.
- `export_image` and other image exports include text right after a document comes to the front, instead of leaving every text layer out until its canvas loads its fonts.
- Exporting a layer on its own keeps the variable mode its ancestors set, so the image matches the canvas.
- JSX export no longer fails for a layer with a Figma noise effect, or any effect JSX cannot express; those effects are left out of the source.
- HTML, JSX, and Tailwind export lay letter-spaced text out as the canvas does: a line that fits stays on one line, right-aligned and centred lines line up with the box, and auto-width text takes no extra room for the spacing after its last letter; a span that changes the font size writes its percent spacing again.
- HTML exported from a design blurs and shadows as the canvas draws them, and an imported CSS shadow keeps its blur; HTML exports declare the design variables their styles reference, so colors, gradients, and spacing resolve when the page opens in a browser.
- HTML import and paste paint CSS `background-image` gradients — linear, radial, and conic, with multiple layers and inline `url()` images — as gradient fills sized to the element, and HTML export writes gradient fills back as `background-image` gradients; web captures keep the size, position, and repeat, dropping unsafe `url()` sources, so gradient surfaces arrive from the extension and the capturer SDK.
- A captured checkbox or radio imports as the small square the browser paints, centered where the page drew it, instead of a full-width bar when a stylesheet stretches its input; an absolutely positioned or margined one keeps its placement and the room its margins took.
- A 4000×4000 frame exports at 3× without exhausting the renderer, and an export too large to draw fails with a clear message instead of aborting.
- JPG exports fill transparent areas with white, as Figma does, instead of black, and PDF exports embed image fills from the CLI and other hosts without a browser instead of leaving them out.

#### Editing and layers

- Each press in a colour picker is one undo step, and Escape keeps an edit such as a chosen paint type or a typed colour.
- Image fills open their fill settings again, so Choose image and Replace swap the bytes while keeping the scale mode and crop, for every selected layer and as one undo step.
- Shift-dragging a selected layer keeps it selected while it moves, and a Shift-click on it deselects it only when the press ends.
- Right-clicking a frame, section, or component name selects that layer, a locked one included, on the pane that was clicked.
- Pressing ⌘R, or double-clicking the name in the design panel, renames the selected layer in place instead of doing nothing while the Layers view is hidden, and with the sidebar closed ⌘R opens the design panel to rename the layer there.
- Panning with the wheel, the middle button, or Space still works while the Comment tool is selected.
- The marquee border is one screen pixel wide at any zoom, as in Figma.
- A selected layer no longer outlines its parent frames, however deeply nested, as in Figma.
- Arrow keys no longer move the selection while a list, menu, or dialog is open; they go to it instead, and a key pressed while a menu, dialog, list, or picker is still animating shut goes to the canvas, so Escape followed quickly by a tool key works.
- ⌘S saves while text is edited on the canvas or a field is being typed in, committing the field first.
- ⌘O, ⌘N, ⌘, and the other application and file shortcuts run while a text field has focus, as the desktop menu's accelerators do, while the field keeps every key that acts on the canvas.
- Menu items that act on the selection, such as Paste to replace, Rename selection, Align, Remove Auto Layout, and Auto arrange, are disabled while nothing that can use them is selected, and Edit › Copy and Cut wait for a selection, as in Figma, while Paste stays available.
- Text copied in another app pastes as a text layer with that text, instead of pasting the layers last copied in the app.
- A layer dropped, drawn, or pasted onto an icon lands on the page instead of inside the icon, and an icon frame no longer counts as a slide in the Slides panel, presentation, or PDF and PowerPoint export.
- Use as mask on several layers wraps them in a `Mask group` whose bottom layer masks the layers above it, at the page level as inside frames.
- Pen anchors land on the pixel grid like the shape tools, so a path drawn at a fractional point starts on a whole coordinate, a guide dragged from the ruler lands on a whole pixel, and a component dropped from Assets lands on the pixel grid while Snap to pixel grid is on.
- Deleting a page is one undo step: undo brings the page back with its layers, its place in the list, and its view, and redo deletes it again; adding, renaming, and reordering a page undo too.
- Adding a page opens its name for editing, so the first keystrokes name it instead of changing tools, and adding notes for AI, or a variable, puts the cursor in the new field so the next keystrokes reach it.
- Undo and redo work while editing text: ⌘Z steps back through the typing and restores the caret, ⇧⌘Z steps forward, an input method composition undoes as one step, and ⌘Z after leaving text edit reverts the whole edit as one step.
- Undoing an edit takes back the edited-field marks it added, so a layer ends the step exactly as it began it.
- Redoing an inserted instance restores the layers it had, ids included, so its overrides and links keep their targets.
- A script inserted from Goodies or the Insert menu undoes in one step, instead of leaving the layer on the canvas.
- Undoing an edit inside a component returns the document to saved, instead of the instances that follow the component counting as a change made outside the history, and a nudge records its step when the arrow keys pause, so undoing it also returns the document to saved.
- Edits you make while an AI or MCP edit is waiting are their own undo step and are no longer undone with it.
- Deleting a variable mode or a collection clears the mode a layer had chosen from it, so the layer no longer keeps a mode that is gone.

#### Components and instances

- Detaching an instance keeps the overrides its nested instances carry, under their own layers, so a saved detached copy reopens with the text and styles its component gave them; undoing the detach restores the nested instances as they were.
- Detaching an instance leaves its layers without the component child ids they arrived with, so nothing reads them as still belonging to the component.
- A text edit made in an outer instance survives component sync over the assignment its component makes, while an assignment wins a text override made at the same level, as in Figma; a paste remaps the property an assignment override is keyed by.
- Undoing an assignment made through a nested instance drops the override the edit recorded on the instance above it, so redo and a second undo leave the same layers as the first, and an outer text override no longer beats an assignment it should lose to.
- A literal fill or stroke an outer instance sets on a layer inside a nested instance stays unbound through component sync, instead of taking the component's color binding back.
- A sync that matches an instance's copy to a namesake replacing its component layer relinks the copy over the link a file recorded, and announces the change, so a reopened document saves and collaboration follows it.
- A paste into another document keeps the mode an instance pins on a layer and the variables its overrides bind, remapped to the collections and variables the paste copies.
- A slot made inside a variant is defined on its set, as Figma keeps it, and removing it drops the content of every variant's instances; duplicating slot content, dragging a layer into a slot, or reordering it claims the slot in the same undo step as the edit.
- A script that edits a component and then reads an instance sees the edit at once, as in Figma: the Plugin API syncs pending component edits before reading or writing a layer inside an instance, and a failed sync is retried at the next read.
- A binding change on a layer inside a nested instance claims only that binding, so the layer's other bindings keep following their component.
- A synced bound number takes the value of the mode its copy sits in, not its component's, and a number the instance overrides keeps its own value through the sync.
- A text style bound to a variable whose token path another collection shares reads back bound to the same variable: the export records each bound field's collection and variable, and warns about references other tools could misread.
- A bound paint keeps an edit to its color or opacity until its variable's color for the layer changes, as in Figma: binding writes the variable's color, a value or mode change refreshes it, and readers, the canvas, copies, and saves use the stored paint. It refreshes whenever the mode set for its layer changes, even to a mode giving the same color, and a paste keeps the paint edits it copied, counting from the colors applied when the copy was made.
- Switching an instance to another variant keeps the overrides its layers share, as Figma does, instead of resetting every layer to the new variant.
- An instance of a variant is named after its component set, as in Figma, and swapping the variant keeps that name.
- Design JSX instances whose component name more than one component or component set shares warn with each candidate's ID, and variant props select the component set instead of an unrelated component of the same name.
- Publishing a library no longer fails when a published component contains an instance of a variant: the variant resolves through its component set's asset key, and library assets keep a stable asset key across publications instead of taking a file node id for the key of a component that has none.
- A layer that holds an instance can no longer be moved into the component that instance draws, which left the component sync looping on itself until the app threw, and moving a layer into an instance of a component is refused unless it lands in a slot, so the instance never holds a layer nothing in its component answers to.
- Deleting a layer inside an instance hides it for that instance, as Figma does, instead of doing nothing or letting the layer come back when the file is reopened, and drops the overrides that named it; a slot's contents still delete outright.
- A group's box follows a child that moves or resizes from the properties panel or the plugin API, not only one dragged on the canvas, and it goes back with the child on undo.
- Taking auto layout off a frame clears the wrap, alignment, spacing, and padding it can no longer use, so reopening the file no longer shows settings the frame had dropped; adding auto layout to a group turns it into a frame, as Figma converts it, and undoing a change of a frame's sizing puts the size it had back.
- Binding a variable to an instance's fill records that fill as the instance's own, and a size limit set on a layer inside an instance no longer claims to be that instance's own, so reopening no longer shows overrides the document never had.
- An instance frame takes its component frame's alignment, positioning, fill behaviour, and size limits, which the file records once for both, so absolute positioning in a component no longer reappears only after reopening.
- A page can no longer be moved into a layer, which left the document holding a page inside a frame.
- Saving a document whose instance holds a copy of a component layer that no longer exists no longer fails; the rest of the document is written.

#### AI chat and agents

- The notice after an AI edit's Show brings the document holding those layers to front, and names it when another document is showing.
- A document the chat's own coding agent starts opens in front while the reply that started it stays on screen.
- A reply that is already running keeps running when another document opens while the chat is being taken up.
- A failed agent tool call stays a compact card: the chat shows the line that failed and clips a long output to a few lines, with Show all for the rest.
- Deleting a chat forgets its agent, so a late tool call from a deleted chat finds no reply and the document it worked on is not held open.
- A coding agent keeps its MCP session while the app is briefly unavailable, so a busy document no longer takes the agent's tools away mid-run.
- A slow edit, such as a render that draws a whole page, returns its result instead of a timeout the app then applies, and calls made while it runs wait for it instead of failing at the shorter read deadline.
- Exporting an image or motion clip from an agent works for a document that is open behind the one on screen: it draws with the app's CanvasKit offscreen instead of reporting that the document has no renderer.
- An agent's `viewport_get` and `viewport_set`, a paste without a cursor, and the menu zoom use the canvas's middle instead of the window's.
- `analyze_overlaps` says how far a layer protrudes in pixels instead of printing an area as a distance, and keeps one reply under 64 KB while still counting every finding in its summary.
- A `script` layer accepts any CSS colour the canvas takes, such as `#f00` or `rgb(0 128 0)`, and a refused layer names the layer and field that is wrong, as in `roots[0].fill: "#zzz" is not a color`.
- Creating a code layer whose program cannot draw leaves no layer behind and answers with the program's error.
- A tool argument that is a union reports the field of the branch the value matched instead of "Expected Object but received Object".
- Design JSX refuses a layer inside `<Text>` instead of creating a child the JSX export drops, reports and leaves out a layer prop of the wrong kind, such as a name or a size that is not a number, bounds one out of range, and warns when an unreadable `w`/`h` or colour value is ignored, leaving an unreadable paint out instead of painting it black.
- The plugin API refuses NaN and Infinity for positions, sizes, rotation, opacity, strokes, corner radii, and auto layout spacing, as Figma does, so a non-finite number no longer breaks a layer's bounds.

#### CLI and MCP

- CLI commands reject misspelled options instead of silently ignoring them, so `pairdraw info file --jsonn` fails with `Unknown option: --jsonn` rather than printing human output a script cannot parse.
- Piped CLI output carries all of it: `pairdraw tree design.fig --json | jq` no longer truncates at 64 KB, and large human-readable results (lint, find, query, diff, node, tool) stream through the same path.
- `pairdraw export` and `pairdraw convert` write their default output next to the input file and never over it: a `.fig` export of `design.fig` without `-o` writes `design-export.fig` instead of replacing the document with the exported page or node.
- `pairdraw pages` and `pairdraw fonts` read every page of a file before reporting, so pages that were not loaded yet are counted.
- Exporting HTML with external assets creates the output folder when it does not exist yet, and Storybook exports with `--framework react` or `vue` write a `parameters.design` image for each generated component's state stories, showing the variant that draws the state, as static HTML stories already do.
- `pairdraw documents save` writes a browser document opened or created through the MCP server back to its file, instead of asking for a path it already has, and `documents new --path` names the document after that file.
- Opening a file that is already open recovers an automation session whose document was closed, so untargeted CLI calls work again without passing `--document-id`.
- `pairdraw tool describe` describes tool arguments as the input a caller writes, so a numeric argument's numeric-string form is valid instead of being reported as a number with a string pattern.
- Deeply nested layers and layers whose children link back to a parent flatten without overflowing the stack or repeating a subtree.
- Diagnostics keep the file name of a built chunk, hash included, in a stack frame from the app's own origin, so an error report still finds its source map, while a chunk-shaped key elsewhere stays redacted.

#### Collaboration and Cloud

- Several tabs opening the same empty Cloud room at once now share one document, so every peer receives the others' edits instead of each staying on its own graph.
- Concurrent edits to different fields of one layer keep every field marked as edited on every peer, and rendering a text layer no longer records its picture cache as an edit.
- A workspace the account is not in answers 404 for its entitlements instead of a server error.
- A desktop sign-in page keeps getting fresh codes after a few reloads instead of being rate-limited for half an hour.
- A malformed id in a Cloud URL answers 404 instead of a database error.
- Signing out, or signing in to a server as another account, removes that account's Cloud documents from Recent and deletes its uploaded copies from this device, keeping any with changes not yet uploaded.
- Home keeps the chosen workspace while Cloud checks the session, and creating a design waits a moment instead of putting a local file in its place.

#### Desktop and browser

- On macOS 14 and later, agents can keep editing through MCP while the desktop app is hidden or the screen is locked, instead of every call timing out.
- Fonts installed on the system are drawn by the page instead of being copied into it, so bold and italic text keeps its own face.
- On Linux, the desktop app caches recent file previews and downloaded fonts again, so they no longer load anew each time, and it starts on NVIDIA Wayland sessions instead of being disconnected at its first paint.
- On Linux, typing in a text field is no longer taken by menu shortcuts such as N or Backspace.
- The editor menu no longer appears in the Software Update window on Windows and Linux, and View settings keep their check state in the desktop menu while Home hides the items.
- Windows fonts that list a width-named face as its own family load with the right weight and style.
- Check for Updates reports its answer even when it joins the check the app runs at launch.
- View → Variables… opens the variables dialog from the desktop menu as from the app menu.
- Unsaved edits to a file saved by hand get a recovery copy when autosave stops, so a WebView crash no longer loses them, and the editor reloads its page when the process backing it ends on macOS instead of leaving a blank window.
- Reloading a document on desktop parses the file as it was read, without holding several copies of it in memory, and a document whose page stops drawing before it is first shown stays open in its tab and reports the failure instead of its tab closing with no message.
- The browser app starts on Chromium versions whose notification permission status refuses event listeners, instead of showing "Pairdraw couldn't start".
- Pasting web HTML works in Safari and the desktop app's WebKit views.

#### Interface, accessibility, and packages

- Icon-only controls in the code panel, the asset list, the boolean operations menu, and the gradient editor announce what they do, in the interface language; a tooltip describes the control it belongs to, so a screen reader hears what it says while it shows, and the layers panel is announced as a multi-select tree, its rows as tree items.
- The command palette's menu headings, such as Theme and Export Selection, open their choices instead of closing the palette and running nothing, and File › Export Selection and its formats stay disabled until layers are selected, instead of appearing to run and doing nothing.
- The Design panel, the canvas size label, and the auto layout fields show X, Y, width, height, rotation, padding, gap, and size limits to two decimals, as Figma does, and a multi-selection's width and height no longer show a raw value. A selection's edges on the rulers read to three decimals at any zoom, with the two badges parting on a narrow selection instead of overlapping, and a size, limit, padding, or gap bound to a variable shows and edits from the two decimals the panel shows.
- A press and hover pass through a locked layer and everything inside it to what lies under, while a right-click still selects it, so its menu can unlock it.
- A copy field's text reads left to right in a mirrored interface; its copy button still follows the reading direction.
- Relative times count calendar days rather than 24-hour spans, so something from late the day before yesterday reads as two days ago, not yesterday.
- Sizes in storage, recovery, save, and update messages write their numbers as the interface language does, so German reads 1,5 MB where English reads 1.5 MB, and the font picker's search field asks for fonts in the interface language instead of always in English.
- A variable collection lists its modes by their sort position with the default first, so an imported collection shows its modes in Figma's order and a new default keeps that place through export.
- A bound number field reads like any other field, its variable named by the variable button's tooltip; a binding with no value still shows the variable's name in the field.
- Each row of a variable picker previews its own variable's colour inside a bound fill field, instead of every row showing the bound variable's colour.
- Recent files leave the list from a file's own menu; the section header no longer clears the whole list at once.
- Tab moves focus on the Home screen instead of being captured for layer selection.
- The code panel leaves the menu's keys to the menu on every platform, and Tab or Shift-Tab indents; Undo and Redo from the menu reach the editor's own history.
- The comments list says that every comment is resolved when resolved threads are hidden, instead of claiming there are no comments.
- Clicking a presented slide steps to the next slide, as Space and Enter do, while links and the presentation's controls keep their own clicks.
- Presenting a slide or previewing a frame draws only that frame and its contents, without the page layers over it, and leaving a preview returns the editor to the pan and zoom it had.
- The prototype preview bar stays above the letterbox and the scrim, so its buttons can be clicked on a letterboxed frame.
- A library copy's text links point at the copy's layers rather than the source file's, so a link still jumps to its layer after the component is published, inserted, or updated, while duplicate and paste keep their links as they were.
- A Figma paste-to-replace keeps the pasted layers as they were drawn instead of turning with the frame that holds them, while keeping the copied angle and the replaced layer's canvas position.
- Iconify icons draw in the box their set gives them, at Iconify's default of 16 when it gives none, so Bootstrap Icons no longer draw at two thirds of the icon and Jam's own offset no longer shifts it; an alias draws its parent with the flip or turn it adds, and `currentColor` paints take the color an SVG element sets or inherits.
- `@pairdraw/core`'s editor declarations name their viewport vector from the scene graph, so a consumer's type check resolves it, and `@pairdraw/dom-css` declares the CSS object model shapes it hands out instead of borrowing them from the parser it loads at runtime.

## 0.18.0 — 2026-11-18

Pairdraw 0.18.0 makes saves safe and agents dependable: a save or export replaces a file only after the new copy is fully written, each AI agent stays on the document it edits while you switch tabs, a reply whose provider stalls ends with a notice instead of spinning forever, MCP tools report failures as errors and name the arguments they accept, plugins run under tighter limits, and Hebrew, Thai, and Devanagari text draws through fallback fonts. Pairdraw 0.16.1 and later offer this release in the app.

### Added

- A coding agent that works silently for minutes says so in its chat, with how long it has been quiet and its Stop, instead of leaving the turn unexplained.
- Agent tools can detach instances into plain frames, keeping their children, overrides, and position.
- The diagnostics report records when and how the app's MCP server exited, so a server that vanished can be explained later.

### Changed

- A tool call with an unknown or missing argument names the arguments the tool takes and the values it accepts, and an unknown variable binding field lists the fields a variable can bind to.
- Each agent stays on the document it edited. The CLI uses `PAIRDRAW_SESSION` when it is set, and otherwise one shared `cli` session. Calls that name no session share one anonymous document.
- An edit, including a page snapshot, goes on a document tab and leaves Home or a New file tab in front. Home and a New file tab are not documents an agent can edit.

### Security

- Saving a document cannot write the webview data folders the file-system scope already denies.
- Plugins cannot call asynchronous tools, including reads, so a read-only plugin cannot list system fonts or render an export.
- A plugin call or tool result larger than 64 KB is refused instead of being delivered to the editor, and an oversized result says that it is too large.
- Plugin network globals stay blocked if a program deletes them, a plugin cannot start a worker, and a plugin does not run when a network global cannot be blocked.
- A sandbox frame ignores a message that is not from its parent page.
- A plugin that floods the editor with calls stops when its run time is up.

### Fixed

#### Saving and documents

- Saving or exporting a document on the desktop, converting or exporting with the CLI, and saving through the browser's MCP server replace the file only after the new copy is fully written, so a crash or a full disk leaves the previous file in place. A folder that will not accept a new file fails the save and leaves the previous file unchanged.
- A failed save stays on screen until the next successful save, and the document stays unsaved with its recovery copy kept.
- Opening a document no longer takes the place of a recovered one, which keeps its recovery copy, and a coding agent closing a document leaves its draft and recovery copy behind, so the work stays recoverable from Home.
- Opening a draft an agent edited while Home was in front shows that document, and the agent keeps editing the same tab. Saving or deleting a draft Home is holding shows that document, and quitting asks about unsaved changes held there.
- Closing a file without naming it only closes a document that agent opened. Saving without naming it saves the document that agent is targeting, or the document in front. Opening a file that is already open does not let that session discard it.
- File > Open Recent lists the file a save just wrote, and follows the recent list while Home is open.

#### AI chat

- A reply keeps running when you switch documents, and the chat shows which agent works in which document with a way back to it.
- A reply whose provider stops sending ends with a timeout notice instead of a spinner that never stops, and the timeout also stops the provider request, so a tool call that arrives after the wait does not run.
- A tool call or an approval that takes longer than the gap between provider chunks still finishes, and the model continues the turn. A model that thinks before its first token, or again after a tool, keeps the longer first-chunk wait for that step.
- A model that returns neither an answer nor a tool call ends the turn with a retryable notice instead of an empty reply, and a coding agent that starts but never answers ends the wait with a start-timeout notice.
- Sending a message right after switching the chat's model no longer opens guided AI setup: the chat waits for the new model's key status instead of reading the previous model's.

#### MCP and agent tools

- An MCP tool call that fails now reports an error to the client, instead of an error message delivered as a successful result.
- `switch_page`, `viewport_set`, and `select_nodes` move the editor, so the page, view, and selection a tool sets are what the canvas, the panels, and the next call use.
- A color a tool does not understand, such as a mistyped hex value, is refused instead of painting the layer black.
- `get_node` reports a layer's rotation and the padding and alignment of an auto layout frame.
- `batch_update` takes the list of operations its schema describes, `export_image` accepts its formats in either letter case, and `insert_icon` places the icon at the x and y it is given.
- Library listings include each component's asset key, so a component can be inserted without already knowing that key.
- An MCP client that reconnects without closing its old session takes that session's slot back, and a session left idle for two minutes gives its slot to the next client; a session another client is using is never taken. A client refused for lack of a slot is told the server's limit and how long an idle session holds its slot.
- The app starts its MCP server again after the server stops, and reports a server that keeps stopping after repeated attempts instead of starting it forever. The server also ends when its app-attach watchdog closes it, instead of staying in memory without serving.

#### CLI and file formats

- A headless `tool call` that fails exits with an error and leaves the document file unchanged.
- `pairdraw export --format pdf` writes the PDF when the CLI runs under Node, not only under Bun, and `pairdraw export --thumbnail` writes a page thumbnail fitted to `--width` and `--height` for PNG, JPG, and WEBP, instead of always failing.
- `export --quality`, `export --scale`, `export --width`, `export --height`, and `analyze colors --threshold` refuse a value outside their range, and every command refuses an extra positional argument instead of ignoring it or taking it for the output path.
- `pairdraw eval --output` refuses a path whose directory does not exist before the script runs, instead of running the script and then failing to write.
- `pairdraw lint` refuses an unknown preset or rule with a clear error instead of crashing or passing silently.
- `pairdraw variables` counts the variables its filters leave, and `--json` writes JSON for a document without variables instead of a sentence.
- The CLI reference lists the node types `pairdraw query` accepts as tags.
- Opening a file whose `.fig` archive is damaged or is not a ZIP fails with a clear error instead of decoding different content silently.
- Converting to draw.io and back keeps a frame a frame, a rectangle a rectangle, and every layer name, and converting to draw.io says which variables the file cannot hold instead of dropping them silently.
- A `.pen` roundtrip keeps the page name instead of replacing it with the first layer's.
- Printing tokens says which variable took a numbered custom property name because another token's name collides with it.

#### Canvas, text, and export

- A shadow missing an offset no longer crashes the canvas every frame or stacks a repeated error toast. It is given an offset when it enters the document, one bad layer does not blank the rest of the canvas, and a layer the canvas cannot draw is recorded once for that layer and that error.
- The canvas draws the selection again after the browser takes its WebGL context away.
- Hebrew, Thai, and Devanagari text draws in an installed or Google Fonts fallback when its font lacks those letters, instead of empty boxes, and text in a font that is not installed exports as the substitute face instead of an empty layer.
- Saving text that truncates keeps it in a fixed box that ends its lines.
- A page exported as standalone HTML keeps its fonts when images and fonts are saved beside the page.
- A design JSX shadow that is missing a color, an effect whose radius is not a number, or a type that is not an effect name is refused, and the error names that prop. A design JSX blur may omit its color, which is stored as transparent.
- Publishing a library no longer counts a text component as changed when only its measured text height was recalculated.
- Stopping following returns the canvas to the pan and zoom it showed before you started following, whether you stop it or the person you follow leaves.
- A settings choice applies when it is made with an assistive press or a keyboard click, not only with a mouse.

## 0.17.0 — 2026-11-16

Pairdraw 0.17.0 is a bug-fix and hardening release: imported HTML, `.fig`, `.pen`, draw.io, and Mermaid files open more faithfully, damaged files fail with an error instead of freezing the app, rotated layers measure, align, and snap where they are drawn, and HTML export can no longer be made to carry live markup. Pairdraw 0.16.1 and later offer this release in the app; 0.16.0 has no update feed, so install it by hand once.

### Breaking changes

- `computeAbsoluteBounds` from `@pairdraw/scene-graph/geometry` takes the graph (`computeAbsoluteBounds(nodes, graph)`) instead of a position lookup, so it can measure rotated and flipped layers.
- `SceneGraph.createNode` and `createNodeWithId` throw when the parent does not exist, and `createNodeWithId` throws when the ID is already taken or names the layer as its own parent, instead of leaving a detached layer or replacing the existing one.

### Security

- Standalone HTML export keeps style values from imported documents inside the page's stylesheet, so they can no longer add markup to the page.
- HTML export leaves out imported JSX attributes whose names would add other attributes to the element, and writes an imported layer whose tag name is not a valid element name as a `div`, so neither can add attributes such as event handlers.
- Token stylesheets keep collection and mode names inside their comments, so a name can no longer add CSS rules.
- The MCP server refuses `/rpc` and `/mcp` request bodies larger than 128 MiB instead of reading them whole.

### Fixed

- Damaged `.fig` files and Figma clipboard data fail with an error instead of freezing the app or loading wrong values; a raw `.fig` file that is cut short reports a corrupted file, and text with an unpaired surrogate no longer loses the character after it when saved.
- A `.fig` file whose component property points to a missing parent property, or whose variable holds a nested color expression, now opens instead of failing to load.
- `parseVarint` from `@pairdraw/kiwi/fig` reads values of 2³¹ and above correctly.
- `.pen` files: a number too large to store is reported where it is instead of saving a file that cannot be reopened; layer `metadata` survives saving; a repeated layer ID keeps every layer; a gradient of an unknown type opens as linear; text such as `no` or `0` in a true/false field reads as the field's default; and converting a document to `.pen` keeps the content of instances whose component is not in the file.
- Imported HTML names layers after their `data-name`, so a page exported to HTML and imported back keeps its layer names.
- Imported HTML resolves CSS custom properties declared on any selector, `var()` fallbacks, including ones that hold parentheses or another `var()`, text styles set on `:root`, `calc()` products written with the number first, and selectors that mix child and descendant combinators, such as `.a > .b .c`.
- CSS colors with a `none` channel, such as `rgb(none 255 0)`, import correctly, and out-of-range and wide-gamut colors are clamped or mapped into sRGB, as browsers show them.
- JSX style strings keep semicolons inside `url()` and quoted values, so data URLs import intact.
- Design JSX keeps `<!-- … -->` written inside attribute values and string literals instead of removing it as a comment, and the streaming preview shows Reka parts such as `Switch.Root` while the JSX is still arriving.
- Mermaid flowcharts whose labels nest HTML tags very deeply import instead of failing.
- draw.io SVG exports whose embedded diagram is percent-encoded or Base64 open as draw.io files.
- JSX export of a page or document exports its top-level layers instead of failing with "Nothing to export".
- The CLI's `export` reports the real file size of text exports that contain non-ASCII characters, and `convert --help` lists every output format it can write.
- Rotated layers measure where they are drawn: zoom to selection, ruler selection marks, Align for one layer or several, visual bounds of flipped layers, the area exported for AI image changes, rotated clipping frames, and rotated underlined text all follow the drawn shape.
- Snapping measures a rotated line from its start point, where it is drawn, and no longer draws a guide for an equally near edge it did not snap to.
- Clicking where a mask hides part of a layer no longer selects that layer, following an ellipse, rounded, or vector mask's outline, and zero-width or zero-height layers can be clicked.
- The Scale tool scales text on a path together with its layer.
- Layers with a corrupt parent cycle no longer freeze the editor.
- A duplicated layer inside an instance no longer keeps stale styles after its component changes.
- Text whose characters bind a size or spacing to a variable keeps its scaled size after the Scale tool, and those characters keep their own scale when the layer is unbound or rebound or a variable it binds is deleted; a bound font weight no longer changes with the scale.
- Creating a variable from a property field binds every selected layer and corner the field edits; from the Opacity field it keeps the layer's opacity instead of setting 100%; and from a line height or letter spacing shown in percent it holds the pixels at the font size, so binding it keeps the text as it was.
- Undoing Move to page selects the moved layers again.
- Zooming to fit very large content stops at the 2% minimum zoom.
- Connectors brought back when a failed edit is rolled back keep following their layers.
- Pasting a malformed Pairdraw clipboard payload no longer creates layers that break saving as `.fig` or copying them again, and strokes copied from older versions paste as solid strokes.
- Saving by download in a browser without file access keeps the draft and recovery copy, so cancelling the download no longer loses the work.
- Changing a setting keeps preferences that a newer version of Pairdraw saved.
- S3 saves detect a document that changed elsewhere and report a conflict instead of overwriting it.
- A message written while a chat reply runs stays with its document across tab switches and is sent once that reply ends, instead of getting stuck or going to another document's chat.
- A reply still running shows live again, with its Stop button, when you come back to its document from Home or another tab.
- The design check resumes when an AI reply fails before it reaches the model.
- A streamed render preview loads its fonts again after a failed load instead of drawing without them until the call ends.
- AI setup no longer prefixes omp's Bun install command with sudo when npm's global folder needs administrator rights.
- Coding-agent connection errors appear in the interface language instead of English only.

## 0.16.2 — 2026-11-16

Pairdraw 0.16.2 fixes the chat composer in a narrow chat. Pairdraw 0.16.1 offers this release in the app.

### Fixed

- In a narrow chat, a coding agent's model, reasoning, and mode pickers move to their own row below the composer's buttons instead of running under the settings and send buttons.

## 0.16.1 — 2026-11-16

Pairdraw 0.16.1 adds omp as a coding agent, updates itself from GitHub Releases, and shows an AI agent's edits as they land on the canvas. Install this release by hand once: 0.16.0 has no update feed.

### Breaking changes

- The `designCheck.showOnCanvas` setting is removed from `pairdraw settings` and the automation settings API, which now reject it; saved preferences that still hold it load without it.
- `@pairdraw/vue/canvas/issues` and its `useCanvasIssueMarkers` are removed, along with `hitTestIssueMarker` from `useCanvas`, the `getOverlayObstacles` canvas option, and Core's issue marker layout, `setDesignIssueMarkers`, `setHoveredIssueMarker`, and `clearDesignIssues`; the editor state's `designIssues` overlay is now `designIssueHighlight`, set with `setDesignIssueHighlight`.

### Added

- omp can be the design agent: the desktop app and the browser companion start it through `omp acp`, guided setup shows its own mark and no sign-in step, since omp runs on the providers and model set up in it, and the chat says what to set up in omp when it finds none. **Settings → MCP** can add Pairdraw's server to omp's `mcp.json`.
- The desktop app checks GitHub Releases for a new version at startup and from **Pairdraw → Check for Updates…**, and installs signed updates.
- The canvas shows an AI agent drawing: layers it adds trace in one after another, layers it changes flash, the frames it works in shimmer until it stops, and a notice then counts what it added and changed, with **Show** to select them; **Animate AI edits** in Settings turns it off, and it follows the app's Animations, reduced motion, and Ultralight settings.

### Changed

- The top bar shows your own avatar only while it lists your AI agents, since Pairdraw has no live rooms to show it to.
- In the desktop app, signing in to OpenRouter returns through a port on this computer, which OpenRouter accepts, instead of a hosted web page.
- On macOS the desktop app has no title bar: the close, minimize, and zoom buttons sit in the top bar, whose empty parts move the window.
- An agent's cursor glides at an even pace between its streamed moves instead of stopping and starting at each one.
- The design check no longer marks issues anywhere outside the Lint and Code tabs: the canvas markers and off-screen edge pins, their hover card, the Layers panel marks, the page list badges, View → Design issues, and its preference are gone. Pages are checked only while the Lint or Code tab is open, so editing, and long AI agent runs above all, no longer pause for a check after every change; the Lint tab still lists every issue with its fixes and highlights a hovered issue's layer on the canvas.
- Standalone HTML exports wrap the design in a `pairdraw-stage` element instead of `op-stage`.
- The VS Code extension's export is named **Export as PNG**, since it writes the whole page when nothing is selected.

### Fixed

- The chat says in your language why more images than a message holds cannot be attached.
- Reopening a document the app recovered no longer crashes the window, and the chat still finds the files it was given.
- Screen readers announce an assistant reply as it streams in, instead of only reading it when you move to it.
- Labels for calendar months, the canvas and split menus, the mobile toolbar, document preparation, and fill and stroke history follow the app's language, and the mobile toolbar's previous and next buttons are named for screen readers.
- The image drop overlay's label stays readable in the light theme instead of blending into its background.
- Canvas menus have names screen readers can read, and the initials on a person's avatar use a text colour that stays readable on their colour.
- The follow frame darkens a person's colour enough for its text to stay readable once the colour is rounded.
- Dropping a document and some files on the chat opens the document and attaches the files, instead of also reporting the files as documents it cannot open.
- Home lists the libraries from storage when storage is the chosen catalog, before the library manager is opened.
- A picker opened from the app menu, such as Insert Icon…, stays open instead of closing with the menu.
- Muted and success text on tinted backgrounds meets WCAG AA, so helper text, chips, and a tool call's done icon are easier to read.
- `pairdraw <command> --help` shows the command on its usage line, such as `pairdraw export [OPTIONS] [FILE]`, instead of the path of the script that runs the CLI.
- A design started from Home or a New file tab starts on the dark page in the dark theme, as other new documents do, instead of the light one.
- Home's places menu is wide enough for each place's name, such as Design systems and Storage workspace, instead of cutting them short.
- The phone File menu names its items in the app's language, and its export item says it exports the selection as PNG.
- On a phone, Share no longer puts a document into a live room in Pairdraw, where shared rooms are switched off; a Cloud document still shares through its server.
- On a phone, Home's Design button spans the row under Open… instead of filling half of it.
- Settings' Plugins and Skills panels are announced as the tab panels of their tabs, as every other settings panel is.
- An export from the Export section that fails, such as one of an empty page, says why in a notice in the app's language instead of doing nothing.
- The Code panel's HTML export and Export frames to PDF say why an export failed in the app's language when the reason is one Pairdraw knows, such as nothing to export.
- The Text menu's Bold, Italic, and Underline are unavailable until a text is selected, as Add Link is.
- Escape in the prompt at the bottom of the canvas returns to the canvas, so its shortcuts work again.
- Home's Design systems lists the built-in Pairdraw Basics, as Goodies does, to start a new design with it turned on.
- View → Multiplayer cursors (⌥⌘\) now hides and shows the cursors of AI agents and other people on the canvas; before, it changed nothing.
- `@pairdraw/dom-css/browser` declares its browser helpers, such as `browserJSXToSceneGraph`, so TypeScript sees them.
- Reloading a document with nothing unsaved, such as one undone back to where it started, no longer offers to recover it.
- A coding agent's model, reasoning, and mode controls in a narrow chat show their icons side by side instead of overlapping.
- Opening or closing a side panel no longer shows the canvas stretched for a frame before it redraws.
- A failed Save As keeps saving to the file it saved to before, a failed open gives the reused Untitled tab its name back, and undoing a nudge also returns layers selected partway through it.
- The highlight that marks layers an AI agent edited animates and fades as intended, instead of staying on the canvas until something else redrew it.
- Opening a room link in a build without live rooms no longer edits a blank design under that link; the app goes back to Home and says the link needs a build with rooms.
- A browser tab no longer shows install commands for a computer it cannot see: the chat column and the agent cards leave those to the companion that runs the agents.
- The Design panel reports a snapshot this build cannot refresh as information, not an error.

### Performance

- An AI agent's cursor moves smoothly while it writes a design, and the live preview of what it writes updates about three times faster on long designs.
- An AI agent editing a large page stalls the editor far less after each change: the change review copies and compares only the layers the call touched, its preview images render one at a time between the agent's calls, the chat saves at most every five seconds while the agent works, and the design check runs once the reply ends.
- The editor loads about 2.6 MB less JavaScript at startup, since the peer-to-peer room client, Settings, guided AI setup, the variables window, the code panel, the Markdown renderer, the AI providers' SDKs, and the web font catalog client now load when first used.

## 0.16.0 — 2026-10-14

Pairdraw 0.16 adds comments, shared rooms with voice calls and agents you can follow, slots, component properties, and components that behave like real controls in Preview, plus shader fills, a Lint tab, variable modes on layers, a pencil tool, and Vue and React code in the Code tab. `.fig` files open and save much closer to Figma, saving only what an edit changed, and selection, pasting, auto layout, text, and trackpad navigation follow Figma. The desktop app needs macOS 13 or later, and `pairdraw-mcp` must be updated together with the app.

### Breaking changes

- The desktop app requires macOS 13 or later; the web app supports Chrome 111, Edge 111, Firefox 128, and Safari 16.4 or later.
- Shared rooms record the layer tree in a new format, so people on this version and on earlier versions can no longer join each other's rooms. A room this browser saved with an earlier version converts when you open it again.
- Update `pairdraw-mcp` together with the app: the app renders `render` JSX itself and no longer accepts the pre-rendered tree earlier versions send. AI and MCP tools reject arguments they do not declare: `defineTool` from `@pairdraw/core/tools` takes a `v.strictObject` input. `close_file` fails on unsaved changes unless `unsaved` is `"save"` or `"discard"`, and `diff_create` and `diff_show` patches list JSX attributes such as `-rounded={8}`, with `diff_show` taking `attributes` instead of a JSON `props` object, so patches in the old format no longer apply. `pairdraw documents` is now a command group: list open documents with `pairdraw documents list`.
- `design_to_tokens` writes CSS custom properties named from each variable's code syntax or Tailwind namespace: its `tailwind` format is a Tailwind v4 `@theme`, the `json` format is removed, aliases stay `var()` references, and non-default modes go under their condition (`[data-theme="dark"]` by default).
- A paint's `gradientTransform` follows Figma's convention everywhere, so gradients made in Pairdraw before this release draw differently. Build gradients with `linearGradientTransform` and `ellipticalGradientTransform` from the new `@pairdraw/scene-graph/gradient`, where `isGradientFill` and `GradientFillType` moved from `@pairdraw/core/geometry`; `linearGradientEndpoints` is removed.
- `.fig` files store colour-variable bindings in Figma's `colorVar`. A paint bound through the old `colorVariableBinding` field, which only Pairdraw wrote, reopens unbound. `VariableBinding`, `colorVariableBinding`, `encodeNodeChangeWithVariables`, `encodePaintWithVariableBinding`, and `encodeVarint` are removed from `@pairdraw/core` and `@pairdraw/core/kiwi`.
- `computeImageHash` from `@pairdraw/core` and `@pairdraw/scene-graph` returns the hex SHA-1 of the bytes, the name Figma gives an image, instead of a Pairdraw-only hash of the same length. New images are stored under that name, so `.fig` files and the Figma clipboard carry it as it is; images in documents saved before keep their names.
- In scripts, a text node's `fontSize`, `fontName`, `fontWeight`, `fills`, `letterSpacing`, `lineHeight`, `textDecoration`, `textCase`, `textStyleId`, and `fillStyleId` read `figma.mixed` while its characters differ, as in Figma, and setting one restyles every character. `fills` is typed `readonly Fill[] | symbol`, so scripts that index it narrow it first.
- Design JSX moved from `@pairdraw/core` to the new `@pairdraw/design-jsx` package. Import elements, helpers, variables, `JSX_REFERENCE`, `buildComponent`, `sceneNodeToJSX`, and `selectionToJSX` from there; `@pairdraw/core` and `@pairdraw/core/design-jsx` keep only `renderJSX` and `renderTree`, `renderTreeNode` is removed in favor of `renderTree`, and the `@pairdraw/core/io/formats/jsx` subpath is gone.
- JSX export writes only Pairdraw JSX: `JSXFormat` and `JSXExportOptions` are removed, and Tailwind JSX comes from `sceneNodesToTailwindJSX(graph, nodeIds)` in `@pairdraw/dom-css` or `@pairdraw/dom-css/export`. `@pairdraw/dom-css` no longer requires `@pairdraw/core`, and `exportHTMLBundle` takes a font resolver in `fonts` instead of `'assets'`; build one on `exportWebFontFaceAssets` from `@pairdraw/core/text/web-font/assets` to keep font files in standalone exports.
- Shared primitives moved to `@pairdraw/scene-graph`: color conversion and management to `/color`, text and layout direction to `/text-direction`, `randomHex`, `randomInt`, and `randomIndex` to `/random`, `fractionalPosition` to `/order-keys`, and `@pairdraw/scene-graph/layout-guides` is now `/layout`. `@pairdraw/core/bytes` is removed in favor of `js-base64`; the `@pairdraw/core` root exports are unchanged.
- `SceneNode` has new required keys `textParagraphs`, `listSpacing`, `paragraphSpacing`, `paragraphIndent`, `hangingList`, `targetAspectRatio`, `isExposedInstance`, `strokeWeight`, `strokeAlign`, and `booleanOperation` (which may be `undefined`), so code that builds `SceneNode` objects itself must include them. `Stroke` extends `Fill`, so every stroke states a paint `type`, usually `'SOLID'`.
- `SceneNode.primaryAxisSizing` and `counterAxisSizing` are `AxisSizingMode` (`'FIXED' | 'HUG'`): fill is stored on the child, as `layoutGrow` and `layoutAlignSelf: 'STRETCH'`, as Figma stores it. Read and change per-axis sizing with `layoutSizing`, `layoutSizingOptions`, and `layoutSizingUpdates` from `@pairdraw/scene-graph`.
- `.fig` reading moved to one reader. `importNodeChanges` and `importClipboardNodes` are replaced by `parseFigFile` and `parseFigmaClipboard`, `populateLazyFigImportRoots` and `populateAllLazyFigImportRoots` by `populateFigPage` and `populateAllFigPages` from `@pairdraw/core/io/formats/fig`, and `populateAndApplyOverrides` by `interpretInstance` with `materializeInstance`; `assertFigPackageReady()` is gone and `FIG_PACKAGE_STATUS` reads `document-reader`. `.fig` export takes text shaping from a runtime: `buildDerivedTextDataV4` is removed, `sceneNodeToKiwi` needs the `runtime` that `withFigExportRuntime(graph, canvasKit, write)` passes to its callback, and `FigNodeChangeExportRuntime` takes `shapeText(node)` instead of `getGlyphOutlineMetrics`.
- Pairdraw's plugin-data keys are defined once in `PAIRDRAW_PLUGIN_DATA` from `@pairdraw/scene-graph` and read or replaced with `readPluginData` and `withPluginData`. `@pairdraw/fig/node-change` drops `PAIRDRAW_PLUGIN_ID` (now in `@pairdraw/scene-graph`), the `*_PLUGIN_KEY` constants, `upsertPluginData`, `removePluginData`, and `getPairdrawPluginValue` in favor of `readNodeChangePluginData`; `SourceLibraryPublication` moved to `@pairdraw/scene-graph` and `SOURCE_LIBRARY_PUBLICATION_PLUGIN_KEY` is gone.
- Every process mints layer, variable, and collection IDs in a random session, so `generateId()` no longer starts at `0:1` in the CLI, MCP, or scripts. Code that needs fixed IDs calls `setIdSession`, which now returns the previous session, or passes the `SceneGraph` its own generator (#770).
- Editor state gains required `canvasVersion`, which the canvas redraws on (call `requestRender()` instead of bumping `sceneVersion`), `shapeHandleHover`, and `selectionTheme`, which replaces `RulerTheme.label`. `remoteCursors` is now `presenceCursors` (`PresenceCursor[]`, each with a `kind` of `'person'` or `'agent'`), and the `Tool` type, `EDITOR_TOOLS`, and `TOOL_SHORTCUTS` include `'COMMENT'` on <kbd>C</kbd>.
- Canvas and constants APIs changed: `SceneGraph.hitTestFrame` is now `hitTestDropTarget`, `adoptNodesIntoSection` is now `adoptCoveredLayers`, and `SkiaRenderer.hitTestFrameTitle` no longer takes selected IDs. `SkiaRenderer.buildParagraph` returns a `TextLayout` that draws with `draw(canvas, x, y)`. `AUTO_LAYOUT_BREAK_THRESHOLD`, `CORNER_ROTATE_ZONE`, `getDefaultCanvasBgColor`, and `CANVAS_BG_COLOR_DARK` are removed: the selection's resize and rotation zones are `TRANSFORM_ZONE` and `transformZoneAt` in `@pairdraw/core/geometry`, which also owns the `HandlePosition` and `CornerPosition` types, `SECTION_DEFAULT_FILL` is replaced by `SECTION_DEFAULT_FILLS`, and new pages use `PAGE_DEFAULT_BACKGROUNDS`, both keyed by interface theme. Icons come from an `IconProvider`: `fetchIcon`, `fetchIcons`, `searchIcons`, `searchIconsBatch`, and `clearIconCache` are replaced by the default `iconify` provider, `createIconifyProvider()`, and `placeIcon`, and `VectorizedPath` from `@pairdraw/core/vector` replaces `clipNetworks` with `clips`.
- `@pairdraw/vue` composables act on the whole selection: `useStrokeControls` and `useEffectsControls` no longer take a node, `useTypography` edits every selected text layer and its `weights` (also the `TypographyControlsRoot` slot prop) is a computed list of the families' weights, read with `.value`, and `usePosition` reports `x`, `y`, and `rotation` as Figma's panel does. `useCanvasInput` returns `autoLayoutValueEdit` with `updateAutoLayoutValueEdit`, `commitAutoLayoutValueEdit`, and `cancelAutoLayoutValueEdit` in place of the padding-only `autoLayoutPaddingEdit` and its functions; the edit names its `field` (a padding or `itemSpacing`), and `autoLayoutValueAnchor` places its editor. `useVariables().collections` returns copies and `addVariable` returns the new ID; `useVariablesEditor`, `useVariablesTable`, `useVariablesDialogState`, and the `@tanstack/vue-table` dependency are removed. `useFlatReorderDrag` takes `operations` and `onCombine`, and the `updates` messages replace the system update dialog strings with the Software Update window's.

### Added

- Comment on designs, as in Figma: the **Comment** tool (<kbd>C</kbd>) pins threads to layers, with replies, resolving, rich text, and a searchable, filterable list in the sidebar. Comments are saved in the `.fig` file, so they travel through storage and shared rooms, and scripts, the AI chat, and MCP clients read, add, reply to, and resolve them.
- Be in several shared rooms at once, each in its own tab and syncing in the background, and talk with the people in a room in a peer-to-peer voice call from the headphones beside the avatars. Join from Home with **Join room…** or a pasted link, open a browser room in the desktop app with **Open in desktop app**, and join right away under a generated name such as *Teal Fox*. Everyone in a room sees and edits the document's variables and the overrides of its instances.
- Follow collaborators and AI agents: avatars count each person's agents and show what they are doing, clicking follows them, and your own agents are followed while they work. Agents from the AI chat, ACP and Pi harness chats, and MCP clients show labeled cursors at the layers they touch and leave the canvas when their reply ends, and the Pages panel and command palette show who is on each page. The command palette also lists recent pages and **Go to page…**.
- Create and fill slots, as in Figma, from the canvas, the properties panel, scripts, and AI and MCP tools: slots have names, limits, and preferred components, instances show each slot as Default or Modified, and **Reset slot** brings back the component's content.
- Create and edit component properties and variants from the properties panel, as in Figma (#847): link text, visibility, and swapped components to text, boolean, and instance swap properties, expose nested instances, reorder properties, and turn a component into a set with **Add variant**.
- Make components behave like real controls: the Behaviour section turns a component or set into a Button, Switch, Checkbox, Slider, Tabs, Text field, or another of 15 Reka UI-style controls, and **View → Preview** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd>) lets you use them live without changing the document, drawn as the canvas draws them, in its variable modes. Scripts, AI and MCP tools, and design JSX build them too.
- Fill layers with shaders from the open-source [`shaders`](https://shaders.com) library: the fill picker's Shader tab stacks effects with generated controls and takes presets copied from shaders.com. The canvas shows the first frame and preview plays it where WebGPU is available; `.fig` files and the Figma clipboard keep the frame as an image and the shader's preset, so Figma still opens them.
- Apply a variable mode to layers and pages from Appearance, or the Page section with nothing selected, as in Figma: choose Auto or a mode for each collection the layers use. Layers set to a mode show it after their name in Layers.
- Draw freehand with the pencil tool (<kbd>⇧</kbd><kbd>P</kbd>): strokes become smoothed, editable vector paths, with <kbd>Shift</kbd> for straight lines, as Figma's pencil does.
- Bulleted and numbered lists in text, as in Figma, with nesting, list and paragraph spacing, indents, and hanging markers, set from the Typography section or with <kbd>⇧</kbd><kbd>⌘</kbd><kbd>8</kbd> and <kbd>⇧</kbd><kbd>⌘</kbd><kbd>7</kbd>. Lists round-trip through `.fig` files, the Figma clipboard, HTML, design JSX, and scripts.
- Style selected characters while editing text, as in Figma: the Fill and Typography fields show and change the selection, and any range of characters keeps its own case, link, text and fill styles, and variable bindings. The canvas draws each range in its own case, `.fig` files and the Figma clipboard keep them, apart from font weight bindings, and HTML, Tailwind, Vue, and React exports keep character styles, links as `<a href>`, cases as `text-transform`, and lists; HTML import reads them back. Scripts style ranges with `getStyledTextSegments` and the `getRange`/`setRange` methods, including `getRangeTextCase`, `getRangeHyperlink`, `getRangeTextStyleId`, `getRangeFillStyleId`, and `getRangeBoundVariable` with their setters, and the text's `hyperlink`. Design JSX writes `<Span>` and `<Paragraph>` with decoration style, colour, thickness, offset, skip ink, `textCase`, and `href`.
- Edit shapes on the canvas, as in Figma: gradient end points and stops while a gradient's picker is open, corner radius handles on rectangles, polygons, and stars, a polygon's or star's point count and inner ratio, also in the properties panel, and auto layout padding and gaps, which open for editing on a double-click.
- Switch a frame, group, or section to another of them from the layer type menu in the properties panel header, as in Figma. A frame becomes a group that keeps its layers, effects, and opacity and fits them; a group becomes a frame of its bounds that clips. A frame or group on the page or in a section becomes a section that keeps its fill, strokes, corners, and layers where they are, and a section becomes a frame.
- Lock a layer's aspect ratio beside its width and height, as in Figma; the lock survives `.fig` files and the clipboard and is available in the plugin API.
- Show the pixel grid when zoomed in, toggled with **View → Pixel Grid** or <kbd>⇧</kbd><kbd>'</kbd>, and snap moves, resizes, and drawing to whole pixels with **Snap to Pixel Grid** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd>).
- Figma's navigation keys move through layers and the document: Enter selects children, or opens a selected vector's path for editing, Shift+Enter or \ selects the parent, Tab and Shift+Tab select siblings, N and Shift+N zoom to the next or previous frame, Page Down and Page Up switch pages, and Shift+0 zooms to 100%.
- Rearrange auto layout as in Figma: drag several layers along a row or column as one block, move a layer one slot with the arrow keys, take it out with **Ignore auto layout**, and see the layout's children outlined on hover.
- Edit several layers at once: a multi-selection gets Layout, Typography, corner radius, and stroke sections, plus **Selection colors**, which recolours a colour everywhere it is used. The layout guides of several frames list and edit together while they match, and Add gives each frame one new guide.
- Check designs in the new Lint tab: issues are grouped by rule, marked on the canvas and in the Layers panel, and many have one-click fixes such as binding colours to matching variables. `pairdraw lint --fix` and the `lint` and `lint_fix` tools apply the same fixes outside the app.
- Edit variables in a redesigned variables dialog: collections and groups in a sidebar, search across names and values, inline editing, drag to reorder, multi-select, CSS names and expressions, per-mode conditions written in plain words, and a live stylesheet preview. Collections copied from a library are marked, with a warning on variables Figma won't show.
- Import and export variables, text styles, and effect styles as W3C design tokens, in the shape Figma imports, from the variables dialog, by dropping `.tokens`, `.tokens.json`, or `.resolver.json` files on the editor, with `pairdraw tokens --format dtcg`, and with the `import_design_tokens` tool. Copy variables as CSS or a Tailwind v4 theme, or print them with `pairdraw tokens`.
- Insert icons from Iconify's open-source sets with an icon picker in the toolbar, Object menu, and command palette. Placed icons keep their name, so the Icon section can swap or recolour them, and exports write them as icons.
- See the selection as a Vue or React component in the Code tab, styled with CSS or Tailwind, and see which layer the cursor's element draws, with design issues underlined in the code.
- Export components to Storybook with `pairdraw export -f storybook`: one story file per component for React, Vue, or HTML, with variant controls, and with `--framework vue` or `--framework react`, working Reka UI or Radix UI components (#727). Export HTML and Tailwind JSX from the app and the CLI (`-f tailwind-jsx`), with vector shapes as inline SVG, and choose PPTX in the Export panel.
- Open a `.fig`, `.pen`, or other supported document by dragging it onto the window, paste SVG markup copied as text, such as Figma's Copy as SVG, and open HTML files in CLI commands such as `pairdraw tree` and `pairdraw convert`.
- Save the open document to cloud storage with **File → Save to storage…**; the tab stays bound to the stored copy, so Save and auto-save write to the bucket. A new Cloud Storage guide covers setup, and Settings → Cloud storage offers the Pairdraw Cloud waitlist.
- Set up AI in a few steps with guided setup: on first launch, pick a coding agent on this computer, an API account, or a local server. The desktop app installs or updates agents, adapters, the MCP server, and the Harness companion with one click, through Bun when Bun installed them, tests each connection, and proposes models; where npm's global folder needs administrator rights, setup says so and offers the `sudo` command, Bun, or a prompt for your agent. The MCP server and Harness companion print their version with `--version`; sign in to OpenRouter instead of pasting a key.
- Choose how much an AI model thinks for each message, from Off to Extra high, attach images by dropping them on the chat, and watch designs appear on the canvas while direct providers stream JSX.
- Review and undo AI edits from the chat: each tool call shows a summary, its input and output, and a before-and-after image with a JSX diff. Revert a reply's edits, restore them, regenerate the last reply, retry a failed message, or edit and resend it; undoing an edit tells the AI on the next message. The conversation menu saves a chat's trace as a JSON file, with every message, reasoning step, tool call, and request.
- Control the running app from the CLI and MCP: `pairdraw documents`, `undo`, `redo`, and `settings`, the matching MCP tools, `pairdraw tool list`, `describe`, and `call` to run any MCP tool from the shell, and `pairdraw diff` with the `diff_visual` and `diff_apply` tools to compare and replay changes. Share only the selected layers with MCP clients from **Settings → MCP → Local server** or `PAIRDRAW_MCP_SCOPE=selection`.
- Diagnose failures from **Settings → Diagnostics**: errors, failed AI chats, and broken tool calls are recorded with scrubbed messages and stacks, filterable, copyable with the app version, and saved as a JSON file.
- Choose an accent color in **Settings → General → Appearance**, and customize the toolbar in **Settings → Toolbar** or from its right-click menu: hide, reorder, and regroup tools on desktop and mobile.
- Official builds send one anonymous ping a day, with the app version, operating system, architecture, desktop or web, and whether usage stats are shared, and no ID; turn it off in Settings → Privacy or with `PAIRDRAW_TELEMETRY=0` or `DO_NOT_TRACK=1` in the desktop app's environment. Usage stats (launches, file formats opened and exported, and which AI provider answered) are sent only after you agree in a one-time prompt after the welcome screen. The privacy page lists every field.
- Use more of the Figma plugin API: `instance.swapComponent()`, `detachInstance()`, `figma.getNodeByIdAsync()`, `getMainComponentAsync()`, and an instance's `overrides` with `resetOverrides()`. Pairdraw's own `pairdraw` script global adds comments and controls.
- Write design JSX with more of the document: `visible`, `locked`, `constraints`, `italic`, full stroke props, and component properties set by name on `<Instance>` (#750). JSX export writes them back with every fill, effect, mask, and variable binding, and TSX can use `@pairdraw/design-jsx` as its JSX import source.
- New SDK entry points: pass an ID generator to `new SceneGraph()`, place pasted content with `resolvePasteTarget` from `@pairdraw/core/editor`, compute Flatten and Outline stroke with `flattenNodesToVectorProps` and `outlineStrokeNodesToVectorProps` from `@pairdraw/core/canvas`, import `designDocumentToSceneGraph` from `@pairdraw/dom-css/scene-graph` in browser builds, and tell `FontManager.setBundledFontLocator()` where a bundler put the fonts from the new `@pairdraw/core/assets` export.
- New npm packages: `@pairdraw/design-jsx` for writing and exporting design JSX, and `@pairdraw/emit`, which it and the exporters use to print source code.
- The docs site opens on live editor demos of design, AI, code export, the CLI, the SDK, and collaboration, in every docs language, with a short roadmap, and a download page offers the installer for the visitor's system and lists every installer.

### Changed

- Selecting, dragging, drawing, duplicating, and pasting follow Figma: clicks select a top-level frame's direct children and double-clicks go deeper, a click up to 3.5 screen pixels outside a shape selects it, a click on a section's empty area selects the section, dragged layers land in the frame under the cursor, groups and locked frames never take a drop, and Space, Shift, and Control change how a drag reparents. A layer leaves auto layout once its edge is about 5 px past the frame instead of after the cursor travels 96 px, and a duplicate is stacked directly above its original.
- A selected layer resizes and rotates where Figma's does: every edge resizes along its whole length within 7.5 px outside it and up to a tenth of the side inside it, corners within 7.5 px, and the area outside a corner within 16 px rotates; a frame's name takes a press before rotation but not before resizing. A selection draws Figma's four corner handles, without the edge midpoints, and layers under 10 px on both sides show no handles or size label.
- Pasted layers keep how they were turned and flipped on the canvas, as in Figma, and land where Figma puts them: layers copied out of a frame or section keep their offset from its box, move into the frame only when they start past its far edge or miss it, and paste back where they were when nothing is selected, or in the middle of the view when that place is out of view.
- Trackpads and mouse wheels pan and zoom the canvas as in Figma: a two-finger pan moves the canvas twice as far, up to 120 px per scroll event, a pinch zooms as far in the desktop app and Safari as in other browsers, also over Preview's controls and comment pins, and on Windows each mouse wheel notch pans 16 px, speeding up to 120 px when notches come less than 50 ms apart.
- Layers move and turn as in Figma, on the canvas and in scripts: the properties panel shows X and Y of a turned layer's box and a counterclockwise rotation, children of groups report positions in their container, and groups and booleans refit to their contents.
- New layers, pages, and sections look as in Figma: white frames that clip, #D9D9D9 shapes, black 1 px lines, theme-aware page backgrounds and sections, numbered names such as "Rectangle 2", and Figma's results for Group, Frame selection, Create component, booleans, and Combine as variants.
- Tool shortcuts and cursors follow Figma: Section moves to Shift+S and Frame also answers to A, and the pen, comment, and hand tools show their own cursors, with the hand closing while panning.
- The font weight list offers only the weights the text's family has, as in Figma. Switching family keeps the weight and italic where the new family has them, otherwise the nearest weight with the same slant.
- The Layout guide section follows Figma: each guide is a row with a summary such as "5 columns" or "Grid 10px" that switches between grid, columns, and rows, and its settings open from the row's icon with Count, Type, Width or Height, Margin or Offset, Gutter, and Color fields. The section now sits after Selection colors.
- A layer keeps its stroke weight and alignment without strokes, as in Figma, and strokes take the same paints fills have, including gradients and images (#797).
- Layers inside components and instances are outlined in purple, and bound variables show as a neutral chip instead of purple text.
- Import SVG as editable layers, as pasting into Figma does: groups, one vector per shape, text layers, and clip path groups instead of one merged vector (#734).
- The plugin API follows Figma inside instances: it refuses to move, rotate, constrain, or mask a layer an instance takes from its component, or to change a vector's path there, with Figma's errors, while slot content stays editable, and setting a layer to the value it already has makes no override. `setProperties` switches an instance's variant, alongside its other properties, and fails without changing anything when no variant has the values; `resize` places a frame's layers by their constraints while `resizeWithoutConstraints` leaves them; a new frame or component hugs along its main axis once auto layout is on, and `resize` fixes a hugging auto layout frame's size.
- Popovers, menus, selects, and pickers share one look and motion, selects open over their field, every section adds and removes items with + and −, and variables, styles, and swap components come from one searchable list. Menus taller than the window scroll.
- **Settings…** (<kbd>⌘</kbd><kbd>,</kbd>) is in the **Pairdraw** menu on macOS and at the end of the **File** menu elsewhere, instead of under **View → Preferences**.
- The demo at `/demo` is a tour of one player card in eight chapters stacked on one canvas, each showing one thing with a numbered card that says what to try and draws the piece of the app to click: preview, the artwork slot, the controls' behaviours, the theme's modes, shader fills, the Code tab, Lint on a card with planted issues, and sharing and opening your own files. It opens instantly, built ahead of time, on the first chapter, and follows the app's light or dark theme. The welcome dialog on first launch offers it next to AI setup, and **File → Open the Tour** opens it any time.
- The desktop app shows updates in a Software Update window with formatted release notes and cancellable download progress (#743). On macOS and Linux you choose when to restart, and restarting asks about unsaved documents first.
- Design lint reports far fewer false positives, checks touch targets against WCAG 2.2 AA in the Recommended preset, asks 3:1 contrast of large text as WCAG AA does, and reports unbound colours and off-scale spacing as suggestions.
- HTML and Tailwind export write variable-bound values as their tokens, such as `var(--color-primary)` or `bg-primary`, and Tailwind JSX uses the same class mapping as Tailwind HTML.
- The AI chat starts with comment, variable, lint, page, and image export tools on, keeps working on the page where it started, and recommends the latest models, with Claude Sonnet 5.5 and GPT-6.1 Sol as the new defaults. Saved profiles keep their model.
- Settings → MCP shows the local server in the desktop app and WebMCP in the browser, where each works, and Tool access lists the local server's tools while it is stopped.
- Invalid tool arguments from the AI chat, CLI, or WebMCP name the tool and list every problem with its location.
- Run Pi with the providers and default model you signed in to in the Pi CLI, and see what to fix when its Harness companion or MCP server is missing or out of date. Codex install instructions point at `@agentclientprotocol/codex-acp`, which replaces `@zed-industries/codex-acp`.
- `get_selection` returns the selected layers with their direct children by default and takes a `depth`, and `pairdraw eval` prints the value of a script's last expression.
- Opening a share link opens the room in its own tab, so an open document is never changed, and leaving a room keeps its file as a local copy.
- Text in both themes meets the WCAG AA contrast ratio of 4.5:1.
- The Linux AppImage no longer bundles `xdg-open` and relies on the system's `xdg-utils`.

### Fixed

- Instances follow their component as in Figma: style overrides from `.fig` files survive component edits, every field an instance does not override follows the component, restructured component layers move their instance copies with overrides, and properties set on nested instances show and stay set when pages load on their own (#849). Resizing an instance no longer turns its layers' sizes into overrides, copies that size themselves to their content keep their size through component edits and reopen at their saved size, and a path edited in a component reaches its instances, scaled with each copy.
- Save `.fig` files that open correctly in Figma: overrides beyond text and fill colour, exposed nested instances, slot content, blend modes, bound variable values, variable metadata, fill-sizing, ordering keys, and stable layer IDs (#890). An opened `.fig` stays unchanged until edited, saves before its first edit, and saves variable-only edits.
- Saving an opened `.fig` file writes only what an edit changed in a layer or variable and keeps the rest as Figma saved it, including data Pairdraw does not model, an instance's library link and saved overrides, and text's letter spacing in percent and font names. A variable's new value reaches every layer that uses it, through an alias too, variables that alias library variables still point at the library, and a collection's modes keep their order in Figma.
- Shared and library styles survive `.fig` files: the properties panel shows the styles layers use in opened files, styles made in Pairdraw save as styles and reopen, layers that use a library style keep it in Figma, and a style an instance has cleared stays cleared.
- Figma shows images in `.fig` files Pairdraw writes, stored under the SHA-1 of their bytes, the only name Figma reads. Instances pasted into Figma keep their names and no longer carry their component's library identity, and fill and stroke bindings to variables made in Pairdraw survive the paste as remote variables.
- Importing design tokens adds them to the file's own collections, never to a collection copied from a library, where Figma did not show them.
- `.fig` files whose text content is bound to a number or boolean variable open instead of failing with "Unsupported variable expression STRINGIFY", and saving keeps the binding (#1110). Rounded points in imported vectors keep their own corner radius and join, layout guides save, show as columns or rows, and draw an Auto count as Figma does, and a file's thumbnail shows its page's own background.
- Showing or hiding a layer of an instance that a boolean component property drives sets the property, as in Figma, so every layer it drives follows.
- Text saved to `.fig` or copied to Figma keeps its wrapping, alignment, line height, ligatures, and decorations there (#914), and shows there when drawn in a fallback, missing, or variable font, truncated, or with an empty line. Auto line height stays auto when `.fig` files are opened and saved, and a pixel line height shorter than the font opens as set.
- Lines of text that mix font sizes or line heights are spaced as in Figma: each line is as tall as the tallest line height on it, with its largest font centred in it, instead of stacking the tallest parts of every style on it.
- Auto layout behaves as in Figma: Fill children in Hug frames keep their size, frames from `.fig` files reflow when edited, absolute children follow constraints, Hug frames grow while typing, a row that hugs its height around a stretched layer keeps it in Figma, and undo puts back everything an auto layout change moved.
- Draw like Figma: gradients from Figma files and pastes no longer run backwards, blurs and shadows use Figma's falloff, masks apply their opacity and blur, layers masked by a group show, polygons and stars keep their rounded corners, point count, and inner ratio, also when copied to Figma, and the corners of a stroked path take its join, with caps only at its ends.
- Underlines and strikethroughs follow the font's metrics and Figma's styles, outlined or flattened text keeps its glyph positions, text on a path turns each character along the stretch it covers, and fonts load reliably: styles of variable fonts and macOS font collections, CJK and Arabic fallbacks, and a clear notice for unsupported outlines such as PingFang (#746, #752).
- Undo covers more: hiding, locking, renaming, and moving layers to another page, and layers MCP clients, the CLI, and AI chat create, delete, or move, including on other pages and in variables. Hiding or locking several layers is one step, undo and redo work while a colour picker is open, and undoing back to the last save shows the document as saved.
- The pen tool redoes a path with its points, fill, and stroke, Escape keeps the path drawn so far, and the distance for closing a path no longer changes with zoom. Path editing closes when its vector is deleted or another document opens, and editing a vector's points no longer leaks memory.
- Dragging a layer down the layers panel drops it where the line shows, and moving a layer into a frame or group from the panel keeps it where it's drawn on the canvas.
- Opening a page also loads the pages holding the component sets its instances use, so the variant picker can switch to any variant of a set kept on a page not opened yet.
- Import HTML and CSS laid out as a browser lays it out, with correct shadows, borders, and `box-sizing`, in `pairdraw import`, the app, and the Code tab's preview (#788).
- Import SVG files with an XML declaration or a byte-order mark, `fill-opacity`, `stroke-opacity`, open filled subpaths, and stroke caps and joins that survive saving. SVG export, and the drawings built on it, draw a vector's open strokes beside its filled regions.
- Design JSX lays out `justifyContent`, `alignItems`, grid `repeat()` tracks, fill sizes in grids, and `box-shadow` lists as written, applies props it used to ignore, reports bad gradient arguments, warns about ignored paint and effect options (#736), and keeps line breaks when exporting multi-line text.
- HTML export keeps grid layouts, rotation, every shadow and blur, flex grow, right-to-left direction, sections, and the positions of layers outside auto layout, declares `box-sizing: border-box`, and names a JPEG, GIF, or WebP image fill by its own type.
- The plugin API reads and writes `lineHeight`, `letterSpacing`, effects, paints, page backgrounds, `layoutGrids`, and `componentPropertyReferences` in Figma's shapes, updates geometry and text size immediately, and refuses invalid sizing and component cycles as Figma does (#786). `pairdraw eval -o` saves a script's edits laid out, and CLI `eval` and tools measure text in the document they edit; `@pairdraw/core/figma-api` exports `flushPendingLayout` for hosts that save scripts' results.
- AI, MCP, and CLI tools reject arguments they do not take (#977), keep variable bindings through stdio `render` (#830), size groups and booleans to their contents (#738), work on pages other than the one on screen, run XPath queries under Node (#787), judge text contrast by its WCAG ratio (#735), and report failed saves as errors.
- AI chat replies stop cleanly, survive switching pages, accept `eval` results of any shape, use a newly saved API key right away, and keep your message when the chat cannot start. In the desktop app, replies stream and keep going past 30 seconds, a request that cannot reach the provider is retried, and scrolling back to the bottom resumes following. Pi chats start with Pairdraw's MCP tools on Node 22.15 or later, resume cleanly, and stop a reply without losing the session.
- In the desktop app, Select All, Undo, and Redo typed in a text field such as the chat input act on the field instead of the canvas, and other canvas shortcuts no longer reach the canvas from a text field.
- Shared rooms keep one consistent layer tree when people move, reorder, or add layers at the same time (#888, #889).
- Storage keeps working: browser storage saves after Safari suspends a tab, in Private Browsing, and for documents over 127 MiB; crash recovery and autosave run after edits instead of on redraws, which froze Safari; S3 storage works with servers that answer range reads with `200`, such as `rclone serve s3`; and when saved credentials are paused, the home screen offers **Retry access**.
- Memory stays flat during long AI and MCP sessions (#587), image-heavy `.fig` files open without running out of memory (#924), and closing a tab releases its document.
- Show a clear message instead of a blank window when the browser or WebView is too old, and start on macOS 13 with older WebKit (#744).
- Picking an OkHCL colour no longer overwrites a layer's other plugin data, including other plugins' data and its export settings.
- Warnings and errors show in the theme's colors: library update and diagnostics warnings, errors on the home screen and when renaming layers, publishing a library or authoring variants, and chat errors, copy confirmations, and error toasts in the light theme.
- Smaller fixes: layers keep their place when moved into or out of a rotated or flipped parent (#737), the Vue SDK's `CanvasSurface` starts, `.pen` text sizes from its font, whole-step number field drags, ⌘Z after nudges, ⇧-resizing, Paste here in transformed frames, zooming to a fixed level, the font picker's starting position and search order, section and frame titles, tab and menubar overflow, the mobile file menu's labels, tooltips, full hex and opacity values, component set borders at every zoom, the caret in empty text, imported page backgrounds, `.fig` thumbnails in recent files, the canvas context menu closing on a quick second right-click, model pickers in Settings → Models closing while the editor slides in, and screen reader labels.
- Ship the MIT license text in every npm package, with READMEs for `@pairdraw/core`, `@pairdraw/cli`, and `@pairdraw/mcp`.

### Performance

- Open large `.fig` files with a fraction of the memory: the Nuxt UI design kit takes 0.7 GB instead of 2.2 GB, and pages share unchanged component data and JavaScriptCore object layouts.
- Save an edited `.fig` by rewriting only what changed, off the main thread in the browser: the 109 MB Preline UI kit saves in about 3 seconds instead of over two minutes, with about 1.5 GB less memory on large kits.
- Open multi-page `.fig` documents, lay out pages with many text layers and instances, and edit text selections and variables without long freezes or full redraws.
- Joining a shared room is faster: the document a person receives on joining is compressed, about a twelfth of its size before (480 KB instead of 5.7 MB for the demo tour), and edits travel in Yjs's more compact encoding.

### Security

- Limit what the desktop app may write and run: no writes to startup locations, shell profiles, global package folders, or MCP discovery files, and only the exact command lines of supported agents, the MCP server, and the Harness companion.
- Update to Tauri 2.12, which binds large IPC responses to the requesting webview (GHSA-w28w-mhc8-qvjv), and install desktop updates only when the signature names the announced version.
- Evaluate `calc` through `jsep` and an arithmetic allowlist instead of `expr-eval`, which had an unpatched code-execution advisory (GHSA-q9v2-7m5w-4693); `calc` now supports `**` and nothing it does not document.
- Escape layer names and text in JSX and Tailwind JSX export, so document text cannot inject attributes or expressions into `render` and `replace`.
- Validate collaborator cursors and names, clipboard data, component library revisions, and MCP and automation messages before using them, and update `@xmldom/xmldom` to 0.9.12, which fixes quadratic parsing of crafted SVG and XML.

## 0.15.1 — 2026-09-18

### Added

- Configure built-in AI and local MCP tool access independently on a Tool access page, including optional extended AI tools, searchable read-only and side-effect groups, and per-target defaults (#584).
- Set the built-in AI's maximum steps per message in Chat settings, including a custom number, with consistent stopping and remaining-step warnings (#573).
- Open documents and jump to a named layer from `pairdraw://open?file=&node=` links, resolving the file against open tabs or a one-time file picker. Path segments match the way the filesystem does: case-insensitively on macOS and Windows, exactly on Linux.
- Open documents and jump to a named layer in the web app from `?file=&node=` links, fetching the file from an `https:` URL without credentials, ignoring the URL fragment, and refusing a document larger than 64 MiB — a ceiling the automation bridge's `openFile` now shares.

### Changed

- Create new documents with the sRGB colour profile, so Display P3 is reserved for documents that declare it.
- Export diagnostics from Settings only, with a retention count you choose. AI requests and tool activity now carry conversation and request identifiers, while chat no longer offers a separate diagnostic log or includes transcript content.
- Replace the demo's legacy reference page with a component library on the first page, including component sets, linked instances, component properties, and the variable collections, and show the standard canvas loading overlay and tab indicator while it is generated instead of an empty canvas.

### Fixed

- Store colours edited in the colour picker in the document's colour profile, and convert them on the way to the display, so a Display-P3 document no longer looks different on an sRGB display than on a wide-gamut one.
- Keep Display-P3 documents rendering correctly in wide gamut where the browser supports it and in sRGB elsewhere, fixing the black rectangles and incorrect blend colours, with a dismissible notice when wide gamut is unavailable.
- Classify MCP `open_file` and `close_file` operations as read-only hints, and close opened document tabs through the new `close_file` tool with the usual unsaved-change prompt.
- Let the desktop app use an MCP server you started yourself by allowing the app's own origin by default, instead of requiring `PAIRDRAW_MCP_CORS_ORIGIN`.
- Explain why the local MCP server did not start — a missing `@pairdraw/mcp` install, a denied command, an early exit, or an unreachable address — with translated guidance, and find a globally installed server when the desktop app is launched from the system shell.
- Animate the AI chat tool-call disclosure, which expanded and collapsed without motion because its animation classes were misspelled.
- Mark unsaved documents and ask whether to save before closing a tab, the desktop window, or the application, rather than relying on recovery alone.
- Defer AI provider connections and system credential reads until you send a message or use a connected feature, so opening documents and browsing chat history no longer trigger unexpected credential prompts.
- Save and recover documents whose text uses disabled numeric, fraction, or small-caps OpenType features, which previously failed to write a `.fig` file.
- Update instance text properties on the canvas while typing, with grouped undo for rapid edits.
- Point Homebrew installation instructions to the official cask and document separate CLI installation.
- Reach the custom model option in the model picker for providers with large model catalogs instead of requiring a search for it.

### Performance

- Reduce editor pauses while generating recovery snapshots and exporting text-heavy `.fig` documents.
- Recompute layout only for the pages an edit affects, instead of every page, when editing a component or its instances.

## 0.15.0 — 2026-09-16

### Breaking changes

- Use MCP SDK v2 server/client types for programmatic MCP integrations. Define custom tools with native Valibot `input` schemas and execution metadata instead of `params`, `ParamDef`, or `paramToZod()`.
- Replace Scene Graph `overrides` records with `instanceOverrides`, using separate `self` and `descendants` maps. Rename `figmaDerivedLayout`, `figmaDerivedTextGlyphs`, and `FigmaDerivedTextGlyph` to `derivedLayout`, `derivedTextGlyphs`, and `DerivedTextGlyph`.
- Update custom Vue SDK binding providers to implement `getBindingId()` and handle `unresolved`. Replace `setValue()` with `prepareEdit()`, returning a stable edit key, captured value, setter, and restoration callback.
- Replace Vue SDK `useDialogMessages()`, `dialogMessages`, and their catalog keys with the corresponding product-domain message composables and catalogs.
- Use Vue 3.5.41 or newer within Vue 3 for the Vue SDK, and CanvasKit 0.41.1 or newer when supplying its optional CanvasKit peer. Update custom CanvasKit integrations to use `PathBuilder` and immutable `Path` operations.

### Added

- Expose design inspection and undoable layer-property and variable edits to browser agents through experimental WebMCP in supporting browsers, with explicit Off, Inspect, and Edit access controls in Settings.
- Control custom tool exposure independently through `mcp`, `ai`, and `webmcp` exclusions. Tools are included by default, subject to execution support and user permissions.
- Bind Design JSX spacing, sizing, corners, and typography directly to numeric document variables.
- Define component properties and assign instance values in Design JSX using stable property IDs.
- Save AI conversations and attachment previews locally, switch between chats, rename or delete them, and browse saved transcripts across documents. Choose whether reasoning stays collapsed, expands while thinking, or stays expanded, with animated disclosure controls that respect reduced motion.
- Add a searchable command palette for editor and application actions.
- Search current AI provider catalogs from model pickers, with curated recommendations, recent compatible models, and offline fallbacks.
- Render triangle and line arrow stroke caps on lines and open vector paths, and choose them from the stroke cap picker.
- Expose component properties and instance-swap targets through the Figma API and automation.
- Create, select, move, duplicate, transfer, and delete canvas and frame guides directly from rulers, with undoable edits, measurements, context-menu actions, and `.fig` round-trip fidelity.
- Open to a unified home with recent and configured storage documents in grid or list layouts, and open multiple selected design files in separate tabs.
- Snap vector points, moved layers, and resized edges to nearby geometry, guides, frame and canvas bounds, and whole-pixel coordinates, with visible alignment guides and persistent snapping preferences.
- Run Pi through AI SDK HarnessAgent as a configurable desktop provider with saved model profiles, secure credentials, existing MCP design tools, and per-profile thinking and permission settings.
- Combine components into variant sets through Figma API scripts and automation.
- Add local AI usage and technical diagnostics, including token telemetry, provider/model summaries, recent failures, configurable retention, export, and clear controls (#588).
- Import, render, edit, resize, select, and export Figma text-on-path layers while preserving their curved glyph layout.
- Show temporary Figma-style distance measurements between selected and Option/Alt-hovered layers (#491).
- Edit Design JSX and HTML/CSS previews in CodeMirror, with theme-aware highlighting, Tailwind viewing, completion, diagnostics, bounded execution, and session-level undo (#130).
- Set provider-specific reasoning effort on supported AI model profiles (#454).
- Show unavailable or substituted document fonts with affected-layer selection and retry actions, and expose font fidelity through the Figma API, MCP, and `pairdraw fonts [file] --json`. Choose `warn`, `strict`, or `allow` font-substitution policies for file-backed CLI raster and PDF exports with `--font-policy` (#503, #625).
- Add reusable remote MCP connections for ACP agents, with Streamable HTTP endpoints and credential-backed bearer tokens.
- Author and manage multidimensional component variants and published component libraries, including revision previews, linked-instance updates, stable library identities, offline catalogs, storage-backed catalogs, and read-only library definitions (#239).
- Recover unsaved and pathless documents locally, including after closing their tabs, with options to disable recovery and restore or discard retained snapshots (#487, #505, #574).
- Inspect selected designs with a configured Vision model and attach images to AI chat with bounded analysis and previews (#232, #471).
- Pin selected layers as explicit AI chat context, show collapsible reasoning, copy individual responses, and grow the composer with multiline prompts (#13).

### Changed

- Refresh the Pairdraw mark across the editor, documentation, browser tabs, installed web apps, and desktop icons, with small-size and dark-background adaptations.
- Explore editable component, typography, and paint comparisons in the demo, with the original examples preserved on a reference page.
- Use compact desktop Home search actions with consistent responsive layout and control sizing.
- Keep pixel-grid rounding invisible while showing alignment guides only for real geometry, objects, and canvas/layout guides.
- Embed images when copying selections into Figma, and preserve geometry, text sizing, component links, variables, modes, and shared styles when pasting within Pairdraw.
- Choose the app theme and whether animations follow the system or stay off under Appearance in General Settings, with live updates and persistent preferences.
- Simplify property panels with fill and stroke style pickers in section headers, concise effect style rows, and collapsed equal corner fields when all four share a variable. Preserve applied and missing styles and remove the redundant Dimensions heading for text layers.
- Open variable pickers below their trigger when space permits, flipping above near the viewport edge.
- Keep AI chat preferences with the model overview and edit models in a fixed-size Settings pane with explicit Save and Cancel actions.
- Match page-list density to the layer tree and add subtle, reduced-motion-aware dialog transitions.
- Fade in streaming Markdown list items and code lines without animating completed responses.
- Vertically center shaped section titles and allow renaming a section by double-clicking its canvas label.
- Load supported online fonts before revealing imported pages, preserve substituted text during editing, and shape canvas labels with Inter typography and shared Arabic/CJK font fallback.
- Complete translated app, accessibility, font, color, file, clipboard, collaboration, chat, vectorization, storage, recovery, component-library, and connection feedback across supported locales, and synchronize document language with the selected locale.
- Separate local MCP server controls, browser WebMCP access, and remote connections in Settings, with inline searchable tool permissions.
- Show translated field errors, hints, and consistent contextual alerts in Settings forms, focus the first invalid field on submission, and explain missing requirements instead of silently disabling Save or Test.
- Pan horizontally with Shift+wheel while preserving native horizontal trackpad movement.

### Fixed

- Render four-point diamond gradients, preserve text layout across fill types, and keep image colors accurate on sRGB displays.
- Keep newly created and edited objects visible during zoom instead of replaying outdated scene content.
- Keep property fields and paint previews live during editing, rotated selection labels readable and aligned, and object edges stable when previews settle.
- Show compact bordered section labels with inset nested titles and clearer hover feedback.
- Keep Undo and Redo commands available as edit history changes, without requiring another scene edit.
- Avoid recursive desktop HTTP proxy requests when font downloads intercept Tauri IPC traffic.
- Keep FIT image fills proportional, centered, and fully visible without stretching or cropped edges.
- Preserve edited instance text, including cleared labels, when saving and reopening `.fig` files.
- Honor `.pen` frame layout defaults and sizing and padding shorthands so imported auto-layout frames keep their computed dimensions and child positions (#564).
- Avoid macOS Keychain prompts during credential status checks and pause repeated credential access after failures until explicitly retried from Settings.
- Honor explicit Design JSX instance dimensions and preserve authored overrides through component synchronization.
- Route browser Command/Ctrl plus and minus shortcuts to canvas zoom instead of page zoom.
- Resolve `$name` references in imported `.pen` fills, stroke fills, font families, dimensions, and spacing without requiring a `--` prefix (#563).
- Resolve bound fields in each layer’s mode, keep variable edits scoped and undoable, and make broken bindings visible and recoverable.
- Display letter spacing in pixels and support explicit automatic line height.
- Prevent the stock photo tool from replacing text, lines, structural layers, or containers with content while supporting closed shape geometry.
- Preserve imported Figma text alignment metadata, explicit normal blend modes on text and vectors, and implicit fixed text sizing in auto-layout frames across save and reload.
- Render imported Figma strokes with odd-length dash patterns correctly.
- Stop showing a misleading desktop-only warning when web font loading or catalog lookup fails.
- Resolve fallback fonts reliably for cached characters, mixed-language text, and text-case transformations.
- Preserve imported Figma divider-line geometry during auto-layout recomputation, preventing half-pixel shifts on save and reload.
- Resolve package imports under Node and Bun from ordinary tarballs while preserving Bun source-first workspace execution (#663).
- Use the user's home directory as the default MCP file root on Windows, avoiding the caller's unreliable working directory.
- Open legacy raw `.fig` files that store the Kiwi document and thumbnail without a ZIP wrapper (#582).
- Preserve a frame's auto-layout HUG sizing, variable bindings, and variable modes when converting it into a component through the Figma API or automation (#595).
- Run `pairdraw import` on Node so npm-installed CLI users no longer encounter `Bun is not defined` (#575).
- Generate recent-file previews from the conventional `Cover` page without modifying the source file.
- Resolve Vue SDK semantic test selectors correctly in non-browser runtimes (#397).
- Commit vector vertex and Bézier-handle edits when the pointer is released and keep transformed vector-edit overlays aligned (#586).
- Preserve app-created component properties and instance-swap targets across `.fig` save and reload cycles (#548).
- Reconnect desktop automation to an already-running MCP server through its discovery file (#546).
- Keep text-editing carets, hit testing, and selection highlights aligned with vertically centered or bottom-aligned text (#539).
- Match AI chat code-block colors and backgrounds to the active theme, and let desktop users select and copy chat text without replacing it with canvas layers (#537, #538).
- Restore visible above, below, and child drop feedback while dragging layers in the Layers panel.
- Place editor-created instances beside nested source components in world space, including transformed parents.
- Prevent malformed collaboration updates from corrupting synchronized nodes or derived text rendering.
- Transfer native `.fig` exports over binary Tauri IPC, preventing large desktop saves from being truncated or exhausting WebView memory (#484).
- Decode zstd-compressed FIG containers and reject invalid compressed payloads (#397).
- Compose caller CSS with Tailwind defaults when importing DOM/CSS documents (#397).
- Preserve desktop HTTP timeout, abort, and empty-response semantics (#397).
- Report whether missing Figma clipboard images were actually fetched (#397).
- Report exhausted provider credit, request failures, and output-token limits through localized chat toasts and copied diagnostics (#451, #454).
- Prevent Windows desktop crashes when loading large system fonts for non-Latin text.
- Preserve open vector segments when the same vector network also contains filled regions (#450).
- Match Figma Plugin API behavior for `rescale()`, page `backgrounds`, and nullable visual `absoluteRenderBounds` (#442).
- Keep imported and pasted Figma instances linked to their remapped source components so later component edits update existing instances (#385).
- Restore native copy, cut, and paste shortcuts in desktop text inputs while preserving design clipboard handling on the canvas.
- Preserve committed desktop text input when the WebView supplies text through the input event before updating the hidden text field (#607).
- Preserve selected layers when browser clipboard serialization fails during cut operations, and fall back to the session clipboard when system clipboard access is unavailable (#568).
- Treat MCP tool results with an omitted `isError` field as successful while preserving explicit MCP errors (#583).
- Preserve effective nested instance text overrides when importing complex Figma component hierarchies (#102).
- Preserve SVG clip paths, including clip shapes referenced through `<use>`, when importing editable vectors.
- Preserve circles, ellipses, rectangles, lines, polylines, and polygons supplied as JSX children of inline SVG elements (#452).
- Stop local MCP servers after the app disconnects instead of leaving orphaned background processes (#494).
- Prevent unbounded instance duplication when editing Figma-imported or pasted components with serialized or renamed children, keep extra instance children in their intended order, and avoid pasted instances re-linking pre-existing instances during clipboard import.

### Performance

- Reduce pauses after repeated frame creation without leaving hidden property edits or popups active.
- Reduce repeated text shaping and scene invalidation while moving and resizing objects, and reuse fitting canvas labels during zoom.
- Reduce unnecessary layout work after automation and Figma API edits by updating only affected layers and containers.
- Keep rapid trackpad zoom reversals and effect-heavy document navigation responsive by cancelling obsolete reconstruction and reusing safe raster snapshots.
- Show the FIG page list from a lightweight Kiwi scan before materializing the full document.
- Avoid redundant collaboration writes when synchronized node fields have not changed.
- Release completed streaming-response state to reduce retained chat memory (#544).
- Open large documents faster by reducing repeated position calculations when finding layers under the pointer (#527).
- Avoid redundant autosaves while a `.fig` export is in progress, while ensuring newer edits are saved afterward (#528).
- Defer JSX generation and syntax highlighting until the Code panel is active, keeping large canvas selections responsive (#500).
- Paste large, flat Figma selections faster by avoiding repeated scans of clipboard layers (#500).
- Reduce peak memory during `.fig` export by sharing immutable binary resources with the isolated export graph.

### Security

- Protect new real-time collaboration sessions with stronger invitation credentials.

## 0.14.0 — 2026-08-10

### Breaking changes

- **Core SDK:** Import scene graph types, geometry, coordinate, matrix, snapping, undo, and path helpers from `@pairdraw/scene-graph`; import `.pen` parsing from `@pairdraw/pen`; import synchronous Kiwi decompression from `@pairdraw/kiwi` instead of the `@pairdraw/core` compatibility barrel; use uppercase acronym casing in exported identifiers, including `JSONObject`, `JSONArray`, `JSONValue`, `RPCCommand`, and `executeRPCCommand`; and use the renamed tool exports `importSVG`, `exportSVG`, `exportPDF`, `getJSX`, `diffJSX`, and `setPexelsAPIKey`.
- **Vue SDK:** Replace the removed color-picker model helpers with `useColorModel()`; replace the deprecated `FillPickerRoot` and `useFillPicker()` APIs with `FillRoot`, `FillSwatch`, `useFill()`, and a consumer-owned popover; rename `FontPickerUi` to `FontPickerUI`; and remove the exported `testId` prop helper types in favor of semantic component anatomy.
- **CLI and MCP SDKs:** Use uppercase acronym casing in exported identifiers, including `AppTargetCLIArgs`, `appTargetRPCArgs`, `loadRPCData`, `prepareDocumentForRPC`, `RPCSender`, `createBrowserRPCBridge`, `createMCPSessionManager`, and `createStdioRPCBridge`.

### Added

- Export selections, pages, and documents as editable PowerPoint (`.pptx`) files from the File menu, CLI, and SDK. Text, rectangles, ellipses, and lines remain editable; visually complex layers are embedded as images.
- Import HTML, CSS, Tailwind, and JSX as editable documents from the app, CLI, and SDK, and export standalone browser-ready HTML with compiled CSS and optional external assets.
- Drag image files into the desktop app and paste Figma layers with their remote image fills.
- Import dropped SVG files as editable vector layers, preserving compatible multi-color fills and transparent paints. (#386, #392, #394, #446).
- Convert image layers into editable vectors with Recraft or fal.ai from the canvas context menu. (#322).
- Browse document components as thumbnails or a list in the Assets panel, group them by page, and drag instances directly onto the canvas. (#424).
- Create centered frames from Figma-style device and asset presets, or resize selected frames to a preset while preserving their names. (#418).
- Manage pages by renaming, deleting, and dragging to reorder them in the Pages panel.
- Create text by dragging a fixed-size text box or clicking for auto-width text.
- Create and edit layout grids for frames and components, including columns, rows, counts, gutters, margins, visibility, and grid size.
- Inspect and edit constraints, stroke caps and joins, corner smoothing, shared styles, component properties, blend modes, masks, advanced typography, text resizing, and per-node export settings from the Design panel.
- Edit solid fill colors by entering hex values directly in the Design panel.
- Use Figma-style number-key opacity shortcuts: `1`–`9` set 10%–90%, `0` sets 100%, and two-digit sequences set exact values.
- Access more common design actions from the browser and desktop menus, including visibility, locking, masks, flipping, components, z-order, distribution, selection, rulers, multiplayer cursors, and Settings.
- Find overlapping layers and overflowing children from the CLI, AI tools, and MCP.
- Target a specific open document and page from live CLI and MCP automation, including sessions with multiple documents.
- Connect local MCP clients through automatically discovered private Unix sockets on macOS and Linux, with localhost TCP fallback. (#338).
- Test OpenAI-compatible provider connections from AI settings with clearer setup errors.
- Configure separate Design, Review, Fast, and Vision models, providers, endpoints, and credentials from AI settings.
- Manage AI, agent, media, and storage credentials from unified Settings, using the system credential store on desktop and encrypted browser storage by default, with a session-only browser option.
- Connect an S3-compatible storage workspace with local-first saves, background synchronization, embedded `.fig` previews loaded without downloading full documents, and automatic refresh while the workspace is active.
- Add Japanese localization and improve menu translations across the existing supported languages. (#367).
- Author richer Design JSX with components, instances, variables, gradients, structured fills, shadows, blur effects, masks, and inline SVG vectors.
- Build custom property panels and document workspaces with new Vue SDK number fields, bindable values, property sections, responsive grids, segmented controls, property lists, color models, fill controls, gradient primitives, and the headless `useDocumentWorkspace()` composable.
- Use `useColorModel()` in the Vue SDK for extensible color formats and shared RGB, HSL, HSB, and OkHCL channel behavior.
- Add dedicated SceneGraph, Pen, Kiwi, Fig, and DOM/CSS packages with documented public entry points for building on Pairdraw.

### Changed

- Simplify AI model setup with clearly separated model, connection, and advanced settings, automatic compatibility and output-limit defaults for recognized models, and an explicit custom-model option.
- Redesign the editor chrome and Design panel with denser, better-aligned controls, clearer selection and section states, improved menus and overlays, consistent light/dark theming, and better keyboard and screen-reader support.
- Choose Freeform, vertical, horizontal, or grid flow directly from the contextual Layout section, with sizing controls grouped alongside it.
- Choose Auto width, Auto height, or Fixed size directly from the Layout section for text layers.
- Scale the Layers panel to documents with thousands of nodes through virtualized rows, faster incremental updates, stable expansion, range selection, and scroll-to-selection.
- Open and save large `.fig` documents substantially faster while preserving original metadata and user edits, and switch between large pages with fewer Layers panel stalls. (#420).
- Resolve fonts before text appears, with language-aware CJK and Arabic fallbacks, character-specific remote subsets, and more reliable rendering as fonts load.
- Use MiniMax M3 as the default model for MiniMax AI connections. (#431).
- Center empty and setup states consistently across panels, dialogs, and workspaces.

### Fixed

- Keep desktop startup clean when optional MCP automation is unavailable, retain startup diagnostics for MCP-dependent features, and load JSX syntax highlighting without browser globals.

- Preserve Figma’s imported glyph outlines through layout and appearance updates so text keeps its intended weight and shape.
- Keep swapped image avatars and thin stepper dividers at their effective imported size and position.
- Scale proportion-constrained `.fig` instance geometry through fixed wrapper layers so imported logos and icons retain their intended size.
- Match Figma auto-layout spacing, padding, min/max constraints, scalar variable bindings, CanvasKit-shaped generated text, imported text bounds, and nested instance geometry more closely.
- Match Figma Plugin API vector path and network editing, including bounds, transforms, winding rules, region fills, validation, and handle mirroring. (#444).
- Let AI and MCP tools create arbitrary vectors from SVG path data, validating input without leaving blank layers behind. (#440).
- Improve AI design accuracy by exposing every supported shape, including visible stroke colors and weights in visual descriptions, and accepting supported inline SVG attributes without false warnings. (#445, #447, #448).
- Restore Anthropic AI connections in the web app instead of failing with a browser endpoint error. (#438).
- Reconnect live CLI and automation sessions automatically after an unexpected bridge disconnection.
- Keep MCP file access inside its configured root when paths contain symlinks, and strengthen local authentication token checks. (#338).
- Start globally installed ACP agents correctly on Windows instead of reporting them as unavailable. (#361).
- Resume pending cloud saves after restarting the app or temporarily losing credentials, without reviving deleted documents or overwriting newer local changes.
- Handle S3 object listings, pagination, and escaped names more reliably, and explain required CORS setup without modifying bucket rules.
- Show HTML, CSS, Tailwind, and JSX import errors instead of failing silently.
- Preserve inline SVG attributes, nested transforms, and explicit icon dimensions when rendering Design JSX artwork.
- Save auto-layout frames that stretch their children to `.fig` without failing. (#427).
- Preserve nested instance text, visibility, paint, geometry, clipping, variable modes, and component swaps in `.fig` files.
- Improve `.fig` import and rendering fidelity for groups, booleans, instances, rotated vectors, complex text fills, auto-sized text, layout grids, page guides, patterns, noise effects, masks, and canvas backgrounds.
- Preserve pages, components, prototype and library metadata, export settings, unsupported effects, and other unrelated Figma data when editing and resaving `.fig` files.
- Prevent duplicate generated IDs from corrupting `.fig` round trips.
- Preserve the whole document when exporting FIG unless a page is explicitly requested, populate unopened pages for file-mode CLI inspection, and expose vector paths and variable modes to Plugin API scripts.
- Report corrupted compressed `.fig` data as an error instead of opening it as valid content.
- Match Figma auto-layout reflow after deleting children, hiding optional instance slots, or syncing component changes.
- Make group and boolean-operation children scale with their parent during resize.
- Edit vectors in opened documents at the correct position, with live fill updates and working undo and redo. (#390).
- Keep duplicated layers independent instead of sharing mutable fills, strokes, bindings, overrides, or vector data, and remove stale bindings when paints are deleted.
- Keep desktop text visible across scene and overlay canvases, refresh it after local fonts load, and preserve rendering when an italic face is unavailable. (#395).
- Vertically center text correctly when an explicit line height adds space above and below its glyphs. (#422).
- Preserve Hangul IME composition while editing text.
- Restore desktop copy, cut, and paste when browser clipboard events are unavailable.
- Finish pasting Figma layers promptly even when remote images are slow or unavailable, and hydrate their image fills when downloads complete.
- Reuse the existing tab when reopening a file through its desktop path or browser file handle, avoiding duplicate watchers and conflicting saves. (#297).
- Share public app links from the desktop collaboration panel and send the current document to newly joined collaborators.
- Show only the most specific tooltip when property controls contain nested actions.
- Match regional browser languages to supported locales without selecting a lower-priority language. (#417).
- Improve Simplified Chinese translations and correct localized menu terminology.
- Resolve published package types correctly for TypeScript consumers and keep file-backed CLI commands working under Node.

### Security

- Update the collaboration WebSocket dependency to address a protocol-length advisory.

## 0.13.2 — 2026-05-30

### Changed

- Update the Homebrew install command to use the published cask.

### Fixed

- Fix the published MCP package so global installs include the `pairdraw-mcp` and `pairdraw-mcp-http` launchers required by desktop app integrations.

## 0.13.1 — 2026-05-29

### Fixed

- Fix the npm package contents for the CLI so Bun installs include the built `pairdraw` binary and runtime bundle.

## 0.13.0 — 2026-05-29

### Fixed

- Fix the published CLI package so Bun global installs run the built `pairdraw` binary instead of raw TypeScript sources.

- Greatly improve importing Figma `.fig` files with complex component systems: badges, avatars, icons, links, input fields, lists, date pickers, nested instances, component swaps, and variant properties now open much closer to their original Figma appearance.
- Fix missing or white content in imported `.fig` files caused by unresolved Figma variable bindings, including image/avatar badges, icon colors, text colors, and variable-backed component overrides.
- Preserve more Figma document details when opening and saving `.fig` files, including internal component pages, component ordering, page metadata, canvas backgrounds, text layout, glyph rendering, vector geometry, effects, shadows, and instance overrides.
- Keep user edits after opening an imported `.fig` file: changing size, position, fills, text, or layout now wins over preserved Figma round-trip data when the document is saved again.
- Fix `.fig` exports so files reopened in Figma or Pairdraw keep their pages, components, instances, text wrapping, icons, avatars, and preview thumbnail intact.
- Fix live canvas updates during move/resize/edit previews so visible scene changes repaint immediately.
- Fix accidental duplicate creation when Alt-clicking without dragging.
- Fix MCP startup in the browser.
- Fix CanvasKit loading outside the browser when project paths contain spaces.
- Render imported Figma layer and fill blend modes such as multiply, screen, overlay, difference, hue, saturation, color, and luminosity.
- Render common imported Figma mask stacks so visible layers above alpha, vector, or luminance masks are clipped by the mask shape, including consecutive mask layers.
- Render Figma-style smoothed rectangle corners, including independent corner radii, and effect blend modes from imported Figma files.
- Improve imported tiled image fills by applying Figma image transforms when repeating image patterns.
- Keep imported Figma boolean operations editable as boolean-operation nodes instead of flattening them to vectors.
- Apply imported variable font axes from Figma `fontVariations` when rendering text.
- Render more imported Figma visual metadata, including text decoration styles, leading trim, pattern fills, layout grids, page guides, and deterministic fallbacks for raw noise effects.

### Performance

- Open large `.fig` files faster by deferring work for pages you have not viewed yet while still preparing all needed content before export.
- Improve canvas responsiveness during zooming, panning, dragging, and editing by reusing cached scene backing where safe.
- Speed up `.fig` export for documents with many preserved Figma paint and variable payloads.

## 0.12.2 — 2026-05-19

### Added

- Allow OpenRouter users to enter any model ID from provider settings with cached autocomplete suggestions for tool-capable models, while keeping the curated dropdown as the default when no custom model is set.

### Changed

- Use localized app tooltips instead of native browser titles across editor controls, panels, and menus.
- Update Claude Code MCP setup documentation and the docs landing screenshot.
- Ignore non-source Markdown files in the app dev watcher so documentation edits do not reload the running editor.

### Fixed

- Route Claude Code stdio MCP requests through the live Pairdraw app connection, including immediate disconnected errors when no document is connected.
- Keep MCP disconnected guidance focused on starting Pairdraw and opening a document.
- Improve agent-rendered JSX compatibility with Figma-style text, alignment, and rotation aliases; strip HTML comments; and report unsupported props from render tools.
- Load exact text font styles after MCP and AI tool mutations so newly created bold/weighted text renders immediately.
- Include text style fields in MCP `get_node` output so agents can verify generated text accurately.
- Keep provider settings tooltip/popover composition working in WebKit.

## 0.12.1 — 2026-05-19

### Fixed

- Fix `.fig` round-trips for Pairdraw component sets and variable bindings, and recompute imported layouts after opening documents.
- Report desktop/MCP package version mismatches explicitly and include package-manager-aware install guidance from the MCP server.
- Support scoped MCP `save_file({ path })` workflows while keeping file saving in the desktop app.
- Use native Tauri path handling for save parent directories so Unicode and Windows paths are handled correctly.
- Fix the web font picker so Google Fonts remain available in Safari, local font access is requested on first open when supported, font sources are labeled, and Google font previews load lazily for visible rows.
- Fix background blur rendering so it blurs the backdrop behind a layer instead of applying a no-op content filter, and keep effect parameter controls visible in the properties panel.

## 0.12.0 — 2026-05-18

### Added

- Assets panel — browse, search, and insert document components directly from the left sidebar.
- Component variants — switch instance variants from the right inspector; default variant respects property definitions.
- Figma library metadata — component keys, source libraries, version IDs, descriptions, and docs links are preserved on import/export.
- Desktop file associations — double-click `.fig` or `.pen` files in Finder/Explorer to open them in Pairdraw.
- Auto-update — startup update checks and a Check for Updates menu item on desktop.
- Light theme with theme-aware canvas rulers.
- PDF export — available in the export panel, CLI (`--format pdf`), and MCP.
- SVG import tool for automation workflows.
- DeepSeek AI provider.
- Variable modes — create, rename, duplicate, delete, and set defaults per collection.
- Variable binding controls for fills, strokes, sizing, min/max, and typography fields.
- Auto-layout inspector controls for min/max dimensions, auto gap, wrap gap, and two-axis padding.
- Stroke dash/gap controls.
- Font settings — local font access, fallback predownloads, and downloaded font cache management.
- Editor commands for frame selection, paste to replace, Boolean operations, flatten, outline text, and outline stroke.
- Boolean operations panel control and canvas context-menu entries for flattening and outlining supported selections.

### Changed

- Smaller domain modules across core, app, Vue SDK, CLI, MCP, docs, and desktop with enforced package boundaries.
- Separate scene and overlay canvas layers — rulers, labels, and selections no longer cause scene redraws.
- Shared menu schema between browser and native Tauri menus.
- Editor command metadata now drives shortcut display across browser menus, native menus, tooltips, and context menus.
- Text-to-vector conversion now uses shared loaded-font outline geometry across Boolean, flatten, and outline commands.

### Fixed

- Fix `.fig` export of component variant properties and text stretch alignment so designs round-trip correctly through Figma.
- Fix CJK and Arabic text rendering — fallback fonts now load before the first paint instead of showing blank text.
- Fix large `.fig` files freezing on open — parsing runs in a worker, and the viewport fits to content after loading.
- Improve Figma import fidelity — variable aliases, nested instances, avatar swaps, badge internals, and input text alignment are preserved.
- Improve Figma export fidelity — flipped vectors, stroke geometry, visual overflow, and stroked-shape drop shadows are preserved.
- Fix variant switching so instances update their contents, not just the component reference.
- Fix text editing inside components and instances on double-click.
- Fix paste into selected containers and entered frames.
- Fix clipboard parsing to safely ignore invalid data.
- Fix undo/redo for duplicate, state restore, and modifier-key release.
- Prevent browser from intercepting app-level undo/redo shortcuts.
- Fix font loading and bundled font resolution.
- Show the startup loader until fonts load and the first render completes.
- Improve light theme polish and canvas ruler colors.
- Normalize browser zoom speed.
- Fix variable picker popovers and color binding swatches.
- Fix dashed strokes on vector nodes and gradient fills on text.
- Fix inner shadow rendering on text nodes.
- Fix imported Figma-derived underlined text rendering.
- Fix exponential `.fig` file growth on repeated save/load cycles.
- Fix opening large `.fig` files so every page populates component instances, preventing missing nested content when switching pages.
- Fix canvas size badges scaling with zoom.
- Fix layout inspector dropdown anchoring and spacing/padding icon clarity.
- Fix section drawing and color input forwarding in the property panel.
- Fix asset insertion coordinates inside entered containers.
- Fix MCP stdio handshake and eval return values.
- Fix `@pairdraw/vue` npm imports referencing an unexported core subpath.
- Fix Figma clipboard text compatibility — pasted Pairdraw text keeps editable fixed bounds, line wrapping, baselines, glyph offsets, and Figma edit-mode layout.
- Fix local font matching so requested upright and weighted faces do not fall back to italic or regular faces.
- Fix CanvasKit paragraph rendering to preserve requested text weights and slants.
- Fix nested text editing interactions — drill double-click enters nested text edit mode, and clicking another text node switches edit targets while editing.
- Fix auto-height text edit commits so text bounds and undo state stay in sync.
- Fix Boolean, flatten, and outline operations to reject unsupported image/complex-script sources safely instead of silently dropping geometry.
- Fix outline stroke enablement for stroked descendants inside groups and containers.

### Performance

- Event-driven canvas rendering — scene and overlay layers only repaint when their inputs change, replacing continuous polling.
- Shared RAF scheduler coalesces scene and overlay frames into a single animation frame per editor.
- Font-family fallback arrays and downloaded remote fonts are cached to avoid repeated work.
- WebGL draw-call instrumentation only runs while the profiler is active.
- Instance override resolution is cached and `.fig` pages load lazily for large files.
- Live drag/resize uses repaint-only previews to skip layout during interaction.

## 0.11.8 — 2026-04-23

### Fixed

- Fix MCP server not spawning on Windows — use `cmd /c` to resolve `.cmd` wrappers from npm global installs.
- Fix MCP server and automation WebSocket not connecting on Windows/Linux — inline `__TAURI_INTERNALS__` check at call time instead of using stale module-level `IS_TAURI` constant.
- Fix shell PATH not inherited by GUI app on macOS/Linux — add `fix-path-env-rs` to read shell config.

## 0.11.7 — 2026-04-22

### Added

- Add stdio transport for MCP server — `pairdraw-mcp` now works as a proper stdio MCP server for Claude Code, Cursor, etc. HTTP server available as `pairdraw-mcp-http`.
- Default canvas background to dark when system prefers dark color scheme.
- Add `list_available_fonts` MCP tool for font discovery.
- Copy node ID / XPath from context menu; CLI selection command.
- Arrow key nudge for selected nodes (1px, Shift+arrow for 10px).
- JSX renderer: `position="absolute"`, `top`, `left` props for absolute children inside auto-layout containers.
- MCP server sends `notifications/tools/list_changed` when the desktop app connects or disconnects.
- Headless text measurement via opentype.js per-glyph advance widths — no CanvasKit needed.
- Add `open_file` and `new_document` MCP tools with `PAIRDRAW_MCP_ROOT` path scoping.
- Optional `path` param on `export_image`, `export_svg`, `get_jsx` — write output to disk instead of returning base64/string.
- Multi-root JSX support — multiple top-level elements auto-wrapped in a fragment.
- `Component` and `Instance` tag aliases in JSX renderer.
- JSX prop reference doc — copy to clipboard via book icon in Code panel.
- Prompts (`CODEGEN_PROMPT`, `JSX_REFERENCE`) moved from embedded strings to markdown files.

### Fixed

- Fix Backspace not deleting selected nodes after clicking on canvas — canvas now receives focus on click so keyboard shortcuts aren't blocked by stale input focus.
- Support Cmd/Ctrl+click for additive multi-select in layers panel (previously only Shift+click worked).
- Fix macOS Tauri build — move `NSAllowsLocalNetworking` ATS config from invalid `tauri.conf.json` property to a proper `Info.plist` file.
- Fix tab order and keyboard handling in inspector panel.
- Fix design token variables not resolved before passing to yoga-layout.
- Suppress keyboard shortcuts while editing property panel inputs.
- Fix tooltip competing with popover trigger on Windows.
- Fix hit area for nodes with rotated parents.
- Error toasts auto-dismiss, deduplicate, and cap stack at 5.
- Bump yoga-layout to 3.3.0-grid.3 with `Node.free()` support.
- Bump PWA precache limit for canvaskit-webgpu.
- Fix color picker dragging flooding the undo stack — fill/stroke/effect color and opacity drags now collapse into a single undo entry per interaction via debounced batching in `PropertyListRoot`.
- Fix .fig import crash on alias variables without a GUID.
- Fix `save_file` crash on vectors with missing tangent control points — default to straight segments.
- Validate `create_vector` path JSON upfront with clear error messages for malformed input.
- Fix MCP/AI tools rejecting string-encoded numeric arguments from MCP clients (`"42"` → `42`).
- Fix "Create Instance" context menu item always grayed out — inverted disabled flag.
- Show "Create Instance" instead of "Create Component" in context menu when a component is selected.
- Fix headless layout: use stored .fig dimensions instead of rough text size estimates (26K → 11K mismatches on material3.fig).
- Fix `--help` output with huge vertical gaps between commands — remove inline examples from query description.
- Fix `pairdraw-mcp` npm package missing `dist/stdio.js` — explicitly list entry points in tsconfig.
- Show toast when MCP server fails to start instead of silently swallowing the error.
- Fix provider settings popover not appearing — tooltip wrapper broke floating-ui positioning.
- Fix `set_font_range` producing invalid style runs that crash `.fig` export — use `applyStyleToRange`, apply color and fontWeight from style name.
- Fix MCP "app not connected" error — message now instructs the agent to stop and inform the user.
- Fix external links in AI panel blocked by Tauri ACL — use opener plugin instead of shell.

## 0.11.6 — 2026-04-08

### Fixed

- Switch `@pairdraw/core` build from `tsgo` + `fix-esm-import-path` to `tsdown` — fixes bare directory imports that broke Node.js and Bun consumers.

## 0.11.5 — 2026-04-08

### Fixed

- Fix published npm packages resolving to TypeScript source instead of compiled JavaScript — `publishConfig.exports` overrides are now applied during CI publish.
- Fix Windows CI build failures caused by backslash file paths in custom lint rules.

## 0.11.4 — 2026-04-08

### Fixed

- Fix `@pairdraw/core` published package containing stale import paths from before the domain module restructuring — CLI and MCP installs from npm now resolve correctly.
- Add `save_file` MCP tool for saving the current document to disk.
- Clipboard text export now writes richer v4 `derivedTextData` payloads with glyph outlines for better paste fidelity.

## 0.11.3 — 2026-04-08

### Fixed

- Show actionable install errors in the chat panel when a required local AI CLI is missing.
- Fix inline layer rename so clearing the name restores the default name, and Backspace/Delete inside rename inputs no longer delete the layer.
- Fix rotated frame hit testing, hover highlights, and selection overlays so interactive areas and overlay labels stay aligned during rotation.
- Fix text edit undo so it restores both the original text and `styleRuns`.
- Pressing Enter with a selected text node now starts text editing and selects all text.
- Fix `ScrubInput` Enter handling so committing a value no longer triggers a second blur-based commit that overwrites it.
- Show the auto-layout panel for `COMPONENT`, `COMPONENT_SET`, and `INSTANCE` nodes.
- Fix missing layout direction icons in the auto-layout controls.
- Fix nested text selection inside gradient cards.
- Unify the size control into a single inline sizing input/dropdown with shorter localized labels to prevent overflow.

## 0.11.2 — 2026-03-30

### Fixed

- Stabilize npm publishing with isolated temp publish directories instead of mutating tracked package manifests in CI.
- Strip build-time scripts and dev dependencies from generated publish manifests so tarballs pack from verified artifacts only.
- Fix `@pairdraw/mcp` release packaging so the published npm tarball includes its built `dist/` CLI and server entrypoints deterministically.
- Fix `@pairdraw/core` release build configuration so CI publish jobs include Node and Bun ambient types when compiling package artifacts.

## 0.11.1 — 2026-03-30

### Fixed

- Fix npm publishing pipeline to publish packed tarballs instead of raw package folders.
- Attempt to fix `@pairdraw/mcp` npm package contents so the published CLI includes its built `dist/` entrypoints.
- Fix `@pairdraw/vue` npm package metadata and build output so the published package resolves from `dist/` while local workspace development keeps using source aliases.

## 0.11.0 — 2026-03-30

### Added

- Lock and visibility toggle buttons in layers panel (hover to reveal, always shown when active).
- Figma-style selection scope — double-click to enter groups/frames/components, Escape to exit.
- Nested container navigation — each double-click goes one level deeper.
- Dashed border around entered container for visual feedback.
- Layer panel click syncs canvas scope automatically.
- Vue SDK internationalization primitives — `useI18n()`, locale detection, persisted locale selection, lazy-loaded locale JSON files, and exported locale metadata for custom editor shells.
- Vue SDK docs and public API audit — documented advanced exports (`useOkHCL()`, variables helpers, viewport and locale APIs), aligned docs with the actual `provideEditor()` injection model, and expanded release-ready SDK guidance.
- npm release pipeline now publishes `@pairdraw/core`, `@pairdraw/cli`, `@pairdraw/mcp`, and `@pairdraw/vue` together on version tags.
- App language picker in the menu bar — switch UI locale without reloading.
- Added a vector curve editor and improved drawing experience with the pen tool.
- Resume pen drawing from existing open path endpoints — click an endpoint to continue the curve.
- Close open paths by dragging one endpoint to the other.
- Align selected anchor points relative to each other in vector edit mode — the standard alignment buttons in the position panel now operate on selected vertices when 2 or more are selected.
- Unified core IO format registry — `.fig` is now modeled as the native document format alongside shared export adapters for PNG, JPG, WEBP, SVG, and JSX.
- Export selection or current page as `.fig` from the app export UI and app menu.
- New CLI commands: `pairdraw convert` for document conversion, `pairdraw formats` to inspect readable/writable/exportable formats, and `pairdraw lint` for design consistency, structure, and accessibility checks.
- CLI export now supports `.fig` output and routes PNG/JPG/WEBP/SVG/JSX/`.fig` through the shared IO layer.
- `Open…` now supports `.pen` Pencil documents through the shared document reader pipeline while keeping `.fig` as the native save format.
- Display‑P3 document color space pipeline — documents now default to Display‑P3, `.fig` import/export preserves document color profiles, the live canvas requests P3 surfaces with sRGB fallback, and raster/SVG export paths accept explicit color-space targets.
- Color picker overhaul — unified `RGB` / `HSL` / `HSB` / `OkHCL` field formats, slider-space-aware track/thumb previews, and better neutral-color editing behavior for fills, strokes, gradient stops, and component fills.
- OkHCL metadata now round-trips through `.fig` plugin data and integrates directly into the main fill/stroke color workflow with preview gamut diagnostics.
- Vue SDK now exposes reusable color-picker model helpers and solid fill/stroke commit helpers for custom editor shells.
- Update built-in Z.ai and MiniMax model lists — Z.ai now uses the Anthropic-compatible endpoint for GLM coding models, adds GLM-5.1, and MiniMax adds M2.7 / M2.7-highspeed.
- Arabic and RTL support across text rendering, editing, layout, export, and AI tooling — text nodes support `Auto`/`LTR`/`RTL`, auto-layout frames support `Auto`/`LTR`/`RTL` flow, and JSX/AI prompts/tools can now generate and edit both explicitly.

### Fixed

- Fix shortcuts, now work on non-English keyboard layouts.
- Fix imported `.fig` file open and page-switch regressions — loaded documents now keep graph/store state in sync, remap imported canvas/page children correctly, and recompute imported auto-layout descendants when switching pages.
- Fix first canvas render happening before fonts load — wait for fonts before the initial draw to avoid Safari and text measurement glitches.
- Preserve `fig-kiwi` version on `.fig` roundtrip — imports keep the original header version instead of rewriting everything to a hardcoded value; new files default to version 101.
- Normalize auto-layout text export for Figma — text children inside auto-layout frames now serialize with `NONE` auto-resize to match Figma behavior and avoid overflow on reimport.
- Fix keyboard editing regressions after the refactor — canvas shortcuts no longer fire while editing text, and Delete/Backspace no longer delete nodes during text entry.
- Fix MCP page switching persistence — `switch_page` now survives across tool calls in the same session.
- Improve CJK font fallback coverage — load multiple Google Fonts for broader Han/Japanese/Korean text support.
- Normalize more visible UI strings for localized app chrome — menus, panels, variables dialog, code panel, chat setup, and editor controls now respect the selected locale instead of falling back to English in common flows.
- Fix imported text rendering in browser and headless export — preserve stored bounds until fonts are ready, restore missing font-loaded guards, use natural width for `WIDTH_AND_HEIGHT` text, and clip text to node bounds.
- Fix browser/headless rendering mismatch for imported toolbar/instance content by correcting runtime imported layout recomputation instead of diverging browser rendering behavior.
- Fix `set_layout` tool not defaulting to HUG sizing when enabling auto-layout — frames now shrink/grow to fit children instead of keeping fixed dimensions.
- Normalize font family names on `.fig` export — strip optical size suffixes (e.g. "DM Sans 9pt" → "DM Sans") so Figma recognizes the font.
- TEXT nodes now default to a solid black fill — previously exported with no fill, making text invisible when opened in Figma.
- Fix save crash when COLOR variable is missing alpha channel.
- Fix console error spam on deployed web app from automation WebSocket reconnect loop.
- Fix headless CLI font fallback — bundled Inter font now ships with `@pairdraw/core` and loads without a web server.
- Locked nodes now block move, resize, rotate, and delete on canvas.
- Locked containers block double-click enter.
- Marquee selection skips locked and hidden nodes.
- COMPONENT/INSTANCE containers are now enterable via double-click.
- Replaced the alignment and reflection icons with the correct ones.

## 0.10.0 — 2026-03-15

### Added

- ACP agent support — use Claude Code, Codex, or Gemini CLI as AI assistants in the desktop chat panel.
- Permission confirmation dialog — ACP agents request user approval for file/shell operations, MCP design tools auto-approved.
- Unified MCP server — single HTTP + WebSocket proxy replaces Vite SSR bridge.
- Stock photo integration — `stock_photo` tool fetches images from Pexels or Unsplash and applies to design nodes. Provider adapter supports custom providers.
- Skeleton-first AI workflow — 4-phase design process (plan → skeleton → content fill via `replace_id` → polish) for more reliable AI-generated layouts.
- Batched AI tools — `calc` accepts arrays of expressions, `stock_photo` fetches all images in parallel, `batch_update` applies multiple property changes in one call, `describe` accepts `ids` array for multi-node inspection.
- AI visual feedback — blue pulsing border on nodes being modified, green flash on completion.
- Auto-depth `describe` — adapts inspection depth to subtree size (small block → deeper, large page → shallower).
- `set_fill` gradient support — linear gradients with `color_end` and `gradient` direction params.
- `render` tool `replace_id` — atomically swap skeleton placeholders with real content.
- MCP `export_image_file` tool for headless PNG rendering.
- Grid layout in AI chat — JSX renderer supports `grid`, `columns`, `rows`, `gap` props.
- Configurable max output tokens in AI provider settings (default 16384).
- Z.ai AI provider with GLM-5, GLM-4.7, GLM-4.6, GLM-4.5 model families.
- MiniMax AI provider with M2.5, M2.1, M2 models.

### Fixed

- Resolve variable-bound fill colors through alias chains.
- Fix SCALE constraint resizing for auto-layout instances.
- Propagate SCALE constraints through instance clone chains.
- Skip self-referencing symbolOverrides on nodes with explicit kiwi properties.
- Fix DSD resolution for swapped instance children.
- Fix instance swap override propagation through clone chains.
- Fix component property override resolution through clone chains.
- Fix text/property overrides clobbered by second transitive sync.

- Fix text rendering with wrong fonts on file open — all font weights (including default family) are now loaded before the first render.
- Fix `weightToStyle` mapping: weight 400 now correctly maps to "Regular" instead of "Medium".
- Fix detached ArrayBuffer crash when switching pages after saving — export worker now copies image buffers before transferring.
- Show warning toast when fonts fail to load, error toast when file open fails.
- Fix FillPicker crash when selecting image fills (missing `ref` import from #92).
- Fix Google Fonts TLS/network errors not cached — failed families no longer retry on every render.
- Fix CJK text garbled when font is unavailable — fallback now renders through paragraph shaper instead of raw `drawText`, preserving CJK characters via the fallback font chain.
- Fix auto-layout overflow in AI-generated designs — text wrapping, min/max constraints, absolute positioning, and FILL sizing now work correctly.
- Fix `layoutAlignSelf` limited to STRETCH — full range supported (CENTER, MAX, MIN, BASELINE).
- Fix hidden auto-layout children losing their dimensions on layout recompute.
- Fix ProviderSettings popover not visible in AI chat.
- Fix paste/copy/cut intercepted by canvas in AI chat input.
- Strip TypeScript casts from AI-generated JSX (`as any`, `as const`).
- Fix parsing complex .fig files crashing on missing GUIDs in component overrides.
- Fix headless text layout using 100×100 default size instead of estimated dimensions — multi-line wrapping now estimated correctly.
- Fix clipboard roundtrip losing properties — clipsContent, constraints, arcData, strokeCap/Join, layoutAlignSelf, textAutoResize, autoRename now preserved in Figma Kiwi serialization.
- Fix MCP headless export crashing on `window.queryLocalFonts` in non-browser runtimes (Bun/Node).
- Fix MCP `export_image` rendering blank text — fonts now loaded before rasterization.
- Fix text always using paragraph rendering with Inter fallback chain (no more missing-font garbling).
- Clip children to rounded corners when `clipsContent` is true.
- Use child shape for drop shadows on transparent containers.
- Treat `FOREGROUND_BLUR` as layer blur wrapping children.
- Fix radial, angular, and diamond gradient rendering.
- Fix .fig export roundtrip: variable GUIDs colliding with document.
- Fix file open dialog not working on first click in Safari.
- Skip variable fonts from local font access, use Google Fonts instead.
- Disable autosave by default.

### Performance

- Offload .fig parsing (unzip + Kiwi decode) to a Web Worker — main thread stays responsive during file open.
- Offload .fig compression to a Web Worker during save (was blocking 450ms+).
- Add instance index (`componentId → Set<nodeId>`) — `getInstances()` is O(1) instead of scanning all nodes.
- Defer graph event subscription until after layout computation during file open — eliminates redundant `syncInstances` calls.
- Cache label collection (sections/components) per scene mutation instead of walking the full tree every frame.
- Blocking font loading — fonts load before first render to ensure correct glyphs.

## 0.9.0 — 2026-03-09

### Added

- XPath query command — `pairdraw query design.fig "//FRAME[@width < 300]"` to find nodes by type, attributes, and tree structure using XPath selectors.
- CSS Grid layout mode — select a frame, click the grid icon in the auto layout toolbar to switch from flex to grid. Configure column/row tracks (fr, fixed px, auto), column and row gaps, and per-side padding. Powered by a [Yoga fork](https://github.com/open-pencil/yoga/tree/grid) with cherry-picked CSS Grid PRs from upstream.
- JSX and Tailwind CSS export for grid layouts — `grid grid-cols-N`, `gap-x-*`/`gap-y-*`, child `col-start-*`/`row-start-*`/`col-span-*`/`row-span-*`.
- Multi-provider AI support — connect to Anthropic, OpenAI, Google AI, or any OpenAI-compatible endpoint directly, in addition to OpenRouter. Per-provider API key storage, provider settings popover, automatic migration from single OpenRouter key.
- Anthropic-compatible provider for custom API endpoints.
- New AI tools: `get_jsx` (JSX roundtrip view), `diff_jsx` (structural diff), `describe` (semantic role, visual style, layout, design issues).
- AI visual verification — `export_image` returns image content to the model for vision-based review.
- API type toggle (Completions/Responses) for OpenAI-compatible providers.
- Figma zoom shortcuts — ⌘0 (100%), ⌘1 (zoom to fit), ⌘2 (zoom to selection), ⇧1/⇧2 alternatives.
- XPath query tool — `query_nodes` for AI/MCP with attribute selectors, tree traversal, and type filtering.

### Changed

- Padding on a frame auto-enables vertical auto-layout.
- AI tools run `computeAllLayouts` after execution — layout updates immediately.
- Enhanced AI system prompt with full JSX prop reference and verification workflow.
- Chat panel preserves messages when toggling UI visibility.
- SceneGraph event bus (nanoevents) — `node:created`, `node:updated`, `node:deleted`, `node:reparented`, `node:reordered` events replace monkey-patching in collab sync and manual render invalidation.
- Replace esbuild-wasm (14 MB) with sucrase (201 KB) for JSX transform — `buildComponent()` and `renderJSX()` now synchronous and browser-compatible.
- `useMagicKeys` keyboard shortcut system — replaces tinykeys with VueUse built-in, cross-platform Meta/Control handling, modifier exclusion for combo conflicts.
- Dev-only debug toolbar for copying chat logs.
- Auto-layout icons in layer tree — vertical (rows), horizontal (columns), and grid icons for auto-layout frames; components keep their purple diamond.
- Frame titles on canvas are now draggable — clicking a selected top-level frame's name label starts a drag.
- Compact layout controls — icon-based gap (↔/↕) and padding (T/R/B/L) inputs instead of text labels.
- Auto-detect horizontal vs vertical direction when wrapping in auto layout (Shift+A).
- Fix alignment grid for vertical layouts — visual positions now match spatial axes.
- Fix grid switch from HUG-sized frames — frame expands to fit children.
- Remove unwanted white fill when wrapping in auto layout.

### Fixed

- Serialize variables, collections, and bindings to `.fig` files — previously lost on save (#65).
- Text nodes created via MCP now render in Figma — emit `derivedTextData` with font metadata and layout size (#64).
- Double-click on layer tree no longer toggles expand/collapse — use the chevron instead.
- Page rename input matches layer rename styling.
- Fix `w="fill"`/`h="fill"` in JSX renderer — now direction-aware based on parent flex axis.
- Fix text auto-resize defaulting to fixed 100×100 — text without explicit width uses `WIDTH_AND_HEIGHT`.
- Fix `clipsContent` not propagated to Yoga — frames with clip enabled now set `Overflow.Hidden`.
- Fix `COUNTER_ALIGN_MAP` mapping stretch to `MIN` instead of `STRETCH`.
- Fix JSX export omitting x/y for absolute-positioned children.
- Fix JSX export ignoring `textAutoResize` for text sizing.
- Fix drag terminating on mouseleave — drags now continue outside the canvas.
- Fix `export_image` stack overflow on large nodes — chunked base64 encoding.
- Undo support for auto-layout reorder, layer tree reorder, and drag reparent.
- Page snapshot undo for AI tool mutations.
- Fix collab sync for same-parent reorder — `node:reordered` events now propagated to Yjs peers.
- Fix orphaned instances on clipboard paste — detach to FRAME when component is missing.
- Fix text typography lost on Figma clipboard import — preserve fontFamily, fontWeight, fontSize, lineHeight.
- Fix `copyFill` missing `gradientTransform` and `imageTransform` — gradient fills now round-trip correctly.

### Performance

- Event-driven rendering and component sync — `SceneGraph` emits typed events on mutations; `requestRender()` calls reduced from 94 to 22, component instance sync uses microtask batching with deduplication.
- Replace `structuredClone` with typed copy helpers for fills, strokes, effects, and style runs (~24× faster in hot paths).
- Filter .fig unzip to only decompress canvas and image entries, skipping metadata cruft.

## 0.8.0 — 2026-03-07

### Added

- Mobile layout & PWA — responsive editor with touch-optimized toolbar, swipeable bottom drawer (layers/properties/design/code), HUD overlay, and installable PWA with icons and service worker.
- Tailwind CSS v4 JSX export — export selections as HTML with Tailwind utility classes (`<div className="flex gap-4 p-3">`) from the Code panel, CLI (`bun pairdraw export --format jsx --style tailwind`), or programmatically via `sceneNodeToJSX(id, graph, 'tailwind')`. Supports layout, sizing, colors, border radius, opacity, rotation, overflow, shadows, blur, and typography. Uses v4 spacing semantics (px/4 multiplier) with automatic fallback to arbitrary values.
- Code panel format toggle — switch between Pairdraw (custom components) and Tailwind (HTML + utility classes) output.
- Homebrew tap for macOS (arm64 + x64), auto-updated on each release.
- Double-click to rename layers — inline rename in layer panel, shared `useInlineRename` composable.
- New AI/MCP tools: `analyze_colors`, `analyze_typography`, `analyze_spacing`, `analyze_clusters`, `diff_create`, `diff_show`, `get_components`, `get_current_page`, `arrange`, `node_to_component`.
- CLI-to-app RPC bridge — all CLI commands work against the running app when no file is specified. Start the app, then run `bun pairdraw tree` to inspect the live document.
- VitePress docs site — user guide, reference, architecture, and development docs with 6 locales (en, de, fr, es, it, pl), SEO (OG tags, hreflang, JSON-LD, sitemap), and dark theme.

### Changed

- Refactor mobile drawer tabs, layout sizing dropdowns, and inline rename to use Reka UI primitives.
- Add shared UI style helpers with tailwind-variants for menus, selects, buttons, and surfaces.
- Unified tool definitions — define once in `packages/core/src/tools/`, automatically available in AI chat, CLI, and MCP.
- Harden FigmaAPI — hide internals via Symbols, freeze arrays, fix `layoutSizing`, 30+ new properties and methods.
- Split tools into domain files (read, create, modify, structure, variables, vector, analyze) — easier to navigate and extend.
- Replace inline type definitions with named types (`Color`, `Vector`, `SceneNode`) across the codebase.
- Split 3200-line `renderer.ts` into `packages/core/src/renderer/` with 10 focused files (scene, overlays, fills, strokes, shapes, effects, rulers, labels).
- Centralize all color utilities in `packages/core/src/color.ts` — `colorToHex8`, `colorToCSSCompact`, `normalizeColor`, `colorDistance`; remove 5 duplicate implementations across the codebase.
- Add `geometry.ts` with shared rotation math (`degToRad`, `radToDeg`, `rotatePoint`, `rotatedCorners`, `rotatedBBox`).
- Extract `isArrayMixed()` helper for multi-selection property panels.

- Add `motion-v` for declarative animations — used in mobile drawer (spring-animated height with pan gestures) and toolbar (layout-animated category switching with directional slide transitions).
- Mobile drawer: replace `useSwipe` + manual rAF animation with `motion.div` `:animate` + `@pan`/`@panEnd`; always-on tab state (no more null `activeRibbonTab`); content stays rendered when closed.
- Mobile toolbar: replace manual `scrollWidth` measuring + inline CSS transitions with `motion.div layout` + `AnimatePresence` directional slide variants.
- Mobile UI cleanup: extract shared `colorToCSS` util to core, `initials` to `src/utils/text`, `toolIcons` to `src/utils/tools`; replace hand-rolled dropdowns with reka-ui Popover/DropdownMenu; narrow `mobileDrawerSnap` type to string union; move magic numbers to constants; disable PWA service worker in dev mode.
- 83 new E2E tests (57 → 140): design panel, code panel, components, copy/paste, multi-page, text editing, keyboard shortcuts, context menu.
- 150 new unit tests (588 → 738): color, undo, snap, vector, style-runs, text-editor.
- 48 new E2E tests (9 spec files) + 26 mutation unit tests + store/canvas test helpers.
- Add `data-test-id` attributes to AppearanceSection, LayoutSection, TypographySection, VariablesDialog, EditorView.

### Fixed

- Fix drawer animation jump on close — single spring transition instead of two-phase.
- Fix `ALL_TOOLS` registry missing newer tools (`analyzeColors`, `diffCreate`, `exportImage`, `arrangeNodes`).
- Fix `renderJSX` typo in tool definitions (`renderJsx` → `renderJSX`).
- Fix all oxlint warnings and tsgo errors — replace `!` non-null assertions in `use-collab.ts` with local const captures.
- Fix broken test imports — stale `../../src/engine/` paths updated to `@pairdraw/core`.
- Fix flaky E2E tests: layers panel navigates to `/demo`, zoom-to-fit test zooms in first, snapshot rendering stabilized with `workers: 1` and `colorScheme: dark`.
- Fix bogus .fig import mappings for `expanded` and `strokeMiterLimit` fields.
- Fix PWA manifest error in dev mode, handle invalid font data gracefully.
- Fix eval response unwrapping and `export_jsx` page selection in RPC bridge.
- Fix automation commands not recomputing layouts after mutations.
- Fix workspace dependency not resolved when installing from npm (switch CI to pnpm publish).

## 0.7.0 — 2026-03-05

### Added

- SVG export — export selections as SVG from the export panel, context menu, CLI (`bun pairdraw export --format svg`), or MCP/AI tools (`export_svg`). Supports rectangles, ellipses, lines, stars, polygons, vectors, text with style runs, gradients, image fills, effects, blend modes, clip paths, and nested groups (#46).
- Copy/Paste as submenu in context menu — Copy as text, Copy as SVG, Copy as PNG (⇧⌘C), Copy as JSX.
- Stroke align (Inside/Center/Outside) with clip-based rendering matching Figma behavior.
- Individual stroke weights per side (Top/Right/Bottom/Left) with side selector dropdown.
- Google Fonts fallback — automatically loads fonts from Google Fonts API when not available locally.
- Auto-save toggle in File menu — disable to prevent automatic writes to the opened .fig file.
- Renderer profiler with in-canvas HUD overlay, GPU timing, and phase instrumentation.

### Changed

- Replace custom color picker with Reka UI Color components (ColorArea, ColorSlider, ColorField) — adds keyboard navigation and accessibility to the color area, hue, and alpha controls.

### Fixed

- CJK text rendering — load a system CJK font (PingFang SC, Microsoft YaHei, Noto Sans CJK) as fallback; falls back to Noto Sans SC from Google Fonts when no system font is available (#48).
- Font registration errors no longer cache invalid font data — `loadFont` only caches after successful CanvasKit registration.
- Fix `render` tool failing on Windows + Bun with "Cannot find module" error (#43).
- Fix hover highlighting nodes from internal component pages — scope hit-test to current page.
- Fix hit-testing on transparent frames and groups — empty containers without fills or strokes are now click-through, clipping parents reject hits outside their bounds, matching Figma behavior.
- Fix instance overrides on .fig import and clipboard paste — resolve guidPaths by overrideKey, handle component swaps (`overriddenSymbolID`), propagate through nested clone chains. Import and paste now share a single override engine.
- Apply Figma component property assignments on import — boolean visibility toggles and instance swaps via `componentPropRefs`/`componentPropAssignments`.
- Apply `derivedSymbolData` sizes on import — containers now shrink correctly when component properties hide children.
- Fix override resolution for nested instance targets — check the current node before searching descendants.
- Fix component property assignments for nested instances — resolve scoped `componentPropAssignments` inside `symbolOverrides` via guidPath, handle `guidValue` for instance swaps, reorder phases so transitive sync doesn't clobber visibility.
- Pixel-perfect vector rendering using pre-computed `fillGeometry`/`strokeGeometry` blobs from .fig files — eliminates white gaps between adjacent stroked shapes.
- Stroke outlines on clipboard paste — convert vectorNetwork paths to filled outlines via CanvasKit when geometry blobs are unavailable.
- Apply `derivedSymbolData` transforms and geometry during import — instance children render at correct scale and position.
- Fix internal pages becoming visible after .fig round-trip — preserve `internalOnly` flag on export.
- Scope layout recomputation to current page for paste/undo/font-load (major speedup on large multi-page files).
- Show loading overlay until all document fonts are loaded (no more partially rendered text).
- Load fonts when switching pages (previously only loaded for the first page).
- Always show visibility toggle on fill, stroke, and effect rows (matches Figma).
- Fix renderer crash on double destroy when closing files quickly.
- Fix .fig page ordering — use deterministic byte comparison for fractional index positions.
- Fix text truncation using `textTruncation` field instead of `textAutoResize`.
- Fix horizontal scrollbar on design and pages panels.
- Style scrollbars for Tauri (thin dark overlay instead of default OS chrome).
- Enable file watcher in Tauri — `watch` feature was missing from `tauri-plugin-fs`.

## 0.6.0 — 2026-03-04

### Added

- Multi-selection properties panel — edit position, size, appearance, fill, stroke, and effects across multiple selected nodes.
- Shared values display normally, differing values show "Mixed".
- W/H inputs in multi-selection mode.
- Flip horizontal/vertical using scale transform instead of rotation.
- Single-node alignment aligns to parent frame bounds.
- ACP agent package — Agent Communication Protocol server for AI coding tools, reusing core ToolDefs.

### Changed

- Apple code signing and notarization for macOS builds.
- Git LFS storage moved from GitHub to Cloudflare R2.

### Fixed

- Fix Figma clipboard paste: extract shared kiwi→SceneNode conversion, fixing broken auto-layout, missing gradient/image fills, effects, style runs, and text properties.
- Fix vector rendering on paste — scale path coordinates from Figma's normalizedSize to actual node bounds.
- Fix pasted instances having no children — populate from component via symbolData when both are in clipboard.
- Detect component sets on import — promote FRAME nodes with VARIANT componentPropDefs to COMPONENT_SET.
- Skip internal canvas on paste — components on Figma's hidden internal page populate instances but are not pasted as visible nodes.
- Apply instance overrides on paste — text content, fills, visibility, layoutGrow, and textAutoResize from symbolOverrides.
- Fix auto-layout child ordering — sort by geometric position instead of z-order position strings.
- Load fonts on paste and .fig import — collect font families from text nodes and load into CanvasKit.
- Text measurement in auto-layout — use CanvasKit paragraph metrics for WIDTH_AND_HEIGHT text nodes.
- Recompute layouts after font loading completes.
- Fix PERCENT line height conversion — was stored as raw value instead of pixels.
- Fix InvalidCharacterError when copying nodes with non-ASCII text.
- Load all font weight/style variants needed by pasted text nodes.
- Fix font loading not registering in core cache.
- Fix halfLeading applied to text measurement — enable only for rendering.
- Clear hover on zoom/pinch to keep scene picture cache valid.
- Fix flip buttons using rotation math instead of actual mirroring.
- Fix flip transform encoding — scale first matrix column only (was incorrectly producing 180° rotation).
- Decode flip state from .fig transform matrix on import.

## 0.5.1 — 2026-03-03

### Fixed

- Fix File → Save crash when document has layer blur effects.

## 0.5.0 — 2026-03-03

### Added

- Effects rendering: drop shadow, inner shadow, shadow spread, layer blur, background blur, foreground blur.
- Text shadows render on glyphs instead of bounding box.
- Multi-file tabs — open multiple documents in tabs within a single window.
- Tab bar with close buttons, middle-click to close, and new tab (+) button.
- Keyboard shortcuts: ⌘N/⌘T new tab, ⌘W close tab, ⌘O opens in new tab.
- Native Tauri menu: File → New and File → Close Tab wired to tab actions.
- Render text from SkPicture cache when fonts are missing — pixel-perfect display without the font installed.
- Missing font indicator (⚠) next to font picker in the sidebar.
- Right-click context menu on layers panel — same actions as the canvas context menu.
- 40+ new AI/MCP tools ported from figma-use:
  - Granular set tools: `set_rotation`, `set_opacity`, `set_radius`, `set_minmax`, `set_text`, `set_font`, `set_font_range`, `set_text_resize`, `set_visible`, `set_blend`, `set_locked`, `set_stroke_align`
  - Node operations: `node_bounds`, `node_move`, `node_resize`, `node_ancestors`, `node_children`, `node_tree`, `node_bindings`, `node_replace_with`
  - Variable CRUD: `get_variable`, `find_variables`, `create_variable`, `set_variable`, `delete_variable`, `bind_variable`
  - Collection CRUD: `get_collection`, `create_collection`, `delete_collection`
  - Boolean operations: `boolean_union`, `boolean_subtract`, `boolean_intersect`, `boolean_exclude`
  - Vector path tools: `path_get`, `path_set`, `path_scale`, `path_flip`, `path_move`
  - Create tools: `create_page`, `create_vector`, `create_slice`
  - Viewport: `viewport_get`, `viewport_set`, `viewport_zoom_to_fit`, `page_bounds`
  - Misc: `flatten_nodes`, `list_fonts`
- `set_text_properties` tool: alignment, auto-resize, decoration.
- `set_layout_child` tool: sizing, grow, align_self, positioning.
- 13 MCP server integration tests via `InMemoryTransport`.

### Changed

- Resizable pages/layers split in left panel with reka-ui Splitter.
- Layers tree auto-expands and scrolls to reveal selected node.
- Loading overlay on canvas while opening .fig files.
- Hide internal-only pages (e.g. "Internal Only Canvas" in design systems).
- Render page dividers — pages named with only dashes/asterisks/spaces show as horizontal lines.
- Only show component labels for COMPONENT and COMPONENT_SET, not instances.
- Replace all native `<select>` dropdowns with reka-ui `AppSelect` component.
- Smoother trackpad pinch-to-zoom with `Math.exp` curve and deltaMode normalization.
- Fix font picker dropdown truncating long font names.
- Show explanation in font picker when Local Font Access API unavailable (Safari/Firefox).

- Auto-populate GitHub Release notes from CHANGELOG.md via `ffurrer2/extract-release-notes@v2`.
- Skip already-published npm versions on CI re-runs instead of failing.
- Exclude non-app directories from Vite file watcher.

- Extract shared color constants (`BLACK`, `TRANSPARENT`, `DEFAULT_SHADOW_COLOR`) — replaces 8 inline literals across core.
- Extract shared `NodeContextMenuContent` component to avoid menu duplication.
- Fix `@pairdraw/core` dep in MCP package: `workspace:*` for local dev (pnpm resolves at publish time).
- Replace store thunks with a late-binding proxy.

- Clipboard roundtrip tests: encode to Figma Kiwi binary → decode → verify.
- 9 visual regression snapshot tests for effects rendering.
- Zoom/pan E2E tests and pipeline benchmark.
- MCP server edge-case tests for `find_nodes` and Zod validation.
- 6 unit tests for absolute position cache.

### Fixed

- Fix drop shadow rendering on top of fills — shadow now draws behind opaque content.
- Fix effect property changes not recorded in undo/redo history.
- Fix active tab text invisible against same-color background.
- Fix clipboard "Outside int range" error — `pasteID` used unsigned int exceeding Kiwi's signed 32-bit field.
- Error toasts are now sticky (don't auto-dismiss), with selectable text, copy button, and close button.
- Truncate long node names in export button.

### Performance

- Per-node SkPicture cache for effect rendering — unchanged shadow/blur nodes replay from cache on scene redraws.
- Drop shadows use `MaskFilter` direct draw instead of `saveLayer` offscreen buffers.
- Cached `ImageFilter`, `MaskFilter`, reusable effect paint — zero per-frame WASM allocations for effects.
- Reuse GL context on panel resize — swap surface without recreating renderer, preserving all caches.
- Per-frame absolute position cache — avoids repeated parent-chain walks during rendering.
- Optimize zoom/pan smoothness with `shallowReactive`, `useRafFn`, and input coalescing.

## 0.4.2 — 2026-03-02

### Changed

- Import additional properties from Figma clipboard: `layoutAlignSelf`, `clipsContent`, `fontWeight`, `italic`, `letterSpacing`, `lineHeight`.
- Convert `letterSpacing` PERCENT units to pixels based on font size.

- 7 new clipboard import unit tests (14 total).

### Fixed

- Fix Figma clipboard paste: skip non-visual node types (variables, widgets, stickies, connectors).
- Fix text not rendering after paste — `letterSpacing` from Figma is a `{value, units}` object, was passed as-is → `NaN` broke CanvasKit paragraph layout.
- Fix undo/redo for Figma paste — no undo entry was recorded; redo duplicated `childIds`.
- Center pasted Figma content in viewport instead of using original coordinates.
- Compute auto-layouts after clipboard paste (same as .fig import and demo creation).

## 0.4.1 — 2026-03-02

### Changed

- Highlight copy & paste with Figma in README and feature docs.
- Replace "fig-kiwi" format name with "Kiwi binary" — the format is shared between .fig files and clipboard.

### Fixed

- Fix text disappearing after hover when SkPicture cache was recorded before fonts loaded.
- Invalidate scene picture cache on font load to prevent stale fallback text.

## 0.4.0 — 2026-03-02

### Added

- MCP server (`@pairdraw/mcp`) — 29 tools for headless .fig editing via stdio (Claude Code, Cursor, Windsurf) or HTTP (Hono + Streamable HTTP with sessions).
- `pairdraw-mcp` and `pairdraw-mcp-http` binaries — install globally via `bun add -g @pairdraw/mcp`.

### Changed

- All packages emit JS via tsgo + fix-esm-import-path — `@pairdraw/core` and `@pairdraw/mcp` work on Node.js without Bun.
- Core package exports: `bun` condition → src (dev), `import` condition → dist (npm consumers).
- `@pairdraw/mcp` added to CI publish workflow.

## 0.3.2 — 2026-03-02

### Changed

- Visual regression tests for SkPicture cache: hover on/off cycle, multiple cycles, mouse hover, scene change + hover.
- Type `window.__PAIRDRAW_STORE__` globally, remove ad-hoc casts from tests.

### Performance

- Re-apply SkPicture scene caching for ~7x faster pan/zoom (0.98ms vs 6.8ms per frame at 500 nodes).

## 0.3.1 — 2026-03-02

### Fixed

- Fix text disappearing after hovering a frame (revert SkPicture scene caching).
- Fix macOS startup hang: async font loading, show window on reopen.

## 0.3.0 — 2026-03-01

### Fixed

- Fix npm publish: use pnpm for workspace dependency resolution with provenance.
- CLI version now reads from package.json instead of hardcoded value.
- Update README: accurate app size (~7 MB), streamlined feature list, current project structure.

### Performance

- SkPicture scene caching — pan/zoom replays cached display list instead of re-rendering all nodes.
- Cache vector network paths — avoid rebuilding WASM paths every frame.
- Cache ruler and pen overlay paints — eliminate 10 WASM Paint allocations per frame.
- Only enable `preserveDrawingBuffer` in test mode.
- Hoist URL param parsing out of render loop.

## 0.2.1 — 2026-03-01

### Changed

- Panel header with app logo, editable document name, and sidebar toggle.
- ⌘\\ to toggle side panels for distraction-free canvas.
- Panels hidden by default on mobile (< 768px).
- Floating bar with logo, filename, and restore button when panels hidden.
- Always show local user avatar in collab header.
- Touch support for pan and pinch-zoom on iOS.

### Performance

- Stubbed shiki to remove 9MB of unused language grammars (20MB → 11MB bundle).

## 0.2.0 — 2026-03-01

### Added

- Real-time P2P collaboration via Trystero (WebRTC) + Yjs CRDT.
- Peer-to-peer sync — no server relay, zero hosting cost.
- WebRTC signaling via MQTT public brokers.
- STUN (Google, Cloudflare) + TURN (Open Relay) for NAT traversal.
- Awareness protocol: live cursors, selections, presence.
- Figma-style colored cursor arrows with name pills.
- Click peer avatar to follow their viewport, click again to stop.
- Stale cursor cleanup on peer disconnect.
- Local persistence via y-indexeddb — room survives page refresh.
- Share link at `/share/<room-id>` with vue-router.
- Secure room IDs via `crypto.getRandomValues()`.
- Removed Cloudflare Durable Object relay server (`packages/collab/`).

### Changed

- Toast notifications via Reka UI Toast — top-center blue pill for info, red for errors.
- Global error handler (window.error + unhandledrejection) shows errors as toasts.
- Link copied toast on share and copy link actions.
- HsvColorArea extracted as shared component (ColorPicker + FillPicker).
- Scrollable app menu without visible scrollbar.
- Selection broadcasting to remote peers.

## 0.1.0-alpha — 2026-03-01

First public alpha. The editor is functional but not production-ready.

### Added

- Canvas rendering via CanvasKit (Skia WASM) on WebGL surface.
- Rectangle, Ellipse, Line, Polygon, Star drawing tools.
- Pen tool with vector network model (bezier curves, open/closed paths).
- Inline text editing on canvas with phantom textarea for input/IME.
- Rich text formatting: bold, italic, underline per-character via style runs.
- Font picker with system font enumeration (font-kit on desktop, Local Font Access API in browser).
- Auto-layout via Yoga WASM (direction, gap, padding, justify, align, child sizing).
- Components, instances, component sets with live sync and override preservation.
- Variables with collections, modes, color bindings, alias chains.
- Undo/redo for all operations (inverse-command pattern).
- Snap guides with rotation-aware edge/center snapping.
- Canvas rulers with selection range badges.
- Marquee selection, multi-select, resize handles, rotation.
- Group/ungroup, z-order, visibility, lock.
- Sections with title pills and auto-adoption of overlapping nodes.
- Multi-page documents with independent viewport state.
- Hover highlight following node geometry (ellipses, rounded rects, vectors).
- Context menu with clipboard, z-order, grouping, component, and visibility actions.
- Color picker with HSV, gradients (linear, radial, angular, diamond), image fills.
- Properties panel: position, appearance, fill, stroke, effects, typography, layout, export.
- ScrubInput drag-to-change number controls.
- Resizable side panels via reka-ui Splitter.

- .fig file import via Kiwi binary codec (194 definitions, ~390 fields).
- .fig file export with Kiwi encoding, Zstd compression, thumbnail generation.
- Figma clipboard: copy/paste between Pairdraw and Figma.
- Round-trip fidelity for supported node types.

- Built-in AI chat in properties panel (⌘J).
- Direct browser → OpenRouter communication, no backend.
- Model selector: Claude, Gemini, GPT, DeepSeek, Qwen, Kimi, Llama.
- 10 AI tools: create_shape, set_fill, set_stroke, update_node, set_layout, delete_node, select_nodes, get_page_tree, get_selection, rename_node.
- Streaming markdown responses (vue-stream-markdown).
- Tool call timeline with collapsible details.

- JSX export of selected nodes with Tailwind-like shorthand props.
- Syntax highlighting via Prism.js.
- Copy to clipboard.

- `info` — document stats, node types, fonts.
- `tree` — visual node tree.
- `find` — search by name/type.
- `export` — render to PNG/JPG/WEBP at any scale.
- `node` — detailed properties by ID.
- `pages` — list pages with node counts.
- `variables` — list design variables and collections.
- `eval` — run scripts with Figma-compatible plugin API.
- `analyze colors` — color palette usage.
- `analyze typography` — font/size/weight distribution.
- `analyze spacing` — gap/padding values.
- `analyze clusters` — repeated patterns.
- All commands support `--json`.

- Scene graph with flat Map storage and parentIndex tree.
- FigmaAPI with ~65% Figma plugin API compatibility.
- JSX renderer (TreeNode builder functions with shorthand props).
- Kiwi binary codec (encode/decode).
- Vector network blob encoder/decoder.

- Tauri v2 (~5 MB).
- Native menu bar, save/open dialogs.
- System font enumeration via font-kit.
- Zstd compression in Rust.
- macOS and Windows builds via GitHub Actions.

- Runs in the browser.
- No installation required.
- File System Access API for save/open (Chrome/Edge), download fallback elsewhere.

- Docs site — VitePress site with user guide, reference, and development docs.
- Deployed via Cloudflare Pages.
