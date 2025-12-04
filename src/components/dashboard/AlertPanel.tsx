import { cn } from '@/lib/utils';
import { RiskEvent } from '@/types/medical';
import { AlertTriangle, AlertCircle, Info, Check, X, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAcknowledgeEvent } from '@/hooks/useRiskEvents';
import { usePatient } from '@/hooks/usePatients';

interface AlertItemProps {
  event: RiskEvent;
  onAcknowledge: (id: string) => void;
}

function AlertItem({ event, onAcknowledge }: AlertItemProps) {
  const { data: patient } = usePatient(event.patient_id);
  
  const config = {
    critical: {
      icon: AlertTriangle,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
      borderColor: 'border-critical/30',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    info: {
      icon: Info,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
  }[event.severity];

  const Icon = config.icon;

  return (
    <div className={cn(
      'p-3 rounded-lg border animate-fade-in-up',
      config.bgColor,
      config.borderColor,
      event.acknowledged && 'opacity-50'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('p-1.5 rounded', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {patient && (
              <span className="text-xs font-medium text-foreground">{patient.name}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(event.timestamp), 'HH:mm')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{event.message}</p>
        </div>

        {!event.acknowledged && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onAcknowledge(event.id)}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface AlertPanelProps {
  events: RiskEvent[];
  className?: string;
  maxHeight?: string;
}

export function AlertPanel({ events, className, maxHeight = '400px' }: AlertPanelProps) {
  const acknowledgeEvent = useAcknowledgeEvent();
  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;
  const unacknowledgedEvents = events.filter(e => !e.acknowledged);

  const handleMarkAllSeen = async () => {
    for (const event of unacknowledgedEvents) {
      acknowledgeEvent.mutate(event.id);
    }
  };

  return (
    <div className={cn('vital-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Alerts</h3>
            <p className="text-xs text-muted-foreground">
              {unacknowledgedCount > 0 ? `${unacknowledgedCount} unacknowledged` : 'All clear'}
            </p>
          </div>
        </div>
        {unacknowledgedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllSeen}
          >
            <Check className="w-4 h-4 mr-1" />
            Mark All Seen
          </Button>
        )}
      </div>

      <ScrollArea style={{ maxHeight }} className="pr-2">
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event) => (
              <AlertItem
                key={event.id}
                event={event}
                onAcknowledge={(id) => acknowledgeEvent.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Check className="w-8 h-8 mb-2 text-success" />
            <p className="text-sm">No alerts</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
