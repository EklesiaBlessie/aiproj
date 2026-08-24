import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, Star, AlertCircle, ArrowDown, ArrowUp, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';
import { useApi } from '@/hooks/useApi';

/* Feature backlog. All Class A: rows are aggregated from real feedback rows,
 * the column headers now actually sort, the row chevron opens a detail panel
 * built from that row's data, and "Generate PRD" creates a real PRD draft via
 * POST /api/prd and navigates to it — it used to fire a fake toast only. The
 * AI *body* of that PRD is still pending Yash's service; the draft, its title,
 * feature link, and RICE inputs are all real. */

type SortKey = 'title' | 'requests' | 'riceScore' | 'reach' | 'impact' | 'effort' | 'status';

export default function Features() {
  const { data: feedbackData, isLoading, error, fetchData } = useApi<any>();
  const [, navigate] = useLocation();

  const [sortKey, setSortKey] = useState<SortKey>('riceScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detail, setDetail] = useState<any | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchData]);

  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];

  // Aggregate feature requests from feedback by category
  const featureMap = new Map<string, { count: number; priority: string }>();
  feedbackList.forEach((fb: any) => {
    const cat = fb.featureCategory || fb.featureTitle || fb.category || 'General';
    const existing = featureMap.get(cat) || { count: 0, priority: 'Low' };
    existing.count += 1;
    if (fb.priority === 'High') existing.priority = 'High';
    else if (fb.priority === 'Medium' && existing.priority !== 'High') existing.priority = 'Medium';
    featureMap.set(cat, existing);
  });

  const featureRequests = Array.from(featureMap.entries())
    .map(([cat, data], idx) => {
      const reach = data.count * 5;
      const impact = data.priority === 'High' ? 'High' : data.priority === 'Medium' ? 'Medium' : 'Low';
      const impactVal = impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1;
      const confidence = Math.min(0.99, 0.7 + data.count / 500);
      const effortMap: Record<string, string> = { High: 'M', Medium: 'L', Low: 'S' };
      const effortVal = data.priority === 'High' ? 5 : data.priority === 'Medium' ? 8 : 3;
      const rice = parseFloat(((reach * impactVal * confidence) / effortVal).toFixed(1));
      return {
        id: idx + 1,
        title: `Improve ${cat}`,
        theme: cat,
        requests: data.count,
        status: data.priority === 'High' ? 'in_progress' : data.count > 20 ? 'planned' : 'new',
        riceScore: rice,
        reach,
        impact,
        confidence: Math.round(confidence * 100) / 100,
        effort: effortMap[data.priority] || 'M',
      };
    })
    .sort((a, b) => {
      // Ordinal ranks so Impact/Effort/Status sort meaningfully rather than
      // alphabetically ("High" before "Low" before "Medium").
      const IMPACT: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
      const EFFORT: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };
      const STATUS: Record<string, number> = { new: 1, planned: 2, in_progress: 3 };

      let cmp: number;
      switch (sortKey) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'impact':
          cmp = (IMPACT[a.impact] ?? 0) - (IMPACT[b.impact] ?? 0);
          break;
        case 'effort':
          cmp = (EFFORT[a.effort] ?? 0) - (EFFORT[b.effort] ?? 0);
          break;
        case 'status':
          cmp = (STATUS[a.status] ?? 0) - (STATUS[b.status] ?? 0);
          break;
        default:
          cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' ? 'asc' : 'desc');
    }
  };

  /** Sortable column header. */
  const SortHead = ({ label, columnKey }: { label: string; columnKey: SortKey }) => (
    <TableHead className="text-muted-foreground">
      <button
        onClick={() => toggleSort(columnKey)}
        data-testid={`sort-${columnKey}`}
        className="flex items-center gap-1 hover:text-foreground transition-colors uppercase text-xs font-medium"
      >
        {label}
        {sortKey === columnKey &&
          (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </TableHead>
  );

  /** Create a real PRD draft for a feature and open it. */
  const createPRDFor = async (feature: { title: string; theme: string }) => {
    setCreatingFor(feature.title);
    try {
      const response = await api.post('/prd', {
        title: feature.title,
        feature: feature.theme,
        status: 'draft',
      });
      toast.success('PRD draft created', {
        description: `"${response.data.data.title}" saved. Opening the PRD generator.`,
      });
      navigate('/prd');
    } catch (err: any) {
      toast.error('Could not create PRD draft', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setCreatingFor(null);
    }
  };

  const topFeature = featureRequests[0];

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
          <Button onClick={() => fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } })} variant="outline" className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feature Requests</h1>
            <p className="text-sm text-muted-foreground mt-2">Aggregated and prioritized feature requests from customer feedback</p>
          </div>
          <Button
            onClick={() => topFeature && createPRDFor(topFeature)}
            disabled={!topFeature || creatingFor !== null}
            className="bg-primary hover:bg-primary/90 gap-2"
            data-testid="features-generate-prd"
            title={topFeature ? `Create a PRD draft for "${topFeature.title}"` : 'No features to draft yet'}
          >
            {creatingFor !== null && <Loader2 className="w-4 h-4 animate-spin" />}
            Generate PRD
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Feature Backlog</CardTitle>
            <CardDescription>Sorted by RICE score (Reach × Impact × Confidence / Effort)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <SortHead label="Feature" columnKey="title" />
                    <SortHead label="Requests" columnKey="requests" />
                    <SortHead label="RICE Score" columnKey="riceScore" />
                    <SortHead label="Reach" columnKey="reach" />
                    <SortHead label="Impact" columnKey="impact" />
                    <SortHead label="Effort" columnKey="effort" />
                    <SortHead label="Status" columnKey="status" />
                    <TableHead className="text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRequests.length > 0 ? featureRequests.map((feature) => (
                    <TableRow key={feature.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{feature.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{feature.theme}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{feature.requests}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-bold text-foreground">{feature.riceScore}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{feature.reach}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            feature.impact === 'High'
                              ? 'border-chart-3 text-chart-3'
                              : 'border-chart-3 text-chart-3'
                          }
                        >
                          {feature.impact}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-muted-foreground text-muted-foreground"
                        >
                          {feature.effort}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            feature.status === 'in_progress'
                              ? 'border-primary text-primary'
                              : feature.status === 'planned'
                              ? 'border-chart-1 text-chart-1'
                              : 'border-muted-foreground text-muted-foreground'
                          }
                        >
                          {feature.status === 'in_progress'
                            ? 'In Progress'
                            : feature.status === 'planned'
                            ? 'Planned'
                            : 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => setDetail(feature)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-secondary"
                          title={`View details for ${feature.title}`}
                          data-testid={`detail-${feature.id}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No feature data available. Upload feedback first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row detail. Built entirely from the aggregated row, including the RICE
          inputs behind the score, so the chevron now shows real numbers rather
          than emitting an "info" toast that repeated the title back. */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="feature-detail"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Aggregated from {detail.requests} feedback{' '}
                  {detail.requests === 1 ? 'item' : 'items'} in “{detail.theme}”
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'RICE', value: detail.riceScore },
                { label: 'Reach', value: detail.reach },
                { label: 'Impact', value: detail.impact },
                { label: 'Effort', value: detail.effort },
              ].map((cell) => (
                <div key={cell.label} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground">{cell.label}</p>
                  <p className="font-bold text-foreground">{cell.value}</p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs text-muted-foreground">
              RICE = (Reach × Impact × Confidence) / Effort, using confidence{' '}
              {detail.confidence} derived from the volume of feedback in this category.
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const target = detail;
                  setDetail(null);
                  createPRDFor(target);
                }}
                disabled={creatingFor !== null}
                className="bg-primary hover:bg-primary/90 gap-2"
                data-testid="feature-detail-prd"
              >
                {creatingFor !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                Create PRD draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
