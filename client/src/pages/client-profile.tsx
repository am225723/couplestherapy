import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Upload, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Cropper from "react-easy-crop";

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((name) => name.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/jpeg");
    };

    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
}

export default function ClientProfile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase
          .from("Couples_profiles")
          .select("avatar_url")
          .eq("id", profile.id)
          .single();

        if (error) {
          console.error("Error fetching avatar URL:", error);
          return;
        }

        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error("Failed to load avatar URL:", error);
      }
    };

    loadAvatarUrl();
  }, [profile?.id]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileValidationError("Please select a valid image file (JPG, PNG, GIF, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileValidationError("Image size must be less than 5MB");
      return;
    }

    setFileValidationError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
      setShowCropDialog(true);
    };
    reader.onerror = () => {
      setFileValidationError("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels || !profile) {
      setFileValidationError("Failed to process image. Please try again.");
      return;
    }

    try {
      setIsUploading(true);

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          try {
            await supabase.storage.from("client-avatars").remove([oldPath]);
          } catch (error) {
            console.error("Error deleting old avatar:", error);
          }
        }
      }

      const fileExt = "jpg";
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("client-avatars")
        .upload(fileName, croppedBlob, { contentType: "image/jpeg" });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error(
            "Storage bucket not found. Please create the 'client-avatars' bucket in your Supabase Storage.",
          );
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("client-avatars").getPublicUrl(fileName);

      const newAvatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("Couples_profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setShowCropDialog(false);
      setImageSrc(null);

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload photo";
      console.error("Error uploading photo:", error);

      setFileValidationError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your profile information</p>
        </div>

        {fileValidationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileValidationError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>View and update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24 border-2 border-primary/20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.full_name || "Profile"} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {getInitials(profile.full_name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="hidden"
                      data-testid="input-photo"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || showCropDialog}
                      className="gap-2"
                      data-testid="button-upload-photo"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? "Uploading..." : "Change Photo"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Max 5MB</p>
                </div>

                <div className="flex-1 space-y-4">
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      data-testid="input-email"
                    />
                  </div>

                  {isEditing && (
                    <Button className="w-full" data-testid="button-save-profile">
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Account Type</span>
              <span className="font-medium">Client</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Couple Status</span>
              <span className="font-medium">{profile.couple_id ? "Connected" : "Not Connected"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
            <DialogDescription>Adjust and crop your profile photo before uploading</DialogDescription>
          </DialogHeader>

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative w-full h-64 bg-background rounded-md overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropAreaChange={handleCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoom-slider" className="text-sm">
                  Zoom: {Math.round(zoom * 100)}%
                </Label>
                <Slider
                  id="zoom-slider"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  className="w-full"
                  data-testid="slider-zoom"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCropDialog(false);
                setImageSrc(null);
                setFileValidationError(null);
              }}
              disabled={isUploading}
              data-testid="button-cancel-crop"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCrop}
              disabled={isUploading || !imageSrc}
              data-testid="button-save-crop"
            >
              {isUploading ? "Uploading..." : "Save & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
