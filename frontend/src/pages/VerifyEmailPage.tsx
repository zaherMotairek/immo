import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Callout, Skeleton } from '@/components/ui/index';

/** Confirmation e-mail après inscription (D5). */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setMessage('Lien incomplet.');
      return;
    }
    api<{ message: string }>('/auth/verify-email', { method: 'POST', json: { token } })
      .then((r) => {
        setStatus('ok');
        setMessage(r.message);
      })
      .catch((e) => {
        setStatus('err');
        setMessage(e instanceof Error ? e.message : 'Échec de vérification');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16">
      <Callout variant={status === 'ok' ? 'success' : 'danger'} title={status === 'ok' ? 'E-mail confirmé' : 'Échec'}>
        <p>{message}</p>
        <Link to="/login" className="mt-3 inline-block font-semibold underline">
          Se connecter
        </Link>
      </Callout>
    </div>
  );
}
