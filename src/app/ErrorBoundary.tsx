import { Component, type ReactNode } from 'react';
import { CrashScreen } from '../screens/CrashScreen';

/**
 * A screen that crashes while drawing shows "Something went wrong" (D61(2)) instead of a blank page.
 * Saved cards are safe either way: every save is one transaction.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <CrashScreen />;
    return this.props.children;
  }
}
