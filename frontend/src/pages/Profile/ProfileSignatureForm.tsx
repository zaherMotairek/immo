import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import type { ProfileSignature } from './useProfileSignature';

/** Onglet Signature PDF : import image + dessin. */
export function ProfileSignatureForm({ sig }: { sig: ProfileSignature }) {
  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Signature quittance</h3>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Ajoutée automatiquement sur les quittances PDF générées.
      </p>
      <div className="space-y-4">
        <Field label="Importer une image" htmlFor="sig-upload">
          <Input
            id="sig-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void sig.onUploadSig(e.target.files?.[0])}
          />
        </Field>
        <Field label="Dessiner sur la zone" htmlFor="sig-canvas">
          <canvas
            id="sig-canvas"
            ref={sig.canvasRef}
            width={520}
            height={160}
            className="w-full max-w-xl touch-none rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white dark:bg-zinc-950"
            onPointerDown={(e) => {
              const ctx = sig.ensureCanvas();
              if (!ctx) return;
              const p = sig.pointerPos(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              sig.drawingRef.current = true;
            }}
            onPointerMove={(e) => {
              if (!sig.drawingRef.current) return;
              const ctx = sig.ensureCanvas();
              if (!ctx) return;
              const p = sig.pointerPos(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }}
            onPointerUp={() => {
              sig.drawingRef.current = false;
            }}
            onPointerLeave={() => {
              sig.drawingRef.current = false;
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="py-2 text-xs" onClick={sig.clearDraw}>
              Effacer
            </Button>
            <Button type="button" className="py-2 text-xs" onClick={() => void sig.saveDraw()} disabled={sig.sigBusy}>
              {sig.sigBusy ? 'Enregistrement…' : 'Enregistrer le dessin'}
            </Button>
          </div>
        </Field>
        {sig.signature?.hasSignature ? (
          <Callout variant="success">
            Signature enregistrée
            {sig.signature.uploadedAt ? ` · ${new Date(sig.signature.uploadedAt).toLocaleString('fr-FR')}` : ''}.
          </Callout>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Aucune signature pour le moment.</p>
        )}
        {sig.sigErr ? <Callout variant="danger">{sig.sigErr}</Callout> : null}
      </div>
    </Card>
  );
}
