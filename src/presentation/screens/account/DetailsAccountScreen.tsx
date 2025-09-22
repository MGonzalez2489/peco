import { LoadEntries } from '@actions/entries';
import { formatCurrency, groupEntriesByDate } from '@infrastructure/utils';
import { InputText } from '@presentation/components';
import { EntryList } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation/app';
import { StackScreenProps } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, EllipsisVertical, Search } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type Props = StackScreenProps<AccountStackParams, 'AccountDetails'>;
export const DetailAccountScreen = ({ route }: Props) => {
  const accountIdRef = useRef(route.params.id);
  const { getById } = useAccountStore();
  const account = getById(accountIdRef.current);
  const IconComponent = account.type.iconItem;

  const queryKey = `entries_${accountIdRef.current}`;
  //TODO: implement pull to refresh
  //TODO: use 'isLoading'
  const { isLoading, data, fetchNextPage } = useInfiniteQuery({
    queryKey: [queryKey, 'infinite'],
    initialPageParam: 1,
    staleTime: 1000 * 10,
    queryFn: async (params) => LoadEntries(params.pageParam, accountIdRef.current),
    getNextPageParam: (lastPage, allPages) => {
      const newPage = lastPage.meta.hasNextPage ? allPages.length + 1 : null;
      return newPage;
    },
  });

  const allEntries = data?.pages.flatMap((page) => page.data) || [];
  const grupedData = groupEntriesByDate(allEntries);

  const MOCK_CHART_DATA = {
    labels: ['Sep 1', 'Sep 7', 'Sep 15'],
    datasets: [
      {
        data: [100, 150, 120, 200, 180, 250, 150, 180, 160, 190, 220, 170, 210, 230, 190], // 15 días
        color: (opacity = 1) => account.type.color, //(opacity = 1) => `rgba(142, 68, 173, ${opacity})`, // Color de la línea (morado)
      },
    ],
  };

  // Header personalizado (simulando el navbar)
  // TODO: DONT FORGET RIGHT ITEMS
  // const renderHeader = () => (
  //   <View style={[styles.header, { paddingTop: insets.top }]}>
  //     <TouchableOpacity style={styles.headerButton}>
  //       <ArrowLeft size={24} color="#000" />
  //     </TouchableOpacity>
  //     <Text style={styles.headerTitle}>Wallet details</Text>
  //     <View style={{ flexDirection: 'row', gap: 10 }}>
  //       <TouchableOpacity style={styles.headerButton}>
  //         <UserPlus size={24} color="#000" />
  //       </TouchableOpacity>
  //       <TouchableOpacity style={styles.headerButton}>
  //         <MoreHorizontal size={24} color="#000" />
  //       </TouchableOpacity>
  //     </View>
  //   </View>
  // );

  // Renderiza el gráfico de línea
  const renderChart = () => (
    <View style={styles.chartContainer}>
      {/* Resumen de Gasto del Mes */}
      <View style={styles.spendingSummary}>
        <Text style={styles.monthSpendingAmount}>$124.52</Text>
        <Text style={styles.monthSpendingLabel}>Spent</Text>
        <View style={styles.chartNavigation}>
          <ArrowLeft size={20} color="#000" />
          <ArrowLeft size={20} color="#000" style={{ transform: [{ scaleX: -1 }] }} />
        </View>
      </View>

      {/* Gráfico de Línea - Se usa una librería externa como react-native-chart-kit */}
      <Text>Chart</Text>
      <LineChart
        data={MOCK_CHART_DATA}
        width={screenWidth - 20} // Ancho total de la pantalla menos el padding horizontal
        height={200}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 2,
          color: (opacity = 1) => account.type.color, // Color principal de la línea
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '0', // Ocultar los puntos
          },
        }}
        bezier // Curva suave
        style={styles.chartStyle}
        withInnerLines={false} // Quitar líneas internas
        withVerticalLines={false} // Quitar líneas verticales
        withHorizontalLabels={false} // Quitar etiquetas horizontales (montos)
        // Se asume que el tooltip ($82.75 Sep 7, 2025) es un componente superpuesto/manual
      />
    </View>
  );

  const headerList = (
    <>
      <View style={styles.walletInfoContainer}>
        <View style={[styles.walletIcon, { backgroundColor: account.type.color }]}>
          <IconComponent size={24} color="#fff" />
        </View>
        <View>
          <Text style={styles.walletName}>{account.name}</Text>
          <Text style={styles.walletBalance}>{formatCurrency(account.balance)}</Text>
        </View>
      </View>
      {/* Fecha y Gráfico */}
      {/* TODO: MOCK */}
      <Text style={styles.dateLabel}>September, 2025</Text>
      {renderChart()}

      {/* SearchBar */}
      <InputText LeftIcon={Search} placeholder="Buscar transacciones" />
      {/* Transacciones Recientes */}
      <Text style={styles.latestTransactionsTitle}>Ultimas Transacciones</Text>
    </>
  );

  return (
    <MainLayout
      title="Detalles"
      RightActionIcon={EllipsisVertical}
      rightAction={() => alert('editar')}
    >
      <EntryList
        group={grupedData}
        fetchNextPage={fetchNextPage}
        listHeaderComponent={headerList}
      />
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  // Wallet Info
  walletInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 18,
    color: '#666',
    textTransform: 'capitalize',
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  // Date & Chart
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  chartContainer: {
    marginBottom: 20,
  },
  spendingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  monthSpendingAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  monthSpendingLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 5,
    marginTop: 10,
  },
  chartNavigation: {
    flexDirection: 'row',
    gap: 15,
  },
  chartStyle: {
    marginVertical: 8,
  },
  // Latest Transactions
  latestTransactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  // Transaction List Item
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
  // Floating NavBar
  floatingNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  navBarButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 15,
    // El botón 'Add' tiene un fondo oscuro en la imagen.
    backgroundColor: '#333',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  navBarButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  navBarButtonTextDark: {
    color: '#fff', // El color en la imagen parece ser blanco
    fontWeight: '600',
  },
});
