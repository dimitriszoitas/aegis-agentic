# PasswordInput

Use PasswordInput when someone must enter or review a password and needs an explicit reveal action. It composes the existing TextInput and IconButton; it is distinct from a bare `TextInput type="password"` because it owns an accessible visibility control.

The value starts concealed. Show password changes the same native input to text; Hide password restores password type. The action keeps keyboard focus, never submits the form and never emits a value change. Visibility is local state and persists through ordinary rerenders; unmounting creates a concealed instance again. Disabling the field blocks both editing and visibility changes; it does not automatically conceal an already revealed value. Read-only prevents editing but deliberately permits reveal.

Use a standalone `label`, or place the component in Field for shared labeling, required state, help and validation messages. Explicit control props retain the same precedence as TextInput and useFieldControl. The forwarded ref addresses the native input. `value` plus a host change handler is controlled; `defaultValue` initializes an uncontrolled value. Both `onValueChange` and native `onChange` are forwarded without interception. Name, form, autocomplete and native validation attributes continue to reach the input.

Choose `autoComplete="current-password"` for sign-in and `autoComplete="new-password"` for account creation or replacement. Give multiple password fields distinct visible labels and, when useful, distinct `showPasswordLabel` / `hidePasswordLabel` action names. The component does not decide password policy, calculate strength, authenticate, persist or encrypt credentials. Concealment is a display choice, not an access-control boundary.

The input type and suffix belong to PasswordInput. Its public API omits custom `type`, `suffix` and clear controls so a second action cannot silently replace or conflict with reveal. A prefix remains available. Do not add an unrelated custom input or duplicate Field to implement this pattern.

TextInput retains input-group size, surface and focus tokens. The small nested IconButton retains trigger-group sizing, hover and keyboard-focus treatment; its icon uses the input group's icon dimension. The wrapper introduces no visual constants or theme branches. Preserve these boundaries across Fundamental and Fundamental Floating in light and dark modes.

`KeyboardAndForm` exercises actual typing, the public focus ref, controlled and native change handling, Enter/Space reveal behavior and native form data. `ReadOnlyReveal` exercises the deliberate read-only policy. Static-render tests check initial semantics and Field/native-prop forwarding; they do not establish browser focus, visual correctness or full accessibility. The local anatomy definition supplies real DOM selectors to the shared annotation renderer.
