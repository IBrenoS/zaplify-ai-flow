import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import re

from services.cache_service import CacheService
from config import analytics_config

logger = logging.getLogger(__name__)

class ConversationAnalyticsService:
    def __init__(self, cache_service: CacheService):
        self.cache_service = cache_service
        self.db_connection = None

    async def initialize(self):
        """Initialize conversation analytics service"""
        logger.info("Conversation analytics service initialized")

    async def get_conversation_analytics(
        self,
        assistant_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get comprehensive conversation analytics"""

        cache_key = self.cache_service.generate_cache_key(
            "conversation_analytics", "summary",
            assistant_id=assistant_id,
            start_date=start_date,
            end_date=end_date
        )

        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock conversation analytics data
            analytics_data = {
                "overview": {
                    "total_conversations": 1456,
                    "successful_conversations": 1234,
                    "success_rate": 84.7,
                    "average_conversation_length": 8.5,  # messages
                    "average_duration": 12.3,  # minutes
                    "total_messages": 12348,
                    "unique_users": 892
                },
                "conversation_quality": {
                    "resolution_rate": 78.5,
                    "escalation_rate": 12.3,
                    "satisfaction_score": 4.2,
                    "response_accuracy": 91.2,
                    "first_contact_resolution": 65.8
                },
                "engagement_metrics": {
                    "messages_per_conversation": 8.5,
                    "user_response_rate": 89.3,
                    "conversation_completion_rate": 84.7,
                    "repeat_user_rate": 34.2,
                    "bounce_rate": 15.3
                },
                "temporal_patterns": {
                    "peak_hours": [9, 10, 11, 14, 15, 16],
                    "busiest_days": ["Monday", "Tuesday", "Wednesday"],
                    "hourly_distribution": self._generate_hourly_distribution(),
                    "daily_trends": self._generate_daily_trends()
                },
                "assistant_performance": {
                    "response_time": {
                        "average": 1.2,  # seconds
                        "median": 0.8,
                        "95th_percentile": 3.5
                    },
                    "accuracy_score": 91.2,
                    "learning_progress": 8.5,  # improvement percentage
                    "knowledge_gaps": [
                        "Technical product details",
                        "Advanced pricing options",
                        "Integration capabilities"
                    ]
                }
            }

            await self.cache_service.cache_metrics(cache_key, analytics_data, 1800)  # 30 minutes cache
            return analytics_data

        except Exception as e:
            logger.error(f"Error getting conversation analytics: {e}")
            raise

    async def get_sentiment_analysis(
        self,
        assistant_id: Optional[str] = None,
        time_range: str = "7d"
    ) -> Dict[str, Any]:
        """Get sentiment analysis of conversations"""

        cache_key = self.cache_service.generate_cache_key(
            "sentiment_analysis", "conversations",
            assistant_id=assistant_id,
            time_range=time_range
        )

        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock sentiment analysis data
            sentiment_data = {
                "overall_sentiment": {
                    "positive": 68.5,
                    "neutral": 22.8,
                    "negative": 8.7,
                    "average_score": 0.72  # -1 to 1 scale
                },
                "sentiment_trends": [
                    {
                        "date": (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d"),
                        "positive": 65.2,
                        "neutral": 25.1,
                        "negative": 9.7,
                        "score": 0.68
                    },
                    {
                        "date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
                        "positive": 67.8,
                        "neutral": 23.4,
                        "negative": 8.8,
                        "score": 0.71
                    },
                    {
                        "date": (datetime.utcnow() - timedelta(days=4)).strftime("%Y-%m-%d"),
                        "positive": 69.1,
                        "neutral": 22.1,
                        "negative": 8.8,
                        "score": 0.73
                    },
                    {
                        "date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"),
                        "positive": 70.5,
                        "neutral": 21.8,
                        "negative": 7.7,
                        "score": 0.75
                    },
                    {
                        "date": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"),
                        "positive": 68.9,
                        "neutral": 23.2,
                        "negative": 7.9,
                        "score": 0.73
                    },
                    {
                        "date": (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
                        "positive": 71.2,
                        "neutral": 21.5,
                        "negative": 7.3,
                        "score": 0.76
                    },
                    {
                        "date": datetime.utcnow().strftime("%Y-%m-%d"),
                        "positive": 68.5,
                        "neutral": 22.8,
                        "negative": 8.7,
                        "score": 0.72
                    }
                ],
                "sentiment_by_topic": [
                    {
                        "topic": "Product Features",
                        "positive": 75.2,
                        "neutral": 18.5,
                        "negative": 6.3,
                        "conversation_count": 234
                    },
                    {
                        "topic": "Pricing",
                        "positive": 58.1,
                        "neutral": 28.7,
                        "negative": 13.2,
                        "conversation_count": 156
                    },
                    {
                        "topic": "Support",
                        "positive": 82.4,
                        "neutral": 14.2,
                        "negative": 3.4,
                        "conversation_count": 189
                    },
                    {
                        "topic": "Technical Issues",
                        "positive": 45.6,
                        "neutral": 31.2,
                        "negative": 23.2,
                        "conversation_count": 78
                    }
                ],
                "negative_feedback_analysis": {
                    "common_complaints": [
                        {
                            "issue": "Response time too slow",
                            "frequency": 34,
                            "severity": "medium"
                        },
                        {
                            "issue": "Feature not working as expected",
                            "frequency": 28,
                            "severity": "high"
                        },
                        {
                            "issue": "Unclear pricing information",
                            "frequency": 19,
                            "severity": "low"
                        }
                    ],
                    "resolution_suggestions": [
                        "Improve response time optimization",
                        "Enhanced feature documentation",
                        "Clearer pricing communication"
                    ]
                }
            }

            await self.cache_service.cache_metrics(cache_key, sentiment_data, 1800)  # 30 minutes cache
            return sentiment_data

        except Exception as e:
            logger.error(f"Error getting sentiment analysis: {e}")
            raise

    async def get_conversation_topics(
        self,
        assistant_id: Optional[str] = None,
        time_range: str = "7d",
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get most discussed conversation topics"""

        cache_key = self.cache_service.generate_cache_key(
            "conversation_topics", "trending",
            assistant_id=assistant_id,
            time_range=time_range,
            limit=limit
        )

        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock topics data
            topics_data = {
                "trending_topics": [
                    {
                        "topic": "Product Features",
                        "frequency": 234,
                        "percentage": 16.1,
                        "sentiment_score": 0.68,
                        "trending": True,
                        "growth": 12.5,
                        "keywords": ["features", "functionality", "capabilities", "tools"]
                    },
                    {
                        "topic": "Integration Setup",
                        "frequency": 189,
                        "percentage": 13.0,
                        "sentiment_score": 0.45,
                        "trending": True,
                        "growth": 8.2,
                        "keywords": ["integration", "setup", "configuration", "connect"]
                    },
                    {
                        "topic": "Pricing Information",
                        "frequency": 156,
                        "percentage": 10.7,
                        "sentiment_score": 0.32,
                        "trending": False,
                        "growth": -2.1,
                        "keywords": ["price", "cost", "billing", "payment", "subscription"]
                    },
                    {
                        "topic": "Technical Support",
                        "frequency": 145,
                        "percentage": 10.0,
                        "sentiment_score": 0.78,
                        "trending": False,
                        "growth": 1.5,
                        "keywords": ["help", "support", "issue", "problem", "bug"]
                    },
                    {
                        "topic": "Account Management",
                        "frequency": 123,
                        "percentage": 8.4,
                        "sentiment_score": 0.55,
                        "trending": True,
                        "growth": 15.3,
                        "keywords": ["account", "profile", "settings", "management"]
                    },
                    {
                        "topic": "Performance Questions",
                        "frequency": 98,
                        "percentage": 6.7,
                        "sentiment_score": 0.41,
                        "trending": False,
                        "growth": -5.2,
                        "keywords": ["performance", "speed", "optimization", "efficiency"]
                    },
                    {
                        "topic": "Training Requests",
                        "frequency": 87,
                        "percentage": 6.0,
                        "sentiment_score": 0.72,
                        "trending": True,
                        "growth": 22.1,
                        "keywords": ["training", "tutorial", "guide", "learn", "documentation"]
                    },
                    {
                        "topic": "Feature Requests",
                        "frequency": 76,
                        "percentage": 5.2,
                        "sentiment_score": 0.81,
                        "trending": True,
                        "growth": 18.7,
                        "keywords": ["request", "feature", "enhancement", "improvement"]
                    }
                ],
                "topic_evolution": {
                    "emerging_topics": [
                        {
                            "topic": "AI Assistant Training",
                            "frequency": 45,
                            "growth_rate": 156.7,
                            "days_since_emergence": 3
                        },
                        {
                            "topic": "Mobile App Support",
                            "frequency": 32,
                            "growth_rate": 89.3,
                            "days_since_emergence": 5
                        }
                    ],
                    "declining_topics": [
                        {
                            "topic": "Basic Setup Questions",
                            "frequency": 28,
                            "decline_rate": -34.2,
                            "reason": "Better onboarding process"
                        }
                    ]
                },
                "topic_correlations": [
                    {
                        "topic_1": "Product Features",
                        "topic_2": "Integration Setup",
                        "correlation": 0.65,
                        "description": "Users often ask about features when setting up integrations"
                    },
                    {
                        "topic_1": "Pricing Information",
                        "topic_2": "Feature Requests",
                        "correlation": 0.42,
                        "description": "Pricing discussions lead to feature enhancement requests"
                    }
                ]
            }

            # Apply limit
            topics_data["trending_topics"] = topics_data["trending_topics"][:limit]

            await self.cache_service.cache_metrics(cache_key, topics_data, 1800)  # 30 minutes cache
            return topics_data

        except Exception as e:
            logger.error(f"Error getting conversation topics: {e}")
            raise

    async def get_active_conversations(self) -> Dict[str, Any]:
        """Get currently active conversations"""

        cache_key = "active_conversations_real_time"
        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock active conversations data
            active_data = {
                "total_active": 23,
                "by_assistant": [
                    {
                        "assistant_id": "asst_001",
                        "assistant_name": "Sales Assistant",
                        "active_conversations": 8,
                        "queue_length": 2,
                        "average_wait_time": 45  # seconds
                    },
                    {
                        "assistant_id": "asst_002",
                        "assistant_name": "Support Assistant",
                        "active_conversations": 12,
                        "queue_length": 5,
                        "average_wait_time": 120
                    },
                    {
                        "assistant_id": "asst_003",
                        "assistant_name": "Lead Qualifier",
                        "active_conversations": 3,
                        "queue_length": 0,
                        "average_wait_time": 0
                    }
                ],
                "conversation_states": {
                    "waiting_for_user": 15,
                    "processing": 6,
                    "escalated": 2
                },
                "priority_conversations": [
                    {
                        "conversation_id": "conv_001",
                        "user_type": "premium",
                        "wait_time": 300,  # seconds
                        "priority": "high"
                    },
                    {
                        "conversation_id": "conv_002",
                        "user_type": "enterprise",
                        "wait_time": 180,
                        "priority": "urgent"
                    }
                ],
                "last_updated": datetime.utcnow().isoformat()
            }

            await self.cache_service.cache_metrics(cache_key, active_data, 30)  # 30 seconds cache
            return active_data

        except Exception as e:
            logger.error(f"Error getting active conversations: {e}")
            raise

    def _generate_hourly_distribution(self) -> List[Dict[str, Any]]:
        """Generate mock hourly conversation distribution"""
        hours = []
        for hour in range(24):
            # Mock distribution with peaks at business hours
            if 9 <= hour <= 17:
                base_count = 80
                variation = 20
            elif 6 <= hour <= 8 or 18 <= hour <= 20:
                base_count = 40
                variation = 15
            else:
                base_count = 10
                variation = 5

            count = base_count + (hour % 3) * variation // 3
            hours.append({
                "hour": hour,
                "count": count,
                "percentage": round(count / 1456 * 100, 2)
            })

        return hours

    def _generate_daily_trends(self) -> List[Dict[str, Any]]:
        """Generate mock daily conversation trends"""
        trends = []
        base_date = datetime.utcnow() - timedelta(days=6)

        for i in range(7):
            date = base_date + timedelta(days=i)
            # Mock varying daily counts
            base_count = 200
            weekend_factor = 0.6 if date.weekday() >= 5 else 1.0
            daily_count = int(base_count * weekend_factor + (i % 3) * 30)

            trends.append({
                "date": date.strftime("%Y-%m-%d"),
                "day_of_week": date.strftime("%A"),
                "total_conversations": daily_count,
                "successful_conversations": int(daily_count * 0.847),
                "average_satisfaction": round(4.0 + (i % 4) * 0.1, 1)
            })

        return trends
