import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Plus, Sparkles, TrendingUp, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import api from '@/lib/trpc';

// Types returned by the feedback-pipeline microservice (port 8001)
interface ThemeItem {
  feedback: string;
  theme: string;
  pain_point: string;
}
interface PipelineResult {
  message: string;
  filename: string;
  rows: number;
  processed_rows: number;
  columns: string[];
  theme_extraction: ThemeItem[];
  trend_analysis: Record<string, number>;
  feature_clusters: Record<string, string[]>;
}

interface UploadRecord {
  id: number;
  name: string;
  date: string;
  items: number;
  status: 'uploading' | 'completed' | 'partial' | 'failed';
  /** Rows rejected by the backend, when status is 'partial'. */
  failed?: number;
  /** Backend validation message, shown inline when rows were rejected. */
  error?: string;
}

export default function Feedback() {
  const [isDragging, setIsDragging] = useState(false);
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deep Analysis via pipeline microservice (port 8001)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const pipelineInputRef = useRef<HTMLInputElement>(null);

  const runPipelineAnalysis = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Deep Analysis only accepts CSV files');
      return;
    }
    setIsPipelineRunning(true);
    setPipelineResult(null);
    setPipelineError(null);
    toast.info(`Running deep analysis on ${file.name}…`, { duration: 4000 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pipeline/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err?.error || `Pipeline responded with ${response.status}`);
      }

      const body = await response.json();
      const result: PipelineResult = body.data ?? body;
      setPipelineResult(result);
      toast.success(`Deep analysis complete — ${result.processed_rows ?? 0} records processed`);
    } catch (err: any) {
      const msg = err.message || 'Pipeline analysis failed';
      setPipelineError(msg);
      toast.error('Deep analysis failed', { description: msg });
    } finally {
      setIsPipelineRunning(false);
    }
  };

  // "Add Source" — a source exists once feedback carries its name, so the
  // dialog creates one real seed record with that source. The old handler was a
  // stub toast that created nothing, leaving the list unchanged.
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) {
      toast.error('Name the source');
      return;
    }
    if (!sourceText.trim()) {
      toast.error('Add an example feedback entry so the source has data');
      return;
    }

    setIsAddingSource(true);
    try {
      // POST /api/feedback takes a single feedback object directly (or a bare
      // array for bulk) — there is no wrapper key.
      await api.post('/feedback', {
        text: sourceText.trim(),
        source: sourceName.trim(),
        // Match the capitalization used by the imported dataset so this row
        // groups with the rest rather than forming a separate bucket.
        sentiment: 'Neutral',
      });
      toast.success('Source added', {
        description: `"${sourceName.trim()}" now appears in the source breakdown.`,
      });
      setSourceOpen(false);
      setSourceName('');
      setSourceText('');
      fetchStats({ method: 'GET', url: '/stats' });
    } catch (err: any) {
      const details = err.response?.data?.details;
      toast.error('Could not add source', {
        description: Array.isArray(details) && details.length
          ? details.map((d: any) => d.message ?? JSON.stringify(d)).join('; ')
          : err.response?.data?.error || err.message,
      });
    } finally {
      setIsAddingSource(false);
    }
  };

  const { data: statsData, fetchData: fetchStats } = useApi<any>();

  useEffect(() => {
    fetchStats({ method: 'GET', url: '/stats' });
  }, [fetchStats]);

  const processFile = async (file: File) => {
    const uploadId = Date.now();
    const record: UploadRecord = {
      id: uploadId,
      name: file.name,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: 0,
      status: 'uploading',
    };
    setRecentUploads(prev => [record, ...prev]);
    setIsUploading(true);

    try {
      const text = await file.text();
      let feedbackItems: any[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        feedbackItems = Array.isArray(parsed) ? parsed : [parsed];
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or has no data rows');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const textIdx = headers.findIndex(h => h.includes('text') || h.includes('feedback') || h.includes('review') || h.includes('comment'));

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const feedbackText = textIdx >= 0 ? values[textIdx]?.trim() : values[0]?.trim();
          if (feedbackText) {
            feedbackItems.push({ text: feedbackText, source: 'CSV Upload' });
          }
        }
      } else {
        // Treat as plain text — each line is a feedback item
        feedbackItems = text.split('\n')
          .filter(l => l.trim())
          .map(line => ({ text: line.trim(), source: 'File Upload' }));
      }

      if (feedbackItems.length === 0) throw new Error('No feedback items found in file');

      // Ensure all items have a text field
      feedbackItems = feedbackItems.map(item => ({
        text: item.text || item.feedback_text || item.review || item.comment || JSON.stringify(item),
        source: item.source || 'File Upload',
        category: item.category,
        sentiment: item.sentiment,
        priority: item.priority,
      }));

      const response = await api.post('/feedback', feedbackItems);
      const body = response.data ?? {};
      const count = body.count ?? body.inserted ?? feedbackItems.length;

      // 207 = partial success: some rows were written, some rejected. Show both
      // numbers and why the rejected rows failed, rather than a bare "completed".
      if (response.status === 207 && Array.isArray(body.errors) && body.errors.length) {
        const summary = body.errors
          .slice(0, 3)
          .map((e: any) => `row ${e.index + 1} — ${e.field}: ${e.message}`)
          .join('; ');
        const more = body.errors.length > 3 ? ` (+${body.errors.length - 3} more)` : '';
        const detail = `${summary}${more}`;

        setRecentUploads(prev => prev.map(u =>
          u.id === uploadId
            ? { ...u, items: count, status: 'partial', failed: body.failed ?? 0, error: detail }
            : u
        ));
        toast.warning(`${file.name}: ${count} imported, ${body.failed ?? 0} failed`, {
          description: detail,
        });
      } else {
        setRecentUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, items: count, status: 'completed', error: undefined } : u
        ));
        toast.success(`${file.name}: ${count} feedback ${count === 1 ? 'record' : 'records'} imported`);
      }

      // Refresh stats
      fetchStats({ method: 'GET', url: '/stats' });
    } catch (err: any) {
      // A 400 means nothing was written. Bulk requests answer with
      // errors: [{ index, field, message }]; single records use details:
      // [{ path, message }]. Surface whichever the backend actually sent.
      const res = err.response?.data;
      const rowErrors = Array.isArray(res?.errors) && res.errors.length
        ? res.errors
            .slice(0, 3)
            .map((e: any) => `row ${e.index + 1} — ${e.field}: ${e.message}`)
            .join('; ') + (res.errors.length > 3 ? ` (+${res.errors.length - 3} more)` : '')
        : null;
      const detail = Array.isArray(res?.details) && res.details.length
        ? res.details.map((d: any) => `${d.path}: ${d.message}`).join('; ')
        : null;
      const message = rowErrors || detail || res?.error || err.message || 'Upload failed';

      setRecentUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: 'failed', error: message } : u
      ));
      toast.error(`${file.name} failed`, { description: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  // Derive data sources from stats
  const dataSources = statsData?.bySource || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Feedback Ingestion</h1>
          <p className="text-sm text-muted-foreground mt-2">Upload and manage customer feedback from multiple sources</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Upload Feedback</CardTitle>
                <CardDescription>Support CSV, JSON, and plain text formats</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  )}
                  <p className="text-muted-foreground mb-2">Drag and drop your files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-4">CSV, JSON, TXT • Max 50MB per file</p>
                  <Button onClick={handleSelectFiles} disabled={isUploading} className="bg-primary hover:bg-primary/90">
                    {isUploading ? 'Uploading...' : 'Select Files'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>
                  {recentUploads.length > 0
                    ? 'Your uploaded feedback files this session'
                    : 'No uploads yet this session'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentUploads.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">FILE NAME</TableHead>
                        <TableHead className="text-muted-foreground">DATE</TableHead>
                        <TableHead className="text-muted-foreground">ITEMS</TableHead>
                        <TableHead className="text-muted-foreground">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUploads.map((upload) => (
                        <TableRow key={upload.id} className="border-border hover:bg-secondary/30 transition-colors">
                          <TableCell className="font-medium text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {upload.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{upload.date}</TableCell>
                          <TableCell className="text-foreground">{upload.items}</TableCell>
                          <TableCell>
                            {upload.status === 'uploading' && (
                              <Badge variant="outline" className="border-primary text-primary">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                uploading
                              </Badge>
                            )}
                            {upload.status === 'completed' && (
                              <Badge variant="outline" className="border-chart-1 text-chart-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                completed
                              </Badge>
                            )}
                            {upload.status === 'partial' && (
                              <div className="space-y-1">
                                <Badge variant="outline" className="border-chart-3 text-chart-3">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {upload.items} imported, {upload.failed} failed
                                </Badge>
                                {upload.error && (
                                  <p className="text-xs text-muted-foreground max-w-xs">{upload.error}</p>
                                )}
                              </div>
                            )}
                            {upload.status === 'failed' && (
                              <div className="space-y-1">
                                <Badge variant="outline" className="border-destructive text-destructive">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  failed
                                </Badge>
                                {upload.error && (
                                  <p className="text-xs text-destructive max-w-xs">{upload.error}</p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Upload a file to see it here. Recent uploads are tracked for the current session.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Deep Analysis Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle>Deep Analysis (Groq + Preprocessing)</CardTitle>
                </div>
                <CardDescription>
                  Upload a CSV to run the full pipeline: validate → clean → normalize → feature-engineer → Groq batch analysis → trend &amp; cluster extraction.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={pipelineInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) runPipelineAnalysis(f);
                    e.target.value = '';
                  }}
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) runPipelineAnalysis(f); }}
                  className="border-2 border-dashed border-primary/40 rounded-lg p-8 text-center transition-colors hover:border-primary/70 hover:bg-primary/5"
                >
                  {isPipelineRunning ? (
                    <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-primary/60 mx-auto mb-3" />
                  )}
                  <p className="text-muted-foreground mb-1 text-sm">Drop a CSV for end-to-end Groq analysis</p>
                  <p className="text-xs text-muted-foreground mb-4">Returns themes, pain points, trends &amp; feature clusters</p>
                  <Button
                    onClick={() => pipelineInputRef.current?.click()}
                    disabled={isPipelineRunning}
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
                    id="pipeline-upload-btn"
                  >
                    {isPipelineRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : <><Sparkles className="w-4 h-4" /> Run Deep Analysis</>}
                  </Button>
                </div>

                {pipelineError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pipelineError}</span>
                  </div>
                )}

                {pipelineResult && (
                  <div className="space-y-5 mt-2" id="pipeline-results">
                    {/* Summary row */}
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="outline" className="text-xs border-chart-1 text-chart-1">
                        {pipelineResult.rows} rows uploaded
                      </Badge>
                      <Badge variant="outline" className="text-xs border-chart-2 text-chart-2">
                        {pipelineResult.processed_rows} records analysed
                      </Badge>
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        {pipelineResult.filename}
                      </Badge>
                    </div>

                    {/* Theme Extraction table */}
                    {pipelineResult.theme_extraction?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-chart-1" />
                          <h4 className="text-sm font-semibold text-foreground">Theme Extraction</h4>
                          <span className="text-xs text-muted-foreground">({pipelineResult.theme_extraction.length} records)</span>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border bg-secondary/30">
                                <TableHead className="text-xs text-muted-foreground w-1/2">Feedback</TableHead>
                                <TableHead className="text-xs text-muted-foreground">Theme</TableHead>
                                <TableHead className="text-xs text-muted-foreground">Pain Point</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pipelineResult.theme_extraction.slice(0, 5).map((item, i) => (
                                <TableRow key={i} className="border-border hover:bg-secondary/30">
                                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{item.feedback}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-xs border-chart-1 text-chart-1 whitespace-nowrap">{item.theme}</Badge></TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{item.pain_point}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {pipelineResult.theme_extraction.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                              + {pipelineResult.theme_extraction.length - 5} more records
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trend Analysis */}
                    {pipelineResult.trend_analysis && Object.keys(pipelineResult.trend_analysis).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-chart-2" />
                          <h4 className="text-sm font-semibold text-foreground">Trend Analysis</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(pipelineResult.trend_analysis)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 12)
                            .map(([theme, count]) => (
                              <div key={theme} className="flex items-center gap-1 px-2 py-1 rounded-full bg-chart-2/10 border border-chart-2/30">
                                <span className="text-xs text-foreground">{theme}</span>
                                <span className="text-xs font-bold text-chart-2 ml-1">{String(count)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Feature Clusters */}
                    {pipelineResult.feature_clusters && Object.keys(pipelineResult.feature_clusters).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-semibold text-foreground">Feature Clusters</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(pipelineResult.feature_clusters).map(([cluster, items]) => (
                            <div key={cluster} className="rounded-lg border border-border bg-secondary/30 p-3">
                              <p className="text-xs font-semibold text-primary mb-2">{cluster}</p>
                              <div className="flex flex-wrap gap-1">
                                {(items as string[]).slice(0, 6).map((item, i) => (
                                  <Badge key={i} variant="outline" className="text-xs border-border text-muted-foreground">{item}</Badge>
                                ))}
                                {(items as string[]).length > 6 && (
                                  <span className="text-xs text-muted-foreground">+{(items as string[]).length - 6} more</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Sources */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Feedback by source from backend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataSources.length > 0 ? dataSources.map((source: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{source.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{source.value?.toLocaleString()} items</p>
                      </div>
                      <Badge variant="outline" className="border-chart-1 text-chart-1 text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No source data available</p>
                )}
                <Button
                  onClick={() => setSourceOpen(true)}
                  variant="outline"
                  className="w-full border-border hover:bg-secondary mt-4 gap-2"
                  data-testid="feedback-add-source"
                >
                  <Plus className="w-4 h-4" />
                  Add Source
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Source dialog. Writes one real feedback row tagged with the new
          source name, which is what makes the source appear in /api/stats. */}
      {sourceOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSourceOpen(false)}
        >
          <form
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddSource}
            data-testid="source-dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Add a feedback source</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Creates the source with a first entry. Bulk rows still come from CSV upload.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSourceOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="source-name">
                Source name
              </label>
              <Input
                id="source-name"
                data-testid="source-name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Intercom"
                disabled={isAddingSource}
                className="bg-secondary/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="source-text">
                First feedback entry
              </label>
              <textarea
                id="source-text"
                data-testid="source-text"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste a representative piece of feedback"
                disabled={isAddingSource}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSourceOpen(false)}
                disabled={isAddingSource}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingSource}
                className="bg-primary hover:bg-primary/90 gap-2"
                data-testid="source-confirm"
              >
                {isAddingSource && <Loader2 className="w-4 h-4 animate-spin" />}
                Add source
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
