import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, UserPlus, AlertCircle, CheckCircle2, Copy, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

// Form validation schemas
const createCoupleSchema = z.object({
  partner1_email: z.string().email('Invalid email address'),
  partner1_password: z.string().min(6, 'Password must be at least 6 characters'),
  partner1_name: z.string().min(1, 'Name is required'),
  partner2_email: z.string().email('Invalid email address'),
  partner2_password: z.string().min(6, 'Password must be at least 6 characters'),
  partner2_name: z.string().min(1, 'Name is required'),
});

const createTherapistSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Name is required'),
});

type CreateCoupleFormData = z.infer<typeof createCoupleSchema>;
type CreateTherapistFormData = z.infer<typeof createTherapistSchema>;

type CoupleData = {
  couple_id: string;
  partner1_name: string;
  partner2_name: string;
  join_code: string;
};

export default function UserManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [coupleSuccess, setCoupleSuccess] = useState<{ join_code: string; partner1_name: string; partner2_name: string } | null>(null);
  const [therapistSuccess, setTherapistSuccess] = useState<{ email: string; full_name: string } | null>(null);

  const coupleForm = useForm<CreateCoupleFormData>({
    resolver: zodResolver(createCoupleSchema),
    defaultValues: {
      partner1_email: '',
      partner1_password: '',
      partner1_name: '',
      partner2_email: '',
      partner2_password: '',
      partner2_name: '',
    },
  });

  const therapistForm = useForm<CreateTherapistFormData>({
    resolver: zodResolver(createTherapistSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
    },
  });

  const onCreateCouple = async (data: CreateCoupleFormData) => {
    try {
      // Backend will automatically use the authenticated user's ID as therapist_id
      const res = await apiRequest('POST', '/api/therapist/create-couple', data);

      const response = await res.json() as { success: boolean; couple: any };

      if (response.success && response.couple) {
        setCoupleSuccess({
          join_code: response.couple.join_code,
          partner1_name: response.couple.partner1_name,
          partner2_name: response.couple.partner2_name,
        });
        coupleForm.reset();
        toast({
          title: 'Couple Created Successfully',
          description: `${response.couple.partner1_name} and ${response.couple.partner2_name} have been set up.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error Creating Couple',
        description: error.message || 'Failed to create couple. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onCreateTherapist = async (data: CreateTherapistFormData) => {
    try {
      const res = await apiRequest('POST', '/api/therapist/create-therapist', data);

      const response = await res.json() as { success: boolean; therapist: any };

      if (response.success && response.therapist) {
        setTherapistSuccess({
          email: response.therapist.email,
          full_name: response.therapist.full_name,
        });
        therapistForm.reset();
        toast({
          title: 'Therapist Created Successfully',
          description: `${response.therapist.full_name} has been added as a therapist.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error Creating Therapist',
        description: error.message || 'Failed to create therapist. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Query for therapist's couples
  const { data: myCouples, isLoading: isLoadingMyCouples } = useQuery<{ couples: CoupleData[] }>({
    queryKey: ['/api/therapist/my-couples'],
    enabled: profile?.role === 'therapist',
  });

  // Query for unassigned couples
  const { data: unassignedCouples, isLoading: isLoadingUnassigned } = useQuery<{ couples: CoupleData[] }>({
    queryKey: ['/api/therapist/unassigned-couples'],
    enabled: profile?.role === 'therapist',
  });

  // Mutation to regenerate join code
  const regenerateJoinCodeMutation = useMutation({
    mutationFn: async (coupleId: string) => {
      const res = await apiRequest('POST', '/api/therapist/regenerate-join-code', { couple_id: coupleId });
      return res.json() as Promise<{ join_code: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/my-couples'] });
      toast({
        title: 'Join Code Regenerated',
        description: 'New join code has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate join code',
        variant: 'destructive',
      });
    },
  });

  // Mutation to link couple
  const linkCoupleMutation = useMutation({
    mutationFn: async (coupleId: string) => {
      const res = await apiRequest('POST', '/api/therapist/link-couple', { couple_id: coupleId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/my-couples'] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/unassigned-couples'] });
      toast({
        title: 'Couple Linked',
        description: 'Couple has been successfully linked to your account.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link couple',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Join code copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (profile?.role !== 'therapist') {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Only therapists can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Create new couples and therapist accounts for the TADI platform.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Couple Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Create New Couple</CardTitle>
            </div>
            <CardDescription>
              Set up both partners for a new couple with one action
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coupleSuccess ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Couple created successfully! Both partners can now sign in.
                  </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <div>
                    <span className="text-sm font-medium">Partners:</span>
                    <p className="text-sm text-muted-foreground">
                      {coupleSuccess.partner1_name} & {coupleSuccess.partner2_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Join Code:</span>
                    <p className="text-lg font-mono font-bold text-primary" data-testid="text-join-code">
                      {coupleSuccess.join_code}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setCoupleSuccess(null)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-create-another-couple"
                >
                  Create Another Couple
                </Button>
              </div>
            ) : (
              <Form {...coupleForm}>
                <form onSubmit={coupleForm.handleSubmit(onCreateCouple)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Partner 1</h3>
                    <FormField
                      control={coupleForm.control}
                      name="partner1_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              data-testid="input-partner1-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={coupleForm.control}
                      name="partner1_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              data-testid="input-partner1-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={coupleForm.control}
                      name="partner1_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Min. 6 characters"
                              data-testid="input-partner1-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Partner 2</h3>
                    <FormField
                      control={coupleForm.control}
                      name="partner2_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jane Smith"
                              data-testid="input-partner2-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={coupleForm.control}
                      name="partner2_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jane@example.com"
                              data-testid="input-partner2-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={coupleForm.control}
                      name="partner2_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Min. 6 characters"
                              data-testid="input-partner2-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={coupleForm.formState.isSubmitting}
                    data-testid="button-submit-couple"
                  >
                    {coupleForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Couple...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Create Couple
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Create Therapist Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle>Create New Therapist</CardTitle>
            </div>
            <CardDescription>
              Add a new therapist account to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {therapistSuccess ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Therapist account created successfully!
                  </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <div>
                    <span className="text-sm font-medium">Name:</span>
                    <p className="text-sm text-muted-foreground" data-testid="text-therapist-name">
                      {therapistSuccess.full_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm text-muted-foreground" data-testid="text-therapist-email">
                      {therapistSuccess.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setTherapistSuccess(null)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-create-another-therapist"
                >
                  Create Another Therapist
                </Button>
              </div>
            ) : (
              <Form {...therapistForm}>
                <form onSubmit={therapistForm.handleSubmit(onCreateTherapist)} className="space-y-6">
                  <FormField
                    control={therapistForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Dr. Sarah Johnson"
                            data-testid="input-therapist-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={therapistForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="sarah@example.com"
                            data-testid="input-therapist-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={therapistForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Min. 6 characters"
                            data-testid="input-therapist-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={therapistForm.formState.isSubmitting}
                    data-testid="button-submit-therapist"
                  >
                    {therapistForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Therapist...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Therapist
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Existing Couples Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Manage Existing Couples</CardTitle>
            </div>
            <CardDescription>
              View and manage join codes for your assigned couples
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMyCouples ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myCouples?.couples && myCouples.couples.length > 0 ? (
              <div className="space-y-4">
                {myCouples.couples.map((couple) => (
                  <Card key={couple.couple_id} className="p-4" data-testid={`card-couple-${couple.couple_id}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1" data-testid={`text-couple-names-${couple.couple_id}`}>
                          {couple.partner1_name} & {couple.partner2_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Join Code:</span>
                          <code className="text-sm font-mono font-bold text-primary" data-testid={`text-join-code-${couple.couple_id}`}>
                            {couple.join_code}
                          </code>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(couple.join_code)}
                          data-testid={`button-copy-${couple.couple_id}`}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateJoinCodeMutation.mutate(couple.couple_id)}
                          disabled={regenerateJoinCodeMutation.isPending}
                          data-testid={`button-regenerate-${couple.couple_id}`}
                        >
                          {regenerateJoinCodeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No couples assigned yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create new couples above or link existing couples below
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link Unassigned Couples Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              <CardTitle>Link Unassigned Couples</CardTitle>
            </div>
            <CardDescription>
              Assign yourself to couples that don't have a therapist yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUnassigned ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unassignedCouples?.couples && unassignedCouples.couples.length > 0 ? (
              <div className="space-y-4">
                {unassignedCouples.couples.map((couple) => (
                  <Card key={couple.couple_id} className="p-4" data-testid={`card-unassigned-${couple.couple_id}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1" data-testid={`text-unassigned-names-${couple.couple_id}`}>
                          {couple.partner1_name} & {couple.partner2_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Join Code:</span>
                          <code className="text-sm font-mono text-muted-foreground">
                            {couple.join_code}
                          </code>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => linkCoupleMutation.mutate(couple.couple_id)}
                        disabled={linkCoupleMutation.isPending}
                        data-testid={`button-link-${couple.couple_id}`}
                      >
                        {linkCoupleMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Linking...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link to Me
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No unassigned couples found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All couples are currently assigned to therapists
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
