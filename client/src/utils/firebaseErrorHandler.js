// Firebase Error Handler Utility
import { useState, useCallback } from 'react';

export class FirebaseErrorHandler {
  static handleError(error, operation = 'Firebase operation') {
    console.error(`${operation} failed:`, error);
    
    // Common Firebase error codes and user-friendly messages
    const errorMessages = {
      'permission-denied': 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
      'unavailable': 'เซอร์วิสไม่สามารถใช้งานได้ในขณะนี้',
      'unauthenticated': 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
      'not-found': 'ไม่พบข้อมูลที่ต้องการ',
      'already-exists': 'ข้อมูลนี้มีอยู่แล้ว',
      'cancelled': 'การดำเนินการถูกยกเลิก',
      'data-loss': 'ข้อมูลสูญหาย กรุณาลองใหม่',
      'deadline-exceeded': 'การเชื่อมต่อใช้เวลานานเกินไป',
      'failed-precondition': 'เงื่อนไขไม่ถูกต้อง',
      'internal': 'เกิดข้อผิดพลาดภายในระบบ',
      'invalid-argument': 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
      'out-of-range': 'ข้อมูลเกินขอบเขตที่กำหนด',
      'resource-exhausted': 'ทรัพยากรถูกใช้หมด',
      'aborted': 'การดำเนินการถูกยกเลิก'
    };

    // Get user-friendly message
    const userMessage = errorMessages[error.code] || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    
    // Log additional context for debugging
    const errorContext = {
      code: error.code,
      message: error.message,
      operation: operation,
      timestamp: new Date().toISOString()
    };
    
    console.error('Firebase Error Context:', errorContext);
    
    return {
      isError: true,
      code: error.code,
      message: userMessage,
      originalMessage: error.message,
      context: errorContext
    };
  }

  static isRetryableError(error) {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'internal',
      'aborted'
    ];
    
    return retryableCodes.includes(error.code);
  }

  static shouldShowToUser(error) {
    // Don't show certain technical errors to users
    const hiddenCodes = [
      'permission-denied', // Handle gracefully without showing error
      'unauthenticated'    // Handle through auth flow
    ];
    
    return !hiddenCodes.includes(error.code);
  }
}

// React Hook for handling Firebase operations with error handling
export const useFirebaseOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeOperation = useCallback(async (operation, operationName = 'Firebase operation', maxRetries = 3) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setRetryCount(0);
      return result;
    } catch (err) {
      const errorInfo = FirebaseErrorHandler.handleError(err, operationName);
      
      // Auto-retry for retryable errors
      if (FirebaseErrorHandler.isRetryableError(err) && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return executeOperation(operation, operationName, maxRetries);
      }
      
      // Set error for user display if needed
      if (FirebaseErrorHandler.shouldShowToUser(err)) {
        setError(errorInfo);
      }
      
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    loading,
    error,
    executeOperation,
    clearError,
    retryCount
  };
};
