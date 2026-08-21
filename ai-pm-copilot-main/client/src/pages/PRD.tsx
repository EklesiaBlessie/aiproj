import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertCircle,
  Copy,
  Download,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';

import {
  copyToClipboard,
  downloadTextFile,
} from '@/lib/interactions';

interface PRDSection {
  heading: string;
  items: string[];
}

interface PRDDraft {
  _id: string;
  title: string;
  feature?: string;
  status: 'draft' | 'review' | 'ready';
  overview?: string;
  sections: PRDSection[];
  aiGenerated: boolean;
  updatedAt: string;
}

interface GeneratedUserStory {
  story?: string;
}

interface GeneratedAcceptanceCriteria {
  criteria?: string[];
}

interface GeneratedPRD {
  title?: string;
  problem_statement?: string;
  target_users?: string[];
  goals?: string[];
  requirements?: string[];
  user_stories?: GeneratedUserStory[];
  acceptance_criteria?: GeneratedAcceptanceCriteria[];
  success_metrics?: string[];
  risks?: string[];
}

const STATUSES = ['draft', 'review', 'ready'] as const;

/**
 * Render a PRD draft as Markdown.
 */
function toMarkdown(prd: PRDDraft): string {
  const lines: string[] = [
    `# ${prd.title}`,
    '',
  ];

  if (prd.feature) {
    lines.push(`**Feature:** ${prd.feature}`, '');
  }

  lines.push(`**Status:** ${prd.status}`, '');

  if (prd.overview) {
    lines.push(
      '## Problem Statement',
      '',
      prd.overview,
      '',
    );
  }

  for (const section of prd.sections) {
    lines.push(
      `## ${section.heading}`,
      '',
    );

    for (const item of section.items) {
      lines.push(`- ${item}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

export default function PRD() {
  const [drafts, setDrafts] = useState<PRDDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [featureOptions, setFeatureOptions] = useState<string[]>([]);

  /**
   * Load saved PRD drafts.
   */
  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/prd');

      const list: PRDDraft[] = response.data?.data ?? [];

      setDrafts(list);

      setSelectedId(
        (current) =>
          current ?? list[0]?._id ?? null,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not load your PRD drafts',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load feature/category options.
   */
  useEffect(() => {
    loadDrafts();

    api
      .get('/stats')
      .then((res) => {
        const categories = (
          res.data?.data?.byCategory ?? []
        )
          .map((c: any) => c.name)
          .filter(Boolean);

        setFeatureOptions(categories);
      })
      .catch(() => {
        setFeatureOptions([]);
      });
  }, [loadDrafts]);

  /**
   * Currently selected draft.
   */
  const selected = useMemo(
    () =>
      drafts.find(
        (draft) => draft._id === selectedId,
      ) ?? null,
    [drafts, selectedId],
  );

  /**
   * Create a new PRD draft.
   */
  const handleCreate = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!newTitle.trim()) {
      toast.error('Give the PRD a title');
      return;
    }

    setIsCreating(true);

    try {
      const response = await api.post('/prd', {
        title: newTitle.trim(),
        feature:
          newFeature.trim() || undefined,
        status: 'draft',
      });

      const created: PRDDraft =
        response.data?.data;

      setDrafts((prev) => [
        created,
        ...prev,
      ]);

      setSelectedId(created._id);

      setNewTitle('');
      setNewFeature('');

      toast.success('Draft saved', {
        description: `"${created.title}" is stored on your account.`,
      });
    } catch (err: any) {
      const details =
        err?.response?.data?.details;

      toast.error('Could not save draft', {
        description:
          Array.isArray(details) &&
          details.length
            ? details
                .map(
                  (d: any) => d.message,
                )
                .join('; ')
            : err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              'Could not save draft',
      });
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Update PRD status.
   */
  const handleStatusChange = async (
    draft: PRDDraft,
    status: PRDDraft['status'],
  ) => {
    const previous = drafts;

    setDrafts((prev) =>
      prev.map((d) =>
        d._id === draft._id
          ? { ...d, status }
          : d,
      ),
    );

    try {
      await api.patch(
        `/prd/${draft._id}`,
        { status },
      );

      toast.success(
        `"${draft.title}" marked ${status}`,
      );
    } catch (err: any) {
      setDrafts(previous);

      toast.error(
        'Could not update status',
        {
          description:
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Update failed',
        },
      );
    }
  };

  /**
   * Delete PRD.
   */
  const handleDelete = async (
    draft: PRDDraft,
  ) => {
    const previous = drafts;

    setDrafts((prev) =>
      prev.filter(
        (d) => d._id !== draft._id,
      ),
    );

    if (selectedId === draft._id) {
      setSelectedId(null);
    }

    try {
      await api.delete(
        `/prd/${draft._id}`,
      );

      toast.success(
        `"${draft.title}" deleted`,
      );
    } catch (err: any) {
      setDrafts(previous);

      toast.error('Delete failed', {
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Delete failed',
      });
    }
  };

  /**
   * Generate complete PRD through the backend.
   *
   * Backend endpoint:
   * POST /api/prd/generate
   *
   * Expected response:
   * {
   *   success: true,
   *   data: {
   *     title,
   *     problem_statement,
   *     target_users,
   *     goals,
   *     requirements,
   *     user_stories,
   *     acceptance_criteria,
   *     success_metrics,
   *     risks
   *   }
   * }
   */
  const handleGenerate = async () => {
    if (!selected) {
      toast.error(
        'Select a PRD draft first',
      );
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await api.post(
        '/prd/generate',
        {
          question: `Generate a PRD for: ${selected.title}${
            selected.feature
              ? ` (feature area: ${selected.feature})`
              : ''
          }`,
        },
      );

      const generated: GeneratedPRD =
        response.data?.data ??
        response.data;

      /**
       * Convert AI PRD JSON into the
       * frontend section format.
       */
      const sections: PRDSection[] =
        [
          {
            heading:
              'Problem Statement',
            items:
              generated.problem_statement
                ? [
                    generated.problem_statement,
                  ]
                : [],
          },

          {
            heading: 'Target Users',
            items:
              generated.target_users ??
              [],
          },

          {
            heading: 'Goals',
            items:
              generated.goals ?? [],
          },

          {
            heading: 'Requirements',
            items:
              generated.requirements ??
              [],
          },

          {
            heading: 'User Stories',
            items: (
              generated.user_stories ??
              []
            )
              .map(
                (
                  story: GeneratedUserStory,
                ) => story.story ?? '',
              )
              .filter(Boolean),
          },

          {
            heading:
              'Acceptance Criteria',
            items: (
              generated.acceptance_criteria ??
              []
            ).flatMap(
              (
                item: GeneratedAcceptanceCriteria,
              ) =>
                item.criteria ?? [],
            ),
          },

          {
            heading:
              'Success Metrics',
            items:
              generated.success_metrics ??
              [],
          },

          {
            heading: 'Risks',
            items:
              generated.risks ?? [],
          },
        ].filter(
          (section) =>
            section.items.length > 0,
        );

      /**
       * Update the selected draft
       * immediately in frontend.
       */
      const updatedDraft: PRDDraft = {
        ...selected,

        title:
          generated.title ||
          selected.title,

        overview:
          generated.problem_statement ||
          selected.overview,

        sections,

        aiGenerated: true,

        updatedAt:
          new Date().toISOString(),
      };

      setDrafts((prev) =>
        prev.map((draft) =>
          draft._id === selected._id
            ? updatedDraft
            : draft,
        ),
      );

      toast.success(
        'PRD generated successfully',
        {
          description:
            'Problem statement, requirements, user stories and acceptance criteria are ready.',
        },
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'PRD generation failed';

      setGenerateError(message);

      toast.error(
        'PRD generation failed',
        {
          description: message,
        },
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Copy PRD as Markdown.
   */
  const handleCopy = async () => {
    if (!selected) return;

    await copyToClipboard(
      toMarkdown(selected),
      `"${selected.title}" copied as Markdown`,
    );
  };

  /**
   * Export PRD as Markdown file.
   */
  const handleExport = () => {
    if (!selected) return;

    const filename = `${selected.title
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()}.md`;

    downloadTextFile(
      filename,
      toMarkdown(selected),
    );

    toast.success('Export started', {
      description: `Downloading ${filename}`,
    });
  };

  /**
   * Loading state.
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />

          <p className="text-muted-foreground">
            Loading your PRD drafts...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Error state.
   */
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-12 h-12" />

          <p className="text-lg font-semibold">
            Failed to load PRDs
          </p>

          <p className="text-sm">
            {error}
          </p>

          <Button
            onClick={loadDrafts}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            PRD Generator
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Create and manage PRD drafts.
            Generate a complete AI-powered
            PRD from customer feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE */}
          <div className="lg:col-span-1 space-y-6">

            {/* Create draft */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>
                  New draft
                </CardTitle>

                <CardDescription>
                  Saved to your account
                  immediately
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={handleCreate}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label htmlFor="prd-title">
                      Title
                    </Label>

                    <Input
                      id="prd-title"
                      data-testid="prd-title"
                      value={newTitle}
                      onChange={(e) =>
                        setNewTitle(
                          e.target.value,
                        )
                      }
                      placeholder="e.g. PDF Export Feature"
                      className="bg-secondary/50 border-border"
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prd-feature">
                      Feature area
                    </Label>

                    <select
                      id="prd-feature"
                      data-testid="prd-feature"
                      value={newFeature}
                      onChange={(e) =>
                        setNewFeature(
                          e.target.value,
                        )
                      }
                      disabled={isCreating}
                      className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
                    >
                      <option value="">
                        — none —
                      </option>

                      {featureOptions.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreating}
                    data-testid="prd-create"
                    className="w-full bg-primary hover:bg-primary/90 gap-2"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}

                    Create draft
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Draft list */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>
                  Your drafts
                </CardTitle>

                <CardDescription>
                  {drafts.length} saved{' '}
                  {drafts.length === 1
                    ? 'document'
                    : 'documents'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {drafts.length > 0 ? (
                  drafts.map((draft) => (
                    <button
                      key={draft._id}
                      onClick={() =>
                        setSelectedId(
                          draft._id,
                        )
                      }
                      data-testid={`prd-select-${draft._id}`}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedId ===
                        draft._id
                          ? 'bg-primary/20 border-primary text-foreground'
                          : 'bg-secondary/50 border-border hover:bg-secondary text-foreground'
                      }`}
                    >
                      <p className="font-medium text-sm">
                        {draft.title}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-chart-1 text-chart-1"
                        >
                          {draft.status}
                        </Badge>

                        {draft.feature && (
                          <span className="text-xs text-muted-foreground">
                            {draft.feature}
                          </span>
                        )}

                        {draft.aiGenerated && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            AI
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No drafts yet —
                    create one above.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-2">

            {!selected ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>
                    PRD Preview
                  </CardTitle>

                  <CardDescription>
                    Select a draft, or create
                    one to get started
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">
                    No draft selected
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">

                {/* PRD HEADER */}
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1">

                    <CardTitle data-testid="prd-selected-title">
                      {selected.title}
                    </CardTitle>

                    <CardDescription className="mt-2">
                      {selected.overview ||
                        'No problem statement yet.'}
                    </CardDescription>

                    <div className="flex items-center gap-2 mt-3">
                      {STATUSES.map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleStatusChange(
                                selected,
                                status,
                              )
                            }
                            data-testid={`prd-status-${status}`}
                          >
                            <Badge
                              variant="outline"
                              className={
                                selected.status ===
                                status
                                  ? 'border-primary text-primary cursor-pointer'
                                  : 'border-muted-foreground text-muted-foreground cursor-pointer'
                              }
                            >
                              {status}
                            </Badge>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 shrink-0">

                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-secondary"
                      data-testid="prd-copy"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>

                    <Button
                      onClick={handleExport}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-secondary"
                      data-testid="prd-export"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>

                    <Button
                      onClick={() =>
                        handleDelete(
                          selected,
                        )
                      }
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border hover:bg-destructive/20 hover:text-destructive"
                      data-testid="prd-delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">

                  {/* GENERATE BUTTON */}
                  <div className="flex items-center gap-3">

                    <Button
                      onClick={
                        handleGenerate
                      }
                      disabled={
                        isGenerating
                      }
                      className="bg-primary hover:bg-primary/90 gap-2"
                      data-testid="prd-generate"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}

                      {isGenerating
                        ? 'Generating PRD...'
                        : 'Generate content with AI'}
                    </Button>
                  </div>

                  {/* ERROR */}
                  {generateError && (
                    <div
                      className="flex items-start gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/10"
                      data-testid="prd-ai-error"
                    >
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          AI content generation failed
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {generateError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PRD SECTIONS */}
                  {selected.sections.length >
                  0 ? (
                    <Tabs
                      defaultValue={
                        selected
                          .sections[0]
                          .heading
                      }
                      className="space-y-4"
                    >
                      <TabsList className="bg-secondary border-border">
                        {selected.sections.map(
                          (section) => (
                            <TabsTrigger
                              key={
                                section.heading
                              }
                              value={
                                section.heading
                              }
                            >
                              {
                                section.heading
                              }
                            </TabsTrigger>
                          ),
                        )}
                      </TabsList>

                      {selected.sections.map(
                        (section) => (
                          <TabsContent
                            key={
                              section.heading
                            }
                            value={
                              section.heading
                            }
                            className="space-y-2"
                          >
                            {section.items.map(
                              (
                                item,
                                idx,
                              ) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-secondary/50 border border-border flex gap-2"
                                >
                                  <span className="text-primary">
                                    •
                                  </span>

                                  <span className="text-sm text-foreground whitespace-pre-wrap">
                                    {item}
                                  </span>
                                </div>
                              ),
                            )}
                          </TabsContent>
                        ),
                      )}
                    </Tabs>
                  ) : (
                    <div className="text-center py-10 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">
                        This draft has
                        no body sections
                        yet.
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        Click "Generate
                        content with AI"
                        to create the
                        complete PRD.
                      </p>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}