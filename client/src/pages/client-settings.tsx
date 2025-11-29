import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function ClientSettings() {
  const { profile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [dailyTips, setDailyTips] = useState(true);
  const [partnerActivity, setPartnerActivity] = useState(true);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your preferences and account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Control how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="notifications" className="text-base font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications for important updates</p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="emailReminders" className="text-base font-medium">Email Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive email reminders for check-ins and activities</p>
              </div>
              <Switch
                id="emailReminders"
                checked={emailReminders}
                onCheckedChange={setEmailReminders}
                data-testid="switch-email-reminders"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="dailyTips" className="text-base font-medium">Daily Tips</Label>
                <p className="text-sm text-muted-foreground">Receive daily relationship tips and suggestions</p>
              </div>
              <Switch
                id="dailyTips"
                checked={dailyTips}
                onCheckedChange={setDailyTips}
                data-testid="switch-daily-tips"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="partnerActivity" className="text-base font-medium">Partner Activity</Label>
                <p className="text-sm text-muted-foreground">Get notified when your partner completes activities</p>
              </div>
              <Switch
                id="partnerActivity"
                checked={partnerActivity}
                onCheckedChange={setPartnerActivity}
                data-testid="switch-partner-activity"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Manage your privacy preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" data-testid="button-privacy-settings">
              Privacy Settings
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-data-export">
              Export My Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" data-testid="button-change-password">
              Change Password
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-sessions">
              Active Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
