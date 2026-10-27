/** Authored guidance complements generated API facts; keep behavior claims tied to the source. */
export const authoredGuidance: Record<
  string,
  {
    overview?: string;
    usage?: string[];
    accessibility?: string[];
    intent?: string[];
    context?: string[];
  }
> = {
  Accordion: {
    overview: 'A set of labeled disclosure rows for content that can be explored independently.',
    usage: [
      'Use type="single" for one open section or type="multiple" for independent sections. In single mode, set collapsible when closing every section should be allowed.',
      'Give each item a stable value and a short title. Put explanations and controls in content, not inside the trigger title.',
      'Use nested accordions sparingly; the content inset already establishes the next level of hierarchy.',
    ],
    accessibility: [
      'Base UI supplies trigger buttons, expanded state, content relationships, and arrow-key navigation. Keep the heading and trigger structure intact.',
      'Disabled items remain readable but cannot be opened. Essential instructions should remain outside a disabled disclosure.',
    ],
    intent: [
      'Divided and contained are structural treatments, not success or error states.',
      'Counts describe the section contents; include their meaning in the title when it is not obvious.',
    ],
    context: [
      'Use for filter categories, settings groups, and optional explanations inside a detail view.',
    ],
  },
  Button: {
    overview:
      'A native button for an action, with independent size, intent, emphasis, and loading state.',
    usage: [
      'Use an action verb that predicts the result. Use Link when the primary purpose is navigation to a URL.',
      'The default type is button. Set type="submit" explicitly inside a form when submission is intended.',
      'Drive loading from the operation. It disables activation, sets aria-busy, and preserves the label while showing a spinner.',
    ],
    accessibility: [
      'Native Enter and Space activation are retained. Disabled and loading buttons leave the tab sequence.',
      'Provide an accessible name for icon-only content, or use IconButton, whose label is required.',
    ],
    intent: [
      'Default is neutral, function identifies an application action, destroy identifies a destructive operation, and ai identifies AI assistance.',
      'Primary, secondary, tertiary, and ghost change emphasis independently of intent. Reserve the strongest emphasis for the main action in a group.',
    ],
    context: [
      'Pair a primary save action with a quieter cancel action; explain destructive consequences in the surrounding flow.',
    ],
  },
  IconButton: {
    overview: 'A compact Button with a required accessible label and an optional label tooltip.',
    usage: [
      'Use a familiar icon for a secondary or space-constrained action. Prefer a text button for an unfamiliar or consequential operation.',
      'Write aria-label as the action, such as “Copy project ID”. The tooltip displays the same label by default.',
    ],
    accessibility: [
      'The button retains native keyboard activation, loading, and disabled behavior from Button.',
      'tooltip={false} removes only the tooltip, not the accessible name. This is useful when a menu or popover already manages the trigger.',
    ],
    intent: [
      'Intent and emphasis follow Button; the icon itself must not be the only explanation of a destructive action.',
    ],
    context: [
      'Use in row actions, compact toolbars, and close controls with a destination-specific label.',
    ],
  },
  ButtonGroup: {
    overview: 'A visual and semantic group of related buttons without adding selection behavior.',
    usage: [
      'Provide the required aria-label to explain the relationship between the buttons.',
      'Each child keeps its own click handler and state. Add aria-pressed to toggle buttons, or use SegmentedControl for one mutually exclusive value.',
    ],
    accessibility: [
      'All enabled child buttons remain separate Tab stops; this wrapper does not implement roving focus or arrow-key selection.',
      'Keep visible focus outlines unclipped when placing the group in a toolbar or an overflow container.',
    ],
    context: [
      'Use for related table view controls or a cluster of independent formatting actions.',
    ],
  },
  Link: {
    overview:
      'A native anchor for navigation, with optional icons and explicit external-link behavior.',
    usage: [
      'Supply a real href and link text that describes the destination. Use Button for an action that does not navigate.',
      'external defaults the target to a new tab, adds safe rel values, and displays an external-link icon.',
      'Disabled links remove href and leave the tab sequence. Prefer explaining why a destination is unavailable rather than relying on its appearance.',
    ],
    accessibility: [
      'An enabled link is reached with Tab and activated with Enter. It retains native browser link behavior.',
      'External links include a screen-reader announcement that they open in a new tab; icons supplement the text.',
    ],
    intent: [
      'Function emphasizes navigation; default inherits neutral hierarchy. Underline options control presentation without changing link semantics.',
    ],
    context: [
      'Use in prose, supporting resource links, and PageHeader back navigation to a known URL.',
    ],
  },
  SplitButton: {
    overview: 'A frequent primary action paired with a menu of related alternatives.',
    usage: [
      'Put the most likely action in onAction and less frequent alternatives in actions. Name the menu for those alternatives when “More actions” is ambiguous.',
      'Return the action promise so both segments remain disabled until completion. Rejected actions show an error and allow a retry.',
      'Do not use the menu to hide an unrelated navigation group; all alternatives should relate to the main action.',
    ],
    accessibility: [
      'The primary action and menu trigger are separate buttons. Base UI manages menu arrow navigation and Escape dismissal.',
      'Duplicate activation is guarded while pending, and focus returns to the originating control after completion when the user has not moved elsewhere.',
    ],
    intent: [
      'The main segments share Button intent and emphasis. An individual destructive menu action can use intent="destroy" without recoloring every alternative.',
    ],
    context: ['Use for Export with format alternatives, or Publish with related delivery options.'],
  },
  CopyButton: {
    overview:
      'An explicit clipboard action with a temporary success icon and optional notification.',
    usage: [
      'Pass the exact string to copy and a specific label such as “Copy invoice number”.',
      'Keep the source text selectable. Clipboard access can fail, and the error notification asks the user to copy manually.',
    ],
    accessibility: [
      'The accessible name changes to “Copied” only after clipboard writing succeeds, then returns after two seconds.',
      'Mount NotificationViewport when using notifications, including the clipboard failure feedback path.',
    ],
    context: ['Use beside identifiers, code snippets, URLs, and readonly fields.'],
  },
  Field: {
    overview:
      'A label, helper text, and validation boundary that shares accessible metadata with one compatible control.',
    usage: [
      'Wrap a single logical control. Its generated ID, required state, disabled state, and invalid state flow through useFieldControl.',
      'Provide helpText for format guidance and error for actionable validation. A nonempty error marks the field invalid unless invalid is explicitly overridden.',
      'When supplying an explicit control ID, use the same ID on Field so label activation still reaches the control.',
    ],
    accessibility: [
      'Helper and error IDs are composed with the control’s existing aria-describedby references rather than replacing them.',
      'Errors use role="alert". Keep error messages concise, and avoid repeatedly remounting unchanged messages while typing.',
    ],
    context: ['Use for forms and custom controls that call the exported useFieldControl helper.'],
  },
  TextInput: {
    overview:
      'A single-line native input with optional prefix, suffix, clear control, and Field integration.',
    usage: [
      'Provide label, Field, or an explicit accessible label. A placeholder should illustrate a value rather than replace the label.',
      'Use value with onValueChange for controlled input, or defaultValue for local state. Native onChange is also forwarded.',
      'The clear action emits an ordinary input change, returns focus to the input, and is hidden for disabled or readonly values.',
    ],
    accessibility: [
      'Native input attributes such as type, autoComplete, required, and readOnly are retained.',
      'Pointer activation strengthens the boundary; keyboard navigation adds the keyboard focus treatment. Invalid state remains independently announced.',
    ],
    context: ['Use for names, identifiers, email addresses, and other values that fit one line.'],
  },
  SearchInput: {
    overview:
      'A searchable text field that separates immediate draft changes from debounced search requests.',
    usage: [
      'Use onValueChange for immediate local state and onSearch for work that should wait until typing pauses; the default delay is 250 ms.',
      'Pending timers are canceled when the query changes or the component unmounts. The initial value does not issue an automatic search.',
      'A displayed shortcut is a hint only; the host must implement the shortcut itself.',
    ],
    accessibility: [
      'The control uses a native search input and inherits Field descriptions and validation.',
      'The clear button is named “Clear search” by default and returns focus to the input.',
    ],
    context: [
      'Use above a record list or within a picker, with result counts announced by the surrounding results view.',
    ],
  },
  Textarea: {
    overview:
      'A multiline native text control with optional measured growth and a character count.',
    usage: [
      'Use rows for the initial height and autoGrow with maxRows for a bounded composer. Overflow becomes scrollable after the maximum height.',
      'showCount reports the current text length; maxLength is the native input limit. A count alone does not impose a limit.',
      'Choose concise helper text for expected content, especially when a character limit matters.',
    ],
    accessibility: [
      'Field labels, descriptions, and invalid state are preserved. The character count is included in aria-describedby.',
      'Enter inserts a newline in the standalone component; submission shortcuts belong to a composing pattern such as PromptInput.',
    ],
    context: ['Use for notes, descriptions, and freeform messages that need more than one line.'],
  },
  Checkbox: {
    overview:
      'An independent boolean or mixed selection control with an optional label and description.',
    usage: [
      'Use checked="indeterminate" only to represent a partial selection, such as some children in a group.',
      'Use readOnly when the checked value must remain focusable and inspectable; use disabled when interaction is unavailable.',
      'The sm size is intended for dense facets and tables; it preserves the same state and labeling behavior.',
    ],
    accessibility: [
      'Base UI exposes checked and mixed states and supports Space activation. The visible label is associated with the control.',
      'Description and Field help/error references are combined. Do not repeat the full label as the description.',
    ],
    context: [
      'Use for independent preferences, row selection, and filters that allow several values.',
    ],
  },
  RadioGroup: {
    overview: 'A labeled set of mutually exclusive options with optional per-option descriptions.',
    usage: [
      'Use stable option values and human-readable labels. Include descriptions when choices need comparison before selection.',
      'Choose a radio group when every choice should remain visible; use Select when space is limited or the option list is longer.',
    ],
    accessibility: [
      'Base UI provides arrow-key navigation and selection, with disabled options skipped.',
      'The group and each option have separate labels; option descriptions are associated with their own radio controls.',
    ],
    context: [
      'Use for delivery frequency, workspace access levels, or a small set of configuration choices.',
    ],
  },
  Switch: {
    overview:
      'A binary on/off control for a setting, with a label that remains stable across states.',
    usage: [
      'Name the setting, such as “Email updates”, rather than changing the label between “Enable” and “Disable”.',
      'The component reports checked changes; the host decides whether the change is immediate or part of a later form submission.',
    ],
    accessibility: [
      'Base UI exposes switch semantics and keyboard activation. Visible labels and descriptions are associated with the control.',
      'Use the description to explain the consequence of enabling the setting, and Field for related validation.',
    ],
    context: [
      'Use for workspace preferences and optional capabilities, not selecting rows in a collection.',
    ],
  },
  Select: {
    overview:
      'A single-value picker with grouped options, optional icons, descriptions, and native form integration.',
    usage: [
      'Every option needs a stable nonempty value. Keep labels distinct so typeahead can identify the intended option.',
      'The selected label stays on one line and truncates inside narrow triggers; its full text remains in the title and option menu.',
      'Use descriptions for additional context in the menu. Use MultiCombobox when more than one value is allowed.',
    ],
    accessibility: [
      'Base UI supplies arrow navigation, typeahead, selection, and focus return. The trigger inherits Field labeling and error descriptions.',
      'An empty option set renders a disabled “No options available” option instead of an actionable placeholder.',
    ],
    context: ['Use for status, owner, source, or a finite setting in a compact form.'],
  },
  MultiCombobox: {
    overview:
      'A searchable multiple-choice picker with removable chips and explicit selection controls.',
    usage: [
      'Supply stable values and optional keywords for local search. Set filterOptions={false} when the host supplies remote results.',
      'Select all applies to enabled search matches and preserves other selections; Clear removes the selection.',
      'maxVisible limits visible chips, not selected values. Hidden choices are named in the overflow summary.',
    ],
    accessibility: [
      'Arrow keys move the active option, Home and End reach the ends, and Enter toggles selection while focus stays in the search field.',
      'Removing a chip moves focus to a remaining removal control or the trigger, avoiding a lost keyboard position.',
      'Use loading for an actual pending result request; selection actions are disabled while results are loading.',
    ],
    context: [
      'Use for multiple owners, labels, sources, or project scopes that benefit from searching.',
    ],
  },
  TreeView: {
    overview:
      'A hierarchical multi-selection tree whose branch check states are derived from selectable leaves.',
    usage: [
      'Store selected leaf IDs, not branch IDs. Checking a branch updates its selectable descendants and derives mixed parent states.',
      'Keep expandedIds and selectedIds separate. Expanding a branch reveals content without changing selection.',
      'Disabled branches and leaves are excluded from selection changes; counts and descriptions should describe the underlying hierarchy.',
    ],
    accessibility: [
      'Arrow Up/Down, Home/End, and typeahead move roving focus. Right opens a branch or enters it; Left closes it or moves to its parent.',
      'Space or Enter toggles selection. Levels, positions, expanded state, and mixed checked state are exposed through tree semantics.',
    ],
    context: [
      'Use for nested project scope, folders, and organizational selections where parent-child relationships matter.',
    ],
  },
  Slider: {
    overview: 'One or more keyboard-operable thumbs for a numeric value or bounded range.',
    usage: [
      'Pass one value for a single slider or several values for multiple thumbs. Define min, max, and step in the same unit.',
      'Use formatValue to expose units or percentages; it formats both the displayed values and each thumb’s aria-valuetext.',
      'Provide thumbLabels when generic Minimum and Maximum do not explain the range.',
    ],
    accessibility: [
      'Base UI provides arrow, Home, End, and larger-step keyboard adjustments. Each thumb has its own name and value.',
      'Field help and validation are associated with the thumbs, not only the visual track.',
    ],
    context: [
      'Use for approximate thresholds or ranges; provide a numeric input when exact entry is the primary task.',
    ],
  },
  SegmentedControl: {
    overview: 'A compact, mutually exclusive choice implemented with native radio inputs.',
    usage: [
      'Keep option labels short and use this for a small set of peer choices such as Day, Week, and Month.',
      'Supply value with onValueChange for controlled state. Otherwise defaultValue or the first enabled option supplies the initial selection.',
    ],
    accessibility: [
      'The required group label becomes a fieldset legend. Native radio behavior provides arrow-key selection and one group Tab stop.',
      'Disabled options remain visible but cannot be selected. Use ButtonGroup for independent actions rather than exclusive values.',
    ],
    context: [
      'Use for a chart scale or a local display setting; use Tabs when each choice represents a distinct content panel.',
    ],
  },
  DatePicker: {
    overview: 'A single-date calendar inside a focus-managed popover.',
    usage: [
      'Use disabledDates to express unavailable dates and timeZone when the date belongs to a particular calendar zone.',
      'Selection commits immediately and closes the popover. Supplying value, even as undefined, makes selection controlled.',
    ],
    accessibility: [
      'React DayPicker supplies calendar keyboard navigation and focuses the calendar on opening.',
      'The trigger supports Field label, description, required, and invalid metadata; its label also includes the selected date.',
    ],
    context: [
      'Use for a due date or a single calendar date; use TimeRangePicker for relative periods or timestamp intervals.',
    ],
  },
  TimeRangePicker: {
    overview:
      'A period selector that commits a relative preset or a validated absolute UTC interval.',
    usage: [
      'Relative presets commit immediately. Custom dates and times remain a draft until Apply range is pressed.',
      'Pass now for reproducible historical views and tests. The selected range should drive the host’s data query or filter.',
      'The custom editor uses UTC and requires an end after the start. Do not relabel it as local time without converting the data.',
    ],
    accessibility: [
      'The trigger inherits Field metadata, while calendar dates and time inputs retain their own names.',
      'An invalid draft explains the required correction and disables Apply; it does not silently replace the committed range.',
    ],
    context: [
      'Use beside a chart or record search when the displayed results are bounded by a time interval.',
    ],
  },
  CopyableField: {
    overview: 'A readonly, selectable value paired with a clearly labeled copy action.',
    usage: [
      'Use for values the user should retrieve rather than edit, such as an integration URL or record identifier.',
      'Choose multiline for long values and provide description when the destination or format needs explanation.',
    ],
    accessibility: [
      'The value remains a labeled native readonly input or textarea, so keyboard selection and manual copying still work.',
      'The copy button is a separate action; do not hide the value when clipboard permissions are unavailable.',
    ],
    context: [
      'Use in integration settings, generated credentials displays with appropriate masking supplied by the host, and detail panels.',
    ],
  },
  FileUpload: {
    overview:
      'A file-selection and upload list with validation, progress, cancellation, and retry.',
    usage: [
      'Configure accept, maxSizeBytes, and maxFiles for the actual endpoint. Selection validates file type, size, duplicates, and count.',
      'Without onUpload, files are selected locally and remain ready. Provide onUpload to perform transfer and honor its AbortSignal.',
      'Report real progress through onProgress. Removing a file or unmounting aborts its pending transfer.',
    ],
    accessibility: [
      'A native file input and a keyboard-operable choose button provide an alternative to drag and drop.',
      'Upload status and progress are announced; failed uploads can be retried, and removal returns focus to the choose control.',
    ],
    context: [
      'Use for attachments and imports. The host still owns server validation, storage, and completion policy.',
    ],
  },
  Card: {
    overview:
      'A composable section surface with header, title, description, content, and footer slots.',
    usage: [
      'Use the named slots to keep spacing consistent instead of applying unrelated padding to each child.',
      'CardTitle renders h3. Choose an appropriate native heading in the header when the surrounding page needs a different level.',
    ],
    accessibility: [
      'Card is a section, not a button. Place explicit links or buttons inside it for actions.',
      'Associate the section with its heading using aria-labelledby when it needs a named landmark.',
    ],
    intent: [
      'Flat, raised, and floating express surface hierarchy. Their resolved appearance comes from the current theme and does not imply status.',
    ],
    context: ['Use for a related metric, summary, form section, or bounded collection.'],
  },
  DescriptionList: {
    overview: 'A semantic set of labels and values for inspecting record or configuration details.',
    usage: [
      'Use stable item IDs and concise labels; place complex values such as tags or links in value.',
      'Choose stacked or horizontal alignment and one to three columns according to available width.',
      'Missing strings, null, and undefined use emptyValue. Numeric zero and false remain meaningful values.',
    ],
    accessibility: [
      'Native dl, dt, and dd elements preserve the label-to-value relationship without inventing table semantics.',
      'Ensure interactive values have their own accessible names; the label is descriptive content rather than a form label.',
    ],
    context: ['Use for account details, invoice metadata, and settings summaries.'],
  },
  List: {
    overview:
      'A native list with one-line or two-line rows, optional selection controls, identity, tags, counters, and nested groups.',
    usage: [
      'Use title for the primary line and subtitle for supporting text. The description alias remains supported; subtitle takes precedence when both are supplied. Use DataGrid when rows need comparable columns.',
      'Pass checkbox props for an independent controlled or uncontrolled Checkbox. Set selectable and selected for a separate pressed row button, or onSelect for a plain row action. The host decides whether these states should be linked.',
      'Compose Avatar and Tag components through avatar and tags. Actions, tags, checkboxes, and the counter remain outside the primary button. Use counterLabel to describe what the end counter represents.',
      'Place a child List inside its parent ListItem. Up to four visual levels are supported; nested lists inherit density unless explicitly overridden. This is a nested list, not a collapsible tree.',
      'Titles and subtitles stay on separate lines. Narrow containers move supplementary tags, metadata, and actions beneath the copy while the checkbox and counter remain aligned with the title.',
    ],
    accessibility: [
      'The title names the row button and its default checkbox; the subtitle is their accessible description. Supply an explicit checkbox aria-label or aria-labelledby when it needs a different name.',
      'Checkboxes use native form semantics and support mixed, read-only, and disabled states. Space changes a focused checkbox; Enter or Space activates a row button. Each interactive tag or action has its own tab stop.',
      'Nested ul and li elements preserve parent-child relationships. No tree roles or arrow-key behavior are implied. Static rows remain list content, and selectable rows expose aria-pressed.',
      'Row disabled disables its primary button and checkbox. Supply disabled to any custom tags or actions that should also be unavailable.',
    ],
    context: [
      'Use for member directories, project and task hierarchies, compact work queues, and search results that do not require column sorting.',
    ],
  },
  Separator: {
    overview:
      'A horizontal or vertical divider for a meaningful boundary between adjacent content.',
    usage: [
      'Use spacing first; add a separator when the boundary would otherwise be hard to recognize.',
      'Set the orientation to match the layout and provide sufficient height for a vertical divider.',
    ],
    accessibility: [
      'Decorative separators are omitted from the accessibility tree.',
      'Use a semantic separator only when the boundary conveys a content division, not for every visual gap.',
    ],
    context: ['Use between menu groups, toolbar clusters, or distinct content sections.'],
  },
  ExpandableText: {
    overview:
      'A plain-text preview that exposes a disclosure control only when its line limit is exceeded.',
    usage: [
      'Set collapsedLines for the initial preview. Measurements update when text, width, or fonts change.',
      'Children must be plain text so clamping cannot hide focusable links or buttons. Use Accordion for rich content.',
    ],
    accessibility: [
      'The toggle exposes aria-expanded and aria-controls and supports normal button keyboard activation.',
      'Clamping is visual: the text remains available to assistive technology. If the toggle disappears after resizing, focus is preserved in the text region.',
    ],
    context: [
      'Use for long notes, descriptions, and summaries with an optional extended reading view.',
    ],
  },
  Avatar: {
    overview: 'A person or entity image with initials fallback and optional presence status.',
    usage: [
      'Always supply name. Initials are derived from the first and last name parts unless provided explicitly.',
      'A failed image falls back to initials. Presence is an independent online, away, busy, or offline value supplied by the host.',
    ],
    accessibility: [
      'The wrapper exposes an image label containing the name and presence; the nested image has empty alt text to avoid duplicate announcements.',
      'AvatarGroup names the group and includes hidden members’ names in its overflow label and title.',
    ],
    context: ['Use for owners and team members beside a name or in an assigned-members group.'],
  },
  Breadcrumb: {
    overview: 'A navigation trail ending in a noninteractive current-page label.',
    usage: [
      'Order items from the broadest destination to the current page. The last item is always displayed as current, even if an href was provided.',
      'Use href for addressable destinations and onClick for application-managed navigation.',
    ],
    accessibility: [
      'The trail is a named navigation landmark with an ordered list and aria-current="page" on the last item.',
      'Separators are decorative. Give multiple breadcrumb landmarks distinct aria-label values if a page genuinely needs more than one.',
    ],
    context: [
      'Use for hierarchy, and use PageHeader back navigation when returning to a list is the clearer relationship.',
    ],
  },
  Pagination: {
    overview: 'Controlled navigation through result pages, with an optional page-size selector.',
    usage: [
      'page is one-based. Supply the total result count and current pageSize; the host retrieves or slices the actual records.',
      'Changing page size calls onPageSizeChange and requests page 1. Keep the two controlled values synchronized.',
    ],
    accessibility: [
      'The result summary is a polite live region, page buttons have explicit names, and the current page uses aria-current.',
      'Previous and Next are disabled at the ends and when there are no results. Ellipses are decorative rather than focusable controls.',
    ],
    context: [
      'Use with server-backed or locally paged collections; it does not implement infinite scrolling.',
    ],
  },
  Tabs: {
    overview: 'A labeled set of peer views using Base UI tabs and associated content panels.',
    usage: [
      'Use stable values and concise labels. The first enabled item is selected by default unless value or defaultValue is supplied.',
      'Use sharedContent for one persistent workspace whose data changes by tab; this preserves its local state instead of remounting separate panels.',
      'Item counts describe items, with values above 99 visually shortened to 99+.',
    ],
    accessibility: [
      'Base UI provides tablist, tab, and tabpanel relationships and arrow-key navigation. Give the tablist a label that explains the views.',
      'Disabled tabs are skipped. Do not use disabled tabs to conceal essential information about a blocked task.',
    ],
    intent: [
      'Line and pill are presentation choices. Selected state identifies the active view, not success or approval.',
    ],
    context: [
      'Use for adjacent views of the same subject; use navigation links for unrelated destinations.',
    ],
  },
  SideNav: {
    overview:
      'A collapsible application navigation rail with groups, counts, search, workspace content, and a footer.',
    usage: [
      'Supply activeId and onNavigate; the component does not manage application routes.',
      'Expanded groups reveal nested destinations. Collapsed groups use menus, while leaf items retain accessible names and tooltips.',
      'The search shortcut shown in the rail is only a hint; wire onSearch and register the actual shortcut in the host.',
    ],
    accessibility: [
      'The active destination exposes aria-current="page"; group controls expose expanded state and the content relationship.',
      'Custom workspaceContent is hidden and inert while collapsed, so its hidden controls cannot receive focus.',
    ],
    context: [
      'Use as persistent application navigation, with responsive collapse controlled by the application shell when necessary.',
    ],
  },
  CommandPalette: {
    overview:
      'A searchable modal command list with grouped actions and optional global shortcut registration.',
    usage: [
      'Supply explicit actions with labels, keywords, and callbacks. Searching does not invent an operation or issue a network query.',
      'Disable shortcut registration when embedding a palette where the host already owns the global shortcut.',
    ],
    accessibility: [
      'The dialog focuses its command input; Base UI provides active-item navigation and Enter selection.',
      'Escape closes the palette. Focus returns to the opener unless the action deliberately moved focus elsewhere.',
    ],
    context: [
      'Use for application navigation and frequent actions that also remain discoverable through visible controls.',
    ],
  },
  DropdownMenu: {
    overview:
      'A compact menu of actions, checkbox choices, radio choices, groups, and nested menus.',
    usage: [
      'Use action items for commands, checkbox items for independent toggles, and radio groups for one mutually exclusive value.',
      'Checkbox choices keep the menu open for repeated changes. Radio selection and ordinary commands follow menu dismissal behavior.',
      'Leading icons describe actions; selected checkbox and radio indicators appear at the trailing edge.',
    ],
    accessibility: [
      'Base UI supplies menu roles, arrow navigation, typeahead, and Escape dismissal. The trigger must be one focusable React element.',
      'Tab closes the menu and continues from its trigger rather than trapping focus inside the menu.',
    ],
    intent: [
      'Only destructive action items receive destroy intent; checkbox state should communicate selection rather than danger.',
    ],
    context: [
      'Use for row actions and table column controls; use Select for a form value that needs a persistent selected label.',
    ],
  },
  ContextMenu: {
    overview:
      'A menu attached to a content region, opened through a context gesture or keyboard command.',
    usage: [
      'Offer contextual actions that apply to the wrapped content, and keep critical actions available elsewhere in the interface.',
      'The same entry model supports commands, checkbox and radio choices, groups, and submenus.',
    ],
    accessibility: [
      'The trigger region is focusable and supports the Context Menu key and Shift+F10 in addition to pointer context activation.',
      'Keyboard menu navigation is provided by Base UI; Tab closes the menu and restores a predictable focus origin.',
    ],
    context: [
      'Use on a record, canvas item, or file preview as a shortcut to an existing action set.',
    ],
  },
  Tooltip: {
    overview:
      'Brief supplementary information associated with a hoverable and keyboard-focusable trigger.',
    usage: [
      'Keep content short and noninteractive. Use Popover when the content includes controls, links, or a longer explanation.',
      'RichTooltip adds a title, description, and optional shortcut without changing the underlying tooltip behavior.',
    ],
    accessibility: [
      'The asChild trigger must support focus and forwarded trigger props. Plain text needs an appropriate focusable wrapper when keyboard access is necessary.',
      'Do not use the tooltip as the only accessible label or the only place to present essential validation.',
    ],
    intent: ['Default and inverted change contrast treatment, not message priority.'],
    context: [
      'Use for abbreviated controls, absolute timestamps, and short clarification of an existing label.',
    ],
  },
  Popover: {
    overview:
      'Anchored interactive content with optional header and footer outside the scrollable body.',
    usage: [
      'Use regular or tight density for the available space. Headers and footers have no divider lines.',
      'showHeader={false} hides the visual title while preserving its accessible label. Supply label when no title is provided.',
      'Use footer for actions that must remain visible while the body scrolls.',
    ],
    accessibility: [
      'The popover focuses an available control on opening, with its scrollable body as a fallback.',
      'Escape and close controls dismiss it, and Base UI manages focus return. PopoverClose must be used inside its corresponding Popover.',
    ],
    context: [
      'Use for compact filters, calendar controls, and contextual configuration that benefits from staying anchored to its trigger.',
    ],
  },
  Modal: {
    overview:
      'A blocking dialog for a focused task, with a required title and independently scrollable content.',
    usage: [
      'Choose small, regular, or large based on the task; widths are clamped to the viewport.',
      'Header and footer remain outside the scrolling body and have divider lines. Hide the visual header only when the body already supplies equivalent context.',
      'Use ConfirmDialog for an explicit confirm/cancel decision, with optional exact confirmationText and guarded asynchronous confirmation.',
    ],
    accessibility: [
      'The modal isolates the background and traps focus. Its title remains available to assistive technology when showHeader is false.',
      'Closing restores focus to the opener unless the completed action has deliberately focused another page or dialog.',
      'ConfirmDialog uses alertdialog semantics, keeps errors visible, and prevents dismissal while confirmation is pending.',
    ],
    context: [
      'Use for editing a bounded record or confirming a consequential action; use a nonmodal sheet for ongoing work beside a list.',
    ],
  },
  SideSheet: {
    overview: 'A right-side detail panel that can be modal or docked beside the workspace.',
    usage: [
      'Use docked for parallel work in the application layout and the default overlay mode for a modal detail task.',
      'Use headerActions and footer for persistent controls. position and total are one-based navigation context for onPrevious and onNext.',
      'Enable resizable for adjustable desktop width and set bounds that leave the workspace usable.',
    ],
    accessibility: [
      'Overlay mode uses dialog focus isolation; docked mode remains nonmodal. Both keep title and body relationships explicit.',
      'The resize separator exposes width and supports keyboard adjustment. Previous and Next controls have record-specific navigation labels.',
    ],
    context: [
      'Use for inspecting and editing one record while retaining its surrounding list context.',
    ],
  },
  Sheet: {
    overview: 'A nonmodal, resizable panel that pushes content within its own bounded workspace.',
    usage: [
      'Pass the main workspace as content and panel content as children. Choose bottom, left, or right placement.',
      'size is thickness in pixels: height for bottom placement and width for side placement. contentMinSize reserves usable space for the main area.',
      'Supply restoreFocusRef when the intended return target is more stable than the control that opened the sheet.',
    ],
    accessibility: [
      'The resize separator exposes its axis, minimum, maximum, and current size and supports keyboard resizing.',
      'The sheet does not trap focus or make the workspace inert. Escape closes it when a nested control has not handled the event.',
    ],
    context: [
      'Use for activity, properties, and supporting details that remain part of the current workspace rather than a viewport overlay.',
    ],
  },
  BottomSheet: {
    overview: 'A bottom-only nonmodal panel for an existing bounded flex-column workspace.',
    usage: [
      'Place it as a sibling of the main flex content, within the available workspace between persistent rails.',
      'Set workspaceMinHeight to preserve usable space above it. Requested height is clamped to the parent and min/max limits.',
      'Use the more general Sheet component when the same feature must support left or right placement.',
    ],
    accessibility: [
      'Arrow Up/Down resize by 20 px, Shift increases the step to 40 px, and Home/End reach the bounds.',
      'Escape closes the panel. Closing while focus is inside restores the opener when it remains available.',
    ],
    context: [
      'Use for an event log, output console, or secondary activity view below the main workspace.',
    ],
  },
  ResizablePanels: {
    overview:
      'Composable split panes backed by react-resizable-panels, with labeled resize handles.',
    usage: [
      'Compose ResizablePanel and ResizeHandle inside ResizablePanels. Set bounds and default sizes through the underlying public panel API.',
      'Give each handle a specific label identifying the area it resizes, rather than repeating “Resize” for every divider.',
    ],
    accessibility: [
      'Arrow keys resize the separator; Enter toggles the preceding panel when that panel is collapsible.',
      'A panel whose size reaches zero is marked inert and aria-hidden so hidden controls cannot remain in the focus order.',
    ],
    context: [
      'Use for split editors, list/detail workspaces, and horizontally or vertically arranged inspectable panes.',
    ],
  },
  ScrollArea: {
    overview:
      'A named, keyboard-focusable native scrolling region with a configurable maximum height.',
    usage: [
      'Choose a descriptive label and a maximum height that makes surrounding controls visible.',
      'Use a single obvious scroll region for related content; avoid nesting several small scroll areas without a clear purpose.',
    ],
    accessibility: [
      'The region has tabIndex=0 so keyboard users can scroll content even when it contains no interactive controls.',
      'Keep the region name distinct from its neighboring content and preserve the visible keyboard focus boundary.',
    ],
    context: ['Use for logs, long lists, code-adjacent content, and bounded panels.'],
  },
  EmptyState: {
    overview:
      'A named explanation of no results, no data, or a loading failure, with optional recovery actions.',
    usage: [
      'Choose the preset that matches the cause. No results should suggest adjusting a query; no data should explain how content begins.',
      'Override title and description with the actual subject and offer a working action when recovery is possible.',
    ],
    accessibility: [
      'The section is associated with its heading and description; decorative illustrations are hidden from assistive technology.',
      'The preset itself is not a live announcement. The host should announce changes when an asynchronous result replaces existing content.',
    ],
    context: [
      'Use inside collections and panels; compact is intended for small containers rather than full pages.',
    ],
  },
  Notification: {
    overview:
      'One notification presentation for inline messages and floating lifecycle-managed feedback.',
    usage: [
      'Use inline beside the affected content. For transient feedback, mount NotificationViewport and call showNotification.',
      'Replace a loading notification by reusing its ID, or dismiss it explicitly; loading notifications do not expire.',
      'A built-in action in showNotification dismisses the toast after its callback. Custom actions own their own behavior.',
    ],
    accessibility: [
      'Inline destroy messages default to alert, other inline messages to note, and static floating or loading messages to status.',
      'Lifecycle notifications use a presentation role internally because Sonner owns the announcement, avoiding nested live regions.',
    ],
    intent: [
      'Info, success, warning, destroy, ai, and loading describe the message purpose. Inline treatment keeps a transparent surface with a semantic boundary.',
    ],
    context: [
      'Use inline for persistent guidance or failures, and floating for confirmation after a completed action.',
    ],
  },
  ProgressBar: {
    overview: 'Determinate or indeterminate progress with a required accessible task label.',
    usage: [
      'Supply value and max only when actual progress is known. Omit value for an indeterminate operation.',
      'showValue adds the visible label and percentage; it does not change the underlying progress value.',
    ],
    accessibility: [
      'The progressbar exposes its name, range, and current value. Indeterminate progress omits aria-valuenow.',
      'Keep the label stable while progress changes, and announce completion in the surrounding flow when the bar disappears.',
    ],
    intent: [
      'Use success for confirmed completion or a favorable outcome, not merely because an operation has started.',
    ],
    context: ['Use for file transfers, imports, and checklist completion with measured progress.'],
  },
  Spinner: {
    overview: 'A small activity indicator that can be either decorative or a named loading status.',
    usage: [
      'Supply label when the spinner is the only explanation of pending work.',
      'Omit label when the containing button or status already describes loading, avoiding duplicate announcements.',
    ],
    accessibility: [
      'A labeled spinner has role="status"; an unlabeled spinner is aria-hidden.',
      'A spinner does not communicate completion percentage. Use ProgressBar when a measured value is available.',
    ],
    context: [
      'Use inside compact controls and small loading regions, with descriptive text for longer waits.',
    ],
  },
  Skeleton: {
    overview: 'A decorative placeholder that reserves the approximate shape of pending content.',
    usage: [
      'Match text, block, avatar, or table-row shapes to the expected content rather than using one large placeholder for every layout.',
      'Use width, height, and table-row columns to reduce movement when the real content arrives.',
    ],
    accessibility: [
      'Skeletons are aria-hidden. Put a single loading status or aria-busy on the containing content region.',
      'Use animate={false} when a static placeholder is appropriate; do not make each decorative cell a separate announcement.',
    ],
    context: ['Use for predictable pending content, not for an empty result or an error state.'],
  },
  Tag: {
    overview:
      'A compact label with distinct static, removable, interactive, counter, and status behaviors.',
    usage: [
      'Use static for metadata, removable for an applied value, interactive for a pressed toggle, and counter when a label has an attached count.',
      'Use status for a pill with a colored dot; dotColor can specify a semantic status color independently of action intent.',
      'Give each removable tag a specific removeLabel, especially in a group of applied filters.',
    ],
    accessibility: [
      'Interactive tags are buttons with aria-pressed. Removable tags contain a separately named removal button supporting Delete and Backspace.',
      'The host owns focus after removing a tag; move to a nearby remaining tag or the control that adds tags.',
    ],
    intent: [
      'Keep the visible text meaningful without the dot color. Use intent to reinforce meaning already present in the label.',
    ],
    context: [
      'Use for labels, active filters, and lightweight custom statuses; use StatusBadge for the standard record lifecycle.',
    ],
  },
  SeverityBadge: {
    overview: 'A severity label using the shared critical, high, medium, low, and info scale.',
    usage: [
      'Use the labeled form when severity is new or important information. The compact form is only a dot with an accessible name and title.',
      'Severity describes priority or impact, not record workflow state. Pair with StatusBadge when both dimensions matter.',
    ],
    accessibility: [
      'The standard form exposes visible text. Compact form has image semantics and a label such as “High severity”.',
      'Do not remove nearby context when using compact badges in dense tables; color should not be the sole understandable signal.',
    ],
    intent: ['The severity palette is independent of action intent and AI provenance.'],
    context: [
      'Use for prioritized issues, operational records, and severity-based chart or filter legends.',
    ],
  },
  StatusBadge: {
    overview:
      'A textual lifecycle status for new, in-review, in-progress, completed, or cancelled records.',
    usage: [
      'Supply the actual RecordStatus value rather than using a status merely to obtain its color.',
      'Use Tag variant="status" for a different lifecycle vocabulary instead of relabeling a mismatched standard status.',
    ],
    accessibility: [
      'The text names the lifecycle state, while the dot is supplementary.',
      'Status changes are data updates; announce important asynchronous transitions in the host rather than making every badge a live region.',
    ],
    intent: [
      'In review uses the dedicated review-status color, not AI intent; completion and cancellation are distinct lifecycle outcomes.',
    ],
    context: ['Use in record lists, details, activity summaries, and status filters.'],
  },
  CountBadge: {
    overview:
      'A compact count that can visually cap large values while preserving their full meaning.',
    usage: [
      'Use size="sm" for icon-button counters and dense rows; the default size suits labels and summaries.',
      'Set max for the visual cap, such as 99+. The full numeric value remains in the title.',
      'Provide label when the count is not self-explanatory; the accessible text includes the full count and that noun.',
    ],
    accessibility: [
      'When label is supplied, the shortened visible number is hidden from assistive technology and a complete text equivalent is included.',
      'The badge is not an action and is not a live region. Put it inside a named control when it belongs to navigation.',
    ],
    intent: ['Default and inverted choose contrast treatment rather than severity.'],
    context: ['Use for navigation totals, unread notifications, and compact item summaries.'],
  },
  Kbd: {
    overview: 'A visual keyboard-key label with native kbd semantics.',
    usage: [
      'Display only shortcuts that are implemented by the surrounding application.',
      'Use concise key names and show the correct modifier for the supported platform.',
    ],
    accessibility: [
      'Kbd does not register a shortcut or receive focus by itself.',
      'Pair shortcut hints with a visible action name so the command remains understandable without recognizing a symbol.',
    ],
    context: ['Use in menus, search triggers, and keyboard instructions.'],
  },
  RelativeTime: {
    overview:
      'A relative timestamp with an absolute date and timezone available on focus and hover.',
    usage: [
      'Pass now for historical or deterministic views. Otherwise the clock updates at updateInterval, with a one-second minimum.',
      'The default timezone is UTC and locale is en-GB; set them deliberately for the audience.',
    ],
    accessibility: [
      'A native time element carries the ISO datetime, and its accessible label includes both relative and absolute time.',
      'The default Tab stop exposes the absolute-time tooltip to keyboard users. Invalid dates render “Unavailable”.',
    ],
    context: [
      'Use for activity timestamps and recent updates; use a fixed formatted date when precision is the primary comparison.',
    ],
  },
  Timeline: {
    overview:
      'An ordered activity list with timestamps, event types, optional actors, and actions.',
    usage: [
      'Supply items in the intended chronological order; Timeline does not sort the array.',
      'Use workflow, assignment, status, note, ai, or event to choose the marker, and keep the title specific about what happened.',
    ],
    accessibility: [
      'The ordered list has a configurable label and timestamps expose absolute time through RelativeTime.',
      'AI entries include an explicit “AI generated” label rather than relying on their marker color.',
    ],
    context: [
      'Use for project history, account activity, and audit-style record details with real actor and time data.',
    ],
  },
  Stepper: {
    overview: 'An ordered progress indicator that can allow return navigation to completed steps.',
    usage: [
      'currentStep is zero-based. Without explicit states, earlier steps are complete, the current step is current, and later steps are upcoming.',
      'Without onStepChange it is informational. With the callback, only the current and completed steps are visitable.',
    ],
    accessibility: [
      'The current item exposes aria-current="step". Buttons announce their step number, title, and state.',
      'Orientation determines arrow navigation; Home and End move among visitable steps. Future steps remain disabled.',
    ],
    context: [
      'Use inside Wizard or another process where the host owns validation and step transitions.',
    ],
  },
  PageHeader: {
    overview:
      'A consistent page title hierarchy with optional back navigation, breadcrumbs, metadata, actions, and secondary content.',
    usage: [
      'Choose headingLevel to fit the page outline. Keep the title short and put identifiers or status in metadata.',
      'Back navigation takes precedence over breadcrumbs. Supply href for a real destination or onClick for application-managed return behavior.',
      'Use children below the title row for tabs or filters, and actions for the page’s principal controls.',
    ],
    accessibility: [
      'The header retains a real heading and native links or buttons. Give icon-only actions their own labels.',
      'Long titles and actions wrap at narrow widths rather than forcing horizontal overflow.',
    ],
    context: [
      'Use for list pages, record details, and settings pages while keeping page navigation distinct from local controls.',
    ],
  },
  UnsavedChangesBar: {
    overview: 'An inline save/discard boundary for host-owned edited data.',
    usage: [
      'Set dirty from a real comparison with saved data. Successful saving does not clear dirty automatically; update the host’s saved state.',
      'Return a promise from onSave to keep actions disabled during persistence and show rejection errors for retry.',
      'The host owns navigation guards. This bar does not intercept routes or browser departure.',
    ],
    accessibility: [
      'Saving and unsaved text use a status announcement, while failure text uses an alert.',
      'Keep a stable focus target in the form when clearing dirty removes the bar after save or discard.',
    ],
    context: ['Use in settings and editors where changes remain local until explicitly saved.'],
  },
  Wizard: {
    overview:
      'A controlled multistep process with validation, guarded completion, and optional unsaved-change confirmation.',
    usage: [
      'Own currentStep and form data in the host. Each step can validate synchronously or asynchronously, returning false or a message to block advancement.',
      'Return the completion promise from onFinish. Pending validation or completion disables the step controls and prevents duplicate advancement.',
      'dirty enables cancellation confirmation and a browser-departure warning. Application route guards outside the wizard remain the host’s responsibility.',
    ],
    accessibility: [
      'Changing the active step focuses its heading, while Stepper allows return to completed steps.',
      'Validation errors appear on the relevant step and remain readable before retry. Future steps cannot be skipped through the progress control.',
    ],
    context: [
      'Use for project setup, guided imports, and configuration flows with meaningful validation boundaries.',
    ],
  },
  NotificationCenter: {
    overview:
      'A right-side notification panel with search, all/unread views, read state, and optional item actions.',
    usage: [
      'The host owns items and persists onReadChange and onDismiss updates. The component does not mark items read merely because the inbox opens.',
      'Opening an item calls onOpenItem and then marks it read when onReadChange is available. Mark all read applies to all unread items, not only search matches.',
      'Return promises from callbacks so pending actions are guarded and failures remain visible.',
    ],
    accessibility: [
      'The trigger includes the unread count. The titled side panel traps focus while open, closes with Escape, and restores focus to its trigger. Tabs names the All and Unread views.',
      'When an action removes the focused item from the view, focus returns to search; outcomes are announced in a status region.',
    ],
    context: [
      'Use as a persistent application inbox; use Notification for transient feedback about a single operation.',
    ],
  },
  OnboardingChecklist: {
    overview:
      'A host-controlled setup checklist with measurable progress and optional actions per step.',
    usage: [
      'Update each item’s completed state from actual application results. Running onAction does not automatically mark the step complete.',
      'Optional is descriptive text; optional items still count toward the displayed completion total. Adjust the supplied list if they should be excluded.',
      'Without onCompletedChange, checkboxes are readonly while step actions can remain available.',
    ],
    accessibility: [
      'The section has a heading, numbered step context, associated descriptions, and a labeled progress bar.',
      'Collapse hides the step controls; guarded asynchronous actions disable other changes and report success or failure.',
    ],
    context: [
      'Use for workspace setup, team onboarding, and staged adoption tasks that remain available outside a blocking wizard.',
    ],
  },
  DataGrid: {
    overview:
      'A typed record grid with sorting, selection, column controls, expansion, grouping, pagination, and virtualization.',
    usage: [
      'Use stable row IDs and column IDs. Reconcile controlled selectedRowIds when filtering changes which records the application should act on.',
      'A custom renderToolbar must render api.selectionActions when present so selection actions replace the normal toolbar rather than disappearing.',
      'Sorting, pagination, and selection are distinct state. The trailing Actions column stays compact while a visible data column can fill spare width.',
    ],
    accessibility: [
      'Arrow Up/Down moves row focus, Space selects, Enter invokes onRowClick, and Left/Right controls row expansion.',
      'Header buttons cycle sorting; Shift adds a sort priority. Sorted headers expose direction and priority, including multi-sort.',
      'Header menus provide keyboard pinning, hiding, and reordering; resize separators support arrow-key adjustment as an alternative to dragging.',
    ],
    context: [
      'Use for records that need comparison across columns. Use List when row hierarchy is more important than column operations.',
      'The automatic first-data-column pin releases below a 600 px measured grid width; explicit user pin choices remain authoritative.',
    ],
  },
  BulkActionsBar: {
    overview:
      'Controlled batch actions for the current selected record set, with asynchronous operation feedback.',
    usage: [
      'Pass the real selected count and callbacks that operate on the same selection. A zero count renders no bar.',
      'Provide owners for assignment and return promises from mutation callbacks to enable pending guards and visible failures.',
      'Place the bar in the grid toolbar selection slot rather than duplicating it elsewhere in the layout.',
    ],
    accessibility: [
      'Actions are labeled controls; the selection count explains their scope.',
      'Escape clears selection, and pending operations prevent duplicate activation. Restore a useful toolbar focus target after clearing.',
    ],
    context: [
      'Use for owner and lifecycle updates across selected records; do not offer operations the host cannot apply consistently.',
    ],
  },
  EntityCell: {
    overview:
      'A compact user, project, or account identity with a primary name and optional supporting detail.',
    usage: [
      'Choose the entity type that matches the record. Users receive Avatar; projects and accounts receive their respective decorative icons.',
      'Use detail for a short disambiguating value rather than repeating the name. The optional avatar slot can replace the leading identity.',
    ],
    accessibility: [
      'This cell is descriptive content, not a navigation control. Add navigation through the grid row or an explicitly named link.',
      'Keep the primary name available as text even when supplying custom leading artwork.',
    ],
    context: ['Use for owners, customer accounts, and project associations within a data grid.'],
  },
  ActionsCell: {
    overview:
      'A row-action group with a limited number of visible icon buttons and an overflow menu.',
    usage: [
      'Order actions by frequency and use maxVisible to keep the cell compact. Additional actions move into the overflow menu.',
      'Give every action a specific label and callback. Provide a row-specific group label when repeated action groups would otherwise be ambiguous.',
    ],
    accessibility: [
      'Clicks and key events stop propagation so operating an action does not also activate the row.',
      'Visible icon actions and overflow menu actions remain keyboard-operable, including when their visual treatment is revealed on focus.',
    ],
    intent: [
      'A destructive action can use destroy intent; overflow preserves that meaning without changing other actions.',
    ],
    context: ['Use for edit, duplicate, export, or delete operations tied to one record.'],
  },
  ExpandCell: {
    overview: 'A row disclosure button with optional nested-item count.',
    usage: [
      'Keep expanded state in the host and render the corresponding expanded content in the grid.',
      'Provide a label naming the nested content; count is optional and does not determine whether expansion is available.',
    ],
    accessibility: [
      'The button exposes aria-expanded and announces both the action and any count.',
      'Click and keyboard events stop propagation, preventing expansion from also opening the parent record.',
    ],
    context: ['Use for nested activity, line items, and supporting detail under a row.'],
  },
  NumberCell: {
    overview: 'A consistently formatted numeric table value using Intl.NumberFormat.',
    usage: [
      'Supply a numeric value and use format for currency, percentage, or compact notation. Set locale deliberately when needed.',
      'Nonfinite values render a dash. Distinguish unavailable data from a real zero before passing the value.',
    ],
    accessibility: [
      'The cell remains ordinary text and does not add an unnecessary Tab stop.',
      'Put the unit in the column heading or formatted value so a bare number is understandable.',
    ],
    context: ['Use for totals, rates, amounts, and quantities in aligned numeric columns.'],
  },
  TimeCell: {
    overview: 'The compact RelativeTime presentation for a data-grid timestamp.',
    usage: [
      'Supply a Date or timestamp string and a fixed now when displaying a historical snapshot.',
      'The default timezone is UTC. Keep date columns consistently aligned and use a heading that names the date’s meaning.',
    ],
    accessibility: [
      'The underlying time element includes a machine-readable datetime and a complete absolute timestamp in its accessible label.',
      'Keyboard focus exposes the same absolute-time tooltip as pointer hover.',
    ],
    context: [
      'Use for Created, Updated, and other recent timestamps where elapsed time is useful.',
    ],
  },
  TagsCell: {
    overview: 'A bounded row of static tags with a named overflow summary.',
    usage: [
      'Use maxVisible to control density. Hidden values remain represented in the +N summary rather than being discarded.',
      'An empty array renders a dash with a “No tags” label; use this instead of a fake empty tag.',
    ],
    accessibility: [
      'The overflow summary is focusable and exposes all hidden tag names through its label and tooltip.',
      'These are static tags. Filtering or editing should be a separate explicit interaction.',
    ],
    context: ['Use for record labels, categories, and compact metadata in table rows.'],
  },
  SeverityCell: {
    overview: 'A table adapter to the shared SeverityBadge scale.',
    usage: [
      'Pass the record’s severity directly so table, filters, and details share the same vocabulary.',
      'Use compact only when the surrounding column context makes the severity dot understandable.',
    ],
    accessibility: [
      'The labeled variant exposes text; the compact variant exposes an image label naming the severity.',
      'Sorting severity requires an appropriate column sort function; badge colors do not supply an ordering to the grid.',
    ],
    context: ['Use in severity columns beside a separate lifecycle status.'],
  },
  StatusCell: {
    overview: 'A data-grid adapter to the standard record lifecycle badge.',
    usage: [
      'Pass one of the RecordStatus values rather than mapping arbitrary states to a similar color.',
      'Keep status filtering and editing bound to the same underlying record value.',
    ],
    accessibility: [
      'Visible status text conveys the meaning independently of the colored dot.',
      'A status cell does not edit itself; use a separate menu or form for lifecycle changes.',
    ],
    context: ['Use for New, In review, In progress, Completed, and Cancelled records.'],
  },
  SparklineCell: {
    overview: 'A lightweight, noninteractive trend graphic inside a dense table cell.',
    usage: [
      'Supply an ordered numeric series and a meaningful label that names its measure and time window.',
      'Line, area, and bar variants share Sparkline behavior; choose bars for bucket counts and lines for trend shape.',
    ],
    accessibility: [
      'The SVG has an image label and does not capture focus or animate.',
      'Provide a nearby number or a detail view with exact values when users need quantitative comparison.',
    ],
    context: [
      'Use as a compact supporting trend beside a primary metric, not as the sole source of exact data.',
    ],
  },
  AiVerdictCell: {
    overview:
      'A compact AI suggestion with a normalized confidence score and an explicit review reminder.',
    usage: [
      'Provide verdict text and confidence from 0 to 1. Values are clamped, and nonfinite scores are treated as zero.',
      'The high/medium/low wording is derived from the score; it is not a confirmation that the suggestion is correct.',
    ],
    accessibility: [
      'The cell is focusable and announces the suggestion, confidence label, and percentage.',
      'Its tooltip asks the user to review evidence before applying the suggestion. Applying it must be a separate action.',
    ],
    intent: [
      'AI styling communicates provenance, while confidence describes the supplied score; neither implies approval.',
    ],
    context: ['Use beside records that have a suggested classification or next step.'],
  },
  FilterBar: {
    overview:
      'A controlled search and table toolbar with mutually exclusive inline or sidebar filter editing.',
    usage: [
      'Use bar mode for inline field/operator/value filtering, or panel mode for an external FilterPanel. Do not mount two competing editors for the same task.',
      'Pass one RecordFilterState through value and onValueChange. Query, time range, chips, and facet changes remain synchronized through the reducer.',
      'selectionActions replaces the normal toolbar row while records are selected. Preserve the existing filter state so the same search returns after clearing selection.',
    ],
    accessibility: [
      'In panel mode, the filter toggle exposes the panel relationship and expanded state when panelId is provided.',
      'Applied chips have individually named removal buttons. In panel mode they are hidden while the sidebar is open to avoid duplicating the active controls.',
    ],
    context: [
      'Use with record grids; density and column controls affect presentation and do not themselves change the filter result.',
    ],
  },
  FilterPanel: {
    overview:
      'A record-filter sidebar with searchable checkbox facets, contextual counts, and collapsible groups.',
    usage: [
      'Use the same controlled RecordFilterState as the toolbar and data query. Values are ORed within a facet and ANDed across facets and rules.',
      'Facet counts apply the other filters while excluding their own facet, so users can see meaningful alternative choices.',
      'FilterOptions shows the first eight options, then Show all or Show less. Collapsing a long group does not clear its selected values.',
    ],
    accessibility: [
      'Shared Checkbox and Accordion controls preserve named selection and disclosure behavior without category icons carrying meaning.',
      'Show all and Show less expose the group name, option count, and expanded state. Keep the sidebar toggle and close focus behavior in the host layout.',
    ],
    context: [
      'Use beside a record collection with several independent facets; it is a record-specific pattern rather than a schema-free filter engine.',
    ],
  },
  ChartContainer: {
    overview:
      'A named chart figure that coordinates the title, description, plot area, loading, error, legend, and footer.',
    usage: [
      'Set a useful plot height and keep the title specific about the measure. Place scope or time-window clarification in description.',
      'Use loading, error, and empty for their actual data states; provide onRetry only when it can repeat the failed operation.',
      'Supply exact data in the footer when the plot alone cannot convey all values.',
    ],
    accessibility: [
      'The figure is associated with its visible heading and exposes pending plot work through aria-busy.',
      'ChartContainer does not add keyboard interaction to arbitrary children. The chart placed inside it must supply its own accessible plot or table.',
    ],
    context: [
      'Use as the shared frame for charts with consistent status handling and supporting controls.',
    ],
  },
  LineChart: {
    overview:
      'An ordered series chart for comparing change over time without filling the area below each line.',
    usage: [
      'Supply ordered data, the xKey, and series with readable labels. Missing values remain gaps rather than being connected automatically.',
      'Use the interactive legend to hide series and brush to inspect a narrower range when the dataset benefits from it.',
      'Set showDataTable when exact values need to remain inspectable; tick formatting does not change the source values.',
    ],
    accessibility: [
      'The plot supports left/right arrow inspection through the Recharts accessibility layer.',
      'Legend buttons expose pressed state, and the optional native data table provides labeled rows and columns.',
    ],
    intent: [
      'Use series colors consistently across related charts; semantic colors should represent a real category or state.',
    ],
    context: ['Use for rates, activity trends, and comparisons across several ordered measures.'],
  },
  AreaChart: {
    overview:
      'An ordered series chart that emphasizes magnitude with a filled area beneath the line.',
    usage: [
      'Use one or a few related series so filled areas remain readable. stacked changes the visual relationship to cumulative contribution.',
      'Data order and series keys are supplied by the host; no aggregation or time bucketing is inferred.',
      'Enable showDataTable for exact values and brush for range inspection when appropriate.',
    ],
    accessibility: [
      'Arrow keys inspect chart values, and legend buttons expose which series are shown.',
      'Do not rely on translucent overlap to explain the relationship between series; use clear labels and the data table.',
    ],
    context: [
      'Use for volume or cumulative activity where the filled magnitude is useful, rather than as decoration behind a number.',
    ],
  },
  BarChart: {
    overview:
      'A categorical or interval comparison with grouped or stacked bars and active-bar feedback.',
    usage: [
      'Supply xKey and named series. Use stacked only when the series represent parts of a meaningful combined quantity.',
      'colorKey can point to a per-datum ChartColor; absent or unsupported values fall back to the series color.',
      'Keep showDataTable available when exact values matter. Hover changes the active bar fill without changing the underlying data.',
    ],
    accessibility: [
      'The plot supports arrow-key value inspection, with tooltip swatches matching the actual datum color.',
      'Legend buttons and brush controls are keyboard-operable; chart labels and data-table values carry meaning beyond color.',
    ],
    context: [
      'Use for interval counts, category comparisons, and stacked composition by a shared unit.',
    ],
  },
  DonutChart: {
    overview:
      'A part-to-whole summary with a visible total, category legend, and optional exact data table.',
    usage: [
      'Use mutually exclusive categories that share a unit. Negative or nonfinite values are normalized to zero.',
      'A zero total renders an empty state. Keep the number of categories small enough to compare and name totalLabel accurately.',
    ],
    accessibility: [
      'The chart provides keyboard category inspection; showDataTable exposes exact category values in native table markup.',
      'The center total is decorative to assistive technology, so preserve the legend or table rather than relying on that number alone.',
    ],
    context: [
      'Use for distribution of a finite whole, and prefer bars when small differences between categories are important.',
    ],
  },
  EventHistogram: {
    overview:
      'Stacked severity counts over time, composed from BarChart and a shared TimeRange value.',
    usage: [
      'Provide severity buckets with timestamps. The component estimates bucket duration from the first two timestamps, with a 30-minute fallback.',
      'Without a brush, the selected range filters displayed buckets. With a brush, the complete series remains visible for range selection.',
      'Use onValueChange to apply the brush interval to the host’s filters; override description if the bucket interval is not the default wording.',
    ],
    accessibility: [
      'The underlying BarChart supplies keyboard value inspection, named series, and optional exact data disclosure.',
      'Range changes are absolute timestamp boundaries, not merely a decorative highlighted region.',
    ],
    intent: [
      'Stack colors use the shared severity chart palette so the legend and filters remain consistent.',
    ],
    context: ['Use for time-bucketed operational activity that already has a severity dimension.'],
  },
  MetricCard: {
    overview:
      'A summary value with an optional unit, percentage comparison, and compact supporting trend.',
    usage: [
      'Supply the metric and its delta independently from the same real aggregation. deltaLabel should name the comparison period.',
      'Set trendIsPositive explicitly when a decrease is favorable or an increase is unfavorable; the default treats a positive change as favorable.',
      'Use sparklineLabel to describe the actual measure and time window rather than relying on the default 24-hour wording.',
    ],
    accessibility: [
      'The card is named by its label, loading is announced, and favorable or unfavorable comparison meaning is included as text.',
      'The optional sparkline is a noninteractive image summary; exact supporting values belong in a detailed chart or table.',
    ],
    intent: [
      'The card’s intent can accent the metric independently of whether its delta is favorable.',
    ],
    context: [
      'Use for a small set of comparable KPIs whose labels and periods are immediately understandable.',
    ],
  },
  ChartMetricCard: {
    overview:
      'A summary metric, explicit comparison, latest readout, and underlying bar, area, or compact-bar series.',
    usage: [
      'Supply data oldest to newest; the last datum becomes the latest readout. metric is caller-defined and is not automatically summed from data.',
      'Set trendIsPositive only when the change has a known favorable or unfavorable meaning. Omission keeps the comparison neutral.',
      'Use finite values; compact bars require non-negative values. Per-datum color applies to the full bar variant, while area and compact variants use the series color.',
    ],
    accessibility: [
      'Every variant exposes exact values through a native chart-data disclosure; full-size plots also support keyboard inspection.',
      'Formatted summary and tooltip values do not replace the exact numbers in the data table.',
    ],
    context: ['Use when users need to connect an aggregate KPI to the interval data beneath it.'],
  },
  Sparkline: {
    overview:
      'A lightweight SVG trend designed for compact summaries without animation or interactive focus.',
    usage: [
      'Provide data in the intended order. Negative and nonfinite values are normalized to zero, so signed measures require a different chart.',
      'Line and area emphasize relative shape; bar uses a zero baseline. Provide label when the default event-oriented summary is not accurate.',
    ],
    accessibility: [
      'The graphic is exposed as an image with a summary label; it does not add a keyboard stop.',
      'Provide exact values elsewhere when the user needs precision. Empty and loading states have their own readable labels.',
    ],
    context: [
      'Use inside metrics and dense record cells where the trend supplements a primary value.',
    ],
  },
  MiniBarChart: {
    overview: 'The compact zero-based bar form of Sparkline for non-negative interval values.',
    usage: [
      'Use consistent bucket ordering and width when comparing several miniature charts.',
      'Provide a measure-specific label and a nearby total or latest value; bars alone are not an exact-value interface.',
    ],
    accessibility: [
      'The SVG shares Sparkline’s named-image, empty, and loading behavior and never captures focus.',
      'For interactive tooltip inspection or an exact data disclosure, use BarChart or ChartMetricCard instead.',
    ],
    context: ['Use for compact activity history in metric cards and table rows.'],
  },
  GanttChart: {
    overview:
      'A schedule view of tasks, milestones, progress, and dependencies across a day, week, or month scale.',
    usage: [
      'Supply valid dates and stable unique task IDs. Invalid tasks are identified rather than silently drawn at invented positions.',
      'The chart is a schedule viewer: onTaskSelect opens or selects a task, but dragging to reschedule is not implemented.',
      'Pass today explicitly for reproducible planning views. Missing or self-referencing dependencies are skipped, and very large date spans are bounded.',
    ],
    accessibility: [
      'The timeline is a named focusable horizontal scroll region, and the scale selector uses native radio behavior.',
      'Selectable tasks are buttons whose labels include dates, progress, owner, and dependencies; static tasks are described as images.',
    ],
    context: [
      'Use for project plans and delivery schedules with a corresponding task-detail view.',
    ],
  },
  CodeEditor: {
    overview:
      'A token-themed CodeMirror editor with controlled text, folding, line numbers, and bounded height.',
    usage: [
      'Select the supported language and provide a specific label. Use value with onValueChange for controlled editing, or defaultValue for local state.',
      'readOnly prevents edits without turning the source into an image; text remains inspectable and selectable.',
      'Use highlightedLines for source emphasis and the imperative handle for focus, fold-all, or unfold-all controls.',
    ],
    accessibility: [
      'Tab and Shift+Tab leave the editor rather than indenting or trapping focus; preserve that behavior when adding custom extensions.',
      'The editor includes accessible navigation instructions and supports external descriptions. The status bar reports cursor position and language.',
    ],
    context: [
      'Use for configuration and structured source editing; parsing, validation, and persistence belong to the host.',
    ],
  },
  YamlPresenter: {
    overview: 'A readonly YAML source panel with filename, copy, fold, and unfold controls.',
    usage: [
      'Provide the real filename when available; config.yaml is the generic default.',
      'Use highlightedLines to point to relevant ranges and keep enough surrounding source for context.',
    ],
    accessibility: [
      'The section is labeled by its filename and the readonly editor has a source-specific name.',
      'Highlighted line ranges have a text description, while fold, unfold, and copy are separately named keyboard-operable controls.',
    ],
    context: [
      'Use for a configuration preview or review artifact; use CodeEditor when the user should edit the source.',
    ],
  },
  DiffView: {
    overview:
      'A split or unified source comparison with exact change counts and change navigation.',
    usage: [
      'Supply original and modified snapshots. The default is readonly; enable editing only when onModifiedChange updates the host’s modified value.',
      'collapseUnchanged reduces long unchanged stretches. focusFirstChange scrolls to a change without moving keyboard focus.',
      'Use originalLabel and modifiedLabel to explain which version each pane represents.',
    ],
    accessibility: [
      'Next and Previous change controls move to meaningful change locations; Tab still leaves the editor surfaces.',
      'Additions and removals are identified with labels and counts rather than relying only on green and red backgrounds.',
    ],
    intent: [
      'modifiedIntent="ai" labels provenance separately from addition and removal semantics; it does not approve the proposed content.',
    ],
    context: [
      'Use for reviewing configuration edits, generated proposals, and revisions before an explicit save or approval action.',
    ],
  },
  JsonViewer: {
    overview: 'A bounded, expandable JSON tree with type-aware values and path or value copying.',
    usage: [
      'Pass JSON-compatible data where possible. Circular references and unsupported values are identified instead of being executed or silently serialized.',
      'Use defaultExpandedDepth and maxVisibleItems to keep large payloads manageable; additional children can be revealed in bounded pages.',
      'Copy a branch value for valid JSON or its path when referring to a specific field.',
    ],
    accessibility: [
      'Arrow keys navigate and open or close branches; Home/End reach the visible bounds, and Enter or Space toggles a branch.',
      'Ctrl/Cmd+C copies the focused value when no text selection exists; adding Shift copies its path. Clipboard failures provide a selectable fallback.',
      'Tree items expose level, position, size, and expanded state, while copy controls follow the active item’s keyboard position.',
    ],
    context: [
      'Use for structured record details and API responses that need inspection rather than editing.',
    ],
  },
  AiCard: {
    overview:
      'A labeled AI-generated result with optional confidence, provenance, feedback, and regeneration.',
    usage: [
      'Use the title for the result’s purpose and provenance for the context or source behind it.',
      'Provide callbacks only for available feedback and regeneration actions. loading disables those actions and marks the result busy.',
    ],
    accessibility: [
      'The card explicitly labels AI origin; a title associates the section with its heading.',
      'Feedback controls expose pressed state, so their selection is understandable without color.',
    ],
    intent: [
      'AI treatment indicates generated assistance. Confidence is evidence strength, not approval or a guarantee of correctness.',
    ],
    context: [
      'Use for summaries and recommendations that users can review alongside source records.',
    ],
  },
  AiHighlight: {
    overview: 'A compact complementary AI result with optional confidence and provenance.',
    usage: [
      'Use for a short generated observation beside the main content, keeping the source or context visible.',
      'Choose AiCard when the result needs a heading, feedback, or regeneration controls.',
    ],
    accessibility: [
      'The aside includes an explicit AI label; provide an accessible label when several complementary blocks need distinction.',
      'Keep the generated observation in text. Gradient or icon treatment should never carry the explanation alone.',
    ],
    intent: [
      'The treatment marks AI provenance without replacing the semantics of warnings, validation, or status.',
    ],
    context: [
      'Use for a concise generated insight adjacent to a chart, record, or source preview.',
    ],
  },
  AiInlineSuggestion: {
    overview:
      'An input or textarea with an optional proposed suffix that the user explicitly accepts or dismisses.',
    usage: [
      'Supply a suggestion that extends the current value. A mismatched suggestion does not replace the entered text.',
      'Accepting changes the value; merely displaying the suggestion does not. Keep the suggestion concise and relevant to the current field.',
      'Use Field for label, helper text, and validation so generated assistance remains part of the normal form.',
    ],
    accessibility: [
      'Tab accepts a matching visible suffix, Escape dismisses it, and the next Tab leaves the field normally.',
      'A visible Accept button provides an alternative to the shortcut, and the suggestion is described through a polite status.',
    ],
    intent: [
      'AI styling marks the proposed text as assistance; acceptance is a local edit, not validation of its correctness.',
    ],
    context: [
      'Use for draft titles, descriptions, and other short text completions with a clear review opportunity.',
    ],
  },
  ConfidenceBadge: {
    overview: 'A textual high, medium, or low confidence indicator with a supplementary bar motif.',
    usage: [
      'Supply confidence from a defined assessment in the host. The badge does not calculate confidence from content.',
      'Explain the evidence or uncertainty nearby when confidence affects an important decision.',
    ],
    accessibility: [
      'The confidence level is visible text; the decorative bars are hidden from assistive technology.',
      'Do not use confidence as a substitute for an explicit action status or approval control.',
    ],
    intent: [
      'Confidence describes evidence strength, not severity, urgency, or permission to apply a result.',
    ],
    context: ['Use beside generated findings and suggestions that expose supporting context.'],
  },
  ThinkingIndicator: {
    overview: 'An AI working status with optional rotating messages and a compact presentation.',
    usage: [
      'Supply messages that accurately describe the operation; the default phrases are generic presentation copy, not proof that a processing stage occurred.',
      'Use compact for limited space. The indicator itself neither starts nor cancels generation.',
    ],
    accessibility: [
      'The component uses a status role and keeps decorative dots hidden.',
      'Message rotation pauses when reduced motion is requested, and intervals are bounded to avoid excessively rapid changes.',
    ],
    context: [
      'Use while an actual AI request is pending, with a separate stop control when cancellation is supported.',
    ],
  },
  StreamingSkeleton: {
    overview: 'A named placeholder for an AI response that has not yet produced readable content.',
    usage: [
      'Use before the first response content, then replace it with the real message as text arrives.',
      'Choose the number of lines to approximate the expected content rather than implying an exact response length.',
    ],
    accessibility: [
      'The loading label is exposed through a single status region, and decorative placeholder lines are hidden.',
      'Avoid layering another identical loading announcement around it.',
    ],
    context: ['Use in the initial response state of AiMessage or a generated-result region.'],
  },
  AiMessage: {
    overview:
      'A user or assistant conversation entry with source context, progress, citations, and optional result actions.',
    usage: [
      'Provide the actual message state, steps, citations, and provenance. The component renders these facts rather than generating them.',
      'Citations become buttons only when onCitationClick is supplied; use that callback to open the cited record or resource.',
      'Assistant Markdown does not execute raw HTML. Keep custom resultCards as trusted application UI.',
    ],
    accessibility: [
      'User and assistant articles have distinct names. Token-by-token body updates are not a live region; concise status text announces progress.',
      'Working steps use a disclosure, and copy, feedback, and regenerate actions remain explicitly named controls.',
    ],
    intent: [
      'AI origin and confidence must remain separate from completed operations; a suggestion in a message does not mutate records by itself.',
    ],
    context: [
      'Use within a transcript, with source navigation and approval handled by the surrounding application.',
    ],
  },
  PromptInput: {
    overview:
      'An AI message composer with removable context, slash commands, and send or stop controls.',
    usage: [
      'onSend receives the trimmed prompt and a snapshot of attached context. Return its promise so failed sends preserve the draft for retry.',
      'Commands insert editable prompt text rather than submitting automatically. Customize commands for the host’s supported tasks.',
      'Use generating and onStop to connect cancellation to a real request; the composer does not stop a backend operation on its own.',
    ],
    accessibility: [
      'Enter sends, Shift+Enter inserts a newline, and slash opens commands only in an otherwise empty draft. Composition input is respected.',
      'Closing a context or command picker and removing an attachment returns focus to the composer; send errors are associated with the field.',
    ],
    context: [
      'Use with an explicit context-aware assistant, keeping attached records visible and removable before sending.',
    ],
  },
  AiPanel: {
    overview:
      'A docked or overlay assistant workspace with a conversation, context-aware composer, and cancellable streaming.',
    usage: [
      'The default stream is a deterministic local demo. Supply streamResponse for a real service and use modelLabel to describe it accurately.',
      'Each unique request ID is submitted once while the panel is open. Requests snapshot context so later selection changes do not rewrite earlier messages.',
      'Use onEvidenceClick for cited-record navigation and renderResultCards for application-owned results. Resizing preserves the conversation and draft.',
    ],
    accessibility: [
      'SideSheet supplies the overlay or docked focus behavior; the transcript is a named log with token streaming announcements kept separate.',
      'The panel exposes stop, context removal, feedback, and regeneration controls without making generated text an automatic action.',
    ],
    intent: [
      'AI treatment identifies assistance and provenance. Any state-changing proposal still needs an explicit application action or review boundary.',
    ],
    context: [
      'Use beside a workspace when prompts should refer to selected records and their supplied descriptions.',
    ],
  },
  AiDiffReview: {
    overview: 'An explicit approve or reject boundary around an AI-proposed document change.',
    usage: [
      'Supply original, proposed, documentName, and the correct language. Approval applies to those document snapshots, not an unspecified future revision.',
      'Changing original or proposed invalidates the prior decision and aborts a pending review action.',
      'Honor the callback AbortSignal and persist the supplied snapshot only after explicit approval. Failures remain visible for retry.',
    ],
    accessibility: [
      'The diff retains keyboard navigation and labeled additions/removals; approve and reject are separate, named buttons.',
      'Pending actions are guarded against duplicate submissions, and a completed decision is exposed as a status with a stable focus target.',
    ],
    intent: [
      'AI marks proposal origin; approval is a user decision, and green/red diff markings describe additions and removals rather than desirability.',
    ],
    context: [
      'Use before applying generated configuration or source changes to application state.',
    ],
  },
  AwsLogo: {
    overview:
      'Original AWS architecture artwork with official service names and available light/dark image variants.',
    usage: [
      'Select a valid AwsLogoName from the manifest rather than reconstructing or recoloring the artwork.',
      'Use decorative when visible adjacent text already names the service; otherwise provide a meaningful label or use the official default name.',
    ],
    accessibility: [
      'Nondecorative artwork is an image with alt text. Decorative images use empty alt text to avoid repeating an adjacent label.',
      'The catalogue provides search, category and type filters, pagination, and explicit selection controls.',
    ],
    context: [
      'Use for truthful infrastructure and integration references; original artwork and associated notices remain separate from the UI theme.',
    ],
  },
  Iconography: {
    overview: 'A shared named icon adapter for consistent stroke-based interface artwork.',
    usage: [
      'Import the specific named icons needed by a component. Keep full icon-pack namespace imports confined to the gallery.',
      'Choose an icon that reinforces a visible action or concept, and use the component’s size and stroke controls rather than altering source SVG artwork.',
    ],
    accessibility: [
      'Decorative icons beside text should be hidden from assistive technology. Icon-only actions need a named IconButton or equivalent control.',
      'An icon does not supply interaction semantics or a tooltip by itself; its containing component owns those behaviors.',
    ],
    context: [
      'Use the searchable gallery to inspect and copy the installed library’s supported names and imports.',
    ],
  },
};

