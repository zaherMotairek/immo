import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { isSafeInternalReturnPath, navigateAfterCreate } from '@/lib/navigation';
import { splitFullName } from './tenantUtils';

/** Formulaire de création d'un locataire (repliable, `#nouveau-locataire`, retour `returnLocation`). */
export function useNewTenant({ load }: { load: () => void }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const returnLocationParam = params.get('returnLocation')?.trim() ?? '';
  const returnAfterTenantCreateRef = useRef<string | null>(null);
  const addTenantFormRef = useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [addTenantOpen, setAddTenantOpen] = useState(false);

  function openAddTenantForm() {
    setAddTenantOpen(true);
    window.requestAnimationFrame(() => {
      addTenantFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function resetNewTenantForm() {
    setFullName('');
    setEmail('');
    setPhone('');
    setErr(null);
  }

  function cancelNewTenant() {
    resetNewTenantForm();
    setAddTenantOpen(false);
    returnAfterTenantCreateRef.current = null;
    if (params.get('returnLocation')) {
      setParams(
        (prev) => {
          const q = new URLSearchParams(prev);
          q.delete('returnLocation');
          return q;
        },
        { replace: true },
      );
    }
    if (window.location.hash === '#nouveau-locataire') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  useEffect(() => {
    if (returnLocationParam && isSafeInternalReturnPath(returnLocationParam)) {
      returnAfterTenantCreateRef.current = returnLocationParam;
    } else {
      returnAfterTenantCreateRef.current = null;
    }
  }, [returnLocationParam]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-locataire') {
      setAddTenantOpen(true);
    }
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const { firstName, lastName } = splitFullName(fullName);
    if (fullName.trim().length < 3) {
      setErr('Indiquez le nom complet du locataire.');
      return;
    }
    try {
      await api('/tenants', {
        method: 'POST',
        json: {
          firstName,
          lastName,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });
      const back = returnAfterTenantCreateRef.current;
      returnAfterTenantCreateRef.current = null;
      setFullName('');
      setEmail('');
      setPhone('');
      setAddTenantOpen(false);
      if (back) {
        navigateAfterCreate(navigate, back);
      } else {
        load();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  return {
    addTenantFormRef,
    addTenantOpen,
    setAddTenantOpen,
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    err,
    openAddTenantForm,
    cancelNewTenant,
    create,
  };
}

export type NewTenant = ReturnType<typeof useNewTenant>;
