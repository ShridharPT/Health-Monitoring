import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDevices, useRegisterDevice, useAssignDevice, useUpdateDeviceStatus } from '@/hooks/useDevices';
import { usePatients } from '@/hooks/usePatients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cpu, Plus, Wifi, WifiOff, Battery, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DeviceManagement() {
  const { data: devices } = useDevices();
  const { data: patients } = usePatients();
  const registerDevice = useRegisterDevice();
  const assignDevice = useAssignDevice();
  const updateStatus = useUpdateDeviceStatus();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    device_id: '',
    device_type: 'multi',
    manufacturer: '',
    model: '',
    firmware_version: ''
  });

  const filteredDevices = devices?.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter !== 'all' && d.device_type !== typeFilter) return false;
    return true;
  });

  const handleRegister = async () => {
    try {
      await registerDevice.mutateAsync(formData);
      toast.success('Device registered');
      setShowAddDialog(false);
      setFormData({ device_id: '', device_type: 'multi', manufacturer: '', model: '', firmware_version: '' });
    } catch (error) {
      toast.error('Failed to register device');
    }
  };

  const handleAssign = async (deviceId: string, patientId: string | null) => {
    try {
      await assignDevice.mutateAsync({ deviceId, patientId });
      toast.success(patientId ? 'Device assigned' : 'Device unassigned');
    } catch (error) {
      toast.error('Failed to assign device');
    }
  };

  const handleStatusChange = async (deviceId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ deviceId, status });
      toast.success('Device status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const onlineCount = devices?.filter(d => d.status === 'online').length || 0;
  const offlineCount = devices?.filter(d => d.status === 'offline').length || 0;
  const errorCount = devices?.filter(d => d.status === 'error').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Device Management</h1>
            <p className="text-muted-foreground">Monitor and manage IoT medical devices</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input value={formData.device_id} onChange={(e) => setFormData({ ...formData, device_id: e.target.value })} placeholder="e.g., ECG-003" />
                </div>
                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <Select value={formData.device_type} onValueChange={(v) => setFormData({ ...formData, device_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecg">ECG Monitor</SelectItem>
                      <SelectItem value="spo2">SpO₂ Sensor</SelectItem>
                      <SelectItem value="bp">Blood Pressure</SelectItem>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="wearable">Wearable</SelectItem>
                      <SelectItem value="multi">Multi-Parameter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Firmware Version</Label>
                  <Input value={formData.firmware_version} onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })} />
                </div>
                <Button onClick={handleRegister} className="w-full">Register Device</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Cpu className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{devices?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Wifi className="w-8 h-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{onlineCount}</p>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{offlineCount}</p>
                  <p className="text-sm text-muted-foreground">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ecg">ECG</SelectItem>
              <SelectItem value="spo2">SpO₂</SelectItem>
              <SelectItem value="bp">Blood Pressure</SelectItem>
              <SelectItem value="temperature">Temperature</SelectItem>
              <SelectItem value="wearable">Wearable</SelectItem>
              <SelectItem value="multi">Multi-Parameter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Device Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Assigned Patient</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices?.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{device.device_id}</p>
                        <p className="text-sm text-muted-foreground">{device.manufacturer} {device.model}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.device_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        device.status === 'online' ? 'default' :
                        device.status === 'offline' ? 'secondary' :
                        device.status === 'error' ? 'destructive' : 'outline'
                      }>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.battery_level !== null && (
                        <div className="flex items-center gap-1">
                          <Battery className={`w-4 h-4 ${device.battery_level < 20 ? 'text-destructive' : device.battery_level < 50 ? 'text-warning' : 'text-success'}`} />
                          {device.battery_level}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={device.patient_id || 'none'}
                        onValueChange={(v) => handleAssign(device.device_id, v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Assign patient" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {patients?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} (Room {p.room_no})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {device.last_seen ? format(new Date(device.last_seen), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={device.status}
                        onValueChange={(v) => handleStatusChange(device.device_id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
