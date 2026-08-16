import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SongListItem } from '../../shared/types';
import { audioSrc } from './api';

const PREVIEW_DURATION_SEC = 30;

interface PreviewContextValue {
  playingId: number | null;
  togglePreview: (song: SongListItem) => void;
  stopPreview: () => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

/** Clone Hero unset / missing preview → play from the start. */
function previewStartSeconds(previewStartMs: number | null | undefined): number {
  if (previewStartMs == null || !Number.isFinite(previewStartMs) || previewStartMs <= 0) {
    return 0;
  }
  return previewStartMs / 1000;
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyHandlerRef = useRef<(() => void) | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current != null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const clearReadyHandler = useCallback(() => {
    const audio = audioRef.current;
    const handler = readyHandlerRef.current;
    if (audio && handler) {
      audio.removeEventListener('loadedmetadata', handler);
      audio.removeEventListener('canplay', handler);
    }
    readyHandlerRef.current = null;
  }, []);

  const stopPreview = useCallback(() => {
    clearStopTimer();
    clearReadyHandler();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
    }
    setPlayingId(null);
  }, [clearReadyHandler, clearStopTimer]);

  const togglePreview = useCallback(
    (song: SongListItem) => {
      if (!song.hasAudio) return;
      if (playingId === song.id) {
        stopPreview();
        return;
      }

      clearStopTimer();
      clearReadyHandler();
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;
      } else {
        audio.pause();
      }

      const startSec = previewStartSeconds(song.previewStartMs);
      let started = false;

      const begin = () => {
        if (started) return;
        started = true;
        clearReadyHandler();
        try {
          const duration = Number.isFinite(audio!.duration) ? audio!.duration : 0;
          if (startSec > 0) {
            let seek = startSec;
            if (duration > 0 && seek >= duration) {
              seek = Math.max(0, duration - PREVIEW_DURATION_SEC);
            }
            audio!.currentTime = seek;
          } else {
            // No preview set: first 30 seconds from the start of the file
            audio!.currentTime = 0;
          }
        } catch {
          // ignore seek errors — still attempt play
        }
        void audio!.play().catch(() => {
          setPlayingId(null);
        });
        clearStopTimer();
        stopTimerRef.current = setTimeout(() => {
          stopPreview();
        }, PREVIEW_DURATION_SEC * 1000);
      };

      audio.onended = () => stopPreview();
      audio.onerror = () => stopPreview();
      readyHandlerRef.current = begin;
      audio.addEventListener('loadedmetadata', begin);
      audio.addEventListener('canplay', begin);
      audio.src = audioSrc(song.id);
      audio.load();
      setPlayingId(song.id);
    },
    [clearReadyHandler, clearStopTimer, playingId, stopPreview],
  );

  useEffect(() => () => stopPreview(), [stopPreview]);

  const value = useMemo(
    () => ({ playingId, togglePreview, stopPreview }),
    [playingId, togglePreview, stopPreview],
  );

  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error('usePreview must be used within PreviewProvider');
  }
  return ctx;
}
