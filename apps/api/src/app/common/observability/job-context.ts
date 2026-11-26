import {AsyncLocalStorage} from 'node:async_hooks';
import {JobKeyEnum, type StringEnumValues} from '@peco/enums';

export type JobKey = StringEnumValues<typeof JobKeyEnum>;

const storage = new AsyncLocalStorage<JobKey>();

/** Keeps the active job key available to every structured log and alert (US-1002). */
export function runWithJobKey<T>(jobKey: JobKey, callback: () => T): T {
  return storage.run(jobKey, callback);
}

/** Job key of the run being executed, when inside a job context. */
export function getJobKey(): JobKey | undefined {
  return storage.getStore();
}
