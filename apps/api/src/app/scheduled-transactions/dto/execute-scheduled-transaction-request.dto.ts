import type {ExecuteScheduledTransactionRequest} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, IsOptional, Max, Min} from 'class-validator';

/** Optional one-off amount override; the API only accepts integer cents (10.5/US-604). */
export class ExecuteScheduledTransactionRequestDto implements ExecuteScheduledTransactionRequest {
  @ApiPropertyOptional({
    example: 75000,
    description: 'Importe en centavos que sustituye al estimado solo en esta ocurrencia.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  actualAmount?: number;
}
