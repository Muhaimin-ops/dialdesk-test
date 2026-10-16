import { getCurrentBusiness } from '@/lib/business';

export const metadata = { title: 'Calls' };
export const dynamic = 'force-dynamic';

type Call = { id: string; started_at: string; duration_seconds: number | null; transcript: { role: string; text: string }[] };

export default async function Calls() {
  const { business, supabase } = await getCurrentBusiness();
  const { data } = await supabase
    .from('calls').select('id, started_at, duration_seconds, transcript')
    .eq('business_id', business.id).order('started_at', { ascending: false }).limit(100);
  const calls = (data ?? []) as Call[];

  return (
    <div className="space-y-3">
      {calls.length === 0 && <p className="card text-center text-slate2">No calls yet. Try your public page to place a test call.</p>}
      {calls.map((c) => (
        <details key={c.id} className="card">
          <summary className="cursor-pointer text-sm font-medium">
            {new Date(c.started_at).toLocaleString('en-GB', { timeZone: business.timezone, dateStyle: 'medium', timeStyle: 'short' })}
            <span className="ml-3 font-normal text-slate2">{c.duration_seconds != null ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : 'in progress / unfinished'} · {c.transcript.length} messages</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {c.transcript.length === 0 && <p className="text-slate2">No transcript captured.</p>}
            {c.transcript.map((m, i) => (
              <p key={i}><b className="mr-1 text-xs uppercase text-slate2">{m.role === 'user' ? 'Caller' : business.agent_name}</b>{m.text}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
