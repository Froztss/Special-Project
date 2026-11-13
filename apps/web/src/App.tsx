import { useEffect, useState } from 'react';
import { getHealth } from './lib/api';

export function App() {
  const [status, setStatus] = useState('Connecting to the API…');
  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then((data) => setStatus(data.message))
      .catch(() => {
        if (!controller.signal.aborted) setStatus('API unavailable. Start the backend and refresh.');
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <span className="eyebrow">FULL-STACK TYPESCRIPT</span>
      <h1>A fresh start.</h1>
      <p>React on the frontend. Express on the backend. Shared types throughout.</p>
      <section aria-label="API status" role="status">{status}</section>
      <p className="hint">Start building in <code>apps/web/src/App.tsx</code>.</p>
    </main>
  );
}
