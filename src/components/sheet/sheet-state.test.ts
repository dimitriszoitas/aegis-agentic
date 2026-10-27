import { describe, expect, it } from 'vitest';
import { clampSheetSize, sheetBounds, sheetKeyboardSize, sheetPointerSize } from './sheet-state';

describe('Sheet resizing constraints', () => {
  it('preserves workspace room and adapts when the container is smaller than the requested minimum', () => {
    expect(sheetBounds(600, 160, 200, 800)).toEqual({ min: 200, max: 440 });
    const small = sheetBounds(260, 160, 200, 800);
    expect(small).toEqual({ min: 100, max: 100 });
    expect(clampSheetSize(320, small)).toBe(100);
    expect(sheetBounds(90, 160, 200, 800)).toEqual({ min: 0, max: 0 });
  });
  it('honors explicit limits regardless of the drag distance', () => {
    const bounds = sheetBounds(900, 100, 180, 420);
    expect(clampSheetSize(-200, bounds)).toBe(180);
    expect(clampSheetSize(2000, bounds)).toBe(420);
  });
  it('matches the moved edge for all placements and keyboard shortcuts', () => {
    const bounds = { min: 180, max: 420 };
    expect(sheetPointerSize('bottom', 260, -40)).toBe(300);
    expect(sheetPointerSize('right', 260, -40)).toBe(300);
    expect(sheetPointerSize('left', 260, 40)).toBe(300);
    expect(sheetKeyboardSize('bottom', 260, 'ArrowUp', false, bounds)).toBe(280);
    expect(sheetKeyboardSize('right', 260, 'ArrowLeft', true, bounds)).toBe(300);
    expect(sheetKeyboardSize('left', 260, 'ArrowRight', true, bounds)).toBe(300);
    expect(sheetKeyboardSize('left', 260, 'ArrowUp', false, bounds)).toBeNull();
    expect(sheetKeyboardSize('bottom', 260, 'Home', false, bounds)).toBe(180);
    expect(sheetKeyboardSize('bottom', 260, 'End', false, bounds)).toBe(420);
  });
});
