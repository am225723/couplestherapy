import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function PrototypeNotice() {
  return (
    <Alert className="mb-6" data-testid="alert-prototype">
      <Info className="h-4 w-4" />
      <AlertTitle>Prototype Feature</AlertTitle>
      <AlertDescription>
        This is a working prototype. Your data will be reset when you refresh
        the page. Full database integration and therapist collaboration features
        are coming soon.
      </AlertDescription>
    </Alert>
  );
}
