import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { AttachmentAssessment } from "@shared/schema";

interface ProfileWithCouple {
  couple_id?: string;
  full_name?: string;
  [key: string]: any;
}

import {
  Heart,
  Shield,
  AlertTriangle,
  Users,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Lightbulb,
  HeartHandshake,
  Send,
  Zap,
  Target,
} from "lucide-react";

type AttachmentStyle = "secure" | "anxious" | "avoidant" | "disorganized";

const attachmentStyleDetails: Record<
  AttachmentStyle,
  {
    icon: typeof Heart;
    color: string;
    bgColor: string;
    title: string;
    description: string;
    strengths: string[];
    growthAreas: string[];
    inRelationship: string[];
  }
> = {
  secure: {
    icon: Shield,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    title: "Secure Attachment",
    description:
      "You feel comfortable with emotional intimacy and can depend on others while maintaining your independence. You trust easily and don't worry excessively about relationships.",
    strengths: [
      "Comfortable with closeness and intimacy",
      "Trusting and dependable partner",
      "Emotionally expressive and available",
      "Good at conflict resolution",
      "Maintains healthy boundaries",
    ],
    growthAreas: [
      "Continue building healthy relationship skills",
      "Model secure attachment for your partner",
      "Support partner's growth journey",
    ],
    inRelationship: [
      "Provides stability and reassurance",
      "Communicates needs clearly",
      "Handles conflict constructively",
      "Balances independence with intimacy",
    ],
  },
  anxious: {
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    title: "Anxious Attachment",
    description:
      "You desire close relationships but may worry about whether your partner truly cares about you. You might seek more intimacy than your partner is comfortable with.",
    strengths: [
      "Highly attuned to relationship dynamics",
      "Values emotional connection deeply",
      "Expressive with feelings",
      "Committed and dedicated to relationships",
      "Seeks to understand partner's needs",
    ],
    growthAreas: [
      "Practice self-soothing when anxious",
      "Build trust in your partner's commitment",
      "Develop independence within the relationship",
      "Challenge negative relationship thoughts",
    ],
    inRelationship: [
      "Needs regular reassurance",
      "Highly responsive to partner",
      "May seek excessive closeness",
      "Very attentive to relationship cues",
    ],
  },
  avoidant: {
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    title: "Avoidant Attachment",
    description:
      "You value independence and may feel uncomfortable with too much emotional closeness. You might prefer keeping some emotional distance in relationships.",
    strengths: [
      "Self-reliant and independent",
      "Comfortable with alone time",
      "Maintains clear boundaries",
      "Problem-solver and logical thinker",
      "Emotionally stable under pressure",
    ],
    growthAreas: [
      "Practice vulnerability with your partner",
      "Challenge beliefs about dependence",
      "Express emotions more openly",
      "Allow yourself to need others",
    ],
    inRelationship: [
      "Values personal space",
      "May withdraw during conflict",
      "Shows love through actions",
      "Needs time to process emotions",
    ],
  },
  disorganized: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    title: "Disorganized Attachment",
    description:
      "You may experience conflicting desires for closeness and independence. Relationships can feel confusing, wanting intimacy while also feeling the need to pull away.",
    strengths: [
      "Aware of complexity in relationships",
      "Resilient despite challenges",
      "Capable of deep reflection",
      "Understanding of others' struggles",
      "Potential for profound growth",
    ],
    growthAreas: [
      "Develop consistent relationship patterns",
      "Work on emotional regulation",
      "Consider therapy for attachment healing",
      "Build safety in small steps",
    ],
    inRelationship: [
      "May have mixed signals",
      "Desires closeness but fears it",
      "Benefits from patient partner",
      "Needs consistent, safe connection",
    ],
  },
};

const compatibilityInsights: Record<
  string,
  { harmony: string; growth: string; tips: string[] }
