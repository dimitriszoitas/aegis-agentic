import { describe, expect, it } from 'vitest';
import {
  placeAnatomyMarker,
  closestTargetPoint,
  placeAnatomyLabel,
  type Point,
  type Rect,
} from './anatomy-layout';
import type { AnatomyPart } from './types';

const stage: Rect = { x: 0, y: 0, width: 900, height: 700 };
const target: Rect = { x: 400, y: 300, width: 100, height: 40 };
const radius = 14;
const gap = 8;
const anchors: NonNullable<AnatomyPart['anchor']>[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
  'center',
];
function distanceToRect(point: Point, rect: Rect) {
  return Math.hypot(
    Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width),
    Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height),
  );
}
function capsuleClearance(rect: Rect, obstacle: Rect) {
  const pillRadius = rect.height / 2;
  const start = rect.x + pillRadius;
  const end = rect.x + rect.width - pillRadius;
  const y = rect.y + pillRadius;
  return (
    Math.hypot(
      Math.max(obstacle.x - end, start - obstacle.x - obstacle.width, 0),
      Math.max(obstacle.y - y, y - obstacle.y - obstacle.height, 0),
    ) - pillRadius
  );
}
function capsuleToMarkerClearance(rect: Rect, marker: Point) {
  const pillRadius = rect.height / 2;
  const closestX = Math.max(
    rect.x + pillRadius,
    Math.min(rect.x + rect.width - pillRadius, marker.x),
  );
  return Math.hypot(marker.x - closestX, marker.y - rect.y - pillRadius) - pillRadius;
}

