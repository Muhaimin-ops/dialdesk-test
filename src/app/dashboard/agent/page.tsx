import SubmitButton from '@/components/SubmitButton';
import { saveAgent } from '@/app/actions/business';
import { getCurrentBusiness } from '@/lib/business';
import { DAYS, DAY_LABELS } from '@/lib/time';
import { INDUSTRIES, LEGACY_VOICE_MAP, VOICES } from '@/lib/types';

export const metadata = { title: 'Agent settings' };
export const dynamic = 'force-dynamic';

export default async function AgentSettings({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const { business: b } = await getCurrentBusiness();
  const zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  const selectedVoice = VOICES.find((voice) => voice === b.voice) ?? LEGACY_VOICE_MAP[b.voice] ?? VOICES[0];

  return (
    <form action={saveAgent} className="max-w-3xl space-y-6">
      {error && <p role="alert" className="rounded-lg bg-alarm/10 p-2 text-sm text-alarm">{error}</p>}
      {saved && <p role="status" className="rounded-lg bg-live/10 p-2 text-sm text-live">Saved. New calls use these settings.</p>}

      <section className="card grid gap-4 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Business</h2>
        <div><label className="label" htmlFor="name">Business name</label><input id="name" name="name" defaultValue={b.name} required className="input" /></div>
        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <select id="industry" name="industry" defaultValue={b.industry} className="input">{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="timezone">Time zone</label>
          <input id="timezone" name="timezone" list="zones" defaultValue={b.timezone} required className="input" />
          <datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor="slot_minutes">Appointment length (minutes)</label>
          <input id="slot_minutes" name="slot_minutes" type="number" min={10} max={240} step={5} defaultValue={b.slot_minutes} required className="input" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Receptionist</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="agent_name">Name</label><input id="agent_name" name="agent_name" defaultValue={b.agent_name} required maxLength={30} className="input" /></div>
          <div>
            <label className="label" htmlFor="voice">Voice</label>
            <select id="voice" name="voice" defaultValue={selectedVoice} className="input">{VOICES.map((v) => <option key={v}>{v}</option>)}</select>
          </div>
        </div>
        <div><label className="label" htmlFor="greeting">Greeting</label><input id="greeting" name="greeting" defaultValue={b.greeting} required maxLength={300} className="input" /></div>
        <div>
          <label className="label" htmlFor="knowledge">Business information</label>
          <textarea id="knowledge" name="knowledge" rows={6} defaultValue={b.knowledge} maxLength={6000} className="input" placeholder="Services, price ranges, service area, policies, FAQs…" />
          <p className="hint">The agent only states facts from here. Anything missing, it will offer to take a message.</p>
        </div>
        <div>
          <label className="label" htmlFor="instructions">Extra instructions</label>
          <textarea id="instructions" name="instructions" rows={3} defaultValue={b.instructions} maxLength={3000} className="input" placeholder="e.g. Always ask for the property address. Never quote prices." />
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Opening hours</h2>
        <p className="hint">Appointments can only be booked inside these hours.</p>
        {DAYS.slice(1).concat(DAYS[0]).map((d) => (
          <div key={d} className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-2 text-sm">
            <span>{DAY_LABELS[d]}</span>
            <input aria-label={`${DAY_LABELS[d]} opens`} name={`${d}_open`} type="time" defaultValue={b.hours[d]?.open ?? '09:00'} className="input" />
            <input aria-label={`${DAY_LABELS[d]} closes`} name={`${d}_close`} type="time" defaultValue={b.hours[d]?.close ?? '17:00'} className="input" />
            <label className="flex items-center gap-1 text-slate2"><input type="checkbox" name={`${d}_closed`} defaultChecked={!b.hours[d]} /> Closed</label>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-semibold">Allowed websites</h2>
        <textarea name="allowed_origins" rows={3} defaultValue={b.allowed_origins.join('\n')} className="input mt-2" placeholder={'https://yourbusiness.com\nhttps://www.yourbusiness.com'} />
        <p className="hint">One per line. The widget only starts on these sites (www and non-www are different origins). Your DialDesk public page always works.</p>
      </section>

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
