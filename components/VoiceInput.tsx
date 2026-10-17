'use client';

import { useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;

function getRecognition(): (new () => SR) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  lang: string;
  placeholder?: string;
  rows?: number;
  id: string;
  label: string;
  /** Called when text came from the microphone */
  onVoiceUsed?: () => void;
}

/**
 * A text box with a microphone. Speak and the words are transcribed into the box.
 * Uses the browser's built-in speech recognition (Chrome on Android, Chrome/Edge on desktop, Safari).
 */
export default function VoiceInput({ value, onChange, lang, placeholder, rows = 3, id, label, onVoiceUsed }: Props) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => {
      wantRef.current = false;
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  const append = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const cur = valueRef.current;
    const sep = cur && !/\s$/.test(cur) ? ' ' : '';
    const next = cur + sep + t.charAt(0).toUpperCase() + t.slice(1);
    valueRef.current = next;
    onChange(next);
    onVoiceUsed?.();
  };

  const start = () => {
    const Rec = getRecognition();
    if (!Rec) return;
    setError('');
    const isAndroid = /Android/i.test(navigator.userAgent);
    const rec: SR = new Rec();
    rec.lang = lang || 'en-GB';
    // Android Chrome repeats results in continuous mode, so restart per phrase instead.
    rec.continuous = !isAndroid;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) append(r[0].transcript);
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRef.current = false;
        setError('Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.');
      } else if (e.error === 'network') {
        wantRef.current = false;
        setError('Transcription needs an internet connection. Check your connection and try again.');
      }
    };
    rec.onend = () => {
      setInterim('');
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {}
      }
      setRecording(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setError('Could not start the microphone. Try again.');
    }
  };

  const stop = () => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    setRecording(false);
  };

  return (
    <div className="voice">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`voice-box${recording ? ' is-recording' : ''}`}>
        <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {supported && (
          <button
            type="button"
            className={`mic${recording ? ' on' : ''}`}
            onClick={recording ? stop : start}
            aria-pressed={recording}
            aria-label={recording ? 'Stop recording' : 'Record voice note'}
          >
            {recording ? <StopIcon /> : <MicIcon />}
          </button>
        )}
      </div>
      {recording && (
        <p className="voice-live" aria-live="polite">
          <span className="rec-dot" /> Listening{interim ? `: ${interim}` : '…'}
        </p>
      )}
      {error && <p className="voice-error">{error}</p>}
      {!supported && <p className="hint">Voice typing isn&rsquo;t available in this browser. Chrome on Android supports it.</p>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}
