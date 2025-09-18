import { MainLayout } from '@presentation/layout';
import {
  DollarSign,
  MoreHorizontal,
  Plus,
  Send,
  ShoppingBag,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

//TODO: FIX MOCK
// --- Configuración y Data de Ejemplo ---
const screenWidth = Dimensions.get('window').width;

const MOCK_CATEGORIES = [
  { id: '1', name: 'Groceries', amount: 1245.3, color: '#9747FF', icon: ShoppingBag }, // Morado
  { id: '2', name: 'Transport', amount: 540.0, color: '#007AFF', icon: Truck }, // Azul
  { id: '3', name: 'Entertainment', amount: 600.0, color: '#34C759', icon: TrendingUp }, // Verde
  { id: '4', name: 'Rent & Utilities', amount: 1080.5, color: '#FF9500', icon: Zap }, // Naranja
];

const MOCK_TRANSACTIONS = [
  {
    id: 't1',
    description: 'Supermart Groceries',
    date: 'Sep 14, 2025',
    amount: 52.3,
    details: 'Card **** 1234',
    icon: ShoppingBag,
  },
  {
    id: 't2',
    description: 'Fresh Bakery',
    date: 'Sep 13, 2025',
    amount: 30.45,
    details: 'Paid with Visa',
    icon: DollarSign,
  },
];

// --- Componentes Reutilizables ---

interface CategoryQuickActionProps {
  item: (typeof MOCK_CATEGORIES)[0];
}

const CategoryQuickAction = ({ item }: CategoryQuickActionProps) => {
  const IconComponent = item.icon;
  return (
    <TouchableOpacity style={styles.quickActionCard}>
      <View style={[styles.cardColorOverlay, { backgroundColor: item.color }]}>
        <IconComponent size={24} color="#fff" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.quickActionName}>{item.name}</Text>
        <Text style={styles.quickActionAmount}>${item.amount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface TransactionItemProps {
  item: (typeof MOCK_TRANSACTIONS)[0];
}

const TransactionItem = ({ item }: TransactionItemProps) => {
  const IconComponent = item.icon;
  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {/* Usamos el color de la tarjeta, asumiendo que el ícono es el mismo */}
        <IconComponent size={24} color="#666" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <View style={styles.transactionAmountDetails}>
        <Text style={styles.transactionAmount}>-${item.amount.toFixed(2)}</Text>
        <Text style={styles.transactionExtraDetail}>{item.details}</Text>
      </View>
    </View>
  );
};

// --- Pantalla Principal ---
//TODO: ALL THIS SCREEN IS A MOCK
export const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  //TODO: RECUERDA LOS BOTONES DE LA DERECHA
  // const renderHeader = () => (
  //   <View style={[styles.header, { paddingTop: insets.top }]}>
  //     <TouchableOpacity style={styles.headerButton}>
  //       <Menu size={24} color="#000" />
  //     </TouchableOpacity>
  //     <View style={styles.headerRightIcons}>
  //       <TouchableOpacity style={styles.headerButton}>
  //         <TrendingUp size={24} color="#000" />
  //       </TouchableOpacity>
  //       <TouchableOpacity style={styles.headerButton}>
  //         <Bell size={24} color="#000" />
  //         <View style={styles.notificationBadge}>
  //           <Text style={styles.badgeText}>4</Text>
  //         </View>
  //       </TouchableOpacity>
  //     </View>
  //   </View>
  // );

  return (
    <MainLayout title="" useDrawer={true}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Main balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.totalAmount}>$3,465.80</Text>
            {/* CORRECCIÓN: Se aseguró el cierre correcto del TouchableOpacity */}
            <TouchableOpacity style={styles.balanceMenuIcon}>
              <MoreHorizontal size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions (Add, Move, Send, Details) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Plus size={24} color="#000" />
            <Text style={styles.actionButtonText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <TrendingUp size={24} color="#000" />
            <Text style={styles.actionButtonText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Send size={24} color="#000" />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MoreHorizontal size={24} color="#000" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Cards (Categories) */}
        <View style={styles.quickActionsHeader}>
          <Text style={styles.quickActionsTitle}>Quick actions</Text>
          <TouchableOpacity>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categoryGrid}>
          {MOCK_CATEGORIES.map((item) => (
            <CategoryQuickAction key={item.id} item={item} />
          ))}
        </View>

        {/* Latest Transactions */}
        <View style={styles.latestTransactionsHeader}>
          <Text style={styles.latestTransactionsTitle}>Latest transaction</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButtonText}>See all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={MOCK_TRANSACTIONS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItem item={item} />}
          scrollEnabled={false}
        />

        {/* Espacio para la barra de navegación inferior */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  headerRightIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'red',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Balance Section
  balanceContainer: {
    paddingVertical: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
  },
  balanceMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quick Actions (Add, Move, Send)
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    width: '23%', // Ajuste para 4 botones
  },
  actionButtonText: {
    marginTop: 5,
    fontSize: 14,
    color: '#333',
  },
  // Quick Actions Cards Header
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  // Quick Actions Cards Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    rowGap: 15,
  },
  quickActionCard: {
    width: (screenWidth - 50) / 2, // 20px padding, 10px espacio central
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  cardColorOverlay: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
    padding: 15,
    // Simula el color de fondo y deja espacio para el texto
  },
  cardContent: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  quickActionName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  quickActionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Latest Transactions
  latestTransactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  latestTransactionsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  // Transaction Item
  // TODO: THIS SECTION WAS MIGRATED- DELETE
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontWeight: '600',
    fontSize: 15,
  },
  transactionDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmountDetails: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 15,
    color: '#000',
  },
  transactionExtraDetail: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  // Floating Bottom Bar
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 10,
    alignItems: 'center', // Para centrar el botón flotante
  },
  floatingBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  floatingBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  mainActionButton: {
    backgroundColor: '#000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -30, // Posiciona el botón fuera de la barra
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});

// import { FabButton } from '@presentation/components';
// import { MainLayout } from '@presentation/layout';
// import { MainDrawerParams } from '@presentation/navigation';
// import { DrawerNavigationProp } from '@react-navigation/drawer';
// import { useNavigation } from '@react-navigation/native';
//
// //TODO: Create custom navbar for all MainLayoutImplementations
// export const HomeScreen = () => {
//   const navigation = useNavigation<DrawerNavigationProp<MainDrawerParams>>();
//   return (
//     <MainLayout title="Inicio" useDrawer={true}>
//       <FabButton onPress={() => navigation.navigate('Entries', { screen: 'EntryCreateScreen' })} />
//     </MainLayout>
//   );
// };
