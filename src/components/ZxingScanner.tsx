import { useZxing } from 'react-zxing';
import { useEffect, useState, useCallback } from 'react';

interface ZxingScannerProps {
  onResult: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function ZxingScanner({ onResult, onError }: ZxingScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleDecodeResult = useCallback((result: any) => {
    const text = result.getText();
    console.log('Barcode detected:', text);
    if (text && text.length > 0) {
      onResult(text);
    }
  }, [onResult]);

  const { ref } = useZxing({
    onDecodeResult: handleDecodeResult,
    onError(error) {
      // Only log actual errors, not "no barcode found" messages
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('No MultiFormat Readers') && !errorMsg.includes('NotFoundException')) {
        console.error('Scanner error:', errorMsg);
      }
    },
    constraints: {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
      },
    },
    timeBetweenDecodingAttempts: 150,
  });

  useEffect(() => {
    let mounted = true;
    
    // Check camera permission
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      } 
    })
      .then((stream) => {
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        if (mounted) {
          setHasPermission(true);
          // Small delay to ensure video element is mounted
          setTimeout(() => setIsReady(true), 100);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setHasPermission(false);
        if (err.name === 'NotAllowedError') {
          onError?.('Permissão de câmera negada. Toque em "Permitir" quando solicitado.');
        } else if (err.name === 'NotFoundError') {
          onError?.('Nenhuma câmera encontrada.');
        } else if (err.name === 'NotReadableError') {
          onError?.('Câmera em uso por outro aplicativo.');
        } else {
          onError?.('Não foi possível acessar a câmera.');
        }
      });
      
    return () => {
      mounted = false;
    };
  }, [onError]);

  if (hasPermission === false) {
    return null;
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-black w-full" style={{ minHeight: '300px' }}>
      <video 
        ref={ref} 
        className="w-full h-full object-cover"
        style={{ minHeight: '300px' }}
        playsInline
        muted
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
