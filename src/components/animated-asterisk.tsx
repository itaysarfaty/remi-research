import { motion } from 'framer-motion'

export function AnimatedAsterisk({ className = 'size-5' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 22 22"
      className={className}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      {/* Simple cross / plus */}
      <line x1="11" y1="3" x2="11" y2="19" stroke="var(--foreground)" strokeWidth="1.5" />
      <line x1="3" y1="11" x2="19" y2="11" stroke="var(--foreground)" strokeWidth="1.5" />
    </motion.svg>
  )
}