> = {
  "secure-secure": {
    harmony:
      "You both have secure foundations, creating a stable and trusting relationship. You can communicate openly and support each other's growth.",
    growth:
      "Continue nurturing your connection while avoiding complacency. Keep growing together.",
    tips: [
      "Maintain open communication",
      "Support each other's individual goals",
      "Create shared rituals and traditions",
    ],
  },
  "anxious-secure": {
    harmony:
      "The secure partner provides the consistency and reassurance the anxious partner needs, while the anxious partner brings emotional depth and attentiveness.",
    growth:
      "The secure partner should provide consistent reassurance without enabling dependency. The anxious partner can learn to self-soothe.",
    tips: [
      "Establish regular check-ins",
      "The secure partner can model calm responses",
      "Build trust through consistent actions",
    ],
  },
  "avoidant-secure": {
    harmony:
      "The secure partner respects boundaries while gently encouraging connection. The avoidant partner feels safe enough to slowly open up.",
    growth:
      "The secure partner should be patient without pushing too hard. The avoidant partner can practice gradual vulnerability.",
    tips: [
      "Respect need for space",
      "Create safe opportunities for connection",
      "Celebrate small moments of openness",
    ],
  },
  "anxious-anxious": {
    harmony:
      "You both understand the need for reassurance and connection deeply. You can be highly responsive to each other's emotional needs.",
    growth:
      "Avoid feeding into each other's anxieties. Develop individual coping strategies and self-soothing practices.",
    tips: [
      "Practice self-soothing together",
      "Avoid relationship-focused rumination",
      "Build security through consistent actions",
    ],
  },
  "anxious-avoidant": {
    harmony:
      "This pairing often creates intense chemistry. The anxious partner pushes for connection while the avoidant maintains boundaries.",
    growth:
      "This combination requires conscious effort. The anxious partner needs to give space; the avoidant needs to show up emotionally.",
    tips: [
      "Recognize the pursue-withdraw dynamic",
      "Meet in the middle on closeness needs",
      "Use scheduled quality time as compromise",
    ],
  },
  "avoidant-avoidant": {
    harmony:
      "You both understand the need for independence and personal space. You respect each other's boundaries naturally.",
    growth:
      "Avoid becoming too disconnected. Intentionally schedule connection time and practice emotional sharing.",
    tips: [
      "Schedule regular connection activities",
      "Practice sharing feelings, even briefly",
      "Create rituals for emotional intimacy",
    ],
  },
  "disorganized-secure": {
    harmony:
      "The secure partner provides the consistent safety needed for healing. With patience, deep trust can develop.",
    growth:
      "The secure partner should remain patient and consistent. The disorganized partner benefits from therapy and gradual trust-building.",
    tips: [
      "Be patient with mixed signals",
      "Provide consistent, calm presence",
      "Celebrate progress, however small",
    ],
  },
  "anxious-disorganized": {
    harmony:
      "Both partners understand relationship intensity and can show deep empathy for each other's struggles.",
    growth:
      "This pairing may amplify anxiety. Both partners benefit from individual growth work and external support.",
    tips: [
      "Consider couples therapy",
      "Develop individual coping strategies",
      "Focus on building predictable patterns",
    ],
  },
  "avoidant-disorganized": {
    harmony:
      "Both partners understand the need for space and may give each other room to process emotions independently.",
    growth:
      "Avoid too much distance. The disorganized partner needs safety; the avoidant partner needs to provide consistent presence.",
    tips: [
      "Balance space with connection",
      "Create predictable routines together",
      "Practice small acts of vulnerability",
    ],
  },
  "disorganized-disorganized": {
    harmony:
      "You both understand the complexity of attachment and can offer unique understanding to each other.",
    growth:
      "This pairing benefits greatly from professional support. Focus on building safety and predictability together.",
    tips: [
      "Seek professional guidance",
      "Build small, consistent routines",
      "Practice repair after disconnections",
    ],
  },
};

