/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FRAPPE_URL: string;
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;
    readonly VITE_ENABLE_PWA: string;
    readonly VITE_ENABLE_ANALYTICS: string;
    readonly VITE_ENABLE_ERROR_TRACKING: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_GA_TRACKING_ID: string;
    readonly VITE_ANALYTICS_ENDPOINT: string;
    readonly VITE_API_TIMEOUT: string;
    readonly VITE_API_RETRY_COUNT: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
