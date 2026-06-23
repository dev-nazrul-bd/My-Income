import {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error display helper
function displayGlobalError(message: string, source?: string, lineno?: number, colno?: number, error?: any) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 24px; font-family: system-ui, sans-serif; background: #fff5f5; color: #c53030; border-radius: 12px; margin: 16px; border: 1px solid #fed7d7;">
        <h3 style="margin-top: 0; font-size: 18px; font-weight: 700;">Runtime Script Exception Detected</h3>
        <p style="font-size: 14px; font-weight: 500; color: #2d3748;">${message}</p>
        <div style="font-family: monospace; font-size: 12px; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #feb2b2; margin-top: 12px; white-space: pre-wrap; overflow-x: auto;">
          Source: ${source || 'Unknown'}<br />
          Line/Col: ${lineno || 'N/A'}:${colno || 'N/A'}<br /><br />
          Stack: ${error?.stack || 'No trace available'}
        </div>
        <p style="font-size: 12px; margin-bottom: 0; margin-top: 12px; color: #718096;">
          This occurs inside the sandboxed preview window. If this is a Firestore or storage permission error, check your firebase rules.
        </p>
      </div>
    `;
  }
}

// Add global capture triggers
window.addEventListener('error', (event) => {
  displayGlobalError(event.message, event.filename, event.lineno, event.colno, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  displayGlobalError(`Promise Rejection: ${event.reason?.message || event.reason}`, undefined, undefined, undefined, event.reason);
});

// React Error Boundary Component
class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("React boundary error details:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto my-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
          <h2 className="text-lg font-bold mb-2">React Render Error</h2>
          <p className="text-sm mb-4 font-medium">{this.state.error?.message || "An unexpected rendering error occurred."}</p>
          <pre className="p-4 bg-white border border-rose-100 rounded-lg text-xs font-mono overflow-auto max-h-72 font-mono">
            {this.state.error?.stack || "No callstack available."}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            Reload Workstation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

