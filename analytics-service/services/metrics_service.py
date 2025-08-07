import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import text

from services.cache_service import CacheService
from config import analytics_config

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self, cache_service: CacheService):
        self.cache_service = cache_service
        self.db_connection = None

    async def initialize(self):
        """Initialize metrics service"""
        logger.info("Metrics service initialized")

    async def get_kpi_metrics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get KPI metrics for dashboard"""

        # Generate cache key
        cache_key = self.cache_service.generate_cache_key(
            "kpi", "dashboard",
            start_date=start_date,
            end_date=end_date,
            user_id=user_id
        )

        # Try to get from cache first
        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Calculate date range
            if not start_date:
                start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
            if not end_date:
                end_date = datetime.utcnow().isoformat()

            # Mock KPI calculations (replace with actual database queries)
            kpi_data = {
                "total_conversations": {
                    "name": "Total Conversations",
                    "value": 1250,
                    "change": 15.2,
                    "change_type": "increase",
                    "format_type": "number"
                },
                "conversion_rate": {
                    "name": "Conversion Rate",
                    "value": 24.5,
                    "change": 2.1,
                    "change_type": "increase",
                    "format_type": "percentage"
                },
                "average_response_time": {
                    "name": "Avg Response Time",
                    "value": 1.2,
                    "change": -0.3,
                    "change_type": "decrease",
                    "format_type": "duration"
                },
                "active_funnels": {
                    "name": "Active Funnels",
                    "value": 8,
                    "change": 0,
                    "change_type": "neutral",
                    "format_type": "number"
                },
                "monthly_revenue": {
                    "name": "Monthly Revenue",
                    "value": 15750.00,
                    "change": 8.7,
                    "change_type": "increase",
                    "format_type": "currency"
                }
            }

            # Cache the results
            await self.cache_service.cache_metrics(cache_key, kpi_data, 300)  # 5 minutes cache

            return kpi_data

        except Exception as e:
            logger.error(f"Error calculating KPI metrics: {e}")
            raise

    async def get_conversion_metrics(
        self,
        funnel_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get conversion metrics by funnel stages"""

        cache_key = self.cache_service.generate_cache_key(
            "conversion", "metrics",
            funnel_id=funnel_id,
            start_date=start_date,
            end_date=end_date
        )

        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock conversion data (replace with actual database queries)
            conversion_data = [
                {
                    "stage": "Lead Capture",
                    "count": 1000,
                    "conversion_rate": 100.0,
                    "drop_off_rate": 0.0,
                    "average_time": 0.0
                },
                {
                    "stage": "Initial Contact",
                    "count": 850,
                    "conversion_rate": 85.0,
                    "drop_off_rate": 15.0,
                    "average_time": 2.5
                },
                {
                    "stage": "Qualification",
                    "count": 620,
                    "conversion_rate": 73.0,
                    "drop_off_rate": 27.0,
                    "average_time": 5.2
                },
                {
                    "stage": "Proposal",
                    "count": 380,
                    "conversion_rate": 61.3,
                    "drop_off_rate": 38.7,
                    "average_time": 12.8
                },
                {
                    "stage": "Closing",
                    "count": 245,
                    "conversion_rate": 64.5,
                    "drop_off_rate": 35.5,
                    "average_time": 8.4
                }
            ]

            await self.cache_service.cache_metrics(cache_key, conversion_data, 600)  # 10 minutes cache
            return conversion_data

        except Exception as e:
            logger.error(f"Error calculating conversion metrics: {e}")
            raise

    async def get_performance_metrics(
        self,
        assistant_id: Optional[str] = None,
        time_range: str = "24h"
    ) -> List[Dict[str, Any]]:
        """Get assistant performance metrics"""

        cache_key = self.cache_service.generate_cache_key(
            "performance", "assistants",
            assistant_id=assistant_id,
            time_range=time_range
        )

        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock performance data (replace with actual database queries)
            performance_data = [
                {
                    "assistant_id": "asst_001",
                    "assistant_name": "Sales Assistant",
                    "total_conversations": 456,
                    "successful_conversations": 398,
                    "success_rate": 87.3,
                    "average_response_time": 1.2,
                    "satisfaction_score": 4.6
                },
                {
                    "assistant_id": "asst_002",
                    "assistant_name": "Support Assistant",
                    "total_conversations": 234,
                    "successful_conversations": 201,
                    "success_rate": 85.9,
                    "average_response_time": 0.8,
                    "satisfaction_score": 4.4
                },
                {
                    "assistant_id": "asst_003",
                    "assistant_name": "Lead Qualifier",
                    "total_conversations": 678,
                    "successful_conversations": 567,
                    "success_rate": 83.6,
                    "average_response_time": 1.5,
                    "satisfaction_score": 4.2
                }
            ]

            # Filter by assistant_id if provided
            if assistant_id:
                performance_data = [
                    item for item in performance_data
                    if item["assistant_id"] == assistant_id
                ]

            await self.cache_service.cache_metrics(cache_key, performance_data, 300)  # 5 minutes cache
            return performance_data

        except Exception as e:
            logger.error(f"Error calculating performance metrics: {e}")
            raise

    async def get_real_time_activity(self) -> Dict[str, Any]:
        """Get real-time activity metrics"""

        cache_key = "real_time_activity"
        cached_data = await self.cache_service.get_cached_metrics(cache_key)
        if cached_data:
            return cached_data

        try:
            # Mock real-time data (replace with actual calculations)
            activity_data = {
                "active_conversations": 23,
                "messages_per_minute": 8.5,
                "new_leads_today": 47,
                "conversion_events_today": 12,
                "system_health": "healthy",
                "last_updated": datetime.utcnow().isoformat()
            }

            await self.cache_service.cache_metrics(cache_key, activity_data, 60)  # 1 minute cache
            return activity_data

        except Exception as e:
            logger.error(f"Error getting real-time activity: {e}")
            raise

    async def export_metrics(
        self,
        format: str = "json",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Export metrics data in specified format"""

        try:
            # Get all metrics data
            kpi_data = await self.get_kpi_metrics(start_date, end_date)
            conversion_data = await self.get_conversion_metrics(None, start_date, end_date)
            performance_data = await self.get_performance_metrics()

            export_data = {
                "kpi_metrics": kpi_data,
                "conversion_metrics": conversion_data,
                "performance_metrics": performance_data,
                "exported_at": datetime.utcnow().isoformat(),
                "date_range": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }

            if format.lower() == "csv":
                # Convert to CSV format (simplified)
                return {
                    "format": "csv",
                    "data": self._convert_to_csv(export_data),
                    "filename": f"metrics_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
                }

            return {
                "format": "json",
                "data": export_data,
                "filename": f"metrics_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            }

        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            raise

    def _convert_to_csv(self, data: Dict[str, Any]) -> str:
        """Convert metrics data to CSV format"""
        # Simplified CSV conversion
        csv_lines = ["metric_type,metric_name,value,change,timestamp"]

        # Add KPI metrics
        for key, metric in data.get("kpi_metrics", {}).items():
            csv_lines.append(
                f"kpi,{metric.get('name', key)},{metric.get('value', 0)},"
                f"{metric.get('change', 0)},{data['exported_at']}"
            )

        return "\n".join(csv_lines)

    async def process_batch_data(self):
        """Process batch analytics data"""
        try:
            logger.info("Starting batch data processing")

            # Clear old cache entries
            await self.cache_service.clear_analytics_cache()

            # Recalculate key metrics
            await self.get_kpi_metrics()
            await self.get_conversion_metrics()
            await self.get_performance_metrics()

            logger.info("Batch data processing completed")

        except Exception as e:
            logger.error(f"Error in batch data processing: {e}")
            raise
