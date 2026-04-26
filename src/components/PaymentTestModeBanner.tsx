import { useMasterSettings } from '@/hooks/useSubscription';

export function PaymentTestModeBanner() {
  const { data } = useMasterSettings();
  if (data?.payments_mode !== 'test') return null;
  return (
    <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1 px-2">
      🧪 Modo de pagamento: TESTE — nenhuma cobrança real será feita
    </div>
  );
}
