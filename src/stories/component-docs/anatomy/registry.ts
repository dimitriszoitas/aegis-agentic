import type { AnatomyDefinition } from './types';

export async function loadAnatomyDefinition(id: string): Promise<AnatomyDefinition | undefined> {
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
