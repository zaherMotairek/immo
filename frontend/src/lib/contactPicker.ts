/** Contact normalisé depuis le carnet d’adresses du téléphone (Contact Picker API). */
export type PickedContact = {
  name: string;
  tel?: string;
  email?: string;
};

type ContactPickerContact = {
  name?: string[];
  tel?: string[];
  email?: string[];
};

type ContactsManager = {
  getProperties?: () => Promise<string[]>;
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<ContactPickerContact[]>;
};

function contactsManager(): ContactsManager | null {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as Navigator & { contacts?: ContactsManager };
  return n.contacts ?? null;
}

/** Android Chrome (HTTPS) surtout — pas supporté sur Safari iPhone pour l’instant. */
export function isContactPickerSupported(): boolean {
  return contactsManager() != null && typeof contactsManager()?.select === 'function';
}

function firstNonEmpty(values: string[] | undefined): string | undefined {
  if (!values?.length) return undefined;
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

function normalizeTel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d+]/g, '').trim();
  return cleaned || undefined;
}

/**
 * Ouvre le sélecteur système de contacts.
 * Renvoie `null` si l’utilisateur annule.
 */
export async function pickDeviceContacts(opts?: { multiple?: boolean }): Promise<PickedContact[] | null> {
  const mgr = contactsManager();
  if (!mgr) {
    throw new Error('La sélection de contacts n’est pas disponible sur cet appareil / navigateur.');
  }

  let properties = ['name', 'tel'];
  try {
    const available = mgr.getProperties ? await mgr.getProperties() : properties;
    properties = properties.filter((p) => available.includes(p));
    if (!properties.includes('name')) properties.unshift('name');
  } catch {
    /* getProperties optionnel */
  }

  let raw: ContactPickerContact[];
  try {
    raw = await mgr.select(properties, { multiple: opts?.multiple === true });
  } catch (e) {
    // Annulation utilisateur → souvent AbortError
    if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
      return null;
    }
    throw e;
  }

  if (!raw?.length) return null;

  const out: PickedContact[] = [];
  for (const c of raw) {
    const name = firstNonEmpty(c.name);
    if (!name || name.length < 2) continue;
    out.push({
      name,
      tel: normalizeTel(firstNonEmpty(c.tel)),
      email: firstNonEmpty(c.email),
    });
  }
  return out.length ? out : null;
}
