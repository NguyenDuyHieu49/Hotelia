import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md', ...props }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div {...props} className={`bg-[#fffefa] rounded-[0.8rem] border border-[#e1e8df] shadow-[0_8px_25px_rgba(35,64,45,0.035)] ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
