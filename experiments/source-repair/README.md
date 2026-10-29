# Bounded source repair experiment

This is a seeded regression with a controlled test response. No AI service was called and no production defect or automatic release is claimed.

The untouched baseline passed 84 Chromium scenarios. Adding an excessive minimum width in an isolated MetricCard fixture caused 56 canonical scenarios to fail while the 28 existing Forma scenarios stayed green. The worker applied the predetermined repair in a separate candidate, then passed all 84 scenarios and the type, token, headless and full source unit checks. It produced one local commit in one attempt and preserved the original checkout.

The JSON reports retain exact source/oracle hashes and their original local evidence paths. The patch and screenshots are copied here for durable review. The verification file records the source revision used by this experiment; later documentation or test-discovery changes do not relabel this as a fresh run.

- Source under test: 42849a29b01a23b18cc12a7a0833d4f3d90df6dc
- Candidate: ad6060631da60f6baf04af585cf4ab7a62a2aff0
- Patch SHA-256: 4b8997d76671152dc95c2a5cc5edc194c15c216efbaaaa3a71d52bd5e5bce8a0
- Live AI proposal was not executed in this controlled run. After explicit user authorization, a separate [live experiment](live/README.md) passed in one real Codex request; its evidence is kept distinct.
- GitHub repair publication: exercised with controlled command responses; the seeded fixture is intentionally ineligible for publication.

The provider adapter, guards and process handling have independent controlled tests. This evidence verifies orchestration and the finite acceptance matrix, not AI diagnosis or universal self-healing. See [source repair operations](../../docs/SOURCE-REPAIR.md) for the implemented scope.
