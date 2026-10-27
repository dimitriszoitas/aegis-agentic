import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentMetadata } from '../types';
import type { AnatomyPart } from './types';
import {
  closestTargetPoint,
  placeAnatomyLabel,
  placeAnatomyMarker,
  type Rect,
} from './anatomy-layout';
import './anatomy.css';

interface MeasuredPart extends AnatomyPart {
  number: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  bounds: { x: number; y: number; width: number; height: number };
}
interface SpecimenData {
  componentId: string;
  parts: AnatomyPart[];
  height: number;
  note?: string;
}

function markerMetrics(stage: HTMLElement) {
  const style = getComputedStyle(stage);
  return {
    offset: parseFloat(style.getPropertyValue('--anatomy-marker-offset')),
    radius: parseFloat(style.getPropertyValue('--anatomy-marker-size')) / 2,
    gap: parseFloat(style.getPropertyValue('--anatomy-clearance')),
    labelGap: parseFloat(style.getPropertyValue('--anatomy-label-clearance')),
  };
}

function visibleBounds(element: Element, scale: number, inset: number): Rect | undefined {
  const rect = element.getBoundingClientRect();
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!rect.width || !rect.height || style?.visibility === 'hidden' || style?.display === 'none')
    return;
  return {
    x: rect.left * scale,
    y: rect.top * scale + inset,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

function hasVisibleSurface(element: Element) {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return false;
  const transparent = (color: string) => color === 'transparent' || color === 'rgba(0, 0, 0, 0)';
  return (
    !transparent(style.backgroundColor) ||
    style.backgroundImage !== 'none' ||
    style.boxShadow !== 'none' ||
    ['top', 'right', 'bottom', 'left'].some(
      (side) =>
        parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
        !transparent(style.getPropertyValue(`border-${side}-color`)),
    )
  );
}

function measureTitles(stage: HTMLElement, parts: AnatomyPart[]) {
  const measure = stage.ownerDocument.createElement('span');
  measure.className = 'anatomy-marker-measure';
  measure.setAttribute('aria-hidden', 'true');
  stage.append(measure);
  try {
    return parts.map((part) => {
      measure.textContent = part.name;
      return Math.ceil(measure.getBoundingClientRect().width);
    });
  } finally {
    measure.remove();
  }
}

function measureParts(
  doc: Document,
  parts: AnatomyPart[],
  width: number,
  height: number,
  scale: number,
  metrics: ReturnType<typeof markerMetrics>,
  titleWidths: number[],
  inset: number,
) {
  const measured: MeasuredPart[] = [];
  const reservedRects: Rect[] = [];
  const targets = parts.flatMap((part, index) => {
    const bounds = Array.from(doc.querySelectorAll(part.selector))
      .map((element) => visibleBounds(element, scale, inset))
      .find(Boolean);
    return bounds ? [{ ...part, number: index + 1, bounds }] : [];
  });
  // Include unannotated content in the actual specimens, as well as portaled parts.
  const obstacles = [
    ...parts.flatMap((part) =>
      Array.from(doc.querySelectorAll(part.selector)).flatMap((element) => {
        const bounds = visibleBounds(element, scale, inset);
        return bounds ? [bounds] : [];
      }),
    ),
    ...Array.from(doc.querySelectorAll('.anatomy-fixture-content [data-anatomy] > *')).flatMap(
      (element) => {
        // Transparent fixture layout boxes are empty space, not component surfaces.
        if (!hasVisibleSurface(element)) return [];
        const bounds = visibleBounds(element, scale, inset);
        return bounds ? [bounds] : [];
      },
    ),
  ];
  for (const part of targets) {
    const { bounds } = part;
    const anchor = part.anchor ?? 'top';
    const labelSize = { width: titleWidths[part.number - 1], height: metrics.radius * 2 };
    const point = placeAnatomyMarker({
      target: bounds,
      anchor,
      stage: {
        x: metrics.gap,
        y: metrics.gap,
        width: Math.max(0, width - 2 * metrics.gap),
        height: Math.max(0, height - 2 * metrics.gap),
      },
      obstacles,
      markers: measured,
      labelSize,
      reservedRects,
      ...metrics,
    });
    // Reserve each title's space for later badges. Titles may share that space,
    // since only one is expanded at a time, but another badge must not block it.
    const label = placeAnatomyLabel({
      marker: point,
      target: bounds,
      size: labelSize,
      stage: {
        x: metrics.labelGap,
        y: metrics.labelGap,
        width: Math.max(0, width - 2 * metrics.labelGap),
        height: Math.max(0, height - 2 * metrics.labelGap),
      },
      obstacles,
      markers: measured,
      radius: metrics.radius,
      gap: metrics.labelGap,
    });
    if (label) reservedRects.push({ ...label, height: labelSize.height });
    const target = closestTargetPoint(point, bounds);
    measured.push({ ...part, ...point, targetX: target.x, targetY: target.y });
  }
  return { parts: measured, obstacles };
}

function AnatomyMarker({
  part,
  parts,
  obstacles,
  width,
  height,
  expanded,
  pinned,
  descriptionId,
  onShow,
  onHide,
  onToggle,
}: {
  part: MeasuredPart;
  parts: MeasuredPart[];
  obstacles: Rect[];
  width: number;
  height: number;
  expanded: boolean;
  pinned: boolean;
  descriptionId: string;
  onShow: () => void;
  onHide: () => void;
  onToggle: () => void;
}) {
  const measure = useRef<HTMLSpanElement>(null);
  const position = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState<ReturnType<typeof placeAnatomyLabel>>(null);
  useLayoutEffect(() => {
    const canvas = position.current?.closest<HTMLElement>('.anatomy-stage');
    if (!expanded || !canvas || !measure.current) {
      setLabel(null);
      return;
    }
    const { radius, labelGap: gap } = markerMetrics(canvas);
    const next = placeAnatomyLabel({
      marker: part,
      target: part.bounds,
      size: { width: Math.ceil(measure.current.getBoundingClientRect().width), height: radius * 2 },
      stage: {
        x: gap,
        y: gap,
        width: Math.max(0, width - 2 * gap),
        height: Math.max(0, height - 2 * gap),
      },
      obstacles,
      markers: parts.filter(({ number }) => number !== part.number),
      radius,
      gap,
    });
    setLabel(next);
  }, [expanded, part, parts, obstacles, width, height]);
  const placement = expanded ? label : null;
  return (
    <span
      ref={position}
      className="anatomy-marker-position"
      data-part={part.number}
      data-active={expanded || undefined}
      style={{ left: part.x, top: part.y }}
    >
      <button
        type="button"
        className="anatomy-marker"
        data-part={part.number}
        data-active={expanded || undefined}
        data-expanded={!!placement || undefined}
        data-expand-direction={placement?.direction}
        style={placement ? { width: placement.width, left: placement.x - part.x } : undefined}
        aria-label={`${part.number}. ${part.name}`}
        aria-describedby={descriptionId}
        aria-pressed={pinned}
        onMouseEnter={onShow}
        onMouseLeave={onHide}
        onFocus={onShow}
        onBlur={onHide}
        onClick={onToggle}
      >
        <span className="anatomy-marker-number" aria-hidden="true">
          {part.number}
        </span>
        <span className="anatomy-marker-title" aria-hidden="true">
          {part.name}
        </span>
      </button>
      <span ref={measure} className="anatomy-marker-measure" aria-hidden="true">
        {part.name}
      </span>
    </span>
  );
}

export function AnatomyDocumentation({ meta }: { meta: ComponentMetadata }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismissedFocus = useRef<HTMLElement | null>(null);
  const descriptionId = useId();
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(320);
  const [inset, setInset] = useState(0);
  const [measurement, setMeasurement] = useState<{ parts: MeasuredPart[]; obstacles: Rect[] }>({
    parts: [],
    obstacles: [],
  });
  const { parts, obstacles } = measurement;
  const [definition, setDefinition] = useState<SpecimenData>();
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [presentation, setPresentation] = useState(() => ({
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    layout: document.documentElement.getAttribute('data-layout-theme') ?? 'fundamental',
  }));
  const viewportWidth = Math.max(720, width);
  const scale = width / viewportWidth;
  const stageHeight = height * scale + inset * 2;
  const source = `iframe.html?id=documentation-anatomy-specimen--specimen&viewMode=story&args=componentId:${meta.id}&globals=theme:${presentation.theme};layoutTheme:${presentation.layout}`;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (stage.current) observer.observe(stage.current);
    const themeObserver = new MutationObserver(() => {
      const next = {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        layout: document.documentElement.getAttribute('data-layout-theme') ?? 'fundamental',
      };
      setPresentation((previous) =>
        previous.theme === next.theme && previous.layout === next.layout ? previous : next,
      );
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-layout-theme'],
    });
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, []);
  useEffect(() => {
    setMeasurement({ parts: [], obstacles: [] });
    setDefinition(undefined);
    setActive(null);
    setPinned(null);
    setError('');
    setHeight(320);
  }, [source]);
  useEffect(() => {
    let attempts = 0;
    const inspect = () => {
      const doc = frame.current?.contentDocument;
      const node = doc?.querySelector<HTMLElement>('[data-anatomy-definition]');
      if (!doc || !node?.dataset.anatomyDefinition) {
        if (++attempts === 100)
          setError('The component example could not load. Reload this page to try again.');
        return;
      }
      const next: SpecimenData = JSON.parse(node.dataset.anatomyDefinition);
      if (next.componentId !== meta.id) return;
      const nextHeight = Math.max(next.height, Math.ceil(node.getBoundingClientRect().height));
      setHeight(nextHeight);
      setDefinition((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      if (!stage.current) return;
      const metrics = markerMetrics(stage.current);
      // Badges keep their readable screen size when the specimen scales down.
      // Retain matching space above and below instead of packing their labels
      // into the scaled component's margins.
      const nextInset =
        scale < 1
          ? Math.ceil(
              Math.max(
                metrics.radius * 2 + metrics.gap * 2 + metrics.labelGap,
                (1 - scale) * metrics.offset * 3,
              ),
            )
          : 0;
      setInset(nextInset);
      const nextMeasurement = measureParts(
        doc,
        next.parts,
        width,
        nextHeight * scale + nextInset * 2,
        scale,
        metrics,
        measureTitles(stage.current, next.parts),
        nextInset,
      );
      setMeasurement((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextMeasurement) ? previous : nextMeasurement,
      );
      setError('');
    };
    // Portals, fonts, and asynchronous content can settle after the story renders.
    // Re-measure quietly so badges also follow responsive layout and scrolling.
    const timer = window.setInterval(inspect, 300);
    inspect();
    return () => window.clearInterval(timer);
  }, [source, meta.id, width, scale]);
  const selected = parts.find((part) => part.number === (active ?? pinned));
  const showPart = (number: number) => {
    clearTimeout(hoverTimer.current);
    dismissedFocus.current = null;
    setActive(number);
  };
  const hidePart = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      const focused = root.current?.querySelector<HTMLElement>(
        '.anatomy-marker:focus, .anatomy-legend-trigger:focus',
      );
      setActive(
        focused && focused !== dismissedFocus.current ? Number(focused.dataset.part) : null,
      );
    }, 100);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const dismiss = (key: string) => {
    if (key === 'Escape') {
      clearTimeout(hoverTimer.current);
      dismissedFocus.current =
        root.current?.querySelector<HTMLElement>(
          '.anatomy-marker:focus, .anatomy-legend-trigger:focus',
        ) ?? null;
      setActive(null);
      setPinned(null);
    }
  };
  return (
    <div ref={root} className="anatomy-documentation" onKeyDown={(event) => dismiss(event.key)}>
      <p>
        Hover or focus a number or description to highlight its part. Click to keep it highlighted;
        press Escape to clear.
      </p>
      <div className="anatomy-viewer">
        <div
          ref={stage}
          className="anatomy-stage"
          role="group"
          style={{ height: stageHeight }}
          aria-label={`${meta.name} annotated anatomy`}
        >
          <iframe
            ref={frame}
            title={`${meta.name} anatomy specimen`}
            src={source}
            tabIndex={-1}
            aria-hidden="true"
            inert
            style={{ width: viewportWidth, height, top: inset, transform: `scale(${scale})` }}
          />
          <svg className="anatomy-connectors" aria-hidden="true" width={width} height={stageHeight}>
            {selected && (
              <rect
                className="anatomy-highlight"
                x={selected.bounds.x - 3}
                y={selected.bounds.y - 3}
                width={selected.bounds.width + 6}
                height={selected.bounds.height + 6}
                rx="5"
              />
            )}
            {parts.map((part) => (
              <line
                key={part.number}
                x1={part.x}
                y1={part.y}
                x2={part.targetX}
                y2={part.targetY}
                className={selected?.number === part.number ? 'is-active' : undefined}
              />
            ))}
          </svg>
          {parts.map((part) => (
            <AnatomyMarker
              key={part.number}
              part={part}
              parts={parts}
              obstacles={obstacles}
              width={width}
              height={stageHeight}
              expanded={selected?.number === part.number}
              pinned={pinned === part.number}
              descriptionId={`${descriptionId}-${part.number}`}
              onShow={() => showPart(part.number)}
              onHide={hidePart}
              onToggle={() => {
                setPinned(pinned === part.number ? null : part.number);
                setActive(null);
              }}
            />
          ))}
          {!definition && (
            <div className="anatomy-loading" role="status">
              {error || 'Loading component anatomy…'}
            </div>
          )}
        </div>
      </div>
      {definition?.note && <p className="anatomy-note">{definition.note}</p>}
      <ol className="anatomy-legend" aria-label={`${meta.name} parts`}>
        {definition?.parts.map((part, index) => (
          <li key={part.name} data-active={selected?.number === index + 1 || undefined}>
            <button
              type="button"
              className="anatomy-legend-trigger"
              data-part={index + 1}
              aria-label={`${index + 1}. ${part.name}`}
              aria-describedby={`${descriptionId}-${index + 1}`}
              aria-pressed={pinned === index + 1}
              onMouseEnter={() => showPart(index + 1)}
              onMouseLeave={hidePart}
              onFocus={() => showPart(index + 1)}
              onBlur={hidePart}
              onClick={() => {
                setPinned(pinned === index + 1 ? null : index + 1);
                setActive(null);
              }}
            >
              <span className="anatomy-legend-number" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{part.name}</strong>
                <span className="anatomy-legend-description" id={`${descriptionId}-${index + 1}`}>
                  {part.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
