/**
 * Detects whether the app is running inside a native Capacitor shell (Android/iOS).
 * 
 * IMPORTANT: `window.Capacitor` is ALWAYS defined when `@capacitor/core` is installed,
 * even in a regular web browser. Using `window.Capacitor !== undefined` is WRONG
 * because it returns true on the web too, causing browser users to be treated as
 * native app users.
 * 
 * The correct check is `Capacitor.isNativePlatform()` which returns:
 *   - true  → running inside the Android/iOS native shell
 *   - false → running in a regular web browser
 */
export function isNativeCapacitorApp() {
  return typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();
}
