import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission 
} from '@/lib/pushNotifications';

export function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);
    
    // Show banner if notifications are supported but not yet granted
    if (currentPermission === 'default') {
      // Check if user dismissed the banner before
      const dismissed = localStorage.getItem('notification-banner-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  if (!showBanner || !isNotificationSupported()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-card border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-5">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">Enable Critical Alerts</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Get instant notifications when patients need immediate attention, even when the app is in the background.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationStatus() {
  const permission = getNotificationPermission();

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3 w-3" />
        <span>Notifications not supported</span>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-500">
        <Bell className="h-3 w-3" />
        <span>Notifications enabled</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500">
        <BellOff className="h-3 w-3" />
        <span>Notifications blocked</span>
      </div>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-xs"
      onClick={() => requestNotificationPermission()}
    >
      <Bell className="h-3 w-3 mr-1" />
      Enable notifications
    </Button>
  );
}
