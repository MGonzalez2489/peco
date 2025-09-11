import { api } from "@config/api/api";
import { EntryStatus } from "@domain/entities";
import { ResultListDto } from "@infrastructure/dtos/responses";
import { SearchDto } from "@infrastructure/dtos/search.dto";
import { objToQueryString } from "@infrastructure/utils";
import { isAxiosError } from "axios";

export const loadEntryStatuses = async (search: SearchDto) => {
  try {
    const queryString = objToQueryString(search);
    const { data } = await api.get<ResultListDto<EntryStatus>>(
      `catalogs/entry-status?${queryString}`,
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log("Error fetching entry types", error);
  }
};
