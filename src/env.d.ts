/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />

interface ImportMetaEnv {
  /** Which build this is, shown as <html data-build> (D53's update check, e2e J7). */
  readonly VITE_BUILD_ID?: string;
}
