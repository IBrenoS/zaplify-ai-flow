from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

class TimeRange(str, Enum):
    HOUR_1 = "1h"
    HOUR_6 = "6h"
    HOUR_12 = "12h"
    DAY_1 = "1d"
    DAY_7 = "7d"
    DAY_30 = "30d"
    DAY_90 = "90d"

class MetricType(str, Enum):
    CONVERSION = "conversion"
    ENGAGEMENT = "engagement"
    PERFORMANCE = "performance"
    ACTIVITY = "activity"

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"

# Request Models
class MetricsRequest(BaseModel):
    metric_type: MetricType
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = {}
    user_id: Optional[str] = None

class FunnelAnalyticsRequest(BaseModel):
    funnel_id: str
    time_range: TimeRange = TimeRange.DAY_7
    include_detailed_flow: bool = True
    include_bottlenecks: bool = True

class ConversationAnalyticsRequest(BaseModel):
    assistant_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_sentiment: bool = True
    include_topics: bool = True
    topic_limit: int = 10

# Response Models
class KPIMetric(BaseModel):
    name: str
    value: Union[int, float, str]
    change: Optional[float] = None
    change_type: Optional[str] = None  # "increase", "decrease", "neutral"
    format_type: str = "number"  # "number", "percentage", "currency", "duration"
    description: Optional[str] = None

class ConversionMetric(BaseModel):
    stage: str
    count: int
    conversion_rate: float
    drop_off_rate: float
    average_time: Optional[float] = None

class PerformanceMetric(BaseModel):
    assistant_id: str
    assistant_name: str
    total_conversations: int
    successful_conversations: int
    success_rate: float
    average_response_time: float
    satisfaction_score: Optional[float] = None

class FunnelStageAnalytics(BaseModel):
    stage_id: str
    stage_name: str
    entries: int
    exits: int
    conversion_rate: float
    average_time_spent: float
    bottleneck_score: float

class ConversationInsight(BaseModel):
    topic: str
    frequency: int
    sentiment_score: float
    trending: bool = False

class RealTimeActivity(BaseModel):
    active_conversations: int
    messages_per_minute: float
    new_leads_today: int
    conversion_events_today: int
    system_health: str
    last_updated: datetime

# Analytics Response Models
class AnalyticsResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class KPIMetricsResponse(AnalyticsResponse):
    data: Dict[str, KPIMetric]

class ConversionMetricsResponse(AnalyticsResponse):
    data: List[ConversionMetric]

class PerformanceMetricsResponse(AnalyticsResponse):
    data: List[PerformanceMetric]

class FunnelAnalyticsResponse(AnalyticsResponse):
    data: Dict[str, Any]  # Contains stages, flow, bottlenecks

class ConversationAnalyticsResponse(AnalyticsResponse):
    data: Dict[str, Any]  # Contains insights, sentiment, topics

class RealTimeActivityResponse(AnalyticsResponse):
    data: RealTimeActivity

# Export Models
class ExportRequest(BaseModel):
    format: ExportFormat
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metrics: Optional[List[str]] = []
    filters: Optional[Dict[str, Any]] = {}

class ExportResponse(BaseModel):
    download_url: str
    file_name: str
    format: ExportFormat
    size_bytes: int
    expires_at: datetime

# Cache Models
class CacheKey(BaseModel):
    service: str
    method: str
    params: Dict[str, Any]
    ttl: int = 3600

class CacheEntry(BaseModel):
    key: str
    data: Any
    created_at: datetime
    expires_at: datetime
    hit_count: int = 0

# Error Models
class AnalyticsError(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
