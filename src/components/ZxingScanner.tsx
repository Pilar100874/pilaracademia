import { useZxing } from 'react-zxing';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ZxingScannerProps {
  onResult: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function ZxingScanner({ onResult, onError }: ZxingScannerProps) {
  const [hasError, setHasError] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const hasCalledResult = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDecodeResult = useCallback((result: any) => {
    if (hasCalledResult.current) return;
    const text = result.getText();
    console.log('Barcode detected:', text);
    if (text && text.length > 0) {
      hasCalledResult.current = true;
      onResult(text);
    }
  }, [onResult]);

  const { ref } = useZxing({
    onDecodeResult: handleDecodeResult,
    onError(error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for camera access errors
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
        setHasError(true);
        onError?.('Permissão de câmera negada. Toque em "Permitir" quando solicitado.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('Requested device not found')) {
        setHasError(true);
        onError?.('Nenhuma câmera encontrada.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('Could not start video source') || errorMsg.includes('in use')) {
        setHasError(true);
        onError?.('Câmera em uso. Feche outros apps que usam a câmera e tente novamente.');
      } else if (errorMsg.includes('AbortError')) {
        setHasError(true);
        onError?.('Câmera interrompida. Tente novamente.');
      } else if (!errorMsg.includes('No MultiFormat Readers') && !errorMsg.includes('NotFoundException')) {
        console.error('Scanner error:', errorMsg);
      }
    },
    constraints: {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    timeBetweenDecodingAttempts: 200,
    paused: hasError,
  });

  // Combine refs
  useEffect(() => {
    if (ref.current) {
      videoRef.current = ref.current;
    }
  }, [ref]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    hasCalledResult.current = false;
    
    // Small delay to show loading state
    const timer = setTimeout(() => setIsStarting(false), 500);

    return () => {
      clearTimeout(timer);
      // Stop all tracks when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Camera track stopped:', track.label);
        });
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  if (hasError) {
    return null;
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-black w-full" style={{ minHeight: '280px' }}>
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Iniciando câmera...</p>
          </div>
        </div>
      )}
      <video 
        ref={ref} 
        className="w-full h-full object-cover"
        style={{ minHeight: '280px' }}
        playsInline
        muted
        autoPlay
      />
      {/* Scan area overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-24 border-2 border-primary rounded-lg relative">
          {/* Corner markers */}
          <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
          {/* Scanning line animation */}
          <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-primary/80 animate-pulse" />
        </div>
      </div>
      {/* Dark overlay outside scan area */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/40" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 8rem) calc(50% - 3rem), calc(50% - 8rem) calc(50% + 3rem), calc(50% + 8rem) calc(50% + 3rem), calc(50% + 8rem) calc(50% - 3rem), calc(50% - 8rem) calc(50% - 3rem))'
        }} />
      </div>
    </div>
  );
}
