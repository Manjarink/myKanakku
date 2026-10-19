interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} rounded-full border-primary-500/30 border-t-primary-500 animate-spin`}
        style={{ borderWidth: size === 'lg' ? '3px' : '2px' }}
      />
    </div>
  );
}
