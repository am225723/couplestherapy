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
import { LoveLanguageType, LoveLanguage } from "@shared/schema";

interface ProfileWithCouple {
  couple_id?: string;
  full_name?: string;
  [key: string]: any;
}

import {
  Heart,
  MessageCircle,
  Clock,
  Gift,
  HandHeart,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Users,
  HeartHandshake,
  Send,
} from "lucide-react";

const loveLanguageDetails: Record<
  LoveLanguageType,
  {
    icon: typeof Heart;
    color: string;
    bgColor: string;
    description: string;
    howToGive: string[];
    activities: string[];
  }
> = {
  "Words of Affirmation": {
    icon: MessageCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description:
      "Feels most loved through verbal compliments, words of appreciation, and encouragement. Hearing 'I love you' and receiving genuine praise makes them feel valued and connected.",
    howToGive: [
      "Write love notes and leave them in unexpected places",
      "Send encouraging text messages throughout the day",
      "Verbally express appreciation for specific things they do",
      "Offer genuine compliments about their character and achievements",
      "Say 'I love you' regularly and meaningfully",
    ],
    activities: [
      "Write each other love letters to read aloud",
      "Create a jar of affirmations to read together weekly",
      "Record voice messages expressing what you love about each other",
      "Share three specific things you appreciate about your partner daily",
      "Write a heartfelt poem or song for each other",
    ],
  },
  "Quality Time": {
    icon: Clock,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description:
      "Feels most loved through undivided attention. Having meaningful conversations, sharing experiences together, and being fully present matters more than any gift or act of service.",
    howToGive: [
      "Put away phones and devices during time together",
      "Plan regular date nights with no distractions",
      "Engage in meaningful conversations about feelings and dreams",
      "Participate in activities you both enjoy together",
      "Make eye contact and actively listen when talking",
    ],
    activities: [
      "Take a weekly walk together without phones",
      "Cook a meal together from start to finish",
      "Start a hobby or class you can learn together",
      "Create a weekly 'us time' ritual (coffee dates, sunset watching)",
      "Plan a tech-free evening once a week",
    ],
  },
  "Receiving Gifts": {
    icon: Gift,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description:
      "Feels most loved through thoughtful gifts that show you were thinking of them. The gift itself matters less than the thought and effort behind it.",
    howToGive: [
      "Pick up small gifts when you think of them",
      "Remember special occasions and celebrate meaningfully",
      "Pay attention to things they mention wanting",
      "Give 'just because' gifts to show you were thinking of them",
      "Put thought into gift wrapping and presentation",
    ],
    activities: [
      "Create a 'thinking of you' gift box for each other",
      "Make handmade gifts or crafts for one another",
      "Start a tradition of monthly 'just because' surprises",
      "Create a scrapbook of your relationship memories",
      "Plan a treasure hunt with meaningful small gifts",
    ],
  },
  "Acts of Service": {
    icon: HandHeart,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description:
      "Feels most loved when their partner does helpful things for them. Actions speak louder than words - taking care of tasks and easing burdens shows true love and care.",
    howToGive: [
      "Take over a task they usually do without being asked",
      "Help with projects or responsibilities they're stressed about",
      "Make their morning routine easier (prepare coffee, pack lunch)",
      "Complete household chores before they need to ask",
      "Run errands or do tasks to ease their load",
    ],
    activities: [
      "Do a chore swap - each take over one of the other's tasks for a week",
      "Plan a 'pamper day' where you handle all responsibilities",
      "Create a 'honey-do' list and complete items together",
      "Meal prep together for the entire week",
      "Organize or clean a shared space as a team",
    ],
  },
  "Physical Touch": {
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description:
      "Feels most loved through physical affection. Hugs, kisses, holding hands, and intimate touch create feelings of security and connection.",
    howToGive: [
      "Hold hands when walking or sitting together",
      "Give hugs and kisses regularly throughout the day",
      "Offer back rubs or massages",
      "Sit close together when relaxing",
      "Initiate physical affection without it leading to anything else",
    ],
    activities: [
      "Give each other massages once a week",
      "Dance together in the living room",
      "Practice couples yoga or stretching routines",
      "Create a cuddling routine (morning, evening, or both)",
      "Take baths together",
    ],
  },
};

