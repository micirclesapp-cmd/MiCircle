/**
 * Avatar Utilities
 * 
 * Generates preset avatars when user doesn't have Google photo
 */

export interface PresetAvatar {
  id: string;
  label: string;
  bgColor: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'avatar-blue', label: 'Blue', bgColor: '#0066CC' },
  { id: 'avatar-red', label: 'Red', bgColor: '#FF3B30' },
  { id: 'avatar-green', label: 'Green', bgColor: '#2ECC71' },
  { id: 'avatar-purple', label: 'Purple', bgColor: '#9C27B0' },
  { id: 'avatar-orange', label: 'Orange', bgColor: '#FF9500' },
  { id: 'avatar-pink', label: 'Pink', bgColor: '#FF1493' },
  { id: 'avatar-teal', label: 'Teal', bgColor: '#17A697' },
  { id: 'avatar-indigo', label: 'Indigo', bgColor: '#4F46E5' },
];

/**
 * Get a preset avatar based on user ID
 * Ensures consistent avatar per user (same avatar on different devices)
 */
export const getPresetAvatarForUser = (uid: string): PresetAvatar => {
  // Use hash of uid to select consistent avatar
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % PRESET_AVATARS.length;
  return PRESET_AVATARS[index];
};

/**
 * Generate avatar SVG data URI for fallback
 */
export const generateAvatarSvg = (
  initials: string = '?',
  bgColor: string = '#0066CC'
): string => {
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text x="50" y="60" font-size="48" font-weight="bold" fill="white" 
            text-anchor="middle" font-family="Arial">
        ${initials.toUpperCase()}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

/**
 * Extract initials from display name
 */
export const getInitials = (displayName: string): string => {
  const parts = displayName.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
};
