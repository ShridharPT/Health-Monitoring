import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Loader2, User, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Reports() {
  const { user } = useAuth();
  const { data: patients } = usePatients({ 
    staffId: user?.id, 
    role: user?.role as 'admin' | 'doctor' | 'nurse' 
  });
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [reportType, setReportType] = useState('daily');
  const [hours, setHours] = useState('24');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    setIsGenerating(true);
    try {
      // Build query params including notes and downloaded by info
      const params = new URLSearchParams({
        report_type: reportType,
        hours: hours,
        downloaded_by_name: user?.name || 'Unknown',
        downloaded_by_role: user?.role || 'Unknown',
        downloaded_by_email: user?.email || '',
      });
      
      if (notes.trim()) {
        params.append('staff_notes', notes.trim());
      }

      const response = await fetch(
        `${API_URL}/reports/patient/${selectedPatient}/pdf?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPatientData = patients?.find(p => p.id === selectedPatient);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and download patient reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Generator */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Patient Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - Room {patient.room_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Summary</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                    <SelectItem value="discharge">Discharge Report</SelectItem>
                    <SelectItem value="emergency">Emergency Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">Last 12 hours</SelectItem>
                    <SelectItem value="24">Last 24 hours</SelectItem>
                    <SelectItem value="48">Last 48 hours</SelectItem>
                    <SelectItem value="72">Last 72 hours</SelectItem>
                    <SelectItem value="168">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(user?.role === 'doctor' || user?.role === 'nurse') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Staff Notes (Optional)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or observations to include in the report..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes will be included in the generated report
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">
                  Report will be downloaded by: <span className="font-medium text-foreground">{user?.name}</span>
                  <span className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs capitalize">
                    {user?.role}
                  </span>
                </p>
              </div>

              <Button 
                onClick={handleGenerateReport} 
                disabled={!selectedPatient || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate PDF Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Report Preview Info */}
          <Card>
            <CardHeader>
              <CardTitle>Report Contents</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatientData ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedPatientData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {selectedPatientData.room_no} • {selectedPatientData.age} years
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-medium">The report will include:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Patient demographics and admission info</li>
                      <li>• Vital signs summary and trends</li>
                      <li>• AI risk assessments and predictions</li>
                      <li>• Vital signs forecasts</li>
                      <li>• Prescriptions and medications</li>
                      <li>• Alerts and risk events</li>
                      <li>• Connected IoT devices status</li>
                      <li>• Care team information</li>
                      <li>• Staff notes (if provided)</li>
                      <li>• Downloaded by information</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a patient to see report preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report Types Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-medium">Daily Summary</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive daily overview of patient status and vitals
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-info mb-2" />
              <h3 className="font-medium">Weekly Summary</h3>
              <p className="text-sm text-muted-foreground">
                Week-long trends and progress report
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-success mb-2" />
              <h3 className="font-medium">Discharge Report</h3>
              <p className="text-sm text-muted-foreground">
                Complete summary for patient discharge
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-destructive mb-2" />
              <h3 className="font-medium">Emergency Report</h3>
              <p className="text-sm text-muted-foreground">
                Critical information for emergency situations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
