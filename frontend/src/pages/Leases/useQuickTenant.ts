import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { api } from '@/lib/api';
import { isContactPickerSupported, pickDeviceContacts } from '@/lib/contactPicker';
import { splitFullName } from './leaseUtils';
import type { TenantOpt } from './types';

type Options = {
  tenants: TenantOpt[];
  setTenants: Dispatch<SetStateAction<TenantOpt[]>>;
  setTenantId: (id: string) => void;
};

/** Création rapide d'un locataire depuis le formulaire de bail (sans quitter la page). */
export function useQuickTenant({ tenants, setTenants, setTenantId }: Options) {
  const [quickTenantOpen, setQuickTenantOpen] = useState(false);
  const [quickTenantName, setQuickTenantName] = useState('');
  const [quickTenantPhone, setQuickTenantPhone] = useState('');
  const [quickTenantEmail, setQuickTenantEmail] = useState('');
  const [quickTenantBusy, setQuickTenantBusy] = useState(false);
  const [quickTenantErr, setQuickTenantErr] = useState<string | null>(null);

  const contactsSupported = isContactPickerSupported();

  function openQuickTenant() {
    setQuickTenantErr(null);
    setQuickTenantOpen(true);
  }

  /** Ignoré tant qu'un enregistrement est en cours. */
  function closeQuickTenant() {
    if (quickTenantBusy) return;
    setQuickTenantOpen(false);
    setQuickTenantErr(null);
  }

  /** Remplit nom / téléphone / e-mail depuis un contact du téléphone. */
  async function fillFromPhoneContact() {
    setQuickTenantErr(null);
    if (!contactsSupported || quickTenantBusy) return;
    try {
      const contacts = await pickDeviceContacts({ multiple: false });
      const c = contacts?.[0];
      if (!c) return;
      setQuickTenantName(c.name);
      if (c.tel) setQuickTenantPhone(c.tel);
      if (c.email) setQuickTenantEmail(c.email);
    } catch (e2) {
      setQuickTenantErr(e2 instanceof Error ? e2.message : 'Contact inaccessible.');
    }
  }

  async function createQuickTenant(e: FormEvent) {
    e.preventDefault();
    setQuickTenantErr(null);
    if (quickTenantBusy) return;
    const normalizedName = quickTenantName.trim();
    if (normalizedName.length < 3) {
      setQuickTenantErr('Indiquez le nom complet du locataire.');
      return;
    }
    const { firstName, lastName } = splitFullName(normalizedName);
    setQuickTenantBusy(true);
    try {
      const created = await api<TenantOpt>('/tenants', {
        method: 'POST',
        json: {
          firstName,
          lastName,
          email: quickTenantEmail.trim() || undefined,
          phone: quickTenantPhone.trim() || undefined,
        },
      });
      const nextTenants = [...tenants, created].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', { sensitivity: 'base' }),
      );
      setTenants(nextTenants);
      setTenantId(created.id);
      setQuickTenantName('');
      setQuickTenantPhone('');
      setQuickTenantEmail('');
      setQuickTenantOpen(false);
    } catch (e2) {
      setQuickTenantErr(e2 instanceof Error ? e2.message : 'Erreur');
    } finally {
      setQuickTenantBusy(false);
    }
  }

  return {
    quickTenantOpen,
    quickTenantName,
    setQuickTenantName,
    quickTenantPhone,
    setQuickTenantPhone,
    quickTenantEmail,
    setQuickTenantEmail,
    quickTenantBusy,
    quickTenantErr,
    contactsSupported,
    openQuickTenant,
    closeQuickTenant,
    fillFromPhoneContact,
    createQuickTenant,
  };
}

export type QuickTenant = ReturnType<typeof useQuickTenant>;
