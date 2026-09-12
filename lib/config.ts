export const PRODUCT_NAME = "MamaRoo";

export const SUPPORTED_LOCALES = ["en", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Every calendar-day decision in this product is made in this timezone. */
export const APP_TIMEZONE = "Asia/Kolkata";

/** Gestation length used for EDD maths, in days (Naegele's rule). */
export const GESTATION_DAYS = 280;

/** Bump when the policy text changes. Every consent row records the version it agreed to. */
export const LEGAL_VERSION = "2026-09-12";
