interface Props {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const sizes = { sm: 16, md: 24, lg: 36 }

export function LoadingSpinner({ size = 'md', color = 'currentColor' }: Props) {
  const s = sizes[size]
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  )
}
