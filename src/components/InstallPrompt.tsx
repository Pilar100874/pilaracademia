import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_PROMPT_DELAY = 2000; // 2 seconds

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // If already installed, don't show prompt
    if (standalone) return;

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after delay
      setTimeout(() => {
        setShowPrompt(true);
      }, INSTALL_PROMPT_DELAY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after delay
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, INSTALL_PROMPT_DELAY);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    // Don't persist dismissal - always show on next visit
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-elevated animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Instalar App</h2>
              <p className="text-xs text-muted-foreground">Acesso rápido na tela inicial</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Adicione o PilarCaloria à sua tela inicial para acesso rápido, funcionamento offline e uma experiência melhor!
        </p>

        {isIOS ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-sm font-medium mb-2">Como instalar no iPhone:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span>
                  Toque no botão <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs">Compartilhar</span> do Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span>
                  Role para baixo e toque em "Adicionar à Tela de Início"
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3.</span>
                  Toque em "Adicionar" no canto superior direito
                </li>
              </ol>
            </div>
            <Button variant="outline" className="w-full" onClick={handleDismiss}>
              Entendi
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleDismiss}>
              Agora não
            </Button>
            <Button variant="gradient" className="flex-1" onClick={handleInstall}>
              <Download className="h-4 w-4 mr-2" />
              Instalar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
