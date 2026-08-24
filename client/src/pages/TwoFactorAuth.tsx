import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sparkles, ArrowLeft, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function TwoFactorAuth() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Timer for code expiration
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);

    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  /**
   * 2FA is not implemented.
   *
   * Previously accepted any 6-digit code, then wrote a fake user object to
   * localStorage and hard-navigated to "/" — but no backend route issues 2FA
   * codes, no email service sends them, and no endpoint validates them. A user
   * entering a code saw "Two-factor authentication verified!" when nothing was
   * verified.
   *
   * The form now says so instead of simulating success.
   */
  const handleVerify = (verifyCode?: string) => {
    toast.error('Two-factor authentication is not configured', {
      description:
        'No 2FA service is connected. Log in with your email and password only, or contact support.',
    });
  };

  const handleResendCode = () => {
    toast.error('Two-factor authentication is not configured', {
      description: 'No 2FA codes are being sent.',
    });
  };

  const handleBackToLogin = () => {
    setLocation('/login');
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
        {/* Header */}
        <div className="mb-8">
          {(
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Login</span>
            </button>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PM Copilot</h1>
              <p className="text-xs text-slate-400">AI Product Manager</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-2xl text-white text-center">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-slate-400 text-center">
                  Enter the 6-digit code from your authenticator app or email
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
                  {/* Verification Code Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Verification Code</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={code}
                      onChange={handleCodeChange}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 font-mono"
                      disabled={isLoading || timeLeft <= 0}
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 text-center">
                      Enter the code from your authenticator app
                    </p>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className={timeLeft <= 60 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      Code expires in {formatTime(timeLeft)}
                    </span>
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || code.length !== 6 || timeLeft <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                </form>

                {/* Resend Code */}
                <div className="border-t border-slate-600/50 pt-4">
                  <p className="text-xs text-slate-400 text-center mb-3">
                    Didn't receive the code?
                  </p>
                  <Button
                    onClick={handleResendCode}
                    disabled={isLoading || !canResend || resendCount >= 3}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resend Code
                    {resendCount > 0 && <span className="text-xs">({resendCount}/3)</span>}
                  </Button>
                </div>

                {/* Replaces both the "Security Notice" list and the dead
                    "Use backup code instead" button — neither described
                    anything this deployment actually does. */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-xs text-amber-200/90">
                    <span className="font-medium text-amber-300">Not configured.</span>
                    <br />
                    No service issues or validates 2FA codes here, so this step cannot be completed.
                    Sign in with your email and password instead.
                  </p>
                </div>
              </CardContent>
            </>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4">
            <button className="hover:text-slate-400 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button className="hover:text-slate-400 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}
