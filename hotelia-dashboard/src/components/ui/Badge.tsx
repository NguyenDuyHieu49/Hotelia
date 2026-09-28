import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#edf0ea] text-[#637468]',
  success: 'bg-[#e4f1e6] text-[#315f3e]',
  warning: 'bg-[#fff0d7] text-[#8c5c1f]',
  danger: 'bg-[#fbe9e4] text-[#a04839]',
  info: 'bg-[#e5eef0] text-[#3d6570]',
};

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-md
        ${variantStyles[variant]}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
    >
      {children}
    </span>
  );
}
