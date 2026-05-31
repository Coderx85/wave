export function Logger(namespace: string) {
  return {
    info: (message: string, data?: any) =>
      console.log(`[${namespace}] ℹ️  ${message}`, data),
    error: (message: string, error?: any) =>
      console.error(`[${namespace}] ❌ ${message}`, error),
    warn: (message: string, data?: any) =>
      console.warn(`[${namespace}] ⚠️  ${message}`, data),
    debug: (message: string, data?: any) =>
      console.debug(`[${namespace}] 🐛 ${message}`, data),
  };
}
