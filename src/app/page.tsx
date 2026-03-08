import { redirect } from 'next/navigation';

// Root page redirects to clients list (or login via middleware if not authenticated)
export default function HomePage() {
  redirect('/clients');
}
