import type {AbstractControl} from '@angular/forms';

/** Spanish inline validation copy shared by the authentication forms. */
export const authControlError = (control: AbstractControl | null): string | null => {
  if (!control || !control.touched || !control.invalid) return null;

  if (control.hasError('required')) return 'Este campo es obligatorio.';

  if (control.hasError('email')) return 'Escribe un correo electrónico válido.';

  const minLength = control.getError('minlength');
  if (minLength) return `Debe tener al menos ${minLength.requiredLength} caracteres.`;

  const maxLength = control.getError('maxlength');
  if (maxLength) return `No puede superar los ${maxLength.requiredLength} caracteres.`;

  return 'Revisa este campo.';
};
