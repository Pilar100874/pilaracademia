import { useEffect, useRef, useState } from 'react';

const KEY = 'pilar.voiceCommandsEnabled';

export function getVoiceCommandsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const v = localStorage.getItem(KEY);
  return v === 'true';
}

export function setVoiceCommandsEnabled(value: boolean) {
  localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new CustomEvent('voice-commands-changed', { detail: value }));
}

export function useVoiceCommandsEnabled() {
  const [enabled, setEnabledState] = useState<boolean>(() => getVoiceCommandsEnabled());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setEnabledState(ce.detail);
    };
    window.addEventListener('voice-commands-changed', handler);
    return () => window.removeEventListener('voice-commands-changed', handler);
  }, []);

  const setEnabled = (v: boolean) => {
    setVoiceCommandsEnabled(v);
    setEnabledState(v);
  };

  return [enabled, setEnabled] as const;
}

export interface VoiceHandlers {
  onNext?: () => void;
  onPrevious?: () => void;
  onFinish?: () => void;
}

/**
 * Listens to voice commands using the Web Speech API.
 * Keywords (pt-BR): "próximo", "avançar", "voltar", "anterior", "finalizar", "encerrar".
 */
export function useVoiceWorkoutCommands(active: boolean, handlers: VoiceHandlers) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!active) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = (last[0].transcript as string).toLowerCase().trim();
      setLastHeard(transcript);
      const h = handlersRef.current;
      if (/(próximo|proximo|avançar|avancar|next|seguinte)/.test(transcript)) {
        h.onNext?.();
      } else if (/(voltar|anterior|previous|antes)/.test(transcript)) {
        h.onPrevious?.();
      } else if (/(finalizar|encerrar|terminar|acabou|fim)/.test(transcript)) {
        h.onFinish?.();
      }
    };

    recognition.onend = () => {
      // restart automatically while active
      if (active) {
        try {
          recognition.start();
        } catch {}
      } else {
        setListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('Voice recognition error:', e?.error);
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setListening(false);
      }
    };

    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      console.warn('Failed to start recognition', e);
    }

    return () => {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {}
      setListening(false);
    };
  }, [active]);

  return { listening, supported, lastHeard };
}
