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
- 1. Color / Status Dot (`w-3.5h-3.5 rounded-full shrink-0`).
- 2. Item Title (`text-sm font-semibold text-slate-900`).
- 3. Optional Badges (`Base, Excluida,` 📌) placed inline with subtle borders/colors.

- **Right Side:**
- 1. Primary Value / Balance (`text-sm font-bold text-slate-900 or text-rose-600 if negative`).
- 2. Action Indicator (`chevron-right SVG w-4 h-4 text-slate-300`).

### **B. Desktop View (`lg`: Breakpoint)** On desktop

On desktop screens, the row transforms into a 12-column alignment grid (`lg:grid lg:grid-cols-12 lg:items-center
lg:gap-4`):

- 1. **Columns 1 to 5 (Identity & Badges):
  - Color indicator dot.
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
          class="w-3.5 h-3.5 rounded-full shrink-0"
          [style.backgroundColor]="item.color || '#6366f1'"
        >
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
