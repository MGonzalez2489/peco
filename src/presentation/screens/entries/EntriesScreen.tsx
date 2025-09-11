import { FabButton } from "@presentation/components";
import { MainLayout } from "@presentation/layout";
import { EntryStackParams } from "@presentation/navigation";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Text } from "react-native";

export const EntriesScreen = () => {
  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();

  return (
    <MainLayout title="Entries">
      <Text>Entries Screen</Text>
      <FabButton onPress={() => navigation.navigate("EntryCreateScreen")} />
    </MainLayout>
  );
};
