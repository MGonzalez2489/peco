import type {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

/** Group validator that keeps the confirmation control in sync with its password. */
export const passwordsMatch = (passwordKey: string, confirmationKey: string): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordKey)?.value;
    const confirmation = control.get(confirmationKey)?.value;

    return password === confirmation ? null : {passwordMismatch: true};
  };
};
