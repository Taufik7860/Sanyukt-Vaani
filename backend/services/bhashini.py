"""
BHASHINI / ULCA integration.

Flow:

1. Pipeline Config Call
   https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline

   Uses:
       userID
       ulcaApiKey

2. Config response gives:
       serviceId
       modelId
       supported languages
       supported voices
       inference callback URL
       inference authorization key

3. Pipeline Inference Call
   Usually:
   https://dhruva-api.bhashini.gov.in/services/inference/pipeline

The official BHASHINI documentation describes this two-stage flow.

IMPORTANT:
- Never put BHASHINI credentials in React/browser code.
- Keep credentials in .env.
- Never print API keys/tokens in logs.
"""

from __future__ import annotations

import base64
from typing import Any

import requests

from backend.config import settings


# ---------------------------------------------------------------------------
# Language codes
# ---------------------------------------------------------------------------

LANGUAGE_CODES = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
    "bengali": "bn",
    "assamese": "as",
    "gujarati": "gu",
    "kannada": "kn",
    "malayalam": "ml",
    "odia": "or",
    "punjabi": "pa",
    "tamil": "ta",
    "telugu": "te",
    "urdu": "ur",
    "nepali": "ne",
    "sanskrit": "sa",
}


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class BhashiniError(RuntimeError):
    """Raised when a BHASHINI operation fails."""


# ---------------------------------------------------------------------------
# BHASHINI service
# ---------------------------------------------------------------------------

