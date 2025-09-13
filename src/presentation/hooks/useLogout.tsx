import { StorageAdapter } from "@config/adapters";
import { useAccountStore } from "@store/useAccountStore";
import { useAuthStore } from "@store/useAuthStore";

export const useLogout = () => {
  const { logout } = useAuthStore();
  const { clearStore } = useAccountStore();

  const doLogout = async () => {
    logout();
    clearStore();
    await StorageAdapter.clearStorage();
  };

  return {
    doLogout,
  };
};
