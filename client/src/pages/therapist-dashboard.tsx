import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, Heart, Brain, MessageSquare, Calendar, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface CoupleData {
  id: string;
  partner1_id: string;
  partner2_id: string;
  partner1?: { full_name: string };
  partner2?: { full_name: string };
  lastActivity?: string;
  engagementScore?: number;
}

export default function TherapistDashboard() {
  const [match, params] = useRoute('/admin/couple/:id');
  const { profile } = useAuth();
  const coupleId = params?.id;

  const [couples, setCouples] = useState<CoupleData[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouples();
  }, [profile?.id]);

  useEffect(() => {
    if (coupleId && couples.length > 0) {
      const couple = couples.find(c => c.id === coupleId);
      setSelectedCouple(couple || null);
    }
  }, [coupleId, couples]);

  const fetchCouples = async () => {
    if (!profile?.id) return;
    try {
      const { data: couplesData } = await supabase
        .from('Couples_couples')
        .select('*')
        .eq('therapist_id', profile.id);

      if (couplesData) {
        const { data: profiles } = await supabase
          .from('Couples_profiles')
          .select('id, full_name');

        const enriched = couplesData.map(couple => ({
          ...couple,
          partner1: profiles?.find(p => p.id === couple.partner1_id),
          partner2: profiles?.find(p => p.id === couple.partner2_id),
        }));
        setCouples(enriched);
      }
    } catch (error) {
      console.error('Error fetching couples:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Left Sidebar - Couples List */}
      <div className="w-80 space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-2">My Couples</h2>
          <p className="text-sm text-muted-foreground mb-4">{couples.length} couples assigned</p>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : couples.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No couples assigned yet</AlertDescription>
            </Alert>
          ) : (
            couples.map(couple => (
              <Link key={couple.id} href={`/admin/couple/${couple.id}`}>
                <Card
                  className={`cursor-pointer transition-all hover-elevate ${
                    selectedCouple?.id === couple.id ? 'ring-2 ring-primary' : ''
                  }`}
                  data-testid={`card-couple-${couple.id}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{couple.partner1?.full_name}</p>
                        <p className="text-xs text-muted-foreground">&</p>
                        <p className="font-semibold text-sm">{couple.partner2?.full_name}</p>
                      </div>
                      {couple.engagementScore && (
                        <Badge variant="outline" className="ml-2">
                          {Math.round(couple.engagementScore)}%
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {selectedCouple ? (
          <CoupleDetails couple={selectedCouple} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Select a couple to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CoupleDetails({ couple }: { couple: CoupleData }) {
  const [, setLocation] = useRoute();
  const thoughtsQuery = useQuery({
    queryKey: [`/api/therapist-thoughts/couple/${couple.id}`],
  });

  const thoughts = (thoughtsQuery.data || []) as any[];
  const todosCount = thoughts.filter(t => t.type === 'todo' && !t.is_complete).length;

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="thoughts">
          Thoughts {todosCount > 0 && <Badge className="ml-2">{todosCount}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="assessments">Assessments</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <QuickStatCard
            title="Partner 1"
            value={couple.partner1?.full_name}
            icon={<Heart className="w-4 h-4" />}
          />
          <QuickStatCard
            title="Partner 2"
            value={couple.partner2?.full_name}
            icon={<Heart className="w-4 h-4" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/admin/couple/${couple.id}/thoughts`}>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                View Therapist Thoughts
              </Button>
            </Link>
            <Link href={`/admin/couple/${couple.id}/checkins`}>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Weekly Check-ins
              </Button>
            </Link>
            <Link href={`/admin/couple/${couple.id}/languages`}>
              <Button variant="outline" className="w-full justify-start">
                <Heart className="w-4 h-4 mr-2" />
                Love Languages
              </Button>
            </Link>
            <Link href={`/admin/couple/${couple.id}/analytics`}>
              <Button variant="outline" className="w-full justify-start">
                <Brain className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="thoughts" className="space-y-4">
        {thoughtsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <TherapistThoughtsPanel coupleId={couple.id} thoughts={thoughts} />
        )}
      </TabsContent>

      <TabsContent value="assessments" className="space-y-4">
        <AssessmentsPanel coupleId={couple.id} couple={couple} />
      </TabsContent>

      <TabsContent value="tools" className="space-y-4">
        <ToolsPanel coupleId={couple.id} />
      </TabsContent>
    </Tabs>
  );
}

function QuickStatCard({ title, value, icon }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TherapistThoughtsPanel({ coupleId, thoughts }: any) {
  const todos = thoughts.filter((t: any) => t.type === 'todo');
  const messages = thoughts.filter((t: any) => t.type === 'message');
  const files = thoughts.filter((t: any) => t.type === 'file');

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Link href={`/admin/couple/${coupleId}/thoughts-edit`}>
          <Button>
            <MessageSquare className="w-4 h-4 mr-2" />
            Add Thought
          </Button>
        </Link>
      </div>

      {todos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">To-Do Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todos.map((thought: any) => (
              <div
                key={thought.id}
                className="flex items-start gap-3 p-3 bg-muted rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold">{thought.title}</p>
                  {thought.content && (
                    <p className="text-sm text-muted-foreground">{thought.content}</p>
                  )}
                  {thought.priority && (
                    <Badge className="mt-2" variant={
                      thought.priority === 'high' ? 'destructive' : 
                      thought.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {thought.priority}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {messages.map((thought: any) => (
              <div key={thought.id} className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{thought.title}</p>
                {thought.content && (
                  <p className="text-sm text-muted-foreground mt-1">{thought.content}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {thoughts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No therapist thoughts yet. Add one to get started.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function AssessmentsPanel({ coupleId, couple }: any) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Assessments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href={`/admin/couple/${coupleId}/languages`}>
            <Button variant="outline" className="w-full justify-start">
              <Heart className="w-4 h-4 mr-2" />
              Love Languages
            </Button>
          </Link>
          <Link href={`/admin/couple/${coupleId}/lovemap`}>
            <Button variant="outline" className="w-full justify-start">
              <Brain className="w-4 h-4 mr-2" />
              Love Map Quiz
            </Button>
          </Link>
          <Link href={`/admin/couple/${coupleId}/analytics`}>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              AI Analytics
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolsPanel({ coupleId }: any) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href={`/admin/couple/${coupleId}/echo`}>
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Echo & Empathy
            </Button>
          </Link>
          <Link href={`/admin/couple/${coupleId}/conversations`}>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Hold Me Tight
            </Button>
          </Link>
          <Link href={`/admin/couple/${coupleId}/calendar`}>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
