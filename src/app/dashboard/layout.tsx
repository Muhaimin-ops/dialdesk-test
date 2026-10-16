import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { getCurrentBusiness } from '@/lib/business';

const NAV = [
  ['/dashboard', 'Overview'],
  ['/dashboard/appointments', 'Appointments'],
  ['/dashboard/calls', 'Calls'],
  ['/dashboard/leads', 'Leads'],
  ['/dashboard/agent', 'Agent settings'],
  ['/dashboard/billing', 'Billing'],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await getCurrentBusiness();
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mist pb-4">
        <div>
          <span className="text-lg font-bold tracking-tight">Dial<span className="text-lamp">Desk</span></span>
          <span className="ml-3 text-sm text-slate2">{business.name}</span>
        </div>
        <form action={logout}><button className="btn-ghost">Sign out</button></form>
      </header>
      <nav className="mt-4 flex flex-wrap gap-1 text-sm" aria-label="Dashboard">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 font-medium text-slate2 hover:bg-white hover:text-ink">{label}</Link>
        ))}
      </nav>
      <main className="mt-6">{children}</main>
    </div>
  );
}
