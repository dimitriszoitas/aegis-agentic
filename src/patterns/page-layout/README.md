# Page construction primitives

`PageLayout` supplies four initial library recipes. These are useful starting choices, not a requirement that every product page fit one of four categories. A product may propose another shared composition through the documented review process.

The component renders a labeled `section`, the existing `PageHeader`, explicit region wrappers, and an optional footer. The application shell still owns page padding and its `main` landmark. Nested components own their surfaces, typography, controls, and behavior. This module does not insert sticky elements, alter children, fetch data, route, validate forms, or persist state.

| Recipe       | Regions                                               | Content width                                              | Typical responsibility                                    |
| ------------ | ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `collection` | Header, optional filters, main, optional footer       | Available width                                            | Data grid or list; keep its toolbar and overflow behavior |
| `detail`     | Header, main, optional labeled aside, optional footer | Available width; main and aside stack in narrow containers | One record, with secondary context                        |
| `settings`   | Header, one main, optional footer                     | A ReadingColumn                                            | A coherent form or preferences section                    |
| `dashboard`  | Header, grid main, optional footer                    | Adaptive ContentGrid                                       | Independent summaries or cards                            |

The discriminated `PageLayoutProps` reject filters on non-collection recipes, an aside outside detail, a prose measure on collections, and grid options outside dashboards. A detail aside requires `asideLabel`. Runtime checks also reject invalid structural choices from JavaScript. The pure `validatePageLayoutRecipe` checks a finite configuration object and reports unknown properties; it does not validate arbitrary DOM props or rendered content.

`ReadingColumn` accepts `measure="compact" | "comfortable" | "wide"`. Its initial maximums are 55ch, 65ch, and 75ch, respectively, with comfortable as the default. These are documented starting measures, not universally optimal line lengths. Actual glyphs, language, typeface, text size, and task still require review. It sets only width constraints and does not restyle paragraphs, headings, or inputs. Never wrap a whole data collection in it.

`ContentGrid` accepts `maxColumns={1 | 2 | 3 | 4}` (default 4) and `minItemWidth="small" | "regular" | "large"` (16rem, 20rem, or 24rem; regular by default). Each direct child receives a transparent layout wrapper. Intrinsic CSS grid sizing derives the column count from the container; it does not use viewport breakpoints. The maximum is a cap. If even one item minimum cannot fit, that item uses the available width. Children remain responsible for any content overflow inside them.

Owned group: **page-structure**. New primitive lengths feed explicit invariant semantic mappings for all four configurations, then group roles. Nested PageHeader, Card, Button, Field, and other components retain their own bindings. Private grid state variables only select the documented group tokens; they are not an additional public token tier. `recipes.ts` has no React, CSS, or runtime dependency imports and exports machine-readable responsibilities, allowed slots, finite choices, tokens, and limits.

Focused verification lives in `page-layout.test.tsx`, the Storybook interaction, and `verify-layout-browser.mjs` with its local browser fixture. Browser checks exercise geometry in the four theme/mode combinations, narrow containers, grid column caps, main-before-aside stacking, full-width collections, and draft/focus preservation across resize and theme changes. Passing them does not establish that every consumer’s content is accessible or well designed.
