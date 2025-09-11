import { FabButton } from "@presentation/components";
import { MainLayout } from "@presentation/layout";
import { Text } from "react-native";

//TODO: Create custom navbar for all MainLayoutImplementations
export const HomeScreen = () => {
  return (
    <MainLayout title="hello there">
      <Text>Title from home</Text>
      <FabButton onPress={() => console.log("aca")} />
    </MainLayout>
  );
};
