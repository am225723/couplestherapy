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
import { EnneagramAssessment } from "@shared/schema";

interface ProfileWithCouple {
  couple_id?: string;
  full_name?: string;
  [key: string]: any;
}

import {
  Compass,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Users,
  HeartHandshake,
  Send,
  Zap,
  Target,
  Star,
  AlertCircle,
} from "lucide-react";

const enneagramTypeInfo: Record<
  number,
  {
    title: string;
    color: string;
    bgColor: string;
    description: string;
    strengths: string[];
    challenges: string[];
    inRelationship: string[];
  }
> = {
  1: {
    title: "The Reformer",
    color: "text-slate-600",
    bgColor: "bg-slate-500/10",
    description:
      "Principled, purposeful, self-controlled, and perfectionistic. You strive to be right, improve everything, and fear being corrupt or defective.",
    strengths: [
      "Ethical and honest",
      "Organized and reliable",
      "High standards",
      "Self-disciplined",
    ],
    challenges: [
      "Can be overly critical",
      "Perfectionism causes stress",
      "Difficulty relaxing",
    ],
    inRelationship: [
      "Reliable and dependable partner",
      "Strives to improve the relationship",
      "Clear about expectations",
      "May need to soften criticism",
    ],
  },
  2: {
    title: "The Helper",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    description:
      "Generous, demonstrative, people-pleasing, and possessive. You want to be loved, appreciated, and needed by others.",
    strengths: [
      "Caring and empathetic",
      "Generous and warm",
      "Supportive of others",
      "Intuitive about needs",
    ],
    challenges: [
      "May neglect own needs",
      "Can be possessive",
      "Difficulty saying no",
    ],
    inRelationship: [
      "Nurturing and attentive partner",
      "Anticipates partner's needs",
      "Expressive with affection",
      "Needs appreciation in return",
    ],
  },
  3: {
    title: "The Achiever",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description:
      "Success-oriented, pragmatic, driven, and image-conscious. You want to be successful, admired, and to achieve your goals.",
    strengths: [
      "Ambitious and motivated",
      "Adaptable and efficient",
      "Encouraging of others",
      "Goal-oriented",
    ],
    challenges: [
      "Workaholism tendency",
      "May prioritize image",
      "Difficulty with vulnerability",
    ],
    inRelationship: [
      "Brings energy and ambition",
      "Supportive of partner's goals",
      "Creates exciting experiences",
      "May need to slow down for connection",
    ],
  },
  4: {
    title: "The Individualist",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description:
      "Expressive, dramatic, self-absorbed, and temperamental. You want to be unique, authentic, and deeply understood.",
    strengths: [
      "Creative and expressive",
      "Emotionally deep",
      "Authentic and genuine",
      "Compassionate",
    ],
    challenges: [
      "Mood swings",
      "Can feel misunderstood",
      "May withdraw when hurt",
    ],
    inRelationship: [
      "Brings depth and romance",
      "Values emotional intimacy",
      "Creative in expressing love",
      "Needs understanding and acceptance",
    ],
  },
  5: {
    title: "The Investigator",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    description:
      "Perceptive, innovative, secretive, and isolated. You want to understand everything deeply and fear being useless or incapable.",
    strengths: [
      "Analytical and insightful",
      "Independent thinker",
      "Objective and calm",
      "Curious and knowledgeable",
    ],
    challenges: [
      "May seem detached",
      "Needs lots of alone time",
      "Difficulty expressing emotions",
    ],
    inRelationship: [
      "Thoughtful and observant partner",
      "Offers unique perspectives",
      "Respects partner's independence",
      "May need to share feelings more",
    ],
  },
  6: {
    title: "The Loyalist",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    description:
      "Engaging, responsible, anxious, and suspicious. You value security, loyalty, and being prepared for challenges.",
    strengths: [
      "Loyal and committed",
      "Responsible and hardworking",
      "Protective of loved ones",
      "Good at problem-solving",
    ],
    challenges: [
      "Anxiety and worry",
      "Difficulty trusting",
      "Overthinking decisions",
    ],
    inRelationship: [
      "Devoted and loyal partner",
      "Works hard for relationship security",
      "Protective and caring",
      "Needs reassurance and consistency",
    ],
  },
  7: {
    title: "The Enthusiast",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description:
      "Spontaneous, versatile, acquisitive, and scattered. You want to be happy, avoid pain, and experience everything life has to offer.",
    strengths: [
      "Optimistic and joyful",
      "Adventurous spirit",
      "Quick and versatile mind",
      "Brings fun to everything",
    ],
    challenges: [
      "Difficulty with commitment",
      "Avoids negative emotions",
      "Can be scattered",
    ],
    inRelationship: [
      "Fun and exciting partner",
      "Plans adventures together",
      "Keeps things positive",
      "May need to address deeper issues",
    ],
  },
  8: {
    title: "The Challenger",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description:
      "Self-confident, decisive, confrontational, and dominating. You want to be in control, strong, and protect yourself and others.",
    strengths: [
      "Strong and protective",
      "Direct and honest",
      "Natural leader",
      "Courageous and decisive",
    ],
    challenges: [
      "Can be domineering",
      "Difficulty showing vulnerability",
      "May intimidate others",
    ],
    inRelationship: [
      "Protective and powerful partner",
      "Takes charge when needed",
      "Fiercely loyal",
      "May need to soften approach",
    ],
  },
  9: {
    title: "The Peacemaker",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description:
      "Receptive, reassuring, agreeable, and complacent. You want peace, harmony, and to avoid conflict at all costs.",
    strengths: [
      "Peaceful and calming",
      "Good mediator",
      "Patient and accepting",
      "Sees all perspectives",
    ],
    challenges: [
      "Avoids conflict",
      "Can be passive",
      "Difficulty expressing needs",
    ],
    inRelationship: [
      "Easygoing and supportive partner",
      "Creates harmony in the home",
      "Accepting of differences",
      "May need to voice own needs more",
    ],
  },
};

