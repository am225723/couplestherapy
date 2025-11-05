import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Target, Sparkles, Coffee, ClipboardList, Loader2, ArrowRight, Calendar, TrendingUp } from 'lucide-react';
import { LoveLanguage } from '@shared/schema';
import clientHeroImage from '@assets/generated_images/Client_app_hero_image_9fd4eaf0.png';

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.couple_id) {
      fetchLoveLanguages();
    }
  }, [profile?.couple_id]);

  const fetchLoveLanguages = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: coupleData } = await supabase
        .from('Couples_couples')
        .select('partner1_id, partner2_id')
        .eq('id', profile.couple_id)
        .single();

      if (coupleData) {
        const { data } = await supabase
          .from('Couples_love_languages')
          .select('*')
          .in('user_id', [coupleData.partner1_id, coupleData.partner2_id]);

        setLoveLanguages(data || []);
      }
    } catch (error) {
      console.error('Error fetching love languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const activities = [
    {
      title: 'Weekly Check-In',
      description: 'Private reflection on your week together',
      icon: ClipboardList,
      path: '/weekly-checkin',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Gratitude Log',
      description: 'Share moments of appreciation',
      icon: Sparkles,
      path: '/gratitude',
      color: 'text-accent-foreground',
      bgColor: 'bg-accent/30',
    },
    {
      title: 'Shared Goals',
      description: 'Track your journey together',
      icon: Target,
      path: '/goals',
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary/30',
    },
    {
      title: 'Rituals of Connection',
      description: 'Build daily moments together',
      icon: Coffee,
      path: '/rituals',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Hold Me Tight',
      description: 'Deepen emotional connection',
      icon: MessageCircle,
      path: '/conversation',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-80 overflow-hidden">
        <img
          src={clientHeroImage}
          alt="Couples connecting"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/30"></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Heart className="h-12 w-12 text-white" />
              <h1 className="text-5xl font-bold text-white">Welcome Back</h1>
            </div>
            <p className="text-xl text-white/90">
              Continue your journey of connection and growth
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 pb-12 space-y-12">
        <Link href="/checkin-history">
          <Card className="shadow-lg hover-elevate active-elevate-2 cursor-pointer border-primary/20" data-testid="card-checkin-history">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Check-In History
                  </CardTitle>
                  <CardDescription>Review your weekly reflections and track your progress over time</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">View Timeline</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {!loading && loveLanguages.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Your Love Languages
              </CardTitle>
              <CardDescription>Understanding how you both give and receive love</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loveLanguages.map((lang) => (
                  <div key={lang.id} className="space-y-3">
                    <p className="font-semibold text-lg">
                      {lang.user_id === profile?.id ? 'You' : 'Your Partner'}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Primary:</span>
                        <span className="font-medium text-primary">{lang.primary_language}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Secondary:</span>
                        <span className="font-medium text-secondary-foreground">{lang.secondary_language}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-3xl font-bold mb-6">Your Activities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <Link key={activity.path} href={activity.path}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${activity.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${activity.color}`} />
                      </div>
                      <CardTitle className="text-xl">{activity.title}</CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-primary font-medium">
                        Get started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
