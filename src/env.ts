import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod/v4'

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string(),
    TAVILY_API_KEY: z.string(),
    USE_TAVILY_CACHE: z.string().optional(),
    SKIP_WRITE: z.string().optional(),
  },

  clientPrefix: 'VITE_',
  client: {},

  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    USE_TAVILY_CACHE: process.env.USE_TAVILY_CACHE,
    SKIP_WRITE: process.env.SKIP_WRITE,
  },

  emptyStringAsUndefined: true,
})
