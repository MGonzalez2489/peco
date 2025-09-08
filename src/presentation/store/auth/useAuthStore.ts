import { create } from "zustand";
import { LoginDto, TokenDto } from "../../../infrastructure/dtos/auth.dto";
import { authLogin } from "../../../actions/auth/auth";
import { StorageAdapter } from "../../../../config/adapters/storage.adapter";

export interface AuthState {
  token?: TokenDto;
  user: any;
  isAuthenticated: boolean;

  login: (dto: LoginDto) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: undefined,
  user: undefined,
  isAuthenticated: false,

  login: async (dto: LoginDto) => {
    const response = await authLogin(dto);

    //todo: save token in storage
    await StorageAdapter.setItem("token", response.access_token);
    set({
      isAuthenticated: true,
      token: response,
    });

    return true;
  },
  logout: async () => {
    set({ isAuthenticated: false, token: undefined });
    await StorageAdapter.clearStorage();
  },
}));