const compatibilityInsights: Record<
  string,
  { harmony: string; growth: string; tips: string[] }
> = {
  "1-1": {
    harmony:
      "You share high standards and a commitment to improvement. Your shared values create a principled partnership.",
    growth:
      "Avoid criticizing each other. Practice acceptance and celebrate imperfections.",
    tips: [
      "Share appreciation daily",
      "Allow room for mistakes",
      "Balance improvement with acceptance",
    ],
  },
  "1-2": {
    harmony:
      "The Helper's warmth softens the Reformer's rigidity, while the Reformer provides structure the Helper appreciates.",
    growth:
      "Type 1 should appreciate Type 2's giving nature; Type 2 should respect Type 1's need for order.",
    tips: [
      "Express gratitude openly",
      "Balance giving with standards",
      "Support each other's needs",
    ],
  },
  "2-2": {
    harmony:
      "You both speak the language of love and care. Your relationship is filled with warmth and mutual support.",
    growth:
      "Make sure to take care of yourselves, not just each other. Avoid competition for being needed.",
    tips: [
      "Practice receiving, not just giving",
      "Set boundaries together",
      "Appreciate each other's care",
    ],
  },
  "3-3": {
    harmony:
      "You're a power couple! Your shared drive and ambition can create an inspiring partnership.",
    growth:
      "Make time for real connection beyond achievements. Share vulnerabilities, not just successes.",
    tips: [
      "Schedule quality time without goals",
      "Share feelings, not just achievements",
      "Celebrate being, not just doing",
    ],
  },
  "4-4": {
    harmony:
      "You understand each other's emotional depth like no one else. Your connection can be profoundly intimate.",
    growth:
      "Avoid amplifying each other's emotional lows. Ground yourselves together.",
    tips: [
      "Create beauty together",
      "Balance intensity with stability",
      "Celebrate your unique connection",
    ],
  },
  "5-5": {
    harmony:
      "You respect each other's need for space and intellectual pursuits. A meeting of minds.",
    growth:
      "Remember to connect emotionally, not just intellectually. Share feelings, not just ideas.",
    tips: [
      "Schedule connection time",
      "Share feelings, not just thoughts",
      "Create shared experiences",
    ],
  },
  "6-6": {
    harmony:
      "You understand each other's need for security. Together you can build a stable, trustworthy bond.",
    growth:
      "Avoid feeding each other's anxieties. Build trust through positive experiences.",
    tips: [
      "Reassure each other regularly",
      "Face fears together",
      "Celebrate your loyalty",
    ],
  },
  "7-7": {
    harmony:
      "Life is an adventure together! Your shared enthusiasm creates endless fun and possibilities.",
    growth:
      "Learn to sit with difficult emotions together. Commitment can be an adventure too.",
    tips: [
      "Plan adventures together",
      "Also plan quiet moments",
      "Face challenges as a team",
    ],
  },
  "8-8": {
    harmony:
      "Two strong personalities who respect each other's power. An intense, honest relationship.",
    growth:
      "Take turns leading. Show vulnerability to each other—it's safe here.",
    tips: [
      "Practice vulnerability together",
      "Take turns being in charge",
      "Protect each other, not from each other",
    ],
  },
  "9-9": {
    harmony:
      "A peaceful, harmonious relationship. You create a calm, accepting environment together.",
    growth:
      "Push each other gently to express needs and opinions. Avoid merging completely.",
    tips: [
      "Express preferences clearly",
      "Make decisions together",
      "Maintain individual identities",
    ],
  },
};

