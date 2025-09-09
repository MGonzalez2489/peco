import { api } from "@config/api/api";
import { ResultListDto } from "@infrastructure/dtos/responses";
import { SearchDto } from "@infrastructure/dtos/search.dto";
import { Account } from "src/domain/entities";

export const loadAccounts = async () => {
  try {
    //TODO: FIX QUERY PARAMS
    const s = new SearchDto();
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
