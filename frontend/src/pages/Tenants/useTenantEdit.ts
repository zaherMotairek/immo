import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Tenant } from './types';

/** Édition en ligne d'un locataire (ouverture par `?edit=<id>`, enregistrement PATCH). */
export function useTenantEdit({ rows, load }: { rows: Tenant[]; load: () => void }) {
  const [params, setParams] = useSearchParams();
  const editParam = params.get('edit');
  const urlEditOpened = useRef<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editErr, setEditErr] = useState<string | null>(null);

  function beginEdit(t: Tenant) {
    setEditingId(t.id);
    setEditFirstName(t.firstName);
    setEditLastName(t.lastName);
    setEditEmail(t.email ?? '');
    setEditPhone(t.phone ?? '');
    setEditNotes(t.notes ?? '');
    setEditErr(null);
    const el = document.getElementById(`tenant-row-${t.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditErr(null);
    if (params.get('edit')) {
      const next = new URLSearchParams(params);
      next.delete('edit');
      setParams(next, { replace: true });
    }
  }

  useEffect(() => {
    if (!editParam) {
      urlEditOpened.current = null;
      return;
    }
    if (rows.length === 0) return;
    if (urlEditOpened.current === editParam) return;
    const t = rows.find((r) => r.id === editParam);
    if (t) {
      beginEdit(t);
      urlEditOpened.current = editParam;
    }
  }, [editParam, rows]);

  async function saveEdit(id: string) {
    setEditErr(null);
    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditErr('Prénom et nom sont obligatoires.');
      return;
    }
    try {
      await api(`/tenants/${id}`, {
        method: 'PATCH',
        json: {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim() ? editEmail.trim() : null,
          phone: editPhone.trim() || null,
          notes: editNotes.trim() || null,
        },
      });
      cancelEdit();
      load();
    } catch (e2) {
      setEditErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  return {
    editParam,
    editingId,
    editFirstName,
    setEditFirstName,
    editLastName,
    setEditLastName,
    editEmail,
    setEditEmail,
    editPhone,
    setEditPhone,
    editNotes,
    setEditNotes,
    editErr,
    beginEdit,
    cancelEdit,
    saveEdit,
  };
}

export type TenantEdit = ReturnType<typeof useTenantEdit>;
