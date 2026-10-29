/** Registered finite scenarios are coverage facts, not executed or human approval. */
import inventory from '../../public/ai/acceptance-inventory.json';

export const acceptanceInventory = inventory;
export function getAcceptanceRequirement(contractId: string, requirementId: string) {
  return acceptanceInventory.requirements.find(
    (requirement) =>
      requirement.contractId === contractId && requirement.requirementId === requirementId,
  );
}
export function getAcceptanceCoverage() {
  return {
    sourceDigest: acceptanceInventory.sourceDigest,
    scope: acceptanceInventory.scope,
    evidenceAccepted: acceptanceInventory.evidenceAccepted,
    summary: acceptanceInventory.summary,
    limitations: acceptanceInventory.limitations,
  };
}
