import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import api from '@/lib/trpc';
import { saveSession } from '@/lib/auth';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;

      saveSession(user, token, { rememberMe });
      toast.success('Logged in successfully!');
      window.location.href = '/';
    } catch (error: any) {
      // Surface the backend's own wording ("Invalid email or password") rather
      // than a generic failure message.
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    const demoCredentials = {
      email: 'demo@example.com',
      password: 'DemoAccount123!',
    };

    try {
      try {
        await api.post('/auth/register', {
          ...demoCredentials,
          name: 'Demo User',
          role: 'viewer',
        });
      } catch (error: any) {
        // A 409 means the development demo account already exists.
        if (error.response?.status !== 409) throw error;
      }

      const response = await api.post('/auth/login', demoCredentials);
      const { token, user } = response.data.data;
      saveSession(user, token);
      toast.success('Demo account logged in!');
      window.location.href = '/';
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PM Copilot</h1>
              <p className="text-xs text-slate-400">AI Product Manager</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Transform customer feedback into product strategy</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setLocation('/forgot-password')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                  disabled={isLoading}
                />
                <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
                  Remember me
                </label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/50 text-slate-400">Or continue with</span>
              </div>
            </div>

            {/* Demo Account Button */}
            <Button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
            >
              Try Demo Account
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  console.log('Navigating to signup');
                  setLocation('/signup');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>

        {/* Footer — plain text, not buttons. There is no privacy or terms page
            in this app, so rendering these as clickable controls with hover
            states advertised an action that could never happen. */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
          <p>Use “Try Demo Account” above to sign in without registering.</p>
        </div>
      </div>
    </div>
  );
}
