import { useMemo, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { HelpHint } from '@/components/ui';
import { Card, Tabs } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { useOrgEntitlements } from '@/hooks/useOrgEntitlements';
import { ProfileBanner } from './ProfileBanner';
import { ProfileInfoTab } from './ProfileInfoTab';
import { ProfileSecurityTab } from './ProfileSecurityTab';
import { ProfileSignatureTab } from './ProfileSignatureTab';
import { ProfileAutomationTab } from './ProfileAutomationTab';
import { ProfileMembersTab } from './ProfileMembersTab';
import { useProfileAccount } from './useProfileAccount';
import { useProfilePasskeys } from './useProfilePasskeys';
import { useProfilePassword } from './useProfilePassword';
import { useProfileSignature } from './useProfileSignature';

type ProfileTabId = 'profil' | 'securite' | 'signature' | 'automation' | 'equipe';

/** Page Mon compte : bandeau + onglets Profil / Sécurité / Signature. */
export function ProfilePage() {
  useRegisterRootSectionFallback();
  const account = useProfileAccount();
  const password = useProfilePassword();
  const signature = useProfileSignature();
  const { can } = useOrgEntitlements();
  const [tab, setTab] = useState<ProfileTabId>('profil');
  const passkeys = useProfilePasskeys(tab === 'securite');

  const tabs = useMemo(() => {
    const base: { id: ProfileTabId; label: string }[] = [
      { id: 'profil', label: 'Profil' },
      { id: 'securite', label: 'Sécurité' },
      { id: 'signature', label: 'Signature PDF' },
    ];
    if (can('automation:write')) base.push({ id: 'automation', label: 'Automation' });
    if (can('users:invite')) base.push({ id: 'equipe', label: 'Équipe' });
    return base;
  }, [can]);

  const displayName = account.userName.trim() || account.user?.name?.trim() || '';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AppPageTitle
        iconTo="/profil"
        title="Mon compte"
        subtitle="Paramètres du compte, confidentialité et signature pour vos quittances PDF."
        actions={
          <HelpHint
            title="Identité affichée comme bailleur sur les quittances, changement de mot de passe personnel, signature image sur les PDF."
            className="shrink-0"
          />
        }
      />

      <ProfileBanner user={account.user} displayName={displayName} />

      <Card padding="none" className="overflow-hidden">
        <Tabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as ProfileTabId)}
          ariaLabel="Sections du compte"
        />
        <div className="border-t border-[var(--odoo-border)] p-3 sm:p-5">
          {tab === 'profil' ? <ProfileInfoTab account={account} /> : null}
          {tab === 'securite' ? <ProfileSecurityTab password={password} passkeys={passkeys} /> : null}
          {tab === 'signature' ? <ProfileSignatureTab sig={signature} /> : null}
          {tab === 'automation' && can('automation:write') ? <ProfileAutomationTab /> : null}
          {tab === 'equipe' && can('users:invite') ? <ProfileMembersTab /> : null}
        </div>
      </Card>
    </div>
  );
}
