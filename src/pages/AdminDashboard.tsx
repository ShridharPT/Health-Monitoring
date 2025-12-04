import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { usePatients } from '@/hooks/usePatients';
import { useStaff } from '@/hooks/useStaff';
import { useDevices } from '@/hooks/useDevices';
import { useRiskEvents } from '@/hooks/useRiskEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserCog, Cpu, AlertTriangle, Activity, Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data: patients } = usePatients();
  const { data: staff } = useStaff();
  const { data: devices } = useDevices();
  const { data: riskEvents } = useRiskEvents(10);

  const doctors = staff?.filter(s => s.role === 'doctor') || [];
  const nurses = staff?.filter(s => s.role === 'nurse') || [];
  const onDutyStaff = staff?.filter(s => s.on_duty) || [];
  const onlineDevices = devices?.filter(d => d.status === 'online') || [];
  const offlineDevices = devices?.filter(d => d.status === 'offline') || [];
  const criticalPatients = patients?.filter(p => p.status === 'critical') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Hospital overview and management</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/staff">
              <Button variant="outline">
                <UserCog className="w-4 h-4 mr-2" />
                Manage Staff
              </Button>
            </Link>
            <Link to="/admin/devices">
              <Button variant="outline">
                <Cpu className="w-4 h-4 mr-2" />
                Manage Devices
              </Button>
            </Link>
            <Link to="/admin/assignments">
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Assignments
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Patients"
            value={patients?.length || 0}
            subtitle={`${criticalPatients.length} critical`}
            icon={Users}
          />
          <StatsCard
            title="Staff On Duty"
            value={onDutyStaff.length}
            subtitle={`${doctors.length} doctors, ${nurses.length} nurses`}
            icon={UserCog}
          />
          <StatsCard
            title="IoT Devices"
            value={devices?.length || 0}
            subtitle={`${onlineDevices.length} online, ${offlineDevices.length} offline`}
            icon={Cpu}
            variant={offlineDevices.length > 0 ? 'warning' : 'success'}
          />
          <StatsCard
            title="Active Alerts"
            value={riskEvents?.filter(e => !e.acknowledged).length || 0}
            subtitle="Unacknowledged"
            icon={AlertTriangle}
            variant="critical"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Staff Overview</CardTitle>
              <Link to="/admin/staff">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staff?.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${member.on_duty ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'doctor' ? 'default' : member.role === 'nurse' ? 'secondary' : 'outline'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Device Health</CardTitle>
              <Link to="/admin/devices">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {devices?.slice(0, 6).map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Cpu className={`w-4 h-4 ${device.status === 'online' ? 'text-success' : device.status === 'offline' ? 'text-muted-foreground' : 'text-warning'}`} />
                      <div>
                        <p className="font-medium text-sm">{device.device_id}</p>
                        <p className="text-xs text-muted-foreground">{device.device_type} • {device.manufacturer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={device.status === 'online' ? 'default' : device.status === 'offline' ? 'secondary' : 'destructive'}>
                        {device.status}
                      </Badge>
                      {device.battery_level && (
                        <p className="text-xs text-muted-foreground mt-1">{device.battery_level}% battery</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <div className="lg:col-span-2">
            <AlertPanel events={riskEvents || []} maxHeight="400px" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
