import { SmartLink } from '@/components/SmartLink';
import { TenantIdDocumentSection } from '@/components/TenantIdDocumentSection';
import { Button, Callout, Field, Input } from '@/components/ui/index';
import type { Tenant } from './types';
import { idDocumentMeta } from './tenantUtils';
import type { TenantEdit } from './useTenantEdit';

type TenantEditFormProps = {
  tenant: Tenant;
  edit: TenantEdit;
  /** Recharge la liste (après envoi / suppression de la pièce d'identité). */
  onChanged: () => void;
  /** `mobile` : une colonne, ids `*-m-` ; `desktop` : deux colonnes + lien « Activité loyers ». */
  variant: 'mobile' | 'desktop';
};

/** Formulaire d'édition en ligne d'un locataire (coordonnées, notes, pièce d'identité). */
export function TenantEditForm({ tenant: t, edit, onChanged, variant }: TenantEditFormProps) {
  const desktop = variant === 'desktop';
  const sfx = desktop ? '' : '-m';
  const id = (k: string) => `${k}${sfx}-${t.id}`;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--color-ink)]">Modifier le locataire</p>
      <div className={desktop ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
        <Field label="Prénom" htmlFor={id('ef')}>
          <Input id={id('ef')} value={edit.editFirstName} onChange={(e) => edit.setEditFirstName(e.target.value)} required />
        </Field>
        <Field label="Nom" htmlFor={id('el')}>
          <Input id={id('el')} value={edit.editLastName} onChange={(e) => edit.setEditLastName(e.target.value)} required />
        </Field>
        <Field label="Téléphone" htmlFor={id('ep')}>
          <Input id={id('ep')} value={edit.editPhone} onChange={(e) => edit.setEditPhone(e.target.value)} />
        </Field>
        <Field label="E-mail" htmlFor={id('ee')}>
          <Input
            id={id('ee')}
            value={edit.editEmail}
            onChange={(e) => edit.setEditEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </Field>
        <Field label="Notes (optionnel)" htmlFor={id('en')} className={desktop ? 'sm:col-span-2' : undefined}>
          <Input
            id={id('en')}
            value={edit.editNotes}
            onChange={(e) => edit.setEditNotes(e.target.value)}
            placeholder="Rappels internes…"
          />
        </Field>
      </div>
      {edit.editErr ? <Callout variant="danger">{edit.editErr}</Callout> : null}
      <TenantIdDocumentSection tenantId={t.id} idDocument={idDocumentMeta(t)} onChanged={onChanged} />
      {desktop ? (
        <div className="flex flex-wrap items-center gap-2">
          <SmartLink
            to={`/activite-loyers?scope=tenant&tenantId=${encodeURIComponent(t.id)}&year=${new Date().getFullYear()}`}
            returnFocusId={t.id}
            className="text-xs font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
          >
            Activité loyers sur l’année
          </SmartLink>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void edit.saveEdit(t.id)}>
          Enregistrer
        </Button>
        <Button size="sm" variant="secondary" onClick={edit.cancelEdit}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
