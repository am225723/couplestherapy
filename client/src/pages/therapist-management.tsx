import { useState, useEffect } from "react";
import { useNavigate } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Users,
  UserPlus,
  Link,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Couple {
  couple_id: string;
  partner1_name: string;
  partner2_name: string;
  join_code: string;
}

interface Therapist {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function TherapistManagement() {
  const [activeTab, setActiveTab] = useState("couples");
  const [myCouples, setMyCouples] = useState<Couple[]>([]);
  const [unassignedCouples, setUnassignedCouples] = useState<Couple[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCouple, setShowCreateCouple] = useState(false);
  const [showCreateTherapist, setShowCreateTherapist] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [coupleForm, setCoupleForm] = useState({
    partner1_email: "",
    partner1_password: "",
    partner1_name: "",
    partner2_email: "",
    partner2_password: "",
    partner2_name: "",
  });

  const [therapistForm, setTherapistForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    if (profile?.role === "therapist") {
      fetchMyCouples();
      fetchUnassignedCouples();
    }
    if (profile?.role === "therapist" || profile?.role === "admin") {
      fetchTherapists();
    }
  }, [profile]);

  const fetchMyCouples = async () => {
    try {
      const response = await fetch("/api/therapist/my-couples");
      if (!response.ok) throw new Error("Failed to fetch couples");
      const data = await response.json();
      setMyCouples(data.couples || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedCouples = async () => {
    try {
      const response = await fetch("/api/therapist/unassigned-couples");
      if (!response.ok) throw new Error("Failed to fetch unassigned couples");
      const data = await response.json();
      setUnassignedCouples(data.couples || []);
    } catch (error: any) {
      console.error("Error fetching unassigned couples:", error);
    }
  };

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from("Couples_profiles")
        .select("*")
        .eq("role", "therapist");

      if (error) throw error;
      setTherapists(data || []);
    } catch (error: any) {
      console.error("Error fetching therapists:", error);
    }
  };

  const handleCreateCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiRequest(
        "POST",
        "/api/therapist/create-couple",
        coupleForm,
      );
      toast({
        title: "Success",
        description: "Couple created successfully",
      });
      setCoupleForm({
        partner1_email: "",
        partner1_password: "",
        partner1_name: "",
        partner2_email: "",
        partner2_password: "",
        partner2_name: "",
      });
      setShowCreateCouple(false);
      fetchMyCouples();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiRequest(
        "POST",
        "/api/therapist/create-therapist",
        therapistForm,
      );
      toast({
        title: "Success",
        description: "Therapist created successfully",
      });
      setTherapistForm({
        email: "",
        password: "",
        full_name: "",
      });
      setShowCreateTherapist(false);
      fetchTherapists();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLinkCouple = async (coupleId: string) => {
    try {
      const response = await apiRequest("POST", "/api/therapist/link-couple", {
        couple_id: coupleId,
      });
      toast({
        title: "Success",
        description: "Couple linked to your account",
      });
      fetchMyCouples();
      fetchUnassignedCouples();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegenerateJoinCode = async (coupleId: string) => {
    try {
      const response = await apiRequest(
        "POST",
        "/api/therapist/regenerate-join-code",
        { couple_id: coupleId },
      );
      toast({
        title: "Success",
        description: "Join code regenerated",
      });
      fetchMyCouples();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!profile || (profile.role !== "therapist" && profile.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only therapists and administrators can access this
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Therapist Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage couples, create new users, and oversee your therapy
              practice
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showCreateCouple} onOpenChange={setShowCreateCouple}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Couple
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Couple</DialogTitle>
                  <DialogDescription>
                    Create accounts for both partners in a new couple
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCouple} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Partner 1</h3>
                      <div>
                        <Label htmlFor="partner1_name">Full Name</Label>
                        <Input
                          id="partner1_name"
                          value={coupleForm.partner1_name}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner1_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="partner1_email">Email</Label>
                        <Input
                          id="partner1_email"
                          type="email"
                          value={coupleForm.partner1_email}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner1_email: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="partner1_password">Password</Label>
                        <Input
                          id="partner1_password"
                          type="password"
                          value={coupleForm.partner1_password}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner1_password: e.target.value,
                            }))
                          }
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Partner 2</h3>
                      <div>
                        <Label htmlFor="partner2_name">Full Name</Label>
                        <Input
                          id="partner2_name"
                          value={coupleForm.partner2_name}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner2_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="partner2_email">Email</Label>
                        <Input
                          id="partner2_email"
                          type="email"
                          value={coupleForm.partner2_email}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner2_email: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="partner2_password">Password</Label>
                        <Input
                          id="partner2_password"
                          type="password"
                          value={coupleForm.partner2_password}
                          onChange={(e) =>
                            setCoupleForm((prev) => ({
                              ...prev,
                              partner2_password: e.target.value,
                            }))
                          }
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateCouple(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Couple</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {profile.role === "admin" && (
              <Dialog
                open={showCreateTherapist}
                onOpenChange={setShowCreateTherapist}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Therapist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Therapist</DialogTitle>
                    <DialogDescription>
                      Create a new therapist account
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTherapist} className="space-y-4">
                    <div>
                      <Label htmlFor="therapist_name">Full Name</Label>
                      <Input
                        id="therapist_name"
                        value={therapistForm.full_name}
                        onChange={(e) =>
                          setTherapistForm((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="therapist_email">Email</Label>
                      <Input
                        id="therapist_email"
                        type="email"
                        value={therapistForm.email}
                        onChange={(e) =>
                          setTherapistForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="therapist_password">Password</Label>
                      <Input
                        id="therapist_password"
                        type="password"
                        value={therapistForm.password}
                        onChange={(e) =>
                          setTherapistForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateTherapist(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Create Therapist</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="couples">My Couples</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned Couples</TabsTrigger>
            {profile.role === "admin" && (
              <TabsTrigger value="therapists">Therapists</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="couples" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                  Loading your couples...
                </p>
              </div>
            ) : myCouples.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    No couples assigned yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create new couples or link existing unassigned couples to
                    your account.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowCreateCouple(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Couple
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("unassigned")}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Browse Unassigned
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCouples.map((couple) => (
                  <Card key={couple.couple_id} className="hover-elevate">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {couple.partner1_name} & {couple.partner2_name}
                        </CardTitle>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Join Code
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {couple.join_code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRegenerateJoinCode(couple.couple_id)
                            }
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/couple/${couple.couple_id}`)
                          }
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unassigned" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                These couples have been created but are not yet assigned to a
                therapist. Click "Link to Me" to assign them to your account.
              </AlertDescription>
            </Alert>

            {unassignedCouples.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    All couples assigned
                  </h3>
                  <p className="text-muted-foreground">
                    There are no unassigned couples at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unassignedCouples.map((couple) => (
                  <Card key={couple.couple_id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {couple.partner1_name} & {couple.partner2_name}
                      </CardTitle>
                      <CardDescription>Unassigned</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Join Code
                        </Label>
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono block mt-1">
                          {couple.join_code}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkCouple(couple.couple_id)}
                        className="w-full"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Link to Me
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {profile.role === "admin" && (
            <TabsContent value="therapists" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {therapists.map((therapist) => (
                  <Card key={therapist.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {therapist.full_name}
                      </CardTitle>
                      <CardDescription>{therapist.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary">Therapist</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
