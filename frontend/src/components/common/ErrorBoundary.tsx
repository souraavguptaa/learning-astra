import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-clay-bg px-4">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-bold text-slate-800">Something went wrong</h1>
            <p className="text-sm text-slate-500">
              An unexpected error occurred. Try reloading the page — if it keeps happening, let your admin know.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
