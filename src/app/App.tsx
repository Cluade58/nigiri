import { useCallback, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router';
import { AddCard } from '../screens/AddCard';
import { CrashScreen } from '../screens/CrashScreen';
import { DeckPage } from '../screens/DeckPage';
import { HowItWorks } from '../screens/HowItWorks';
import { NewDeck } from '../screens/NewDeck';
import { Review } from '../screens/Review';
import { Settings } from '../screens/Settings';
import { StorageError } from '../screens/StorageError';
import { TestScreen } from '../screens/TestScreen';
import { Today } from '../screens/Today';
import { AppContext, type AppServices } from './context';
import { ErrorBoundary } from './ErrorBoundary';
import { StartupError, startServices } from './startup';

type Boot =
  | { status: 'opening' }
  | { status: 'ready'; services: AppServices }
  | { status: 'storage-failed' }
  | { status: 'crashed' };

/** D25's screen only for storage that won't open; anything else is the crash screen (D61(2)). */
const failed = (e: unknown): Boot => (e instanceof StartupError && e.part === 'storage' ? { status: 'storage-failed' } : { status: 'crashed' });

/** Each deck's Add card is its own form, so moving from one deck to another starts clean. */
function AddCardRoute() {
  const { deckId } = useParams();
  return <AddCard key={deckId ?? 'today'} deckId={deckId} />;
}

/** `#/deck/:id/review?early=1` is D63's study-ahead session, from that deck's page only. */
function ReviewRoute() {
  const { deckId } = useParams();
  const [params] = useSearchParams();
  const early = deckId !== undefined && params.get('early') === '1';
  return <Review key={`${deckId ?? 'all'}${early ? ':early' : ''}`} deckId={deckId} early={early} />;
}

function TestRoute() {
  const { deckId } = useParams();
  return <TestScreen key={deckId} deckId={deckId ?? ''} />;
}

export function App() {
  const [boot, setBoot] = useState<Boot>({ status: 'opening' });

  // Try again (D25): open storage again; if it opens, Today appears.
  const open = useCallback(async (): Promise<boolean> => {
    try {
      const services = await startServices();
      setBoot({ status: 'ready', services });
      return true;
    } catch (e) {
      setBoot(failed(e));
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    startServices().then(
      (services) => {
        if (alive) setBoot({ status: 'ready', services });
      },
      (e: unknown) => {
        if (alive) setBoot(failed(e));
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // D25: if storage can't open, one screen says so, never an empty app (cards made there wouldn't save).
  if (boot.status === 'storage-failed') return <StorageError onRetry={open} />;
  if (boot.status === 'crashed') return <CrashScreen />;
  if (boot.status === 'opening') return <div className="booting" aria-busy="true" />;

  return (
    <AppContext.Provider value={boot.services}>
      <ErrorBoundary>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/new-deck" element={<NewDeck />} />
            <Route path="/add" element={<AddCardRoute />} />
            <Route path="/deck/:deckId" element={<DeckPage />} />
            <Route path="/deck/:deckId/add" element={<AddCardRoute />} />
            <Route path="/deck/:deckId/test" element={<TestRoute />} />
            <Route path="/review" element={<ReviewRoute />} />
            <Route path="/deck/:deckId/review" element={<ReviewRoute />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/how" element={<HowItWorks />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ErrorBoundary>
    </AppContext.Provider>
  );
}
