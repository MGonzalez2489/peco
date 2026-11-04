export interface ChangelogRelease {
  version: string;
  /** Release date in `YYYY-MM-DD`; drafts are not dated until they are published. */
  fecha?: string;
  highlights: string[];
  /** A draft is tracked in the changelog file but never rendered in the view. */
  _draft?: boolean;
}
