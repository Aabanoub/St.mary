import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-2.5 text-base gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-brown-700 hover:bg-brown-800 text-white shadow-sm focus:ring-brown-600 dark:bg-brown-600 dark:hover:bg-brown-500',
      secondary:
        'bg-brown-100 hover:bg-brown-200 text-brown-900 border border-brown-200 focus:ring-brown-400 dark:bg-brown-900/60 dark:hover:bg-brown-800 dark:text-brown-100 dark:border-brown-800',
      outline:
        'border border-brown-300 dark:border-brown-700 text-brown-800 dark:text-brown-200 hover:bg-brown-50 dark:hover:bg-brown-950 focus:ring-brown-500',
      ghost:
        'text-brown-700 dark:text-brown-300 hover:bg-brown-100 dark:hover:bg-brown-900/50 focus:ring-brown-400',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 dark:bg-rose-700 dark:hover:bg-rose-600',
      gold: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        <span>{children}</span>
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
