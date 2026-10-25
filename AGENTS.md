You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Code Style

- **All code, comments, and documentation must be written in English.**
- Use English for variable names, function names, and commit messages.
- Do not use natural language comments in other languages; translate them to English.
- ONLY html content (labels, paragraphs, buttons, etc) must be written in Spanish.

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Prefer inline templates for small components (less than 20 lines)
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Code Generation Guidelines

Remember the following guidelines for continuing to generate Angular application code:

- To generate components, use the Angular CLI `npx ng generate component <component-name>`
- To generate services, use the Angular CLI `npx ng generate service <service-name>`
- To generate pipes, use the Angular CLI `npx ng generate pipe <pipe-name>`
- To generate directives, use the Angular CLI `npx ng generate directive <directive-name>`
- To generate interfaces, use the Angular CLI `npx ng generate interface <interface-name>`
- To generate guards, use the Angular CLI `npx ng generate guard <guard-name>`
- To generate interceptors, use the Angular CLI `npx ng generate interceptor <interceptor-name>`
- To generate resolvers, use the Angular CLI `npx ng generate resolver <resolver-name>`
- To generate enums, use the Angular CLI `npx ng generate enum <enum-name>`
- To generate classes, use the Angular CLI `npx ng generate class <class-name>`

_IMPORTANT_: Take note of the path returned from running the generate commands so that you know exactly where the new files are.

Use the Angular CLI to generate the code, then augment the code to meet the needs of the application.

### Architecture & Naming Conventions

1. Models MUST be located in `app/core/models/` using the format `name.model.ts`.
2. DTOs MUST be located in `app/core/dtos/` using the format `name.dto.ts`.
3. Custom Types MUST be located in `app/core/types/` using the format `name.type.ts`.
4. Utility functions MUST be located in `app/core/utils/` using the format `name.util.ts`.
5. Constants MUST be located in `app/core/constants/` using the format `name.constant.ts`.
6. Strict Single Export Rule: NEVER include more than one `export` statement per file across models, DTOs, types, constants, or utilities.

### Persistence: LocalStorage Key Naming Standard

**MANDATORY POLICY:** ALL keys saved in `localStorage` MUST strictly follow the `peco.<kebab-case-domain>` format.

- **Allowed Keys:**
  - `peco.accounts`
  - `peco.transactions` (or `peco.movements`)
  - `peco.catalog.categories`
  - `peco.scheduled-transactions` (Renamed from `peco_scheduled_transactions`)
  - `peco.user-preferences` (Encapsulated user preferences object)
- Legacy keys (`peco_*`, `peco.cuentas`, `peco.categories`, `peco.theme`, `peco.pwa-banner-dismissed-at`) MUST be migrated to the standard format on service initialization and then removed.
- Every new persisted key MUST be declared in `src/app/core/constants/local-storage-keys.constant.ts` and MUST NOT be hardcoded at the call site.
- All persistence of user-facing preferences (theme, dismissed banners, etc.) MUST go through `UserPreferencesStore` / `UserPreferencesStorageService` instead of raw `localStorage` access.

## Iconography & UI Standards

### Rules for Icons Usage:

1. **NO Hardcoded Inline `<svg>` Tags:** Raw `<svg>` elements in Angular templates are strictly prohibited. Always use `<app-icon>`.
2. **Centralized Icon Provider:** All icons MUST be registered in `src/app/core/icons/app-icons.provider.ts` to preserve tree-shaking efficiency.
3. **Strongly Typed Names:** When adding a new icon:
   - Import the icon from `lucide-angular` in `app-icons.provider.ts`.
   - Add it to the `ALLOWED_ICONS` object.
   - Update the `IconName` union type in `src/app/shared/components/app-icon/app-icon.component.ts`.
4. **Usage Syntax:**
   ```html
   <app-icon name="search" size="18" class="text-gray-400" />
   ```

### Entity Icon Tile (Soft Rounded Container)

**MANDATORY POLICY:** Every entity indicator (account, movement, category, etc.) MUST use the
**soft icon tile** pattern instead of a plain colored dot. The tile is a rounded container with a
soft (alpha `20`) background and the entity-colored icon in the center:

```html
<span
  aria-hidden="true"
  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
  [style.background-color]="toSoftCategoryColor(color, '20')"
>
  <app-icon [name]="icon" size="16" class="h-4 w-4" [style.color]="color" />
</span>
```