// Generated family names use Storybook display labels for these existing exports.
const displayNames: Record<string, string> = {
  'AWS logos': 'AwsLogo',
  'Area chart': 'AreaChart',
  'Bar chart': 'BarChart',
  'Chart container': 'ChartContainer',
  'Chart metric card': 'ChartMetricCard',
  'Donut chart': 'DonutChart',
  'Event histogram': 'EventHistogram',
  'Line chart': 'LineChart',
  'Metric card': 'MetricCard',
  'Mini bar chart': 'MiniBarChart',
  'Actions cell': 'ActionsCell',
  'AI verdict cell': 'AiVerdictCell',
  'Bulk actions bar': 'BulkActionsBar',
  Cells: 'EntityCell',
  'Expand cell': 'ExpandCell',
  'Number cell': 'NumberCell',
  'Severity cell': 'SeverityCell',
  'Sparkline cell': 'SparklineCell',
  'Status cell': 'StatusCell',
  'Tags cell': 'TagsCell',
  'Time cell': 'TimeCell',
  'Empty state': 'EmptyState',
  'Progress bar': 'ProgressBar',
  'Project setup': 'Wizard',
};
for (const [displayName, exportName] of Object.entries(displayNames)) {
  authoredGuidance[displayName] = authoredGuidance[exportName];
}
