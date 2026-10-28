import type { AnatomyDefinition } from './types';

export async function loadAnatomyDefinition(id: string): Promise<AnatomyDefinition | undefined> {
  if (id === 'components-data-filepreview')
    return (await import('./file-preview')).filePreviewAnatomy;
  if (id === 'components-data-sortablelist')
    return (await import('./sortable-list')).sortableListAnatomy;
  if (id === 'components-forms-richtexteditor')
    return (await import('./rich-text-editor')).richTextEditorAnatomy;
  if (id === 'components-forms-inlineedit')
    return (await import('./inline-edit')).inlineEditAnatomy;
  if (id === 'components-forms-colorpicker')
    return (await import('./color-picker')).colorPickerAnatomy;
  if (id === 'components-forms-phoneinput')
    return (await import('./phone-input')).phoneInputAnatomy;
  if (id === 'components-forms-datetimepicker')
    return (await import('./date-time-picker')).dateTimePickerAnatomy;
  if (id === 'components-forms-timepicker')
    return (await import('./time-picker')).timePickerAnatomy;
  if (id === 'components-forms-otpinput') return (await import('./otp-input')).otpInputAnatomy;
  if (id === 'components-forms-combobox') return (await import('./combobox')).comboboxAnatomy;
  if (id === 'patterns-unsavednavigationguard')
    return (await import('./unsaved-navigation-guard')).unsavedNavigationGuardAnatomy;
  if (id === 'patterns-appshell') return (await import('./app-shell')).appShellAnatomy;
  if (id === 'patterns-recordeditor') return (await import('./record-editor')).recordEditorAnatomy;
  if (id === 'patterns-resourcestate')
    return (await import('./resource-state')).resourceStateAnatomy;
  if (id === 'patterns-formerrorsummary')
    return (await import('./form-error-summary')).formErrorSummaryAnatomy;
  if (id === 'components-people-presenceindicator')
    return (await import('./presence-indicator')).presenceIndicatorAnatomy;
  if (id === 'components-data-indicator') return (await import('./indicator')).indicatorAnatomy;
  if (id === 'components-forms-passwordinput')
    return (await import('./password-input')).passwordInputAnatomy;
  if (id === 'components-forms-numberinput')
    return (await import('./number-input')).numberInputAnatomy;
  if (id === 'patterns-collectiontoolbar')
    return (await import('./collection-toolbar')).collectionToolbarAnatomy;
  if (id === 'patterns-formsection') return (await import('./form-section')).formSectionAnatomy;
  if (/^components-(ai|charts|code|data|feedback)-/.test(id)) {
    const { dataAnatomy } = await import('./data');
    return dataAnatomy[id];
  }
  if (/^patterns-|^components-(navigation|overlays|lists|layout|utilities)-/.test(id)) {
    const { surfaceAnatomy } = await import('./surfaces');
    return surfaceAnatomy[id];
  }
  const { controlAnatomy } = await import('./controls');
  return controlAnatomy[id];
}
