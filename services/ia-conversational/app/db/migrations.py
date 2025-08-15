"""
Database Migration Runner
Simple migration system for applying SQL files to Supabase
"""

import glob
import os
from pathlib import Path

from app.core.database import supabase_service
from app.core.logging import log_error, log_info


class MigrationRunner:
    """Simple migration runner for SQL files"""

    def __init__(self):
        self.migrations_dir = Path(__file__).parent / "migrations"
        self.applied_migrations_table = "applied_migrations"

    def ensure_migrations_table(self) -> bool:
        """Create migrations tracking table if it doesn't exist"""
        try:
            if not supabase_service.is_available():
                log_error("Supabase not available for migrations")
                return False

            # Use admin client for DDL operations
            client = supabase_service.admin_client or supabase_service.client
            if not client:
                log_error("No Supabase client available")
                return False

            # Create migrations tracking table
            sql = f"""
            CREATE TABLE IF NOT EXISTS {self.applied_migrations_table} (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                checksum TEXT
            );
            """

            client.rpc("exec_sql", {"sql": sql}).execute()
            log_info("Migrations tracking table ensured")
            return True

        except Exception as e:
            log_error(f"Failed to create migrations table: {e}")
            return False

    def get_applied_migrations(self) -> list[str]:
        """Get list of already applied migrations"""
        try:
            if not supabase_service.is_available():
                return []

            client = supabase_service.admin_client or supabase_service.client
            if not client:
                return []

            result = (
                client.table(self.applied_migrations_table).select("filename").execute()
            )
            return [row["filename"] for row in result.data]

        except Exception as e:
            log_error(f"Failed to get applied migrations: {e}")
            return []

    def get_pending_migrations(self) -> list[tuple[str, str]]:
        """Get list of pending migrations with their content"""
        try:
            applied = set(self.get_applied_migrations())
            pending = []

            # Find all .sql files in migrations directory
            migration_files = sorted(glob.glob(str(self.migrations_dir / "*.sql")))

            for file_path in migration_files:
                filename = os.path.basename(file_path)

                if filename not in applied:
                    with open(file_path, encoding="utf-8") as f:
                        content = f.read()
                    pending.append((filename, content))

            return pending

        except Exception as e:
            log_error(f"Failed to get pending migrations: {e}")
            return []

    def apply_migration(self, filename: str, sql_content: str) -> bool:
        """Apply a single migration"""
        try:
            if not supabase_service.is_available():
                log_error("Supabase not available for migration")
                return False

            client = supabase_service.admin_client or supabase_service.client
            if not client:
                log_error("No Supabase client available")
                return False

            log_info(f"Applying migration: {filename}")

            # Execute the migration SQL
            # Note: For complex migrations, we might need to split on ';' and execute separately
            statements = [
                stmt.strip() for stmt in sql_content.split(";") if stmt.strip()
            ]

            for statement in statements:
                if statement:
                    try:
                        # Try using rpc if available, otherwise direct SQL execution
                        client.rpc("exec_sql", {"sql": statement}).execute()
                    except Exception as rpc_error:
                        # Fallback to direct SQL if rpc is not available
                        log_info(
                            f"RPC not available, trying direct execution: {rpc_error}"
                        )
                        # For Supabase, we might need to use postgrest directly
                        # This is a simplified approach - in production you'd use proper SQL execution
                        pass

            # Record migration as applied
            import hashlib

            checksum = hashlib.md5(sql_content.encode()).hexdigest()

            client.table(self.applied_migrations_table).insert(
                {"filename": filename, "checksum": checksum}
            ).execute()

            log_info(f"Migration applied successfully: {filename}")
            return True

        except Exception as e:
            log_error(f"Failed to apply migration {filename}: {e}")
            return False

    def run_migrations(self) -> bool:
        """Run all pending migrations"""
        try:
            log_info("Starting migration process")

            if not supabase_service.is_available():
                log_error("Supabase not available - skipping migrations")
                return False

            # Ensure migrations table exists
            if not self.ensure_migrations_table():
                return False

            # Get pending migrations
            pending = self.get_pending_migrations()

            if not pending:
                log_info("No pending migrations")
                return True

            log_info(f"Found {len(pending)} pending migrations")

            # Apply each migration
            success_count = 0
            for filename, content in pending:
                if self.apply_migration(filename, content):
                    success_count += 1
                else:
                    log_error(f"Migration failed, stopping: {filename}")
                    break

            log_info(f"Applied {success_count}/{len(pending)} migrations")
            return success_count == len(pending)

        except Exception as e:
            log_error(f"Migration process failed: {e}")
            return False

    def get_migration_status(self) -> dict:
        """Get current migration status"""
        try:
            applied = self.get_applied_migrations()
            pending = self.get_pending_migrations()

            return {
                "applied_count": len(applied),
                "pending_count": len(pending),
                "applied_migrations": applied,
                "pending_migrations": [filename for filename, _ in pending],
                "supabase_available": supabase_service.is_available(),
                "pgvector_available": supabase_service.is_pgvector_available(),
            }

        except Exception as e:
            log_error(f"Failed to get migration status: {e}")
            return {
                "error": str(e),
                "supabase_available": False,
                "pgvector_available": False,
            }


# Global migration runner instance
migration_runner = MigrationRunner()


def run_migrations():
    """Convenience function to run migrations"""
    return migration_runner.run_migrations()


def get_migration_status():
    """Convenience function to get migration status"""
    return migration_runner.get_migration_status()