function inside(point: Point, rect: Rect, inset = 0) {
  expect(point.x).toBeGreaterThanOrEqual(rect.x + inset);
  expect(point.y).toBeGreaterThanOrEqual(rect.y + inset);
  expect(point.x).toBeLessThanOrEqual(rect.x + rect.width - inset);
  expect(point.y).toBeLessThanOrEqual(rect.y + rect.height - inset);
}
describe('placeAnatomyMarker', () => {
  it.each(anchors)('keeps the requested outward anchor for an isolated button: %s', (anchor) => {
    const point = placeAnatomyMarker({
      target,
      anchor,
      stage,
      obstacles: [],
      markers: [],
      offset: 40,
      radius,
      gap,
    });
    const expectedX = anchor.includes('left') ? 360 : anchor.includes('right') ? 540 : 450;
    const expectedY = anchor.includes('bottom')
      ? 380
      : anchor === 'left' || anchor === 'right'
        ? 320
        : 260;
    expect(point).toEqual({ x: expectedX, y: expectedY });
    inside(point, stage, radius);
    expect(distanceToRect(point, target)).toBeGreaterThanOrEqual(radius + gap);
  });

  it('slides crowded markers without covering adjacent parts or earlier badges', () => {
    const obstacles = [{ x: 400, y: 240, width: 100, height: 40 }];
    const markers: Point[] = [];
    for (let index = 0; index < 8; index++) {
      const options = { target, stage, obstacles, markers, offset: 40, radius, gap };
      const point = placeAnatomyMarker(options);
      expect(placeAnatomyMarker(options)).toEqual(point);
      inside(point, stage, radius);
      for (const rect of [target, ...obstacles])
        expect(distanceToRect(point, rect)).toBeGreaterThanOrEqual(radius + gap);
      for (const previous of markers)
        expect(Math.hypot(point.x - previous.x, point.y - previous.y)).toBeGreaterThanOrEqual(
          radius * 2 + gap,
        );
      markers.push(point);
    }
  });

  it('chooses another clear side when the target touches a stage edge', () => {
    const edgeTarget = { x: 20, y: 30, width: 100, height: 40 };
    const edgeStage = { x: 20, y: 30, width: 300, height: 180 };
    const point = placeAnatomyMarker({
      target: edgeTarget,
      stage: edgeStage,
      obstacles: [],
      markers: [],
      offset: 40,
      radius,
      gap,
    });
    inside(point, edgeStage, radius);
    expect(distanceToRect(point, edgeTarget)).toBeGreaterThanOrEqual(radius + gap);
  });

  it('ignores enclosing and duplicate target bounds while keeping own-target clearance', () => {
    const point = placeAnatomyMarker({
      target,
      stage,
      obstacles: [stage, target],
      markers: [],
      offset: 40,
      radius,
      gap,
    });
    expect(point).toEqual({ x: 450, y: 260 });
    inside(point, stage, radius);
    expect(distanceToRect(point, target)).toBeGreaterThanOrEqual(radius + gap);
  });

  it.each([
    {
      name: 'heading',
      part: { x: 180, y: 160, width: 220, height: 32 },
      container: { x: 150, y: 120, width: 600, height: 130 },
      anchor: 'top' as const,
      expected: { x: 290, y: 120 },
    },
    {
      name: 'footer action',
      part: { x: 550, y: 500, width: 120, height: 40 },
      container: { x: 150, y: 460, width: 600, height: 120 },
      anchor: 'bottom' as const,
      expected: { x: 610, y: 580 },
    },
  ])(
    'keeps a nested $name leader local inside enclosing panels',
    ({ part, container, anchor, expected }) => {
      const point = placeAnatomyMarker({
        target: part,
        anchor,
        stage,
        obstacles: [stage, { x: 120, y: 80, width: 660, height: 540 }, container, part],
        markers: [],
        offset: 40,
        radius,
        gap,
      });
      expect(point).toEqual(expected);
      const endpoint = closestTargetPoint(point, part);
      expect(Math.hypot(point.x - endpoint.x, point.y - endpoint.y)).toBe(40);
    },
  );

  it('still avoids nearby siblings after ignoring their shared parent', () => {
    const sibling = { x: 400, y: 240, width: 100, height: 40 };
    const options = { target, stage, markers: [], offset: 40, radius, gap };
    const point = placeAnatomyMarker({ ...options, obstacles: [stage, target, sibling] });
    expect(point).toEqual(placeAnatomyMarker({ ...options, obstacles: [sibling] }));
    expect(distanceToRect(point, sibling)).toBeGreaterThanOrEqual(radius + gap);
    expect(distanceToRect(point, target)).toBeGreaterThanOrEqual(radius + gap);
    expect(Math.hypot(point.x - 450, point.y - 260)).toBeLessThan(100);
  });

  it('places a wide body marker beside its own boundary instead of above the adjacent header', () => {
    const panelStage = { x: 0, y: 0, width: 900, height: 800 };
    const body = { x: 100, y: 300, width: 700, height: 350 };
    const header = { x: 100, y: 200, width: 700, height: 100 };
    const point = placeAnatomyMarker({
      target: body,
      anchor: 'top',
      stage: panelStage,
      obstacles: [panelStage, header],
      markers: [],
      offset: 40,
      radius,
      gap,
    });
    expect(point).toEqual({ x: 78, y: 260 });
    expect(distanceToRect(point, header)).toBeGreaterThanOrEqual(radius + gap);
    const endpoint = closestTargetPoint(point, body);
    expect(endpoint).toEqual({ x: 100, y: 300 });
    expect(Math.hypot(point.x - endpoint.x, point.y - endpoint.y)).toBeLessThanOrEqual(
      40 * Math.SQRT2,
    );
  });

  it('moves a crowded resting badge to a nearby position with space for its full title', () => {
    const obstacles = [
      { x: 300, y: 246, width: 100, height: 28 },
      { x: 500, y: 246, width: 100, height: 28 },
    ];
    const size = { width: 180, height: 28 };
    const options = { target, stage, obstacles, markers: [], offset: 40, radius, gap };
    const original = placeAnatomyMarker(options);
    const marker = placeAnatomyMarker({ ...options, labelSize: size });
    expect(original).toEqual({ x: 450, y: 260 });
    expect(marker).not.toEqual(original);
    const label = placeAnatomyLabel({ ...options, marker, size });
    expect(label!.width).toBe(size.width);
    const endpoint = closestTargetPoint(marker, target);
    expect(Math.hypot(marker.x - endpoint.x, marker.y - endpoint.y)).toBeLessThanOrEqual(
      40 * Math.SQRT2,
    );
    for (const obstacle of [target, ...obstacles]) {
      expect(distanceToRect(marker, obstacle)).toBeGreaterThanOrEqual(radius + gap);
      expect(capsuleClearance({ ...label!, height: size.height }, obstacle)).toBeGreaterThanOrEqual(
        gap,
      );
    }
  });

  it('keeps later circles out of earlier title reservations', () => {
    const reservation = { x: 360, y: 246, width: 180, height: 28 };
    const marker = placeAnatomyMarker({
      target,
      stage,
      obstacles: [],
      markers: [],
      offset: 40,
      radius,
      gap,
      reservedRects: [reservation],
      labelSize: { width: 180, height: 28 },
    });
    expect(distanceToRect(marker, reservation)).toBeGreaterThanOrEqual(radius + gap);
    expect(distanceToRect(marker, target)).toBeGreaterThanOrEqual(radius + gap);
  });

  it('chooses the widest available title when the full requested width cannot fit', () => {
    const narrowStage = { x: 0, y: 0, width: 200, height: 300 };
    const part = { x: 30, y: 100, width: 140, height: 40 };
    const size = { width: 300, height: 28 };
    const options = {
      target: part,
      stage: narrowStage,
      obstacles: [],
      markers: [],
      offset: 40,
      radius,
      gap,
    };
    const marker = placeAnatomyMarker({ ...options, labelSize: size });
    const label = placeAnatomyLabel({ ...options, marker, size });
    expect(label!.width).toBe(narrowStage.width);
  });

  it('remains in a full-panel stage when no collision-free point exists', () => {
    const point = placeAnatomyMarker({
      target: stage,
      stage,
      obstacles: [],
      markers: [],
      offset: 40,
      radius,
      gap,
    });
    inside(point, stage, radius);
    expect(point.y).toBe(radius);
  });

  it('honors clearance even with a smaller preferred offset and narrow scaled stage', () => {
    const narrow = { x: 0, y: 0, width: 32, height: 200 };
    const narrowTarget = { x: 0, y: 100, width: 32, height: 30 };
    const point = placeAnatomyMarker({
      target: narrowTarget,
      stage: narrow,
      obstacles: [],
      markers: [],
      offset: 0,
      radius,
      gap,
    });
    inside(point, narrow, radius);
    expect(distanceToRect(point, narrowTarget)).toBeGreaterThanOrEqual(radius + gap);
  });
});

