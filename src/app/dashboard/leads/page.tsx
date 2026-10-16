import { getCurrentBusiness } from '@/lib/business';

export const metadata = { title: 'Leads' };
export const dynamic = 'force-dynamic';

type Lead = { id: string; name: string; phone: string; email: string | null; reason: string | null; created_at: string };

export default async function Leads() {
  const { business, supabase } = await getCurrentBusiness();
  const { data } = await supabase.from('leads').select('id, name, phone, email, reason, created_at')
    .eq('business_id', business.id).order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as Lead[];

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-mist text-slate2"><tr><th className="p-3">Received</th><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Reason</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate2">No leads yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-mist/60 align-top">
              <td className="p-3">{new Date(r.created_at).toLocaleString('en-GB', { timeZone: business.timezone, dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3">{r.phone}<br /><span className="text-slate2">{r.email}</span></td>
              <td className="p-3 text-slate2">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
