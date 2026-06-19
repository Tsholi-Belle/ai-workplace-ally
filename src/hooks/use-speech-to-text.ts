import { useEffect, useRef, useState, useCallback } from "react";

// Minimal types for the Web Speech API (not in lib.dom by default in all TS configs)
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechToText(opts?: {
  onTranscript?: (text: string, isFinal: boolean) => void;
  lang?: string;
}) {
  const { onTranscript, lang = "en-US" } = opts ?? {};
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const userStoppedRef = useRef(true);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // If a session already exists, keep it — don't abort (abort briefly
    // releases the shared mic stream and can hiccup other apps).
    if (recognitionRef.current) {
      userStoppedRef.current = false;
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // already started — fine
        setListening(true);
      }
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    // continuous + interim keeps the recognizer streaming so it co-exists
    // with meeting apps (Zoom/Meet/Teams) sharing the same input device
    // rather than repeatedly opening/closing the mic.
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        callbackRef.current?.(transcript, result.isFinal);
      }
    };
    rec.onerror = (e) => {
      // 'no-speech' / 'aborted' shouldn't kill the session while the user
      // is still meant to be recording — let onend auto-restart handle it.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        userStoppedRef.current = true;
        setListening(false);
      }
    };
    rec.onend = () => {
      // Auto-restart if the user hasn't explicitly stopped — keeps dictation
      // alive across silence gaps without re-prompting for mic permission.
      if (!userStoppedRef.current) {
        try {
          rec.start();
          return;
        } catch {
          // fall through to stopped state
        }
      }
      setListening(false);
    };
    recognitionRef.current = rec;
    userStoppedRef.current = false;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { listening, supported, start, stop, toggle };
}
