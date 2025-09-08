import { api } from "../../../config/api/api";
import type { LoginDto, TokenDto } from "../../infrastructure/dtos/auth.dto";
import type { ResultDto } from "../../infrastructure/dtos/responses";

export const authLogin = async (dto: LoginDto) => {
  try {
    const { data } = await api.post<ResultDto<TokenDto>>("auth/login", dto);
    return data.data;
  } catch (error) {
    console.log("error", error);
  }
};
