import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { componentTokenGroupValues } from './component-token-group-values';

/** Numeric component design values. This is the source for component-runtime-tokens.css. */
export const componentTokenDefinitions = {
  'icon-dot': {
    value: 7,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-dot',
  },
  'icon-xs': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-xs',
  },
  'icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-compact',
  },
  'icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-sm',
  },
  'icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-inline',
  },
  'icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-md',
  },
  'icon-navigation': {
    value: 17,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-navigation',
  },
  'icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-lg',
  },
  'icon-notification': {
    value: 19,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-notification',
  },
  'icon-xl': {
    value: 20,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-xl',
  },
  'icon-entity': {
    value: 21,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-entity',
  },
  'icon-brand': {
    value: 22,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-brand',
  },
  'icon-default': {
    value: 24,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-default',
  },
  'icon-empty': {
    value: 25,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-empty',
  },
  'icon-display': {
    value: 28,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-icon-display',
  },
  'icon-stroke': {
    value: 1.8,
    unit: '',
    cssVariable: '--group-iconography-measurement-icon-stroke',
  },
  'icon-stroke-thin': {
    value: 1.6,
    unit: '',
    cssVariable: '--group-iconography-measurement-icon-stroke-thin',
  },
  'icon-stroke-strong': {
    value: 2.5,
    unit: '',
    cssVariable: '--group-iconography-measurement-icon-stroke-strong',
  },
  'spinner-track-opacity': {
    value: 0.2,
    unit: '',
    cssVariable: '--group-feedback-measurement-spinner-track-opacity',
  },
  'overlay-offset': {
    value: 7,
    unit: 'px',
    cssVariable: '--group-surface-measurement-overlay-offset',
  },
  'popover-offset': {
    value: 8,
    unit: 'px',
    cssVariable: '--group-surface-measurement-popover-offset',
  },
  'picker-offset': {
    value: 6,
    unit: 'px',
    cssVariable: '--group-input-measurement-picker-offset',
  },
  'submenu-offset': {
    value: 5,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-submenu-offset',
  },
  'overlay-collision-padding': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-surface-measurement-overlay-collision-padding',
  },
  'tooltip-arrow-width': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-tooltip-arrow-width',
  },
  'tooltip-arrow-height': {
    value: 6,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-tooltip-arrow-height',
  },
  'tooltip-delay': {
    value: 300,
    unit: 'ms',
    cssVariable: '--group-feedback-measurement-tooltip-delay',
  },
  'icon-tooltip-delay': {
    value: 350,
    unit: 'ms',
    cssVariable: '--group-iconography-measurement-icon-tooltip-delay',
  },
  'notification-gap': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-notification-gap',
  },
  'notification-duration': {
    value: 5000,
    unit: 'ms',
    cssVariable: '--group-feedback-measurement-notification-duration',
  },
  'notification-center-width': {
    value: 420,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-notification-center-width',
  },
  'notification-skeleton-title-width': {
    value: 68,
    unit: '%',
    cssVariable: '--group-feedback-measurement-notification-skeleton-title-width',
  },
  'notification-skeleton-body-width': {
    value: 94,
    unit: '%',
    cssVariable: '--group-feedback-measurement-notification-skeleton-body-width',
  },
  'notification-skeleton-time-width': {
    value: 35,
    unit: '%',
    cssVariable: '--group-feedback-measurement-notification-skeleton-time-width',
  },
  'onboarding-skeleton-title-width': {
    value: 65,
    unit: '%',
    cssVariable: '--group-workflow-measurement-onboarding-skeleton-title-width',
  },
  'onboarding-skeleton-body-width': {
    value: 90,
    unit: '%',
    cssVariable: '--group-workflow-measurement-onboarding-skeleton-body-width',
  },
  'ai-transcript-follow-threshold': {
    value: 72,
    unit: 'px',
    cssVariable: '--group-ai-measurement-ai-transcript-follow-threshold',
  },
  'filter-picker-width': {
    value: 320,
    unit: 'px',
    cssVariable: '--group-filtering-measurement-filter-picker-width',
  },
  'column-settings-width': {
    value: 240,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-column-settings-width',
  },
  'time-picker-width': {
    value: 480,
    unit: 'px',
    cssVariable: '--group-input-measurement-time-picker-width',
  },
  'time-presets-width': {
    value: 216,
    unit: 'px',
    cssVariable: '--group-input-measurement-time-presets-width',
  },
  'grid-height': {
    value: 520,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-height',
  },
  'grid-row-compact': {
    value: 36,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-row-compact',
  },
  'grid-row-default': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-row-default',
  },
  'grid-row-comfortable': {
    value: 60,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-row-comfortable',
  },
  'grid-select-width': {
    value: 44,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-select-width',
  },
  'grid-expand-width': {
    value: 36,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-expand-width',
  },
  'grid-column-default': {
    value: 180,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-default',
  },
  'grid-column-min': {
    value: 72,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-min',
  },
  'grid-column-max': {
    value: 640,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-max',
  },
  'grid-column-2xs': {
    value: 110,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-2xs',
  },
  'grid-column-xs': {
    value: 120,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-xs',
  },
  'grid-column-sm': {
    value: 130,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-sm',
  },
  'grid-column-sm-plus': {
    value: 135,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-sm-plus',
  },
  'grid-column-md': {
    value: 140,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-md',
  },
  'grid-column-md-plus': {
    value: 150,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-md-plus',
  },
  'grid-column-lg': {
    value: 160,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-lg',
  },
  'grid-column-lg-plus': {
    value: 170,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-lg-plus',
  },
  'grid-column-xl': {
    value: 180,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-xl',
  },
  'grid-column-xl-plus': {
    value: 190,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-xl-plus',
  },
  'grid-column-2xl': {
    value: 220,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-2xl',
  },
  'grid-column-3xl': {
    value: 240,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-3xl',
  },
  'grid-column-4xl': {
    value: 280,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-4xl',
  },
  'grid-column-5xl': {
    value: 320,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-5xl',
  },
  'grid-column-6xl': {
    value: 360,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-column-6xl',
  },
  'grid-id-min-width': {
    value: 104,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-id-min-width',
  },
  'grid-date-width': {
    value: 128,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-date-width',
  },
  'grid-date-min-width': {
    value: 112,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-date-min-width',
  },
  'grid-tags-width': {
    value: 200,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-tags-width',
  },
  'grid-trend-width': {
    value: 210,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-trend-width',
  },
  'grid-actions-width': {
    value: 116,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-actions-width',
  },
  'grid-auto-pin-breakpoint': {
    value: 600,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-auto-pin-breakpoint',
  },
  'grid-resize-step': {
    value: 8,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-resize-step',
  },
  'grid-resize-step-large': {
    value: 24,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-resize-step-large',
  },
  'business-grid-height': {
    value: 560,
    unit: 'px',
    cssVariable: '--group-application-measurement-business-grid-height',
  },
  'business-chart-height': {
    value: 180,
    unit: 'px',
    cssVariable: '--group-application-measurement-business-chart-height',
  },
  'breakpoint-compact': {
    value: 1000,
    unit: 'px',
    cssVariable: '--group-layout-measurement-breakpoint-compact',
  },
  'breakpoint-docked': {
    value: 1280,
    unit: 'px',
    cssVariable: '--group-layout-measurement-breakpoint-docked',
  },
  'chart-height': {
    value: 260,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-height',
  },
  'chart-initial-width': {
    value: 600,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-initial-width',
  },
  'chart-margin-top': {
    value: 10,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-margin-top',
  },
  'chart-margin-right': {
    value: 8,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-margin-right',
  },
  'chart-margin-left': {
    value: -18,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-margin-left',
  },
  'chart-tick-font-size': {
    value: 11,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-tick-font-size',
  },
  'chart-tick-gap': {
    value: 30,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-tick-gap',
  },
  'chart-tick-margin': {
    value: 10,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-tick-margin',
  },
  'chart-y-axis-width': {
    value: 62,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-y-axis-width',
  },
  'chart-stroke': {
    value: 2,
    unit: '',
    cssVariable: '--group-data-viz-measurement-chart-stroke',
  },
  'chart-dot-radius': {
    value: 4,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-dot-radius',
  },
  'chart-grid-dash': {
    value: 3,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-grid-dash',
  },
  'chart-bar-radius': {
    value: 3,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-bar-radius',
  },
  'chart-bar-max-width': {
    value: 42,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-bar-max-width',
  },
  'chart-brush-height': {
    value: 24,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-brush-height',
  },
  'chart-brush-handle-width': {
    value: 8,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-chart-brush-handle-width',
  },
  'chart-cursor-opacity': {
    value: 0.75,
    unit: '',
    cssVariable: '--group-data-viz-measurement-chart-cursor-opacity',
  },
  'chart-area-opacity-top': {
    value: 0.3,
    unit: '',
    cssVariable: '--group-data-viz-measurement-chart-area-opacity-top',
  },
  'chart-area-opacity-bottom': {
    value: 0.025,
    unit: '',
    cssVariable: '--group-data-viz-measurement-chart-area-opacity-bottom',
  },
  'chart-stacked-opacity': {
    value: 0.18,
    unit: '',
    cssVariable: '--group-data-viz-measurement-chart-stacked-opacity',
  },
  'chart-active-color-mix': {
    value: 75,
    unit: '%',
    cssVariable: '--group-data-viz-measurement-chart-active-color-mix',
  },
  'chart-resize-delay': {
    value: 140,
    unit: 'ms',
    cssVariable: '--group-data-viz-measurement-chart-resize-delay',
  },
  'donut-initial-width': {
    value: 500,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-donut-initial-width',
  },
  'donut-inner-radius': {
    value: 62,
    unit: '%',
    cssVariable: '--group-data-viz-measurement-donut-inner-radius',
  },
  'donut-outer-radius': {
    value: 88,
    unit: '%',
    cssVariable: '--group-data-viz-measurement-donut-outer-radius',
  },
  'donut-padding-angle': {
    value: 2,
    unit: '',
    cssVariable: '--group-data-viz-measurement-donut-padding-angle',
  },
  'donut-stroke': {
    value: 3,
    unit: '',
    cssVariable: '--group-data-viz-measurement-donut-stroke',
  },
  'sparkline-width': {
    value: 100,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-width',
  },
  'sparkline-height': {
    value: 28,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-height',
  },
  'sparkline-min-width': {
    value: 24,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-min-width',
  },
  'sparkline-min-height': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-min-height',
  },
  'sparkline-inset': {
    value: 2,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-inset',
  },
  'sparkline-bar-gap': {
    value: 2,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-bar-gap',
  },
  'sparkline-bar-min-width': {
    value: 1,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-bar-min-width',
  },
  'sparkline-bar-radius': {
    value: 1,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-bar-radius',
  },
  'sparkline-baseline-inset': {
    value: 1,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-baseline-inset',
  },
  'sparkline-dot-radius': {
    value: 2,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-sparkline-dot-radius',
  },
  'sparkline-stroke': {
    value: 1.5,
    unit: '',
    cssVariable: '--group-data-viz-measurement-sparkline-stroke',
  },
  'sparkline-area-opacity': {
    value: 0.12,
    unit: '',
    cssVariable: '--group-data-viz-measurement-sparkline-area-opacity',
  },
  'mini-bar-width': {
    value: 120,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-mini-bar-width',
  },
  'mini-bar-height': {
    value: 32,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-mini-bar-height',
  },
  'histogram-height': {
    value: 190,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-histogram-height',
  },
  'metric-skeleton-height': {
    value: 30,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-metric-skeleton-height',
  },
  'metric-skeleton-width': {
    value: 60,
    unit: '%',
    cssVariable: '--group-data-display-measurement-metric-skeleton-width',
  },
  'metric-skeleton-description-width': {
    value: 85,
    unit: '%',
    cssVariable: '--group-data-display-measurement-metric-skeleton-description-width',
  },
  'metric-chart-height': {
    value: 220,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-metric-chart-height',
  },
  'metric-chart-compact-height': {
    value: 80,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-metric-chart-compact-height',
  },
  'metric-chart-min-height': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-metric-chart-min-height',
  },
  'metric-chart-initial-width': {
    value: 480,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-metric-chart-initial-width',
  },
  'gantt-min-width': {
    value: 520,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-min-width',
  },
  'gantt-day-width': {
    value: 42,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-day-width',
  },
  'gantt-week-width': {
    value: 100,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-week-width',
  },
  'gantt-month-width': {
    value: 128,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-month-width',
  },
  'gantt-row-height': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-row-height',
  },
  'gantt-dependency-turn': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-dependency-turn',
  },
  'gantt-milestone-width': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-milestone-width',
  },
  'gantt-task-min-width': {
    value: 5,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-task-min-width',
  },
  'gantt-arrow-size': {
    value: 6,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-gantt-arrow-size',
  },
  'ai-gradient-duration': {
    value: 6000,
    unit: 'ms',
    cssVariable: '--group-ai-measurement-ai-gradient-duration',
  },
  'sheet-size': {
    value: 280,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-size',
  },
  'sheet-min-size': {
    value: 160,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-min-size',
  },
  'sheet-max-size': {
    value: 640,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-max-size',
  },
  'sheet-content-min-size': {
    value: 120,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-content-min-size',
  },
  'sheet-resize-step': {
    value: 20,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-resize-step',
  },
  'sheet-resize-step-large': {
    value: 40,
    unit: 'px',
    cssVariable: '--group-surface-measurement-sheet-resize-step-large',
  },
  'side-sheet-min-width': {
    value: 320,
    unit: 'px',
    cssVariable: '--group-surface-measurement-side-sheet-min-width',
  },
  'side-sheet-max-width': {
    value: 720,
    unit: 'px',
    cssVariable: '--group-surface-measurement-side-sheet-max-width',
  },
  'side-sheet-workspace-min-width': {
    value: 480,
    unit: 'px',
    cssVariable: '--group-surface-measurement-side-sheet-workspace-min-width',
  },
  'side-sheet-resize-step': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-surface-measurement-side-sheet-resize-step',
  },
  'side-sheet-resize-step-large': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-surface-measurement-side-sheet-resize-step-large',
  },
  'grid-header-height': {
    value: 40,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-header-height',
  },
  'grid-detail-estimate-height': {
    value: 180,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-grid-detail-estimate-height',
  },
  'textarea-line-height': {
    value: 20,
    unit: 'px',
    cssVariable: '--group-input-measurement-textarea-line-height',
  },
  'code-min-height': {
    value: 160,
    unit: 'px',
    cssVariable: '--group-code-measurement-code-min-height',
  },
  'code-max-height': {
    value: 520,
    unit: 'px',
    cssVariable: '--group-code-measurement-code-max-height',
  },
  'code-line-height': {
    value: 1.65,
    unit: '',
    cssVariable: '--group-code-measurement-code-line-height',
  },
  'code-border-width': {
    value: 1,
    unit: 'px',
    cssVariable: '--group-code-measurement-code-border-width',
  },
  'code-highlight-width': {
    value: 3,
    unit: 'px',
    cssVariable: '--group-code-measurement-code-highlight-width',
  },
  'diff-max-height': {
    value: 560,
    unit: 'px',
    cssVariable: '--group-code-measurement-diff-max-height',
  },
  'ai-diff-max-height': {
    value: 420,
    unit: 'px',
    cssVariable: '--group-ai-measurement-ai-diff-max-height',
  },
  'yaml-min-height': {
    value: 120,
    unit: 'px',
    cssVariable: '--group-code-measurement-yaml-min-height',
  },
  'json-max-height': {
    value: 480,
    unit: 'px',
    cssVariable: '--group-code-measurement-json-max-height',
  },
  'scroll-area-max-height': {
    value: 360,
    unit: 'px',
    cssVariable: '--group-layout-measurement-scroll-area-max-height',
  },
  'evidence-max-height': {
    value: 320,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-evidence-max-height',
  },
  'progress-indeterminate-width': {
    value: 35,
    unit: '%',
    cssVariable: '--group-feedback-measurement-progress-indeterminate-width',
  },
  'brand-logo-size': {
    value: 32,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-brand-logo-size',
  },
  'brand-catalog-logo-size': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-brand-catalog-logo-size',
  },
  'brand-preview-logo-size': {
    value: 64,
    unit: 'px',
    cssVariable: '--group-iconography-measurement-brand-preview-logo-size',
  },
  'table-column-min-width': {
    value: 64,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-table-column-min-width',
  },
  'table-column-max-width': {
    value: 560,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-table-column-max-width',
  },
  'table-column-minimum': {
    value: 24,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-table-column-minimum',
  },
  'table-character-width': {
    value: 7.5,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-table-character-width',
  },
  'table-cell-chrome-width': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-table-cell-chrome-width',
  },
  'surface.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-surface-measurement-icon-md',
  },
  'ai.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-ai-measurement-icon-inline',
  },
  'ai.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-ai-measurement-icon-sm',
  },
  'ai.icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-ai-measurement-icon-compact',
  },
  'ai.icon-xs': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-ai-measurement-icon-xs',
  },
  'navigation.icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-compact',
  },
  'data-display.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-inline',
  },
  'data-display.icon-xs': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-xs',
  },
  'trigger.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-icon-md',
  },
  'input.icon-stroke-strong': {
    value: 2.5,
    unit: '',
    cssVariable: '--group-input-measurement-icon-stroke-strong',
  },
  'input.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-sm',
  },
  'navigation.icon-navigation': {
    value: 17,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-navigation',
  },
  'navigation.icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-lg',
  },
  'navigation.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-sm',
  },
  'trigger.overlay-collision-padding': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-overlay-collision-padding',
  },
  'trigger.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-icon-sm',
  },
  'trigger.icon-dot': {
    value: 7,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-icon-dot',
  },
  'trigger.overlay-offset': {
    value: 7,
    unit: 'px',
    cssVariable: '--group-trigger-measurement-overlay-offset',
  },
  'data-display.business-grid-height': {
    value: 560,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-business-grid-height',
  },
  'data-display.icon-entity': {
    value: 21,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-entity',
  },
  'data-display.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-sm',
  },
  'data-display.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-md',
  },
  'data-display.chart-resize-delay': {
    value: 140,
    unit: 'ms',
    cssVariable: '--group-data-display-measurement-chart-resize-delay',
  },
  'data-display.icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-data-display-measurement-icon-compact',
  },
  'input.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-md',
  },
  'code.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-code-measurement-icon-sm',
  },
  'feedback.icon-stroke-thin': {
    value: 1.6,
    unit: '',
    cssVariable: '--group-feedback-measurement-icon-stroke-thin',
  },
  'feedback.icon-empty': {
    value: 25,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-icon-empty',
  },
  'input.icon-brand': {
    value: 22,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-brand',
  },
  'input.icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-lg',
  },
  'input.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-inline',
  },
  'trigger.icon-tooltip-delay': {
    value: 350,
    unit: 'ms',
    cssVariable: '--group-trigger-measurement-icon-tooltip-delay',
  },
  'code.icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-code-measurement-icon-compact',
  },
  'code.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-code-measurement-icon-md',
  },
  'surface.icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-surface-measurement-icon-lg',
  },
  'input.overlay-collision-padding': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-input-measurement-overlay-collision-padding',
  },
  'input.icon-compact': {
    value: 13,
    unit: 'px',
    cssVariable: '--group-input-measurement-icon-compact',
  },
  'feedback.icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-icon-lg',
  },
  'feedback.icon-notification': {
    value: 19,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-icon-notification',
  },
  'feedback.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-icon-sm',
  },
  'feedback.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-icon-md',
  },
  'navigation.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-md',
  },
  'layout.icon-xs': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-layout-measurement-icon-xs',
  },
  'navigation.icon-stroke-thin': {
    value: 1.6,
    unit: '',
    cssVariable: '--group-navigation-measurement-icon-stroke-thin',
  },
  'navigation.icon-brand': {
    value: 22,
    unit: 'px',
    cssVariable: '--group-navigation-measurement-icon-brand',
  },
  'feedback.icon-stroke-strong': {
    value: 2.5,
    unit: '',
    cssVariable: '--group-feedback-measurement-icon-stroke-strong',
  },
  'feedback.overlay-offset': {
    value: 7,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-overlay-offset',
  },
  'feedback.overlay-collision-padding': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-feedback-measurement-overlay-collision-padding',
  },
  'code.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-code-measurement-icon-inline',
  },
  'ai-assistance.ai-diff-max-height': {
    value: 420,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-ai-diff-max-height',
  },
  'ai-assistance.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-icon-md',
  },
  'ai-assistance.ai-transcript-follow-threshold': {
    value: 72,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-ai-transcript-follow-threshold',
  },
  'ai-assistance.icon-notification': {
    value: 19,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-icon-notification',
  },
  'ai-assistance.icon-display': {
    value: 28,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-icon-display',
  },
  'application.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-application-measurement-icon-sm',
  },
  'application.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-application-measurement-icon-md',
  },
  'application.breakpoint-compact': {
    value: 1000,
    unit: 'px',
    cssVariable: '--group-application-measurement-breakpoint-compact',
  },
  'application.breakpoint-docked': {
    value: 1280,
    unit: 'px',
    cssVariable: '--group-application-measurement-breakpoint-docked',
  },
  'application.icon-navigation': {
    value: 17,
    unit: 'px',
    cssVariable: '--group-application-measurement-icon-navigation',
  },
  'application.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-application-measurement-icon-inline',
  },
  'application.grid-column-2xs': {
    value: 110,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-2xs',
  },
  'application.grid-column-xs': {
    value: 120,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-xs',
  },
  'application.grid-column-sm': {
    value: 130,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-sm',
  },
  'application.grid-column-sm-plus': {
    value: 135,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-sm-plus',
  },
  'application.grid-column-md': {
    value: 140,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-md',
  },
  'application.grid-column-md-plus': {
    value: 150,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-md-plus',
  },
  'application.grid-column-lg': {
    value: 160,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-lg',
  },
  'application.grid-column-lg-plus': {
    value: 170,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-lg-plus',
  },
  'application.grid-column-xl': {
    value: 180,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-xl',
  },
  'application.grid-column-xl-plus': {
    value: 190,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-xl-plus',
  },
  'application.grid-column-2xl': {
    value: 220,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-2xl',
  },
  'application.grid-column-3xl': {
    value: 240,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-3xl',
  },
  'application.grid-column-4xl': {
    value: 280,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-4xl',
  },
  'application.grid-column-5xl': {
    value: 320,
    unit: 'px',
    cssVariable: '--group-application-measurement-grid-column-5xl',
  },
  'filtering.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-filtering-measurement-icon-md',
  },
  'filtering.column-settings-width': {
    value: 240,
    unit: 'px',
    cssVariable: '--group-filtering-measurement-column-settings-width',
  },
  'filtering.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-filtering-measurement-icon-sm',
  },
  'page-structure.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-page-structure-measurement-icon-md',
  },
  'communication.notification-center-width': {
    value: 420,
    unit: 'px',
    cssVariable: '--group-communication-measurement-notification-center-width',
  },
  'communication.icon-lg': {
    value: 18,
    unit: 'px',
    cssVariable: '--group-communication-measurement-icon-lg',
  },
  'communication.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-communication-measurement-icon-sm',
  },
  'communication.notification-skeleton-title-width': {
    value: 68,
    unit: '%',
    cssVariable: '--group-communication-measurement-notification-skeleton-title-width',
  },
  'communication.notification-skeleton-body-width': {
    value: 94,
    unit: '%',
    cssVariable: '--group-communication-measurement-notification-skeleton-body-width',
  },
  'communication.notification-skeleton-time-width': {
    value: 35,
    unit: '%',
    cssVariable: '--group-communication-measurement-notification-skeleton-time-width',
  },
  'communication.icon-navigation': {
    value: 17,
    unit: 'px',
    cssVariable: '--group-communication-measurement-icon-navigation',
  },
  'workflow.icon-md': {
    value: 16,
    unit: 'px',
    cssVariable: '--group-workflow-measurement-icon-md',
  },
  'workflow.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-workflow-measurement-icon-inline',
  },
  'ai-assistance.popover-offset': {
    value: 8,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-popover-offset',
  },
  'ai-assistance.overlay-collision-padding': {
    value: 12,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-overlay-collision-padding',
  },
  'ai-assistance.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-icon-inline',
  },
  'ai-assistance.icon-sm': {
    value: 14,
    unit: 'px',
    cssVariable: '--group-ai-assistance-measurement-icon-sm',
  },
  'data-viz.metric-chart-height': {
    value: 220,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-metric-chart-height',
  },
  'data-viz.metric-chart-compact-height': {
    value: 80,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-metric-chart-compact-height',
  },
  'data-viz.metric-chart-min-height': {
    value: 48,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-metric-chart-min-height',
  },
  'data-viz.metric-chart-initial-width': {
    value: 480,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-metric-chart-initial-width',
  },
  'data-viz.icon-inline': {
    value: 15,
    unit: 'px',
    cssVariable: '--group-data-viz-measurement-icon-inline',
  },
} as const;

