import json
import os
import unittest
from io import BytesIO
from unittest.mock import MagicMock, patch

import local_voice


class CheckLlamaServerTests(unittest.TestCase):
    def test_defaults_target_configured_ollama_model(self):
        self.assertEqual(local_voice.LLAMA_BASE_URL, "http://127.0.0.1:11434/v1")
        self.assertEqual(local_voice.LLAMA_MODEL, "gemma3:1b")

    @patch("local_voice.urlopen")
    def test_returns_loaded_model_alias(self, urlopen):
        urlopen.return_value = BytesIO(
            json.dumps({"data": [{"id": "gemma3:1b"}]}).encode()
        )

        result = local_voice.check_llama_server(
            "http://localhost:8080/v1",
            "gemma3:1b",
        )

        self.assertEqual(
            result,
            {
                "url": "http://localhost:8080/v1/models",
                "model": "gemma3:1b",
            },
        )

    @patch("local_voice.urlopen")
    def test_rejects_unloaded_model_alias(self, urlopen):
        urlopen.return_value = BytesIO(
            json.dumps({"data": [{"id": "other-model"}]}).encode()
        )

        with self.assertRaisesRegex(RuntimeError, "ollama run gemma3:1b"):
            local_voice.check_llama_server(
                "http://localhost:8080/v1",
                "gemma3:1b",
            )


class DependencyConfigurationTests(unittest.TestCase):
    def test_local_requirements_keep_microphone_audio_extra(self):
        requirements_path = os.path.join(
            os.path.dirname(__file__), "requirements-local.txt"
        )
        with open(requirements_path, encoding="utf-8") as requirements_file:
            requirements = requirements_file.read()

        self.assertIn("pipecat-ai[local]", requirements)

    def test_deployment_requirements_omit_local_audio_extra(self):
            requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
            with open(requirements_path, encoding="utf-8") as requirements_file:
                requirements = requirements_file.read()

            pipecat_requirement = next(
                line for line in requirements.splitlines() if line.startswith("pipecat-ai[")
            )
            self.assertNotIn(
                "local",
                pipecat_requirement.partition("[")[2].partition("]")[0].split(","),
                "The Vercel Python runtime cannot compile PyAudio without PortAudio headers.",
            )


class CheckGroqApiTests(unittest.TestCase):
    @patch.dict(os.environ, {"GROQ_API_KEY": "test-key"})
    @patch("local_voice.urlopen")
    def test_validates_key_without_returning_model_data(self, urlopen):
        response = MagicMock()
        response.status = 200
        response.read.return_value = json.dumps({"data": []}).encode()
        response.__enter__.return_value = response
        urlopen.return_value = response

        self.assertEqual(local_voice.check_groq_api(), {"status": 200, "ok": True})
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.groq.com/openai/v1/models")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")

    @patch.dict(os.environ, {"GROQ_API_KEY": "test-key"})
    @patch("local_voice.urlopen", side_effect=local_voice.HTTPError(
        "https://api.groq.com/openai/v1/models", 401, "Unauthorized", {}, None
    ))
    def test_reports_auth_failure_without_response_body(self, _urlopen):
        with self.assertRaisesRegex(RuntimeError, "HTTP 401"):
            local_voice.check_groq_api()


class ConfigurationTests(unittest.TestCase):
    @patch.dict(os.environ, {"GROQ_API_KEY": ""})
    @patch("local_voice.load_groq_key_from_project_env")
    def test_requires_groq_key(self, _load_key):
        with self.assertRaisesRegex(RuntimeError, "GROQ_API_KEY is required"):
            local_voice.check_configuration()

    @patch.dict(os.environ, {"GROQ_API_KEY": "configured-for-test"})
    @patch("local_voice.check_llama_server")
    def test_checks_llama_after_key_is_configured(self, check_server):
        expected = {"url": "http://localhost:8080/v1/models", "model": "gemma3:1b"}
        check_server.return_value = expected

        self.assertEqual(local_voice.check_configuration(), expected)
        check_server.assert_called_once()


if __name__ == "__main__":
    unittest.main()
