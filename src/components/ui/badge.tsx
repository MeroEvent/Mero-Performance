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
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors',
        badgeInfo.bg,
        badgeInfo.text,
        badgeInfo.border,
        className
      )}
    >
      {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full', badgeInfo.dot)} />}
      {badgeInfo.label}
    </span>
  );
};
