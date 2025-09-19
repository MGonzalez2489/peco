import { Button } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { COLORS } from '@styles/colors';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = StackScreenProps<AccountStackParams, 'AccountCreateSuccessScreen'>;

export const AccountCreateSuccessScreen = ({ navigation, route }: Props) => {
  const account = route.params.account;

  const handleGoBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'AccountsScreen' }],
    });
  };

  return (
    <MainLayout title="Cuenta Creada" showNavbar={false}>
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <CheckCircle color={COLORS.secondary} size={90} />
          <Text style={styles.title}>¡Felicidades!</Text>
          <Text style={styles.subtitle}>
            La cuenta <Text style={styles.accountName}>{account.name}</Text> se ha creado
            correctamente.
          </Text>
          <Text style={styles.bodyText}>
            Ya está lista para que registres tus movimientos y comiences a administrar tus finanzas.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button label="Volver a Cuentas" LeftIcon={ArrowLeft} onPress={handleGoBack} />
        </View>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  contentWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  accountName: {
    fontWeight: '700',
    color: COLORS.secondary,
  },
  bodyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
    maxWidth: 300,
  },
  buttonContainer: {
    width: '100%',
  },
});
