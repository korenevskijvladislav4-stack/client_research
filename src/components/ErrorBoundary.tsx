import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 560, margin: '40px auto' }}>
          <Alert
            type="error"
            message="Что-то пошло не так"
            description={
              <>
                <p>{this.state.error.message}</p>
                <Button type="primary" onClick={() => this.setState({ hasError: false, error: null })}>
                  Попробовать снова
                </Button>
              </>
            }
            showIcon
          />
        </div>
      );
    }
    return this.props.children;
  }
}
