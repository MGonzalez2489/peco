import { api } from "@config/api/api";
import { AccountType } from "@domain/entities";
import { ResultListDto } from "@infrastructure/dtos/responses";
import { SearchDto } from "@infrastructure/dtos/search.dto";
import { objToQueryString } from "@infrastructure/utils";
import { isAxiosError } from "axios";

export const loadAccountTypes = async (search: SearchDto) => {
  try {
    const queryString = objToQueryString(search);
    const { data } = await api.get<ResultListDto<AccountType>>(
      `catalogs/account-types?${queryString}`,
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log("Error fetching account types", error);
  }
};
