import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ChevronDown, Copy, Check } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep error logging for telemetry/diagnostics
    console.error('[Birge ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleHardReset = () => {
    try {
      localStorage.removeItem('birge_active_trip');
      localStorage.removeItem('birge_search_history');
    } catch (_) {}
    window.location.href = '/';
  };

  handleCopy = () => {
    const text = `${this.state.error?.toString()}\n\nStack:\n${this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack trace'}`;
    navigator.clipboard?.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      return (
        <div className="eb-container">
          <div className="eb-card">
            <div className="eb-icon-wrapper">
              <AlertTriangle className="eb-icon" size={32} />
            </div>

            <div className="eb-header">
              <span className="eb-badge">Системный сбой</span>
              <h2 className="eb-title">Что-то пошло не так</h2>
              <p className="eb-subtitle">
                В компоненте интерфейса произошла непредвиденная ошибка. Ваши персональные данные в безопасности.
              </p>
            </div>

            <div className="eb-actions">
              <button
                type="button"
                className="eb-btn eb-btn-primary"
                onClick={this.handleReset}
              >
                <RotateCcw size={16} />
                <span>Попробовать снова</span>
              </button>

              <button
                type="button"
                className="eb-btn eb-btn-secondary"
                onClick={this.handleHardReset}
              >
                <RefreshCw size={16} />
                <span>Очистить кэш и перезагрузить</span>
              </button>
            </div>

            {this.state.error && (
              <details className="eb-details">
                <summary className="eb-summary">
                  <span>Технические детали</span>
                  <ChevronDown size={14} className="eb-chevron" />
                </summary>
                <div className="eb-stack-box">
                  <div className="eb-stack-header">
                    <span className="eb-stack-label">Trace</span>
                    <button
                      type="button"
                      className="eb-copy-btn"
                      onClick={this.handleCopy}
                    >
                      {this.state.copied ? (
                        <>
                          <Check size={12} />
                          <span>Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="eb-code">
                    {this.state.error?.toString()}
                    {'\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>

          <style>{`
            .eb-container {
              min-height: 100vh;
              min-height: 100dvh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background: var(--bg-page);
              color: var(--text-main);
              box-sizing: border-box;
            }
            .eb-card {
              width: 100%;
              max-width: 440px;
              background: var(--bg-card);
              border: 1px solid var(--border-subtle);
              border-radius: var(--radius-lg);
              padding: 28px 24px;
              box-shadow: var(--card-shadow);
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              animation: ebFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes ebFadeIn {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .eb-icon-wrapper {
              width: 64px;
              height: 64px;
              border-radius: 18px;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.22);
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            .eb-icon {
              color: var(--danger);
            }
            .eb-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              margin-bottom: 24px;
            }
            .eb-badge {
              font-size: 0.7rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--danger);
              background: rgba(239, 68, 68, 0.08);
              padding: 3px 10px;
              border-radius: 999px;
            }
            .eb-title {
              font-size: 1.35rem;
              font-weight: 800;
              letter-spacing: -0.02em;
              color: var(--text-main);
              margin: 0;
            }
            .eb-subtitle {
              font-size: 0.88rem;
              line-height: 1.45;
              color: var(--text-muted);
              margin: 0;
              max-width: 340px;
            }
            .eb-actions {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 16px;
            }
            .eb-btn {
              width: 100%;
              height: 48px;
              border-radius: var(--radius-md);
              font-size: 0.9rem;
              font-weight: 700;
              letter-spacing: 0.01em;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
              border: none;
            }
            .eb-btn-primary {
              background: var(--primary);
              color: #ffffff;
              box-shadow: 0 4px 14px rgba(16, 185, 129, 0.28);
            }
            .eb-btn-primary:hover {
              background: var(--primary-hover);
              transform: translateY(-1px);
            }
            .eb-btn-secondary {
              background: var(--bg-subtle);
              color: var(--text-main);
              border: 1px solid var(--border-subtle);
            }
            .eb-btn-secondary:hover {
              background: var(--bg-input);
              border-color: var(--border-strong);
            }
            .eb-details {
              width: 100%;
              margin-top: 6px;
              border-top: 1px solid var(--border-subtle);
              padding-top: 14px;
              text-align: left;
            }
            .eb-summary {
              font-size: 0.78rem;
              font-weight: 600;
              color: var(--text-muted);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: space-between;
              user-select: none;
              list-style: none;
            }
            .eb-summary::-webkit-details-marker {
              display: none;
            }
            .eb-details[open] .eb-chevron {
              transform: rotate(180deg);
            }
            .eb-chevron {
              transition: transform 0.2s ease;
              color: var(--text-subtle);
            }
            .eb-stack-box {
              margin-top: 10px;
              background: var(--bg-input);
              border: 1px solid var(--border-subtle);
              border-radius: var(--radius-sm);
              overflow: hidden;
            }
            .eb-stack-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 6px 10px;
              background: rgba(0, 0, 0, 0.03);
              border-bottom: 1px solid var(--border-subtle);
            }
            .eb-stack-label {
              font-size: 0.68rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: var(--text-subtle);
            }
            .eb-copy-btn {
              background: none;
              border: none;
              color: var(--text-muted);
              font-size: 0.72rem;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .eb-copy-btn:hover {
              color: var(--text-main);
              background: var(--bg-subtle);
            }
            .eb-code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 0.72rem;
              line-height: 1.45;
              padding: 10px;
              margin: 0;
              overflow-x: auto;
              max-height: 180px;
              color: var(--text-muted);
              white-space: pre-wrap;
              word-break: break-all;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