function getCompatibilityKey(
  style1: AttachmentStyle,
  style2: AttachmentStyle
): string {
  const sorted = [style1, style2].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

export default function AttachmentResults() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;

  const { data: partnerProfile } = useQuery({
    queryKey: ["/api/partner-profile", coupleId],
    queryFn: async () => {
      if (!coupleId || !user) return null;

      const { data: couple, error: coupleError } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", coupleId)
        .single();

      if (coupleError || !couple) return null;

      const partnerId =
        couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;
      if (!partnerId) return null;

      const { data: partner, error: partnerError } = await supabase
        .from("Couples_profiles")
        .select("id, full_name")
        .eq("id", partnerId)
        .single();

      if (partnerError) return null;
      return partner;
    },
    enabled: !!coupleId && !!user,
  });

  const { data: allResults, isLoading } = useQuery<AttachmentAssessment[]>({
    queryKey: [
      "/api/attachment/couple",
      coupleId,
      user?.id,
      partnerProfile?.id,
    ],
    queryFn: async () => {
      if (!user || !coupleId) return [];

      const userIds = [user.id];
      if (partnerProfile?.id) {
        userIds.push(partnerProfile.id);
      }

      const { data, error } = await supabase
        .from("Couples_attachment_assessments")
        .select("*")
        .eq("couple_id", coupleId)
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const latestByUser: Record<string, AttachmentAssessment> = {};
      for (const result of data || []) {
        if (!latestByUser[result.user_id]) {
          latestByUser[result.user_id] = result;
        }
      }

      return Object.values(latestByUser);
    },
    enabled: !!user && !!coupleId,
  });

  const myResult = allResults?.find((r) => r.user_id === user?.id);
  const partnerResult = allResults?.find(
    (r) => r.user_id === partnerProfile?.id
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!myResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>No Results Yet</CardTitle>
            <CardDescription>
              Take the Attachment Style assessment to discover how you connect
              in relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full"
              data-testid="button-take-assessment"
            >
              <Link href="/attachment-assessment">Take the Assessment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myStyle = myResult.attachment_style as AttachmentStyle;
  const myDetails = attachmentStyleDetails[myStyle];
  const partnerStyle = partnerResult?.attachment_style as
    | AttachmentStyle
    | undefined;
  const partnerDetails = partnerStyle
    ? attachmentStyleDetails[partnerStyle]
    : null;
  const partnerName =
    (partnerProfile as ProfileWithCouple)?.full_name || "Your Partner";

  const compatibility =
    partnerStyle
      ? compatibilityInsights[getCompatibilityKey(myStyle, partnerStyle)]
      : null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background to-accent/10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button
            variant="ghost"
            asChild
            className="gap-2"
            data-testid="button-back-dashboard"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="gap-2"
            data-testid="button-retake-assessment"
          >
            <Link href="/attachment-assessment">
              <RefreshCw className="h-4 w-4" />
              Retake Assessment
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="overflow-hidden" data-testid="card-my-result">
            <div className={`${myDetails.bgColor} p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-background/80">
                  <myDetails.icon className={`h-6 w-6 ${myDetails.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Your Style
                  </p>
                  <h2 className="text-xl font-bold">{myDetails.title}</h2>
                </div>
              </div>
              {myResult.score && (
                <Badge variant="secondary" className="text-xs">
                  Score: {myResult.score}%
                </Badge>
              )}
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {myDetails.description}
              </p>
            </CardContent>
          </Card>

          {partnerResult && partnerDetails ? (
            <Card className="overflow-hidden" data-testid="card-partner-result">
              <div className={`${partnerDetails.bgColor} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-background/80">
                    <partnerDetails.icon
                      className={`h-6 w-6 ${partnerDetails.color}`}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {partnerName}'s Style
                    </p>
                    <h2 className="text-xl font-bold">{partnerDetails.title}</h2>
                  </div>
                </div>
                {partnerResult.score && (
                  <Badge variant="secondary" className="text-xs">
                    Score: {partnerResult.score}%
                  </Badge>
                )}
              </div>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {partnerDetails.description}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card
              className="overflow-hidden border-dashed"
              data-testid="card-partner-pending"
            >
              <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Waiting for Partner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask your partner to take the Attachment assessment to see
                  your compatibility.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="button-invite-partner"
                >
                  <Send className="h-4 w-4" />
                  Invite Partner
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {compatibility && partnerResult && (
          <Card
            className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
            data-testid="card-compatibility"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-primary" />
                Your Attachment Compatibility
              </CardTitle>
              <CardDescription>
                How {myDetails.title.replace("Attachment", "").trim()} and{" "}
                {partnerDetails?.title.replace("Attachment", "").trim()} work
                together
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Natural Harmony
                </h4>
                <p className="text-sm text-muted-foreground">
                  {compatibility.harmony}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Growth Opportunity
                </h4>
                <p className="text-sm text-muted-foreground">
                  {compatibility.growth}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Tips for Your Relationship
                </h4>
                <ul className="space-y-2">
                  {compatibility.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card data-testid="card-my-strengths">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Your Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {myDetails.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-my-growth">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Growth Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {myDetails.growthAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-in-relationship">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              How You Show Up in Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {myDetails.inRelationship.map((trait, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/30"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{trait}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {myResult.dynamics_with_partner && (
          <Card data-testid="card-dynamics">
            <CardHeader>
              <CardTitle className="text-lg">Dynamics with Partner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {myResult.dynamics_with_partner}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
