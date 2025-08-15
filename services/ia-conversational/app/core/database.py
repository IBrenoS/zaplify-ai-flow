"""
Supabase connection and configuration
"""

import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from app.core.logging import get_logger

# Load environment variables first
load_dotenv()

logger = get_logger(__name__)


class SupabaseService:
    """Supabase service with feature flag support"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        self.client: Client | None = None
        self.admin_client: Client | None = None
        self._available = False
        self._pgvector_available = False

        if self.supabase_url and self.supabase_key:
            try:
                # Create client with anon key
                self.client = create_client(self.supabase_url, self.supabase_key)

                # Create admin client with service role key if available
                if self.supabase_service_key:
                    self.admin_client = create_client(
                        self.supabase_url, self.supabase_service_key
                    )

                # Test connection by trying to access a simple table
                self._test_connection()

                self._available = True
                logger.info("Supabase connection established")

                # Check pgvector availability
                self._check_pgvector()

            except Exception as e:
                logger.error(f"Supabase connection failed: {e}")
                self._available = False
        else:
            logger.warning(
                "SUPABASE_URL or SUPABASE_KEY not set - Supabase features disabled"
            )

    def _test_connection(self):
        """Test Supabase connection"""
        try:
            # Simple test - try to get auth user (will fail but tests connection)
            self.client.auth.get_user()
        except Exception as e:
            # This is expected if no user is logged in, but it tests the connection
            if "invalid JWT" in str(e).lower() or "jwt" in str(e).lower():
                # This means connection is working, just no valid JWT
                pass
            else:
                raise e

    def _check_pgvector(self):
        """Check if pgvector extension is available"""
        try:
            if self.admin_client:
                # Try to execute a simple vector operation via RPC
                self.admin_client.rpc("check_pgvector_extension").execute()
                self._pgvector_available = True
                logger.info("pgvector extension detected in Supabase")
            else:
                logger.warning(
                    "Cannot check pgvector - service role key not configured"
                )
                self._pgvector_available = False
        except Exception as e:
            logger.warning(f"pgvector extension check failed: {e}")
            self._pgvector_available = False

    def is_available(self) -> bool:
        """Check if Supabase is available"""
        return self._available

    def is_pgvector_available(self) -> bool:
        """Check if pgvector is available"""
        return self._pgvector_available

    def get_client(self) -> Client | None:
        """Get Supabase client"""
        if not self.is_available():
            raise Exception("Supabase not available")
        return self.client

    def get_admin_client(self) -> Client | None:
        """Get Supabase admin client"""
        if not self.is_available():
            raise Exception("Supabase not available")
        if not self.admin_client:
            raise Exception("Supabase service role key not configured")
        return self.admin_client

    def create_assistant(
        self, tenant_id: str, assistant_config: dict[str, Any]
    ) -> str | None:
        """Create assistant configuration in Supabase"""
        if not self.is_available():
            return None

        try:
            client = self.get_admin_client() if self.admin_client else self.get_client()

            data = {
                "tenant_id": tenant_id,
                "name": assistant_config.get("name"),
                "config": assistant_config,
                "status": "active",
            }

            result = client.table("assistant_configs").insert(data).execute()

            if result.data:
                assistant_id = result.data[0]["id"]
                logger.info(f"Assistant created in Supabase: {assistant_id}")
                return assistant_id

            return None

        except Exception as e:
            logger.error(f"Failed to create assistant in Supabase: {e}")
            return None

    def get_assistant(self, tenant_id: str, assistant_id: str) -> dict[str, Any] | None:
        """Get assistant configuration from Supabase"""
        if not self.is_available():
            return None

        try:
            client = self.get_client()

            result = (
                client.table("assistant_configs")
                .select("*")
                .eq("id", assistant_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            if result.data:
                return result.data[0]

            return None

        except Exception as e:
            logger.error(f"Failed to get assistant from Supabase: {e}")
            return None

    def update_assistant(
        self, tenant_id: str, assistant_id: str, assistant_config: dict[str, Any]
    ) -> bool:
        """Update assistant configuration in Supabase"""
        if not self.is_available():
            return False

        try:
            client = self.get_admin_client() if self.admin_client else self.get_client()

            data = {
                "name": assistant_config.get("name"),
                "config": assistant_config,
                "updated_at": "now()",
            }

            result = (
                client.table("assistant_configs")
                .update(data)
                .eq("id", assistant_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Failed to update assistant in Supabase: {e}")
            return False

    def delete_assistant(self, tenant_id: str, assistant_id: str) -> bool:
        """Delete assistant configuration from Supabase"""
        if not self.is_available():
            return False

        try:
            client = self.get_admin_client() if self.admin_client else self.get_client()

            result = (
                client.table("assistant_configs")
                .delete()
                .eq("id", assistant_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Failed to delete assistant from Supabase: {e}")
            return False

    def search_documents(
        self, tenant_id: str, query_embedding: list[float], limit: int = 5
    ) -> list[dict[str, Any]]:
        """Search documents using pgvector similarity"""
        if not self.is_available() or not self.is_pgvector_available():
            return []

        try:
            client = self.get_admin_client() if self.admin_client else self.get_client()

            # Use RPC function for vector similarity search
            result = client.rpc(
                "search_documents",
                {
                    "tenant_id": tenant_id,
                    "query_embedding": query_embedding,
                    "match_threshold": 0.7,
                    "match_count": limit,
                },
            ).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Failed to search documents in Supabase: {e}")
            return []


# Global Supabase service instance
supabase_service = SupabaseService()

# Maintain compatibility with old db_service name
db_service = supabase_service
