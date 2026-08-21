import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Merge, Split, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';
import { useApi } from '@/hooks/useApi';
import { AI_UNAVAILABLE_MESSAGE, requestAnalysis } from '@/lib/interactions';

/* ────────────────────────────────────────────────────────────────────────────
 * Theme Extraction.
 *
 * The table is Class A: it aggregates Eklessia's precomputed `category` values
 * straight from /api/feedback, and the merge/split row actions are real bulk
 * recategorizations over that same data (POST /api/themes/merge and /split).
 *
 * "Re-cluster Themes" is Class B. Live reclustering would re-run NLP theme
 * extraction, which needs Yash's service. The button calls /api/analyze,
 * detects the mock fallback, and reports it within seconds instead of hanging.
 * It does not re-implement clustering locally as a substitute.
 * ──────────────────────────────────────────────────────────────────────── */

interface ThemeRow {
  id: number;
  name: string;
  itemCount: number;
  trendDirection: 'up' | 'down';
  sentiment: string;
  lastSeen: string;
}

const SPLIT_BY_FIELDS = ['source', 'sentiment', 'city', 'visitType'] as const;

export default function Themes() {
  const { data: feedbackData, isLoading, error, fetchData } = useApi<any>();

  // Cluster (AI) state — separate from the table so a failed call leaves the
  // real categories untouched.
  const [isClustering, setIsClustering] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  // Merge dialog state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeFrom, setMergeFrom] = useState<string[]>([]);
  const [mergeInto, setMergeInto] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Split dialog state
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTheme, setSplitTheme] = useState('');
  const [splitBy, setSplitBy] = useState<string>('source');
  const [isSplitting, setIsSplitting] = useState(false);

  useEffect(() => {
    fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchData]);

  const feedbackList: any[] = Array.isArray(feedbackData) ? feedbackData : [];

  const themes: ThemeRow[] = useMemo(() => {
    const map = new Map<string, { count: number; sentiments: Record<string, number>; lastSeen: string }>();
    feedbackList.forEach((fb: any) => {
      const cat = fb.theme || fb.category || 'Uncategorized';
      const existing = map.get(cat) || { count: 0, sentiments: {}, lastSeen: '' };
      existing.count += 1;
      const sent = fb.sentiment || 'neutral';
      existing.sentiments[sent] = (existing.sentiments[sent] || 0) + 1;
      if (fb.createdAt && (!existing.lastSeen || fb.createdAt > existing.lastSeen)) {
        existing.lastSeen = fb.createdAt;
      }
      map.set(cat, existing);
    });

    return Array.from(map.entries())
      .map(([name, data], idx) => {
        const dominantSentiment = Object.entries(data.sentiments).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        return {
          id: idx + 1,
          name,
          itemCount: data.count,
          trendDirection: data.count > 50 ? ('up' as const) : ('down' as const),
          sentiment: dominantSentiment.toLowerCase(),
          lastSeen: data.lastSeen ? new Date(data.lastSeen).toLocaleDateString() : 'N/A',
        };
      })
      .sort((a, b) => b.itemCount - a.itemCount);
  }, [feedbackList]);

  const reload = useCallback(() => {
    fetchData({ method: 'GET', url: '/feedback', params: { limit: 100 } });
  }, [fetchData]);

  const openMerge = (theme: string) => {
    setMergeFrom([theme]);
    setMergeInto('');
    setMergeOpen(true);
  };

  const openSplit = (theme: string) => {
    setSplitTheme(theme);
    setSplitBy('source');
    setSplitOpen(true);
  };

  const handleMerge = async () => {
    if (mergeFrom.length === 0) {
      toast.error('Select at least one theme to merge');
      return;
    }
    if (!mergeInto.trim()) {
      toast.error('Enter a target theme');
      return;
    }
    if (mergeFrom.includes(mergeInto.trim())) {
      toast.error('Cannot merge a theme into itself');
      return;
    }

    setIsMerging(true);
    try {
      const response = await api.post('/themes/merge', {
        from: mergeFrom,
        into: mergeInto.trim(),
      });
      toast.success('Themes merged', { description: response.data.message });
      setMergeOpen(false);
      setMergeFrom([]);
      setMergeInto('');
      reload();
    } catch (err: any) {
      const details = err.response?.data?.details;
      toast.error('Merge failed', {
        description: Array.isArray(details) && details.length
          ? details.map((d: any) => d.message).join('; ')
          : err.response?.data?.error || err.message,
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleSplit = async () => {
    if (!splitTheme) return;
    setIsSplitting(true);
    try {
      const response = await api.post('/themes/split', {
        theme: splitTheme,
        by: splitBy,
      });
      const groups = (response.data.data ?? []) as Array<{ theme: string; count: number }>;
      toast.success('Theme split', {
        description: `${response.data.message}. ${groups.map((g) => `${g.theme} (${g.count})`).join(', ')}`,
      });
      setSplitOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Split failed', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsSplitting(false);
    }
  };

  /** Class B — see the header note. Fails fast and honestly. */
  const handleRecluster = async () => {
    setIsClustering(true);
    setClusterError(null);

    const result = await requestAnalysis(
      `Re-cluster feedback themes for: ${themes.slice(0, 10).map((t) => t.name).join(', ')}`
    );
    setIsClustering(false);

    if (!result.live) {
      setClusterError(result.error ?? AI_UNAVAILABLE_MESSAGE);
      toast.warning('Re-clustering unavailable', { description: result.error ?? AI_UNAVAILABLE_MESSAGE });
      return;
    }

    toast.success('Analysis service responded', {
      description: 'Re-clustering lands with the real /analyze integration.',
    });
  };

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
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Theme Extraction</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Themes aggregated from feedback categories. Merge and split to clean up the taxonomy.
            </p>
          </div>
          <Button
            onClick={handleRecluster}
            disabled={isClustering}
            className="bg-primary hover:bg-primary/90"
            data-testid="themes-recluster"
          >
            {isClustering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isClustering ? 'Checking service...' : 'Re-cluster Themes'}
          </Button>
        </div>

        {clusterError && (
          <div
            className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-chart-3/40 bg-chart-3/10"
            data-testid="themes-ai-unavailable"
          >
            <AlertCircle className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Re-clustering unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">{clusterError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                The current themes below come from the imported dataset — merge and split still work.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setClusterError(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Discovered Themes</CardTitle>
            <CardDescription>
              Aggregated from {feedbackList.length.toLocaleString()} feedback items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">THEME</TableHead>
                    <TableHead className="text-muted-foreground">ITEMS</TableHead>
                    <TableHead className="text-muted-foreground">TREND</TableHead>
                    <TableHead className="text-muted-foreground">SENTIMENT</TableHead>
                    <TableHead className="text-muted-foreground">LAST SEEN</TableHead>
                    <TableHead className="text-muted-foreground">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {themes.length > 0 ? themes.map((theme) => (
                    <TableRow key={theme.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{theme.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{theme.itemCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {theme.trendDirection === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-chart-3" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-chart-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            theme.sentiment === 'negative'
                              ? 'border-chart-3 text-chart-3'
                              : theme.sentiment === 'positive'
                              ? 'border-chart-1 text-chart-1'
                              : 'border-muted-foreground text-muted-foreground'
                          }
                        >
                          {theme.sentiment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{theme.lastSeen}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openMerge(theme.name)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-secondary"
                            title={`Merge "${theme.name}" into another theme`}
                            data-testid={`merge-${theme.id}`}
                          >
                            <Merge className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => openSplit(theme.name)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-secondary"
                            title={`Split "${theme.name}"`}
                            data-testid={`split-${theme.id}`}
                          >
                            <Split className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No themes found. Upload feedback data first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merge dialog */}
      {mergeOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setMergeOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="merge-dialog"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Merge themes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Refiles every feedback row under the selected themes into one target.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMergeOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {themes.map((theme) => {
                  const checked = mergeFrom.includes(theme.name);
                  return (
                    <label
                      key={theme.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border cursor-pointer hover:bg-secondary text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setMergeFrom((prev) =>
                            e.target.checked
                              ? [...prev, theme.name]
                              : prev.filter((n) => n !== theme.name)
                          )
                        }
                      />
                      <span className="flex-1 text-foreground">{theme.name}</span>
                      <span className="text-xs text-muted-foreground">{theme.itemCount}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="merge-into">Into</label>
              <Input
                id="merge-into"
                data-testid="merge-into"
                value={mergeInto}
                onChange={(e) => setMergeInto(e.target.value)}
                placeholder="Target theme name"
                disabled={isMerging}
                className="bg-secondary/50 border-border"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setMergeOpen(false)} disabled={isMerging}>
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={isMerging || mergeFrom.length === 0 || !mergeInto.trim()}
                data-testid="merge-confirm"
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {isMerging && <Loader2 className="w-4 h-4 animate-spin" />}
                Merge themes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Split dialog */}
      {splitOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSplitOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="split-dialog"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Split theme</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Split <span className="font-medium text-foreground">{splitTheme}</span> into narrower
                  themes by an existing field on each row.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSplitOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="split-by">Split by</label>
              <select
                id="split-by"
                data-testid="split-by"
                value={splitBy}
                onChange={(e) => setSplitBy(e.target.value)}
                disabled={isSplitting}
                className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
              >
                {SPLIT_BY_FIELDS.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Each distinct value becomes a new theme, e.g. {splitTheme} — Google Reviews.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSplitOpen(false)} disabled={isSplitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSplit}
                disabled={isSplitting}
                data-testid="split-confirm"
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {isSplitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Split theme
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
