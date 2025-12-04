import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PatientCard } from '@/components/dashboard/PatientCard';
import { AddPatientDialog } from '@/components/dashboard/AddPatientDialog';
import { usePatients } from '@/hooks/usePatients';
import { useAllLatestVitals } from '@/hooks/useVitals';
import { useAllLatestPredictions } from '@/hooks/usePredictions';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Patients() {
  const { user } = useAuth();
  const { data: patients, isLoading } = usePatients({ 
    staffId: user?.id, 
    role: user?.role as 'admin' | 'doctor' | 'nurse' 
  });
  const { data: latestVitals } = useAllLatestVitals();
  const { data: latestPredictions } = useAllLatestPredictions();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Filter patients
  const filteredPatients = patients?.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.room_no.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;

    const prediction = latestPredictions?.[patient.id];
    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'high' && prediction?.risk_level === 'High Risk') ||
      (riskFilter === 'moderate' && prediction?.risk_level === 'Moderate Risk') ||
      (riskFilter === 'low' && prediction?.risk_level === 'Low Risk');

    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Patients</h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'admin' 
                ? 'Manage and monitor all registered patients'
                : 'Your assigned patients'}
            </p>
          </div>
          {user?.role === 'admin' && <AddPatientDialog />}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="moderate">Moderate Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Patient Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredPatients && filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                latestVitals={latestVitals?.[patient.id]}
                latestPrediction={latestPredictions?.[patient.id]}
              />
            ))}
          </div>
        ) : (
          <div className="vital-card flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {patients?.length === 0 ? 'No patients assigned' : 'No patients found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {patients?.length === 0
                ? user?.role === 'admin' 
                  ? 'Add your first patient to get started'
                  : 'Contact admin to assign patients to you'
                : 'Try adjusting your search or filters'}
            </p>
            {patients?.length === 0 && user?.role === 'admin' && <AddPatientDialog />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
