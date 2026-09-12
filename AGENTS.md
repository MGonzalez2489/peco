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