describe('closestTargetPoint', () => {
  it.each([
    [
      { x: 450, y: 260 },
      { x: 450, y: 300 },
    ],
    [
      { x: 450, y: 380 },
      { x: 450, y: 340 },
    ],
    [
      { x: 360, y: 320 },
      { x: 400, y: 320 },
    ],
    [
      { x: 540, y: 320 },
      { x: 500, y: 320 },
    ],
    [
      { x: 360, y: 260 },
      { x: 400, y: 300 },
    ],
    [
      { x: 540, y: 380 },
      { x: 500, y: 340 },
    ],
    [
      { x: 430, y: 300 },
      { x: 430, y: 300 },
    ],
  ])('connects %j to its nearest boundary point %j', (marker, expected) => {
    expect(closestTargetPoint(marker, target)).toEqual(expected);
  });

  it('uses the nearest edge for an interior fallback and resolves equal distances consistently', () => {
    expect(closestTargetPoint({ x: 402, y: 320 }, target)).toEqual({ x: 400, y: 320 });
    expect(closestTargetPoint({ x: 450, y: 320 }, target)).toEqual({ x: 450, y: 300 });
  });

  it('supports a zero-width target boundary', () => {
    expect(closestTargetPoint({ x: 130, y: 80 }, { x: 100, y: 50, width: 0, height: 100 })).toEqual(
      { x: 100, y: 80 },
    );
  });
});

