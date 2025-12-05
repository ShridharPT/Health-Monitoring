// Browser Push Notification Service for Critical Alerts

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

interface CriticalAlertOptions {
  title: string;
  body: string;
  patientName?: string;
  roomNo?: string;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  onClick?: () => void;
}

export function sendCriticalNotification(options: CriticalAlertOptions): void {
  const { title, body, patientName, roomNo, riskLevel, onClick } = options;

  // Always try browser notification first
  if (Notification.permission === 'granted') {
    const icon = riskLevel === 'critical' ? '🚨' : riskLevel === 'high' ? '⚠️' : '🔔';
    
    const notification = new Notification(`${icon} ${title}`, {
      body: `${body}${patientName ? `\nPatient: ${patientName}` : ''}${roomNo ? ` (Room ${roomNo})` : ''}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `alert-${Date.now()}`,
      requireInteraction: riskLevel === 'critical' || riskLevel === 'high',
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // Auto-close non-critical notifications after 10 seconds
    if (riskLevel !== 'critical') {
      setTimeout(() => notification.close(), 10000);
    }
  }

  // Also play sound for critical alerts
  if (riskLevel === 'critical' || riskLevel === 'high') {
    playAlertSound();
  }
}

function playAlertSound(): void {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    
    // Beep pattern for critical alert
    setTimeout(() => {
      oscillator.stop();
    }, 200);
  } catch (e) {
    console.log('Could not play alert sound:', e);
  }
}

// Check if the page is visible
export function isPageVisible(): boolean {
  return document.visibilityState === 'visible';
}

// Send notification only when page is not visible (background)
export function sendBackgroundNotification(options: CriticalAlertOptions): void {
  if (!isPageVisible()) {
    sendCriticalNotification(options);
  }
}
