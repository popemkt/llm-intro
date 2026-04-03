import type { DataProvider } from './types'
import { createApiProvider } from './api-provider'
import { createStaticProvider } from './static-provider'

export type { DataProvider } from './types'
export type { ExportData } from './static-provider'

export const data: DataProvider = window.__EXPORT_DATA__
  ? createStaticProvider(window.__EXPORT_DATA__)
  : createApiProvider()
