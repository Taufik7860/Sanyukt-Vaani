from backend.services.bhashini import bhashini, BhashiniError


def main():
    print("\n================================")
    print("       BHASHINI CONNECTION TEST")
    print("================================\n")

    try:
        print("Connecting to BHASHINI...")
        print("Please wait...\n")

        result = bhashini.test_connection()

        print("================================")
        print("   BHASHINI CONNECTION SUCCESS")
        print("================================\n")

        print("Message:", result.get("message"))
        print("Pipeline ID:", result.get("pipeline_id"))
        print("Languages Count:", result.get("languages_count"))
        print("ASR Services:", result.get("asr_services"))
        print("TTS Services:", result.get("tts_services"))
        print(
            "Inference Endpoint Received:",
            result.get("inference_endpoint_received")
        )

        print("\nBHASHINI credentials and Pipeline Config API are working.")

    except BhashiniError as e:
        print("================================")
        print("   BHASHINI CONNECTION FAILED")
        print("================================\n")

        print("Error:")
        print(e)

        print("\nPlease check:")
        print("1. BHASHINI_USER_ID in .env")
        print("2. BHASHINI_API_KEY in .env")
        print("3. BHASHINI_PIPELINE_ID in .env")
        print("4. BHASHINI_CONFIG_URL in .env")
        print("5. Internet connection")

    except Exception as e:
        print("================================")
        print("      UNEXPECTED ERROR")
        print("================================\n")

        print("Error Type:", type(e).__name__)
        print("Error:", e)


if __name__ == "__main__":
    main()