import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Loader2, CheckCircle2, ExternalLink, CreditCard, Package, ListTodo, User, MessageSquare } from "lucide-react";

interface ModulePrice {
  id: string;
  unit_amount: number;
  currency: string;
  interval: "month" | "year" | "one_time";
}

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  app_url: string | null;
  is_subscribed: boolean;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  cancel_at_period_end: boolean;
  stripe_product_id: string | null;
  prices: ModulePrice[];
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
  module_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  app_url: string | null;
}

function getModuleIcon(slug: string) {
  switch (slug) {
    case "chores":
      return <ListTodo className="h-8 w-8" />;
    case "ifs":
      return <User className="h-8 w-8" />;
    case "conflict-resolution":
      return <MessageSquare className="h-8 w-8" />;
    default:
      return <Package className="h-8 w-8" />;
  }
}

function formatPrice(amount: number, currency: string, interval: string) {
  const price = (amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  if (interval === "month") return `${price}/month`;
  if (interval === "year") return `${price}/year`;
  return price;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ModulesPage() {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [launchingModule, setLaunchingModule] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
  };

  // Fetch modules catalog
  const modulesQuery = useQuery<{ modules: Module[] }>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      const res = await fetch("/api/modules", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
    enabled: !!session,
  });

  // Fetch user subscriptions
  const subscriptionsQuery = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ["/api/modules/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/modules/subscriptions", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
    enabled: !!session,
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ moduleSlug, priceId }: { moduleSlug: string; priceId: string }) => {
      const res = await fetch(`/api/modules/${moduleSlug}/checkout`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Billing portal mutation
  const portalMutation = useMutation({
    mutationFn: async (moduleSlug: string) => {
      const res = await fetch(`/api/modules/${moduleSlug}/portal`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Portal creation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Launch module mutation
  const launchModule = async (moduleSlug: string, appUrl: string | null) => {
    if (!appUrl) {
      toast({
        title: "Coming Soon",
        description: "This module is still in development.",
      });
      return;
    }

    setLaunchingModule(moduleSlug);
    try {
      const res = await fetch(`/api/modules/${moduleSlug}/launch`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Launch failed");
      }
      const data = await res.json();
      
      // Open module with access token
      const moduleUrl = new URL(appUrl);
      moduleUrl.searchParams.set("token", data.token);
      window.open(moduleUrl.toString(), "_blank");
    } catch (error: any) {
      toast({
        title: "Launch Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLaunchingModule(null);
    }
  };

  const modules = modulesQuery.data?.modules || [];
  const subscriptions = subscriptionsQuery.data?.subscriptions || [];

  // Check URL params for success/cancel
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success");
  const canceled = urlParams.get("canceled");

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Add-on Modules</h1>
        <p className="text-muted-foreground">
          Extend your relationship journey with specialized tools and features.
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">
            Your subscription was successful! The module is now active.
          </p>
        </div>
      )}

      {canceled && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-300">
            Checkout was canceled. You can try again anytime.
          </p>
        </div>
      )}

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList data-testid="tabs-modules">
          <TabsTrigger value="catalog" data-testid="tab-catalog">Module Catalog</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">My Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          {modulesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : modules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No modules available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <Card key={module.id} className="flex flex-col" data-testid={`card-module-${module.slug}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        {getModuleIcon(module.slug)}
                      </div>
                      {module.is_subscribed && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4">{module.name}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {!module.is_subscribed && module.prices.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Pricing:</p>
                        {module.prices.map((price) => (
                          <div key={price.id} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{price.interval}ly</span>
                            <span className="font-semibold">
                              {formatPrice(price.unit_amount, price.currency, price.interval)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {module.is_subscribed && module.subscription_ends_at && (
                      <div className="text-sm text-muted-foreground">
                        {module.cancel_at_period_end ? (
                          <p>Access until {formatDate(module.subscription_ends_at)}</p>
                        ) : (
                          <p>Renews {formatDate(module.subscription_ends_at)}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {module.is_subscribed ? (
                      <>
                        <Button
                          className="w-full"
                          onClick={() => launchModule(module.slug, module.app_url)}
                          disabled={launchingModule === module.slug}
                          data-testid={`button-launch-${module.slug}`}
                        >
                          {launchingModule === module.slug ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Launch Module
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => portalMutation.mutate(module.slug)}
                          disabled={portalMutation.isPending}
                          data-testid={`button-manage-${module.slug}`}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => setSelectedModule(module)}
                        data-testid={`button-subscribe-${module.slug}`}
                      >
                        Subscribe
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          {subscriptionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">You don't have any active subscriptions.</p>
                <Button variant="outline" onClick={() => {
                  const tabs = document.querySelector('[data-testid="tabs-modules"]');
                  const catalogTab = tabs?.querySelector('[value="catalog"]') as HTMLButtonElement;
                  catalogTab?.click();
                }}>
                  Browse Modules
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id} data-testid={`card-subscription-${sub.slug}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                          {getModuleIcon(sub.slug)}
                        </div>
                        <div>
                          <CardTitle>{sub.name}</CardTitle>
                          <CardDescription>{sub.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Started:</span>{" "}
                        {formatDate(sub.current_period_start)}
                      </div>
                      <div>
                        <span className="font-medium">
                          {sub.cancel_at_period_end ? "Ends:" : "Renews:"}
                        </span>{" "}
                        {formatDate(sub.current_period_end)}
                      </div>
                      {sub.cancel_at_period_end && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Canceled
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => launchModule(sub.slug, sub.app_url)}
                      disabled={launchingModule === sub.slug}
                      data-testid={`button-launch-sub-${sub.slug}`}
                    >
                      {launchingModule === sub.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Launch
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => portalMutation.mutate(sub.slug)}
                      disabled={portalMutation.isPending}
                      data-testid={`button-manage-sub-${sub.slug}`}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscription Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedModule?.name}</DialogTitle>
            <DialogDescription>
              Choose a billing plan to get started with this module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedModule?.prices.map((price) => (
              <Card
                key={price.id}
                className="hover-elevate cursor-pointer"
                onClick={() => {
                  if (selectedModule) {
                    checkoutMutation.mutate({
                      moduleSlug: selectedModule.slug,
                      priceId: price.id,
                    });
                  }
                }}
                data-testid={`card-price-${price.interval}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize">{price.interval}ly Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {price.interval === "year" && "Save 17% with annual billing"}
                      {price.interval === "month" && "Flexible monthly billing"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatPrice(price.unit_amount, price.currency, price.interval)}
                    </p>
                    {checkoutMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2 inline" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
