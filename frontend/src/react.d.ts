/// <reference types="react" />
/// <reference types="react-dom" />

declare global {
  namespace JSX {}

  interface Window {
    // Used to disable Monaco's default CDN worker fetch in offline/sandboxed
    // environments (see session/[id]/page.tsx and the recording playback page).
    MonacoEnvironment?: {
      getWorkerUrl: (moduleId: string, label: string) => string;
    };
  }
}

export {};
