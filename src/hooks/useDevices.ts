import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { IoTDevice } from '@/types/hospital';

function enrichDevice(d: IoTDevice): IoTDevice {
  return {
    ...d,
    patient: d.patient_id ? store.getPatientById(d.patient_id) : undefined
  };
}

export function useDevices(filters?: { status?: string; device_type?: string; patient_id?: string }) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('iot_devices')
          .select(`
            *,
            patient:patients(id, name, room_no)
          `);
        
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.device_type) query = query.eq('device_type', filters.device_type);
        if (filters?.patient_id) query = query.eq('patient_id', filters.patient_id);
        
        const { data, error } = await query.order('device_id');
        if (error) throw error;
        if (data && data.length > 0) return data as IoTDevice[];
      } catch {
        console.log('Using local storage for devices');
      }
      
      let devices = store.getDevices();
      if (filters?.status) devices = devices.filter(d => d.status === filters.status);
      if (filters?.device_type) devices = devices.filter(d => d.device_type === filters.device_type);
      if (filters?.patient_id) devices = devices.filter(d => d.patient_id === filters.patient_id);
      
      return devices.map(enrichDevice);
    }
  });
}

export function useDevice(deviceId?: string) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      
      try {
        const { data, error } = await supabase
          .from('iot_devices')
          .select(`*, patient:patients(*)`)
          .eq('device_id', deviceId)
          .single();
        
        if (error) throw error;
        if (data) return data as IoTDevice;
      } catch {
        console.log('Using local storage for device');
      }
      
      const device = store.getDevices().find(d => d.device_id === deviceId);
      return device ? enrichDevice(device) : null;
    },
    enabled: !!deviceId
  });
}


export function usePatientDevices(patientId?: string) {
  return useQuery({
    queryKey: ['patient-devices', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      try {
        const { data, error } = await supabase
          .from('iot_devices')
          .select('*')
          .eq('patient_id', patientId);
        
        if (error) throw error;
        if (data && data.length > 0) return data as IoTDevice[];
      } catch {
        console.log('Using local storage for patient devices');
      }
      
      return store.getDevices().filter(d => d.patient_id === patientId).map(enrichDevice);
    },
    enabled: !!patientId
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (device: {
      device_id: string;
      device_type: string;
      manufacturer?: string;
      model?: string;
      firmware_version?: string;
    }) => {
      try {
        const { data, error } = await supabase
          .from('iot_devices')
          .upsert({
            ...device,
            status: 'online',
            last_seen: new Date().toISOString()
          }, { onConflict: 'device_id' })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for register device');
        return store.createDevice({
          device_id: device.device_id,
          device_type: device.device_type as IoTDevice['device_type'],
          manufacturer: device.manufacturer,
          model: device.model,
          firmware_version: device.firmware_version,
          status: 'online',
          last_seen: new Date().toISOString(),
          config: {},
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
}

export function useAssignDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, patientId }: { deviceId: string; patientId: string | null }) => {
      try {
        const { data, error } = await supabase
          .from('iot_devices')
          .update({ patient_id: patientId })
          .eq('device_id', deviceId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for assign device');
        const devices = store.getDevices();
        const device = devices.find(d => d.device_id === deviceId);
        if (device) {
          return store.updateDevice(device.id, { patient_id: patientId || undefined });
        }
        throw new Error('Device not found');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['patient-devices'] });
    }
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, status }: { deviceId: string; status: string }) => {
      try {
        const { data, error } = await supabase
          .from('iot_devices')
          .update({ status, last_seen: new Date().toISOString() })
          .eq('device_id', deviceId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for update device status');
        const devices = store.getDevices();
        const device = devices.find(d => d.device_id === deviceId);
        if (device) {
          return store.updateDevice(device.id, { status: status as IoTDevice['status'], last_seen: new Date().toISOString() });
        }
        throw new Error('Device not found');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('iot_devices')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch {
        console.log('Using local storage for delete device');
        return store.deleteDevice(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
}

export function useRealtimeDevices() {
  const queryClient = useQueryClient();
  
  supabase
    .channel('devices-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_devices' }, () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    })
    .subscribe();
}
