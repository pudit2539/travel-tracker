// src/components/CatAvatarBadge.tsx
'use client';

import React from 'react';
import { CatAvatar, getCatAvatar } from '@/lib/avatars';

interface CatAvatarBadgeProps {
  avatarId?: string | null;
  cat?: CatAvatar;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs rounded-lg',
  sm: 'w-7 h-7 text-xs rounded-xl',
  md: 'w-8 h-8 text-sm rounded-xl',
  lg: 'w-9 h-9 text-base rounded-xl',
  xl: 'w-10 h-10 text-lg rounded-2xl',
  '2xl': 'w-12 h-12 text-2xl rounded-2xl',
};

export function CatAvatarBadge({
  avatarId,
  cat: propCat,
  size = 'lg',
  className = '',
}: CatAvatarBadgeProps) {
  const cat = propCat || getCatAvatar(avatarId);
  const sizeClass = sizeClasses[size] || sizeClasses.lg;

  return (
    <div
      className={`${sizeClass} bg-gradient-to-tr ${cat.bgGradient} flex items-center justify-center shadow-2xs overflow-hidden shrink-0 select-none ${className}`}
      title={cat.name}
    >
      {cat.imgUrl ? (
        <img
          src={cat.imgUrl}
          alt={cat.name}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <span className="leading-none">{cat.emoji}</span>
      )}
    </div>
  );
}

export default CatAvatarBadge;
