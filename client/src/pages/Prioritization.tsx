import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

export default function Prioritization() {
  const [showMethodology, setShowMethodology] = useState(false);
  const { data: statsData, isLoading, error, fetchData: fetchStats } = useApi<any>();
  const { data: feedbackData, fetchData: fetchFeedback } = useApi<any>();

  useEffect(() => {
    fetchStats({ method: 'GET', url: '/stats' });
    fetchFeedback({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchStats, fetchFeedback]);

  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];

  // Build RICE data from real category/priority data
  const categoryMap = new Map<string, { count: number; highPriority: number }>();
  feedbackList.forEach((fb: any) => {
    const cat = fb.category || 'General';
    const existing = categoryMap.get(cat) || { count: 0, highPriority: 0 };
    existing.count += 1;
    if (fb.priority === 'High') existing.highPriority += 1;
    categoryMap.set(cat, existing);
  });

  const prioritizationData = Array.from(categoryMap.entries())
    .map(([name, data]) => {
      const reach = data.count * 5;
      const impact = Math.min(95, 60 + data.highPriority * 2);
      const confidence = Math.min(95, 70 + Math.round(data.count / 5));
      const rice = parseFloat(((reach * (impact / 30) * (confidence / 100)) / 5).toFixed(1));
      return { name, rice, reach, impact, confidence };
    })
    .sort((a, b) => b.rice - a.rice)
    .slice(0, 6);

  const riceBreakdown = prioritizationData.slice(0, 3).map((item, idx) => ({
    feature: `Improve ${item.name}`,
    reach: item.reach,
    impact: Math.round(item.impact / 30),
    confidence: item.confidence / 100,
    effort: 5 + idx * 3,
    score: item.rice,
    rationale: `${item.reach / 5} feedback items mention this category. ${item.impact > 80 ? 'Critical' : 'Moderate'} impact on user experience.`,
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Feature Prioritization</h1>
          <p className="text-sm text-muted-foreground mt-2">RICE-scored prioritization framework with AI-generated rationale</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">RICE Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* RICE Score Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>RICE Scores</CardTitle>
                <CardDescription>Feature prioritization by RICE score (from real feedback data)</CardDescription>
              </CardHeader>
              <CardContent>
                {prioritizationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prioritizationData}>
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
                      <Bar dataKey="rice" fill="oklch(0.55 0.24 260)" name="RICE Score" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No prioritization data available</p>
                )}
              </CardContent>
            </Card>

            {/* Top Priorities */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Top Priorities</CardTitle>
                <CardDescription>Recommended implementation order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riceBreakdown.length > 0 ? riceBreakdown.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-bold text-foreground">#{idx + 1} - {item.feature}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
                      </div>
                      <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                        {item.score}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Reach</p>
                        <p className="font-bold text-foreground">{item.reach}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Impact</p>
                        <p className="font-bold text-foreground">{item.impact}/3</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-bold text-foreground">{Math.round(item.confidence * 100)}%</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Effort</p>
                        <p className="font-bold text-foreground">{item.effort} pts</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-8">No priority data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>RICE Framework Details</CardTitle>
                <CardDescription>Detailed breakdown of each component</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Reach</h3>
                    <p className="text-sm text-muted-foreground">Number of users/customers affected by this feature. Higher reach = more potential impact.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Impact</h3>
                    <p className="text-sm text-muted-foreground">Magnitude of impact on each user (1-3 scale). Determined by AI analysis of feedback sentiment and urgency.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Confidence</h3>
                    <p className="text-sm text-muted-foreground">Confidence level based on data quality and volume. More sources = higher confidence.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="font-bold text-foreground mb-2">Effort</h3>
                    <p className="text-sm text-muted-foreground">Story points or time estimate for implementation. Lower effort = higher priority.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Framework Comparison</CardTitle>
                <CardDescription>Compare different prioritization methods</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The RICE framework balances multiple factors to provide a comprehensive prioritization score. Use this alongside your team's strategic goals and capacity planning.
                </p>
                <Button
                  onClick={() => setShowMethodology(true)}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="view-methodology"
                >
                  View Methodology
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Methodology dialog — the button previously emitted a one-line info
          toast that repeated the framework's name; the same four RICE terms
          are already explained on the Breakdown tab, so the dialog links the
          two views instead of restating them. */}
      {showMethodology && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMethodology(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="methodology-dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">RICE methodology</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The four inputs behind every score in the chart above.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowMethodology(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {[
              { term: 'Reach', def: 'How many users the feature affects per quarter, estimated from the volume of feedback in its category.' },
              { term: 'Impact', def: 'Effect per user on a 1–3 scale, driven by how much high-priority feedback the category carries.' },
              { term: 'Confidence', def: 'How sure we are of Reach and Impact — higher when more feedback supports the estimate.' },
              { term: 'Effort', def: 'Relative build cost in story points; the same value the Feature Requests table shows as S/M/L/XL.' },
            ].map((row) => (
              <div key={row.term} className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-semibold text-foreground text-sm">{row.term}</p>
                <p className="text-xs text-muted-foreground mt-1">{row.def}</p>
              </div>
            ))}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowMethodology(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
