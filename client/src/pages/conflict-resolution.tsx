import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { aiFunctions } from "@/lib/ai-functions";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  Sparkles,
  Star,
  Zap,
  Download,
  Loader2,
  Clock,
  Users,
  Heart,
  Lightbulb,
  Save,
  Trash2,
  BookOpen,
  Bot,
} from "lucide-react";

interface SavedSession {
  id: string;
  feeling: string;
  situation: string;
  because: string;
  request: string;
  firmness: number;
  enhanced_statement: string | null;
  impact_preview: string | null;
  ai_suggestions: any[] | null;
  title: string | null;
  is_favorite: boolean;
  created_at: string;
  free_text?: string | null;
  input_mode?: string | null;
}

export default function ConflictResolution() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");

  // Input mode: "express" (free-form) or "structured"
  const [inputMode, setInputMode] = useState<"express" | "structured">(
    "express",
  );

  // Free-form text for Express Freely mode
  const [freeText, setFreeText] = useState("");

  // Structured form state
  const [feeling, setFeeling] = useState("");
  const [situation, setSituation] = useState("");
  const [because, setBecause] = useState("");
  const [request, setRequest] = useState("");
  const [firmness, setFirmness] = useState([30]); // Default to gentle

  // Results state
  const [statement, setStatement] = useState("");
  const [impactPreview, setImpactPreview] = useState("");
  const [toneDescription, setToneDescription] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ title: string; content: string; category: string }>
  >([]);

  // Get tone label from firmness value
  const getToneLabel = (value: number) => {
    if (value <= 33) return "Gentle";
    if (value <= 66) return "Balanced";
    return "Assertive";
  };

  // Fetch saved sessions using API route with authenticated fetch
  const sessionsQuery = useQuery({
    queryKey: ["conflict-sessions", profile?.couple_id],
    queryFn: async () => {
      const response = await authenticatedFetch("/api/conflict/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      return (data.sessions || []) as SavedSession[];
    },
    enabled: !!profile?.couple_id,
  });

  // Generate statement mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await aiFunctions.generateConflictStatement({
        feeling: inputMode === "structured" ? feeling : "",
        situation: inputMode === "structured" ? situation : "",
        because: inputMode === "structured" ? because : "",
        request: inputMode === "structured" ? request : "",
        firmness: firmness[0],
        mode: inputMode,
        free_text: inputMode === "express" ? freeText : undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      setStatement(data.enhanced_statement);
      setImpactPreview(data.impact_preview);
      setToneDescription(data.tone_description);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate statement",
        variant: "destructive",
      });
    },
  });

  // Generate suggestions mutation - called separately after statement success
  const suggestionsMutation = useMutation({
    mutationFn: async (enhancedStatement: string) => {
      const response = await aiFunctions.generateConflictSuggestions({
        feeling: inputMode === "structured" ? feeling : "",
        situation: inputMode === "structured" ? situation : "",
        because: inputMode === "structured" ? because : "",
        request: inputMode === "structured" ? request : "",
        enhanced_statement: enhancedStatement,
        mode: inputMode,
        free_text: inputMode === "express" ? freeText : undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
    },
    onError: (error: any) => {
      console.error("Failed to get suggestions:", error);
    },
  });

  // Combined generate handler that chains mutations properly
  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync();
      if (result.enhanced_statement) {
        suggestionsMutation.mutate(result.enhanced_statement);
      }
    } catch (error) {
      // Error already handled by generateMutation.onError
    }
  };

  // Save session mutation using API route
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.couple_id) {
        throw new Error("Please log in to save");
      }

      const response = await apiRequest("POST", "/api/conflict/sessions", {
        feeling: inputMode === "structured" ? feeling : "",
        situation: inputMode === "structured" ? situation : "",
        because: inputMode === "structured" ? because : "",
        request: inputMode === "structured" ? request : "",
        firmness: firmness[0],
        enhanced_statement: statement,
        impact_preview: impactPreview,
        ai_suggestions: suggestions,
        free_text: inputMode === "express" ? freeText : null,
        input_mode: inputMode,
      });

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description: "Your I-statement has been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["conflict-sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    },
  });

  // Delete session mutation using API route
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/conflict/sessions/${sessionId}`,
      );
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Session removed",
      });
      queryClient.invalidateQueries({ queryKey: ["conflict-sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const loadSession = (session: SavedSession) => {
    // Clear all form state first to prevent stale data
    setFreeText("");
    setFeeling("");
    setSituation("");
    setBecause("");
    setRequest("");

    // Then load the appropriate mode's data
    if (session.input_mode === "express" && session.free_text) {
      setInputMode("express");
      setFreeText(session.free_text);
    } else {
      setInputMode("structured");
      setFeeling(session.feeling || "");
      setSituation(session.situation || "");
      setBecause(session.because || "");
      setRequest(session.request || "");
    }
    setFirmness([session.firmness]);
    setStatement(session.enhanced_statement || "");
    setImpactPreview(session.impact_preview || "");
    setSuggestions((session.ai_suggestions as any[]) || []);
    setActiveTab("builder");
  };

  const exportSession = () => {
    const content = `I-Statement Session