1. **Background:** the soft variant of the entity color, computed with `toSoftCategoryColor(color, '20')`.
2. **Icon color:** the entity palette color (for accounts and movements use `accountColor(color).chip`).
3. **Icon & color source per entity (never hardcoded in templates):**
   - **Accounts:** from `account.type`. Use `resolveAccountIcon(account)` and `resolveAccountColor(account)` (they honor the optional `account.icon` / `account.color` overrides).
   - **Movements:** from `movement.type`. Look up the icon and color in `MOVEMENT_TYPES` (`@core/constants`).
   - **Categories:** from `category.icon` and `category.color`.
4. A plain color dot (`w-3.5 h-3.5 rounded-full`) is only acceptable when the entity has NO icon at all.

# UI Standard Rule: Unified Inset Grouped List Pattern

## 1. Core UX Rule & Scope

**MANDATORY POLICY:** ALL item lists across the application (Accounts, Transactions, Categories, Scheduled Payments, Settings options, etc.) MUST strictly follow the **Unified Inset Grouped List** pattern.  
**NEVER** render repetitive list items as separate floating cards (`bg-white shadow rounded-xl` per item with margins between them).  
**ALWAYS** group all items inside a SINGLE outer container with internal row dividers (`divide-y divide-slate-100`).

---

## 2. Container Anatomy & Tailwind Specifications

### A. Outer List Container

The list wrapper MUST always use the following exact Tailwind classes:

```html
<div
  class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-sm"
>
  <!-- Items rendered inside using @for -->
</div>
```

### B. Row Item (`Row Item Wrapper`)

Each row item inside the list MUST be formatted as an interactive container with subtle hover effects:

```html
<div
  (click)="onSelectItem(item)"
  class="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors group"
>
  <!-- Inner Grid / Flex Layout -->
</div>
```

## 3. Responsive Row Content Layout

### A. Mobile View (`< lg Breakpoint`) On mobile

On mobile devices, each row MUST be a clean 2-side flex row:

- **Left Side:**
- 1. Entity Icon Tile (soft rounded container with the entity icon; see the *Entity Icon Tile* rule under *Iconography & UI Standards*). A plain color dot is only allowed when the entity has NO icon.
- 2. Item Title (`text-sm font-semibold text-slate-900`).
- 3. Optional Badges (`Base, Excluida,` 📌) placed inline with subtle borders/colors.

- **Right Side:**
- 1. Primary Value / Balance (`text-sm font-bold text-slate-900 or text-rose-600 if negative`).
- 2. Action Indicator (`chevron-right SVG w-4 h-4 text-slate-300`).

### **B. Desktop View (`lg`: Breakpoint)** On desktop

On desktop screens, the row transforms into a 12-column alignment grid (`lg:grid lg:grid-cols-12 lg:items-center
lg:gap-4`):

- 1. **Columns 1 to 5 (Identity & Badges):
  - Entity Icon Tile (soft rounded container with the entity icon).
  - Title + Inline Status Badges (`Base,` 📌, Excluida del total).

- 2. **Columns 6 to 9 (Optional Metadata / Goal Progress Bar):
  - If a target goal exists (`targetGoal` \> 0), display a compact progress indicator:
  - Text label: "Meta: \$X,XXX.XX" \+ Percentage ("XX%").
  - Micro progress bar (`h-1.5 bg-slate-100  rounded-full overflow-hidden`).
  - If no goal exists, leave column space clean for visual breathability.

- 3. **Columns 10 to 12 (Primary Value & Action Trigger):
  - Formatted currency balance/amount (`text-sm font-bold`).
  - Hover Action Text: "Editar →" (`opacity-0 group-hover:opacity-100 text-xs font-semibold text-indigo-600 transition-opacity`).
  - Hide the chevron icon on desktop (`hidden lg:hidden`).

## 4. Code Template Reference (Angular 22 Component Template)

