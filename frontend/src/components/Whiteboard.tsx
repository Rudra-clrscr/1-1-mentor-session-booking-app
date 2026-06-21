'use client';

import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import { WhiteboardSegment } from '@/types';
import { GlowingButton } from '@/components/ui/GlowingComponents';

interface WhiteboardProps {
  sessionId: string;
  /** Keep mounted but visually hidden when not the active tab, so strokes survive tab switches. */
  active: boolean;
}

const PEN_COLORS = ['#1f2937', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const PEN_SIZE = 3;
const ERASER_SIZE = 24;

export function Whiteboard({ sessionId, active }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(PEN_COLORS[0]);

  // Resize the backing pixel buffer to match the container's current CSS size.
  // While hidden (display: none) the container reports 0x0, so this must
  // re-run when the tab becomes active again, not just once on mount —
  // otherwise the canvas stays sized 0x0 forever and nothing ever draws.
  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const prev = ctxRef.current?.getImageData?.(0, 0, canvas.width, canvas.height);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    if (prev) ctx.putImageData(prev, 0, 0);
  };

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-measure when switching back to this tab, since it was 0x0 while hidden.
  useEffect(() => {
    if (active) resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const drawSegment = (segment: WhiteboardSegment) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.globalCompositeOperation = segment.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = segment.color;
    ctx.lineWidth = segment.size;
    ctx.beginPath();
    ctx.moveTo(segment.x0 * w, segment.y0 * h);
    ctx.lineTo(segment.x1 * w, segment.y1 * h);
    ctx.stroke();
  };

  // Remote strokes + clear events
  useEffect(() => {
    const handleRemoteDraw = (data: { segment: WhiteboardSegment; userId: string }) => {
      drawSegment(data.segment);
    };
    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    };

    socketService.on('whiteboard:draw', handleRemoteDraw);
    socketService.on('whiteboard:clear', handleRemoteClear);
    return () => {
      socketService.off('whiteboard:draw', handleRemoteDraw);
      socketService.off('whiteboard:clear', handleRemoteClear);
    };
  }, []);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = getNormalizedPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const point = getNormalizedPoint(e);
    const segment: WhiteboardSegment = {
      tool,
      color,
      size: tool === 'eraser' ? ERASER_SIZE : PEN_SIZE,
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: point.x,
      y1: point.y,
    };
    drawSegment(segment);
    socketService.sendWhiteboardDraw(segment, sessionId);
    lastPointRef.current = point;
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    socketService.clearWhiteboard(sessionId);
  };

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ display: active ? 'flex' : 'none' }}
    >
      <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-200 dark:border-gray-700/30 flex-shrink-0 flex-wrap">
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1 rounded text-xs md:text-sm border ${
            tool === 'pen'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-gray-300 dark:border-gray-700/50 text-gray-600 dark:text-gray-400'
          }`}
        >
          ✏️ Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-1 rounded text-xs md:text-sm border ${
            tool === 'eraser'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-gray-300 dark:border-gray-700/50 text-gray-600 dark:text-gray-400'
          }`}
        >
          🧹 Eraser
        </button>
        <div className="flex items-center gap-1">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={`w-5 h-5 rounded-full border-2 ${color === c && tool === 'pen' ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Pen color ${c}`}
            />
          ))}
        </div>
        <GlowingButton variant="outline" className="text-xs py-1 px-3 ml-auto" onClick={handleClear}>
          Clear
        </GlowingButton>
      </div>
      <div className="flex-1 min-h-0 bg-white dark:bg-dark-950/40">
        <canvas
          ref={canvasRef}
          data-testid="whiteboard-canvas"
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}

export default Whiteboard;