Generated: ${new Date().toLocaleDateString()}

${
  inputMode === "express"
    ? `RAW EXPRESSION:
${freeText}`
    : `INPUTS:
- I feel: ${feeling}
- When: ${situation}
- Because: ${because}
- Could we: ${request}`
}

- Tone: ${getToneLabel(firmness[0])}

ENHANCED STATEMENT:
"${statement}"

IMPACT PREVIEW:
${impactPreview}

AI SUGGESTIONS:
${suggestions.map((s, i) => `${i + 1}. ${s.title}: ${s.content}`).join("\n\n")}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `i-statement-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Your session has been downloaded",
    });
  };

  const canGenerate =
    inputMode === "express"
      ? freeText.trim().length > 10
      : feeling && situation && because && request;
  const isLoading = generateMutation.isPending || suggestionsMutation.isPending;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "timing":
        return <Clock className="w-4 h-4" />;
      case "understanding":
        return <Users className="w-4 h-4" />;
      case "follow-up":
        return <Heart className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "timing":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "understanding":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      case "follow-up":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Conflict Resolution
        </h1>
        <p className="text-muted-foreground mt-1">
          Build effective I-statements with AI-powered guidance
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 md:px-6 border-b">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="builder" data-testid="tab-builder">
              <Sparkles className="w-4 h-4 mr-2" />
              I-Statement Builder
            </TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">
              <BookOpen className="w-4 h-4 mr-2" />
              Saved Sessions
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="builder" className="p-4 md:p-6 mt-0">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Builder Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Build Your I-Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Mode Toggle */}
                  <div
                    className="flex rounded-lg border bg-muted/30 p-1"
                    data-testid="mode-toggle"
                  >
                    <button
                      onClick={() => setInputMode("express")}
                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                        inputMode === "express"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid="button-mode-express"
                    >
                      Express Freely
                    </button>
                    <button
                      onClick={() => setInputMode("structured")}
                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                        inputMode === "structured"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid="button-mode-structured"
                    >
                      Structured
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {inputMode === "express" ? (
                      <motion.div
                        key="express"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            What do you really want to say? Don't hold back...
                          </label>
                          <Textarea
                            value={freeText}
                            onChange={(e) => setFreeText(e.target.value)}
                            placeholder="Write exactly what you're feeling, even if it sounds harsh or blaming. Get it all out - I'll help you transform it into something constructive..."
                            className="min-h-[160px] resize-none"
                            data-testid="input-freetext"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            This is a safe space. Express yourself honestly -
                            the AI will help transform it into a healthy
                            I-Statement.
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="structured"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            I feel...
                          </label>
                          <Input
                            value={feeling}
                            onChange={(e) => setFeeling(e.target.value)}
                            placeholder="hurt, frustrated, worried, anxious..."
                            data-testid="input-feeling"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            When...
                          </label>
                          <Textarea
                            value={situation}
                            onChange={(e) => setSituation(e.target.value)}
                            placeholder="Describe the specific situation objectively..."
                            className="min-h-[70px] resize-none"
                            data-testid="input-situation"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Because...
                          </label>
                          <Textarea
                            value={because}
                            onChange={(e) => setBecause(e.target.value)}
                            placeholder="Explain how this impacts you..."
                            className="min-h-[70px] resize-none"
                            data-testid="input-because"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Could we...
                          </label>
                          <Input
                            value={request}
                            onChange={(e) => setRequest(e.target.value)}
                            placeholder="talk about this, find a solution together..."
                            data-testid="input-request"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tone Slider - styled with gradient */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-3">
                      Tone:{" "}
                      <span className="text-primary">
                        {getToneLabel(firmness[0])}
                      </span>
                    </label>
                    <div className="relative">
                      <div
                        className="absolute inset-0 h-2 rounded-full top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to right, #f97316, #ec4899, #8b5cf6)",
                        }}
                      />
                      <Slider
                        value={firmness}
                        onValueChange={setFirmness}
                        max={100}
                        step={1}
                        className="w-full relative [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&_[role=slider]]:bg-white [&_.relative]:bg-transparent [&_[data-orientation=horizontal]>.bg-primary]:bg-transparent"
                        data-testid="slider-firmness"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Gentle</span>
                      <span>Balanced</span>
                      <span>Assertive</span>
                    </div>
                  </div>

                  {/* Generate Button - styled with gradient */}
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isLoading}
                    className="w-full h-12 text-base font-medium"
                    style={{
                      background:
                        canGenerate && !isLoading
                          ? "linear-gradient(135deg, #f97316, #ec4899)"
                          : undefined,
                    }}
                    data-testid="button-generate"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                </CardContent>
              </Card>

              {/* Results Card - Teal themed header */}
              <div className="space-y-0">
                <div
                  className="flex items-center gap-3 px-5 py-4 rounded-t-lg"
                  style={{
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                  }}
                >
                  <Bot className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">
                    Your I-Statement
                  </h2>
                </div>
                <Card className="rounded-t-none border-t-0">
                  <CardContent className="pt-6 space-y-4 min-h-[300px]">
                    <AnimatePresence mode="wait">
                      {statement ? (
                        <motion.div
                          key="statement"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-4"
                        >
                          <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                            <p
                              className="font-medium leading-relaxed text-foreground"
                              data-testid="text-statement"
                            >
                              "{statement}"
                            </p>
                          </div>

                          {impactPreview && (
                            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                              <strong className="text-foreground">
                                How this might feel to hear:
                              </strong>
                              <p className="text-muted-foreground mt-1">
                                {impactPreview}
                              </p>
                            </div>
                          )}

                          {toneDescription && (
                            <Badge
                              variant="secondary"
                              className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                            >
                              Tone: {toneDescription}
                            </Badge>
                          )}

                          {/* AI Suggestions */}
                          {suggestions.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h3 className="text-sm font-medium flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Tips for Delivery
                              </h3>
                              <div className="space-y-2">
                                {suggestions.map((suggestion, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-3 rounded-lg border bg-card"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div
                                        className={`p-1.5 rounded ${getCategoryColor(suggestion.category)}`}
                                      >
                                        {getCategoryIcon(suggestion.category)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">
                                          {suggestion.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {suggestion.content}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => saveMutation.mutate()}
                              variant="outline"
                              className="flex-1"
                              disabled={saveMutation.isPending}
                              data-testid="button-save"
                            >
                              {saveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Save
                            </Button>
                            <Button
                              onClick={exportSession}
                              variant="outline"
                              data-testid="button-export"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ) : isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                        >
                          <Loader2 className="w-10 h-10 animate-spin mb-3 text-teal-500" />
                          <p className="font-medium">
                            AI is crafting your statement...
                          </p>
                          <p className="text-sm mt-1">This may take a moment</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                        >
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Bot className="w-8 h-8 opacity-40" />
                          </div>
                          <p className="font-medium text-lg">
                            Fill in the form and generate
                          </p>
                          <p className="text-sm mt-1 text-center max-w-xs">
                            Your AI-enhanced I-Statement will appear here, and
                            you can refine it through conversation
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="p-4 md:p-6 mt-0">
            <div className="space-y-4">
              {sessionsQuery.isLoading && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}

              {sessionsQuery.data?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved sessions yet</p>
                  <p className="text-sm mt-1">
                    Create and save your first I-statement
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {sessionsQuery.data?.map((session) => (
                  <Card
                    key={session.id}
                    className="hover-elevate cursor-pointer"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => loadSession(session)}
                        >
                          <p className="font-medium line-clamp-2">
                            {session.enhanced_statement ||
                              "No statement generated"}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(session.created_at).toLocaleDateString()}
                            <Badge variant="outline" className="text-xs">
                              {session.input_mode === "express"
                                ? "Free-form"
                                : "Structured"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(session.id);
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${session.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
