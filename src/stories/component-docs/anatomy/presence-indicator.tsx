import { PresenceIndicator } from '@/components/presence-indicator';
import type { AnatomyDefinition } from './types';
export const presenceIndicatorAnatomy: AnatomyDefinition = {
  render: () => <PresenceIndicator status="away" label="Away until tomorrow" />,
  parts: [
    {
      name: 'Presence dot',
      selector: '.aegis-presence-dot',
      description: 'A decorative semantic availability color.',
      anchor: 'bottom',
    },
    {
      name: 'Label',
      selector: '.aegis-presence-label',
      description: 'Visible text communicates presence without requiring color perception.',
      anchor: 'bottom',
    },
  ],
};
