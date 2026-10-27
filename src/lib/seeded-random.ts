/** Mulberry32: stable fixtures without time- or browser-dependent randomness. */
export function seededRandom(seed: number) {
  return () => {
    let n = (seed += 0x6d2b79f5);
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
