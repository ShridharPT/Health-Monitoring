import { cn } from '@/lib/utils';
import { RiskEvent } from '@/types/medical';
import { AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EventTimelineProps {
  events: RiskEvent[];
  className?: string;
}

export function EventTimeline({ events, className }: EventTimelineProps) {
  const config = {
    critical: {
      icon: AlertTriangle,
      color: 'text-critical',
      dotColor: 'bg-critical',
      lineColor: 'border-critical/30',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-warning',
      dotColor: 'bg-warning',
      lineColor: 'border-warning/30',
    },
    info: {
      icon: Info,
      color: 'text-primary',
      dotColor: 'bg-primary',
      lineColor: 'border-primary/30',
    },
  };

  return (
    <div className={cn('vital-card', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-muted">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Event Timeline</h3>
          <p className="text-xs text-muted-foreground">Recent risk events</p>
        </div>
      </div>

      <ScrollArea className="h-[300px] pr-2">
        {events.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {events.map((event, index) => {
                const eventConfig = config[event.severity];
                const Icon = eventConfig.icon;

                return (
                  <div key={event.id} className="relative flex gap-4 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                    {/* Timeline dot */}
                    <div className={cn(
                      'relative z-10 w-6 h-6 rounded-full flex items-center justify-center',
                      eventConfig.dotColor
                    )}>
                      <Icon className="w-3 h-3 text-background" />
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-xs font-medium uppercase tracking-wider', eventConfig.color)}>
                          {event.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-1">{event.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{event.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2" />
            <p className="text-sm">No events recorded</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
