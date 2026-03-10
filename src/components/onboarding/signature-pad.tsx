'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
  /** Called whenever the signature changes (dataUrl or null when cleared) */
  onSignatureChange: (dataUrl: string | null) => void;
  /** Pre-loaded signed URL for an existing signature (for re-edit flows) */
  existingSignatureUrl?: string | null;
  /** Disable interaction */
  disabled?: boolean;
  className?: string;
}

/**
 * Draw-to-sign signature pad built on the `signature_pad` library.
 *
 * Captures the client's signature as a PNG data URL.
 * Responsive — resizes canvas on window resize while preserving content.
 */
export function SignaturePad({
  onSignatureChange,
  existingSignatureUrl,
  disabled = false,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Resize canvas to match container width while preserving content
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const pad = padRef.current;
    if (!canvas || !container || !pad) return;

    // Save current content
    const data = pad.toData();

    // Get the container width and set canvas dimensions
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.clientWidth;
    const height = 200; // Fixed height

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // Restore content
    pad.clear();
    if (data.length > 0) {
      pad.fromData(data);
    }
  }, []);

  // Initialise signature pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(30, 41, 59)', // slate-800
      minWidth: 1,
      maxWidth: 2.5,
    });

    if (disabled) {
      pad.off();
    }

    // Track stroke changes
    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty());
      onSignatureChange(pad.toDataURL('image/png'));
    });

    padRef.current = pad;

    // Initial resize
    resizeCanvas();
    setLoaded(true);

    // Resize on window resize
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      pad.off();
    };
  }, [disabled, onSignatureChange, resizeCanvas]);

  // Load existing signature image if provided
  useEffect(() => {
    if (!existingSignatureUrl || !padRef.current || !canvasRef.current || !loaded) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const pad = padRef.current;
      if (!canvas || !pad) return;

      // Draw the existing signature onto the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const displayWidth = canvas.width / ratio;
      const displayHeight = canvas.height / ratio;

      // Clear and redraw background
      pad.clear();

      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(displayWidth / img.width, displayHeight / img.height) * 0.9;
      const x = (displayWidth - img.width * scale) / 2;
      const y = (displayHeight - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      setIsEmpty(false);
      onSignatureChange(canvas.toDataURL('image/png'));
    };
    img.src = existingSignatureUrl;
  }, [existingSignatureUrl, loaded, onSignatureChange]);

  const handleClear = () => {
    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
      onSignatureChange(null);
    }
  };

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative rounded-lg border-2 border-dashed border-[#E2E8F0] bg-white overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair"
        />

        {/* Placeholder text shown when empty */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <PenLine className="w-5 h-5" />
              <span className="text-sm">Sign here</span>
            </div>
          </div>
        )}
      </div>

      {/* Clear button */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-[#94A3B8]">
          Draw your signature using your mouse or finger
        </p>
        {!isEmpty && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-[#717D93] hover:text-red-600 h-7 text-xs"
          >
            <Eraser className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
