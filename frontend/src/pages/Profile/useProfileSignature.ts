import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  getReceiptSignatureMeta,
  saveDrawnReceiptSignature,
  type ReceiptSignatureMeta,
  uploadReceiptSignature,
} from '@/lib/api';

/** Upload / dessin de la signature quittance PDF. */
export function useProfileSignature() {
  const { user } = useAuth();
  const [signature, setSignature] = useState<ReceiptSignatureMeta | null>(null);
  const [sigBusy, setSigBusy] = useState(false);
  const [sigErr, setSigErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    getReceiptSignatureMeta().then(setSignature).catch(() => setSignature(null));
  }, [user]);

  function ensureCanvas(): CanvasRenderingContext2D | null {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#334155';
    return ctx;
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  async function onUploadSig(file: File | undefined) {
    if (!file) return;
    setSigErr(null);
    setSigBusy(true);
    try {
      const out = await uploadReceiptSignature(file);
      setSignature(out);
    } catch (e) {
      setSigErr(e instanceof Error ? e.message : 'Upload signature impossible');
    } finally {
      setSigBusy(false);
    }
  }

  function clearDraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }

  async function saveDraw() {
    const c = canvasRef.current;
    if (!c) return;
    setSigErr(null);
    setSigBusy(true);
    try {
      const out = await saveDrawnReceiptSignature(c.toDataURL('image/png'));
      setSignature(out);
    } catch (e) {
      setSigErr(e instanceof Error ? e.message : 'Signature dessinée impossible');
    } finally {
      setSigBusy(false);
    }
  }

  return {
    signature,
    sigBusy,
    sigErr,
    canvasRef,
    drawingRef,
    ensureCanvas,
    pointerPos,
    onUploadSig,
    clearDraw,
    saveDraw,
  };
}

export type ProfileSignature = ReturnType<typeof useProfileSignature>;
