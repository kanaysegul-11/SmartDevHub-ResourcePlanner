import React from "react";

class PuckErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unknown render error",
    };
  }

  componentDidCatch(error, info) {
    console.error("[PuckErrorBoundary]", error);
    console.error("[PuckErrorBoundary:componentStack]", info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-bold">Puck blok render hatasi yakalandi.</div>
          <div className="mt-1 break-all">{this.state.message}</div>
          {typeof this.props.onReset === "function" ? (
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                this.props.onReset();
              }}
              className="mt-3 rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
            >
              Editoru Sifirla
            </button>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PuckErrorBoundary;
