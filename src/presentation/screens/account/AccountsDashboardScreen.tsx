import { FabButton } from '@presentation/components';
import { AccountList } from '@presentation/components/accounts';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation/app';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const AccountsDashboardScreen = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
  const { accounts } = useAccountStore();
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const newBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    setTotalBalance(newBalance);
  }, [accounts]);

  const headerListComponent = (
    <>
      {/* Tarjeta de Resumen Global (Total Balance) */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Balance Total </Text>
        <Text style={styles.totalBalanceText}>${totalBalance}</Text>
        <Text style={styles.summarySubtitle}>Incluye todas las cuentas registradas</Text>
      </View>

      {/* Lista de Cuentas */}
      <Text style={styles.listTitle}>Tus Cuentas Disponibles</Text>
    </>
  );

  return (
    <MainLayout title="Cuentas" useDrawer={true}>
      <AccountList accounts={accounts} listHeaderComponent={headerListComponent} />

      {/* Botón de Acción Flotante */}
      <FabButton onPress={() => navigation.navigate('CreateAccountForm')} />
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  totalBalanceText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#000',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },

  // Account List
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
});
