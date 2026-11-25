import type {INestApplication} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {CreateAccountRequestDto} from '../../accounts/dto/create-account-request.dto';
import {ListMovementsQueryDto} from '../../movements/dto/list-movements-query.dto';
import {AccountPeriodBalanceResponseDto} from '../../periods/dto/account-period-balance-response.dto';
import {PreferencesResponseDto} from '../../preferences/dto/preferences-response.dto';
import {UpdatePreferencesRequestDto} from '../../preferences/dto/update-preferences-request.dto';
import {ClosePeriodParamsDto} from '../../periods/dto/close-period-params.dto';
import {PeriodSnapshotResponseDto} from '../../periods/dto/period-snapshot-response.dto';
import {ApplyDueRequestDto} from '../../scheduled-transactions/dto/apply-due-request.dto';
import {ApplyDueResponseDto} from '../../scheduled-transactions/dto/apply-due-response.dto';
import {CancelScheduledOccurrenceRequestDto} from '../../scheduled-transactions/dto/cancel-scheduled-occurrence-request.dto';
import {DueSchedulesQueryDto} from '../../scheduled-transactions/dto/due-schedules-query.dto';
import {ExecuteScheduledTransactionRequestDto} from '../../scheduled-transactions/dto/execute-scheduled-transaction-request.dto';
import {ListScheduledTransactionsQueryDto} from '../../scheduled-transactions/dto/list-scheduled-transactions-query.dto';
import {ToggleScheduledTransactionRequestDto} from '../../scheduled-transactions/dto/toggle-scheduled-transaction-request.dto';
import {UpdateScheduledTransactionRequestDto} from '../../scheduled-transactions/dto/update-scheduled-transaction-request.dto';
import {ListQueryDto} from '../dto/list-query.dto';

/** Builds the OpenAPI document from the same DTOs used by validation. */
export const createOpenApiDocument = (app: INestApplication) => {
  const documentConfig = new DocumentBuilder()
    .setTitle('Peco API')
    .setDescription(
      'API de Peco. Las respuestas correctas envuelven el resultado en {data, error}; las listas incluyen {data, meta, error} y los errores usan {data: null, error}. /health es plano y 204 no tiene cuerpo.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, documentConfig, {
    extraModels: [
      ListQueryDto,
      CreateAccountRequestDto,
      AccountPeriodBalanceResponseDto,
      ApplyDueRequestDto,
      ApplyDueResponseDto,
      ClosePeriodParamsDto,
      CancelScheduledOccurrenceRequestDto,
      DueSchedulesQueryDto,
      ExecuteScheduledTransactionRequestDto,
      ListMovementsQueryDto,
      ListScheduledTransactionsQueryDto,
      PeriodSnapshotResponseDto,
      PreferencesResponseDto,
      ToggleScheduledTransactionRequestDto,
      UpdatePreferencesRequestDto,
      UpdateScheduledTransactionRequestDto,
    ],
  });
};