class BhashiniService:

    def __init__(self):
        self.timeout = 60

    # -----------------------------------------------------------------------
    # Language helper
    # -----------------------------------------------------------------------

    @staticmethod
    def code(language: str | None) -> str:
        """
        Convert a language name to its ISO language code.

        Examples:
            hindi   -> hi
            marathi -> mr
            english -> en

        If an ISO code is already supplied, it is returned as-is.
        """
        value = (language or "").strip().lower()

        if not value:
            return ""

        return LANGUAGE_CODES.get(value, value)

    # -----------------------------------------------------------------------
    # Credential validation
    # -----------------------------------------------------------------------

    @staticmethod
    def _check_credentials() -> None:
        """
        Check that the credentials required for the BHASHINI
        Pipeline Config API are present.
        """

        user_id = getattr(settings, "BHASHINI_USER_ID", None)
        api_key = getattr(settings, "BHASHINI_API_KEY", None)

        if not user_id:
            raise BhashiniError(
                "BHASHINI_USER_ID is missing in .env"
            )

        if not api_key:
            raise BhashiniError(
                "BHASHINI_API_KEY is missing in .env"
            )

    # -----------------------------------------------------------------------
    # Build pipeline task configuration
    # -----------------------------------------------------------------------

    def _build_pipeline_tasks(
        self,
        source_language: str | None,
        target_language: str | None,
        tasks: tuple[str, ...],
    ) -> list[dict[str, Any]]:

        pipeline_tasks: list[dict[str, Any]] = []

        source = self.code(source_language)
        target = self.code(target_language)

        for task in tasks:

            task = task.strip().lower()

            if task == "asr":

                if not source:
                    source = "hi"

                pipeline_tasks.append(
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {
                                "sourceLanguage": source
                            }
                        },
                    }
                )

            elif task == "translation":

                if not source or not target:
                    raise BhashiniError(
                        "Source and target language are required "
                        "for translation."
                    )

                pipeline_tasks.append(
                    {
                        "taskType": "translation",
                        "config": {
                            "language": {
                                "sourceLanguage": source,
                                "targetLanguage": target,
                            }
                        },
                    }
                )

            elif task == "tts":

                # TTS uses sourceLanguage according to BHASHINI
                # pipeline configuration documentation.
                tts_language = target or source or "hi"

                pipeline_tasks.append(
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {
                                "sourceLanguage": tts_language
                            }
                        },
                    }
                )

            else:
                raise BhashiniError(
                    f"Unsupported BHASHINI task: {task}"
                )

        return pipeline_tasks

    # -----------------------------------------------------------------------
    # Pipeline Config API
    # -----------------------------------------------------------------------

    def get_pipeline_config(
        self,
        source_language: str | None = None,
        target_language: str | None = None,
        tasks: tuple[str, ...] = ("asr",),
    ) -> dict[str, Any]:
        """
        Call BHASHINI Pipeline Config API.

        This is the first stage of the BHASHINI flow.

        Required headers:
            userID
            ulcaApiKey
        """

        self._check_credentials()

        pipeline_tasks = self._build_pipeline_tasks(
            source_language=source_language,
            target_language=target_language,
            tasks=tasks,
        )

        pipeline_id = getattr(
            settings,
            "BHASHINI_PIPELINE_ID",
            None,
        )

        if not pipeline_id:
            raise BhashiniError(
                "BHASHINI_PIPELINE_ID is missing in .env"
            )

        config_url = getattr(
            settings,
            "BHASHINI_CONFIG_URL",
            None,
        )

        if not config_url:
            raise BhashiniError(
                "BHASHINI_CONFIG_URL is missing in .env"
            )

        body = {
            "pipelineTasks": pipeline_tasks,
            "pipelineRequestConfig": {
                "pipelineId": pipeline_id
            },
        }

        headers = {
            "userID": settings.BHASHINI_USER_ID,
            "ulcaApiKey": settings.BHASHINI_API_KEY,
            "Content-Type": "application/json",
        }

        try:

            response = requests.post(
                config_url,
                headers=headers,
                json=body,
                timeout=self.timeout,
            )

        except requests.RequestException as exc:

            raise BhashiniError(
                f"Unable to connect to BHASHINI Config API: {exc}"
            ) from exc

        if not response.ok:

            # Do NOT expose credentials.
            error_text = response.text[:1500]

            raise BhashiniError(
                f"BHASHINI Config API failed "
                f"({response.status_code}): {error_text}"
            )

        try:
            return response.json()

        except ValueError as exc:

            raise BhashiniError(
                "BHASHINI Config API returned invalid JSON."
            ) from exc

    # -----------------------------------------------------------------------
    # Find task configuration
    # -----------------------------------------------------------------------

    @staticmethod
    def _task_configs(
        config_response: dict[str, Any],
        task: str,
    ) -> list[dict[str, Any]]:
        """
        Return all configurations for a specific task.

        Example:
            task = asr

        returns:
            [
                {
                    "serviceId": "...",
                    "language": {
                        "sourceLanguage": "hi"
                    }
                }
            ]
        """

        for item in config_response.get(
            "pipelineResponseConfig",
            [],
        ):

            if item.get("taskType") == task:

                configs = item.get("config") or []

                if isinstance(configs, list):
                    return configs

        return []

    # -----------------------------------------------------------------------
    # Find correct service for language
    # -----------------------------------------------------------------------

    def _task_config(
        self,
        config_response: dict[str, Any],
        task: str,
        source_language: str | None = None,
        target_language: str | None = None,
    ) -> dict[str, Any]:
        """
        Select the correct BHASHINI service configuration.

        We do NOT blindly select the first service.

        This is important because BHASHINI can return multiple
        services/models for different languages.
        """

        configs = self._task_configs(
            config_response,
            task,
        )

        if not configs:

            raise BhashiniError(
                f"No BHASHINI configuration returned for task '{task}'."
            )

        source = self.code(source_language)
        target = self.code(target_language)

        # ---------------------------------------------------------------
        # Translation
        # ---------------------------------------------------------------

        if task == "translation":

            for config in configs:

                language = config.get("language") or {}

                if (
                    language.get("sourceLanguage") == source
                    and language.get("targetLanguage") == target
                ):
                    return config

            raise BhashiniError(
                f"No BHASHINI translation service found for "
                f"{source} -> {target}."
            )

        # ---------------------------------------------------------------
        # ASR / TTS
        # ---------------------------------------------------------------

        requested_language = target or source

        for config in configs:

            language = config.get("language") or {}

            if language.get("sourceLanguage") == requested_language:
                return config

        # If only one config exists, return it.
        # This is useful for pipelines where BHASHINI returns
        # a single matching configuration.
        if len(configs) == 1:
            return configs[0]

        available = []

        for config in configs:

            language = config.get("language") or {}

            available.append(
                language.get("sourceLanguage")
            )

        raise BhashiniError(
            f"No BHASHINI {task} service found for "
            f"language '{requested_language}'. "
            f"Available languages: {available}"
        )

    # -----------------------------------------------------------------------
    # Get inference endpoint + authorization
    # -----------------------------------------------------------------------

    @staticmethod
    def _inference_credentials(
        config_response: dict[str, Any],
    ) -> tuple[str, str]:
        """
        Extract inference callback URL and Authorization token
        from the BHASHINI Pipeline Config response.

        BHASHINI documentation provides these under:

            pipelineInferenceAPIEndPoint
                callbackUrl
                inferenceApiKey
        """

        endpoint = (
            config_response.get(
                "pipelineInferenceAPIEndPoint"
            )
            or {}
        )

        callback_url = (
            endpoint.get("callbackUrl")
            or getattr(
                settings,
                "BHASHINI_INFERENCE_URL",
                None,
            )
        )

        api = (
            endpoint.get("inferenceApiKey")
            or {}
        )

        token = api.get("value")

        # Optional fallback:
        # If your .env contains BHASHINI_INFERENCE_KEY,
        # use it only if the config response didn't provide one.
        if not token:

            token = getattr(
                settings,
                "BHASHINI_INFERENCE_KEY",
                None,
            )

        if not callback_url:

            raise BhashiniError(
                "BHASHINI inference callback URL was not returned "
                "and BHASHINI_INFERENCE_URL is not configured."
            )

        if not token:

            raise BhashiniError(
                "BHASHINI config response did not contain an "
                "inference API key."
            )

        return callback_url, token

    # -----------------------------------------------------------------------
    # Pipeline inference call
    # -----------------------------------------------------------------------

    def _infer(
        self,
        body: dict[str, Any],
        config_response: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Execute BHASHINI Pipeline Compute / Inference call.
        """

        callback_url, token = self._inference_credentials(
            config_response
        )

        try:

            response = requests.post(
                callback_url,
                headers={
                    "Authorization": token,
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=self.timeout,
            )

        except requests.RequestException as exc:

            raise BhashiniError(
                f"Unable to connect to BHASHINI Inference API: {exc}"
            ) from exc

        if not response.ok:

            error_text = response.text[:1500]

            raise BhashiniError(
                f"BHASHINI Inference failed "
                f"({response.status_code}): {error_text}"
            )

        try:

            return response.json()

        except ValueError as exc:

            raise BhashiniError(
                "BHASHINI Inference API returned invalid JSON."
            ) from exc

    # -----------------------------------------------------------------------
    # Test User ID + Udyat Key
    # -----------------------------------------------------------------------

    def test_connection(self) -> dict[str, Any]:
        """
        Test BHASHINI credentials.

        This calls the Pipeline Config API.

        It does NOT send any audio.

        If this returns success=True, the combination:

            BHASHINI_USER_ID
            BHASHINI_API_KEY

        was accepted by the BHASHINI Config API.
        """

        config = self.get_pipeline_config(
            tasks=("asr",)
        )

        languages = config.get(
            "languages",
            []
        )

        asr_configs = self._task_configs(
            config,
            "asr"
        )

        tts_configs = self._task_configs(
            config,
            "tts"
        )

        return {
            "success": True,
            "message": (
                "BHASHINI Pipeline Config API authentication "
                "was successful."
            ),
            "pipeline_id": getattr(
                settings,
                "BHASHINI_PIPELINE_ID",
                None,
            ),
            "languages_count": len(languages),
            "asr_services": len(asr_configs),
            "tts_services": len(tts_configs),
            "inference_endpoint_received": bool(
                config.get(
                    "pipelineInferenceAPIEndPoint"
                )
            ),
        }

    # -----------------------------------------------------------------------
    # Translation
    # -----------------------------------------------------------------------

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """
        Translate text using BHASHINI.
        """

        source = self.code(source_language)
        target = self.code(target_language)

        config = self.get_pipeline_config(
            source_language=source,
            target_language=target,
            tasks=("translation",),
        )

        service = self._task_config(
            config,
            "translation",
            source_language=source,
            target_language=target,
        )

        body = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source,
                            "targetLanguage": target,
                        },
                        "serviceId": service["serviceId"],
                    },
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            },
        }

        result = self._infer(
            body,
            config,
        )

        try:

            return (
                result["pipelineResponse"][0]
                ["output"][0]
                ["target"]
            )

        except (KeyError, IndexError, TypeError) as exc:

            raise BhashiniError(
                "Unexpected BHASHINI translation response."
            ) from exc

    # -----------------------------------------------------------------------
    # Speech to Text / ASR
    # -----------------------------------------------------------------------

    def speech_to_text(
        self,
        audio_bytes: bytes,
        source_language: str | None = None,
        audio_format: str = "wav",
        sampling_rate: int = 16000,
    ) -> dict[str, str]:
        """
        Convert speech audio to text.

        BHASHINI ASR request requires:
            language
            serviceId
            audioFormat
            samplingRate
            base64 audioContent
        """

        if not audio_bytes:
            raise BhashiniError(
                "No audio data was provided."
            )

        source = self.code(
            source_language or "hi"
        )

        config = self.get_pipeline_config(
            source_language=source,
            tasks=("asr",),
        )

        service = self._task_config(
            config,
            "asr",
            source_language=source,
        )

        body = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": source
                        },
                        "serviceId": service["serviceId"],
                        "audioFormat": audio_format,
                        "samplingRate": sampling_rate,
                    },
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": ""
                    }
                ],
                "audio": [
                    {
                        "audioContent": base64.b64encode(
                            audio_bytes
                        ).decode("utf-8")
                    }
                ],
            },
        }

        result = self._infer(
            body,
            config,
        )

        try:

            item = result["pipelineResponse"][0]

            output = item.get("output") or []

            text = ""

            if output:
                text = output[0].get(
                    "source",
                    ""
                )

            return {
                "text": text,
                "language": source,
            }

        except (
            KeyError,
            IndexError,
            TypeError,
        ) as exc:

            raise BhashiniError(
                "Unexpected BHASHINI ASR response."
            ) from exc

    # -----------------------------------------------------------------------
    # Text to Speech / TTS
    # -----------------------------------------------------------------------

    def text_to_speech(
        self,
        text: str,
        language: str,
        gender: str = "female",
        sampling_rate: int = 22050,
    ) -> bytes:
        """
        Convert text to speech using BHASHINI.

        gender:
            male
            female
        """

        if not text or not text.strip():
            raise BhashiniError(
                "No text was provided for TTS."
            )

        target = self.code(
            language
        )

        gender = gender.strip().lower()

        if gender not in {
            "male",
            "female",
        }:
            raise BhashiniError(
                "TTS gender must be 'male' or 'female'."
            )

        config = self.get_pipeline_config(
            source_language=target,
            target_language=target,
            tasks=("tts",),
        )

        service = self._task_config(
            config,
            "tts",
            source_language=target,
        )

        # ---------------------------------------------------------------
        # Verify requested voice is supported
        # ---------------------------------------------------------------

        supported_voices = service.get(
            "supportedVoices"
        ) or []

        if supported_voices:

            normalized_voices = {
                str(voice).lower()
                for voice in supported_voices
            }

            if gender not in normalized_voices:

                raise BhashiniError(
                    f"Voice '{gender}' is not supported by "
                    f"the selected BHASHINI TTS service. "
                    f"Available voices: {supported_voices}"
                )

        body = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": target
                        },
                        "serviceId": service["serviceId"],
                        "gender": gender,
                        "samplingRate": sampling_rate,
                    },
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            },
        }

        result = self._infer(
            body,
            config,
        )

        try:

            pipeline_response = (
                result["pipelineResponse"][0]
            )

            audio = (
                pipeline_response.get("audio")
                or []
            )

            if (
                not audio
                or not audio[0].get("audioContent")
            ):
                raise BhashiniError(
                    "BHASHINI TTS returned no audio content."
                )

            return base64.b64decode(
                audio[0]["audioContent"]
            )

        except (
            KeyError,
            IndexError,
            TypeError,
        ) as exc:

            raise BhashiniError(
                "Unexpected BHASHINI TTS response."
            ) from exc


# ---------------------------------------------------------------------------
# Singleton instance
# ---------------------------------------------------------------------------

bhashini = BhashiniService()