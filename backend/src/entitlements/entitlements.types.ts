export type PlanFeatureKey = 'reminders' | 'collectors' | 'exports' | 'closures';

export type OrgSubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'FREE';

export type PlanFeatures = Partial<Record<PlanFeatureKey, boolean>>;

export type OrgMemberRoleDto = 'OWNER' | 'ACCOUNTANT' | 'COLLECTOR' | 'READONLY';

export type EntitlementsDto = {
  planCode: string;
  planName: string;
  status: OrgSubscriptionStatus;
  unitLimit: number | null;
  userLimit: number | null;
  unitsUsed: number;
  usersUsed: number;
  features: PlanFeatures;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  trialDaysLeft: number | null;
  monthlyPriceFcfa: number;
  /** F1 */
  orgRole: OrgMemberRoleDto;
  permissions: string[];
};
