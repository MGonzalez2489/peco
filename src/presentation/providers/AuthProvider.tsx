import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { PropsWithChildren, useEffect } from "react";
import { View } from "react-native";
import { AuthStackParams, MainDrawerParams } from "../navigation";
import { useAuthStore } from "../store/useAuthStore";

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const navigation =
    useNavigation<DrawerNavigationProp<MainDrawerParams | AuthStackParams>>();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      //aqui nos salimos
      navigation.navigate("LoginScreen");
    }
  }, [isAuthenticated]);

  return <View>{children}</View>;
};
