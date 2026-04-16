import { redirect } from 'next/navigation';

/**
 * Root route — redirect to dashboard.
 * All staff entry points land on /dashboard.
 */
export default function RootPage() {
  redirect('/dashboard');
}
