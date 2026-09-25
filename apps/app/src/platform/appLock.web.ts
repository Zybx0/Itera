/** The web build has no biometric lock: browser sessions rely on the OS session lock. */
export const appLockSupported = false;
export async function canUseAppLock(): Promise<boolean> {
  return false;
}
export async function isAppLockEnabled(): Promise<boolean> {
  return false;
}
export async function setAppLockEnabled(_enabled: boolean): Promise<void> {}
export async function authenticate(_reason: string): Promise<boolean> {
  return true;
}
