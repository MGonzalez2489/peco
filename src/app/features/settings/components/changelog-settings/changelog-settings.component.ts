import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {ChangelogStore} from '@core/stores/changelog.store';

@Component({
  selector: 'app-changelog-settings',
  template: `
    <section aria-labelledby="changelog-settings-title" class="space-y-4">
      <div>
        <h2
          id="changelog-settings-title"
          class="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Novedades y cambios
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Estas son las últimas novedades y correcciones de la aplicación.
        </p>
      </div>

      @if (loading()) {
        <div
          role="status"
          class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
            aria-hidden="true"
          ></span>
          <span class="text-sm text-slate-500 dark:text-slate-400">Cargando cambios…</span>
        </div>
      } @else if (error()) {
        <div
          role="alert"
          class="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-500/30 dark:bg-rose-500/10"
        >
          <p class="text-sm font-semibold text-rose-700 dark:text-rose-300">
            No se pudieron cargar los cambios. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            (click)="changelogStore.load()"
            class="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            Reintentar
          </button>
        </div>
      } @else if (lastChanges().length === 0) {
        <div
          class="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"
        >
          <p class="text-sm text-slate-500 dark:text-slate-400">Aún no hay cambios publicados.</p>
        </div>
      } @else {
        <ol class="relative space-y-3 border-l-2 border-slate-200 pl-5 dark:border-slate-800">
          @for (release of lastChanges(); track release.version; let index = $index) {
            <li class="relative">
              <span
                class="absolute -left-[29px] top-4 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900"
                aria-hidden="true"
              ></span>
              <article
                class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <h3>
                  <button
                    type="button"
                    (click)="toggle(index)"
                    [id]="'changelog-heading-' + index"
                    [attr.aria-controls]="'changelog-panel-' + index"
                    [attr.aria-expanded]="openIndex() === index"
                    class="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-slate-800/60 md:px-5"
                  >
                    <span class="flex min-w-0 items-center gap-3">
                      <span
                        class="flex h-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 px-3 font-mono text-xs font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                      >
                        {{ release.version }}
                      </span>
                      <span class="flex min-w-0 flex-col gap-1">
                        @if (index === 0) {
                          <span
                            class="inline-flex w-fit items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                          >
                            Última versión
                          </span>
                        }
                        <time
                          class="text-sm text-slate-600 dark:text-slate-300"
                          [class]="index === 0 ? 'text-slate-900 dark:text-white' : ''"
                          [attr.datetime]="release.fecha"
                        >
                          {{ release.fecha }}
                        </time>
                      </span>
                    </span>
                    <svg
                      class="h-5 w-5 shrink-0 text-slate-400 transition-transform"
                      [class]="openIndex() === index ? 'rotate-180' : ''"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                </h3>

                @if (openIndex() === index) {
                  <div
                    [id]="'changelog-panel-' + index"
                    role="region"
                    [attr.aria-labelledby]="'changelog-heading-' + index"
                    class="border-t border-slate-200 px-4 py-4 dark:border-slate-800 md:px-5"
                  >
                    @if (release.highlights.length > 0) {
                      <ul class="space-y-2.5">
                        @for (highlight of release.highlights; track highlight) {
                          <li
                            class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                          >
                            <span aria-hidden="true" class="mt-0.5 text-indigo-500">•</span>
                            <span>{{ highlight }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <p class="text-sm text-slate-500 dark:text-slate-400">
                        Sin novedades destacadas para esta versión.
                      </p>
                    }
                  </div>
                }
              </article>
            </li>
          }
        </ol>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogSettingsComponent {
  protected readonly changelogStore = inject(ChangelogStore);

  protected readonly loading = this.changelogStore.loading;
  protected readonly error = this.changelogStore.error;
  protected readonly lastChanges = this.changelogStore.lastChanges;

  protected readonly openIndex = signal(0);

  constructor() {
    this.changelogStore.load();
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
