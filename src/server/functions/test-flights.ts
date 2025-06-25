// Minimal test server function
import { createServerFn } from '@tanstack/start'

export const testFunction = createServerFn(
  'GET',
  async (): Promise<{ message: string }> => {
    return { message: 'Hello' }
  }
)