// Error Boundary Component for handling React errors
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-gray-300">
                Sorry, an error occurred while working with the app.
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4">
                <summary className="text-red-400 cursor-pointer">Error Details</summary>
                <div className="mt-2 p-4 bg-red-900 rounded text-red-200 text-sm">
                  <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                  <div><strong>Component Stack:</strong></div>
                  <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack || 'No component stack available'}</pre>
                </div>
              </details>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
