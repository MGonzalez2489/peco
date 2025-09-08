import { useNavigation } from "@react-navigation/native";
import { PropsWithChildren, useEffect } from "react";
import { Text, View } from "react-native";
import { AuthStackParams, MainDrawerParams } from "../navigation";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useAuthStore } from "../store/auth/useAuthStore";

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

  return (
    <View>
      <Text></Text>
    </View>
  );
};
