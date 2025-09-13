import { api } from "@config/api/api";
import { User } from "@domain/entities";
import { ResultDto } from "@infrastructure/dtos/responses";
import { isAxiosError } from "axios";

export const LoadUser = async () => {
  try {
    const { data } = await api.get<ResultDto<User>>(`user`);
    return data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log("Axios error", error.response?.data);
      throw new Error(error.response?.data.message);
    }
    console.log("Error fetching entries", error);
  }
};
