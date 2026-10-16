import { describe, expect, it, vi } from 'vitest';
import { createLocalOffer, iceCandidatePatch, sdpCandidateLines } from './ice';

describe('WebRTC ICE signaling', () => {
  it('creates the offer without waiting for ICE gathering to complete', async () => {
    const localDescription = { type: 'offer' as const, sdp: 'v=0\r\na=candidate:host\r\n' };
    const peer = {
      createOffer: vi.fn().mockResolvedValue({ type: 'offer' as const, sdp: 'v=0\r\n' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      localDescription,
      iceGatheringState: 'gathering' as RTCIceGatheringState,
    };

    await expect(createLocalOffer(peer)).resolves.toBe(localDescription);
    expect(peer.createOffer).toHaveBeenCalledOnce();
    expect(peer.setLocalDescription).toHaveBeenCalledOnce();
  });

  it('formats trickled candidates for the Pipecat PATCH contract', () => {
    expect(iceCandidatePatch({
      candidate: 'candidate:1 1 UDP 1 192.0.2.1 1234 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    })).toEqual({
      candidate: 'candidate:1 1 UDP 1 192.0.2.1 1234 typ host',
      sdp_mid: '0',
      sdp_mline_index: 0,
    });
  });

  it('identifies candidates already included in the initial offer', () => {
    expect(sdpCandidateLines('v=0\r\na=candidate:host\r\na=mid:0\r\n'))
      .toEqual(new Set(['candidate:host']));
  });
});
