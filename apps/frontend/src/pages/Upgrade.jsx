import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Plans and top-ups now live on the dashboard Credits tab. Old links, Stripe
 * return URLs and bookmarks land here and are forwarded with their status
 * params intact so the success toast still fires.
 */
export default function Upgrade() {
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  params.set('tab', 'usage');
  return <Navigate to={`/dashboard?${params.toString()}`} replace />;
}
