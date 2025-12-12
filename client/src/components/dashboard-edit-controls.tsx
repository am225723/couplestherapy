import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  section?: "header" | "featured" | "activities";
}

interface DashboardEditControlsProps {
  widgets: WidgetConfig[];
  onToggleWidget: (id: string, enabled: boolean) => void;
  onReorderWidgets: (widgets: WidgetConfig[]) => void;
  isEditMode: boolean;
  onEditModeChange: (enabled: boolean) => void;
}

export function DashboardEditControls({
  widgets,
  onToggleWidget,
  onReorderWidgets,
  isEditMode,
  onEditModeChange,
}: DashboardEditControlsProps) {
  const [open, setOpen] = useState(false);

  const groupedWidgets = {
    header: widgets.filter((w) => w.section === "header"),
    featured: widgets.filter((w) => w.section === "featured"),
    activities: widgets.filter((w) => w.section === "activities"),
  };

  const sections = [
    { key: "header", title: "Header Section", widgets: groupedWidgets.header },
    { key: "featured", title: "Featured Cards", widgets: groupedWidgets.featured },
    { key: "activities", title: "Activity Widgets", widgets: groupedWidgets.activities },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 glass-card border-none"
          data-testid="button-customize-dashboard"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Show or hide sections and rearrange your dashboard layout
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Edit Mode</Label>
              <p className="text-xs text-muted-foreground">
                Enable to drag and rearrange widgets
              </p>
            </div>
            <Switch
              checked={isEditMode}
              onCheckedChange={onEditModeChange}
              data-testid="switch-edit-mode"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-6 pr-4">
              {sections.map((section) => (
                <div key={section.key} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h4>
                  <div className="space-y-2">
                    {section.widgets.map((widget) => (
                      <div
                        key={widget.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          "border border-border/50 bg-card transition-luxury",
                          !widget.enabled && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm font-medium">{widget.title}</span>
                        </div>
                        <button
                          onClick={() => onToggleWidget(widget.id, !widget.enabled)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            widget.enabled
                              ? "text-primary hover:bg-primary/10"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                          data-testid={`toggle-widget-${widget.id}`}
                        >
                          {widget.enabled ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface WidgetVisibilityBadgeProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

export function WidgetVisibilityBadge({
  isVisible,
  onToggle,
  className,
}: WidgetVisibilityBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "visibility-toggle p-1.5 rounded-lg",
        "bg-background/80 backdrop-blur-sm border border-border/50",
        "hover:bg-muted transition-colors",
        className
      )}
      data-testid="button-toggle-visibility"
    >
      {isVisible ? (
        <Eye className="h-3.5 w-3.5 text-primary" />
      ) : (
        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
