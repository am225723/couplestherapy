import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import {
  Loader2,
  AlertCircle,
  Heart,
  TrendingUp,
  Lightbulb,
  Users,
  Link2,
  Compass,
  MessageCircle,
  Scale,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cache, getCacheKey } from "@/lib/cache";
import { useSwipe } from "@/hooks/use-swipe";

interface AssessmentData {
  partner1: {
    id: string;
    name: string;
    loveLanguage?: { primary: string; secondary: string };
    attachmentStyle?: string;
    enneagramType?: { primary: number; secondary?: number | null };
  };
  partner2: {
    id: string;
    name: string;
    loveLanguage?: { primary: string; secondary: string };
    attachmentStyle?: string;
    enneagramType?: { primary: number; secondary?: number | null };
  };
}

interface CompatibilityInsight {
  title: string;
  description: string;
  icon: typeof Heart;
  type: "strength" | "growth";
  category: "love-language" | "attachment" | "enneagram" | "general";
}

const ATTACHMENT_INFO: Record<string, { description: string; color: string }> = {
  secure: {
    description: "Comfortable with intimacy and independence",
    color: "text-green-600 dark:text-green-400",
  },
  anxious: {
    description: "Seeks closeness and reassurance",
    color: "text-blue-600 dark:text-blue-400",
  },
  avoidant: {
    description: "Values independence and self-reliance",
    color: "text-amber-600 dark:text-amber-400",
  },
  disorganized: {
    description: "Mixed patterns of closeness and distance",
    color: "text-purple-600 dark:text-purple-400",
  },
};

const LOVE_LANGUAGE_INFO: Record<string, { description: string; icon: typeof Heart }> = {
  "Quality Time": {
    description: "Feels loved through undivided attention",
    icon: Users,
  },
  "Words of Affirmation": {
    description: "Feels loved through verbal appreciation",
    icon: MessageCircle,
  },
  "Acts of Service": {
    description: "Feels loved through helpful actions",
    icon: CheckCircle2,
  },
  "Receiving Gifts": {
    description: "Feels loved through thoughtful presents",
    icon: Sparkles,
  },
  "Physical Touch": {
    description: "Feels loved through physical affection",
    icon: Heart,
  },
};

const ENNEAGRAM_NAMES: Record<number, string> = {
  1: "The Reformer",
  2: "The Helper",
  3: "The Achiever",
  4: "The Individualist",
  5: "The Investigator",
  6: "The Loyalist",
  7: "The Enthusiast",
  8: "The Challenger",
  9: "The Peacemaker",
};

