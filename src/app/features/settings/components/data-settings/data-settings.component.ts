import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {DataBackupService} from '@core/services/data-backup.service';
import {ConfirmModalComponent} from '@shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-data-settings',
  imports: [ConfirmModalComponent],
  template: `
    <section aria-labelledby="data-settings-title" class="space-y-8">
      <div>
        <h2
          id="data-settings-title"
          class="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Datos y copias
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tus datos se guardan solo en este dispositivo. Descarga copias de seguridad para
          protegerlos.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Exportar información</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Descarga una copia de seguridad de tus datos en un archivo JSON.
        </p>
        <button
          type="button"
          (click)="exportBackup()"
          class="mt-1 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <span aria-hidden="true">📥</span>
          Descargar copia de seguridad
        </button>
      </div>

      <div class="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Importar información</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Restaura la información desde un archivo de copia de seguridad previamente descargado.
          Atención: esta acción reemplazará todos los datos actuales.
        </p>

        <label
          for="backup-file"
          class="mt-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Archivo de copia (.json)
        </label>
        <input
          id="backup-file"
          type="file"
          accept=".json,application/json"
          (change)="onFileSelected($event)"
          aria-describedby="backup-file-help"
          class="block w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
        <p id="backup-file-help" class="text-xs text-slate-500 dark:text-slate-400">
          @if (selectedFileName()) {
            Archivo seleccionado: {{ selectedFileName() }}
          } @else {
            Selecciona un archivo peco-backup-AAAA-MM-DD.json.
          }
        </p>

        @if (errorMessage()) {
          <p role="alert" class="text-sm font-medium text-rose-600 dark:text-rose-400">
            {{ errorMessage() }}
          </p>
        }

        <button
          type="button"
          (click)="requestRestore()"
          [disabled]="!selectedFile() || isRestoring()"
          class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
        >
          <span aria-hidden="true">📤</span>
          {{ isRestoring() ? 'Restaurando…' : 'Restaurar datos' }}
        </button>
      </div>
    </section>

    <app-confirm-modal
      [isOpen]="showConfirm()"
      title="Restaurar copia de seguridad"
      confirmLabel="Sí, reemplazar mis datos"
      cancelLabel="Cancelar"
      [danger]="true"
      (confirmed)="confirmRestore()"
      (dismissed)="cancelRestore()"
    >
      <p>
        Esta acción reemplazará todos los datos actuales con el contenido de
        <strong>{{ selectedFileName() }}</strong
        >. Esta operación no se puede deshacer.
      </p>
    </app-confirm-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSettingsComponent {
  private readonly backupService = inject(DataBackupService);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = signal('');
  protected readonly errorMessage = signal('');
  protected readonly showConfirm = signal(false);
  protected readonly isRestoring = signal(false);

  protected exportBackup(): void {
    this.errorMessage.set('');
    this.backupService.exportData();
  }

  protected onFileSelected(event: Event): void {
    this.errorMessage.set('');
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.selectedFile.set(file);
    this.selectedFileName.set(file?.name ?? '');
  }

  protected requestRestore(): void {
    if (!this.selectedFile()) return;
    this.errorMessage.set('');
    this.showConfirm.set(true);
  }

  protected cancelRestore(): void {
    this.showConfirm.set(false);
  }

  protected async confirmRestore(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      this.showConfirm.set(false);
      return;
    }

    this.showConfirm.set(false);
    this.isRestoring.set(true);
    try {
      const restored = await this.backupService.importData(file);
      if (!restored) {
        this.errorMessage.set(
          'El archivo no es una copia válida. Revisa el archivo e inténtalo de nuevo.',
        );
      }
    } catch {
      this.errorMessage.set('No se pudo restaurar la copia. Inténtalo de nuevo.');
    } finally {
      this.isRestoring.set(false);
    }
  }
}
