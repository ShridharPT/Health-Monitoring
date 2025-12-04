import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Activity,
  Bell,
  Heart,
  Menu,
  X,
  Pill,
  MessageSquare,
  FileText,
  UserCog,
  Cpu,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useUnacknowledgedEvents } from '@/hooks/useRiskEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useChat';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon: Icon, label, badge, isActive, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto w-5 h-5 flex items-center justify-center bg-critical text-critical-foreground text-xs font-bold rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: unacknowledgedEvents } = useUnacknowledgedEvents();
  const { data: notificationCount } = useUnreadNotificationCount(user?.id);
  const { data: messageCount } = useUnreadMessageCount(user?.id);
  const alertCount = (unacknowledgedEvents?.length || 0) + (notificationCount || 0);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const baseNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients', icon: Users, label: 'Patients' },
    { to: '/monitoring', icon: Activity, label: 'Monitoring' },
    { to: '/alerts', icon: Bell, label: 'Alerts', badge: alertCount },
    { to: '/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/chat', icon: MessageSquare, label: 'Messages', badge: messageCount },
    { to: '/reports', icon: FileText, label: 'Reports' },
  ];

  const adminNavItems = [
    { to: '/admin/staff', icon: UserCog, label: 'Staff' },
    { to: '/admin/devices', icon: Cpu, label: 'Devices' },
    { to: '/admin/assignments', icon: Users, label: 'Assignments' },
  ];

  const navItems = user?.role === 'admin' 
    ? [...baseNavItems, ...adminNavItems] 
    : baseNavItems;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">VitalAI</h1>
                <p className="text-xs text-muted-foreground">Patient Monitoring</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                isActive={
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)
                }
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
            {user && (
              <div className="px-4 py-3 rounded-lg bg-muted/30">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
            <Button 
              variant="destructive" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="lg:hidden" /> {/* Spacer for mobile menu button */}
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{user.name}</span>
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs capitalize">
                    {user.role}
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
