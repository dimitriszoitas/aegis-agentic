import type { AnatomyDefinition } from './types';

export async function loadAnatomyDefinition(id: string): Promise<AnatomyDefinition | undefined> {
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