const compatibilityInsights: Record<string, { harmony: string; growth: string; rituals: string[] }> = {
  "Acts of Service-Acts of Service": {
    harmony: "You both show love through actions. Your home runs smoothly as you both naturally help each other.",
    growth: "Don't keep score of who does what. Remember to occasionally express love in other ways too.",
    rituals: ["Alternating breakfast in bed", "Weekend chore partnerships", "Surprise task completion"],
  },
  "Acts of Service-Physical Touch": {
    harmony: "Caring actions paired with physical affection show complete love. A massage after a long day combines both languages.",
    growth: "The Acts partner should remember that sometimes just sitting close matters more than doing. The Touch partner can show love through helpful actions.",
    rituals: ["Pampering spa nights", "Cooking together with lots of hugs", "Physical affection after acts of service"],
  },
  "Acts of Service-Quality Time": {
    harmony: "Doing tasks together becomes quality time. The Acts partner shows love through shared activities and projects.",
    growth: "The Acts partner should sometimes just sit and be present without 'doing.' The Quality Time partner can show love by helping with tasks.",
    rituals: ["Cooking meals together", "Weekend projects as dates", "Morning routines shared"],
  },
  "Acts of Service-Receiving Gifts": {
    harmony: "Gifts of service (like handling a dreaded task) can be incredibly meaningful. Practical gifts that help are doubly loved.",
    growth: "The Gifts partner should sometimes give the gift of doing. The Acts partner should occasionally add a thoughtful token to their service.",
    rituals: ["Gifts that make life easier", "Service surprises with a bow", "Practical presents with love notes"],
  },
  "Acts of Service-Words of Affirmation": {
    harmony: "One shows love through helpful actions, the other through verbal appreciation. The Acts partner's efforts can be deeply acknowledged.",
    growth: "The Acts partner should practice saying 'I love you' more. The Words partner should occasionally show love through helpful actions.",
    rituals: ["Thank-you rituals for daily tasks", "Verbal appreciation before bed", "Weekly acts of service with love notes"],
  },
  "Physical Touch-Physical Touch": {
    harmony: "You both feel most loved through physical connection. Your relationship is naturally affectionate and warm.",
    growth: "Make sure to communicate verbally too. Physical touch should enhance, not replace, emotional intimacy.",
    rituals: ["Morning and evening cuddle time", "Frequent hand-holding", "Daily massage exchanges"],
  },
  "Physical Touch-Quality Time": {
    harmony: "Being together with physical closeness is the ultimate combination. Cuddling while talking creates deep intimacy.",
    growth: "Make sure quality time includes meaningful conversation, not just physical presence. Balance active dates with cozy togetherness.",
    rituals: ["Evening cuddle and chat time", "Walking hand in hand", "Physical affection during all activities together"],
  },
  "Physical Touch-Receiving Gifts": {
    harmony: "Thoughtful gifts combined with physical affection create powerful moments. A gift given with a hug means twice as much.",
    growth: "Remember that presence and touch can be as valuable as any gift. Sometimes the best present is simply being held.",
    rituals: ["Gifts presented with kisses", "Surprise treats with cuddle time", "Physical affection as the main gift"],
  },
  "Physical Touch-Words of Affirmation": {
    harmony: "Combining affectionate words with physical closeness creates powerful moments of connection.",
    growth: "The Touch partner should practice verbalizing feelings during intimate moments. The Words partner should initiate more physical affection.",
    rituals: ["Hugs with spoken affirmations", "Holding hands while sharing appreciation", "Cuddle time with meaningful conversation"],
  },
  "Quality Time-Quality Time": {
    harmony: "You both prioritize presence and undivided attention. Your shared need for togetherness creates deep connection.",
    growth: "Be mindful of becoming too dependent on constant togetherness. Maintain individual interests while cherishing your time together.",
    rituals: ["Daily device-free time", "Weekly adventure dates", "Evening wind-down rituals together"],
  },
  "Quality Time-Receiving Gifts": {
    harmony: "The Gifts partner can plan meaningful experiences as gifts. The Quality Time partner values the thought and planning behind special outings.",
    growth: "Quality Time partner should occasionally surprise with thoughtful tokens. Gifts partner should focus on experiences over material items.",
    rituals: ["Monthly experience gifts", "Surprise date planning", "Memory-making adventures"],
  },
  "Quality Time-Words of Affirmation": {
    harmony: "One of you fills up through words, the other through presence. Together you create deeply meaningful conversations.",
    growth: "The Quality Time partner should practice verbalizing their feelings more. The Words partner should put down distractions and be fully present.",
    rituals: ["Daily check-ins with compliments", "Weekly uninterrupted date nights", "Morning coffee conversations"],
  },
  "Receiving Gifts-Receiving Gifts": {
    harmony: "You both appreciate thoughtful tokens of love. Gift-giving becomes a joyful exchange of affection.",
    growth: "Be careful not to make love feel transactional. Focus on thoughtfulness over expense or frequency.",
    rituals: ["Monthly surprise exchange", "Meaningful occasion celebrations", "Just-because gift traditions"],
  },
  "Receiving Gifts-Words of Affirmation": {
    harmony: "Thoughtful notes with gifts can be incredibly meaningful. Words partner can write meaningful cards; Gifts partner shows love through tokens of affection.",
    growth: "Remember that words without thoughtful gestures may feel empty to one, while gifts without verbal appreciation may feel hollow to the other.",
    rituals: ["Love notes with small surprises", "Anniversary letters with meaningful gifts", "Verbal thanks for every gift given"],
  },
  "Words of Affirmation-Words of Affirmation": {
    harmony: "You both thrive on verbal expressions of love. Your shared language makes communication natural and affirming.",
    growth: "Be careful not to rely only on words - sometimes actions need to back them up. Practice expressing love in other ways too.",
    rituals: ["Daily appreciation sharing", "Weekly love letter exchange", "Morning affirmation rituals"],
  },
};

