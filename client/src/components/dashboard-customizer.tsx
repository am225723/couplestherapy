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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Target,
  Activity,
  BookOpen,
  TrendingUp,
  Eye,
  Settings2,
  Sparkles,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface DashboardCustomizerProps {
  coupleId: string;
  therapistId: string;
  initialOrder: string[];
  initialEnabled: Record<string, boolean>;
  initialSizes?: Record<string, "small" | "medium" | "large">;
}

const ALL_WIDGETS = [
  "date-night",
  "checkin-history",
  "ai-suggestions",
  "weekly-checkin",
  "love-languages",
  "gratitude",
  "shared-goals",
  "conversations",
  "love-map",
  "voice-memos",
  "calendar",
  "rituals",
  "four-horsemen",
  "demon-dialogues",
  "meditation",
  "intimacy",
  "values",
  "parenting",
];

const WIDGET_CONFIG: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  "date-night": {
    label: "Date Night Generator",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "AI-powered date night planning",
  },
  "checkin-history": {
    label: "Check-In History",
    icon: History,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Review weekly check-in timeline",
  },
  "ai-suggestions": {
    label: "AI Suggestions",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Personalized activity recommendations",
  },
  "weekly-checkin": {
    label: "Weekly Check-in",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Track emotional connection weekly",
  },
  "love-languages": {
    label: "Love Languages",
    icon: Heart,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "Show love language preferences",
  },
  gratitude: {
    label: "Gratitude Log",
    icon: Lightbulb,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "Daily gratitude exchanges",
  },
  "shared-goals": {
    label: "Shared Goals",
    icon: Target,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Track couple goals progress",
  },
  conversations: {
    label: "Hold Me Tight",
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "EFT conversation tracking",
  },
  "love-map": {
    label: "Love Map Quiz",
    icon: Map,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    description: "Partner knowledge insights",
  },
  "voice-memos": {
    label: "Voice Memos",
    icon: Mic,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    description: "Audio messages between partners",
  },
  calendar: {
    label: "Shared Calendar",
    icon: Calendar,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    description: "Important dates together",
  },
  rituals: {
    label: "Rituals of Connection",
    icon: Coffee,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    description: "Daily connection moments",
  },
  "four-horsemen": {
    label: "Four Horsemen",
    icon: AlertTriangle,
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    description: "Identify conflict patterns",
  },
  "demon-dialogues": {
    label: "Demon Dialogues",
    icon: MessageCircle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    description: "Break negative cycles",
  },
  meditation: {
    label: "Meditation Library",
    icon: BookOpen,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    description: "Guided meditations",
  },
  intimacy: {
    label: "Intimacy Mapping",
    icon: Activity,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    description: "Five dimensions of intimacy",
  },
  values: {
    label: "Values & Vision",
    icon: Compass,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Shared dreams and goals",
  },
  parenting: {
    label: "Parenting Partners",
    icon: Baby,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Co-parenting alignment",
  },
};

const SIZE_DIMENSIONS = {
  small: { cols: 1, label: "S", description: "1 column" },
  medium: { cols: 2, label: "M", description: "2 columns" },
  large: { cols: 3, label: "L", description: "3 columns" },
};

