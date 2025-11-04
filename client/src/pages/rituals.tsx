import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Coffee, Home, Utensils, Moon, Plus, Loader2 } from 'lucide-react';
import { Ritual, RITUAL_CATEGORIES, RitualCategory } from '@shared/schema';

const categoryIcons = {
  'Mornings': Coffee,
  'Reuniting': Home,
  'Mealtimes': Utensils,
  'Going to Sleep': Moon,
};

export default function RitualsPage() {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [newRitual, setNewRitual] = useState('');
  const [activeCategory, setActiveCategory] = useState<RitualCategory>('Mornings');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.couple_id) {
      fetchRituals();
    }
  }, [profile?.couple_id]);

  const fetchRituals = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data, error } = await supabase
        .from('Couples_rituals')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('category');

      if (error) throw error;
      setRituals(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id || !newRitual.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('Couples_rituals').insert({
        couple_id: profile.couple_id,
        category: activeCategory,
        description: newRitual.trim(),
        created_by: user.id,
      });

      if (error) throw error;

      setNewRitual('');
      toast({
        title: 'Ritual added!',
        description: `Added to ${activeCategory}`,
      });

      fetchRituals();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryRituals = rituals.filter(r => r.category === activeCategory);
  const Icon = categoryIcons[activeCategory];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Rituals of Connection</h1>
          <p className="text-muted-foreground">
            Build meaningful daily rituals to strengthen your bond
          </p>
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as RitualCategory)}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            {RITUAL_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  data-testid={`tab-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{category}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {RITUAL_CATEGORIES.map((category) => (
            <TabsContent key={category} value={category} className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    Add New Ritual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRitual} className="space-y-4">
                    <Textarea
                      placeholder={`Describe a ritual for ${category.toLowerCase()}...`}
                      value={newRitual}
                      onChange={(e) => setNewRitual(e.target.value)}
                      className="min-h-24 resize-none"
                      data-testid="textarea-new-ritual"
                    />
                    <Button type="submit" disabled={!newRitual.trim() || submitting} data-testid="button-add-ritual">
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Ritual
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {categoryRituals.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No rituals yet for {category.toLowerCase()}. Create your first one!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  categoryRituals.map((ritual) => (
                    <Card key={ritual.id} data-testid={`card-ritual-${ritual.id}`} className="hover-elevate">
                      <CardContent className="pt-6">
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          {ritual.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
