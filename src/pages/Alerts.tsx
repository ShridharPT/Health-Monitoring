import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { EventTimeline } from '@/components/dashboard/EventTimeline';
import { useRiskEvents, useUnacknowledgedEvents, useRealtimeRiskEvents } from '@/hooks/useRiskEvents';
import { usePatients } from '@/hooks/usePatients';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AlertTriangle, AlertCircle, Bell, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Alerts() {
  const { data: allEvents } = useRiskEvents(100);
  const { data: unacknowledgedEvents } = useUnacknowledgedEvents();
  const { data: patients } = usePatients();

  // Enable real-time updates
  useRealtimeRiskEvents();

  // Calculate stats
  const criticalEvents = allEvents?.filter((e) => e.severity === 'critical' && !e.acknowledged) || [];
  const warningEvents = allEvents?.filter((e) => e.severity === 'warning' && !e.acknowledged) || [];
  const acknowledgedToday = allEvents?.filter((e) => {
    if (!e.acknowledged_at) return false;
    const today = new Date();
    const ackDate = new Date(e.acknowledged_at);
    return ackDate.toDateString() === today.toDateString();
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alerts Center</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage patient risk alerts
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Unacknowledged"
            value={unacknowledgedEvents?.length || 0}
            subtitle="Requires attention"
            icon={Bell}
            variant={unacknowledgedEvents?.length ? 'warning' : 'default'}
          />
          <StatsCard
            title="Critical Alerts"
            value={criticalEvents.length}
            subtitle="High priority"
            icon={AlertTriangle}
            variant={criticalEvents.length > 0 ? 'critical' : 'default'}
          />
          <StatsCard
            title="Warnings"
            value={warningEvents.length}
            subtitle="Moderate priority"
            icon={AlertCircle}
            variant={warningEvents.length > 0 ? 'warning' : 'default'}
          />
          <StatsCard
            title="Resolved Today"
            value={acknowledgedToday.length}
            subtitle="Acknowledged alerts"
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active Alerts
              {unacknowledgedEvents && unacknowledgedEvents.length > 0 && (
                <span className="ml-2 w-5 h-5 flex items-center justify-center bg-critical text-critical-foreground text-xs font-bold rounded-full">
                  {unacknowledgedEvents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Critical Alerts */}
              <div>
                <h3 className="text-lg font-semibold text-critical mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Alerts
                </h3>
                <AlertPanel
                  events={criticalEvents}
                  maxHeight="400px"
                />
              </div>

              {/* Warning Alerts */}
              <div>
                <h3 className="text-lg font-semibold text-warning mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Warnings
                </h3>
                <AlertPanel
                  events={warningEvents}
                  maxHeight="400px"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <EventTimeline events={allEvents || []} />
          </TabsContent>

          <TabsContent value="all">
            <AlertPanel events={allEvents || []} maxHeight="600px" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
