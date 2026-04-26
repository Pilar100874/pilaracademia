import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  max_students: number | null;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;
  paddle_price_id_monthly: string | null;
  paddle_price_id_yearly: string | null;
  sort_order: number;
  active: boolean;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_id: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  cycle: 'monthly' | 'yearly' | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_payment_at: string | null;
}

export interface MasterSettings {
  payments_mode: 'test' | 'live';
  trial_days: number;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useAllSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans-all'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useClinicSubscription(clinicId: string | null) {
  return useQuery({
    queryKey: ['clinic-subscription', clinicId],
    enabled: !!clinicId,
    queryFn: async (): Promise<ClinicSubscription | null> => {
      const { data, error } = await supabase
        .from('clinic_subscriptions' as any)
        .select('*')
        .eq('clinic_id', clinicId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as any;
    },
  });
}

export function useMasterSettings() {
  return useQuery({
    queryKey: ['master-settings'],
    queryFn: async (): Promise<MasterSettings> => {
      const { data } = await supabase
        .from('master_settings' as any)
        .select('payments_mode, trial_days')
        .eq('id', 1)
        .maybeSingle();
      return (data ?? { payments_mode: 'test', trial_days: 7 }) as any;
    },
  });
}

/** Deriva acesso liberado a partir da assinatura. */
export function hasActiveAccess(sub: ClinicSubscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
    return true;
  }
  return false;
}
