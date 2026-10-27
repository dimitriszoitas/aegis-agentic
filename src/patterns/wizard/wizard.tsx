import { componentToken } from '@/lib/component-design-tokens';
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check } from '@/components/icon';
import { Button } from '@/components/button';
import { Banner } from '@/components/banner';
import { ConfirmDialog } from '@/components/modal';
import { Stepper, type StepperStep } from '@/components/stepper';
import { cn } from '@/lib/utils';
import './wizard.css';

export type WizardValidation = boolean | string | void;
export interface WizardStep extends Omit<StepperStep, 'state'> {
  content: ReactNode;
  /** Return false or an error message to keep the user on this step. Async validation is supported. */
  validate?: () => WizardValidation | Promise<WizardValidation>;
}
export interface WizardProps extends Omit<ComponentProps<'section'>, 'title' | 'onError'> {
  title: string;
  description?: ReactNode;
  steps: readonly WizardStep[];
  /** Zero-based controlled index. */
  currentStep: number;
  onStepChange: (step: number) => void;
  onFinish: () => void | Promise<void>;
  onCancel?: () => void;
  dirty?: boolean;
  finishLabel?: string;
  cancelLabel?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Wizard({
  title,
  description,
  steps,
  currentStep,
  onStepChange,
  onFinish,
  onCancel,
  dirty = false,
  finishLabel = 'Finish setup',
  cancelLabel = 'Cancel',
  orientation = 'horizontal',
  className,
  ...props
}: WizardProps) {
  const titleId = useId();
  const contentTitleId = useId();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<{ step: number; message: string } | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(currentStep);
  const activeStepRef = useRef(currentStep);
  activeStepRef.current = currentStep;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (previousStep.current !== currentStep) titleRef.current?.focus();
    previousStep.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  function move(index: number) {
    setError(null);
    onStepChange(index);
  }
  async function advance() {
    if (pendingRef.current || !step) return;
    const index = currentStep;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await step.validate?.();
      if (!mounted.current || activeStepRef.current !== index) return;
      if (result === false || typeof result === 'string') {
        setError({
          step: index,
          message:
            typeof result === 'string' ? result : 'Complete the required fields before continuing.',
        });
        return;
      }
      if (isLast) await onFinish();
      else onStepChange(index + 1);
    } catch (cause) {
      if (mounted.current)
        setError({
          step: index,
          message:
            cause instanceof Error ? cause.message : 'This step could not be completed. Try again.',
        });
    } finally {
      pendingRef.current = false;
      if (mounted.current) setPending(false);
    }
  }
  if (!step) return null;
  return (
    <section
      className={cn('aegis-wizard', className)}
      aria-labelledby={titleId}
      data-orientation={orientation}
      {...props}
    >
      <div className="aegis-wizard-body">
        <div className="aegis-wizard-progress">
          <Stepper
            steps={steps.map((item, index) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              state: error?.step === index ? 'error' : undefined,
            }))}
            currentStep={currentStep}
            onStepChange={move}
            orientation={orientation}
            disabled={pending}
          />
        </div>
        <div className="aegis-wizard-panel">
          <header className="aegis-wizard-header">
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </header>
          <div
            className="aegis-wizard-content"
            aria-labelledby={contentTitleId}
            aria-busy={pending || undefined}
          >
            <div className="aegis-wizard-step-heading">
              <p>
                Step {currentStep + 1} of {steps.length}
              </p>
              <h3 ref={titleRef} tabIndex={-1} id={contentTitleId}>
                {step.title}
              </h3>
            </div>
            {error?.step === currentStep && (
              <Banner intent="destroy" title="Review this step">
                {error.message}
              </Banner>
            )}
            <fieldset className="aegis-wizard-step-content" disabled={pending}>
              <legend className="sr-only">{step.title}</legend>
              {step.content}
            </fieldset>
          </div>
          <footer className="aegis-wizard-footer">
            <div>
              {onCancel && (
                <Button
                  emphasis="ghost"
                  disabled={pending}
                  onClick={() => (dirty ? setGuardOpen(true) : onCancel())}
                >
                  {cancelLabel}
                </Button>
              )}
            </div>
            <div className="row">
              <Button
                emphasis="ghost"
                disabled={pending || currentStep === 0}
                leadingIcon={<ArrowLeft size={componentToken('workflow.icon-inline')} />}
                onClick={() => move(currentStep - 1)}
              >
                Back
              </Button>
              <Button
                intent="function"
                loading={pending}
                trailingIcon={
                  isLast ? (
                    <Check size={componentToken('workflow.icon-inline')} />
                  ) : (
                    <ArrowRight size={componentToken('workflow.icon-inline')} />
                  )
                }
                onClick={advance}
              >
                {isLast ? finishLabel : 'Continue'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
      <ConfirmDialog
        open={guardOpen}
        onOpenChange={setGuardOpen}
        title="Discard your changes?"
        description="Your unfinished setup will be lost. You can stay here to continue editing."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setGuardOpen(false);
          onCancel?.();
        }}
      />
    </section>
  );
}
