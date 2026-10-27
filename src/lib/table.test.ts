import { describe, expect, it } from 'vitest';
import { clampColumnWidth, estimateColumnWidth, getSafePageIndex } from './table';

describe('grid sizing and pagination', () => {
  it('keeps pointer and keyboard resize requests inside column constraints', () => {
    expect(clampColumnWidth(18, 96, 320)).toBe(96);
    expect(clampColumnWidth(900, 96, 320)).toBe(320);
    expect(clampColumnWidth(167.8, 96, 320)).toBe(168);
    expect(clampColumnWidth(Number.NaN, 96, 320)).toBe(96);
  });
  it('autosizes using the longest visible line and bounds unusually large payloads', () => {
    expect(estimateColumnWidth('Event count', ['8', '1284'], 80, 400)).toBe(131);
    expect(estimateColumnWidth('Entity', ['WS-ATH-114\n10.12.34.18'], 80, 400)).toBe(131);
    expect(estimateColumnWidth('Evidence', ['x'.repeat(10000)], 80, 400)).toBe(400);
  });
  it('keeps the current page valid when a filtered result set shrinks or becomes empty', () => {
    expect(getSafePageIndex(5, 42, 25)).toBe(1);
    expect(getSafePageIndex(2, 0, 25)).toBe(0);
    expect(getSafePageIndex(3, 150, 25)).toBe(3);
    expect(getSafePageIndex(-1, 150, 25)).toBe(0);
  });
});
