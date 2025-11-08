import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Mic, Square, Send, Play, Pause, Loader2, Volume2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { VoiceMemo, Profile } from '@shared/schema';

type VoiceMemoWithProfile = VoiceMemo & {
  sender?: Profile;
  recipient?: Profile;
};

export default function VoiceMemosPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch voice memos
  const { data: memos, isLoading } = useQuery<VoiceMemoWithProfile[]>({
    queryKey: ['/api/voice-memos'],
    enabled: !!profile?.couple_id,
  });

  // Mark as listened mutation
  const markAsListenedMutation = useMutation({
    mutationFn: async (memoId: string) => {
      await apiRequest('PATCH', `/api/voice-memos/${memoId}/listened`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice-memos'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start recording
  const startRecording = async () => {
    try {
      setPermissionError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check for supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission denied. Please allow microphone access to record voice memos.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
      } else {
        setPermissionError('Unable to access microphone. Please check your browser settings.');
      }
      toast({
        title: 'Recording Error',
        description: error.message || 'Could not start recording',
        variant: 'destructive',
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Send voice memo
  const sendVoiceMemo = async () => {
    if (!audioBlob || !profile?.couple_id) return;

    try {
      setIsUploading(true);

      // Get partner ID
      const { data: coupleData } = await supabase
        .from('Couples_couples')
        .select('partner1_id, partner2_id')
        .eq('id', profile.couple_id)
        .single();

      if (!coupleData) {
        throw new Error('Couple not found');
      }

      const recipientId = coupleData.partner1_id === profile.id 
        ? coupleData.partner2_id 
        : coupleData.partner1_id;

      // Step 1: Create voice memo and get upload URL
      const createResponse = await apiRequest('POST', '/api/voice-memos', {
        recipient_id: recipientId,
      });

      const { memo_id, upload_url, storage_path } = await createResponse.json();

      // Step 2: Upload blob to Supabase Storage
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: audioBlob,
        headers: {
          'Content-Type': audioBlob.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }

      // Step 3: Complete the upload
      await apiRequest('POST', `/api/voice-memos/${memo_id}/complete`, {
        storage_path: storage_path,
        duration_secs: recordingTime,
      });

      toast({
        title: 'Voice memo sent!',
        description: 'Your voice memo has been sent to your partner.',
      });

      // Reset state
      cancelRecording();
      queryClient.invalidateQueries({ queryKey: ['/api/voice-memos'] });
    } catch (error: any) {
      console.error('Error sending voice memo:', error);
      toast({
        title: 'Error sending voice memo',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Separate memos
  const receivedMemos = memos?.filter(m => m.recipient_id === profile?.id) || [];
  const sentMemos = memos?.filter(m => m.sender_id === profile?.id) || [];
  const unlistenedCount = receivedMemos.filter(m => !m.is_listened).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Voice Memos</h1>
          <p className="text-muted-foreground">
            Share your thoughts and feelings with your partner through voice
          </p>
        </div>

        {/* Recording Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Record a Voice Memo
            </CardTitle>
            <CardDescription>
              Record a message for your partner. They'll be able to listen to it privately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {permissionError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {permissionError}
              </div>
            )}

            {!isRecording && !audioBlob && (
              <div className="text-center py-8">
                <Button 
                  size="lg" 
                  onClick={startRecording}
                  className="gap-2"
                  data-testid="button-start-recording"
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              </div>
            )}

            {isRecording && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4 py-8">
                  <div className="w-4 h-4 rounded-full bg-destructive animate-pulse" data-testid="indicator-recording" />
                  <span className="text-3xl font-mono" data-testid="text-recording-time">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="text-center">
                  <Button 
                    size="lg" 
                    variant="destructive" 
                    onClick={stopRecording}
                    className="gap-2"
                    data-testid="button-stop-recording"
                  >
                    <Square className="h-5 w-5" />
                    Stop Recording
                  </Button>
                </div>
              </div>
            )}

            {audioBlob && audioUrl && !isRecording && (
              <div className="space-y-6">
                <div className="p-6 bg-accent/30 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Preview your recording</span>
                    <Badge variant="secondary" data-testid="badge-duration">
                      {formatTime(recordingTime)}
                    </Badge>
                  </div>
                  <AudioPlayer url={audioUrl} />
                </div>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={cancelRecording}
                    disabled={isUploading}
                    data-testid="button-cancel-recording"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={sendVoiceMemo}
                    disabled={isUploading}
                    className="gap-2"
                    data-testid="button-send-memo"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send to Partner
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memos List */}
        <Card>
          <Tabs defaultValue="received">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received" data-testid="tab-received">
                  Received
                  {unlistenedCount > 0 && (
                    <Badge variant="destructive" className="ml-2" data-testid="badge-unlistened-count">
                      {unlistenedCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="received" className="space-y-4">
                {isLoading ? (
                  <LoadingSkeletons count={3} />
                ) : receivedMemos.length === 0 ? (
                  <EmptyState 
                    title="No voice memos yet"
                    description="When your partner sends you a voice memo, it will appear here."
                  />
                ) : (
                  receivedMemos.map((memo) => (
                    <VoiceMemoCard 
                      key={memo.id} 
                      memo={memo} 
                      onMarkAsListened={() => markAsListenedMutation.mutate(memo.id)}
                      isReceived
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                {isLoading ? (
                  <LoadingSkeletons count={3} />
                ) : sentMemos.length === 0 ? (
                  <EmptyState 
                    title="No sent memos"
                    description="Record and send a voice memo to your partner to get started."
                  />
                ) : (
                  sentMemos.map((memo) => (
                    <VoiceMemoCard key={memo.id} memo={memo} isReceived={false} />
                  ))
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

// Audio Player Component
function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <Button
        size="icon"
        variant="outline"
        onClick={togglePlay}
        data-testid="button-play-pause"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1">
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-sm text-muted-foreground font-mono min-w-[4rem] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <audio ref={audioRef} src={url} />
    </div>
  );
}

// Voice Memo Card Component
function VoiceMemoCard({ 
  memo, 
  onMarkAsListened, 
  isReceived 
}: { 
  memo: VoiceMemoWithProfile; 
  onMarkAsListened?: () => void;
  isReceived: boolean;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio URL when card is rendered (for received memos)
  useEffect(() => {
    if (isReceived && memo.storage_path) {
      loadAudioUrl();
    }
  }, [memo.storage_path, isReceived]);

  const loadAudioUrl = async () => {
    if (!memo.storage_path) return;

    try {
      setIsLoadingAudio(true);
      const { data } = await supabase.storage
        .from('voice-memos')
        .createSignedUrl(memo.storage_path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setAudioUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Mark as listened when audio starts playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReceived || hasPlayed || memo.is_listened) return;

    const handlePlay = () => {
      if (!hasPlayed && onMarkAsListened) {
        onMarkAsListened();
        setHasPlayed(true);
      }
    };

    audio.addEventListener('play', handlePlay);
    return () => audio.removeEventListener('play', handlePlay);
  }, [isReceived, hasPlayed, memo.is_listened, onMarkAsListened]);

  const duration = memo.duration_secs ? parseFloat(memo.duration_secs as string) : 0;
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${mins}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={!memo.is_listened && isReceived ? 'border-primary/40' : ''}
      data-testid={`card-memo-${memo.id}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="font-medium" data-testid="text-memo-sender">
                  {isReceived ? (memo.sender?.full_name || 'Your Partner') : 'You'}
                </span>
                {!memo.is_listened && isReceived && (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-new">New</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span data-testid="text-memo-date">
                  {memo.created_at && formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}
                </span>
                <span data-testid="text-memo-duration">{formatDuration(duration)}</span>
              </div>
            </div>
            {!isReceived && memo.is_listened && (
              <Badge variant="secondary" className="gap-1" data-testid="badge-listened">
                <Check className="h-3 w-3" />
                Listened
              </Badge>
            )}
          </div>

          {isReceived && (
            <div>
              {isLoadingAudio ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : audioUrl ? (
                <AudioPlayer url={audioUrl} />
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Unable to load audio
                </div>
              )}
              <audio ref={audioRef} src={audioUrl || undefined} style={{ display: 'none' }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeletons
function LoadingSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// Empty State
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12" data-testid="empty-state">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Mic className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
