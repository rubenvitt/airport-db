// Base API utilities

import { sanitizeInput } from '@/utils/security'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export async function fetchApi<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, ...fetchOptions } = options

  // Build URL with query parameters
  const urlObj = new URL(url)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        // Sanitize input parameters to prevent injection
        const sanitizedValue = sanitizeInput(String(value))
        urlObj.searchParams.append(key, sanitizedValue)
      }
    })
  }

  try {
    const response = await fetch(urlObj.toString(), fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      
      let errorData = null
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      throw new ApiError(
        errorData?.error || `API request failed: ${response.statusText}`,
        response.status,
        errorData,
      )
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
    )
  }
}