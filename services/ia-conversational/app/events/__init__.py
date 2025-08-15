"""
Event handling package for IA Conversational Service
"""

from .kafka import KafkaManager
from .schemas import EventEnvelope, MessageGeneratedEvent, MessageReceivedEvent

__all__ = [
    "EventEnvelope",
    "MessageReceivedEvent",
    "MessageGeneratedEvent",
    "KafkaManager",
]
