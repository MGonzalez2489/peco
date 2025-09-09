import { Text } from "react-native";
import { MainLayout } from "src/presentation/layout";

//TODO: Create custom navbar for all MainLayoutImplementations
export const HomeScreen = () => {
  return (
    <MainLayout title="hello there">
      <Text>Title from home</Text>
    </MainLayout>
  );
};
