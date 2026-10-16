import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {MOVEMENT_TYPES, MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Account, Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementType} from '@core/types';
import {
  accountColor,
  formatCurrency,
  formatLongDate,
  recurrenceLabel,
  toSoftCategoryColor,
} from '@core/utils';
import {AppIconComponent, IconName} from '@shared/components';

const FALLBACK_CATEGORY_COLOR = '#94a3b8';
const FALLBACK_CATEGORY_ICON: IconName = 'folder-open';
const FALLBACK_ACCOUNT_ICON: IconName = 'wallet';

/** Must stay in sync with the `detail-sheet-out` / `detail-dialog-out` keyframes. */
const EXIT_ANIMATION_MS = 200;

interface AccountView {
  name: string;
  isRoot: boolean;
  typeName: string;
  icon: IconName;
  color: string;
}

interface CategoryView {
  name: string;
  icon: IconName;
  color: string;
}

/**
 * Read-only bottom sheet that presents every detail of a single movement.
 * It never renders editable controls; dismissal only emits `close`.
 */
@Component({
  selector: 'app-movement-detail-modal',
  imports: [AppIconComponent],
  templateUrl: './movement-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: contents;
    }

    /* Backdrop fades in and out, mirroring the shared ModalComponent. */
    .detail-backdrop {
      animation: detail-backdrop-in 200ms ease-out both;
    }

    .detail-backdrop.detail-closing {
      animation: detail-backdrop-out 200ms ease-in both;
    }

    /* Mobile: the bottom sheet fades in while rising from the bottom. */
    .detail-panel {
      animation: detail-sheet-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .detail-panel.detail-closing {
      animation: detail-sheet-out 200ms cubic-bezier(0.4, 0, 1, 1) both;
    }

    /* Desktop: the centered dialog fades and pops in. */
    @media (min-width: 768px) {
      .detail-panel {
        animation: detail-dialog-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .detail-panel.detail-closing {
        animation: detail-dialog-out 200ms cubic-bezier(0.4, 0, 1, 1) both;
      }
    }

    @keyframes detail-backdrop-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes detail-backdrop-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes detail-sheet-in {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes detail-sheet-out {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(24px);
      }
    }

    @keyframes detail-dialog-in {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes detail-dialog-out {
      from {
        opacity: 1;
        transform: none;
      }
      to {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
    }
  `,
  host: {
    '(document:keydown.escape)': 'dismiss()',
  },
})
export class MovementDetailModalComponent {
  readonly movement = input<Movement | null>(null);
  readonly isOpen = input(false);

  readonly close = output<void>();
  readonly editRequested = output<Movement>();
  readonly deleteRequested = output<Movement>();

  private readonly accountsStore = inject(AccountsStore);
  private readonly catalogStore = inject(CatalogStore);
  private readonly scheduledStore = inject(ScheduledTransactionsStore);

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  /**
   * Keeps the last movement around so the sheet can still be painted while the
   * close animation plays, even after the parent clears the selection.
   */
  private readonly lastMovement = signal<Movement | null>(null);

  protected readonly isMounted = signal(false);
  protected readonly isClosing = signal(false);

  protected readonly displayedMovement = computed(() => this.movement() ?? this.lastMovement());

  private readonly accountsById = computed(
    () => new Map(this.accountsStore.accounts().map((account) => [account.id, account])),
  );

  private readonly categoriesById = computed(
    () => new Map(this.catalogStore.categories().map((category) => [category.id, category])),
  );

  private readonly schedulesById = computed(
    () =>
      new Map(
        this.scheduledStore.scheduledTransactions().map((schedule) => [schedule.id, schedule]),
      ),
  );

  private readonly movementTypesByKey = computed(
    () => new Map(MOVEMENT_TYPES.map((type) => [type.key, type])),
  );

  readonly isIncome = computed(() => this.displayedMovement()?.type === 'INCOME');
  readonly isExpense = computed(() => this.displayedMovement()?.type === 'EXPENSE');
  readonly isTransfer = computed(() => this.displayedMovement()?.type === 'TRANSFER');

  readonly palette = computed(() => MOVEMENT_TYPE_PALETTE[this.currentType()]);

  readonly typeIcon = computed<IconName>(
    () => this.movementTypesByKey().get(this.currentType())?.icon ?? 'arrow-left-right',
  );

  readonly heroAccent = computed(
    () => accountColor(this.movementTypesByKey().get(this.currentType())?.color).chip,
  );

  readonly heroBackground = computed(() => toSoftCategoryColor(this.heroAccent(), '20'));

  readonly formattedAmount = computed(() => {
    const movement = this.displayedMovement();
    if (!movement) return '';
    return `${MOVEMENT_TYPE_PALETTE[movement.type].sign}${formatCurrency(movement.amount)}`;
  });

  readonly formattedDate = computed(() => {
    const movement = this.displayedMovement();
    return movement ? formatLongDate(movement.date) : '';
  });

  readonly typeBadge = computed(() => {
    switch (this.currentType()) {
      case 'INCOME':
        return 'Ingreso registrado';
      case 'TRANSFER':
        return 'Transferencia registrada';
      default:
        return 'Egreso registrado';
    }
  });

  readonly categoryData = computed<CategoryView>(() => {
    const movement = this.displayedMovement();
    const category = movement ? this.categoriesById().get(movement.categoryId) : undefined;

    return {
      name: category?.displayName ?? (movement ? MOVEMENT_TYPE_LABEL[movement.type] : ''),
      icon: category?.icon ?? FALLBACK_CATEGORY_ICON,
      color: category?.color ?? FALLBACK_CATEGORY_COLOR,
    };
  });

  readonly accountData = computed<{source: AccountView; destination: AccountView | null} | null>(
    () => {
      const movement = this.displayedMovement();
      if (!movement) return null;

      const source = this.accountsById().get(movement.accountId);
      const destination = movement.targetAccountId
        ? this.accountsById().get(movement.targetAccountId)
        : undefined;

      return {
        source: this.toAccountView(source),
        destination: destination ? this.toAccountView(destination) : null,
      };
    },
  );

  readonly scheduleLabel = computed(() => {
    const scheduleId = this.displayedMovement()?.scheduledTransactionId;
    if (!scheduleId) return null;

    const schedule = this.schedulesById().get(scheduleId);
    if (!schedule) return 'Programado';

    return `Programado - ${recurrenceLabel(schedule.frequency, schedule.interval ?? 1)}`;
  });

  readonly statusBadges = computed(() => {
    const movement = this.displayedMovement();
    const badges: string[] = [];

    if (movement?.isCanceled) badges.push('Omitido');
    if (movement?.isReversal) badges.push('Reversión');

    return badges;
  });

  constructor() {
    effect(() => {
      const movement = this.movement();
      if (movement) {
        this.lastMovement.set(movement);
      }
    });

    effect((onCleanup) => {
      if (this.isOpen()) {
        this.isClosing.set(false);
        this.isMounted.set(true);
        return;
      }

      if (!this.isMounted()) return;

      this.isClosing.set(true);
      const timeout = setTimeout(() => {
        this.isMounted.set(false);
        this.isClosing.set(false);
      }, EXIT_ANIMATION_MS);

      onCleanup(() => clearTimeout(timeout));
    });

    effect(() => {
      document.body.classList.toggle('overflow-hidden', this.isMounted());
    });

    effect(() => {
      if (this.isMounted() && !this.isClosing()) {
        requestAnimationFrame(() => this.panelRef()?.nativeElement.focus());
      }
    });
  }

  dismiss(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  private currentType(): MovementType {
    return this.displayedMovement()?.type ?? 'EXPENSE';
  }

  private toAccountView(account?: Account): AccountView {
    return {
      name: account?.name ?? 'Sin cuenta',
      isRoot: account?.isRoot === true,
      typeName: account?.type?.name ?? '',
      icon: account?.type?.icon ?? FALLBACK_ACCOUNT_ICON,
      color: accountColor(account?.type?.color).chip,
    };
  }
}