```html
<div
  class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-sm"
>
  @for (item of items(); track item.id) {
  <div
    (click)="onSelectItem(item)"
    class="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors group"
  >
    <div class="flex items-center justify-between lg:grid lg:grid-cols-12 lg:gap-4">
      <!-- COLUMNS 1-5: IDENTITY & BADGES -->
      <div class="flex items-center gap-3 lg:col-span-5 min-w-0">
        <span
          aria-hidden="true"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          [style.backgroundColor]="toSoftCategoryColor(item.color || '#6366f1', '20')"
        >
          <app-icon
            [name]="item.icon"
            size="16"
            class="h-4 w-4"
            [style.color]="item.color || '#6366f1'"
          />
        </span>

        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-slate-900 truncate">{{ item.name }}</span>

            @if (item.isRoot) {
            <span
              class="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200"
            >
              Base
            </span>
            } @if (item.pinToHome) {
            <span class="text-xs text-slate-400" title="Fijada en inicio">📌</span>
            }
          </div>
        </div>
      </div>

      <!-- COLUMNS 6-9: DESKTOP METADATA / GOAL PROGRESS (HIDDEN ON MOBILE) -->
      <div class="hidden lg:block lg:col-span-4">
        @if (item.targetGoal && item.targetGoal > 0) { @let progress =
        getGoalProgress(item.currentBalance, item.targetGoal);
        <div class="space-y-1 max-w-[200px]">
          <div class="flex justify-between items-center text-[11px] text-slate-500 font-medium">
            <span>Meta: ${{ item.targetGoal | number:'1.2-2' }}</span>
            <span class="font-bold text-slate-700">{{ progress }}%</span>
          </div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              [style.width.%]="progress"
              [style.backgroundColor]="item.color || '#6366f1'"
            ></div>
          </div>
        </div>
        }
      </div>

      <!-- COLUMNS 10-12: AMOUNT & ACTIONS -->
      <div class="flex items-center justify-end gap-3 lg:col-span-3 text-right">
        <span
          class="text-sm font-bold block"
          [class.text-rose-600]="item.currentBalance < 0"
          [class.text-slate-900]="item.currentBalance >= 0"
        >
          ${{ item.currentBalance | number:'1.2-2' }}
        </span>

        <!-- Desktop Hover Action -->
        <span
          class="hidden lg:inline-block opacity-0 group-hover:opacity-100 text-xs font-semibold text-indigo-600 transition-opacity whitespace-nowrap"
        >
          Editar →
        </span>

        <!-- Mobile Chevron Icon -->
        <svg
          class="w-4 h-4 text-slate-300 lg:hidden shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
  }
</div>
```

### Language Standards:

- All code, types, inputs, and components MUST be in English.
- Accessible labels (aria-label) on icon-only buttons MUST be in Spanish (e.g., aria-label="Buscar movimiento").

---

# User Preferences Architecture

**MANDATORY POLICY:** Every user-facing preference MUST be stored in the single `peco.user-preferences` object and accessed exclusively through `UserPreferencesStore`. Never read or write preference values with raw `localStorage` from a component.

## 1. Data Model (`src/app/core/models/`)

`UserPreferences` groups preferences by logical **section** so new domains can be added without touching unrelated features. Each section lives in its own model file (Single Export Rule).

```ts
// account-preferences.model.ts
export interface AccountPreferences {
  hideBalance: boolean;
}

// user-preferences.model.ts
import {AccountPreferences} from './account-preferences.model';
import {AppTheme} from '../types/app-theme.type';

export interface UserPreferences {
  theme: AppTheme;
  pwaBannerDismissedAt: string | null;
  accounts: AccountPreferences;
}
```

- A **boolean** preference is a plain `boolean` field inside its section (`accounts.hideBalance`).
- A **selection** preference is a union type field (e.g. `AppTheme = 'light' | 'dark' | 'system'`) inside its section.
- Every new section interface MUST be exported from `src/app/core/models/index.ts`.
- The default object lives in `src/app/core/constants/default-user-preferences.constant.ts` and MUST be updated whenever the schema changes.

## 2. Storage Service with Backward Compatibility (`src/app/core/services/user-preferences-storage.service.ts`)

Reading MUST never throw on old payloads. Merge every field with its default and add a dedicated merge helper per section:

```ts
const mergeWithDefaults = (value: unknown): UserPreferences => {
  if (typeof value !== 'object' || value === null) {
    return {...DEFAULT_USER_PREFERENCES};
  }

  const candidate = value as Partial<UserPreferences> & {accounts?: unknown};

  return {
    theme: typeof candidate.theme === 'string' ? normalizeTheme(candidate.theme) : DEFAULT_USER_PREFERENCES.theme,
    pwaBannerDismissedAt:
      typeof candidate.pwaBannerDismissedAt === 'string'
        ? normalizeDismissedAt(candidate.pwaBannerDismissedAt)
        : null,
    accounts: mergeAccountsWithDefaults(candidate.accounts),
  };
};

/** Payloads persisted before the `accounts` section existed merge with defaults. */
const mergeAccountsWithDefaults = (value: unknown): AccountPreferences => {
  if (typeof value !== 'object' || value === null) {
    return {...DEFAULT_USER_PREFERENCES.accounts};
  }

  const candidate = value as Partial<AccountPreferences>;

  return {
    hideBalance:
      typeof candidate.hideBalance === 'boolean'
        ? candidate.hideBalance
        : DEFAULT_USER_PREFERENCES.accounts.hideBalance,
  };
};
```

