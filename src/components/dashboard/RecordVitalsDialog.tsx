import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Activity } from 'lucide-react';
import { useCreateVitals } from '@/hooks/useVitals';
import { useCreatePrediction } from '@/hooks/usePredictions';
import { Vitals } from '@/types/medical';
import { generateSyntheticVitals } from '@/lib/riskPrediction';
import { toast } from 'sonner';

const vitalsSchema = z.object({
  heart_rate: z.coerce.number().min(20).max(250),
  spo2: z.coerce.number().min(50).max(100),
  resp_rate: z.coerce.number().min(4).max(60),
  systolic_bp: z.coerce.number().min(50).max(250),
  diastolic_bp: z.coerce.number().min(30).max(150),
  temperature: z.coerce.number().min(30).max(45),
});

type VitalsFormData = z.infer<typeof vitalsSchema>;

interface RecordVitalsDialogProps {
  patientId: string;
  trigger?: React.ReactNode;
}

export function RecordVitalsDialog({ patientId, trigger }: RecordVitalsDialogProps) {
  const [open, setOpen] = useState(false);
  const createVitals = useCreateVitals();
  const createPrediction = useCreatePrediction();

  const defaultVitals = generateSyntheticVitals(undefined, 'low');

  const form = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      heart_rate: defaultVitals.heart_rate,
      spo2: defaultVitals.spo2,
      resp_rate: defaultVitals.resp_rate,
      systolic_bp: defaultVitals.systolic_bp,
      diastolic_bp: defaultVitals.diastolic_bp,
      temperature: defaultVitals.temperature,
    },
  });

  const onSubmit = async (data: VitalsFormData) => {
    try {
      const vitalsData = {
        heart_rate: data.heart_rate,
        spo2: data.spo2,
        resp_rate: data.resp_rate,
        systolic_bp: data.systolic_bp,
        diastolic_bp: data.diastolic_bp,
        temperature: data.temperature,
        patient_id: patientId,
        timestamp: new Date().toISOString(),
      };
      
      const vitals = await createVitals.mutateAsync(vitalsData);
      
      // Generate prediction
      await createPrediction.mutateAsync({ patientId, vitals: vitals as Vitals });
      
      toast.success('Vitals recorded and risk assessed');
      setOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const generateRandom = (risk: 'low' | 'moderate' | 'high') => {
    const vitals = generateSyntheticVitals(undefined, risk);
    form.setValue('heart_rate', vitals.heart_rate);
    form.setValue('spo2', vitals.spo2);
    form.setValue('resp_rate', vitals.resp_rate);
    form.setValue('systolic_bp', vitals.systolic_bp);
    form.setValue('diastolic_bp', vitals.diastolic_bp);
    form.setValue('temperature', vitals.temperature);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Record Vitals
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Record Vitals</DialogTitle>
          <DialogDescription>
            Enter patient vital signs. AI will analyze and predict risk level.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateRandom('low')}
            className="text-xs"
          >
            Normal Values
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateRandom('moderate')}
            className="text-xs text-warning border-warning/50"
          >
            Moderate Risk
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateRandom('high')}
            className="text-xs text-critical border-critical/50"
          >
            High Risk
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heart_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heart Rate (bpm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spo2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SpO₂ (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resp_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resp. Rate (/min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°C)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systolic_bp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Systolic BP (mmHg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diastolic_bp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diastolic BP (mmHg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVitals.isPending || createPrediction.isPending}>
                {createVitals.isPending || createPrediction.isPending ? 'Recording...' : 'Record & Analyze'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
