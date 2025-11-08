import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const PARENTING_STYLES = {
  authoritative: { name: 'Authoritative', description: 'High warmth, high boundaries' },
  authoritarian: { name: 'Authoritarian', description: 'High boundaries, low warmth' },
  permissive: { name: 'Permissive', description: 'High warmth, low boundaries' },
  uninvolved: { name: 'Uninvolved', description: 'Low warmth, low boundaries' },
  mixed: { name: 'Mixed', description: 'Combination of styles' },
};

interface ParentingStyle {
  id: string;
  couple_id: string;
  user_id: string;
  style_type: string;
  discipline_approach: string | null;
  values_text: string | null;
  stress_areas: string | null;
  created_at: string;
  updated_at: string;
}

interface DisciplineAgreement {
  id: string;
  couple_id: string;
  scenario: string;
  agreed_approach: string;
  is_active: boolean;
  created_at: string;
}

interface CoupleTimeBlock {
  id: string;
  couple_id: string;
  scheduled_date: string;
  duration_minutes: number;
  activity: string | null;
  completed: boolean;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface StressCheckin {
  id: string;
  couple_id: string;
  user_id: string;
  stress_level: number;
  stressor_text: string | null;
  support_needed: string | null;
  created_at: string;
}

export default function ParentingPartnersPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newStyle, setNewStyle] = useState({ style_type: 'authoritative', discipline_approach: '', values_text: '', stress_areas: '' });
  const [newAgreement, setNewAgreement] = useState({ scenario: '', agreed_approach: '' });
  const [newCoupleTime, setNewCoupleTime] = useState({ scheduled_date: '', duration_minutes: 60, activity: '' });
  const [newStressCheckin, setNewStressCheckin] = useState({ stress_level: 5, stressor_text: '', support_needed: '' });

  // Fetch styles
  const { data: styles = [] } = useQuery<ParentingStyle[]>({
    queryKey: ['/api/parenting/styles', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch agreements
  const { data: agreements = [] } = useQuery<DisciplineAgreement[]>({
    queryKey: ['/api/parenting/agreements', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch couple time
  const { data: coupleTime = [] } = useQuery<CoupleTimeBlock[]>({
    queryKey: ['/api/parenting/couple-time', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Fetch stress check-ins
  const { data: stressCheckins = [] } = useQuery<StressCheckin[]>({
    queryKey: ['/api/parenting/stress-checkins', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Save style mutation
  const saveStyleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/parenting/style', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parenting/styles', profile?.couple_id] });
      toast({ title: 'Style Saved', description: 'Your parenting style has been updated.' });
    },
  });

  // Create agreement mutation
  const createAgreementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/parenting/agreement', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parenting/agreements', profile?.couple_id] });
      toast({ title: 'Agreement Created', description: 'Your discipline agreement has been added.' });
      setNewAgreement({ scenario: '', agreed_approach: '' });
    },
  });

  // Schedule couple time mutation
  const scheduleCoupleTimeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/parenting/couple-time', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parenting/couple-time', profile?.couple_id] });
      toast({ title: 'Couple Time Scheduled', description: 'Remember to protect your connection!' });
      setNewCoupleTime({ scheduled_date: '', duration_minutes: 60, activity: '' });
    },
  });

  // Submit stress check-in mutation
  const submitStressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/parenting/stress-checkin', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parenting/stress-checkins', profile?.couple_id] });
      toast({ title: 'Check-in Submitted', description: 'Your partner can see how you\'re doing.' });
      setNewStressCheckin({ stress_level: 5, stressor_text: '', support_needed: '' });
    },
  });

  const myStyle = styles.find(s => s.user_id === profile?.id);
  const partnerStyle = styles.find(s => s.user_id !== profile?.id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parenting as Partners</h1>
        <p className="text-muted-foreground mt-2">
          Align on parenting approach and protect couple time despite the demands of parenthood.
        </p>
      </div>

      {/* Parenting Styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Parenting Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              data-testid="select-parenting-style"
              value={newStyle.style_type}
              onChange={(e) => setNewStyle({ ...newStyle, style_type: e.target.value })}
              className="w-full border rounded-md p-2"
            >
              {Object.entries(PARENTING_STYLES).map(([key, style]) => (
                <option key={key} value={key}>{style.name} - {style.description}</option>
              ))}
            </select>

            <Textarea
              data-testid="input-discipline-approach"
              placeholder="Your discipline approach..."
              value={newStyle.discipline_approach}
              onChange={(e) => setNewStyle({ ...newStyle, discipline_approach: e.target.value })}
            />

            <Textarea
              data-testid="input-parenting-values"
              placeholder="Your parenting values..."
              value={newStyle.values_text}
              onChange={(e) => setNewStyle({ ...newStyle, values_text: e.target.value })}
            />

            <Button
              data-testid="button-save-style"
              onClick={() => saveStyleMutation.mutate(newStyle)}
              disabled={saveStyleMutation.isPending}
              className="w-full"
            >
              {saveStyleMutation.isPending ? 'Saving...' : 'Save My Style'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Style Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myStyle && (
              <div>
                <p className="text-sm font-semibold">You</p>
                <Badge>{PARENTING_STYLES[myStyle.style_type as keyof typeof PARENTING_STYLES].name}</Badge>
                {myStyle.discipline_approach && (
                  <p className="text-sm mt-1">{myStyle.discipline_approach}</p>
                )}
              </div>
            )}
            {partnerStyle && (
              <div>
                <p className="text-sm font-semibold">Partner</p>
                <Badge>{PARENTING_STYLES[partnerStyle.style_type as keyof typeof PARENTING_STYLES].name}</Badge>
                {partnerStyle.discipline_approach && (
                  <p className="text-sm mt-1">{partnerStyle.discipline_approach}</p>
                )}
              </div>
            )}
            {!myStyle && !partnerStyle && (
              <p className="text-sm text-muted-foreground">Complete your styles to compare.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discipline Agreements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Discipline Agreements
          </CardTitle>
          <CardDescription>Create united front agreements for common scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              data-testid="input-scenario"
              placeholder="Scenario (e.g., Child refuses bedtime)"
              value={newAgreement.scenario}
              onChange={(e) => setNewAgreement({ ...newAgreement, scenario: e.target.value })}
            />

            <Textarea
              data-testid="input-agreed-approach"
              placeholder="Our agreed approach..."
              value={newAgreement.agreed_approach}
              onChange={(e) => setNewAgreement({ ...newAgreement, agreed_approach: e.target.value })}
            />

            <Button
              data-testid="button-create-agreement"
              onClick={() => createAgreementMutation.mutate(newAgreement)}
              disabled={createAgreementMutation.isPending || !newAgreement.scenario}
              className="w-full"
            >
              {createAgreementMutation.isPending ? 'Creating...' : 'Create Agreement'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Active Agreements</h3>
            {agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agreements yet.</p>
            ) : (
              agreements.map(agreement => (
                <div key={agreement.id} className="border rounded-md p-3" data-testid={`agreement-${agreement.id}`}>
                  <p className="font-semibold text-sm">{agreement.scenario}</p>
                  <p className="text-sm text-muted-foreground mt-1">{agreement.agreed_approach}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Couple Time Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Couple Time Protection
          </CardTitle>
          <CardDescription>Schedule and protect time for just the two of you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              data-testid="input-scheduled-date"
              type="datetime-local"
              value={newCoupleTime.scheduled_date}
              onChange={(e) => setNewCoupleTime({ ...newCoupleTime, scheduled_date: e.target.value })}
            />

            <Input
              data-testid="input-duration"
              type="number"
              placeholder="Duration (minutes)"
              value={newCoupleTime.duration_minutes}
              onChange={(e) => setNewCoupleTime({ ...newCoupleTime, duration_minutes: parseInt(e.target.value) })}
            />

            <Input
              data-testid="input-activity"
              placeholder="Activity (optional)"
              value={newCoupleTime.activity}
              onChange={(e) => setNewCoupleTime({ ...newCoupleTime, activity: e.target.value })}
            />

            <Button
              data-testid="button-schedule-time"
              onClick={() => scheduleCoupleTimeMutation.mutate(newCoupleTime)}
              disabled={scheduleCoupleTimeMutation.isPending || !newCoupleTime.scheduled_date}
              className="w-full"
            >
              {scheduleCoupleTimeMutation.isPending ? 'Scheduling...' : 'Schedule Couple Time'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Upcoming Couple Time</h3>
            {coupleTime.filter(ct => !ct.completed).length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming couple time scheduled.</p>
            ) : (
              coupleTime.filter(ct => !ct.completed).map(block => (
                <div key={block.id} className="border rounded-md p-3" data-testid={`couple-time-${block.id}`}>
                  <p className="font-semibold text-sm">
                    {format(new Date(block.scheduled_date), 'MMM d, h:mm a')}
                  </p>
                  <p className="text-sm text-muted-foreground">{block.duration_minutes} minutes</p>
                  {block.activity && <p className="text-sm">{block.activity}</p>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stress Check-in */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Parenting Stress Check-in
          </CardTitle>
          <CardDescription>Share your stress level and what you need</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Stress Level (1-10)</label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <Button
                    key={level}
                    data-testid={`button-stress-${level}`}
                    size="sm"
                    variant={newStressCheckin.stress_level === level ? "default" : "outline"}
                    onClick={() => setNewStressCheckin({ ...newStressCheckin, stress_level: level })}
                    className="w-10"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            <Textarea
              data-testid="input-stressor"
              placeholder="What's stressing you?"
              value={newStressCheckin.stressor_text}
              onChange={(e) => setNewStressCheckin({ ...newStressCheckin, stressor_text: e.target.value })}
            />

            <Textarea
              data-testid="input-support-needed"
              placeholder="What support do you need?"
              value={newStressCheckin.support_needed}
              onChange={(e) => setNewStressCheckin({ ...newStressCheckin, support_needed: e.target.value })}
            />

            <Button
              data-testid="button-submit-stress"
              onClick={() => submitStressMutation.mutate(newStressCheckin)}
              disabled={submitStressMutation.isPending}
              className="w-full"
            >
              {submitStressMutation.isPending ? 'Submitting...' : 'Submit Check-in'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Recent Check-ins</h3>
            {stressCheckins.slice(0, 3).map(checkin => (
              <div key={checkin.id} className="border rounded-md p-3" data-testid={`stress-${checkin.id}`}>
                <div className="flex items-center justify-between">
                  <Badge variant={checkin.stress_level > 7 ? "destructive" : "default"}>
                    Stress: {checkin.stress_level}/10
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(checkin.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                {checkin.stressor_text && (
                  <p className="text-sm mt-2">{checkin.stressor_text}</p>
                )}
                {checkin.support_needed && (
                  <p className="text-sm text-muted-foreground mt-1">Needs: {checkin.support_needed}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
