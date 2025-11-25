import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, Heart, TrendingUp, Lightbulb } from 'lucide-react';

interface AssessmentData {
  partner1: {
    name: string;
    loveLanguage?: { primary: string; secondary: string };
    attachmentStyle?: string;
    enneagramType?: string;
  };
  partner2: {
    name: string;
    loveLanguage?: { primary: string; secondary: string };
    attachmentStyle?: string;
    enneagramType?: string;
  };
}

interface CompatibilityInsight {
  title: string;
  description: string;
  icon: string;
  type: 'strength' | 'mindful';
}

export default function CoupleCompatibility() {
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<CompatibilityInsight[]>([]);

  useEffect(() => {
    fetchAssessments();
  }, [profile?.couple_id]);

  const fetchAssessments = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: couple } = await supabase
        .from('Couples_couples')
        .select('partner1_id, partner2_id')
        .eq('id', profile.couple_id)
        .single();

      if (!couple) return;

      // Fetch partner names
      const { data: profiles } = await supabase
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', [couple.partner1_id, couple.partner2_id]);

      // Fetch Love Languages
      const { data: languages } = await supabase
        .from('Couples_love_languages')
        .select('user_id, primary_language, secondary_language')
        .in('user_id', [couple.partner1_id, couple.partner2_id]);

      // Fetch Attachment Styles
      const { data: attachments } = await supabase
        .from('Couples_attachment_results')
        .select('user_id, attachment_style')
        .in('user_id', [couple.partner1_id, couple.partner2_id]);

      // Fetch Enneagram Types
      const { data: enneagrams } = await supabase
        .from('Couples_enneagram_results')
        .select('user_id, dominant_type, secondary_type')
        .in('user_id', [couple.partner1_id, couple.partner2_id]);

      const p1 = profiles?.find(p => p.id === couple.partner1_id);
      const p2 = profiles?.find(p => p.id === couple.partner2_id);

      const data: AssessmentData = {
        partner1: { name: p1?.full_name || 'Partner 1' },
        partner2: { name: p2?.full_name || 'Partner 2' },
      };

      if (languages) {
        const p1Lang = languages.find(l => l.user_id === couple.partner1_id);
        const p2Lang = languages.find(l => l.user_id === couple.partner2_id);
        if (p1Lang) data.partner1.loveLanguage = { primary: p1Lang.primary_language, secondary: p1Lang.secondary_language };
        if (p2Lang) data.partner2.loveLanguage = { primary: p2Lang.primary_language, secondary: p2Lang.secondary_language };
      }

      if (attachments) {
        const p1Att = attachments.find(a => a.user_id === couple.partner1_id);
        const p2Att = attachments.find(a => a.user_id === couple.partner2_id);
        if (p1Att) data.partner1.attachmentStyle = p1Att.attachment_style;
        if (p2Att) data.partner2.attachmentStyle = p2Att.attachment_style;
      }

      if (enneagrams) {
        const p1Enn = enneagrams.find(e => e.user_id === couple.partner1_id);
        const p2Enn = enneagrams.find(e => e.user_id === couple.partner2_id);
        if (p1Enn) data.partner1.enneagramType = `${p1Enn.dominant_type}/${p1Enn.secondary_type}`;
        if (p2Enn) data.partner2.enneagramType = `${p2Enn.dominant_type}/${p2Enn.secondary_type}`;
      }

      setAssessments(data);
      generateInsights(data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: AssessmentData) => {
    const newInsights: CompatibilityInsight[] = [];

    if (data.partner1.loveLanguage && data.partner2.loveLanguage) {
      if (data.partner1.loveLanguage.primary === data.partner2.loveLanguage.primary) {
        newInsights.push({
          title: 'Shared Love Language',
          description: `You both value ${data.partner1.loveLanguage.primary}. This natural alignment means you're likely already expressing love in ways your partner appreciates.`,
          icon: '❤️',
          type: 'strength',
        });
      } else {
        newInsights.push({
          title: 'Complementary Love Languages',
          description: `${data.partner1.name} values ${data.partner1.loveLanguage.primary} while ${data.partner2.name} values ${data.partner2.loveLanguage.primary}. Learning to speak each other's language deepens your connection.`,
          icon: '💬',
          type: 'mindful',
        });
      }
    }

    if (data.partner1.attachmentStyle === data.partner2.attachmentStyle) {
      newInsights.push({
        title: 'Similar Attachment Styles',
        description: 'You both have similar attachment patterns, which can create understanding but also requires awareness of shared triggers.',
        icon: '🔗',
        type: 'mindful',
      });
    } else {
      newInsights.push({
        title: 'Balancing Attachment Styles',
        description: 'Your different attachment styles create balance. Understanding and appreciating these differences strengthens your bond.',
        icon: '⚖️',
        type: 'strength',
      });
    }

    setInsights(newInsights);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!assessments) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No assessment data available. Complete your assessments first to see compatibility insights.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Your Compatibility Profile</h1>
        <p className="text-muted-foreground">
          Understanding how you and your partner work together based on assessments
        </p>
      </div>

      <Tabs defaultValue="compatibility" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="partner1">
            {assessments.partner1.name}
          </TabsTrigger>
          <TabsTrigger value="partner2">
            {assessments.partner2.name}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compatibility" className="space-y-4">
          <div className="grid gap-4">
            {insights.map((insight, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{insight.icon}</span>
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{insight.description}</p>
                  <Badge className="mt-3" variant={insight.type === 'strength' ? 'default' : 'secondary'}>
                    {insight.type === 'strength' ? 'Strength' : 'Area to be mindful of'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="partner1" className="space-y-4">
          <AssessmentCard partner={assessments.partner1} />
          <SuggestionsCard partner={assessments.partner1} otherPartner={assessments.partner2} />
        </TabsContent>

        <TabsContent value="partner2" className="space-y-4">
          <AssessmentCard partner={assessments.partner2} />
          <SuggestionsCard partner={assessments.partner2} otherPartner={assessments.partner1} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssessmentCard({ partner }: { partner: AssessmentData['partner1'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{partner.name}'s Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {partner.loveLanguage && (
          <div>
            <h4 className="font-semibold mb-2">Love Language</h4>
            <div className="flex gap-2">
              <Badge>{partner.loveLanguage.primary}</Badge>
              <Badge variant="outline">{partner.loveLanguage.secondary}</Badge>
            </div>
          </div>
        )}
        {partner.attachmentStyle && (
          <div>
            <h4 className="font-semibold mb-2">Attachment Style</h4>
            <Badge variant="outline">{partner.attachmentStyle}</Badge>
          </div>
        )}
        {partner.enneagramType && (
          <div>
            <h4 className="font-semibold mb-2">Enneagram Type</h4>
            <Badge variant="outline">Type {partner.enneagramType}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionsCard({ 
  partner, 
  otherPartner 
}: { 
  partner: AssessmentData['partner1'];
  otherPartner: AssessmentData['partner1'];
}) {
  const suggestions: string[] = [];

  if (partner.loveLanguage?.primary === 'Quality Time') {
    suggestions.push(`Schedule regular one-on-one time with ${otherPartner.name}. Even 15-30 minutes of undivided attention weekly strengthens your connection.`);
  }
  if (partner.loveLanguage?.primary === 'Words of Affirmation') {
    suggestions.push(`Share specific compliments and appreciation with ${otherPartner.name} regularly. Write notes or send messages highlighting what you admire.`);
  }
  if (partner.loveLanguage?.primary === 'Acts of Service') {
    suggestions.push(`Look for ways to help ${otherPartner.name} with tasks or responsibilities. Small gestures like making coffee or handling a chore speaks volumes.`);
  }
  if (partner.loveLanguage?.primary === 'Receiving Gifts') {
    suggestions.push(`Thoughtful gifts don't need to be expensive. ${otherPartner.name} will appreciate items that show you're thinking of them.`);
  }
  if (partner.loveLanguage?.primary === 'Physical Touch') {
    suggestions.push(`Increase physical affection with ${otherPartner.name}. Hugs, hand-holding, and cuddling strengthen emotional bonds.`);
  }

  if (partner.attachmentStyle === 'Secure') {
    suggestions.push('Your secure attachment style is a strength—help ${otherPartner.name} feel safe and supported in the relationship.');
  }
  if (partner.attachmentStyle === 'Anxious') {
    suggestions.push(`Express your needs clearly to ${otherPartner.name}. Reassurance and consistent communication help you feel secure.`);
  }
  if (partner.attachmentStyle === 'Avoidant') {
    suggestions.push(`Work on vulnerability with ${otherPartner.name}. Sharing feelings and maintaining emotional connection strengthens your bond.`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Ways to Connect with {otherPartner.name}
        </CardTitle>
        <CardDescription>
          Personalized suggestions based on {partner.name}'s profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <li key={idx} className="flex gap-3">
              <TrendingUp className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
              <span className="text-sm">{suggestion}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
