import type {ApiErrorCode} from '@peco/contracts';
import {ApiErrorCodeEnum} from '@peco/enums';

/** Spanish copy used when presenting API failures (8.3). */
export const API_ERROR_UI_COPY: {
  readonly title: string;
  readonly fallbackMessage: string;
  readonly messages: Record<ApiErrorCode, string>;
} = {
  title: 'No se pudo completar la operación',
  fallbackMessage: 'Ocurrió un error inesperado. Intenta de nuevo.',
  messages: {
    [ApiErrorCodeEnum.VALIDATION_ERROR.toString()]: 'Revisa los datos enviados.',
    [ApiErrorCodeEnum.PAYLOAD_TOO_LARGE.toString()]:
      'El cuerpo de la solicitud es demasiado grande.',
    [ApiErrorCodeEnum.INVALID_RESET_TOKEN.toString()]:
      'El enlace de recuperación no es válido o ya expiró.',
    [ApiErrorCodeEnum.UNAUTHORIZED.toString()]: 'Debes iniciar sesión para continuar.',
    [ApiErrorCodeEnum.TOKEN_EXPIRED.toString()]: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    [ApiErrorCodeEnum.INVALID_CREDENTIALS.toString()]:
      'El correo o la contraseña no son correctos.',
    [ApiErrorCodeEnum.REFRESH_TOKEN_REUSED.toString()]:
      'Tu sesión fue invalidada por seguridad. Vuelve a iniciar sesión.',
    [ApiErrorCodeEnum.REFRESH_TOKEN_EXPIRED.toString()]:
      'Tu sesión de renovación expiró. Vuelve a iniciar sesión.',
    [ApiErrorCodeEnum.FORBIDDEN.toString()]: 'No tienes permiso para realizar esta acción.',
    [ApiErrorCodeEnum.NOT_FOUND.toString()]: 'El recurso solicitado no existe.',
    [ApiErrorCodeEnum.EMAIL_ALREADY_REGISTERED.toString()]: 'Ese correo ya está registrado.',
    [ApiErrorCodeEnum.VERSION_CONFLICT.toString()]: 'El recurso fue modificado por otra operación.',
    [ApiErrorCodeEnum.IDEMPOTENCY_KEY_REUSED.toString()]:
      'La clave de idempotencia ya fue usada con otros datos.',
    [ApiErrorCodeEnum.PERIOD_CLOSED.toString()]: 'El período está cerrado y no admite cambios.',
    [ApiErrorCodeEnum.MOVEMENT_LOCKED.toString()]:
      'El movimiento está bloqueado y no se puede modificar.',
    [ApiErrorCodeEnum.MOVEMENT_NOT_FOUND.toString()]: 'El movimiento solicitado no existe.',
    [ApiErrorCodeEnum.ROOT_ACCOUNT_PROTECTED.toString()]:
      'La cuenta principal no se puede eliminar.',
    [ApiErrorCodeEnum.CATEGORY_SYSTEM_PROTECTED.toString()]:
      'La categoría del sistema no se puede modificar.',
    [ApiErrorCodeEnum.CATEGORY_NAME_TAKEN.toString()]:
      'Ya existe una categoría activa con ese nombre.',
    [ApiErrorCodeEnum.TRANSFER_REQUIRED.toString()]: 'Se requiere una cuenta de destino válida.',
    [ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString()]:
      'Solo las tarjetas de crédito pueden tener saldo negativo.',
    [ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE.toString()]:
      'Solo se pueden cerrar períodos anteriores al actual.',
    [ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString()]:
      'El período es anterior al primer movimiento.',
    [ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()]: 'El pago programado todavía no corresponde.',
    [ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString()]: 'El pago programado está pausado.',
    [ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString()]: 'Esa ocurrencia ya fue procesada.',
    [ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString()]:
      'La operación no se puede completar con esos datos.',
    [ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE.toString()]:
      'La categoría no acepta ese tipo de movimiento.',
    [ApiErrorCodeEnum.RATE_LIMITED.toString()]:
      'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
    [ApiErrorCodeEnum.INTERNAL_ERROR.toString()]: 'Ocurrió un error inesperado. Intenta de nuevo.',
  },
};