function getCompatibilityKey(type1: number, type2: number): string {
  const sorted = [type1, type2].sort((a, b) => a - b);
  return `${sorted[0]}-${sorted[1]}`;
}

export default function EnneagramResults() {
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
        couple.partner1_id === user.id
          ? couple.partner2_id
          : couple.partner1_id;
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

  const { data: allResults, isLoading } = useQuery<EnneagramAssessment[]>({
    queryKey: ["/api/enneagram/couple", coupleId, user?.id, partnerProfile?.id],
    queryFn: async () => {
      if (!user || !coupleId) return [];

      const userIds = [user.id];
      if (partnerProfile?.id) {
        userIds.push(partnerProfile.id);
      }

      const { data, error } = await supabase
        .from("Couples_enneagram_assessments")
        .select("*")
        .eq("couple_id", coupleId)
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const latestByUser: Record<string, EnneagramAssessment> = {};
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
    (r) => r.user_id === partnerProfile?.id,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!myResult || !myResult.primary_type) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Compass className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>No Results Yet</CardTitle>
            <CardDescription>
              Take the Enneagram assessment to discover your personality type
              and how it affects your relationship.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full"
              data-testid="button-take-assessment"
            >
              <Link href="/enneagram-assessment">Take the Assessment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myType = myResult.primary_type;
  const myDetails = enneagramTypeInfo[myType];
  const mySecondaryType = myResult.secondary_type;
  const partnerType = partnerResult?.primary_type;
  const partnerDetails = partnerType ? enneagramTypeInfo[partnerType] : null;
  const partnerName =
    (partnerProfile as ProfileWithCouple)?.full_name || "Your Partner";

  const compatibility = partnerType
    ? compatibilityInsights[getCompatibilityKey(myType, partnerType)]
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
            <Link href="/enneagram-assessment">
              <RefreshCw className="h-4 w-4" />
              Retake Assessment
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="overflow-hidden" data-testid="card-my-result">
            <div className={`${myDetails.bgColor} p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-full bg-background/80">
                  <span className={`text-2xl font-bold ${myDetails.color}`}>
                    {myType}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Your Type
                  </p>
                  <h2 className="text-xl font-bold">{myDetails.title}</h2>
                </div>
              </div>
              <div className="flex gap-2">
                {myResult.primary_score && (
                  <Badge variant="secondary" className="text-xs">
                    Score: {myResult.primary_score}%
                  </Badge>
                )}
                {mySecondaryType && (
                  <Badge variant="outline" className="text-xs">
                    Wing: Type {mySecondaryType}
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {myDetails.description}
              </p>
            </CardContent>
          </Card>

          {partnerResult && partnerDetails && partnerType ? (
            <Card className="overflow-hidden" data-testid="card-partner-result">
              <div className={`${partnerDetails.bgColor} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-full bg-background/80">
                    <span
                      className={`text-2xl font-bold ${partnerDetails.color}`}
                    >
                      {partnerType}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {partnerName}'s Type
                    </p>
                    <h2 className="text-xl font-bold">
                      {partnerDetails.title}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  {partnerResult.primary_score && (
                    <Badge variant="secondary" className="text-xs">
                      Score: {partnerResult.primary_score}%
                    </Badge>
                  )}
                  {partnerResult.secondary_type && (
                    <Badge variant="outline" className="text-xs">
                      Wing: Type {partnerResult.secondary_type}
                    </Badge>
                  )}
                </div>
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
                  Ask your partner to take the Enneagram assessment to see your
                  compatibility.
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

        {compatibility && partnerResult && partnerType && (
          <Card
            className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
            data-testid="card-compatibility"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-primary" />
                Type {myType} & Type {partnerType} Compatibility
              </CardTitle>
              <CardDescription>
                How {myDetails.title} and {partnerDetails?.title} work together
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
                <Star className="h-5 w-5 text-amber-500" />
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

          <Card data-testid="card-my-challenges">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Growth Edges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {myDetails.challenges.map((challenge, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{challenge}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-in-relationship">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" />
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

        {myResult.couple_dynamics && (
          <Card data-testid="card-dynamics">
            <CardHeader>
              <CardTitle className="text-lg">Couple Dynamics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {myResult.couple_dynamics}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
