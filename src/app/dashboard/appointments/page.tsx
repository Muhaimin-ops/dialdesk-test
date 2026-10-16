import SubmitButton from '@/components/SubmitButton';
import { cancelAppointment } from '@/app/actions/business';
import { getCurrentBusiness } from '@/lib/business';
import { formatLocal } from '@/lib/time';

export const metadata = { title: 'Appointments' };
export const dynamic = 'force-dynamic';

type Row = { id: string; customer_name: string; customer_phone: string; customer_email: string | null; notes: string | null; starts_at: string; status: string };

export default async function Appointments() {
  const { business, supabase } = await getCurrentBusiness();
  const { data } = await supabase
    .from('appointments')
    .select('id, customer_name, customer_phone, customer_email, notes, starts_at, status')
    .eq('business_id', business.id)
    .order('starts_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-mist text-slate2"><tr><th className="p-3">When ({business.timezone})</th><th className="p-3">Customer</th><th className="p-3">Contact</th><th className="p-3">Notes</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate2">No appointments yet. They appear here when the receptionist books them.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-mist/60 align-top">
              <td className="p-3 font-medium">{formatLocal(new Date(r.starts_at), business.timezone)}</td>
              <td className="p-3">{r.customer_name}</td>
              <td className="p-3">{r.customer_phone}<br /><span className="text-slate2">{r.customer_email}</span></td>
              <td className="p-3 text-slate2">{r.notes}</td>
              <td className="p-3"><span className={r.status === 'confirmed' ? 'text-live' : 'text-slate2'}>{r.status}</span></td>
              <td className="p-3">{r.status === 'confirmed' && <form action={cancelAppointment}><input type="hidden" name="id" value={r.id} /><SubmitButton className="btn-ghost">Cancel</SubmitButton></form>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
