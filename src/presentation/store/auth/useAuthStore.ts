import { create } from "zustand";
import { LoginDto, TokenDto } from "../../../infrastructure/dtos/auth.dto";
import { authLogin } from "../../../actions/auth/auth";

export interface AuthState {
  token?: TokenDto;
  user: any;
  isAuthenticated: boolean;

  login: (dto: LoginDto) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: undefined,
  user: undefined,
  isAuthenticated: false,

  login: async (dto: LoginDto) => {
    const response = await authLogin(dto);

    //todo: save token in storage

    set({
      isAuthenticated: true,
      token: response,
    });

    return true;
  },
}));
