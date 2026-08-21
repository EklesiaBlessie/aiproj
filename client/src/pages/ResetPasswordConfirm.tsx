import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowLeft, CheckCircle, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordConfirm() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const calculatePasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return 'weak';
    if (pwd.length < 12) return 'medium';
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*]/.test(pwd)) return 'strong';
    return 'medium';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  const validateForm = () => {
    if (!password) {
      toast.error('Please enter a new password');
      return false;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  /**
   * Password reset is not implemented end-to-end.
   *
   * The reset link can only be reached through the Forgot Password flow, which
   * is disabled for the same reason (no email service, no reset-token
   * endpoint). This handler previously `setTimeout(1500)` and then claimed
   * "Password reset successfully!" with no request ever made — the password
   * was never actually changed. It now says so instead of simulating success.
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // No backend reset endpoint exists, so there is nothing to call.
    toast.error('Password reset is not available yet', {
      description:
        'No email service or reset endpoint is connected. Ask an administrator to reset your password.',
    });
    setIsLoading(false);
  };

  const handleBackToLogin = () => {
    setLocation('/login');
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return 'bg-red-500/20 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'strong':
        return 'bg-green-500/20 border-green-500/30';
    }
  };

  const getStrengthTextColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'strong':
        return 'text-green-400';
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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Login</span>
          </button>

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
          {!isSuccess ? (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl text-white">Set New Password</CardTitle>
                <CardDescription className="text-slate-400">
                  Create a strong password to secure your account
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={handlePasswordChange}
                        className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className={`p-3 rounded-lg border ${getStrengthColor()}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-300">Password Strength</span>
                        <span className={`text-xs font-medium ${getStrengthTextColor()}`}>
                          {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength === 'weak'
                              ? 'w-1/3 bg-red-500'
                              : passwordStrength === 'medium'
                              ? 'w-2/3 bg-yellow-500'
                              : 'w-full bg-green-500'
                          }`}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Password Requirements */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-300 mb-2">Password Requirements:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className={password.length >= 8 ? 'text-green-400' : 'text-slate-500'}>✓</span>
                        At least 8 characters
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-slate-500'}>✓</span>
                        One uppercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[0-9]/.test(password) ? 'text-green-400' : 'text-slate-500'}>✓</span>
                        One number
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[!@#$%^&*]/.test(password) ? 'text-green-400' : 'text-slate-500'}>✓</span>
                        One special character (!@#$%^&*)
                      </li>
                    </ul>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-400"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300">
                      Never share your password with anyone. We'll never ask for it via email.
                    </p>
                  </div>

                  {/* Reset Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        Reset Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-white">Password Reset Successfully</CardTitle>
                <CardDescription className="text-slate-400">
                  Your password has been updated. You can now log in with your new password.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-green-400 text-sm">Password reset complete!</h3>
                  <ul className="text-xs text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Your password has been securely updated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>You can now sign in with your new password</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>All active sessions have been logged out for security</span>
                    </li>
                  </ul>
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleBackToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Back to Login
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer — plain text, not buttons: there is no privacy or terms page
            to navigate to. */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </div>
  );
}
