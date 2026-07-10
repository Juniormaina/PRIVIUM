import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { GuestRoute } from '../components/guards/guest-route';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    const result = await signUp(email, password, fullName);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Account created! Check your email to confirm.');
      navigate('/login');
    }
  };

  return (
    <GuestRoute>
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-privium-500/10 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-privium-500 shadow-lg shadow-privium-500/20">
                <span className="text-xl font-bold text-white">P</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Create your account</h1>
            <p className="mt-1 text-sm text-surface-500">
              Join the enterprise treasury platform
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Get started with PRIVIUM</CardTitle>
              <CardDescription>
                Enterprise-grade treasury and payroll management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full name"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
                <Input
                  label="Work email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-surface-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-privium-400 hover:text-privium-300 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-surface-500 dark:text-surface-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </GuestRoute>
  );
}