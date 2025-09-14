import { LoginDto, TokenDto } from "@infrastructure/dtos/auth";
import { ResultDto } from "@infrastructure/dtos/responses";
import { isAxiosError } from "axios";
import { api } from "config/api/api";

export const LoginAction = async (dto: LoginDto) => {
  try {
    const { data } = await api.post<ResultDto<TokenDto>>("auth/login", dto);
    return data.data;
  } catch (error) {
    console.log("error", error);
    if (isAxiosError(error)) {
      console.log("Axios error", error);
      throw new Error(error.response?.data.message);
    }
    throw new Error("Unespected error");
  }
};
