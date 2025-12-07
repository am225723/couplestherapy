import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Smile,
  Frown,
  Meh,
  Heart,
  Brain,
  Zap,
  Cloud,
  Sparkles,
  User,
  Users,
  Calendar,
  TrendingUp,
  Sun,
  Moon,
  Plus,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";
import type { MoodEntry } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMOTIONS = [
  { name: "Happy", icon: Smile, color: "#22c55e", value: 8 },
  { name: "Excited", icon: Sparkles, color: "#f59e0b", value: 9 },
  { name: "Calm", icon: Cloud, color: "#06b6d4", value: 7 },
  { name: "Grateful", icon: Heart, color: "#ec4899", value: 8 },
  { name: "Content", icon: Sun, color: "#84cc16", value: 7 },
  { name: "Hopeful", icon: TrendingUp, color: "#8b5cf6", value: 7 },
  { name: "Neutral", icon: Meh, color: "#6b7280", value: 5 },
  { name: "Tired", icon: Moon, color: "#64748b", value: 4 },
  { name: "Anxious", icon: Zap, color: "#f97316", value: 3 },
  { name: "Stressed", icon: Brain, color: "#ef4444", value: 3 },
  { name: "Sad", icon: Frown, color: "#3b82f6", value: 2 },
  { name: "Frustrated", icon: Zap, color: "#dc2626", value: 2 },
];

const getEmotionConfig = (name: string) => {
  return EMOTIONS.find((e) => e.name === name) || EMOTIONS[6];
};

