// 앱 최상위 클래스 에러 바운더리. 라우터 바깥(AuthProvider 등)이나 라우터가 처리하지 못한
// 렌더 예외를 잡아 흰 화면 대신 ErrorFallback 을 노출하는 최후 방어선이다.
// (라우트 컴포넌트 내부 예외는 RouteErrorBoundary 가 먼저 처리한다.)

import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 운영에서는 외부 수집기로 보낼 자리. 지금은 콘솔에만 남겨 원인 추적을 돕는다.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorFallback
          detail={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
