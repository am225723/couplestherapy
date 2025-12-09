import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { aiFunctions } from "@/lib/ai-functions";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  Sparkles,
  Star,
  Zap,
  CheckCircle,
  Download,
  Loader2,
  Clock,
  Users,
  Heart,
  Lightbulb,
  Save,
  Trash2,
  BookOpen,
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
}

export default function ConflictResolution() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");
  
  // Form state
  const [feeling, setFeeling] = useState("");
  const [situation, setSituation] = useState("");
  const [because, setBecause] = useState("");
  const [request, setRequest] = useState("");
  const [firmness, setFirmness] = useState([50]);
  
  // Results state
  const [statement, setStatement] = useState("");
  const [impactPreview, setImpactPreview] = useState("");
  const [toneDescription, setToneDescription] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ title: string; content: string; category: string }>>([]);

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
        feeling,
        situation,
        because,
        request,
        firmness: firmness[0],
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
        feeling,
        situation,
        because,
        request,
        enhanced_statement: enhancedStatement,
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
        feeling,
        situation,
        because,
        request,
        firmness: firmness[0],
        enhanced_statement: statement,
        impact_preview: impactPreview,
        ai_suggestions: suggestions,
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
      const response = await apiRequest("DELETE", `/api/conflict/sessions/${sessionId}`);
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
    setFeeling(session.feeling);
    setSituation(session.situation);
    setBecause(session.because);
    setRequest(session.request);
    setFirmness([session.firmness]);
    setStatement(session.enhanced_statement || "");
    setImpactPreview(session.impact_preview || "");
    setSuggestions((session.ai_suggestions as any[]) || []);
    setActiveTab("builder");
  };

  const exportSession = () => {
    const content = `I-Statement Session
Generated: ${new Date().toLocaleDateString()}

INPUTS:
- I feel: ${feeling}
- When: ${situation}
- Because: ${because}
- Could we: ${request}
- Tone firmness: ${firmness[0]}%

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

  const canGenerate = feeling && situation && because && request;
  const isLoading = generateMutation.isPending || suggestionsMutation.isPending;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "timing": return <Clock className="w-4 h-4" />;
      case "understanding": return <Users className="w-4 h-4" />;
      case "follow-up": return <Heart className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "timing": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "understanding": return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      case "follow-up": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Conflict Resolution</h1>
        <p className="text-muted-foreground mt-1">
          Build effective I-statements with AI-powered guidance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Build Your I-Statement
                  </CardTitle>
                  <CardDescription>
                    Express your feelings without blame using the I-statement formula
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">I feel...</label>
                    <Input
                      value={feeling}
                      onChange={(e) => setFeeling(e.target.value)}
                      placeholder="hurt, frustrated, worried, anxious..."
                      data-testid="input-feeling"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">When...</label>
                    <Textarea
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      placeholder="Describe the specific situation objectively..."
                      className="min-h-[80px]"
                      data-testid="input-situation"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Because...</label>
                    <Textarea
                      value={because}
                      onChange={(e) => setBecause(e.target.value)}
                      placeholder="Explain how this impacts you..."
                      className="min-h-[80px]"
                      data-testid="input-because"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Could we...</label>
                    <Input
                      value={request}
                      onChange={(e) => setRequest(e.target.value)}
                      placeholder="talk about this, find a solution together..."
                      data-testid="input-request"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tone Firmness: {firmness[0]}%
                    </label>
                    <Slider
                      value={firmness}
                      onValueChange={setFirmness}
                      max={100}
                      step={1}
                      className="w-full"
                      data-testid="slider-firmness"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Gentle</span>
                      <span>Balanced</span>
                      <span>Assertive</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isLoading}
                    className="w-full"
                    data-testid="button-generate"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Generate Enhanced Statement
                  </Button>
                </CardContent>
              </Card>

              {/* Results Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    Your Enhanced I-Statement
                  </CardTitle>
                  <CardDescription>
                    AI-refined statement optimized for healthy communication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnimatePresence mode="wait">
                    {statement && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <p className="font-medium leading-relaxed text-foreground" data-testid="text-statement">
                          "{statement}"
                        </p>
                        {impactPreview && (
                          <div className="mt-3 p-3 rounded bg-card border text-sm text-muted-foreground">
                            <strong className="text-foreground">Impact Preview:</strong> {impactPreview}
                          </div>
                        )}
                        {toneDescription && (
                          <Badge variant="secondary" className="mt-2">
                            Tone: {toneDescription}
                          </Badge>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isLoading && !statement && (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p>AI is crafting your statement...</p>
                    </div>
                  )}

                  {!statement && !isLoading && (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                      <p>Fill in the form and click generate</p>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        AI-Powered Suggestions
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
                              <div className={`p-1.5 rounded ${getCategoryColor(suggestion.category)}`}>
                                {getCategoryIcon(suggestion.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{suggestion.title}</p>
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
                  {statement && (
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
                  )}
                </CardContent>
              </Card>
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
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No saved sessions yet</p>
                    <p className="text-sm">Create your first I-statement to see it here</p>
                  </CardContent>
                </Card>
              )}

              {sessionsQuery.data?.map((session) => (
                <Card key={session.id} className="hover-elevate cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => loadSession(session)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{session.firmness}% firmness</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {session.enhanced_statement ? (
                          <p className="text-sm line-clamp-2">"{session.enhanced_statement}"</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            I feel {session.feeling} when {session.situation}...
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(session.id);
                        }}
                        data-testid={`button-delete-${session.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