function getCompatibilityKey(lang1: LoveLanguageType, lang2: LoveLanguageType): string {
  const sorted = [lang1, lang2].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

export default function LoveLanguageResults() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;

  // Get partner info from the couple
  const { data: partnerProfile } = useQuery({
    queryKey: ["/api/partner-profile", coupleId],
    queryFn: async () => {
      if (!coupleId || !user) return null;
      
      // First get the couple to find partner ID
      const { data: couple, error: coupleError } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", coupleId)
        .single();
      
      if (coupleError || !couple) return null;
      
      const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;
      if (!partnerId) return null;
      
      // Get partner's profile
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

  // Get both partners' love language results
  const { data: allResults, isLoading } = useQuery<LoveLanguage[]>({
    queryKey: ["/api/love-languages/couple", coupleId, user?.id, partnerProfile?.id],
    queryFn: async () => {
      if (!user) {
        console.log("No user found for love language results query");
        return [];
      }
      
      const userIds = [user.id];
      if (partnerProfile?.id) {
        userIds.push(partnerProfile.id);
      }
      
      console.log("Fetching love language results for userIds:", userIds);
      
      // Get results for users (no created_at column in Supabase, so just fetch all)
      const { data, error } = await supabase
        .from("Couples_love_languages")
        .select("*")
        .in("user_id", userIds);

      console.log("Love language query result:", { data, error });

      if (error) throw error;
      
      // Get the latest result for each user (by id if multiple exist)
      const latestByUser: Record<string, LoveLanguage> = {};
      for (const result of (data || [])) {
        // If we already have a result for this user, keep the one with the larger id (more recent)
        if (!latestByUser[result.user_id] || result.id > latestByUser[result.user_id].id) {
          latestByUser[result.user_id] = result;
        }
      }
      
      console.log("Latest results by user:", latestByUser);
      
      return Object.values(latestByUser);
    },
    enabled: !!user,
  });

  const myResult = allResults?.find(r => r.user_id === user?.id);
  const partnerResult = allResults?.find(r => r.user_id === partnerProfile?.id);

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
            <Heart className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>No Results Yet</CardTitle>
            <CardDescription>
              Take the Love Language quiz to discover how you give and receive
              love.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" data-testid="button-take-quiz">
              <Link href="/quiz">Take the Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myPrimary = myResult.primary_language as LoveLanguageType;
  const mySecondary = myResult.secondary_language as LoveLanguageType;
  const myDetails = loveLanguageDetails[myPrimary];
  const mySecondaryDetails = loveLanguageDetails[mySecondary];
  const myScores = myResult.scores as Record<string, number>;
  const myTotalAnswers = Object.values(myScores).reduce((a, b) => a + b, 0);
  const mySortedLanguages = Object.entries(myScores)
    .sort((a, b) => b[1] - a[1])
    .map(([language, score]) => ({
      language: language as LoveLanguageType,
      score,
      percentage: Math.round((score / myTotalAnswers) * 100),
    }));

  const partnerPrimary = partnerResult?.primary_language as LoveLanguageType | undefined;
  const partnerSecondary = partnerResult?.secondary_language as LoveLanguageType | undefined;
  const partnerDetails = partnerPrimary ? loveLanguageDetails[partnerPrimary] : null;
  const partnerName = (partnerProfile as ProfileWithCouple)?.full_name || "Your Partner";

  const compatibility = partnerPrimary 
    ? compatibilityInsights[getCompatibilityKey(myPrimary, partnerPrimary)] 
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
            data-testid="button-retake-quiz"
          >
            <Link href="/quiz">
              <RefreshCw className="h-4 w-4" />
              Retake Quiz
            </Link>
          </Button>
        </div>

        {/* Both Partners Overview */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Your Results */}
          <Card className="overflow-hidden" data-testid="card-my-result">
            <div className={`${myDetails.bgColor} p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-background/80">
                  <myDetails.icon className={`h-6 w-6 ${myDetails.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Primary</p>
                  <h2 className="text-xl font-bold">{myPrimary}</h2>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Secondary: {mySecondary}
              </Badge>
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{myDetails.description}</p>
            </CardContent>
          </Card>

          {/* Partner's Results */}
          {partnerResult && partnerDetails ? (
            <Card className="overflow-hidden" data-testid="card-partner-result">
              <div className={`${partnerDetails.bgColor} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-background/80">
                    <partnerDetails.icon className={`h-6 w-6 ${partnerDetails.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{partnerName}'s Primary</p>
                    <h2 className="text-xl font-bold">{partnerPrimary}</h2>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Secondary: {partnerSecondary}
                </Badge>
              </div>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{partnerDetails.description}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-dashed" data-testid="card-partner-pending">
              <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Waiting for Partner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask your partner to take the Love Language quiz to see your compatibility.
                </p>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-invite-partner">
                  <Send className="h-4 w-4" />
                  Invite Partner
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Compatibility Section */}
        {compatibility && partnerResult && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5" data-testid="card-compatibility">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-primary" />
                Your Love Language Compatibility
              </CardTitle>
              <CardDescription>
                How {myPrimary} and {partnerPrimary} work together
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Your Harmony
                </h4>
                <p className="text-sm text-muted-foreground">{compatibility.harmony}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Growth Opportunity
                </h4>
                <p className="text-sm text-muted-foreground">{compatibility.growth}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Suggested Rituals for You Both
                </h4>
                <div className="grid gap-2">
                  {compatibility.rituals.map((ritual, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{ritual}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How to Love Your Partner */}
        {partnerResult && partnerDetails && (
          <Card data-testid="card-love-partner">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                How to Love {partnerName}
              </CardTitle>
              <CardDescription>
                Their love language is {partnerPrimary} - here's how to speak it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {partnerDetails.howToGive.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
              
              {partnerSecondary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="secondary">Secondary: {partnerSecondary}</Badge>
                    </h4>
                    <ul className="space-y-2">
                      {loveLanguageDetails[partnerSecondary].howToGive.slice(0, 3).map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="text-primary">-</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* How Your Partner Can Love You */}
        <Card data-testid="card-how-partner-loves-you">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              How {partnerResult ? partnerName : "Your Partner"} Can Love You
            </CardTitle>
            <CardDescription>
              Share this with your partner so they know how to best express love to you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <myDetails.icon className={`h-4 w-4 ${myDetails.color}`} />
                {myPrimary}
              </h4>
              <ul className="space-y-3">
                {myDetails.howToGive.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <mySecondaryDetails.icon className={`h-4 w-4 ${mySecondaryDetails.color}`} />
                {mySecondary} <Badge variant="secondary" className="text-xs ml-1">Secondary</Badge>
              </h4>
              <ul className="space-y-2">
                {mySecondaryDetails.howToGive.slice(0, 3).map((tip, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-secondary font-bold">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Your Score Breakdown */}
        <Card data-testid="card-score-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Love Language Profile
            </CardTitle>
            <CardDescription>
              See how you scored across all five love languages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mySortedLanguages.map(({ language, score, percentage }, index) => {
              const details = loveLanguageDetails[language];
              const Icon = details.icon;
              const isPrimary = index === 0;
              const isSecondary = index === 1;

              return (
                <div
                  key={language}
                  className="space-y-2"
                  data-testid={`score-${language.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${details.color}`} />
                      <span className="font-medium">{language}</span>
                      {isPrimary && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      {isSecondary && (
                        <Badge variant="secondary" className="text-xs">
                          Secondary
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {score} ({percentage}%)
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-3 ${isPrimary ? "bg-primary/20" : isSecondary ? "bg-secondary/20" : "bg-muted"}`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Couple Activities */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card data-testid="card-primary-activities">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <myDetails.icon className={`h-5 w-5 ${myDetails.color}`} />
                {myPrimary} Activities
              </CardTitle>
              <CardDescription>
                Ways to practice your primary love language together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {myDetails.activities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{activity}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {partnerDetails && (
            <Card data-testid="card-partner-activities">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <partnerDetails.icon className={`h-5 w-5 ${partnerDetails.color}`} />
                  {partnerPrimary} Activities
                </CardTitle>
                <CardDescription>
                  Ways to practice {partnerName}'s love language together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {partnerDetails.activities.map((activity, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{activity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {!partnerResult && (
          <Card
            className="bg-primary/5 border-primary/20"
            data-testid="card-couple-tip"
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Strengthen Your Connection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Understanding love languages is just the first step. Ask your
                    partner to take the quiz too so you can see how your love languages
                    work together and discover personalized ways to love each other better.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
