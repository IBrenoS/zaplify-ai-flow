"""
Feature flags configuration for graceful service degradation
"""

import os
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class FeatureFlags:
    """Feature flags service for enabling/disabling features gracefully"""

    def __init__(self):
        # Default feature flags - can be overridden by environment variables
        self.default_flags = {
            "llm_service": True,
            "rag_search": True,
            "redis_cache": True,
            "sentiment_analysis": True,
            "intent_detection": True,
            "conversation_memory": True,
            "assistant_management": True,
            "health_checks": True,
        }

        self.flags = self._load_flags()
        logger.info(f"Feature flags loaded: {self.flags}")

    def _load_flags(self) -> dict[str, bool]:
        """Load feature flags from environment variables"""
        flags = self.default_flags.copy()

        # Override with environment variables if set
        for flag_name in flags.keys():
            env_var = f"FEATURE_{flag_name.upper()}"
            env_value = os.getenv(env_var)

            if env_value is not None:
                # Convert string to boolean
                flags[flag_name] = env_value.lower() in ("true", "1", "yes", "on")
                logger.info(
                    f"Feature flag override: {flag_name} = {flags[flag_name]} (from {env_var})"
                )

        return flags

    def is_enabled(self, feature_name: str) -> bool:
        """Check if a feature is enabled"""
        return self.flags.get(feature_name, False)

    def is_disabled(self, feature_name: str) -> bool:
        """Check if a feature is disabled"""
        return not self.is_enabled(feature_name)

    def enable_feature(self, feature_name: str) -> None:
        """Enable a feature at runtime"""
        self.flags[feature_name] = True
        logger.info(f"Feature enabled: {feature_name}")

    def disable_feature(self, feature_name: str) -> None:
        """Disable a feature at runtime"""
        self.flags[feature_name] = False
        logger.info(f"Feature disabled: {feature_name}")

    def get_all_flags(self) -> dict[str, bool]:
        """Get all feature flags"""
        return self.flags.copy()

    def get_enabled_features(self) -> set[str]:
        """Get set of enabled features"""
        return {name for name, enabled in self.flags.items() if enabled}

    def get_disabled_features(self) -> set[str]:
        """Get set of disabled features"""
        return {name for name, enabled in self.flags.items() if not enabled}

    def reload_flags(self) -> None:
        """Reload feature flags from environment"""
        old_flags = self.flags.copy()
        self.flags = self._load_flags()

        # Log changes
        for flag_name, new_value in self.flags.items():
            old_value = old_flags.get(flag_name)
            if old_value != new_value:
                logger.info(
                    f"Feature flag changed: {flag_name} {old_value} -> {new_value}"
                )

    def get_health_status(self) -> dict[str, Any]:
        """Get feature flags health status"""
        return {
            "enabled_features": list(self.get_enabled_features()),
            "disabled_features": list(self.get_disabled_features()),
            "total_features": len(self.flags),
            "flags": self.flags,
        }


# Global feature flags instance
feature_flags = FeatureFlags()