export type ComponentTokenName = keyof typeof componentTokenDefinitions;
export type ComponentTokenNumbers = { [K in ComponentTokenName]: number };
export const componentTokenDefaults = Object.fromEntries(
  Object.entries(componentTokenDefinitions).map(([name, token]) => [name, token.value]),
) as ComponentTokenNumbers;

/** Use CSS variables for DOM and SVG properties that accept lengths or scalar values. */
export function componentTokenVariable(name: ComponentTokenName): string {
  const definition = componentTokenDefinitions[name];
  return 'cssVariable' in definition ? definition.cssVariable : `--component-${name}`;
}

export function componentToken(name: ComponentTokenName): string {
  return `var(${componentTokenVariable(name)})`;
}

/** Group aliases follow the manifest; numeric fallbacks remain safe for SSR. */
export function createComponentRuntimeCss(): string {
  return `/* Generated from tokens/design-tokens.json via componentTokenGroupValues. */\n:root {\n${Object.entries(
    componentTokenDefinitions,
  )
    .map(
      ([name]) =>
        `  ${componentTokenVariable(name as ComponentTokenName)}: ${componentTokenGroupValues[name as ComponentTokenName]};`,
    )
    .join('\n')}\n}\n`;
}

function resolveNumber(name: ComponentTokenName, scope: Element, style: CSSStyleDeclaration) {
  const raw = style.getPropertyValue(componentTokenVariable(name)).trim();
  const simple = raw.match(/^(-?(?:\d*\.)?\d+)\s*(px|rem|em|ms|s|%)?$/);
  if (simple) {
    const value = Number(simple[1]);
    if (simple[2] === 'rem')
      return value * parseFloat(getComputedStyle(scope.ownerDocument.documentElement).fontSize);
    if (simple[2] === 'em') return value * parseFloat(style.fontSize);
    if (simple[2] === 's' && componentTokenDefinitions[name].unit === 'ms') return value * 1000;
    return value;
  }
  if (raw && componentTokenDefinitions[name].unit === 'px') {
    // Resolve calc()/clamp() through CSS itself, including scoped variable overrides.
    const probe = scope.ownerDocument.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;';
    probe.style.marginLeft = raw;
    scope.appendChild(probe);
    const value = parseFloat(getComputedStyle(probe).marginLeft);
    probe.remove();
    if (Number.isFinite(value)) return value;
  }
  return componentTokenDefaults[name];
}

