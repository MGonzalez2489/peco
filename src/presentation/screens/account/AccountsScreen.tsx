import { FabButton } from "@presentation/components";
import { AccountList } from "@presentation/components/accounts";
import { MainLayout } from "@presentation/layout";
import { AccountStackParams } from "@presentation/navigation/AccountsNavigation";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { StyleSheet, View } from "react-native";

export const AccountsScreen = () => {
  const { accounts } = useAccountStore();
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();

  return (
    <MainLayout title="Cuentas">
      <View style={styles.container}>
        <AccountList accounts={accounts} />
      </View>
      <FabButton onPress={() => navigation.navigate("AccountCreateScreen")} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
