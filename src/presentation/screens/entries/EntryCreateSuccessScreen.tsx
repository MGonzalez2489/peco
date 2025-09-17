import { Button } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { COLORS } from '@styles/colors';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

type Props = StackScreenProps<EntryStackParams, 'EntryCreateSuccessScreen'>;

export const EntryCreateSuccessScreen = ({ navigation, route }: Props) => {
  const entry = route.params.entry;

  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'EntriesScreen',
        },
      ],
    });
  };
  return (
    <MainLayout title="" showNavbar={false}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <CheckCircle color={COLORS.secondary} size={80} />
          <Text style={styles.title}>¡Registro {entry.description} creado!</Text>
          <Text style={styles.Subtitles}>
            Recuerda que tus transacciones afectan el balance general de la cuenta asignada.
          </Text>
        </View>
        <Button
          label="Regresar"
          style={{ marginTop: 80 }}
          LeftIcon={ArrowLeft}
          onPress={handleBack}
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
