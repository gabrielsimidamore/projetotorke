import type { Plataforma } from '@/lib/supabase';
import { PLATAFORMAS } from '@/lib/constants';

/* SVG inline icons para cada plataforma */
const InstagramIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#f09433"/>
        <stop offset="25%"  stopColor="#e6683c"/>
        <stop offset="50%"  stopColor="#dc2743"/>
        <stop offset="75%"  stopColor="#cc2366"/>
        <stop offset="100%" stopColor="#bc1888"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig-grad)" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1" fill="#dc2743"/>
  </svg>
);

const TikTokIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" fill="#69C9D0"/>
  </svg>
);

const YouTubeIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#FF0000"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);

const LinkedInIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#0A66C2"/>
    <path d="M7.5 9.5H5v9h2.5v-9zM6.25 8.3a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9zM19 18.5h-2.5v-4.5c0-1.08-.38-1.82-1.35-1.82-.74 0-1.18.5-1.37.98-.07.17-.09.41-.09.65v4.69H11.2V9.5h2.5v1.07c.4-.6 1.06-1.32 2.55-1.32 1.86 0 3.25 1.22 3.25 3.84v5.41z" fill="white"/>
  </svg>
);

export const PlatformIcon = ({ platform, size = 14 }: { platform: string; size?: number }) => {
  switch (platform) {
    case 'Instagram': return <InstagramIcon size={size} />;
    case 'TikTok':    return <TikTokIcon size={size} />;
    case 'YouTube':   return <YouTubeIcon size={size} />;
    case 'LinkedIn':  return <LinkedInIcon size={size} />;
    default: return null;
  }
};

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PlatformBadge({ platform, size = 'sm', showLabel = true, className = '' }: PlatformBadgeProps) {
  const cfg = PLATAFORMAS[platform as Plataforma];
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  const fontSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';
  const padding  = size === 'sm' ? 'px-1.5 py-0.5 gap-1' : 'px-2 py-1 gap-1.5';

  if (!cfg) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground ${className}`}>
        {platform}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${fontSize} ${padding} ${className}`}
      style={{ backgroundColor: cfg.bg, color: cfg.textColor }}
    >
      <PlatformIcon platform={platform} size={iconSize} />
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}
