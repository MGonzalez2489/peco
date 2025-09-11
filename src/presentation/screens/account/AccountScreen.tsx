import { StackScreenProps } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { Text, View } from "react-native";
import { MainLayout } from "src/presentation/layout";
import { AccountStackParams } from "src/presentation/navigation/AccountsNavigation";

// interface Props extends DrawerScreenProps<MainDrawerParams, "AccountScreen"> {}
interface Props extends StackScreenProps<AccountStackParams, "AccountScreen"> {}

export const AccountScreen = ({ route }: Props) => {
  const productIdRef = route.params.accountId;
  const { getById } = useAccountStore();
  const account = getById(productIdRef);
  return (
    <MainLayout title="Cuenta">
      <View style={{ flex: 1 }}>
        <Text>Soy el account by id con : {productIdRef} </Text>
        <Text>Cuenta : {account.name} </Text>
      </View>
    </MainLayout>
  );
};
