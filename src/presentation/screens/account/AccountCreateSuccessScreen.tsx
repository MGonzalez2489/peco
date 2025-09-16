import { Button } from '@presentation/components';
import { StackScreenProps } from '@react-navigation/stack';
import { COLORS } from '@styles/colors';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { MainLayout } from 'src/presentation/layout';
import { AccountStackParams } from 'src/presentation/navigation/AccountsNavigation';

interface Props extends StackScreenProps<AccountStackParams, 'AccountCreateSuccessScreen'> {}

//TODO: The back action seems weird because of the direction of the slide
export const AccountCreateSuccessScreen = ({ navigation, route }: Props) => {
  const account = route.params.account;
  return (
    <MainLayout title="Create account success" showNavbar={false}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <CheckCircle color={COLORS.secondary} size={80} />
          <Text style={styles.title}>¡Cuenta {account.name} creada!</Text>
          <Text style={styles.Subtitles}>
            Tu nueva cuenta ha sido creada exitosamente y está lista para ser usada.
          </Text>
        </View>
        <Button
          label="Regresar"
          style={{ marginTop: 80 }}
          LeftIcon={ArrowLeft}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'AccountsScreen',
                },
              ],
            })
          }
        />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    marginTop: 20,
    marginBottom: 15,
  },
  Subtitles: {
    color: '#666666',
    textAlign: 'center',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 100,
    gap: 5,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.primary,
  },
});
