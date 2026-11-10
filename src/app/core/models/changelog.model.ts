export interface ChangelogRelease {
  version: string;
  /** Release date in `YYYY-MM-DD`; drafts are not dated until they are published. */
  fecha?: string;
  highlights: string[];
  /** Drafts are only rendered outside production, with a `Siguiente versión` badge. */
  _draft?: boolean;
}
