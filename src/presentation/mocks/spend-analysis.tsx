import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MoreHorizontal,
  ArrowLeft,
  Search,
  ShoppingBag,
  Utensils,
  Zap,
  Bus,
  Info,
} from 'lucide-react-native';

// --- Data de Ejemplo (Simulando la información de la cuenta) ---

const MOCK_CATEGORIES = [
  { id: '1', name: 'Groceries', amount: 1245.3, color: '#9747FF', icon: ShoppingBag },
  { id: '2', name: 'Transport', amount: 540.0, color: '#007AFF', icon: Bus },
  { id: '3', name: 'Entertainment', amount: 600.0, color: '#34C759', icon: Utensils },
  { id: '4', name: 'Rent & Utilities', amount: 1080.5, color: '#FF9500', icon: Zap },
];

const MOCK_TRANSACTIONS = [
  {
    id: 't1',
    description: 'Supermart Groceries',
    date: 'Sep 14, 2025',
    amount: -52.3,
    details: 'Card **** 1234',
    icon: ShoppingBag,
  },
  {
    id: 't2',
    description: 'Fresh Bakery',
    date: 'Sep 13, 2025',
    amount: -30.45,
    details: 'Paid with Visa',
    icon: Utensils,
  },
  {
    id: 't3',
    description: 'Gas Station',
    date: 'Sep 11, 2025',
    amount: -45.06,
    details: 'Card **** 1234',
    icon: Bus,
  },
  {
    id: 't4',
    description: 'Movie Tickets',
    date: 'Sep 10, 2025',
    amount: -25.0,
    details: 'Cash payment',
    icon: Utensils,
  },
  // ... más transacciones
];

// --- Componentes Reutilizables ---

interface CategoryCardProps {
  category: (typeof MOCK_CATEGORIES)[0];
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const IconComponent = category.icon;
  return (
    <View style={styles.categoryCard}>
      <View style={[styles.categoryColorBar, { backgroundColor: category.color }]} />
      <View style={styles.categoryContent}>
        <View style={styles.categoryIconText}>
          <IconComponent size={14} color={category.color} />
          <Text style={styles.categoryName}>{category.name}</Text>
        </View>
        <Text style={styles.categoryAmount}>${category.amount.toFixed(2)}</Text>
      </View>
    </View>
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
        <IconComponent size={24} color="#666" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <View style={styles.transactionAmountDetails}>
        <Text style={styles.transactionAmount}>${item.amount.toFixed(2)}</Text>
        <Text style={styles.transactionExtraDetail}>{item.details}</Text>
      </View>
    </View>
  );
};

// --- Pantalla Principal ---

export const SpendAnalysisScreen = () => {
  const insets = useSafeAreaInsets();
  const totalSpending = MOCK_TRANSACTIONS.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Header personalizado (simulando el navbar)
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.headerButton}>
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Spend analysis</Text>
      <TouchableOpacity style={styles.headerButton}>
        <MoreHorizontal size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );

  // Lista de transacciones (usada dentro del ScrollView)
  const renderTransactionList = () => (
    <FlatList
      data={MOCK_TRANSACTIONS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TransactionItem item={item} />}
      scrollEnabled={false} // Deshabilitamos el scroll para que lo maneje el ScrollView padre
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Total Spending */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Total spending</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.totalAmount}>${totalSpending.toFixed(2)}</Text>
            <TouchableOpacity style={styles.pieChartIcon}>
              <View style={styles.pieChartInner} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Cards (Grid Layout) */}
        <View style={styles.categoryGrid}>
          {MOCK_CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </View>

        {/* Smart Category Banner */}
        <View style={styles.smartCategoryBanner}>
          <Info size={20} color="#FFD700" style={{ marginTop: 2 }} />
          <View style={styles.smartCategoryTextContainer}>
            <Text style={styles.smartCategoryTitle}>Smart category</Text>
            <Text style={styles.smartCategoryDescription}>
              We've categorized your transaction, you may change here if you want.
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#999" />
          <Text style={styles.searchText}>Search for any transaction</Text>
        </View>

        {/* Transactions List */}
        {renderTransactionList()}
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Summary Section
  summaryContainer: {
    paddingVertical: 20,
  },
  summaryLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '400',
  },
  summaryRow: {
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
  pieChartIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pieChartInner: {
    // Simular el icono de pastel. Usarías un icono SVG real aquí.
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#888',
  },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%', // Para que quepan dos por fila con un pequeño espacio
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  categoryColorBar: {
    height: 8,
    width: '100%',
  },
  categoryContent: {
    padding: 10,
    justifyContent: 'space-between',
    flex: 1,
  },
  categoryIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 5,
  },
  // Smart Category Banner
  smartCategoryBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEA', // Fondo amarillo claro
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  smartCategoryTextContainer: {
    flex: 1,
  },
  smartCategoryTitle: {
    fontWeight: 'bold',
    color: '#444',
    fontSize: 14,
  },
  smartCategoryDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  searchText: {
    marginLeft: 10,
    color: '#999',
  },
  // Transaction List
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
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
  },
  transactionExtraDetail: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F7F7F7',
    marginLeft: 55, // Alinear con el texto
  },
});
