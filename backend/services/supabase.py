from __future__ import annotations

from backend.config import settings

try:
    from supabase import create_client
except ImportError:
    create_client = None


class SupabaseService:
    def __init__(self):
        self.client = None
        if settings.SUPABASE_URL and settings.SUPABASE_KEY and create_client:
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY,
            )

    def log_chat_history(
        self,
        user_id: str,
        query: str,
        answer: str,
        sources: list,
    ):
        if not self.client:
            return
        try:
            self.client.table("chat_history").insert({
                "user_id": user_id,
                "user_query": query,
                "bot_response": answer,
                "sources": sources,
            }).execute()
        except Exception as exc:
            # History must not break the chatbot.
            print("Supabase history warning:", exc)

    def get_chat_history(self, user_id: str):
        if not self.client:
            return []
        response = (
            self.client.table("chat_history")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []


supabase_service = SupabaseService()