- Always guard on the exact expected `typeof` and fall back to the default. Never trust the parsed payload shape.
- `save()` writes the FULL `UserPreferences` object to `peco.user-preferences` in a single `JSON.stringify`.

## 3. Signal Store (`src/app/core/stores/user-preferences.store.ts`)

Expose section-level computed signals plus one generic update method per section and a dedicated toggle helper for booleans:

```ts
withComputed(({preferences}) => ({
  theme: computed(() => preferences().theme),
  pwaBannerDismissedAt: computed(() => preferences().pwaBannerDismissedAt),
  isPwaBannerDismissed: computed(() => !!preferences().pwaBannerDismissedAt),
  accountsPreferences: computed(() => preferences().accounts),
  hideBalance: computed(() => preferences().accounts.hideBalance),
})),
```

Inside `withMethods`, define reusable local helpers in the closure (sibling methods cannot be referenced from the returned object literal), then expose them:

```ts
const commit = (changes: Partial<UserPreferences>): void => {
  const preferences: UserPreferences = {...store.preferences(), ...changes};
  patchState(store, {preferences});
  storage.save(preferences);
};

const updateAccountPreferences = (partial: Partial<AccountPreferences>): void => {
  const accounts: AccountPreferences = {...store.accountsPreferences(), ...partial};
  commit({accounts});
};

return {
  // required for every section, not just the booleans
  updateAccountPreferences,
  toggleHideBalance(): void {
    updateAccountPreferences({hideBalance: !store.hideBalance()});
  },
};
```

## 4. Reusable Settings UI Components (`src/app/shared/components/`)

**Anti-Duplication Principle:** Do NOT hand-roll preference rows in the settings view. Always use
these reusable, standalone, single-responsibility components. They render only the row layout —
they hold no state; the parent view owns the store binding.

### A. Boolean Toggle Row — `SettingToggleRowComponent`

```html
<!-- src/app/shared/components/setting-toggle-row/setting-toggle-row.component.html -->
<label class="flex items-center justify-between gap-4 p-4 transition-colors" ...>
  <span class="min-w-0">
    <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ title() }}</span>
    <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{{ description() }}</span>
  </span>
  <span class="relative inline-flex shrink-0 items-center">
    <input type="checkbox" role="switch" class="peer sr-only" [checked]="checked()" (change)="onCheckboxChange($event)" />
    <!-- slider track + thumb -->
  </span>
</label>
```

- Inputs: `title` (required), `description` (required), `checked` (default `false`), `disabled` (default `false`).
- Output: `checkedChange` emitting the new `boolean`.
- The toggle is an `<input type="checkbox" role="switch">`, so it is keyboard/AT accessible by default.
- **Rows carry NO icon** — do not add an `icon` input or an icon tile to setting rows.

### B. Selection Row — `AppSelectComponent` (`src/app/shared/components/app-select/`)

For finite choice preferences (theme, currency, start-of-week, etc.) use the existing `<app-select>`,
never a native `<select>` or a custom dropdown.

```html
<app-select
  controlId="pref-theme"
  ariaLabel="Tema"
  [options]="themeOptions"
  [value]="theme()"
  (valueChange)="onThemeChange($event)"
/>
```

- Value options come from a `readonly SelectOption[]` constant in `src/app/core/constants/` (e.g. `THEME_OPTIONS`), declaring `value`, `label` (Spanish) and an optional `icon`/`color`.
- The component supports both signal inputs (`value` + `valueChange`) and `ControlValueAccessor` for reactive forms.

## 5. Privacy / Obscured Value Formatting (`src/app/shared/pipes/`)

When a preference must hide real values across the app, create ONE global pipe that consumes the
store and use it everywhere. NEVER inline the obscuring logic in templates or duplicate it.

