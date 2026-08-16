import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  className?: string;
  bridgeOnly?: boolean;
}

export function LauncherActions({
  className = '',
  bridgeOnly = false,
}: Props) {
  const [error, setError] = useState('');

  const launch = async (target: 'cloneHero' | 'bridge') => {
    setError('');
    const result =
      target === 'cloneHero'
        ? await api().launchCloneHero()
        : await api().launchBridge();
    if (!result.ok) setError(result.error ?? 'The application could not be launched.');
  };

  return (
    <div className={`launcher-actions-wrap${className ? ` ${className}` : ''}`}>
      <div className="launcher-actions">
        {!bridgeOnly ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void launch('cloneHero')}
            title="Launch Clone Hero"
          >
            Launch Clone Hero
          </button>
        ) : null}
        <button
          className="btn"
          type="button"
          onClick={() => void launch('bridge')}
          title="Launch Bridge"
        >
          Launch Bridge
        </button>
      </div>
      {error ? <span className="launcher-error">{error}</span> : null}
    </div>
  );
}
