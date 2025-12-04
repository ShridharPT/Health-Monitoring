import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Default accounts are auto-created on first load
  const demoAccounts = [
    { email: 'admin@hospital.com', password: 'admin123', role: 'Admin', color: 'bg-purple-500' },
    { email: 'doctor@hospital.com', password: 'doctor123', role: 'Doctor', color: 'bg-blue-500' },
    { email: 'nurse@hospital.com', password: 'nurse123', role: 'Nurse', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">VitalGuard AI</h1>
          <p className="text-muted-foreground text-center">
            Hospital-grade patient monitoring platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Default accounts (click to fill credentials)
              </p>
              <div className="space-y-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.email}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full ${account.color} mr-2`} />
                    {account.role}: {account.email}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Admin can create new staff accounts with custom passwords
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
