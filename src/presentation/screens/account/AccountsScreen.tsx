import { FabButton } from '@presentation/components';
import { AccountList } from '@presentation/components/accounts';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// --- Data de Ejemplo (Simulando Cuentas) ---

// Función utilitaria para obtener el ícono según el tipo de cuenta
// const getAccountIcon = (type: string) => {
//   switch (type.toLowerCase()) {
//     case 'banco':
//     case 'ahorro':
//       return Banknote;
//     case 'tarjeta':
//       return CreditCard;
//     case 'efectivo':
//     default:
//       return DollarSign;
//   }
// };

// --- Pantalla Principal ---

export const AccountsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
  const { accounts } = useAccountStore();
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const newBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    setTotalBalance(newBalance);
  }, [accounts]);

  return (
    <MainLayout title="Cuentas" useDrawer={true}>
      {/* Tarjeta de Resumen Global (Total Balance) */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Balance Total </Text>
        <Text style={styles.totalBalanceText}>${totalBalance}</Text>
        <Text style={styles.summarySubtitle}>Incluye todas las cuentas en USD</Text>
      </View>

      {/* Lista de Cuentas */}
      <Text style={styles.listTitle}>Tus Cuentas Disponibles</Text>

      <AccountList accounts={accounts} />

      {/* Botón de Acción Flotante */}
      <FabButton onPress={() => navigation.navigate('AccountCreateScreen')} />
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8', // Fondo gris muy suave para destacar las tarjetas
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerButton: {
    padding: 10,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },

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

  // Floating Action Button
  floatingActionButton: {
    backgroundColor: '#000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});

// import { FabButton } from '@presentation/components';
// import { AccountList } from '@presentation/components/accounts';
// import { MainLayout } from '@presentation/layout';
// import { AccountStackParams } from '@presentation/navigation/AccountsNavigation';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { useAccountStore } from '@store/useAccountStore';
// import { StyleSheet, View } from 'react-native';
//
// export const AccountsScreen = () => {
//   const { accounts } = useAccountStore();
//   const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
//
//   return (
//     <MainLayout title="Cuentas" useDrawer={true}>
//       <View style={styles.container}>
//         <AccountList accounts={accounts} />
//       </View>
//       <FabButton onPress={() => navigation.navigate('SelAccountType')} />
//     </MainLayout>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });
