import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function TherapistProfile() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <Link href="/admin/couple" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your therapist profile information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>View and update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  data-testid="input-full-name"
                />
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit-profile"
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value="Licensed Therapist"
                disabled
                data-testid="input-role"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.id || ""}
                disabled
                data-testid="input-email"
              />
            </div>

            {isEditing && (
              <Button className="w-full" data-testid="button-save-profile">
                Save Changes
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Statistics</CardTitle>
            <CardDescription>Your activity summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Account Type</span>
              <span className="font-medium">Therapist</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-medium">2024</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
