//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.nitro/**',
      '.output/**',
      'dist/**',
      'build/**',
      '.tanstack/**',
      'node_modules/**'
    ]
  }
]