```ts
// src/app/shared/pipes/privacy-currency.pipe.ts
@Pipe({name: 'privacyCurrency', standalone: true, pure: false})
export class PrivacyCurrencyPipe implements PipeTransform {
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return this.userPreferencesStore.hideBalance() ? '--.--' : formatCurrency(value);
  }
}
```

- The pipe is **impure** (`pure: false`) so every binding re-evaluates when the preference changes.
- Apply it to ALL sensitive numeric displays of the affected domain: cards, list rows, detail
  headers, summary totals and modal details. Replace direct `| currency` usage in those spots.
- When a TypeScript-produced string needs the same protection (e.g. a `computed` label), inject
  `UserPreferencesStore` in the component and branch on the same boolean — keep the token identical
  (`'--.--'`) so the app reads consistently.

## 6. Settings View Wiring (`src/app/features/settings/components/...`)

Group the view into labeled sections, one per preference domain, following the Inset Grouped List
pattern (a single rounded container per section with `divide-y` rows):

```html
<!-- APARIENCIA -->
<h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Apariencia</h3>
<div class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
  <div class="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
    <app-select controlId="pref-theme" ariaLabel="Tema" [options]="themeOptions" [value]="theme()" (valueChange)="onThemeChange($event)" />
  </div>
</div>

<!-- CUENTAS -->
<h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cuentas</h3>
<div class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
  <app-setting-toggle-row
    title="Esconder balances"
    description="Muestra o esconde los balances de las cuentas en toda la aplicación."
    [checked]="hideBalance()"
    (checkedChange)="onHideBalanceChange()"
  />
</div>
```

- The component injects `UserPreferencesStore` and exposes thin `computed` signals + handlers; the
  template binds them. Do not call store methods directly from arbitrary templates.
- Section headers and row copy are **Spanish**; inputs/handlers/types are **English**.

## 7. Backup & Restore (`DataBackupService`)

**MANDATORY POLICY:** Preferences are ALWAYS part of a backup, and MUST be exported from the
store — never read straight from `localStorage`. New preference fields are included automatically
because the whole `UserPreferences` object is serialized.

- **Export:** `exportData()` writes every `peco.` app key, skips the raw
  `peco.user-preferences` entry, and re-adds `data[LOCAL_STORAGE_KEYS.userPreferences]` from
  `userPreferencesStore.preferences()`. This guarantees the payload is complete and normalized
  (with all sections) even if the cached localStorage value is stale or missing.
- **Import:** `importData(file, selection)` restores preferences ONLY when
  `selection.preferences` is `true`; importing business data must never silently overwrite the
  device's settings. `BackupImportSelection` therefore includes a `preferences: boolean` flag, and
  the import modal renders a **Preferencias** checkbox wired to it.
- **Forward/backward compatibility:**
  - `normalizeImportedPreferences()` merges the imported payload with the current preferences, so
    older backups missing newer sections fall back to the current device values instead of breaking.
  - Backups created before the consolidated key existed stored the legacy
    `peco.theme` / `peco.pwa-banner-dismissed-at` keys; `importPreferences()` restores those when the
    consolidated key is absent (they get consolidated on next startup).
- `resetAllData()` writes `DEFAULT_USER_PREFERENCES`, restoring a clean preference state.

Whenever a new preference is added, no change to `DataBackupService` is required — verify only that
the export/import specs still pass and that the new field round-trips.

## 8. New User Preference — Step-by-Step Checklist

1. Add the field to the correct section interface in `src/app/core/models/` (create a new
   `name-preferences.model.ts` for a new domain) and export it from `models/index.ts`.
2. Add its default to `DEFAULT_USER_PREFERENCES`.
3. Add a per-section merge helper in `UserPreferencesStorageService` and wire it into
   `mergeWithDefaults` so old payloads fall back to the default.
4. Add the computed signal(s) + `update<Section>Preferences` (and a `toggle<Field>` for booleans)
   to `UserPreferencesStore`.
5. Render the row in the settings view using `SettingToggleRowComponent` (boolean) or `AppSelectComponent` (selection).
6. If the preference hides/obscures values, add or reuse a single global pipe and apply it to every
   affected display.
7. Confirm it round-trips through the backup: export/import reads the whole `UserPreferences`
   object (see section 7), so no service change is needed — just keep the specs green.
8. Cover it with specs: storage (round-trip + fallback when the field is missing), store
   (signal + persistence), and the settings view (render + interaction).

### Language Standards:

