import { api } from "../../../config/api/api";
import { Account } from "../../domain/entities";
import { ResultListDto } from "../../infrastructure/dtos/responses";
import { SearchDto } from "../../infrastructure/dtos/search.dto";

export const accountsLoad = async () => {
  try {
    const s = new SearchDto();
    // const url = `accounts?page=${s.page}&take=${s.take}&showAll=${s.showAll}&order="DESC"&orderBy="createdAt"`;
    const queryString = objToQueryString(s);
    const { data } = await api.get<ResultListDto<Account>>(
      `accounts?${queryString}`,
    );
    return data;
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
