import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Upload, Youtube, Video as VideoIcon, Loader2, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { parseYouTubeId, formatSeconds, buildYouTubeEmbedUrl, parseTimeToSeconds, parseInstagramShortcode, buildInstagramEmbedUrl } from '@/lib/youtubeUtils';

export interface ExerciseVideoData {
  video_type: 'youtube' | 'upload' | 'instagram' | null;
  video_url: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
}

interface Props {
  value: ExerciseVideoData;
  onChange: (value: ExerciseVideoData) => void;
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

interface TimeInputProps {
  id?: string;
  seconds: number;
  onCommit: (seconds: number) => void;
}

function TimeInput({ id, seconds, onCommit }: TimeInputProps) {
  const [text, setText] = useState(formatSeconds(seconds));
  const [invalid, setInvalid] = useState(false);

  // Sync external changes (e.g. when video data is reset/loaded)
  useEffect(() => {
    setText(formatSeconds(seconds));
    setInvalid(false);
  }, [seconds]);

  const commit = () => {
    const parsed = parseTimeToSeconds(text);
    if (parsed == null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(formatSeconds(parsed));
    onCommit(parsed);
  };

  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder="0:00"
      value={text}
      aria-invalid={invalid}
      className={invalid ? 'border-destructive' : ''}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function ExerciseVideoEditor({ value, onChange }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'youtube' | 'upload' | 'instagram'>(
    value.video_type === 'upload'
      ? 'upload'
      : value.video_type === 'instagram'
      ? 'instagram'
      : 'youtube',
  );

  // YouTube state
  const [ytInput, setYtInput] = useState(
    value.video_type === 'youtube' ? value.video_url ?? '' : '',
  );
  const [ytDuration, setYtDuration] = useState<number | null>(null);

  // Instagram state
  const [igInput, setIgInput] = useState(
    value.video_type === 'instagram' ? value.video_url ?? '' : '',
  );
  const igShortcode = useMemo(() => parseInstagramShortcode(igInput), [igInput]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ytId = useMemo(() => parseYouTubeId(ytInput), [ytInput]);

  // Try to detect YouTube duration via oEmbed (not always available — fallback to manual range)
  // We use a permissive default (10 min) when unknown so the user can still pick start/end.
  useEffect(() => {
    if (tab !== 'youtube' || !ytId) return;
    setYtDuration(null);
    // We can't easily get duration without API key. Default to 600s window;
    // the IFrame API would be needed for exact duration.
    setYtDuration(600);
  }, [ytId, tab]);

  // When user picks a YouTube id, propagate
  useEffect(() => {
    if (tab !== 'youtube') return;
    if (ytId) {
      const url = `https://www.youtube.com/watch?v=${ytId}`;
      // Only update if changed
      if (
        value.video_type !== 'youtube' ||
        value.video_url !== url
      ) {
        onChange({
          video_type: 'youtube',
          video_url: url,
          video_start_seconds: 0,
          video_end_seconds: ytDuration ?? 60,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId, tab]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      toast.error('Faça login para enviar vídeos');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Vídeo muito grande (máx 50 MB)');
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('exercise-videos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('exercise-videos').getPublicUrl(path);
      onChange({
        video_type: 'upload',
        video_url: data.publicUrl,
        video_start_seconds: 0,
        video_end_seconds: null, // will be set after metadata loads
      });
      toast.success('Vídeo enviado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar vídeo');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoMetadata = () => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    setUploadDuration(v.duration);
    if (value.video_type === 'upload' && value.video_end_seconds == null) {
      onChange({
        ...value,
        video_start_seconds: 0,
        video_end_seconds: v.duration,
      });
    }
  };

  const handleClear = () => {
    onChange({
      video_type: null,
      video_url: null,
      video_start_seconds: null,
      video_end_seconds: null,
    });
    setYtInput('');
    setYtDuration(null);
    setUploadDuration(null);
  };

  const start = value.video_start_seconds ?? 0;
  const end = value.video_end_seconds ?? 0;
  const duration =
    value.video_type === 'youtube'
      ? ytDuration ?? 600
      : uploadDuration ?? end ?? 0;

  const handleRangeChange = (vals: number[]) => {
    const [s, e] = vals;
    onChange({
      ...value,
      video_start_seconds: s,
      video_end_seconds: e,
    });
  };

  // Preview seek for upload — when start changes, jump preview
  useEffect(() => {
    if (value.video_type === 'upload' && videoRef.current) {
      const v = videoRef.current;
      if (Math.abs(v.currentTime - start) > 0.5) {
        try {
          v.currentTime = start;
        } catch {
          // ignore
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, value.video_type]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <VideoIcon className="h-4 w-4" />
          Vídeo do exercício
          <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </Label>
        {value.video_type && (
          <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remover
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'youtube' | 'upload' | 'instagram')}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="youtube">
            <Youtube className="h-4 w-4 mr-1" />
            YouTube
          </TabsTrigger>
          <TabsTrigger value="instagram">
            <Instagram className="h-4 w-4 mr-1" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="space-y-3 mt-3">
          <Input
            placeholder="Cole o link do YouTube"
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
          />
          {ytInput && !ytId && (
            <p className="text-xs text-destructive">Link do YouTube inválido</p>
          )}
          {ytId && value.video_type === 'youtube' && (
            <div className="space-y-3">
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                <iframe
                  key={`${ytId}-${start}-${end}`}
                  src={buildYouTubeEmbedUrl(ytId, start, end)}
                  title="Preview"
                  className="w-full h-full"
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Dica: defina o início e o fim no formato <strong>M:SS</strong> (ex: 1:30).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="yt-start" className="text-xs">Início (M:SS)</Label>
                  <TimeInput
                    id="yt-start"
                    seconds={start}
                    onCommit={(s) =>
                      onChange({ ...value, video_start_seconds: Math.max(0, s) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="yt-end" className="text-xs">Fim (M:SS)</Label>
                  <TimeInput
                    id="yt-end"
                    seconds={end}
                    onCommit={(s) =>
                      onChange({ ...value, video_end_seconds: Math.max(0, s) })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Trecho: {formatSeconds(start)} → {formatSeconds(end)}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instagram" className="space-y-3 mt-3">
          <Input
            placeholder="Cole o link do post/reel do Instagram"
            value={igInput}
            onChange={(e) => setIgInput(e.target.value)}
          />
          {igInput && !igShortcode && (
            <p className="text-xs text-destructive">Link do Instagram inválido</p>
          )}
          {igShortcode && value.video_type === 'instagram' && (
            <div className="space-y-2">
              <div className="w-full rounded-lg overflow-hidden bg-black mx-auto" style={{ aspectRatio: '9 / 16', maxWidth: 320 }}>
                <iframe
                  key={igShortcode}
                  src={buildInstagramEmbedUrl(igShortcode)}
                  title="Preview Instagram"
                  className="w-full h-full"
                  frameBorder={0}
                  scrolling="no"
                  allow="encrypted-media"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O Instagram não permite recorte de tempo nem autoplay. O vídeo será exibido com os controles do próprio Instagram.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-3 mt-3">
          {value.video_type !== 'upload' && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 text-center space-y-3">
              <VideoIcon className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Envie um vídeo do exercício (MP4, máx 50 MB)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Selecionar arquivo
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {value.video_type === 'upload' && value.video_url && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                src={value.video_url}
                className="w-full rounded-lg bg-black aspect-video"
                controls
                onLoadedMetadata={handleVideoMetadata}
              />
              {uploadDuration && uploadDuration > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    Trecho: {formatSeconds(start)} → {formatSeconds(end)} (de{' '}
                    {formatSeconds(uploadDuration)})
                  </Label>
                  <Slider
                    min={0}
                    max={uploadDuration}
                    step={0.1}
                    value={[start, end]}
                    onValueChange={handleRangeChange}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
