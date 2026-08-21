import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useApi } from '@/hooks/useApi';

export default function Analytics() {
  const { data: statsData, isLoading, error, fetchData: fetchStats } = useApi<any>();
  const { data: feedbackData, fetchData: fetchFeedback } = useApi<any>();

  useEffect(() => {
    fetchStats({ method: 'GET', url: '/stats' });
    fetchFeedback({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchStats, fetchFeedback]);

  // Build analytics data from real feedback grouped by sentiment counts
  const sentimentData = statsData?.bySentiment || [];
  const categoryData = statsData?.byCategory || [];
  const connectedSources = (statsData?.bySource || []).map((source: any) => ({
    name: source.name || 'Unknown source',
    status: 'connected',
    lastSync: 'Current dataset',
    metrics: `${source.value} feedback items`,
  }));

  // Construct chart data from category breakdown
  const analyticsData = categoryData.slice(0, 7).map((cat: any, i: number) => ({
    date: cat.name || `Cat ${i + 1}`,
    dau: cat.value * 3, // Scale for visualization
    retention: Math.min(95, 70 + Math.round(cat.value / 10)),
    adoption: Math.min(80, 30 + Math.round(cat.value / 8)),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <Button onClick={() => fetchStats({ method: 'GET', url: '/stats' })} variant="outline" className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Analytics</h1>
            <p className="text-sm text-muted-foreground mt-2">Integrate and analyze product analytics data</p>
          </div>
          <Link href="/feedback">
            <Button className="bg-primary hover:bg-primary/90 gap-2" data-testid="analytics-add-source">
              <Plus className="w-4 h-4" />
              Add Source
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Connected Sources */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Connected Sources</CardTitle>
                <CardDescription>Analytics integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {connectedSources.map((source: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-foreground text-sm">{source.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          source.status === 'connected'
                            ? 'border-chart-1 text-chart-1'
                            : 'border-chart-3 text-chart-3'
                        }
                      >
                        {source.status === 'connected' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {source.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Synced {source.lastSync}</p>
                    <p className="text-xs text-muted-foreground">{source.metrics}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Metrics Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sentiment Distribution */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
                <CardDescription>Feedback sentiment breakdown from backend data</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sentimentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.02 280)" />
                    <YAxis stroke="oklch(0.65 0.02 280)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'oklch(0.18 0.01 280)',
                        border: '1px solid oklch(0.25 0.02 280)',
                        borderRadius: '0.65rem',
                      }}
                      labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                    />
                    <Bar dataKey="value" fill="oklch(0.55 0.24 260)" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Feedback by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 280)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.02 280)" />
                    <YAxis stroke="oklch(0.65 0.02 280)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'oklch(0.18 0.01 280)',
                        border: '1px solid oklch(0.25 0.02 280)',
                        borderRadius: '0.65rem',
                      }}
                      labelStyle={{ color: 'oklch(0.92 0.01 280)' }}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="oklch(0.60 0.18 140)" name="Feedback Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integration Guide */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Integration Guide</CardTitle>
            <CardDescription>How to connect your analytics platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* These three require OAuth client credentials this project does
                  not hold, so there is no honest "connect" to perform. They are
                  disabled and say why, rather than showing a "Redirecting to
                  OAuth..." toast that never redirected anywhere. */}
              {[
                {
                  name: 'Google Analytics',
                  blurb: 'Connect your GA4 property to track user behavior and funnel metrics.',
                  credential: 'GA4 OAuth client ID and secret',
                },
                {
                  name: 'Mixpanel',
                  blurb: 'Import event data and feature adoption metrics from Mixpanel.',
                  credential: 'Mixpanel service account credentials',
                },
                {
                  name: 'Amplitude',
                  blurb: 'Sync cohort analysis and retention data from Amplitude.',
                  credential: 'Amplitude API key and secret key',
                },
              ].map((integration) => (
                <div key={integration.name} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <h3 className="font-bold text-foreground mb-2">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{integration.blurb}</p>
                  <Button
                    disabled
                    variant="outline"
                    size="sm"
                    className="border-border"
                    title={`Requires ${integration.credential}, which is not configured`}
                    data-testid={`connect-${integration.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    Connect
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Not configured — needs {integration.credential}.
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
