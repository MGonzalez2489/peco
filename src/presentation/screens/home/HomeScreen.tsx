import { InputText } from "@presentation/components";
import { MainLayout } from "@presentation/layout";
import { MainDrawerParams } from "@presentation/navigation";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";

//TODO: Create custom navbar for all MainLayoutImplementations
export const HomeScreen = () => {
  const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();
  return (
    <MainLayout title="Inicio" useDrawer={true}>
      <View style={{ padding: 10 }}>
        <InputText value="hola" />
      </View>
      {/* <FabButton */}
      {/*   onPress={() => */}
      {/*     navigation.navigate("Entries", { screen: "EntryCreateScreen" }) */}
      {/*   } */}
      {/* /> */}
    </MainLayout>
  );
};
