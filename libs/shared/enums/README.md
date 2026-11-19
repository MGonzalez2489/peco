# enums

Framework-free string enums shared by the API and the web app. Every member is
consumed through `EnumName.MEMBER.toString()`, which keeps both the wire value
and the literal TypeScript type.

## Running unit tests

Run `nx test enums` to execute the unit tests via [Vitest](https://vitest.dev/).
