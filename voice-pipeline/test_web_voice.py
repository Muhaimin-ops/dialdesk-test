import asyncio
import time
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import web_voice
from pipecat.frames.frames import TTSSpeakFrame


class FakeRequest:
    def __init__(self, payload, authorization="Bearer test-call-token"):
        self.headers = {"authorization": authorization}
        self.payload = payload

    async def json(self):
        return self.payload


class IceCandidatePatchTests(unittest.TestCase):
    def test_forwards_candidates_for_the_authorized_peer(self):
        request = FakeRequest(
            {
                "pc_id": "peer-1",
                "candidates": [
                    {
                        "candidate": "candidate:1 1 UDP 1 192.0.2.1 1234 typ host",
                        "sdp_mid": "0",
                        "sdp_mline_index": 0,
                    }
                ],
            }
        )
        web_voice.authorized_connections["peer-1"] = ("test-call-token", time.monotonic() + 60)
        handler = AsyncMock()

        with patch.object(web_voice.webrtc_handler, "handle_patch_request", handler):
            result = asyncio.run(web_voice.patch_ice_candidates(request))

        self.assertEqual(result, {"status": "success"})
        handler.assert_awaited_once()
        patch_request = handler.await_args.args[0]
        self.assertEqual(patch_request.pc_id, "peer-1")
        self.assertEqual(patch_request.candidates[0].sdp_mid, "0")

    def test_rejects_candidates_without_the_offer_call_token(self):
        request = FakeRequest(
            {"pc_id": "peer-2", "candidates": []},
            authorization="Bearer different-token",
        )
        web_voice.authorized_connections["peer-2"] = ("test-call-token", time.monotonic() + 60)

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(web_voice.patch_ice_candidates(request))

        self.assertEqual(raised.exception.status_code, 401)


class GreetingTests(unittest.TestCase):
    def test_queues_the_business_greeting_directly_to_speech(self):
        worker = AsyncMock()

        asyncio.run(web_voice.queue_initial_greeting(worker, "Hello, thanks for calling."))

        worker.queue_frame.assert_awaited_once()
        frame = worker.queue_frame.await_args.args[0]
        self.assertIsInstance(frame, TTSSpeakFrame)
        self.assertEqual(frame.text, "Hello, thanks for calling.")

    def test_rejects_a_blank_business_greeting(self):
        with self.assertRaisesRegex(ValueError, "non-empty business greeting"):
            asyncio.run(web_voice.queue_initial_greeting(AsyncMock(), "  "))


if __name__ == "__main__":
    unittest.main()
