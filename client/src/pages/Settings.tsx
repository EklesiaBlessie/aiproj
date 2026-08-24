import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';
import { updateStoredProfile } from '@/lib/auth';

interface UserSettings {
  emailNotifications: boolean;
  weeklyDigest: boolean;
  highPriorityAlerts: boolean;
  defaultPageSize: number;
}

interface Profile {
  id: string;
  email: string;
  name: string;
  role?: string;
  company: string;
  settings: UserSettings;
}

/**
 * Settings — profile and notification preferences.
 *
 * Reads GET /api/auth/me on mount and writes PATCH /api/user on save, so every
 * value here survives a reload and a different browser. Nothing on this page is
 * kept in local state alone; a "Saved" toast means the database answered.
 *
 * Email and role are shown read-only. Role is an authorization decision the
 * server refuses to take from this form, and email is the login identity — see
 * the note in backend/src/controllers/user.controller.ts.
 */
export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    weeklyDigest: false,
    highPriorityAlerts: true,
    defaultPageSize: 20,
  });

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/me');
      const data: Profile = response.data.data;
      setProfile(data);
      setName(data.name ?? '');
      setCompany(data.company ?? '');
      if (data.settings) setSettings(data.settings);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load your settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch('/user', {
        name: name.trim(),
        company: company.trim(),
        settings,
      });
      const saved: Profile = response.data.data;
      setProfile(saved);
      setSettings(saved.settings);
      // The sidebar reads the cached session for the display name, so keep it
      // in step rather than waiting for the next login to refresh it.
      updateStoredProfile({ name: saved.name });
      toast.success('Settings saved', { description: 'Your changes are stored on your account.' });
    } catch (err: any) {
      const details = err.response?.data?.details;
      const message = Array.isArray(details) && details.length
        ? details.map((d: any) => d.message).join('; ')
        : err.response?.data?.error || err.message || 'Could not save your settings';
      toast.error('Save failed', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    profile !== null &&
    (name !== profile.name ||
      company !== (profile.company ?? '') ||
      JSON.stringify(settings) !== JSON.stringify(profile.settings));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-semibold">Failed to load settings</p>
          <p className="text-sm">{error}</p>
          <Button onClick={loadProfile} variant="outline" data-testid="settings-retry">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your profile and notification preferences
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  data-testid="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-company">Company</Label>
                <Input
                  id="settings-company"
                  data-testid="settings-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Optional"
                  disabled={isSaving}
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm text-foreground" data-testid="settings-email">
                    {profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your login identity — changing it needs re-verification, so it is not editable here.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Role</Label>
                  <div>
                    <Badge variant="outline" className="border-primary text-primary">
                      {profile?.role ?? 'viewer'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set by an administrator. Role controls delete permissions, so it cannot be
                    changed from this form.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Stored on your account, so these follow you to any browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {([
                {
                  key: 'emailNotifications' as const,
                  label: 'Email notifications',
                  hint: 'Receive product updates by email.',
                },
                {
                  key: 'weeklyDigest' as const,
                  label: 'Weekly digest',
                  hint: 'A Monday summary of new feedback and themes.',
                },
                {
                  key: 'highPriorityAlerts' as const,
                  label: 'High-priority alerts',
                  hint: 'Notify me when new high-priority feedback arrives.',
                },
              ]).map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor={`toggle-${row.key}`} className="text-foreground">
                      {row.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{row.hint}</p>
                  </div>
                  <Switch
                    id={`toggle-${row.key}`}
                    data-testid={`settings-${row.key}`}
                    checked={settings[row.key]}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, [row.key]: checked }))
                    }
                    disabled={isSaving}
                  />
                </div>
              ))}

              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="settings-page-size">Feedback rows per page</Label>
                <Input
                  id="settings-page-size"
                  data-testid="settings-page-size"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.defaultPageSize}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultPageSize: Number(e.target.value),
                    }))
                  }
                  disabled={isSaving}
                  className="bg-secondary/50 border-border max-w-[140px]"
                />
                <p className="text-xs text-muted-foreground">
                  Between 1 and 100. Used as the default page size on the Feedback table.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSaving || !isDirty}
              data-testid="settings-save"
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save changes
                </>
              )}
            </Button>
            {isDirty && !isSaving && (
              <span className="text-xs text-muted-foreground">You have unsaved changes</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
