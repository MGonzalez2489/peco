import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { StyleSheet, View } from "react-native";
import { FAB } from "src/presentation/components";
import { AccountList } from "src/presentation/components/accounts";
import { MainLayout } from "src/presentation/layout";
import { AccountStackParams } from "src/presentation/navigation/AccountsNavigation";

export const AccountsScreen = () => {
  const { accounts } = useAccountStore();
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();

  return (
    <MainLayout title="Cuentas">
      <View style={styles.container}>
        <AccountList accounts={accounts} />
      </View>
      <FAB onPress={() => navigation.navigate("AccountCreateScreen")} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
