interface OrganicLineProps {
  className?: string
}

export function OrganicLine({ className }: OrganicLineProps) {
  return (
    <svg
      viewBox="0 0 10 100"
      preserveAspectRatio="none"
      className={className}
      style={{ width: 1, overflow: 'visible' }}
    >
      <line
        x1="5"
        y1="0"
        x2="5"
        y2="100"
        stroke="var(--border)"
        strokeWidth="1"
      />
    </svg>
  )
}
