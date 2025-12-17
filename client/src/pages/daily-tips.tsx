import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Loader2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Settings,
} from "lucide-react";
import { formatAIText } from "@/lib/utils";

interface DailyTip {
  id: string;
  tip_text: string;
  category: string;
  created_at: string;
}

interface NotificationPreferences {
  tips_enabled: boolean;
  tips_frequency: string;
  tips_time: string;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  communication:
    "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  intimacy: "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100",
  conflict:
    "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  gratitude:
    "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  connection:
    "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  growth:
    "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
};

export default function DailyTips() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    tips_enabled: true,
    tips_frequency: "daily",
    tips_time: "08:00",
    push_notifications_enabled: true,
    email_notifications_enabled: false,
  });

  // Fetch today's tip
  const tipsQuery = useQuery({
    queryKey: [`/api/daily-tips/couple/${profile?.couple_id}/today`],
    enabled: !!profile?.couple_id,
  });

  // Fetch all tips history
  const historyQuery = useQuery({
    queryKey: [`/api/daily-tips/couple/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  // Fetch notification preferences
  const prefsQuery = useQuery({
    queryKey: [`/api/daily-tips/preferences/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  // Update preferences when data loads
  useEffect(() => {
    if (prefsQuery.data && prefsQuery.isSuccess) {
      const data = prefsQuery.data as NotificationPreferences;
      setPreferences({
        tips_enabled: data.tips_enabled,
        tips_frequency: data.tips_frequency,
        tips_time: data.tips_time?.substring(0, 5) || "08:00",
        push_notifications_enabled: data.push_notifications_enabled,
        email_notifications_enabled: data.email_notifications_enabled,
      });
    }
  }, [prefsQuery.data, prefsQuery.isSuccess]);

  const generateMutation = useMutation({
    mutationFn: async (category: string) => {
      if (!profile?.couple_id) throw new Error("No couple ID");
      return apiRequest("POST", `/api/daily-tips/couple/${profile.couple_id}`, {
        category,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "New tip generated!" });
      queryClient.invalidateQueries({
        queryKey: [`/api/daily-tips/couple/${profile?.couple_id}/today`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/daily-tips/couple/${profile?.couple_id}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate tip",
        variant: "destructive",
      });
    },
  });

  const prefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!profile?.couple_id) throw new Error("No couple ID");
      const payload = {
        ...updates,
        tips_time: updates.tips_time ? `${updates.tips_time}:00` : undefined,
      };
      return apiRequest(
        "PATCH",
        `/api/daily-tips/preferences/${profile.couple_id}`,
        payload,
      );
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Preferences updated" });
      queryClient.invalidateQueries({
        queryKey: [`/api/daily-tips/preferences/${profile?.couple_id}`],
      });
    },
  });

  const todayTip = (tipsQuery.data || {}) as DailyTip;
  const history = ((historyQuery.data || []) as DailyTip[]).slice(1, 8);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="w-8 h-8 text-primary" />
          Daily Relationship Tips
        </h1>
        <p className="text-muted-foreground">
          AI-powered insights to strengthen your connection
        </p>
      </div>

      {/* Today's Tip */}
      {tipsQuery.isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : todayTip?.id ? (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Today's Tip</CardTitle>
                <Badge
                  className={
                    CATEGORY_COLORS[todayTip.category] ||
                    CATEGORY_COLORS.connection
                  }
                >
                  {todayTip.category.charAt(0).toUpperCase() +
                    todayTip.category.slice(1)}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate("connection")}
                disabled={generateMutation.isPending}
                className="gap-2"
                data-testid="button-regenerate-tip"
              >
                <RefreshCw className="w-4 h-4" />
                New Tip
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed text-foreground">
              {formatAIText(todayTip.tip_text)}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Generated on{" "}
              {new Date(todayTip.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tip available yet. Click the button to generate one!
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        {[
          "communication",
          "intimacy",
          "conflict",
          "gratitude",
          "connection",
          "growth",
        ].map((category) => (
          <Button
            key={category}
            variant="outline"
            onClick={() => generateMutation.mutate(category)}
            disabled={generateMutation.isPending}
            data-testid={`button-generate-${category}`}
          >
            {generateMutation.isPending && (
              <Loader2 className="w-3 h-3 animate-spin mr-2" />
            )}
            {category.charAt(0).toUpperCase() + category.slice(1)} Tip
          </Button>
        ))}
      </div>

      {/* Preferences Settings */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Notification Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Customize how you receive daily tips
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Daily Tips</Label>
                <Switch
                  checked={preferences.tips_enabled}
                  onCheckedChange={(checked) => {
                    setPreferences({ ...preferences, tips_enabled: checked });
                    prefsMutation.mutate({ tips_enabled: checked });
                  }}
                  data-testid="switch-tips-enabled"
                />
              </div>

              {preferences.tips_enabled && (
                <>
                  <div>
                    <Label className="text-xs mb-2 block">Frequency</Label>
                    <Select
                      value={preferences.tips_frequency}
                      onValueChange={(value) => {
                        setPreferences({
                          ...preferences,
                          tips_frequency: value,
                        });
                        prefsMutation.mutate({ tips_frequency: value });
                      }}
                    >
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-2 block">Preferred Time</Label>
                    <input
                      type="time"
                      value={preferences.tips_time}
                      onChange={(e) => {
                        setPreferences({
                          ...preferences,
                          tips_time: e.target.value,
                        });
                        prefsMutation.mutate({
                          tips_time: `${e.target.value}:00`,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      data-testid="input-tips-time"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Push Notifications</Label>
                <Switch
                  checked={preferences.push_notifications_enabled}
                  onCheckedChange={(checked) => {
                    setPreferences({
                      ...preferences,
                      push_notifications_enabled: checked,
                    });
                    prefsMutation.mutate({
                      push_notifications_enabled: checked,
                    });
                  }}
                  data-testid="switch-push-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Email Notifications</Label>
                <Switch
                  checked={preferences.email_notifications_enabled}
                  onCheckedChange={(checked) => {
                    setPreferences({
                      ...preferences,
                      email_notifications_enabled: checked,
                    });
                    prefsMutation.mutate({
                      email_notifications_enabled: checked,
                    });
                  }}
                  data-testid="switch-email-enabled"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Previous Tips */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Tips</CardTitle>
            <CardDescription>Your recent relationship insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.map((tip) => (
              <div key={tip.id} className="p-3 bg-muted rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={CATEGORY_COLORS[tip.category]}>
                    {tip.category.charAt(0).toUpperCase() +
                      tip.category.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tip.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{formatAIText(tip.tip_text)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
