import {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

