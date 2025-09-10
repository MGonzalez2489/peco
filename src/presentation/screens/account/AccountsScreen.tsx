import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { useAccountStore } from "@store/useAccountStore";
import { StyleSheet, View } from "react-native";
import { FAB } from "src/presentation/components";
import { AccountList } from "src/presentation/components/accounts";
import { MainLayout } from "src/presentation/layout";
import { MainDrawerParams } from "src/presentation/navigation";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Reusable Account Item Component

export const AccountsScreen = () => {
  const { accounts } = useAccountStore();
  const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();

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
