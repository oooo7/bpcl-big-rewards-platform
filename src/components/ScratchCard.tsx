'use client';

import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, CheckCircle, Sparkles } from 'lucide-react';

interface ScratchCardProps {
  rewardTitle?: string;
  couponCode?: string;
  isWinner: boolean;
  onScratchComplete?: () => void;
}

export default function ScratchCard({
  rewardTitle = '₹100 Fuel Voucher',
  couponCode = 'BPCL100',
  isWinner = true,
  onScratchComplete,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw gold foil scratch layer
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FFC72C');
    gradient.addColorStop(0.5, '#E6AF00');
    gradient.addColorStop(1, '#D99B00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add text overlay on canvas
    ctx.fillStyle = '#002244';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', width / 2, height / 2 - 5);
    ctx.font = '12px sans-serif';
    ctx.fillText('Scratch to reveal your instant reward', width / 2, height / 2 + 18);

    let isDrawing = false;
    let scratchedPixels = 0;

    const checkScratchedPercentage = () => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      let clearCount = 0;

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clearCount++;
      }

      const percent = (clearCount / (pixels.length / 4)) * 100;
      if (percent > 40 && !isRevealed) {
        setIsRevealed(true);
        // Clear canvas completely
        ctx.clearRect(0, 0, width, height);
        if (isWinner) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
        if (onScratchComplete) onScratchComplete();
      }
    };

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      checkScratchedPercentage();
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isRevealed, isWinner, onScratchComplete]);

  return (
    <div className="relative w-full max-w-sm mx-auto bg-white rounded-2xl p-6 bpcl-card-shadow text-center border-2 border-bpcl-yellow overflow-hidden">
      {/* Background Revealed Result Card */}
      <div className="py-4 px-2">
        {isWinner ? (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 animate-bounce">
              <Gift className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> INSTANT WINNER!
            </div>
            <h3 className="text-xl font-extrabold text-bpcl-darkBlue">{rewardTitle}</h3>
            <p className="text-xs text-slate-600">Present this coupon code at your BPCL fuel station</p>
            <div className="bg-slate-100 border-2 border-dashed border-bpcl-blue rounded-lg py-2.5 px-4 font-mono font-bold text-lg text-bpcl-blue tracking-widest">
              {couponCode}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-bold text-bpcl-darkBlue">Better Luck Next Time!</h3>
            <p className="text-xs text-slate-600">
              Don't worry! Your entry is automatically registered for the upcoming <span className="font-bold text-bpcl-blue">Fortnightly Draw & Grand Bumper Draw</span>.
            </p>
          </div>
        )}
      </div>

      {/* Scratch Canvas Overlay */}
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          width={320}
          height={220}
          className="absolute inset-0 w-full h-full cursor-pointer rounded-2xl touch-none"
        />
      )}
    </div>
  );
}
