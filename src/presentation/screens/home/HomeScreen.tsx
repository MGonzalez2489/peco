import { MainLayout } from '@presentation/layout';
import { Text } from 'react-native';

export const HomeScreen = () => {
  return (
    <MainLayout title="Home" useDrawer={true}>
      <Text>home</Text>
    </MainLayout>
  );
};
