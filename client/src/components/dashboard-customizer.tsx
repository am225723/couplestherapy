import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Save,
  Heart,
  MessageSquare,
  Map,
  Mic,
  Coffee,
  AlertTriangle,
  MessageCircle,
  Lightbulb,
  BarChart3,
  Calendar,
  Compass,
  Baby,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface DashboardCustomizerProps {
  coupleId: string;
  therapistId: string;
  initialOrder: string[];
  initialEnabled: Record<string, boolean>;
  initialSizes?: Record<string, "small" | "medium" | "large">;
}

const WIDGET_LABELS: Record<string, string> = {
  "weekly-checkin": "Weekly Check-in",
  "love-languages": "Love Languages",
  gratitude: "Gratitude Log",
  "shared-goals": "Shared Goals",
  conversations: "Hold Me Tight",
  "love-map": "Love Map Quiz",
  "voice-memos": "Voice Memos",
  calendar: "Shared Calendar",
  rituals: "Rituals of Connection",
  "four-horsemen": "Four Horsemen Tracker",
  "demon-dialogues": "Demon Dialogues",
  meditation: "Meditation Library",
  intimacy: "Intimacy Mapping",
  values: "Values & Vision",
  parenting: "Parenting as Partners",
};

const WIDGET_PREVIEWS: Record<string, { icon: any; color: string; description: string }> = {
  "weekly-checkin": {
    icon: Calendar,
    color: "bg-blue-100 dark:bg-blue-900",
    description: "Track couple's weekly emotional connection",
  },
  "love-languages": {
    icon: Heart,
    color: "bg-red-100 dark:bg-red-900",
    description: "Display each partner's love language preferences",
  },
  gratitude: {
    icon: Lightbulb,
    color: "bg-yellow-100 dark:bg-yellow-900",
    description: "Show gratitude exchanges between partners",
  },
  "shared-goals": {
    icon: BarChart3,
    color: "bg-green-100 dark:bg-green-900",
    description: "Display couple's shared goals and progress",
  },
  conversations: {
    icon: MessageSquare,
    color: "bg-purple-100 dark:bg-purple-900",
    description: "Hold Me Tight conversation tracking",
  },
  "love-map": {
    icon: Map,
    color: "bg-pink-100 dark:bg-pink-900",
    description: "Love Map quiz results and insights",
  },
  "voice-memos": {
    icon: Mic,
    color: "bg-orange-100 dark:bg-orange-900",
    description: "Recent voice memos from partners",
  },
  calendar: {
    icon: Calendar,
    color: "bg-teal-100 dark:bg-teal-900",
    description: "Shared calendar events",
  },
  rituals: {
    icon: Coffee,
    color: "bg-indigo-100 dark:bg-indigo-900",
    description: "Daily rituals and connection moments",
  },
  "four-horsemen": {
    icon: AlertTriangle,
    color: "bg-red-50 dark:bg-red-950",
    description: "Four Horsemen incidents and patterns",
  },
  "demon-dialogues": {
    icon: MessageCircle,
    color: "bg-rose-100 dark:bg-rose-900",
    description: "Demon dialogue tracking and solutions",
  },
  meditation: {
    icon: Lightbulb,
    color: "bg-cyan-100 dark:bg-cyan-900",
    description: "Meditation library and sessions",
  },
  intimacy: {
    icon: Heart,
    color: "bg-pink-100 dark:bg-pink-900",
    description: "Intimacy mapping and ratings",
  },
  values: {
    icon: Compass,
    color: "bg-amber-100 dark:bg-amber-900",
    description: "Values and life vision alignment",
  },
  parenting: {
    icon: Baby,
    color: "bg-green-100 dark:bg-green-900",
    description: "Co-parenting resources and tracking",
  },
};

export function DashboardCustomizer({
  coupleId,
  therapistId,
  initialOrder,
  initialEnabled,
  initialSizes = {},
}: DashboardCustomizerProps) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [enabled, setEnabled] =
    useState<Record<string, boolean>>(initialEnabled);
  const [sizes, setSizes] = useState<Record<string, "small" | "medium" | "large">>(initialSizes);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/dashboard-customization/couple/${coupleId}`,
        {
          therapist_id: therapistId,
          widget_order: order,
          enabled_widgets: enabled,
          widget_sizes: sizes,
        },
      );
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Dashboard customization updated" });
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard-customization/couple/${coupleId}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save customization",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (widget: string) => {
    setDraggedItem(widget);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetWidget: string) => {
    if (!draggedItem) return;
    const newOrder = [...order];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetWidget);
    [newOrder[draggedIndex], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[draggedIndex],
    ];
    setOrder(newOrder);
    setDraggedItem(null);
  };

  const toggleEnabled = (widget: string) => {
    setEnabled((prev) => ({ ...prev, [widget]: !prev[widget] }));
  };

  const cycleSize = (widget: string) => {
    const current = sizes[widget] || "medium";
    const sizes_cycle: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
    const nextSize = sizes_cycle[(sizes_cycle.indexOf(current) + 1) % sizes_cycle.length];
    setSizes((prev) => ({ ...prev, [widget]: nextSize }));
  };

  const getSizeLabel = (widget: string) => {
    const size = sizes[widget] || "medium";
    return size.charAt(0).toUpperCase() + size.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Client Dashboard</CardTitle>
        <CardDescription>
          Drag to reorder widgets, uncheck to hide, and click size badge to adjust widget dimensions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {order.map((widget) => {
            const preview = WIDGET_PREVIEWS[widget];
            const PreviewIcon = preview?.icon || Calendar;
            return (
              <div
                key={widget}
                className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    draggable
                    onDragStart={() => handleDragStart(widget)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(widget)}
                    className="flex items-center gap-3 cursor-move flex-1"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    <Checkbox
                      checked={enabled[widget] ?? true}
                      onCheckedChange={() => toggleEnabled(widget)}
                      data-testid={`checkbox-enable-${widget}`}
                      className="flex-shrink-0 mt-1"
                    />
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium">
                        {WIDGET_LABELS[widget] || widget}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preview?.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cycleSize(widget)}
                    className="flex-shrink-0"
                    data-testid={`button-size-${widget}`}
                  >
                    {getSizeLabel(widget)}
                  </Button>
                </div>
                {enabled[widget] && (
                  <div
                    className={`p-3 rounded-md border-2 border-dashed ${preview?.color || "bg-gray-100"}`}
                  >
                    <div className="flex items-center gap-2">
                      <PreviewIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{WIDGET_LABELS[widget] || widget}</p>
                        <p className="text-xs text-muted-foreground">Preview - Size: {getSizeLabel(widget)}</p>
                      </div>
                      <Badge variant="secondary">{getSizeLabel(widget)}</Badge>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full gap-2"
          data-testid="button-save-dashboard-customization"
        >
          <Save className="w-4 h-4" />
          Save Customization
        </Button>
      </CardContent>
    </Card>
  );
}
