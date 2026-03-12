import { useState, useEffect, useRef } from 'react'

interface StreamingTextProps {
  text: string
  /** Characters revealed per tick */
  speed?: number
  /** Milliseconds between ticks */
  interval?: number
  className?: string
}

export function StreamingText({
  text,
  speed = 2,
  interval = 16,
  className,
}: StreamingTextProps) {
  // If text is already available on first mount, skip the animation
  const initialTextRef = useRef(text)
  const [visibleLength, setVisibleLength] = useState(() =>
    initialTextRef.current ? initialTextRef.current.length : 0,
  )
  const prevTextRef = useRef(text)

  useEffect(() => {
    // Reset when text changes — but only animate the new portion
    if (text !== prevTextRef.current) {
      // If text grew (streaming in), keep current position to animate the rest
      // If text changed entirely, reset to 0
      const isAppend = text.startsWith(prevTextRef.current)
      if (!isAppend) {
        setVisibleLength(0)
      }
      prevTextRef.current = text
    }

    if (visibleLength >= text.length) return

    const timer = setInterval(() => {
      setVisibleLength((prev) => Math.min(prev + speed, text.length))
    }, interval)

    return () => clearInterval(timer)
  }, [text, visibleLength, speed, interval])

  return (
    <p className={className}>
      {text.slice(0, visibleLength)}
      {visibleLength < text.length && (
        <span className="inline-block w-px h-3.5 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </p>
  )
}
