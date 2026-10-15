import { Navigate, useSearchParams } from 'react-router-dom';

/** A tela Corpo foi unida à Saúde (/health). Mantemos o redirecionamento para links antigos. */
export default function BioimpedancePage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const target = tab === 'blood' ? '/health?tab=blood' : tab === 'bioimpedance' ? '/health?tab=bioimpedance' : '/health?tab=bioimpedance';
  return <Navigate to={target} replace />;
}
