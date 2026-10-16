'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createLocalOffer, iceCandidatePatch, sdpCandidateLines } from '@/lib/realtime/ice';

type Line = { role: 'user' | 'assistant'; text: string };
type Status = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

export default function VoiceCall({
  token, agentName, businessName, maxSeconds = 600,
}: { token: string; agentName: string; businessName: string; maxSeconds?: number }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTokenRef = useRef<string | null>(null);
  const startedRef = useRef(0);
  const transcriptRef = useRef<Line[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const addLine = useCallback((role: Line['role'], text: string) => {
    const value = text.trim();
    if (!value) return;
    transcriptRef.current.push({ role, text: value });
    setLines([...transcriptRef.current].slice(-6));
  }, []);

  const teardown = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current = null;
    streamRef.current = null;
  }, []);

  const reportEnd = useCallback(() => {
    const callToken = callTokenRef.current;
    if (!callToken) return;
    callTokenRef.current = null;
    void fetch('/api/realtime/end', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + callToken },
      body: JSON.stringify({
        durationSeconds: Math.max(0, (Date.now() - startedRef.current) / 1000),
        transcript: transcriptRef.current.slice(-500),
      }),
    }).catch(() => {});
  }, []);

  const hangup = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    reportEnd();
    teardown();
    setStatus((current) => (current === 'error' ? current : 'ended'));
  }, [reportEnd, teardown]);

  useEffect(() => () => {
    if (endedRef.current) return;
    endedRef.current = true;
    reportEnd();
    teardown();
  }, [reportEnd, teardown]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e9 }); }, [lines]);

  function onMessage(event: MessageEvent<string>) {
    let message: { type?: string; role?: Line['role']; text?: string };
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'transcript' && message.role && message.text) {
      addLine(message.role, message.text);
    }
  }

  function callAuthorization(): string {
    const callToken = callTokenRef.current;
    if (!callToken) throw new Error('The call session is not ready.');
    return 'Bearer ' + callToken;
  }

  async function start() {
    setError('');
    setStatus('connecting');
    endedRef.current = false;
    transcriptRef.current = [];
    setLines([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;
      let pcId: string | null = null;
      let signalingReady = false;
      let flushingCandidates = false;
      let candidateFailureReported = false;
      const pendingCandidates: RTCIceCandidateInit[] = [];
      const sentCandidates = new Set<string>();
      let offeredCandidates = new Set<string>();
      const flushCandidates = async () => {
        if (!pcId || !signalingReady || flushingCandidates) return;
        flushingCandidates = true;
        try {
          while (pendingCandidates.length) {
            const candidate = pendingCandidates.shift()!;
            if (!candidate.candidate || offeredCandidates.has(candidate.candidate) || sentCandidates.has(candidate.candidate)) continue;
            const patch = iceCandidatePatch(candidate);
            if (!patch) continue;
            sentCandidates.add(candidate.candidate);
            const response = await fetch('/api/realtime/patch', {
              method: 'PATCH',
              headers: { 'content-type': 'application/json', authorization: callAuthorization() },
              body: JSON.stringify({ pc_id: pcId, candidates: [patch] }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'Could not update the WebRTC network connection.');
          }
        } finally {
          flushingCandidates = false;
        }
      };
      const handleCandidateFailure = (cause: unknown) => {
        if (candidateFailureReported || endedRef.current) return;
        candidateFailureReported = true;
        const message = cause instanceof Error ? cause.message : 'Could not update the WebRTC network connection.';
        hangup();
        setError(message);
        setStatus('error');
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        pendingCandidates.push(event.candidate.toJSON());
        void flushCandidates().catch(handleCandidateFailure);
      };
      pc.ontrack = (event) => { if (audioRef.current) audioRef.current.srcObject = event.streams[0]; };
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) hangup();
      };
      pc.ondatachannel = (event) => { event.channel.onmessage = onMessage; };
      const channel = pc.createDataChannel('data');
      channel.onmessage = onMessage;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await createLocalOffer(pc);
      const sessionResponse = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const session = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok) throw new Error(session.message || 'Could not start the call.');
      const callToken = session.callToken;
      if (typeof callToken !== 'string') throw new Error('The voice service returned an invalid call session.');
      callTokenRef.current = callToken;
      startedRef.current = Date.now();

      const localDescription = pc.localDescription;
      if (!localDescription?.sdp) throw new Error('The browser did not create a WebRTC offer.');
      offeredCandidates = sdpCandidateLines(localDescription.sdp);
      const connectResponse = await fetch('/api/realtime/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + callToken },
        body: JSON.stringify({ sdp: localDescription.sdp, type: localDescription.type }),
      });
      const answer = await connectResponse.json().catch(() => ({}));
      if (!connectResponse.ok) throw new Error(answer.message || 'Could not connect to the voice service.');
      if (typeof answer.sdp !== 'string' || answer.type !== 'answer' || typeof answer.pc_id !== 'string') {
        throw new Error('The voice service returned an invalid connection response.');
      }
      await pc.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
      pcId = answer.pc_id;
      signalingReady = true;
      await flushCandidates();
      setStatus('live');
      timerRef.current = setTimeout(hangup, maxSeconds * 1000);
    } catch (cause) {
      endedRef.current = true;
      reportEnd();
      teardown();
      const denied = cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError');
      setError(denied ? 'Microphone access is needed to talk. Allow it in your browser and try again.' : cause instanceof Error ? cause.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  const live = status === 'live';
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-between gap-4 bg-white p-5 text-center">
      <audio ref={audioRef} autoPlay />
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate2">{businessName}</p>
        <h2 className="mt-1 text-lg font-semibold">{agentName}</h2>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate2" role="status" aria-live="polite">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${live ? 'animate-pulse bg-live' : status === 'connecting' ? 'bg-lamp' : 'bg-mist'}`} />
          {status === 'idle' && 'Ready when you are'}
          {status === 'connecting' && 'Connecting…'}
          {live && 'Live — just start talking'}
          {status === 'ended' && 'Call ended'}
          {status === 'error' && 'Not connected'}
        </p>
      </div>

      <div ref={listRef} className="w-full flex-1 space-y-2 overflow-y-auto text-left text-sm" aria-label="Captions">
        {lines.map((line, index) => (
          <p key={index} className={line.role === 'user' ? 'text-slate2' : 'font-medium'}>
            <span className="mr-1 text-xs uppercase tracking-wide text-slate2">{line.role === 'user' ? 'You' : agentName}</span>
            {line.text}
          </p>
        ))}
      </div>

      {error && <p className="text-sm text-alarm">{error}</p>}

      {live || status === 'connecting' ? (
        <button type="button" onClick={hangup} className="rounded-full bg-alarm px-6 py-3 text-sm font-semibold text-white hover:opacity-90">End call</button>
      ) : (
        <button type="button" onClick={start} className="btn rounded-full px-6 py-3">{status === 'ended' || status === 'error' ? 'Call again' : 'Start call'}</button>
      )}
      <p className="text-[11px] text-slate2">AI assistant. Calls may be transcribed to help the business follow up.</p>
    </div>
  );
}
