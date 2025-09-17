import { api } from '@config/api/api';
import { Account } from '@domain/entities';
import { ResultListDto } from '@infrastructure/dtos/responses';
import { SearchDto } from '@infrastructure/dtos/search.dto';
import { objToQueryString } from '@infrastructure/utils';
import { isAxiosError } from 'axios';

export const LoadAccounts = async () => {
  try {
    //TODO: FIX QUERY PARAMS
    const s = new SearchDto();
    const queryString = objToQueryString(s);
    const { data } = await api.get<ResultListDto<Account>>(`accounts?${queryString}`);
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log('Axios error', error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log('Error fetching accounts', error);
  }
};
