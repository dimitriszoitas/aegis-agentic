import { Indicator } from '@/components/indicator';
import { Button } from '@/components/button';
import type { AnatomyDefinition } from './types';
export const indicatorAnatomy: AnatomyDefinition = {
  render: () => (
    <Indicator count={120} label="120 unread notifications">
      <Button>Notifications</Button>
    </Indicator>
  ),
  parts: [
    {
      name: 'Target',
      selector: '.aegis-indicator-target',
      description: 'Existing interactive content keeps its own semantics and events.',
      anchor: 'bottom',
    },
    {
      name: 'Marker',
      selector: '.aegis-indicator-marker',
      description:
        'CountBadge displays a capped count while the accessible name carries the full meaning.',
      anchor: 'bottom',
    },
  ],
};
