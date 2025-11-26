import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Message, Profile } from "@shared/schema";

type MessageWithSender = Message & {
  sender: Pick<Profile, "id" | "full_name" | "role">;
};

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const coupleId = profile?.couple_id;

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages", coupleId],
    queryFn: async () => {
      if (!coupleId) return [];
      const response = await fetch(`/api/messages/${coupleId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!coupleId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", "/api/messages", {
        couple_id: coupleId,
        message_text: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", coupleId] });
      setMessageText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`messages:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Couples_messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: sender } = await supabase
            .from("Couples_profiles")
            .select("id, full_name, role")
            .eq("id", newMessage.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender: sender || {
              id: newMessage.sender_id,
              full_name: "Unknown",
              role: "client",
            },
          };

          queryClient.setQueryData<MessageWithSender[]>(
            ["/api/messages", coupleId],
            (old = []) => [...old, messageWithSender],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  if (!coupleId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              You need to complete couple setup before accessing messages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-1">
          Communicate with your therapist
        </p>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation with Therapist
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start a conversation with your therapist
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    const isTherapist = message.sender.role === "therapist";

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
                        data-testid={`message-${message.id}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback
                            className={
                              isTherapist
                                ? "bg-accent text-accent-foreground"
                                : "bg-primary text-primary-foreground"
                            }
                          >
                            {message.sender.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {isCurrentUser ? "You" : message.sender.full_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.created_at
                                ? formatDistanceToNow(
                                    new Date(message.created_at),
                                    { addSuffix: true },
                                  )
                                : "Just now"}
                            </span>
                          </div>

                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.message_text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none min-h-[60px] max-h-[200px]"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={
                    !messageText.trim() || sendMessageMutation.isPending
                  }
                  size="icon"
                  className="flex-shrink-0"
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
