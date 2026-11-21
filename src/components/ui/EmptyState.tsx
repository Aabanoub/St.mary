import React from 'react';
import { Button } from './Button';
import { LucideIcon, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-brown-200 dark:border-brown-800/80 bg-brown-50/40 dark:bg-brown-950/20 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center text-brown-700 dark:text-brown-300 mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-base md:text-lg text-brown-900 dark:text-brown-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-brown-600 dark:text-brown-400 max-w-sm mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
