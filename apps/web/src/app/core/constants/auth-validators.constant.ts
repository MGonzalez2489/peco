import {Validators, type ValidatorFn} from '@angular/forms';

/** Client-side limits matching the auth API DTOs (8.6). */
export const AUTH_VALIDATORS: Readonly<
  Record<'email' | 'password' | 'name' | 'token', ValidatorFn[]>
> = {
  email: [
    Validators.required,
    Validators.email,
    Validators.minLength(5),
    Validators.maxLength(254),
  ],
  password: [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
  name: [Validators.required, Validators.minLength(1), Validators.maxLength(80)],
  token: [Validators.required, Validators.minLength(1), Validators.maxLength(512)],
};