export default function MoodTracker() {
  const { user, profile } = useAuth();
  const coupleId = profile?.couple_id;
  const { toast } = useToast();
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [moodLevel, setMoodLevel] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const { data: partnerProfile } = useQuery({
    queryKey: ["/api/partner", coupleId],
    queryFn: async () => {
      if (!coupleId || !user) return null;

      const { data: couple } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", coupleId)
        .single();

      if (!couple) return null;

      const partnerId =
        couple.partner1_id === user.id
          ? couple.partner2_id
          : couple.partner1_id;
      if (!partnerId) return null;

      const { data: partner } = await supabase
        .from("Couples_profiles")
        .select("id, full_name")
        .eq("id", partnerId)
        .single();

      return partner;
    },
    enabled: !!coupleId && !!user,
  });

  const daysToFetch =
    timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  const { data: myMoodEntries, isLoading: isLoadingMyMoods } = useQuery<
    MoodEntry[]
  >({
    queryKey: ["/api/mood/mine", coupleId, user?.id, timeRange],
    queryFn: async () => {
      if (!user || !coupleId) return [];

      const startDate = subDays(new Date(), daysToFetch);

      const { data, error } = await supabase
        .from("Couples_mood_entries")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!coupleId,
  });

  const { data: partnerMoodEntries, isLoading: isLoadingPartnerMoods } =
    useQuery<MoodEntry[]>({
      queryKey: ["/api/mood/partner", coupleId, partnerProfile?.id, timeRange],
      queryFn: async () => {
        if (!partnerProfile?.id || !coupleId) return [];

        const startDate = subDays(new Date(), daysToFetch);

        const { data, error } = await supabase
          .from("Couples_mood_entries")
          .select("*")
          .eq("couple_id", coupleId)
          .eq("user_id", partnerProfile.id)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;
        return data || [];
      },
      enabled: !!partnerProfile?.id && !!coupleId,
    });

  const logMoodMutation = useMutation({
    mutationFn: async (data: {
      emotion_primary: string;
      mood_level: number;
      notes?: string;
    }) => {
      if (!user || !coupleId) throw new Error("Not authenticated");

      const { error } = await supabase.from("Couples_mood_entries").insert({
        id: crypto.randomUUID(),
        couple_id: coupleId,
        user_id: user.id,
        emotion_primary: data.emotion_primary,
        mood_level: data.mood_level,
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/partner"] });
      setSelectedEmotion("");
      setMoodLevel(5);
      setNotes("");
      toast({
        title: "Mood logged",
        description: "Your mood has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log mood. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogMood = () => {
    if (!selectedEmotion) {
      toast({
        title: "Select an emotion",
        description: "Please select how you're feeling before logging.",
        variant: "destructive",
      });
      return;
    }

    logMoodMutation.mutate({
      emotion_primary: selectedEmotion,
      mood_level: moodLevel,
      notes: notes.trim() || undefined,
    });
  };

  const prepareChartData = () => {
    const dateMap: Record<
      string,
      { date: string; myMood?: number; partnerMood?: number }
    > = {};

    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM dd");
      dateMap[date] = { date };
    }

    myMoodEntries?.forEach((entry) => {
      const date = format(new Date(entry.created_at!), "MMM dd");
      if (dateMap[date]) {
        dateMap[date].myMood = entry.mood_level;
      }
    });

    partnerMoodEntries?.forEach((entry) => {
      const date = format(new Date(entry.created_at!), "MMM dd");
      if (dateMap[date]) {
        dateMap[date].partnerMood = entry.mood_level;
      }
    });

    return Object.values(dateMap);
  };

  const chartData = prepareChartData();

  const getTodaysMood = () => {
    const today = startOfDay(new Date());
    return myMoodEntries?.find((entry) => {
      const entryDate = startOfDay(new Date(entry.created_at!));
      return entryDate.getTime() === today.getTime();
    });
  };

  const todaysMood = getTodaysMood();

  const getRecentMoods = () => {
    return myMoodEntries?.slice(-5).reverse() || [];
  };

  const getMoodStats = () => {
    if (!myMoodEntries?.length) return null;

    const emotionCounts: Record<string, number> = {};
    let totalLevel = 0;

    myMoodEntries.forEach((entry) => {
      if (entry.emotion_primary) {
        emotionCounts[entry.emotion_primary] =
          (emotionCounts[entry.emotion_primary] || 0) + 1;
      }
      totalLevel += entry.mood_level;
    });

    const averageMood = totalLevel / myMoodEntries.length;
    const mostFrequent = Object.entries(emotionCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0];

    return {
      averageMood,
      mostFrequent,
      totalEntries: myMoodEntries.length,
    };
  };

  const getEmotionFrequency = () => {
    const freq: Record<string, number> = {};
    myMoodEntries?.forEach((entry) => {
      if (entry.emotion_primary) {
        freq[entry.emotion_primary] = (freq[entry.emotion_primary] || 0) + 1;
      }
    });
    return Object.entries(freq)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const stats = getMoodStats();
  const emotionFrequency = getEmotionFrequency();

  const isLoading = isLoadingMyMoods || isLoadingPartnerMoods;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Mood Tracker
            </h1>
            <p className="text-muted-foreground">
              Track your emotional journey together
            </p>
          </div>
        </div>

        <Tabs defaultValue="log" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="log" data-testid="tab-log-mood">
              <Plus className="h-4 w-4 mr-2" />
              Log Mood
            </TabsTrigger>
            <TabsTrigger value="journey" data-testid="tab-journey">
              <TrendingUp className="h-4 w-4 mr-2" />
              Journey
            </TabsTrigger>
            <TabsTrigger value="compare" data-testid="tab-compare">
              <Users className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-6">
            {todaysMood && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Mood
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const config = getEmotionConfig(
                        todaysMood.emotion_primary || ""
                      );
                      const IconComponent = config.icon;
                      return (
                        <>
                          <div
                            className="p-3 rounded-full"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            <IconComponent
                              className="h-8 w-8"
                              style={{ color: config.color }}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {todaysMood.emotion_primary}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Mood Level: {todaysMood.mood_level}/10
                            </p>
                            {todaysMood.notes && (
                              <p className="text-sm mt-1 italic">
                                "{todaysMood.notes}"
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>How are you feeling?</CardTitle>
                <CardDescription>
                  Select your current emotion and mood level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {EMOTIONS.map((emotion) => {
                    const IconComponent = emotion.icon;
                    const isSelected = selectedEmotion === emotion.name;

                    return (
                      <button
                        key={emotion.name}
                        onClick={() => setSelectedEmotion(emotion.name)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover-elevate ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`button-emotion-${emotion.name.toLowerCase()}`}
                      >
                        <IconComponent
                          className="h-6 w-6"
                          style={{ color: emotion.color }}
                        />
                        <span className="text-xs font-medium">
                          {emotion.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Mood Level: {moodLevel}/10
                  </label>
                  <Slider
                    value={[moodLevel]}
                    onValueChange={(value) => setMoodLevel(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid="slider-mood-level"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Very Low</span>
                    <span>Neutral</span>
                    <span>Very High</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder="What's contributing to this feeling? Any context you want to remember?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="input-mood-notes"
                  />
                </div>

                <Button
                  onClick={handleLogMood}
                  disabled={!selectedEmotion || logMoodMutation.isPending}
                  className="w-full"
                  data-testid="button-log-mood"
                >
                  {logMoodMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4 mr-2" />
                      Log Mood
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {getRecentMoods().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getRecentMoods().map((entry) => {
                      const config = getEmotionConfig(
                        entry.emotion_primary || ""
                      );
                      const IconComponent = config.icon;
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          data-testid={`mood-entry-${entry.id}`}
                        >
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: config.color }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {entry.emotion_primary}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({entry.mood_level}/10)
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground truncate">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(entry.created_at!),
                              "MMM d, h:mm a"
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="journey" className="space-y-6">
            <div className="flex gap-2 justify-end">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  data-testid={`button-range-${range}`}
                >
                  {range === "7d"
                    ? "7 Days"
                    : range === "30d"
                      ? "30 Days"
                      : "90 Days"}
                </Button>
              ))}
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average Mood
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.averageMood.toFixed(1)}/10
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Most Common
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.mostFrequent || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Entries
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.totalEntries}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Your Emotional Journey</CardTitle>
                <CardDescription>
                  Track how your mood changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myMoodEntries?.length ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="myMoodGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 10]}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="myMood"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#myMoodGradient)"
                          strokeWidth={2}
                          connectNulls
                          name="My Mood"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Meh className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No mood entries yet</p>
                      <p className="text-sm">
                        Start logging your moods to see your journey
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {emotionFrequency.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Emotion Frequency</CardTitle>
                  <CardDescription>
                    Your most common emotions this period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emotionFrequency} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="emotion"
                          tick={{ fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <div className="flex gap-2 justify-end">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  data-testid={`button-compare-range-${range}`}
                >
                  {range === "7d"
                    ? "7 Days"
                    : range === "30d"
                      ? "30 Days"
                      : "90 Days"}
                </Button>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Mood Comparison
                </CardTitle>
                <CardDescription>
                  See how your moods align with your partner's
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myMoodEntries?.length || partnerMoodEntries?.length ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 10]}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="myMood"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }}
                          connectNulls
                          name="My Mood"
                        />
                        <Line
                          type="monotone"
                          dataKey="partnerMood"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          dot={{ fill: "#f43f5e", r: 4 }}
                          connectNulls
                          name={partnerProfile?.full_name || "Partner"}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No mood data to compare</p>
                      <p className="text-sm">
                        Both partners need to log moods to see comparison
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Your Recent Moods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myMoodEntries?.length ? (
                    <div className="space-y-2">
                      {myMoodEntries
                        .slice(-5)
                        .reverse()
                        .map((entry) => {
                          const config = getEmotionConfig(
                            entry.emotion_primary || ""
                          );
                          const IconComponent = config.icon;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <IconComponent
                                  className="h-4 w-4"
                                  style={{ color: config.color }}
                                />
                                <span className="text-sm">
                                  {entry.emotion_primary}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({entry.mood_level}/10)
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at!), "MMM d")}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No entries yet
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    {partnerProfile?.full_name || "Partner"}'s Recent Moods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {partnerMoodEntries?.length ? (
                    <div className="space-y-2">
                      {partnerMoodEntries
                        .slice(-5)
                        .reverse()
                        .map((entry) => {
                          const config = getEmotionConfig(
                            entry.emotion_primary || ""
                          );
                          const IconComponent = config.icon;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <IconComponent
                                  className="h-4 w-4"
                                  style={{ color: config.color }}
                                />
                                <span className="text-sm">
                                  {entry.emotion_primary}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({entry.mood_level}/10)
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at!), "MMM d")}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {partnerProfile
                        ? "No entries yet"
                        : "Partner not linked yet"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
