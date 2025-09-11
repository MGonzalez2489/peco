import { api } from "@config/api/api";
import { Entry } from "@domain/entities";
import { EntrySearchDto } from "@infrastructure/dtos";
import { ResultListDto } from "@infrastructure/dtos/responses";
import { objToQueryString } from "@infrastructure/utils";
import { isAxiosError } from "axios";

export const LoadEntries = async (page: number, accountId?: string) => {
  try {
    const s = new EntrySearchDto();
    s.page = page;
    if (accountId) {
      s.accountId = accountId;
    }
    const queryString = objToQueryString(s);
    const { data } = await api.get<ResultListDto<Entry>>(
      `entries?${queryString}`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log("Error fetching entries", error);
  }
};
