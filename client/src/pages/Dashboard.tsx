import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Layers,
  MessageSquare,
  Settings,
  Upload,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';

type StatItem = {
  name: string;
  value: number;
};

type StatsData = {
  total?: number;
  byCategory?: StatItem[];
  bySource?: StatItem[];
  byPriority?: StatItem[];
  bySentiment?: StatItem[];
};

type Feedback = {
  _id?: string;
  feedbackId?: string;
  text?: string;
  source?: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  createdAt?: string;
};

type PRD = {
  _id?: string;
  title?: string;
  status?: string;
  sections?: unknown[];
  updatedAt?: string;
};

const SOURCE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#f59e0b',
};

const CATEGORY_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#84cc16',
];

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

export default function Dashboard() {
  /*
   * IMPORTANT:
   * Every React hook is kept ABOVE every conditional return.
   *
   * The previous Dashboard had useMemo calls below the loading/error
   * returns. On the first render those hooks were skipped; after the API
   * finished loading they ran. That changes the number/order of hooks and
   * causes:
   *
   * "Rendered fewer hooks than expected."
   *
   * This version deliberately uses NO useMemo at all.
   */

  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    fetchData: fetchStats,
  } = useApi<StatsData>();

  const {
    data: feedbackData,
    isLoading: isFeedbackLoading,
    error: feedbackError,
    fetchData: fetchFeedback,
  } = useApi<Feedback[]>();

  const {
    data: prdData,
    isLoading: isPRDLoading,
    fetchData: fetchPRDs,
  } = useApi<PRD[]>();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchStats({
      method: 'GET',
      url: '/stats',
    });

    void fetchFeedback({
      method: 'GET',
      url: '/feedback',
      params: {
        limit: 100,
        page: 1,
      },
    });

    void fetchPRDs({
      method: 'GET',
      url: '/prd',
    }).catch(() => {
      // PRDs are optional for the dashboard.
    });
  }, [fetchStats, fetchFeedback, fetchPRDs]);

  const handleRetry = async () => {
    setRefreshing(true);

    try {
      await Promise.allSettled([
        fetchStats({
          method: 'GET',
          url: '/stats',
        }),
        fetchFeedback({
          method: 'GET',
          url: '/feedback',
          params: {
            limit: 100,
            page: 1,
          },
        }),
        fetchPRDs({
          method: 'GET',
          url: '/prd',
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * These are normal variables, NOT hooks.
   * They can safely be calculated after the hooks and before rendering.
   */
  const stats: StatsData = {
    total: Number(statsData?.total ?? 0),
    byCategory: asArray<StatItem>(statsData?.byCategory),
    bySource: asArray<StatItem>(statsData?.bySource),
    byPriority: asArray<StatItem>(statsData?.byPriority),
    bySentiment: asArray<StatItem>(statsData?.bySentiment),
  };

  const feedbackList = asArray<Feedback>(feedbackData);
  const prdList = asArray<PRD>(prdData);

  const topCategories = [...(stats.byCategory ?? [])]
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 8);

  const sourceData = [...(stats.bySource ?? [])]
    .sort((a, b) => Number(b.value) - Number(a.value));

  const priorityData = [...(stats.byPriority ?? [])]
    .sort((a, b) => Number(b.value) - Number(a.value));

  const sentimentData = [...(stats.bySentiment ?? [])]
    .sort((a, b) => Number(b.value) - Number(a.value));

  const recentFeedback = [...feedbackList]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 5);

  const recentPRDs = [...prdList]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    )
    .slice(0, 4);

  const highPriority =
    (stats.byPriority ?? []).find(
      (item) => String(item.name).toLowerCase() === 'high',
    )?.value ?? 0;

  const readyPRDs = prdList.filter(
    (prd) => String(prd.status).toLowerCase() === 'ready',
  ).length;

  /*
   * We intentionally do NOT return early until after ALL hooks have already
   * been called. This keeps the hook order identical on every render.
   */
  if (isStatsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <CardTitle>Unable to load dashboard</CardTitle>
            </div>
            <CardDescription>
              The dashboard could not retrieve statistics from the backend.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-destructive mb-4">
              {String(statsError)}
            </p>

            <Button onClick={handleRetry} disabled={refreshing}>
              {refreshing ? 'Retrying...' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              AI Product Manager Copilot
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customer feedback intelligence dashboard
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>

            <Link href="/feedback">
              <Button size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TOTAL FEEDBACK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">
                  {Number(stats.total).toLocaleString()}
                </span>
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Analyzed customer feedback
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                THEMES FOUND
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">
                  {stats.byCategory?.length ?? 0}
                </span>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Layers className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Product-related categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                HIGH PRIORITY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">
                  {Number(highPriority).toLocaleString()}
                </span>
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Issues requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PRDS GENERATED
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">
                  {prdList.length}
                </span>
                <div className="p-3 rounded-full bg-green-500/10">
                  <FileText className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {readyPRDs} ready
                {isPRDLoading ? ' · loading...' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CATEGORY + SOURCES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Feedback by Category</CardTitle>
              <CardDescription>
                Most reported product-related issues
              </CardDescription>
            </CardHeader>

            <CardContent>
              {topCategories.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={topCategories}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Feedback"
                      radius={[0, 5, 5, 0]}
                      fill="#6366f1"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Distribution of customer feedback sources
              </CardDescription>
            </CardHeader>

            <CardContent>
              {sourceData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No source data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {sourceData.map((_, index) => (
                        <Cell
                          key={`source-${index}`}
                          fill={
                            SOURCE_COLORS[
                              index % SOURCE_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PRIORITY + SENTIMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>
                AI-classified feedback priority
              </CardDescription>
            </CardHeader>

            <CardContent>
              {priorityData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                  No priority data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Feedback"
                      radius={[5, 5, 0, 0]}
                      fill="#ef4444"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Sentiment</CardTitle>
              <CardDescription>
                Overall sentiment across analyzed feedback
              </CardDescription>
            </CardHeader>

            <CardContent>
              {sentimentData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                  No sentiment data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {sentimentData.map((item, index) => {
                        const key = String(item.name).toLowerCase();

                        return (
                          <Cell
                            key={`sentiment-${index}`}
                            fill={
                              SENTIMENT_COLORS[key] ||
                              SOURCE_COLORS[
                                index % SOURCE_COLORS.length
                              ]
                            }
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* TOP PRODUCT ISSUES */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Product Issues</CardTitle>
                <CardDescription>
                  Most frequently reported customer problems
                </CardDescription>
              </div>

              <Link href="/themes">
                <Button variant="outline" size="sm" className="gap-2">
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {topCategories.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No category information available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-4 text-sm font-medium text-muted-foreground">
                        CATEGORY
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-muted-foreground">
                        COUNT
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-muted-foreground">
                        SHARE
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-muted-foreground">
                        SEVERITY
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {topCategories.map((category, index) => {
                      const percentage =
                        Number(stats.total) > 0
                          ? (
                              (Number(category.value) /
                                Number(stats.total)) *
                              100
                            ).toFixed(1)
                          : '0.0';

                      let severity = 'Low';

                      if (Number(category.value) >= 100) {
                        severity = 'High';
                      } else if (Number(category.value) >= 50) {
                        severity = 'Medium';
                      }

                      return (
                        <tr
                          key={`${category.name}-${index}`}
                          className="border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[
                                      index %
                                        CATEGORY_COLORS.length
                                    ],
                                }}
                              />
                              <span className="font-medium">
                                {category.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-semibold">
                            {Number(category.value).toLocaleString()}
                          </td>

                          <td className="py-4 px-4 text-muted-foreground">
                            {percentage}%
                          </td>

                          <td className="py-4 px-4">
                            <Badge
                              variant={
                                severity === 'High'
                                  ? 'destructive'
                                  : severity === 'Medium'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {severity}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT FEEDBACK + PRDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Feedback</CardTitle>
                  <CardDescription>
                    Latest customer feedback received
                  </CardDescription>
                </div>

                <Link href="/feedback">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {isFeedbackLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading feedback...
                </div>
              ) : feedbackError ? (
                <div className="py-8 text-center text-sm text-destructive">
                  Unable to load recent feedback.
                </div>
              ) : recentFeedback.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No recent feedback available.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentFeedback.map((feedback, index) => (
                    <div
                      key={
                        feedback._id ||
                        feedback.feedbackId ||
                        `feedback-${index}`
                      }
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2 gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {feedback.category && (
                            <Badge variant="outline">
                              {feedback.category}
                            </Badge>
                          )}

                          {feedback.priority && (
                            <Badge
                              variant={
                                String(feedback.priority).toLowerCase() ===
                                'high'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {feedback.priority}
                            </Badge>
                          )}
                        </div>

                        {feedback.createdAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(
                              feedback.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <p className="text-sm line-clamp-2">
                        {feedback.text ||
                          'No feedback text available.'}
                      </p>

                      {feedback.source && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Source: {feedback.source}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent PRDs</CardTitle>
                  <CardDescription>
                    Product requirement documents generated
                  </CardDescription>
                </div>

                <Link href="/prd">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {recentPRDs.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No PRDs generated yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate a PRD from analyzed customer feedback.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPRDs.map((prd, index) => {
                    const status =
                      String(prd.status).toLowerCase() === 'ready'
                        ? 'Ready'
                        : String(prd.status).toLowerCase() === 'review'
                          ? 'Review'
                          : 'Draft';

                    return (
                      <div
                        key={prd._id || `prd-${index}`}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {prd.title || 'Untitled PRD'}
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
                            {prd.updatedAt
                              ? new Date(
                                  prd.updatedAt,
                                ).toLocaleDateString()
                              : 'Date unavailable'}
                            {' · '}
                            {Array.isArray(prd.sections)
                              ? prd.sections.length
                              : 0}{' '}
                            sections
                          </p>
                        </div>

                        <Badge
                          variant={
                            status === 'Ready'
                              ? 'default'
                              : status === 'Review'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}