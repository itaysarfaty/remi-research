import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return defaultMessage
}
