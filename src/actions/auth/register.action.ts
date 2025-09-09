import { LoginDto, TokenDto } from "@infrastructure/dtos/auth";
import { ResultDto } from "@infrastructure/dtos/responses";
import { isAxiosError } from "axios";
import { api } from "config/api/api";

export const RegisterAction = async (dto: LoginDto) => {
  try {
    const { data } = await api.post<ResultDto<TokenDto>>("auth/register", dto);
    console.log("register response", data.data);
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    throw new Error("Unespected error");
  }
};
