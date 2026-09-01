import React from 'react';
import { AttendanceStatus } from '@/types';
import { getStatusBadge } from '@/lib/utils/attendance';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatusBadgeProps {
  status: AttendanceStatus;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showDot = true, className }) => {
  const badgeInfo = getStatusBadge(status);

  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
        badgeInfo.bg,
        badgeInfo.text,
        badgeInfo.border,
        className
      )}
    >
      {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', badgeInfo.dot)} />}
      {badgeInfo.label}
    </span>
  );
};