describe('placeAnatomyLabel', () => {
  const size = { width: 180, height: 28 };
  const options = { size, stage, obstacles: [], markers: [], radius, gap };

  it.each([
    { marker: { x: 450, y: 200 }, expected: { x: 360, y: 186, width: 180, direction: 'both' } },
    { marker: { x: 20, y: 200 }, expected: { x: 6, y: 186, width: 180, direction: 'right' } },
    { marker: { x: 880, y: 200 }, expected: { x: 714, y: 186, width: 180, direction: 'left' } },
  ])('expands $expected.direction without moving its anchor', ({ marker, expected }) => {
    const placement = placeAnatomyLabel({ ...options, marker });
    expect(placement).toEqual(expected);
    const rect = { ...placement!, height: size.height };
    inside(marker, rect, radius);
    inside(rect, stage);
    inside({ x: rect.x + rect.width, y: rect.y + rect.height }, stage);
  });

  it('keeps physical component bounds clear when the marker is outside them', () => {
    const component = { x: 500, y: 150, width: 250, height: 200 };
    const placement = placeAnatomyLabel({
      ...options,
      marker: { x: 450, y: 200 },
      obstacles: [component],
    });
    expect(placement).toEqual({ x: 284, y: 186, width: 180, direction: 'left' });
    expect(placement!.x + placement!.width + gap).toBeLessThanOrEqual(component.x);
  });

  it.each([
    { marker: { x: 184, y: 84 }, direction: 'left' },
    { marker: { x: 616, y: 84 }, direction: 'right' },
    { marker: { x: 184, y: 516 }, direction: 'left' },
    { marker: { x: 616, y: 516 }, direction: 'right' },
  ])('expands beside a chart corner at $marker.x,$marker.y', ({ marker, direction }) => {
    const chart = { x: 200, y: 100, width: 400, height: 400 };
    const placement = placeAnatomyLabel({ ...options, marker, gap: 4, obstacles: [chart] });
    expect(placement).not.toBeNull();
    expect(placement!.direction).toBe(direction);
    expect(placement!.width).toBe(size.width);
    const rect = { ...placement!, height: size.height };
    inside(marker, rect, radius);
    inside(rect, stage);
    inside({ x: rect.x + rect.width, y: rect.y + rect.height }, stage);
    expect(capsuleClearance(rect, chart)).toBeGreaterThanOrEqual(4);
  });

  it('uses the rounded cap to preserve a full centered title beside a diagonal badge', () => {
    const marker = { x: 450, y: 200 };
    const other = { x: 550, y: 230 };
    const placement = placeAnatomyLabel({ ...options, marker, markers: [other] });
    expect(placement).toEqual({ x: 360, y: 186, width: 180, direction: 'both' });
    expect(
      capsuleToMarkerClearance({ ...placement!, height: size.height }, other),
    ).toBeGreaterThanOrEqual(radius + gap);
  });

  it('ignores blank enclosing ancestors but still avoids a sibling inside them', () => {
    const marker = { x: 450, y: 200 };
    const sibling = { x: 500, y: 180, width: 80, height: 40 };
    const withoutAncestor = placeAnatomyLabel({ ...options, marker, obstacles: [sibling] });
    const withAncestor = placeAnatomyLabel({
      ...options,
      marker,
      obstacles: [stage, { x: 300, y: 100, width: 400, height: 300 }, sibling],
    });
    expect(withAncestor).toEqual(withoutAncestor);
    expect(withAncestor!.direction).toBe('left');
  });

  it('ignores the same target ancestors as marker placement even when the marker is outside them', () => {
    const part = { x: 220, y: 120, width: 120, height: 28 };
    const chart = { x: 200, y: 100, width: 400, height: 400 };
    const marker = { x: 184, y: 84 };
    const withoutAncestor = placeAnatomyLabel({
      ...options,
      target: part,
      marker,
      obstacles: [part],
    });
    const withAncestor = placeAnatomyLabel({
      ...options,
      target: part,
      marker,
      obstacles: [part, chart, stage],
    });
    expect(withAncestor).toEqual(withoutAncestor);
    expect(withAncestor!.width).toBe(size.width);
    expect(withAncestor!.direction).toBe('both');
    expect(
      capsuleClearance({ ...withAncestor!, height: size.height }, part),
    ).toBeGreaterThanOrEqual(gap);
  });

  it('protects its supplied target even when a fallback badge is inside it', () => {
    const part = { x: 400, y: 180, width: 100, height: 40 };
    expect(
      placeAnatomyLabel({
        ...options,
        marker: { x: 450, y: 200 },
        target: part,
        obstacles: [stage, part],
      }),
    ).toBeNull();
  });

  it('allows a full-stage backdrop label while still protecting its dialog content', () => {
    const dialog = { x: 500, y: 150, width: 200, height: 200 };
    const marker = { x: 450, y: 200 };
    const label = placeAnatomyLabel({
      ...options,
      marker,
      target: stage,
      obstacles: [stage, dialog],
    });
    expect(label).toEqual({ x: 284, y: 186, width: 180, direction: 'left' });
    expect(capsuleClearance({ ...label!, height: size.height }, dialog)).toBeGreaterThanOrEqual(
      gap,
    );
  });

  it('protects a non-ancestor sibling containing the badge instead of treating it as blank space', () => {
    const sibling = { x: 400, y: 180, width: 100, height: 40 };
    expect(
      placeAnatomyLabel({ ...options, marker: { x: 450, y: 200 }, target, obstacles: [sibling] }),
    ).toBeNull();
  });

  it('respects other marker discs and ignores its own repeated marker', () => {
    const marker = { x: 450, y: 200 };
    const other = { x: 550, y: 200 };
    const placement = placeAnatomyLabel({ ...options, marker, markers: [marker, other] });
    expect(placement!.direction).toBe('left');
    expect(
      capsuleToMarkerClearance({ ...placement!, height: size.height }, other),
    ).toBeGreaterThanOrEqual(radius + gap);
  });

  it('does not treat a vertically distant marker as a horizontal blocker', () => {
    expect(
      placeAnatomyLabel({ ...options, marker: { x: 450, y: 200 }, markers: [{ x: 550, y: 160 }] }),
    ).toEqual({ x: 360, y: 186, width: 180, direction: 'both' });
  });

  it('returns the widest shortened direction for an ellipsized title', () => {
    const marker = { x: 30, y: 200 };
    const component = { x: 160, y: 150, width: 200, height: 100 };
    const placement = placeAnatomyLabel({ ...options, marker, obstacles: [component] });
    expect(placement).toEqual({ x: 16, y: 186, width: 136, direction: 'right' });
    inside(marker, { ...placement!, height: size.height }, radius);
    expect(placement!.x + placement!.width + gap).toBe(component.x);
  });

  it('fits the full available viewport width when symmetric shortening is best', () => {
    const narrowStage = { x: 50, y: 100, width: 240, height: 100 };
    expect(
      placeAnatomyLabel({
        ...options,
        marker: { x: 170, y: 150 },
        size: { width: 300, height: 28 },
        stage: narrowStage,
      }),
    ).toEqual({ x: 50, y: 136, width: 240, direction: 'both' });
  });

  it('keeps the circle when adjacent parts leave insufficient expansion space', () => {
    expect(
      placeAnatomyLabel({
        ...options,
        marker: { x: 450, y: 200 },
        obstacles: [
          { x: 400, y: 180, width: 30, height: 40 },
          { x: 470, y: 180, width: 30, height: 40 },
        ],
      }),
    ).toBeNull();
  });

  it.each([
    { x: 450, y: 10 },
    { x: 450, y: 690 },
  ])('never shifts the badge vertically to fit the viewport at %j', (marker) => {
    expect(placeAnatomyLabel({ ...options, marker })).toBeNull();
  });
});
