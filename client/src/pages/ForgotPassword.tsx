import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');

  /**
   * Password reset is not implemented.
   *
   * This handler used to `setTimeout(1500)` and then show "Password reset email
   * sent successfully!" plus a full "Check Your Email" screen listing what to
   * expect in the inbox — but no request was ever made and no email was ever
   * sent, so the user would wait for a message that did not exist. Sending one
   * needs an SMTP provider and a token-issuing endpoint, neither of which this
   * project has credentials for.
   *
   * The form now says so instead of simulating success.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Password reset is not available yet', {
      description:
        'No email service is connected, so no reset link can be sent. Ask an administrator to reset your password.',
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
          <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl text-white">Reset Your Password</CardTitle>
                <CardDescription className="text-slate-400">
                  Self-service password reset is not connected yet.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      />
                    </div>
                  </div>

                  {/* Disabled rather than hidden: the field and button stay
                      visible so the page still explains what it is for, but
                      clicking cannot produce a false "email sent". */}
                  <Button
                    type="submit"
                    disabled
                    className="w-full bg-blue-600 text-white font-medium py-2 gap-2"
                    title="Requires an email service, which is not configured"
                    data-testid="forgot-submit"
                  >
                    Send Reset Link
                  </Button>
                </form>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-xs text-amber-200/90">
                    <span className="font-medium text-amber-300">Not available yet.</span>
                    <br />
                    Sending a reset link needs an email service, which this deployment does not have
                    configured. Ask an administrator to reset your password directly.
                  </p>
                </div>

                <Button
                  onClick={handleBackToLogin}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                >
                  Back to Login
                </Button>
              </CardContent>
            </>
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
