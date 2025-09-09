import { LoginAction, RegisterAction } from "@actions/auth";
import { LoginDto, TokenDto } from "@infrastructure/dtos/auth";
import { StorageAdapter } from "config/adapters";
import { create } from "zustand";

export interface AuthState {
  token?: TokenDto;
  user: any;
  isAuthenticated: boolean;

  login: (dto: LoginDto) => Promise<TokenDto>;
  register: (dto: LoginDto) => Promise<TokenDto>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: undefined,
  user: undefined,
  isAuthenticated: false,

  register: async (dto: LoginDto) => {
    const response = await RegisterAction(dto);

    await StorageAdapter.setItem("token", response.access_token);
    set({
      isAuthenticated: true,
      token: response,
    });

    return response;
  },
  login: async (dto: LoginDto) => {
    const response = await LoginAction(dto);

    await StorageAdapter.setItem("token", response.access_token);
    set({
      isAuthenticated: true,
      token: response,
    });

    return response;
  },
  logout: async () => {
    set({ isAuthenticated: false, token: undefined });
    await StorageAdapter.clearStorage();
  },
}));
