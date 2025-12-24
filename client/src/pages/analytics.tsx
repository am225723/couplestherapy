import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  aiFunctions,
  AIInsightsResponse,
  TherapistAnalyticsResponse,
  CoupleAnalytics,
} from "@/lib/ai-functions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Activity,
  ClipboardCheck,
  Sparkles,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Brain,
  Loader2,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function getEngagementBadgeVariant(
  score: number,
): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default"; // Green (using default which maps to primary)
  if (score >= 50) return "secondary"; // Yellow
  return "destructive"; // Red
}

function getEngagementLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function KPICard({
  title,
  value,
  icon: Icon,
  testId,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`${testId}-value`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function CoupleCard({
  couple,
  onViewInsights,
  onExport,
  isExporting,
}: {
  couple: CoupleAnalytics;
  onViewInsights: () => void;
  onExport: () => void;
  isExporting: boolean;
}) {
  const engagementVariant = getEngagementBadgeVariant(couple.engagement_score);
  const engagementLabel = getEngagementLabel(couple.engagement_score);

  return (
    <Card
      data-testid={`card-couple-${couple.couple_id}`}
      className="hover-elevate"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">
              {couple.partner1_name} & {couple.partner2_name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {couple.last_activity_date
                ? `Last active ${formatDistanceToNow(new Date(couple.last_activity_date), { addSuffix: true })}`
                : "No recent activity"}
            </CardDescription>
          </div>
          <Badge
            variant={engagementVariant}
            data-testid={`badge-engagement-${couple.couple_id}`}
          >
            {engagementLabel} ({couple.engagement_score})
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Check-in Rate
            </div>
            <div
              className="text-2xl font-bold"
              data-testid={`text-checkin-rate-${couple.couple_id}`}
            >
              {couple.checkin_completion_rate}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Total Check-ins
            </div>
            <div className="text-2xl font-bold">{couple.total_checkins}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Gratitude</div>
              <div className="font-semibold">{couple.gratitude_count}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Goals Done</div>
              <div className="font-semibold">
                {couple.goals_completed}/{couple.goals_total}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Conversations</div>
              <div className="font-semibold">{couple.conversations_count}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Rituals</div>
              <div className="font-semibold">{couple.rituals_count}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg Connectedness
            </div>
            <div className="text-xl font-bold">
              {couple.avg_connectedness.toFixed(1)}/10
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Avg Conflict
            </div>
            <div className="text-xl font-bold">
              {couple.avg_conflict.toFixed(1)}/10
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewInsights}
            data-testid={`button-ai-insights-${couple.couple_id}`}
          >
            <Brain className="h-4 w-4 mr-2" />
            View AI Insights
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onExport}
            disabled={isExporting}
            data-testid={`button-export-${couple.couple_id}`}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AIInsightsDialog({
  coupleId,
  coupleName,
  therapistId,
  open,
  onOpenChange,
}: {
  coupleId: string;
  coupleName: string;
  therapistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [showRawAnalysis, setShowRawAnalysis] = useState(false);

  // Uses Supabase Edge Function for AI insights
  const {
    data: insights,
    isLoading,
    error,
  } = useQuery<AIInsightsResponse>({
    queryKey: ["ai-insights", coupleId],
    queryFn: () => aiFunctions.getAIInsights(coupleId),
    enabled: open && !!coupleId,
  });

  // Show error toast only when error changes (prevent infinite loop)
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading AI insights",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch AI insights",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] overflow-y-auto"
        data-testid="dialog-ai-insights"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights for {coupleName}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating insights...</p>
            </div>
          </div>
        )}

        {!isLoading && !insights && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No insights available. Please ensure at least one activity or
              assessment has been completed (Love Languages, Weekly Check-ins,
              Gratitude Logs, etc.) to generate meaningful insights.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && insights && (
          <div className="space-y-6 py-4">
            <div className="text-sm text-muted-foreground">
              Generated{" "}
              {formatDistanceToNow(new Date(insights.generated_at), {
                addSuffix: true,
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className="text-sm leading-relaxed"
                  data-testid="text-ai-summary"
                >
                  {insights.summary}
                </p>
              </CardContent>
            </Card>

            {insights.discrepancies && insights.discrepancies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="secondary">Discrepancies</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2" data-testid="list-ai-discrepancies">
                    {insights.discrepancies.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {insights.patterns && insights.patterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="secondary">Patterns</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2" data-testid="list-ai-patterns">
                    {insights.patterns.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {insights.strengths && insights.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline">Strengths</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2" data-testid="list-ai-strengths">
                    {insights.strengths.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {insights.recommendations &&
              insights.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge variant="default">Recommendations</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul
                      className="space-y-2"
                      data-testid="list-ai-recommendations"
                    >
                      {insights.recommendations.map((item, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

            {insights.data_sources && insights.data_sources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Sources Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {insights.data_sources.map((source, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {insights.citations && insights.citations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Citations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {insights.citations.map((citation, index) => (
                      <li key={index} className="text-xs">
                        <a
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {citation}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {insights.raw_analysis && (
              <Collapsible
                open={showRawAnalysis}
                onOpenChange={setShowRawAnalysis}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="text-sm">View Raw Analysis</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showRawAnalysis ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-2">
                    <CardContent className="pt-6">
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-md overflow-x-auto">
                        {insights.raw_analysis}
                      </pre>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [exportingCoupleId, setExportingCoupleId] = useState<string | null>(
    null,
  );

  const { data, isLoading, error } = useQuery<TherapistAnalyticsResponse>({
    queryKey: ["therapist-analytics"],
    queryFn: () => aiFunctions.getTherapistAnalytics(),
    enabled: !!profile?.id,
  });

  const selectedCouple = data?.couples.find(
    (c) => c.couple_id === selectedCoupleId,
  );

  const handleExport = async (coupleId: string) => {
    if (!profile?.id) return;

    try {
      setExportingCoupleId(coupleId);

      const url = `/api/therapist/export-couple-report?couple_id=${coupleId}&format=csv`;

      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `couple-report-${coupleId}-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export started",
        description: "Your report is downloading...",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExportingCoupleId(null);
    }
  };

  // Show error toast only when error changes (prevent infinite loop)
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading analytics",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        {/* KPI Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        {/* Charts Skeleton - 2 charts in 2-column grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
        {/* Couple Cards Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  // Prepare data for visualizations
  const engagementChartData = data.couples
    .map((c) => ({
      name: `${c.partner1_name.split(" ")[0]} & ${c.partner2_name.split(" ")[0]}`,
      score: c.engagement_score,
      couple_id: c.couple_id,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 couples

  const completionRateChartData = data.couples
    .map((c) => ({
      name: `${c.partner1_name.split(" ")[0]} & ${c.partner2_name.split(" ")[0]}`,
      rate: c.checkin_completion_rate,
      couple_id: c.couple_id,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10); // Top 10 couples

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold" data-testid="heading-analytics">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Comprehensive insights across all your couples
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Couples"
          value={data.total_couples}
          icon={Users}
          testId="card-kpi-total-couples"
        />
        <KPICard
          title="Active Couples"
          value={data.active_couples}
          icon={Activity}
          testId="card-kpi-active-couples"
        />
        <KPICard
          title="Overall Check-in Rate"
          value={`${data.overall_checkin_rate}%`}
          icon={ClipboardCheck}
          testId="card-kpi-checkin-rate"
        />
        <KPICard
          title="Total Gratitude Logs"
          value={data.total_gratitude_logs}
          icon={Sparkles}
          testId="card-kpi-gratitude-logs"
        />
        <KPICard
          title="Total Comments Given"
          value={data.total_comments_given}
          icon={MessageSquare}
          testId="card-kpi-comments-given"
        />
      </div>

      {/* Visualizations */}
      {data.couples.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Scores</CardTitle>
              <CardDescription>
                Top 10 couples by engagement level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Check-in Completion Rates</CardTitle>
              <CardDescription>
                Top 10 couples by completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionRateChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-Couple Summary Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Couple Details</h2>
        {data.couples.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No couples assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.couples.map((couple) => (
              <CoupleCard
                key={couple.couple_id}
                couple={couple}
                onViewInsights={() => setSelectedCoupleId(couple.couple_id)}
                onExport={() => handleExport(couple.couple_id)}
                isExporting={exportingCoupleId === couple.couple_id}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCouple && profile && (
        <AIInsightsDialog
          coupleId={selectedCouple.couple_id}
          coupleName={`${selectedCouple.partner1_name} & ${selectedCouple.partner2_name}`}
          therapistId={profile.id}
          open={!!selectedCoupleId}
          onOpenChange={(open) => !open && setSelectedCoupleId(null)}
        />
      )}
    </div>
  );
}
