import { api } from "@config/api/api";
import { CreateAccountDto } from "@infrastructure/dtos/accounts";
import { ResultDto } from "@infrastructure/dtos/responses";
import { isAxiosError } from "axios";
import { Account } from "src/domain/entities";

export const CreateAccount = async (dto: CreateAccountDto) => {
  try {
    const { data } = await api.post<ResultDto<Account>>("accounts", dto);
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log("Error creating account", error);
  }
};