- All code, types, inputs, and components MUST be in English.
- Accessible labels (aria-label) on icon-only buttons MUST be in Spanish (e.g., aria-label="Buscar movimiento").

# Monetary Values & Financial Rules

## 1. Storage in Integer Cents

**MANDATORY POLICY:** Every monetary amount MUST be persisted, modeled, and manipulated as an
**integer number of cents**. Decimal values are only allowed at the UI boundary (form controls and
formatted display strings).

- Models, DTOs, stores, and `localStorage` payloads hold integer cents (`$1,500.00` is `150000`).
- Money inputs keep working in decimal dollars. Convert at the form boundary only:
  - Prefill: `fromCents(model.amount)`.
  - Submit: `toCents(rawFormValue)`.
- Never store, sum, or compare decimal dollars. Accounting totals are plain integer additions.
- Transaction and scheduled amounts are always **positive magnitudes**; income/expense direction
  comes from the `type` field, never from the sign of the amount.

## 2. Conversion Utilities

The conversion helpers live in `src/app/core/utils/` (one export per file, as always):

| Utility | File | Behavior |
| --- | --- | --- |
| `toCents(amount)` | `to-cents.util.ts` | `Math.round(amount * 100)` |
| `fromCents(cents)` | `from-cents.util.ts` | `cents / 100` |
| `formatCentsToCurrency(cents)` | `format-cents-to-currency.util.ts` | Localized `$` string |
| `formatCurrency(decimal)` | `format-currency.util.ts` | Decimal-only formatter |

- Use `formatCentsToCurrency` for every value that comes from a model, store, or pipe.
- `formatCurrency` is reserved for values already converted to decimal (e.g. before passing a
  cents series to a compact chart axis, divide with `fromCents` first).
- The global `privacyCurrency` pipe consumes **cents** and already applies
  `formatCentsToCurrency`. Prefer it in templates over the Angular `currency` pipe.

## 3. Two-Decimal Input Limit

Every money input MUST use `CurrencyInputDirective` (`appCurrencyInput`), which truncates typed
values to at most two decimals (`12.345` becomes `12.34`). Never accept raw `type="number"` for
money.

## 4. Negative Balances Are Credit-Only

**MANDATORY POLICY:** Only accounts with `type === 'CREDIT'` may hold a negative balance (an
outstanding debt). Every other account type must keep a balance `>= 0`.

- UI: `AccountFormModalComponent` applies the `negativeBalanceForbidden` validator to non-credit
  types and shows the Spanish error
  `"Solo las tarjetas de crédito pueden registrar un saldo inicial negativo"`.
- Money inputs allow typing `-` for every account type so the validator can explain the rule;
  do not silently strip the minus sign.
- Store: `AccountsStore.createAccount` / `updateAccount` defensively clamp non-credit balances to
  `0` with `Math.max(0, balance)`. Never rely on the form alone to enforce the invariant.
- Scheduled transfers, movements, and goals must stay non-negative magnitudes.

## 5. Schema Migration

- The cents schema is versioned by `AMOUNT_SCHEMA_VERSION` and persisted at
  `LOCAL_STORAGE_KEYS.schemaVersion` (`peco.schema-version`).
- `migrateAmountsToCents()` performs a one-time, global migration of every amount-bearing key
  (accounts, movements, scheduled transactions, and their legacy aliases) and stamps the version.
- It runs from the `AccountsStorageService`, `MovementsStorageService`, and
  `ScheduledTransactionsStorageService` constructors **before** any read.
- New amount-bearing keys MUST be added to the migration map, and the schema version bumped
  whenever the stored representation changes.

## 6. Backup Compatibility

- `exportData()` writes cents because it serializes the current `localStorage` state.
- `importData()` runs `migrateBackupAmountsToCents()` on every imported payload: backups without
  `peco.schema-version` predate the cents schema and are converted before they are written.
- The import always stamps `peco.schema-version` so the startup migration does not convert the
  imported cents a second time.
- `resetAllData()` also stamps the schema version after seeding cents data.

## 7. Verification Checklist

Before shipping a change that touches money:

1. A non-credit account cannot save a negative balance and shows the Spanish error.
2. A credit card saved with `-$1,500.00` persists `-150000` cents and displays `-$1,500.00`.
3. Money inputs reject a third decimal.
4. Existing decimal `localStorage` data migrates exactly once and is not double-converted.
5. `npm test` and `ng build` pass.
