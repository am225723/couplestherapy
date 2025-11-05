import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import type { TherapistAnalytics, CoupleAnalytics } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, ClipboardCheck, Sparkles, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

function getEngagementBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 80) return 'default'; // Green (using default which maps to primary)
  if (score >= 50) return 'secondary'; // Yellow
  return 'destructive'; // Red
}

function getEngagementLabel(score: number): string {
  if (score >= 80) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  testId 
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
        <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CoupleCard({ couple }: { couple: CoupleAnalytics }) {
  const engagementVariant = getEngagementBadgeVariant(couple.engagement_score);
  const engagementLabel = getEngagementLabel(couple.engagement_score);

  return (
    <Card data-testid={`card-couple-${couple.couple_id}`} className="hover-elevate">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">
              {couple.partner1_name} & {couple.partner2_name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {couple.last_activity_date 
                ? `Last active ${formatDistanceToNow(new Date(couple.last_activity_date), { addSuffix: true })}`
                : 'No recent activity'}
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
            <div className="text-sm font-medium text-muted-foreground">Check-in Rate</div>
            <div className="text-2xl font-bold" data-testid={`text-checkin-rate-${couple.couple_id}`}>
              {couple.checkin_completion_rate}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Total Check-ins</div>
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
              <div className="font-semibold">{couple.goals_completed}/{couple.goals_total}</div>
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
            <div className="text-xl font-bold">{couple.avg_connectedness.toFixed(1)}/10</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Avg Conflict
            </div>
            <div className="text-xl font-bold">{couple.avg_conflict.toFixed(1)}/10</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<TherapistAnalytics>({
    queryKey: ['/api/therapist/analytics', profile?.id],
    enabled: !!profile?.id,
  });

  if (error) {
    toast({
      title: 'Error loading analytics',
      description: error instanceof Error ? error.message : 'Failed to fetch analytics data',
      variant: 'destructive',
    });
  }

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
    .map(c => ({
      name: `${c.partner1_name.split(' ')[0]} & ${c.partner2_name.split(' ')[0]}`,
      score: c.engagement_score,
      couple_id: c.couple_id,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 couples

  const completionRateChartData = data.couples
    .map(c => ({
      name: `${c.partner1_name.split(' ')[0]} & ${c.partner2_name.split(' ')[0]}`,
      rate: c.checkin_completion_rate,
      couple_id: c.couple_id,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10); // Top 10 couples

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold" data-testid="heading-analytics">Analytics Dashboard</h1>
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
              <CardDescription>Top 10 couples by engagement level</CardDescription>
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
              <CardDescription>Top 10 couples by completion rate</CardDescription>
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
              <CoupleCard key={couple.couple_id} couple={couple} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
