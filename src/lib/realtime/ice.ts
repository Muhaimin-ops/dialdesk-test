type LocalOfferPeer = {
  createOffer: RTCPeerConnection['createOffer'];
  setLocalDescription: RTCPeerConnection['setLocalDescription'];
  localDescription: Pick<RTCSessionDescription, 'type' | 'sdp'> | null;
};

export interface IceCandidatePatch {
  candidate: string;
  sdp_mid: string;
  sdp_mline_index: number;
}

export async function createLocalOffer(peer: LocalOfferPeer): Promise<Pick<RTCSessionDescription, 'type' | 'sdp'>> {
  await peer.setLocalDescription(await peer.createOffer());
  const description = peer.localDescription;
  if (!description?.sdp) throw new Error('The browser did not create a WebRTC offer.');
  return description;
}

export function iceCandidatePatch(candidate: RTCIceCandidateInit): IceCandidatePatch | null {
  if (!candidate.candidate) return null;
  if (candidate.sdpMid === null || candidate.sdpMid === undefined ||
      candidate.sdpMLineIndex === null || candidate.sdpMLineIndex === undefined) {
    throw new Error('The browser returned an incomplete ICE candidate.');
  }
  return {
    candidate: candidate.candidate,
    sdp_mid: candidate.sdpMid,
    sdp_mline_index: candidate.sdpMLineIndex,
  };
}

export function sdpCandidateLines(sdp: string): Set<string> {
  return new Set(
    sdp.split(/\r?\n/).filter((line) => line.startsWith('a=candidate:')).map((line) => line.slice(2)),
  );
}
