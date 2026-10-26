/**
 * Free Browser Notification API Client Helper
 * Uses standard W3C HTML5 Notification API.
 * 100% Free - zero third-party dependencies, zero SMS credits required.
 */

export interface BrowserNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Checks if browser notifications are supported in the current environment
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Requests permission to show browser notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

/**
 * Dispatches a native browser notification if permission is granted
 */
export function sendBrowserNotification(
  title: string,
  options?: BrowserNotificationOptions
): boolean {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    new Notification(title, {
      icon: '/icons/kavach-icon.svg',
      badge: '/icons/kavach-icon.svg',
      requireInteraction: options?.requireInteraction ?? false,
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Browser notification display error:', err);
    return false;
  }
}