export default function CoupleCompatibility() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;
  const [activeTab, setActiveTab] = useState("insights");

  const assessmentsQuery = useQuery<AssessmentData | null>({
    queryKey: ["/api/compatibility", coupleId],
    queryFn: async () => {
      if (!coupleId) return null;

      const cacheKey = getCacheKey("compatibility", coupleId);
      const cached = cache.get<AssessmentData>(cacheKey);
      if (cached) return cached;

      const { data: couple } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", coupleId)
        .single();

      if (!couple) return null;

      const [profilesRes, languagesRes, attachmentsRes, enneagramsRes] = await Promise.all([
        supabase
          .from("Couples_profiles")
          .select("id, full_name")
          .in("id", [couple.partner1_id, couple.partner2_id]),
        supabase
          .from("Couples_love_languages")
          .select("user_id, primary_language, secondary_language")
          .in("user_id", [couple.partner1_id, couple.partner2_id]),
        supabase
          .from("Couples_attachment_results")
          .select("user_id, attachment_style")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: false }),
        supabase
          .from("Couples_enneagram_results")
          .select("user_id, dominant_type, secondary_type")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: false }),
      ]);

      const profiles = profilesRes.data;
      const languages = languagesRes.data;
      const attachments = attachmentsRes.data;
      const enneagrams = enneagramsRes.data;

      const p1 = profiles?.find((p) => p.id === couple.partner1_id);
      const p2 = profiles?.find((p) => p.id === couple.partner2_id);

      const data: AssessmentData = {
        partner1: { id: couple.partner1_id, name: p1?.full_name || "Partner 1" },
        partner2: { id: couple.partner2_id, name: p2?.full_name || "Partner 2" },
      };

      if (languages) {
        const p1Lang = languages.find((l) => l.user_id === couple.partner1_id);
        const p2Lang = languages.find((l) => l.user_id === couple.partner2_id);
        if (p1Lang)
          data.partner1.loveLanguage = {
            primary: p1Lang.primary_language,
            secondary: p1Lang.secondary_language,
          };
        if (p2Lang)
          data.partner2.loveLanguage = {
            primary: p2Lang.primary_language,
            secondary: p2Lang.secondary_language,
          };
      }

      if (attachments) {
        const p1Att = attachments.find((a) => a.user_id === couple.partner1_id);
        const p2Att = attachments.find((a) => a.user_id === couple.partner2_id);
        if (p1Att) data.partner1.attachmentStyle = p1Att.attachment_style;
        if (p2Att) data.partner2.attachmentStyle = p2Att.attachment_style;
      }

      if (enneagrams) {
        const p1Enn = enneagrams.find((e) => e.user_id === couple.partner1_id);
        const p2Enn = enneagrams.find((e) => e.user_id === couple.partner2_id);
        if (p1Enn)
          data.partner1.enneagramType = {
            primary: p1Enn.dominant_type,
            secondary: p1Enn.secondary_type,
          };
        if (p2Enn)
          data.partner2.enneagramType = {
            primary: p2Enn.dominant_type,
            secondary: p2Enn.secondary_type,
          };
      }

      cache.set(cacheKey, data, 5 * 60 * 1000);
      return data;
    },
    enabled: !!coupleId,
    staleTime: 1000 * 60 * 5,
  });

  const tabOrder = ["insights", assessmentsQuery.data?.partner1?.id, assessmentsQuery.data?.partner2?.id].filter(Boolean) as string[];
  
  const handleTabChange = (direction: "left" | "right") => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (direction === "left" && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    } else if (direction === "right" && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleTabChange("right"),
    onSwipeRight: () => handleTabChange("left"),
  });

  const generateInsights = (data: AssessmentData): CompatibilityInsight[] => {
    const insights: CompatibilityInsight[] = [];

    if (data.partner1.loveLanguage && data.partner2.loveLanguage) {
      if (data.partner1.loveLanguage.primary === data.partner2.loveLanguage.primary) {
        insights.push({
          title: "Shared Love Language",
          description: `You both value ${data.partner1.loveLanguage.primary}. This natural alignment means you're likely already expressing love in ways your partner appreciates.`,
          icon: Heart,
          type: "strength",
          category: "love-language",
        });
      } else {
        insights.push({
          title: "Complementary Love Languages",
          description: `${data.partner1.name} values ${data.partner1.loveLanguage.primary} while ${data.partner2.name} values ${data.partner2.loveLanguage.primary}. Learning to speak each other's language deepens your connection.`,
          icon: MessageCircle,
          type: "growth",
          category: "love-language",
        });
      }
    }

    if (data.partner1.attachmentStyle && data.partner2.attachmentStyle) {
      if (data.partner1.attachmentStyle === data.partner2.attachmentStyle) {
        if (data.partner1.attachmentStyle === "secure") {
          insights.push({
            title: "Secure Foundation",
            description: "You both have secure attachment styles, providing a stable foundation for your relationship.",
            icon: Link2,
            type: "strength",
            category: "attachment",
          });
        } else {
          insights.push({
            title: "Similar Attachment Patterns",
            description: "You share similar attachment patterns. Understanding your shared triggers helps you support each other.",
            icon: Scale,
            type: "growth",
            category: "attachment",
          });
        }
      } else {
        const hasSecure = data.partner1.attachmentStyle === "secure" || data.partner2.attachmentStyle === "secure";
        if (hasSecure) {
          insights.push({
            title: "Stabilizing Presence",
            description: "One partner's secure attachment provides grounding for the relationship, offering stability and reassurance.",
            icon: Link2,
            type: "strength",
            category: "attachment",
          });
        } else {
          insights.push({
            title: "Complementary Attachment Styles",
            description: "Your different attachment styles create balance. Understanding these differences strengthens your bond.",
            icon: Scale,
            type: "growth",
            category: "attachment",
          });
        }
      }
    }

    if (data.partner1.enneagramType && data.partner2.enneagramType) {
      const p1Type = data.partner1.enneagramType.primary;
      const p2Type = data.partner2.enneagramType.primary;
      if (p1Type === p2Type) {
        insights.push({
          title: "Shared Personality Type",
          description: `You're both Type ${p1Type}s (${ENNEAGRAM_NAMES[p1Type]}). This deep understanding of each other's motivations creates natural empathy.`,
          icon: Compass,
          type: "strength",
          category: "enneagram",
        });
      } else {
        insights.push({
          title: "Diverse Perspectives",
          description: `${data.partner1.name} is a Type ${p1Type} (${ENNEAGRAM_NAMES[p1Type]}) and ${data.partner2.name} is a Type ${p2Type} (${ENNEAGRAM_NAMES[p2Type]}). Your different viewpoints enrich your relationship.`,
          icon: Compass,
          type: "strength",
          category: "enneagram",
        });
      }
    }

    return insights;
  };

  if (assessmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading compatibility insights...</p>
        </div>
      </div>
    );
  }

  const assessments = assessmentsQuery.data;

  if (!assessments) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No assessment data available. Complete your assessments first to see
            compatibility insights.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const insights = generateInsights(assessments);
  const completedAssessments = [
    assessments.partner1.loveLanguage || assessments.partner2.loveLanguage,
    assessments.partner1.attachmentStyle || assessments.partner2.attachmentStyle,
    assessments.partner1.enneagramType || assessments.partner2.enneagramType,
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedAssessments / 3) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <div className="flex items-center justify-center gap-3">
              <Heart className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold" data-testid="text-page-title">
                Couples Compatibility
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Discover how you and your partner complement each other based on your assessments
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 -mt-8 space-y-8">
        <Card className="shadow-lg" data-testid="card-assessment-progress">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-lg">Assessment Completion</h3>
                <p className="text-sm text-muted-foreground">
                  {completedAssessments} of 3 assessment types completed
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={completionPercentage} className="w-32" />
                <span className="font-medium">{completionPercentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <PartnerSummaryCard partner={assessments.partner1} />
          <PartnerSummaryCard partner={assessments.partner2} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleTabChange("left")}
              disabled={tabOrder.indexOf(activeTab) === 0}
              className="md:hidden"
              data-testid="button-tab-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights" data-testid="tab-insights">
                Insights
              </TabsTrigger>
              <TabsTrigger value={assessments.partner1.id} data-testid="tab-partner1">
                {assessments.partner1.name}
              </TabsTrigger>
              <TabsTrigger value={assessments.partner2.id} data-testid="tab-partner2">
                {assessments.partner2.name}
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleTabChange("right")}
              disabled={tabOrder.indexOf(activeTab) === tabOrder.length - 1}
              className="md:hidden"
              data-testid="button-tab-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div {...swipeHandlers} className="touch-pan-y">
          <TabsContent value="insights" className="space-y-4">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">More Assessments Needed</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete assessments to unlock personalized compatibility insights
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/quiz">
                      <Button variant="outline" data-testid="button-take-love-language">
                        <Heart className="w-4 h-4 mr-2" />
                        Love Language Quiz
                      </Button>
                    </Link>
                    <Link href="/attachment-assessment">
                      <Button variant="outline" data-testid="button-take-attachment">
                        <Link2 className="w-4 h-4 mr-2" />
                        Attachment Assessment
                      </Button>
                    </Link>
                    <Link href="/enneagram-assessment">
                      <Button variant="outline" data-testid="button-take-enneagram">
                        <Compass className="w-4 h-4 mr-2" />
                        Enneagram Assessment
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {insights.map((insight, idx) => (
                  <Card
                    key={idx}
                    className={`border-l-4 ${
                      insight.type === "strength"
                        ? "border-l-green-500"
                        : "border-l-amber-500"
                    }`}
                    data-testid={`card-insight-${idx}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div
                          className={`p-2 rounded-lg ${
                            insight.type === "strength"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <insight.icon className="w-5 h-5" />
                        </div>
                        {insight.title}
                        <Badge
                          variant={insight.type === "strength" ? "default" : "secondary"}
                          className="ml-auto"
                        >
                          {insight.type === "strength" ? "Strength" : "Growth Area"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{insight.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value={assessments.partner1.id} className="space-y-6">
            <PartnerDetailCard partner={assessments.partner1} />
            <SuggestionsCard
              partner={assessments.partner1}
              otherPartner={assessments.partner2}
            />
          </TabsContent>

          <TabsContent value={assessments.partner2.id} className="space-y-6">
            <PartnerDetailCard partner={assessments.partner2} />
            <SuggestionsCard
              partner={assessments.partner2}
              otherPartner={assessments.partner1}
            />
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function PartnerSummaryCard({ partner }: { partner: AssessmentData["partner1"] }) {
  const hasData = partner.loveLanguage || partner.attachmentStyle || partner.enneagramType;

  return (
    <Card className="hover-elevate" data-testid={`card-partner-summary-${partner.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {partner.name}
        </CardTitle>
        <CardDescription>Assessment Summary</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No assessments completed yet</p>
        ) : (
          <>
            {partner.loveLanguage && (
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-red-500" />
                <div>
                  <span className="text-sm font-medium">Love Language:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {partner.loveLanguage.primary}
                  </span>
                </div>
              </div>
            )}
            {partner.attachmentStyle && (
              <div className="flex items-center gap-3">
                <Link2 className="w-4 h-4 text-blue-500" />
                <div>
                  <span className="text-sm font-medium">Attachment:</span>
                  <span className="text-sm text-muted-foreground ml-2 capitalize">
                    {partner.attachmentStyle}
                  </span>
                </div>
              </div>
            )}
            {partner.enneagramType && (
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4 text-purple-500" />
                <div>
                  <span className="text-sm font-medium">Enneagram:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    Type {partner.enneagramType.primary}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PartnerDetailCard({ partner }: { partner: AssessmentData["partner1"] }) {
  return (
    <Card data-testid={`card-partner-detail-${partner.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {partner.name}'s Profile
        </CardTitle>
        <CardDescription>Detailed assessment results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {partner.loveLanguage && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Love Language
            </h4>
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2">
                <Badge>{partner.loveLanguage.primary}</Badge>
                <span className="text-sm text-muted-foreground">Primary</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {LOVE_LANGUAGE_INFO[partner.loveLanguage.primary]?.description}
              </p>
              {partner.loveLanguage.secondary && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{partner.loveLanguage.secondary}</Badge>
                  <span className="text-sm text-muted-foreground">Secondary</span>
                </div>
              )}
            </div>
          </div>
        )}

        {partner.attachmentStyle && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-500" />
              Attachment Style
            </h4>
            <div className="pl-6 space-y-2">
              <Badge
                variant="outline"
                className={ATTACHMENT_INFO[partner.attachmentStyle.toLowerCase()]?.color}
              >
                {partner.attachmentStyle}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {ATTACHMENT_INFO[partner.attachmentStyle.toLowerCase()]?.description}
              </p>
            </div>
          </div>
        )}

        {partner.enneagramType && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-500" />
              Enneagram Type
            </h4>
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Type {partner.enneagramType.primary} - {ENNEAGRAM_NAMES[partner.enneagramType.primary]}
                </Badge>
              </div>
              {partner.enneagramType.secondary && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    Wing: Type {partner.enneagramType.secondary}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {!partner.loveLanguage && !partner.attachmentStyle && !partner.enneagramType && (
          <p className="text-muted-foreground text-center py-4">
            No assessments completed yet. Complete assessments to see detailed profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionsCard({
  partner,
  otherPartner,
}: {
  partner: AssessmentData["partner1"];
  otherPartner: AssessmentData["partner1"];
}) {
  const suggestions: { text: string; category: string }[] = [];

  if (partner.loveLanguage?.primary === "Quality Time") {
    suggestions.push({
      text: `Schedule regular one-on-one time with ${otherPartner.name}. Even 15-30 minutes of undivided attention weekly strengthens your connection.`,
      category: "Love Language",
    });
  }
  if (partner.loveLanguage?.primary === "Words of Affirmation") {
    suggestions.push({
      text: `Share specific compliments and appreciation with ${otherPartner.name} regularly. Write notes or send messages highlighting what you admire.`,
      category: "Love Language",
    });
  }
  if (partner.loveLanguage?.primary === "Acts of Service") {
    suggestions.push({
      text: `Look for ways to help ${otherPartner.name} with tasks or responsibilities. Small gestures like making coffee or handling a chore speaks volumes.`,
      category: "Love Language",
    });
  }
  if (partner.loveLanguage?.primary === "Receiving Gifts") {
    suggestions.push({
      text: `Thoughtful gifts don't need to be expensive. ${otherPartner.name} will appreciate items that show you're thinking of them.`,
      category: "Love Language",
    });
  }
  if (partner.loveLanguage?.primary === "Physical Touch") {
    suggestions.push({
      text: `Increase physical affection with ${otherPartner.name}. Hugs, hand-holding, and cuddling strengthen emotional bonds.`,
      category: "Love Language",
    });
  }

  if (partner.attachmentStyle?.toLowerCase() === "secure") {
    suggestions.push({
      text: `Your secure attachment style is a strength. Help ${otherPartner.name} feel safe and supported in the relationship.`,
      category: "Attachment",
    });
  }
  if (partner.attachmentStyle?.toLowerCase() === "anxious") {
    suggestions.push({
      text: `Express your needs clearly to ${otherPartner.name}. Reassurance and consistent communication help you feel secure.`,
      category: "Attachment",
    });
  }
  if (partner.attachmentStyle?.toLowerCase() === "avoidant") {
    suggestions.push({
      text: `Work on vulnerability with ${otherPartner.name}. Sharing feelings and maintaining emotional connection strengthens your bond.`,
      category: "Attachment",
    });
  }

  if (partner.enneagramType) {
    const type = partner.enneagramType.primary;
    if (type === 1) {
      suggestions.push({
        text: `As a Reformer, practice patience and acceptance. Share your high standards with ${otherPartner.name} gently.`,
        category: "Enneagram",
      });
    }
    if (type === 2) {
      suggestions.push({
        text: `As a Helper, remember to express your own needs to ${otherPartner.name}. Your care goes both ways.`,
        category: "Enneagram",
      });
    }
    if (type === 3) {
      suggestions.push({
        text: `As an Achiever, make time for emotional connection beyond accomplishments with ${otherPartner.name}.`,
        category: "Enneagram",
      });
    }
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card data-testid={`card-suggestions-${partner.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Ways to Connect with {otherPartner.name}
        </CardTitle>
        <CardDescription>
          Personalized suggestions based on {partner.name}'s profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              className="flex gap-3 p-3 bg-muted/30 rounded-lg"
              data-testid={`suggestion-${idx}`}
            >
              <TrendingUp className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs">
                  {suggestion.category}
                </Badge>
                <p className="text-sm">{suggestion.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
