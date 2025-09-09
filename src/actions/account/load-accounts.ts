import { api } from "../../../config/api/api";
import { Account } from "../../domain/entities";
import { ResultListDto } from "../../infrastructure/dtos/responses";
import { SearchDto } from "../../infrastructure/dtos/search.dto";

export const accountsLoad = async (page: number) => {
  try {
    //TODO: FIX QUERY PARAMS
    const s = new SearchDto();
    s.page = page;
    // const url = `accounts?page=${s.page}&take=${s.take}&showAll=${s.showAll}&order="DESC"&orderBy="createdAt"`;
    const queryString = objToQueryString(s);
    const { data } = await api.get<ResultListDto<Account>>(
      `accounts?${queryString}`,
    );
    return data.data;
  } catch (error) {
    console.log("Error fetching accounts", error);
  }
};

function objToQueryString(obj) {
  const keyValuePairs = [];
  for (const key in obj) {
    keyValuePairs.push(
      encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]),
    );
  }
  return keyValuePairs.join("&");
}