/** Numeric access for non-React measurements and imperative notification APIs. */
export function readComponentTokenNumber(name: ComponentTokenName, scope?: Element): number {
  if (!scope && typeof document === 'undefined') return componentTokenDefaults[name];
  const target = scope ?? document.documentElement;
  return resolveNumber(name, target, getComputedStyle(target));
}

type TokenListener = (values: ComponentTokenNumbers) => void;
const rootListeners = new Set<TokenListener>();
let rootValues: ComponentTokenNumbers | undefined;
let stopRootObserver: (() => void) | undefined;
function subscribeRoot(listener: TokenListener) {
  if (!rootListeners.size) {
    const read = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      rootValues = Object.fromEntries(
        (Object.keys(componentTokenDefinitions) as ComponentTokenName[]).map((name) => [
          name,
          resolveNumber(name, root, style),
        ]),
      ) as ComponentTokenNumbers;
      for (const notify of rootListeners) notify(rootValues);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-layout-theme'],
    });
    window.addEventListener('resize', read);
    stopRootObserver = () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }
  rootListeners.add(listener);
  listener(rootValues ?? componentTokenDefaults);
  return () => {
    rootListeners.delete(listener);
    if (!rootListeners.size) {
      stopRootObserver?.();
      stopRootObserver = undefined;
    }
  };
}

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Numeric bridge for libraries that measure pixels. SSR and first hydration use the same
 * defaults. CSS overrides resolve before paint and update on scoped theme/style changes.
 * Explicit component props should take precedence over these fallback values.
 */
