import { useEffect, useRef, useState } from 'react';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import {
  api,
  getReceiptSignatureMeta,
  saveDrawnReceiptSignature,
  type ReceiptSignatureMeta,
  uploadReceiptSignature,
} from '@/lib/api';
import { OdooFieldRow, OdooFormGrid, OdooFormSection, OdooNotebook } from '@/components/OdooKit';
import { Button, Card, HelpHint, Input } from '@/components/ui';

function initialsFromDisplay(displayName: string, email: string): string {
  const n = displayName.trim() || email.trim() || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  useRegisterRootSectionFallback();
  const { user, applyUser } = useAuth();

  const [userName, setUserName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);
  const [signature, setSignature] = useState<ReceiptSignatureMeta | null>(null);
  const [sigBusy, setSigBusy] = useState(false);
  const [sigErr, setSigErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    setUserName(user.name ?? '');
    setOrganizationName(user.organizationName ?? '');
  }, [user]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      const updated = await api<AuthUser>('/auth/profile', {
        method: 'PATCH',
        json: { userName, organizationName },
      });
      applyUser(updated);
      setOk(true);
      window.setTimeout(() => setOk(false), 4000);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPwdErr(null);
    setPwdOk(false);
    if (newPassword.length < 8) {
      setPwdErr('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setPwdSaving(true);
    try {
      await api<{ ok: boolean }>('/auth/change-password', {
        method: 'POST',
        json: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdOk(true);
      window.setTimeout(() => setPwdOk(false), 5000);
    } catch (e2) {
      setPwdErr(e2 instanceof Error ? e2.message : 'Changement impossible.');
    } finally {
      setPwdSaving(false);
    }
  }

  const displayName = userName.trim() || user?.name?.trim() || '';
  const initials = user ? initialsFromDisplay(displayName, user.email) : '—';

  const profilTab = (
    <OdooFormSection title="Informations personnelles">
      <p className="mb-3 text-sm text-[var(--color-muted)]">Ces champs sont utilisés dans l’application et sur vos documents.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <OdooFormGrid>
          <OdooFieldRow label="E-mail">
            <Input id="profile-email" type="email" value={user?.email ?? ''} readOnly disabled />
            <p className="mt-1 text-xs text-[var(--color-muted)]">Non modifiable depuis cette page.</p>
          </OdooFieldRow>
          <OdooFieldRow label="Nom affiché">
            <Input
              id="profile-name"
              name="userName"
              autoComplete="name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex. Marie Kouassi"
            />
          </OdooFieldRow>
          <div className="md:col-span-2">
            <OdooFieldRow label="Nom du bailleur (reçus PDF)" hint="Sur les quittances PDF">
              <Input
                id="profile-org"
                name="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Ex. M. Jean Dupont ou SCI Les Palmiers"
              />
            </OdooFieldRow>
          </div>
        </OdooFormGrid>
        {err ? (
          <p className="text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        ) : null}
        {ok ? (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400" role="status">
            Modifications enregistrées.
          </p>
        ) : null}
        <Button type="submit" disabled={saving || !user}>
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </form>
    </OdooFormSection>
  );

  const securiteTab = (
    <div className="space-y-3">
      <OdooFormSection title="Confidentialité">
        <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-200/90">
          Après modification, <strong className="font-semibold">vous seul</strong> connaissez votre mot de passe. En cas d’oubli,
          utilisez « Mot de passe oublié » sur l’écran de connexion (e-mail avec lien).
        </p>
      </OdooFormSection>
      <OdooFormSection title="Mot de passe">
        <p className="mb-3 text-sm text-[var(--color-muted)]">Minimum 8 caractères. Choisissez un mot de passe unique.</p>
        <form onSubmit={onChangePassword} className="space-y-4">
          <OdooFormGrid>
            <OdooFieldRow label="Mot de passe actuel">
              <Input
                id="profile-current-pwd"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </OdooFieldRow>
            <OdooFieldRow label="Nouveau mot de passe">
              <Input
                id="profile-new-pwd"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </OdooFieldRow>
            <OdooFieldRow label="Confirmer">
              <Input
                id="profile-confirm-pwd"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </OdooFieldRow>
          </OdooFormGrid>
          {pwdErr ? (
            <p className="text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
              {pwdErr}
            </p>
          ) : null}
          {pwdOk ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400" role="status">
              Mot de passe mis à jour.
            </p>
          ) : null}
          <Button type="submit" variant="secondary" disabled={pwdSaving || !user}>
            {pwdSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </OdooFormSection>
    </div>
  );

  const signatureTab = (
    <OdooFormSection title="Signature quittance">
      <p className="mb-3 text-sm text-[var(--color-muted)]">Ajoutée automatiquement sur les quittances PDF générées.</p>
      <div className="space-y-4">
        <OdooFieldRow label="Importer une image">
          <Input
            id="sig-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void onUploadSig(e.target.files?.[0])}
          />
        </OdooFieldRow>
        <OdooFieldRow label="Dessiner sur la zone">
          <canvas
            ref={canvasRef}
            width={520}
            height={160}
            className="w-full max-w-xl rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white touch-none dark:bg-zinc-950"
            onPointerDown={(e) => {
              const ctx = ensureCanvas();
              if (!ctx) return;
              const p = pointerPos(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              drawingRef.current = true;
            }}
            onPointerMove={(e) => {
              if (!drawingRef.current) return;
              const ctx = ensureCanvas();
              if (!ctx) return;
              const p = pointerPos(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }}
            onPointerUp={() => {
              drawingRef.current = false;
            }}
            onPointerLeave={() => {
              drawingRef.current = false;
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="py-2 text-xs" onClick={clearDraw}>
              Effacer
            </Button>
            <Button type="button" className="py-2 text-xs" onClick={() => void saveDraw()} disabled={sigBusy}>
              {sigBusy ? 'Enregistrement…' : 'Enregistrer le dessin'}
            </Button>
          </div>
        </OdooFieldRow>
        {signature?.hasSignature ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Signature enregistrée
            {signature.uploadedAt ? ` · ${new Date(signature.uploadedAt).toLocaleString('fr-FR')}` : ''}.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Aucune signature pour le moment.</p>
        )}
        {sigErr ? (
          <p className="text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
            {sigErr}
          </p>
        ) : null}
      </div>
    </OdooFormSection>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* En-tête type dashboard admin (Zenith / shadcn) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-3xl">Mon compte</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
            Paramètres du compte, confidentialité et signature pour vos quittances PDF.
          </p>
        </div>
        <HelpHint
          title="Identité affichée comme bailleur sur les quittances, changement de mot de passe personnel, signature image sur les PDF."
          className="shrink-0 self-start sm:self-auto"
        />
      </div>

      {/* Bandeau profil */}
      <Card className="overflow-hidden border-neutral-200/90 p-0 dark:border-zinc-700/70">
        <div className="h-28 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black sm:h-32" aria-hidden />
        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
            <div
              className="-mt-14 flex size-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-bold tracking-tight text-brand-700 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)] dark:border-[#1e1e1e] dark:bg-zinc-900 dark:text-brand-300 dark:shadow-black/40 sm:size-28 sm:text-3xl"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 pb-1 pt-2 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-neutral-900 dark:text-zinc-50">
                  {displayName || 'Votre profil'}
                </h2>
                {user?.role === 'PLATFORM_ADMIN' ? (
                  <span className="inline-flex shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">
                    Admin plateforme
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Compte bailleur
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-neutral-600 dark:text-zinc-400">{user?.email ?? '—'}</p>
              {user?.organizationName ? (
                <p className="mt-0.5 truncate text-xs font-medium text-neutral-500 dark:text-zinc-500">
                  {user.organizationName}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <OdooNotebook
        defaultTabId="profil"
        tabs={[
          { id: 'profil', label: 'Profil', content: profilTab },
          { id: 'securite', label: 'Sécurité', content: securiteTab },
          { id: 'signature', label: 'Signature PDF', content: signatureTab },
        ]}
      />
    </div>
  );
}
