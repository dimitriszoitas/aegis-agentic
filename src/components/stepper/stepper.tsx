import { componentToken } from '@/lib/component-design-tokens';
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, CircleAlert } from '@/components/icon';
import { cn } from '@/lib/utils';
import './stepper.css';

export type StepperState = 'upcoming' | 'current' | 'complete' | 'error';
export interface StepperStep {
  id: string;
  title: string;
  description?: ReactNode;
  state?: StepperState;
}
export interface StepperProps extends Omit<ComponentProps<'nav'>, 'onChange'> {
  steps: readonly StepperStep[];
  /** Zero-based current step. */
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  onStepChange?: (index: number) => void;
  disabled?: boolean;
}
/** Ordered progress with keyboard access to the current step and completed steps. */
export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  onStepChange,
  disabled = false,
  className,
  ...props
}: StepperProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(currentStep);
  useEffect(() => setFocused(currentStep), [currentStep]);
  const stateFor = (index: number): StepperState =>
    steps[index].state ??
    (index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming');
  const canVisit = (index: number) =>
    !disabled && !!onStepChange && (index === currentStep || stateFor(index) === 'complete');
  const focusable = steps.flatMap((_, index) => (canVisit(index) ? [index] : []));
  const tabStop = focusable.includes(focused) ? focused : focusable[0];
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    if (![nextKey, previousKey, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const position = focusable.indexOf(index);
    const nextPosition =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? focusable.length - 1
          : (position + (event.key === nextKey ? 1 : -1) + focusable.length) % focusable.length;
    refs.current[focusable[nextPosition]]?.focus();
  }
  return (
    <nav
      className={cn('aegis-stepper', className)}
      data-orientation={orientation}
      aria-label="Workflow progress"
      {...props}
    >
      <ol>
        {steps.map((step, index) => {
          const state = stateFor(index);
          const content = (
            <>
              <span className="aegis-stepper-marker" aria-hidden="true">
                {state === 'complete' ? (
                  <Check size={componentToken('navigation.icon-md')} />
                ) : state === 'error' ? (
                  <CircleAlert size={componentToken('navigation.icon-navigation')} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="aegis-stepper-copy">
                <span className="aegis-stepper-title">{step.title}</span>
                {step.description && (
                  <span className="aegis-stepper-description">{step.description}</span>
                )}
                <span className="sr-only">{state === 'error' ? 'Needs attention' : state}</span>
              </span>
            </>
          );
          return (
            <li
              key={step.id}
              data-state={state}
              aria-current={index === currentStep ? 'step' : undefined}
            >
              {onStepChange ? (
                <button
                  type="button"
                  className="aegis-stepper-step"
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  disabled={!canVisit(index)}
                  tabIndex={index === tabStop ? 0 : -1}
                  aria-label={`Step ${index + 1}: ${step.title}, ${state}`}
                  onFocus={() => setFocused(index)}
                  onKeyDown={(event) => navigate(event, index)}
                  onClick={() => {
                    if (index !== currentStep) onStepChange(index);
                  }}
                >
                  {content}
                </button>
              ) : (
                <div className="aegis-stepper-step">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
