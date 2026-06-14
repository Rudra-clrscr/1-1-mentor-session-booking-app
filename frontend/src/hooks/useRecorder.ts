import { useRef, useState, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'stopped';

export function useRecorder(stream: MediaStream | null) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const startRecording = useCallback((sessionId: string) => {
    if (!stream) {
      console.warn('[useRecorder] No stream available to record');
      return;
    }

    chunksRef.current = [];

    // Prefer vp9+opus; fall back to the browser default
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const filename = `session-${sessionId}-${Date.now()}.webm`;
      setDownloadUrl(url);
      setDownloadFilename(filename);
      setRecordingState('stopped');
    };

    recorder.onerror = (e) => {
      console.error('[useRecorder] MediaRecorder error:', e);
      setRecordingState('idle');
    };

    recorder.start(1000); // emit data every 1 second
    mediaRecorderRef.current = recorder;
    setRecordingState('recording');
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      // recordingState transitions to 'stopped' in onstop
    }
  }, []);

  const revokeDownloadUrl = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }, [downloadUrl]);

  return {
    recordingState,
    isRecording: recordingState === 'recording',
    downloadUrl,
    downloadFilename,
    startRecording,
    stopRecording,
    revokeDownloadUrl,
  };
}