function WidgetPreviewCard({
  widgetId,
  size,
  enabled,
  onToggle,
  onSizeChange,
}: {
  widgetId: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
  onToggle: () => void;
  onSizeChange: (size: "small" | "medium" | "large") => void;
}) {
  const config = WIDGET_CONFIG[widgetId];
  if (!config) return null;

  const Icon = config.icon;
  const sizeClass = {
    small: "col-span-1",
    medium: "col-span-2",
    large: "col-span-3",
  }[size];

  const heightClass = {
    small: "h-24",
    medium: "h-28",
    large: "h-32",
  }[size];

  return (
    <div
      className={cn(
        sizeClass,
        "transition-all duration-200",
        !enabled && "opacity-40",
      )}
    >
      <Card
        className={cn(
          "h-full relative group",
          heightClass,
          enabled
            ? "border-border"
            : "border-dashed border-muted-foreground/30",
        )}
      >
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="icon"
            variant={size === "small" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("small")}
            data-testid={`button-size-small-${widgetId}`}
          >
            <span className="text-xs">S</span>
          </Button>
          <Button
            size="icon"
            variant={size === "medium" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("medium")}
            data-testid={`button-size-medium-${widgetId}`}
          >
            <span className="text-xs">M</span>
          </Button>
          <Button
            size="icon"
            variant={size === "large" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("large")}
            data-testid={`button-size-large-${widgetId}`}
          >
            <span className="text-xs">L</span>
          </Button>
        </div>

        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={enabled}
              onCheckedChange={onToggle}
              className="h-4 w-4"
              data-testid={`checkbox-enable-${widgetId}`}
            />
            <div className={cn("p-1.5 rounded-md", config.bgColor)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate">{config.label}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {config.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {SIZE_DIMENSIONS[size].description}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WidgetListItem({
  widgetId,
  size,
  enabled,
  onToggle,
  onSizeChange,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  widgetId: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
  onToggle: () => void;
  onSizeChange: (size: "small" | "medium" | "large") => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const config = WIDGET_CONFIG[widgetId];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-move hover:border-primary/50 transition",
        !enabled && "opacity-50 bg-muted/50",
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Checkbox
        checked={enabled}
        onCheckedChange={onToggle}
        data-testid={`list-checkbox-${widgetId}`}
      />
      <div className={cn("p-2 rounded-md", config.bgColor)}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{config.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {config.description}
        </p>
      </div>
      <div className="flex gap-1">
        {(["small", "medium", "large"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={size === s ? "default" : "outline"}
            className="h-7 w-7 p-0"
            onClick={() => onSizeChange(s)}
            data-testid={`list-size-${s}-${widgetId}`}
          >
            {SIZE_DIMENSIONS[s].label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function DashboardCustomizer({
  coupleId,
  therapistId,
  initialOrder,
  initialEnabled,
  initialSizes = {},
}: DashboardCustomizerProps) {
  const fullOrder = Array.from(new Set([...initialOrder, ...ALL_WIDGETS]));

  const [order, setOrder] = useState<string[]>(fullOrder);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    ALL_WIDGETS.forEach((w) => {
      defaults[w] = initialEnabled[w] ?? true;
    });
    return defaults;
  });
  const [sizes, setSizes] = useState<
    Record<string, "small" | "medium" | "large">
  >(() => {
    const defaults: Record<string, "small" | "medium" | "large"> = {};
    ALL_WIDGETS.forEach((w) => {
      defaults[w] = initialSizes[w] || "medium";
    });
    return defaults;
  });
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
    if (!draggedItem || draggedItem === targetWidget) return;
    const newOrder = [...order];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetWidget);
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    setOrder(newOrder);
    setDraggedItem(null);
  };

  const toggleEnabled = (widget: string) => {
    setEnabled((prev) => ({ ...prev, [widget]: !prev[widget] }));
  };

  const setSize = (widget: string, size: "small" | "medium" | "large") => {
    setSizes((prev) => ({ ...prev, [widget]: size }));
  };

  const enabledWidgets = order.filter((w) => enabled[w]);
  const disabledWidgets = order.filter((w) => !enabled[w]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Customizer</h2>
          <p className="text-muted-foreground">
            Configure which widgets appear on your client's dashboard and their
            sizes
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-customization"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Visual Preview
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <Settings2 className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Client Dashboard Preview
              </CardTitle>
              <CardDescription>
                This shows how widgets will appear on the client's dashboard.
                Hover over widgets to adjust size.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-6 gap-3">
                  {enabledWidgets.map((widgetId) => (
                    <WidgetPreviewCard
                      key={widgetId}
                      widgetId={widgetId}
                      size={sizes[widgetId] || "medium"}
                      enabled={enabled[widgetId]}
                      onToggle={() => toggleEnabled(widgetId)}
                      onSizeChange={(s) => setSize(widgetId, s)}
                    />
                  ))}
                </div>
                {enabledWidgets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No widgets enabled. Enable widgets from the list view.
                  </div>
                )}
              </div>

              {disabledWidgets.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Hidden Widgets ({disabledWidgets.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {disabledWidgets.map((widgetId) => {
                      const config = WIDGET_CONFIG[widgetId];
                      const Icon = config?.icon || Heart;
                      return (
                        <Button
                          key={widgetId}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 opacity-60"
                          onClick={() => toggleEnabled(widgetId)}
                          data-testid={`button-enable-${widgetId}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config?.label || widgetId}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Widget Configuration
              </CardTitle>
              <CardDescription>
                Drag to reorder. All 15 widgets are shown - enable or disable as
                needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {order.map((widgetId) => (
                    <WidgetListItem
                      key={widgetId}
                      widgetId={widgetId}
                      size={sizes[widgetId] || "medium"}
                      enabled={enabled[widgetId] ?? true}
                      onToggle={() => toggleEnabled(widgetId)}
                      onSizeChange={(s) => setSize(widgetId, s)}
                      onDragStart={() => handleDragStart(widgetId)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(widgetId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {enabledWidgets.length} of {ALL_WIDGETS.length} widgets enabled
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-bottom"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
