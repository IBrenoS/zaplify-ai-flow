// Input validation and sanitization utilities

import DOMPurify from 'dompurify';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name.trim());
};

export const validateDescription = (description: string): boolean => {
  return description.trim().length <= 500;
};

export const sanitizeText = (text: string): string => {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  }
  // Fallback for SSR
  return text.replace(/<[^>]*>/g, '');
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const validateDateRange = (startDate: Date | null, endDate: Date | null): boolean => {
  if (!startDate || !endDate) return false;
  
  const now = new Date();
  const maxPastDate = new Date();
  maxPastDate.setFullYear(now.getFullYear() - 10); // Max 10 years ago
  
  return (
    startDate <= endDate &&
    startDate >= maxPastDate &&
    endDate <= now
  );
};

export const sanitizeAssistantData = (data: any) => {
  return {
    ...data,
    name: sanitizeText(data.name || ''),
    description: sanitizeText(data.description || ''),
    personality: sanitizeText(data.personality || ''),
    voice_tone: sanitizeText(data.voice_tone || ''),
    knowledge_base: Array.isArray(data.knowledge_base) 
      ? data.knowledge_base.map((item: string) => sanitizeText(item))
      : [],
    objectives: Array.isArray(data.objectives)
      ? data.objectives.map((item: string) => sanitizeText(item))
      : []
  };
};