export function useComponentTokenNumbers<K extends ComponentTokenName>(
  names: readonly K[],
  scopeRef?: RefObject<Element | null>,
): Pick<ComponentTokenNumbers, K> {
  const key = names.join('|');
  const namesRef = useRef(names);
  namesRef.current = names;
  const [overrides, setOverrides] = useState<Partial<ComponentTokenNumbers>>({});
  useClientLayoutEffect(() => {
    const selected = namesRef.current;
    const update = (values: Partial<ComponentTokenNumbers>) => {
      setOverrides((previous) =>
        selected.every((name) => previous[name] === values[name]) ? previous : values,
      );
    };
    if (!scopeRef?.current) return subscribeRoot(update);
    const scope = scopeRef.current;
    const read = () => {
      const style = getComputedStyle(scope);
      const values = Object.fromEntries(
        selected.map((name) => [name, resolveNumber(name, scope, style)]),
      );
      update(values);
    };
    read();
    const observer = new MutationObserver(read);
    let ancestor: Element | null = scope;
    while (ancestor) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-layout-theme'],
      });
      ancestor = ancestor.parentElement;
    }
    window.addEventListener('resize', read);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [key, scopeRef]);
  return useMemo(
    () =>
      Object.fromEntries(
        (key ? (key.split('|') as K[]) : []).map((name) => [
          name,
          overrides[name] ?? componentTokenDefaults[name],
        ]),
      ) as Pick<ComponentTokenNumbers, K>,
    [key, overrides],
  );
}
