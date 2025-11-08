import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { Heart, Target } from 'lucide-react';

const DIMENSIONS = [
  { key: 'physical', name: 'Physical', description: 'Touch, affection, sexual connection' },
  { key: 'emotional', name: 'Emotional', description: 'Vulnerability, sharing feelings' },
  { key: 'intellectual', name: 'Intellectual', description: 'Conversations, shared ideas' },
  { key: 'experiential', name: 'Experiential', description: 'Shared activities and adventures' },
  { key: 'spiritual', name: 'Spiritual', description: 'Values, meaning, connection to something larger' },
];

interface IntimacyRating {
  id: string;
  couple_id: string;
  user_id: string;
  week_number: number;
  year: number;
  physical: number;
  emotional: number;
  intellectual: number;
  experiential: number;
  spiritual: number;
  notes: string | null;
  created_at: string;
}

interface IntimacyGoal {
  id: string;
  couple_id: string;
  dimension: string;
  goal_text: string;
  target_rating: number;
  is_achieved: boolean;
  created_at: string;
  achieved_at: string | null;
}

export default function IntimacyMappingPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [newGoal, setNewGoal] = useState({ dimension: '', goal_text: '', target_rating: 7 });

  // Calculate current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  // Fetch ratings
  const { data: allRatings = [] } = useQuery<IntimacyRating[]>({
    queryKey: ['/api/intimacy/ratings', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch goals
  const { data: goals = [] } = useQuery<IntimacyGoal[]>({
    queryKey: ['/api/intimacy/goals', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/intimacy/rating', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intimacy/ratings', profile?.couple_id] });
      toast({
        title: 'Rating Submitted',
        description: 'Your intimacy map has been updated.',
      });
      setRatings({});
      setNotes('');
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/intimacy/goal', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intimacy/goals', profile?.couple_id] });
      toast({
        title: 'Goal Created',
        description: 'Keep working toward deeper connection.',
      });
      setNewGoal({ dimension: '', goal_text: '', target_rating: 7 });
    },
  });

  const handleSubmitRating = () => {
    const allRated = DIMENSIONS.every(dim => ratings[dim.key] !== undefined);
    if (!allRated) {
      toast({
        title: 'Incomplete Rating',
        description: 'Please rate all five dimensions.',
        variant: 'destructive',
      });
      return;
    }

    submitRatingMutation.mutate({
      week_number: weekNumber,
      year: now.getFullYear(),
      ...ratings,
      notes,
    });
  };

  const handleCreateGoal = () => {
    if (!newGoal.dimension || !newGoal.goal_text) {
      toast({
        title: 'Incomplete Goal',
        description: 'Please select a dimension and describe your goal.',
        variant: 'destructive',
      });
      return;
    }

    createGoalMutation.mutate(newGoal);
  };

  // Get latest ratings for chart
  const myLatestRating = allRatings
    .filter(r => r.user_id === profile?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const partnerLatestRating = allRatings
    .filter(r => r.user_id !== profile?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const chartData = DIMENSIONS.map(dim => ({
    dimension: dim.name,
    you: myLatestRating?.[dim.key as keyof IntimacyRating] || 0,
    partner: partnerLatestRating?.[dim.key as keyof IntimacyRating] || 0,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intimacy Mapping</h1>
        <p className="text-muted-foreground mt-2">
          Track five dimensions of intimacy to understand and grow your connection.
        </p>
      </div>

      {/* Radar Chart */}
      {(myLatestRating || partnerLatestRating) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Intimacy Map</CardTitle>
            <CardDescription>Visual representation of your connection dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis domain={[0, 10]} />
                {myLatestRating && (
                  <Radar name="You" dataKey="you" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                )}
                {partnerLatestRating && (
                  <Radar name="Partner" dataKey="partner" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                )}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rate This Week */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Your Intimacy This Week</CardTitle>
          <CardDescription>
            Rate each dimension from 1-10 based on how satisfied you feel in that area this week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension.key} className="space-y-2">
              <div>
                <h3 className="font-semibold">{dimension.name}</h3>
                <p className="text-sm text-muted-foreground">{dimension.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <Button
                    key={value}
                    data-testid={`button-${dimension.key}-${value}`}
                    size="sm"
                    variant={ratings[dimension.key] === value ? "default" : "outline"}
                    onClick={() => setRatings({ ...ratings, [dimension.key]: value })}
                    className="w-10"
                  >
                    {value}
                  </Button>
                ))}
              </div>
              {ratings[dimension.key] && (
                <p className="text-sm text-muted-foreground">
                  Current rating: {ratings[dimension.key]}/10
                </p>
              )}
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              data-testid="textarea-notes"
              placeholder="Any reflections on your intimacy this week..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            data-testid="button-submit-rating"
            onClick={handleSubmitRating}
            disabled={submitRatingMutation.isPending}
            className="w-full"
          >
            {submitRatingMutation.isPending ? 'Submitting...' : 'Submit This Week\'s Rating'}
          </Button>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Intimacy Goals
          </CardTitle>
          <CardDescription>Set goals to improve specific dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <select
              data-testid="select-dimension"
              value={newGoal.dimension}
              onChange={(e) => setNewGoal({ ...newGoal, dimension: e.target.value })}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select a dimension</option>
              {DIMENSIONS.map(dim => (
                <option key={dim.key} value={dim.key}>{dim.name}</option>
              ))}
            </select>

            <Textarea
              data-testid="textarea-goal-text"
              placeholder="Describe your goal..."
              value={newGoal.goal_text}
              onChange={(e) => setNewGoal({ ...newGoal, goal_text: e.target.value })}
            />

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Target Rating:</label>
              <select
                data-testid="select-target-rating"
                value={newGoal.target_rating}
                onChange={(e) => setNewGoal({ ...newGoal, target_rating: parseInt(e.target.value) })}
                className="border rounded-md p-2"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <Button
              data-testid="button-create-goal"
              onClick={handleCreateGoal}
              disabled={createGoalMutation.isPending}
              className="w-full"
            >
              {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>

          {/* Active Goals */}
          <div className="space-y-2">
            <h3 className="font-semibold">Active Goals</h3>
            {goals.filter(g => !g.is_achieved).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active goals yet.</p>
            ) : (
              goals.filter(g => !g.is_achieved).map(goal => (
                <div key={goal.id} className="border rounded-md p-3" data-testid={`goal-${goal.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="mb-2" data-testid={`badge-dimension-${goal.id}`}>{DIMENSIONS.find(d => d.key === goal.dimension)?.name}</Badge>
                      <p className="text-sm" data-testid={`text-goal-${goal.id}`}>{goal.goal_text}</p>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-target-${goal.id}`}>Target: {goal.target_rating}/10</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
