# What a contract means

A contract is a versioned specification of what a component or composition must guarantee. It is separate from its implementation and from evidence that an implementation meets it.

| Artifact                | Responsibility                                                                        | Example                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Contract                | Defines purpose, anatomy, states, behavior and design constraints                     | A modal has an accessible title, contains focus while open and returns focus on dismissal.                  |
| Headless implementation | Implements interaction and accessibility behavior without a visual language           | Base UI Dialog provides modal behavior.                                                                     |
| Styled implementation   | Combines behavior with the project's approved group tokens                            | Aegis Modal gives that interaction its visual appearance.                                                   |
| Guidelines and skills   | Help a person or agent choose, compose and extend the implementation                  | Use a modal for a focused task; preserve the underlying behavior when adding content.                       |
| Evidence                | Records which requirements were checked, against which implementation and environment | A browser test exercises Escape and focus return in light/dark; an accessibility scan records its findings. |

“Contract v1” means version one of the requirements. It is not a passing-test badge, a headless component, or an accessibility certification. A contract can exist before an implementation. A proposed implementation is not canonical simply because its JSON validates.

## The experiment's layers

`contracts/agentic/*.json` contains authored requirements for five seeded registry entries and the experimental TokenInput. These deliberately declare `verification: not-certified-by-this-contract`. They are compact requirements documents, not complete executable tests for every invariant.

`public/ai/` contains source-extracted API facts and authored usage guidance for the inherited component catalogue. The portable kit includes these under `reference-api/ai/`. These files help agents discover imports and properties without claiming that source inspection proves runtime correctness.

`schemas/` constrains input structure. The profile, composition, registry and maintenance runtime also checks specific relationships: complete theme mappings, valid Apply behavior, selected profile fingerprints, canonical identity, stale revisions and allowed repair operations. Component token audits enforce styling ownership. Browser and unit tests supply separate behavioral evidence.

For the dataset-filtering pattern, an accepted specification selects one shared renderer. That makes behavior repeatable within the supported pattern. Two independently generated implementations are not guaranteed equivalent merely because their specifications look similar.

## Extending a contract

Start with responsibility and observable acceptance criteria. Define defaults and edge cases, including validation, empty states, controlled state, disabled behavior, keyboard interaction and theme changes. Reference the public API and the owning token group. Add representative examples and executable checks where possible.

Compare overlapping proposals before merging code. The independent TokenInput experiment found differences in delimiters, duplicate policy, paste atomicity and controlled acknowledgments despite both candidates passing their own tests. Its current proposal schema compares only a subset of those decisions. Reviewers must examine the fuller acceptance documents and implementation evidence.

Changing approved behavior requires a revised implementation proposal, a new reviewed consolidation plan and appropriate versioning. An approval record must not relabel one implementation as having another implementation's behavior. No component contract can substitute for a missing product decision or comprehensive testing.
