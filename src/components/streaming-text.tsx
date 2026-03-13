import { useState, useEffect, useRef } from 'react'

interface StreamingTextProps {
  text: string
  /** Characters revealed per tick */
  speed?: number
  /** Milliseconds between ticks */
  interval?: number
  className?: string
  /** Kept for API compat but ignored — always uses line cursor */
  blobCursor?: boolean
}

export function StreamingText({
  text,
  speed = 2,
  interval = 16,
  className,
}: StreamingTextProps) {
  const [visibleLength, setVisibleLength] = useState(0)
  const prevTextRef = useRef(text)

  useEffect(() => {
    if (text !== prevTextRef.current) {
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

  const showCursor = visibleLength < text.length

  return (
    <p className={className}>
      {text.slice(0, visibleLength)}
      {showCursor && <span className="typing-cursor" />}
    </p>
  )
}
