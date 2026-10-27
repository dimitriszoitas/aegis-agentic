import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './avatar.css';

export interface AvatarProps extends Omit<ComponentProps<'span'>, 'children'> {
  name: string;
  src?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export function Avatar({
  name,
  src,
  initials,
  size = 'md',
  status,
  className,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const fallback =
    initials ||
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    '?';
  return (
    <span
      className={cn('aegis-avatar', className)}
      data-size={size}
      role="img"
      aria-label={`${name}${status ? `, ${status}` : ''}`}
      title={`${name}${status ? ` · ${status}` : ''}`}
      {...props}
    >
      {src && failedSrc !== src ? (
        <img src={src} alt="" onError={() => setFailedSrc(src)} />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
      {status && <span className="aegis-avatar-status" data-status={status} aria-hidden="true" />}
    </span>
  );
}

export interface AvatarGroupProps extends Omit<ComponentProps<'div'>, 'children'> {
  avatars: readonly AvatarProps[];
  max?: number;
  size?: AvatarProps['size'];
  label?: string;
}
export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  label = 'Assigned members',
  className,
  ...props
}: AvatarGroupProps) {
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 4;
  const overflow = avatars.slice(limit);
  return (
    <div className={cn('aegis-avatar-group', className)} role="group" aria-label={label} {...props}>
      {avatars.slice(0, limit).map((avatar, index) => (
        <Avatar key={`${avatar.name}-${index}`} {...avatar} size={size} />
      ))}
      {overflow.length > 0 && (
        <span
          className="aegis-avatar aegis-avatar-overflow"
          data-size={size}
          role="img"
          aria-label={`${overflow.length} more members: ${overflow.map((avatar) => avatar.name).join(', ')}`}
          title={overflow.map((avatar) => avatar.name).join(', ')}
        >
          +{overflow.length}
        </span>
      )}
    </div>
  );
}
