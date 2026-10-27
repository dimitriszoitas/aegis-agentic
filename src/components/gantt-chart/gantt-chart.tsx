import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SegmentedControl } from '@/components/segmented-control';
import { cn } from '@/lib/utils';
import { calendarDay, DAY, ganttModel, type GanttScale, type GanttTask } from './gantt-model';
import './gantt-chart.css';
export type { GanttScale, GanttTask } from './gantt-model';
export interface GanttChartProps {
  title: string;
  description?: string;
  tasks: readonly GanttTask[];
  scale?: GanttScale;
  defaultScale?: GanttScale;
  onScaleChange?: (scale: GanttScale) => void;
  onTaskSelect?: (task: GanttTask) => void;
  selectedTaskId?: string;
  /** An explicit ISO date keeps server and client rendering deterministic. */
  today?: string;
  showControls?: boolean;
  className?: string;
}
/** Read-only schedule with selectable tasks. Editing and persistence belong to the host. */
export function GanttChart({
  title,
  description,
  tasks,
  scale: controlled,
  defaultScale = 'week',
  onScaleChange,
  onTaskSelect,
  selectedTaskId,
  today,
  showControls = true,
  className,
}: GanttChartProps) {
  const tokens = useComponentTokenNumbers([
    'gantt-arrow-size',
    'gantt-min-width',
    'gantt-day-width',
    'gantt-week-width',
    'gantt-month-width',
    'gantt-row-height',
    'gantt-dependency-turn',
    'gantt-milestone-width',
    'gantt-task-min-width',
    'chart-resize-delay',
  ]);
  const [local, setLocal] = useState<GanttScale>(defaultScale);
  const scale = controlled ?? local;
  const model = ganttModel(tasks, scale);
  const titleId = useId();
  const markerId = useId().replace(/:/g, '');
  const viewportRef = useRef<HTMLDivElement>(null);
  const taskHeadingRef = useRef<HTMLDivElement>(null);
  const [availablePlotWidth, setAvailablePlotWidth] = useState(0);
  const hasTimeline = model.rows.length > 0 && !model.tooLong;
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const taskHeading = taskHeadingRef.current;
    if (!hasTimeline || !viewport || !taskHeading) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const available = Math.max(
        0,
        viewport.clientWidth - taskHeading.getBoundingClientRect().width,
      );
      setAvailablePlotWidth((previous) =>
        Math.abs(previous - available) < 0.5 ? previous : available,
      );
    };
    measure();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, tokens['chart-resize-delay']);
    });
    observer.observe(viewport);
    observer.observe(taskHeading);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [hasTimeline, tokens]);
  const plotWidth = Math.max(
    tokens['gantt-min-width'],
    availablePlotWidth,
    model.columns.length *
      (scale === 'day'
        ? tokens['gantt-day-width']
        : scale === 'week'
          ? tokens['gantt-week-width']
          : tokens['gantt-month-width']),
  );
  const todayTime = today ? calendarDay(today) : null;
  const x = (date: number) => ((date - model.start) / DAY / (model.days || 1)) * plotWidth;
  const edges = model.rows.flatMap((task, index) =>
    (task.dependencies ?? []).flatMap((id) => {
      const parent = model.rows.findIndex((row) => row.id === id);
      if (parent < 0 || parent === index) return [];
      const from = model.rows[parent];
      const x1 = x(from.endTime + DAY),
        x2 = x(task.startTime),
        y1 = (parent + 0.5) * tokens['gantt-row-height'],
        y2 = (index + 0.5) * tokens['gantt-row-height'];
      const turn =
        x2 > x1 + tokens['gantt-dependency-turn']
          ? x1 + (x2 - x1) / 2
          : Math.max(x1, x2) + tokens['gantt-dependency-turn'];
      return [{ id: `${id}-${task.id}`, path: `M ${x1} ${y1} H ${turn} V ${y2} H ${x2}` }];
    }),
  );
  return (
    <section className={cn('aegis-gantt', className)} aria-labelledby={titleId}>
      <header className="aegis-gantt-header">
        <div>
          <h3 id={titleId}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {showControls && (
          <SegmentedControl
            label={`${title} time scale`}
            value={scale}
            onValueChange={(next) => {
              if (controlled === undefined) setLocal(next as GanttScale);
              onScaleChange?.(next as GanttScale);
            }}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            size="sm"
          />
        )}
      </header>
      {model.invalid.length > 0 && (
        <p className="aegis-gantt-notice" role="status">
          {model.invalid.length} {model.invalid.length === 1 ? 'task has' : 'tasks have'} invalid
          dates or duplicate identifiers: {model.invalid.join(', ')}.
        </p>
      )}
      {model.tooLong ? (
        <p className="aegis-gantt-empty">Choose a schedule spanning five years or less.</p>
      ) : !model.rows.length ? (
        <p className="aegis-gantt-empty">No scheduled tasks yet.</p>
      ) : (
        <>
          <div
            ref={viewportRef}
            className="aegis-gantt-scroll"
            role="region"
            aria-label={`${title} timeline`}
            tabIndex={0}
          >
            <div
              className="aegis-gantt-canvas"
              style={{ '--gantt-width': `${plotWidth}px` } as CSSProperties}
            >
              <div ref={taskHeadingRef} className="aegis-gantt-column-heading">
                Task
              </div>
              <div className="aegis-gantt-axis" aria-hidden="true">
                {model.columns.map((column) => (
                  <span key={column.start} style={{ width: x(column.end) - x(column.start) }}>
                    {column.label}
                  </span>
                ))}
              </div>
              <div className="aegis-gantt-labels">
                {model.rows.map((task) => (
                  <div key={task.id}>
                    <strong title={task.label}>{task.label}</strong>
                    {task.owner && <small title={task.owner}>{task.owner}</small>}
                  </div>
                ))}
              </div>
              <div className="aegis-gantt-plot">
                <div className="aegis-gantt-grid" aria-hidden="true">
                  {model.columns.map((column) => (
                    <span key={column.start} style={{ width: x(column.end) - x(column.start) }} />
                  ))}
                </div>
                {todayTime !== null && todayTime >= model.start && todayTime < model.end && (
                  <div
                    className="aegis-gantt-today"
                    style={{ left: x(todayTime) + x(model.start + DAY) / 2 }}
                    aria-label={`Today: ${today}`}
                  >
                    <span>Today</span>
                  </div>
                )}
                <svg
                  className="aegis-gantt-dependencies"
                  width={plotWidth}
                  height={model.rows.length * tokens['gantt-row-height']}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id={markerId}
                      viewBox="0 0 6 6"
                      markerWidth={tokens['gantt-arrow-size']}
                      markerHeight={tokens['gantt-arrow-size']}
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" />
                    </marker>
                  </defs>
                  {edges.map((edge) => (
                    <path key={edge.id} d={edge.path} markerEnd={`url(#${markerId})`} />
                  ))}
                </svg>
                {model.rows.map((task) => {
                  const label = `${task.label}, ${task.milestone ? 'milestone on' : 'from'} ${task.start}${task.milestone ? '' : ` to ${task.end}, ${task.progress}% complete`}${task.owner ? `, owner ${task.owner}` : ''}${task.dependencies?.length ? `, depends on ${task.dependencies.map((id) => model.rows.find((row) => row.id === id)?.label ?? id).join(', ')}` : ''}`;
                  const style = {
                    left: x(task.startTime),
                    width: Math.max(
                      task.milestone
                        ? tokens['gantt-milestone-width']
                        : tokens['gantt-task-min-width'],
                      x(task.endTime + DAY) - x(task.startTime),
                    ),
                  };
                  const contents = (
                    <>
                      <span
                        className="aegis-gantt-progress"
                        style={{ width: `${task.progress}%` }}
                      />
                      {!task.milestone && (
                        <span className="aegis-gantt-bar-label">{task.label}</span>
                      )}
                    </>
                  );
                  return (
                    <div key={task.id} className="aegis-gantt-row">
                      {onTaskSelect ? (
                        <button
                          type="button"
                          className="aegis-gantt-bar"
                          data-intent={task.intent ?? 'function'}
                          data-milestone={task.milestone || undefined}
                          data-selected={selectedTaskId === task.id || undefined}
                          style={style}
                          title={label}
                          aria-label={label}
                          aria-pressed={
                            selectedTaskId === undefined ? undefined : selectedTaskId === task.id
                          }
                          onClick={() => onTaskSelect(task)}
                        >
                          {contents}
                        </button>
                      ) : (
                        <div
                          className="aegis-gantt-bar"
                          data-intent={task.intent ?? 'function'}
                          data-milestone={task.milestone || undefined}
                          style={style}
                          title={label}
                          role="img"
                          aria-label={label}
                        >
                          {contents}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <details className="aegis-gantt-data">
            <summary>View schedule data</summary>
            <div
              className="aegis-gantt-table-scroll"
              role="region"
              aria-label={`${title} schedule data`}
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">{title} schedule data</caption>
                <thead>
                  <tr>
                    {['Task', 'Start', 'End', 'Progress', 'Owner', 'Dependencies'].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((task) => (
                    <tr key={task.id}>
                      <th scope="row">
                        {task.label}
                        {task.milestone ? ' (milestone)' : ''}
                      </th>
                      <td>{task.start}</td>
                      <td>{task.milestone ? task.start : task.end}</td>
                      <td>{task.progress}%</td>
                      <td>{task.owner ?? 'Unassigned'}</td>
                      <td>
                        {task.dependencies
                          ?.map(
                            (id) =>
                              model.rows.find((row) => row.id === id)?.label ??
                              `Unknown task (${id})`,
                          )
                          .join(', ') || 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
