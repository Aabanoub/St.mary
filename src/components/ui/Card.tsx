import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({ children, className = '', hoverEffect = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#231b15] border border-brown-200/80 dark:border-brown-900/80 rounded-xl p-5 shadow-warm ${
        hoverEffect ? 'hover:shadow-warm-lg hover:border-brown-300 dark:hover:border-brown-700 transition-all' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-brown-100 dark:border-brown-900/50">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-lg bg-brown-50 dark:bg-brown-900/60 text-brown-700 dark:text-brown-300">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-bold text-brown-950 dark:text-brown-50 text-base md:text-lg">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs md:text-sm text-brown-600 dark:text-brown-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
