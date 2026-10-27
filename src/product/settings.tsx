import { PageHeader } from '@/patterns/page-header';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/card';
import { Field } from '@/components/field';
import { ConfirmDialog } from '@/components/modal';
import { SegmentedControl } from '@/components/segmented-control';
import { Select } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { createInitialState, downloadJson } from './model';
import type { FormaSettings, FormaStore } from './types';

type WorkspaceErrors = Partial<Record<'workspace' | 'email', string>>;

export function SettingsPage({ state, update, notice }: FormaStore) {
  const [workspace, setWorkspace] = useState(state.settings.workspace);
  const [email, setEmail] = useState(state.settings.email);
  const [errors, setErrors] = useState<WorkspaceErrors>({});
  const workspaceRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dirty = workspace !== state.settings.workspace || email !== state.settings.email;

  function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextWorkspace = workspace.trim();
    const nextEmail = email.trim();
    const nextErrors: WorkspaceErrors = {};
    if (!nextWorkspace) nextErrors.workspace = 'Enter a workspace name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))
      nextErrors.email = 'Enter a valid contact email.';
    setErrors(nextErrors);
    if (nextErrors.workspace || nextErrors.email) {
      (nextErrors.workspace ? workspaceRef : emailRef).current?.focus();
      return;
    }
    update((current) => ({
      ...current,
      settings: { ...current.settings, workspace: nextWorkspace, email: nextEmail },
    }));
    setWorkspace(nextWorkspace);
    setEmail(nextEmail);
    notice('Workspace details updated.');
  }

  function discardWorkspaceChanges() {
    setWorkspace(state.settings.workspace);
    setEmail(state.settings.email);
    setErrors({});
  }

  function changePreference<Key extends 'theme' | 'density' | 'currency'>(
    key: Key,
    value: FormaSettings[Key],
  ) {
    update((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function exportWorkspace() {
    try {
      downloadJson(`forma-workspace-${new Date().toISOString().slice(0, 10)}.json`, state);
      notice('Workspace export downloaded.');
    } catch {
      notice('The export could not be downloaded. Please try again.');
    }
  }

  function resetWorkspace() {
    const initial = createInitialState();
    update(() => initial);
    setWorkspace(initial.settings.workspace);
    setEmail(initial.settings.email);
    setErrors({});
    notice('Demo workspace restored to its original data and preferences.');
  }

  return (
    <div className="forma-page">
      <PageHeader
        title="Settings"
        description="Manage your workspace details, appearance, and preferences."
      />

      <div className="forma-two-col">
        <Card aria-labelledby="forma-workspace-title">
          <form onSubmit={saveWorkspace} noValidate>
            <CardHeader>
              <CardTitle id="forma-workspace-title">Workspace details</CardTitle>
              <CardDescription>Your workspace name and primary contact.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="forma-stack">
                <Field label="Workspace name" required error={errors.workspace}>
                  <TextInput
                    ref={workspaceRef}
                    name="workspace"
                    autoComplete="organization"
                    value={workspace}
                    maxLength={80}
                    onValueChange={(value) => {
                      setWorkspace(value);
                      setErrors((current) => ({ ...current, workspace: undefined }));
                    }}
                  />
                </Field>
                <Field
                  label="Contact email"
                  required
                  error={errors.email}
                  helpText="Saved as a contact detail. This demo does not send email."
                >
                  <TextInput
                    ref={emailRef}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    maxLength={254}
                    onValueChange={(value) => {
                      setEmail(value);
                      setErrors((current) => ({ ...current, email: undefined }));
                    }}
                  />
                </Field>
                <p className="forma-muted" role="status">
                  {dirty
                    ? 'You have unsaved workspace changes.'
                    : 'Workspace details are up to date.'}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" intent="function" disabled={!dirty}>
                Save changes
              </Button>
              <Button emphasis="ghost" disabled={!dirty} onClick={discardWorkspaceChanges}>
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card aria-labelledby="forma-preferences-title">
          <CardHeader>
            <CardTitle id="forma-preferences-title">Appearance & preferences</CardTitle>
            <CardDescription>Changes apply immediately across your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="forma-stack">
              <div className="forma-stack">
                <span>Appearance</span>
                <SegmentedControl
                  label="Appearance"
                  value={state.settings.theme}
                  options={[
                    { label: 'Dark', value: 'dark' },
                    { label: 'Light', value: 'light' },
                  ]}
                  onValueChange={(value) =>
                    changePreference('theme', value as FormaSettings['theme'])
                  }
                  fullWidth
                />
              </div>
              <div className="forma-stack">
                <span>Table density</span>
                <SegmentedControl
                  label="Table density"
                  value={state.settings.density}
                  options={[
                    { label: 'Compact', value: 'compact' },
                    { label: 'Default', value: 'default' },
                    { label: 'Comfortable', value: 'comfortable' },
                  ]}
                  onValueChange={(value) =>
                    changePreference('density', value as FormaSettings['density'])
                  }
                  fullWidth
                  wrap
                />
              </div>
              <Field
                label="Display currency"
                helpText="Demo amounts keep their numeric value. Currency changes do not convert exchange rates."
              >
                <Select
                  value={state.settings.currency}
                  options={[
                    { value: 'USD', label: 'USD — US dollar' },
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'GBP', label: 'GBP — British pound' },
                  ]}
                  onValueChange={(value) =>
                    changePreference('currency', value as FormaSettings['currency'])
                  }
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card aria-labelledby="forma-data-title">
        <CardHeader>
          <CardTitle id="forma-data-title">Your workspace data</CardTitle>
          <CardDescription>
            This demo saves changes in this browser. Export a backup before clearing browser data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="forma-summary-grid">
            <div className="forma-summary">
              <span>Users</span>
              <strong>{state.users.length}</strong>
            </div>
            <div className="forma-summary">
              <span>Products</span>
              <strong>{state.products.length}</strong>
            </div>
            <div className="forma-summary">
              <span>Invoices</span>
              <strong>{state.invoices.length}</strong>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="forma-toolbar">
            <Button emphasis="secondary" onClick={exportWorkspace}>
              Export workspace
            </Button>
            <ConfirmDialog
              title="Reset this demo workspace?"
              description="This replaces all users, products, invoices, and preferences with the original demo data. Export a backup first if you want to keep your changes."
              trigger={
                <Button intent="destroy" emphasis="secondary">
                  Reset demo data
                </Button>
              }
              confirmLabel="Reset demo data"
              confirmationText="RESET"
              onConfirm={resetWorkspace}
            />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
