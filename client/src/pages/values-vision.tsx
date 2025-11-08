import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Heart, Target, Sparkles, Award } from 'lucide-react';

const TIME_HORIZONS = {
  '1_year': '1 Year',
  '5_year': '5 Years',
  '10_year': '10 Years',
  'lifetime': 'Lifetime',
};

const DREAM_CATEGORIES = {
  personal: 'Personal',
  shared: 'Shared',
  career: 'Career',
  family: 'Family',
  adventure: 'Adventure',
  legacy: 'Legacy',
  other: 'Other',
};

interface SharedDream {
  id: string;
  couple_id: string;
  author_id: string;
  dream_text: string;
  category: string;
  time_horizon: string;
  is_shared_with_partner: boolean;
  partner_honored: boolean;
  created_at: string;
}

interface CoreValue {
  id: string;
  couple_id: string;
  value_name: string;
  definition: string | null;
  is_agreed: boolean;
  created_at: string;
}

interface VisionBoardItem {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  time_horizon: string;
  is_achieved: boolean;
  created_at: string;
  achieved_at: string | null;
}

export default function ValuesVisionPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newDream, setNewDream] = useState({ dream_text: '', category: 'shared', time_horizon: '5_year' });
  const [newValue, setNewValue] = useState({ value_name: '', definition: '' });
  const [newVisionItem, setNewVisionItem] = useState({ title: '', description: '', category: 'relationship', time_horizon: '5_year' });

  // Fetch dreams
  const { data: dreams = [] } = useQuery<SharedDream[]>({
    queryKey: ['/api/dreams', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch values
  const { data: values = [] } = useQuery<CoreValue[]>({
    queryKey: ['/api/core-values', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch vision board
  const { data: visionBoard = [] } = useQuery<VisionBoardItem[]>({
    queryKey: ['/api/vision-board', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Create dream mutation
  const createDreamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/dreams', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dreams', profile?.couple_id] });
      toast({ title: 'Dream Added', description: 'Your dream has been shared.' });
      setNewDream({ dream_text: '', category: 'shared', time_horizon: '5_year' });
    },
  });

  // Create value mutation
  const createValueMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/core-values', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core-values', profile?.couple_id] });
      toast({ title: 'Value Added', description: 'Your core value has been added.' });
      setNewValue({ value_name: '', definition: '' });
    },
  });

  // Create vision board item mutation
  const createVisionItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/vision-board', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vision-board', profile?.couple_id] });
      toast({ title: 'Vision Item Added', description: 'Your vision has been added to the board.' });
      setNewVisionItem({ title: '', description: '', category: 'relationship', time_horizon: '5_year' });
    },
  });

  // Honor dream mutation
  const honorDreamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/dreams/${id}/honor`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dreams', profile?.couple_id] });
      toast({ title: 'Dream Honored', description: 'You\'ve acknowledged your partner\'s dream.' });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Values & Vision</h1>
        <p className="text-muted-foreground mt-2">
          Share your dreams, define your values, and create a shared vision for your future together.
        </p>
      </div>

      {/* Shared Dreams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Shared Dreams
          </CardTitle>
          <CardDescription>Share and honor each other's dreams</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Textarea
              data-testid="textarea-dream-text"
              placeholder="Describe a dream or aspiration..."
              value={newDream.dream_text}
              onChange={(e) => setNewDream({ ...newDream, dream_text: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                data-testid="select-dream-category"
                value={newDream.category}
                onChange={(e) => setNewDream({ ...newDream, category: e.target.value })}
                className="border rounded-md p-2"
              >
                {Object.entries(DREAM_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                data-testid="select-dream-horizon"
                value={newDream.time_horizon}
                onChange={(e) => setNewDream({ ...newDream, time_horizon: e.target.value })}
                className="border rounded-md p-2"
              >
                {Object.entries(TIME_HORIZONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <Button
              data-testid="button-add-dream"
              onClick={() => createDreamMutation.mutate(newDream)}
              disabled={createDreamMutation.isPending || !newDream.dream_text}
              className="w-full"
            >
              {createDreamMutation.isPending ? 'Adding...' : 'Add Dream'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Our Dreams</h3>
            {dreams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dreams shared yet.</p>
            ) : (
              dreams.map(dream => (
                <div key={dream.id} className="border rounded-md p-3" data-testid={`dream-${dream.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge data-testid={`badge-horizon-${dream.id}`}>{TIME_HORIZONS[dream.time_horizon as keyof typeof TIME_HORIZONS]}</Badge>
                        <Badge variant="outline" data-testid={`badge-category-${dream.id}`}>{DREAM_CATEGORIES[dream.category as keyof typeof DREAM_CATEGORIES]}</Badge>
                      </div>
                      <p className="text-sm" data-testid={`text-dream-${dream.id}`}>{dream.dream_text}</p>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-date-${dream.id}`}>
                        {format(new Date(dream.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {dream.author_id !== profile?.id && !dream.partner_honored && (
                      <Button
                        data-testid={`button-honor-${dream.id}`}
                        size="sm"
                        onClick={() => honorDreamMutation.mutate(dream.id)}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        Honor
                      </Button>
                    )}
                    {dream.partner_honored && (
                      <Badge variant="default" className="bg-pink-600" data-testid={`badge-honored-${dream.id}`}>
                        <Heart className="w-3 h-3 mr-1" />
                        Honored
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Core Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Core Values
          </CardTitle>
          <CardDescription>Define the values that guide your relationship</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              data-testid="input-value-name"
              placeholder="Value name (e.g., Honesty, Adventure, Family)"
              value={newValue.value_name}
              onChange={(e) => setNewValue({ ...newValue, value_name: e.target.value })}
            />

            <Textarea
              data-testid="textarea-value-definition"
              placeholder="What does this value mean to us?"
              value={newValue.definition}
              onChange={(e) => setNewValue({ ...newValue, definition: e.target.value })}
            />

            <Button
              data-testid="button-add-value"
              onClick={() => createValueMutation.mutate(newValue)}
              disabled={createValueMutation.isPending || !newValue.value_name}
              className="w-full"
            >
              {createValueMutation.isPending ? 'Adding...' : 'Add Value'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Our Core Values</h3>
            {values.length === 0 ? (
              <p className="text-sm text-muted-foreground">No values defined yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.map(value => (
                  <Badge key={value.id} variant="default" data-testid={`value-${value.id}`}>
                    {value.value_name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vision Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Vision Board
          </CardTitle>
          <CardDescription>Create a visual representation of your shared future</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              data-testid="input-vision-title"
              placeholder="Vision title..."
              value={newVisionItem.title}
              onChange={(e) => setNewVisionItem({ ...newVisionItem, title: e.target.value })}
            />

            <Textarea
              data-testid="textarea-vision-description"
              placeholder="Describe this vision..."
              value={newVisionItem.description}
              onChange={(e) => setNewVisionItem({ ...newVisionItem, description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                data-testid="select-vision-category"
                value={newVisionItem.category}
                onChange={(e) => setNewVisionItem({ ...newVisionItem, category: e.target.value })}
                className="border rounded-md p-2"
              >
                <option value="relationship">Relationship</option>
                <option value="home">Home</option>
                <option value="travel">Travel</option>
                <option value="family">Family</option>
                <option value="career">Career</option>
                <option value="health">Health</option>
                <option value="spiritual">Spiritual</option>
                <option value="other">Other</option>
              </select>

              <select
                data-testid="select-vision-horizon"
                value={newVisionItem.time_horizon}
                onChange={(e) => setNewVisionItem({ ...newVisionItem, time_horizon: e.target.value })}
                className="border rounded-md p-2"
              >
                {Object.entries(TIME_HORIZONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <Button
              data-testid="button-add-vision"
              onClick={() => createVisionItemMutation.mutate(newVisionItem)}
              disabled={createVisionItemMutation.isPending || !newVisionItem.title}
              className="w-full"
            >
              {createVisionItemMutation.isPending ? 'Adding...' : 'Add to Vision Board'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visionBoard.map(item => (
              <Card key={item.id} data-testid={`vision-${item.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" data-testid={`text-title-${item.id}`}>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground" data-testid={`text-description-${item.id}`}>{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs" data-testid={`badge-horizon-${item.id}`}>{TIME_HORIZONS[item.time_horizon as keyof typeof TIME_HORIZONS]}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
