import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Zap, Eye, EyeOff, Loader2, Check } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const passwordChecks = [
    { label: '8+ characters', valid: password.length >= 8 },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Number', valid: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">LeadX Pro AI</span>
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-muted-foreground">Start discovering and verifying leads today</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Full Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="John Doe" required
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring transition-all focus:ring-2 focus:ring-offset-1 placeholder:text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-sm font-medium">Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com" required
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring transition-all focus:ring-2 focus:ring-offset-1 placeholder:text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input id="reg-password" type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password" required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-sm outline-none ring-ring transition-all focus:ring-2 focus:ring-offset-1 placeholder:text-muted-foreground" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {passwordChecks.map((check) => (
                  <div key={check.label} className={`flex items-center gap-1.5 text-xs transition-colors ${check.valid ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <Check className={`h-3 w-3 ${check.valid ? 'opacity-100' : 'opacity-30'}`} />
                    {check.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
            {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />Creating account...</>) : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
