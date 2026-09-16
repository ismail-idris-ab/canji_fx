/// <reference types="nativewind/types" />

// Metro resolves the Tailwind entrypoint through withNativeWind, but
// TypeScript 6 rejects a side-effect import with no declaration (TS2882).
declare module '*.css';
