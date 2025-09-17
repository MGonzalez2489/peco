// return this.reqService.post<Entry>(`entries`, newEntry);

import { api } from '@config/api/api';
import { Entry } from '@domain/entities';
import { CreateEntryDto } from '@infrastructure/dtos/entries';
import { ResultDto } from '@infrastructure/dtos/responses';
import { isAxiosError } from 'axios';

export const CreateEntry = async (dto: CreateEntryDto) => {
  try {
    const { data } = await api.post<ResultDto<Entry>>(`entries`, dto);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log('Axios error', error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log('Error creating entry', error);
  }
};
