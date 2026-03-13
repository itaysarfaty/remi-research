import { createFileRoute } from '@tanstack/react-router'
import { AnimatedAsterisk } from '@/components/animated-asterisk'

export const Route = createFileRoute('/asterisk')({ component: AsteriskTest })

function AsteriskTest() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-12">
      <AnimatedAsterisk className="size-5" />
      <AnimatedAsterisk className="size-10" />
      <AnimatedAsterisk className="size-20" />
    </main>
  )
}
