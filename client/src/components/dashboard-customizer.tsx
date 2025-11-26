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
import { GripVertical, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface DashboardCustomizerProps {
  coupleId: string;
  therapistId: string;
  initialOrder: string[];
  initialEnabled: Record<string, boolean>;
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

export function DashboardCustomizer({
  coupleId,
  therapistId,
  initialOrder,
  initialEnabled,
}: DashboardCustomizerProps) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [enabled, setEnabled] =
    useState<Record<string, boolean>>(initialEnabled);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Client Dashboard</CardTitle>
        <CardDescription>
          Drag to reorder widgets. Uncheck to hide from client view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {order.map((widget) => (
            <div
              key={widget}
              draggable
              onDragStart={() => handleDragStart(widget)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(widget)}
              className="flex items-center gap-3 p-3 bg-muted rounded-md cursor-move hover:bg-muted/80 transition"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Checkbox
                checked={enabled[widget] ?? true}
                onCheckedChange={() => toggleEnabled(widget)}
                data-testid={`checkbox-enable-${widget}`}
              />
              <Label className="flex-1 cursor-pointer">
                {WIDGET_LABELS[widget] || widget}
              </Label>
            </div>
          ))}
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
