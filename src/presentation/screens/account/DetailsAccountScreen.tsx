import { LoadEntries } from '@actions/entries';
import { formatCurrency, groupEntriesByDate } from '@infrastructure/utils';
import { InputText } from '@presentation/components';
import { EntryList } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation/app';
import { StackScreenProps } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { COLORS } from '@styles/colors';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Edit3, EllipsisVertical, Search, Trash2 } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';

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
  const refRBSheet = useRef(undefined);

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
      rightAction={() => refRBSheet.current.open()}
    >
      <RBSheet
        ref={refRBSheet}
        height={200} // Altura ajustada para 3 opciones
        customStyles={{
          container: styles.sheetContainer,
          draggableIcon: styles.draggableIcon,
        }}
      >
        <View style={styles.contentContainer}>
          {/* Encabezado: Nombre de la Cuenta */}
          <Text style={styles.headerText}>Acciones para: {account.name}</Text>

          {/* Opción 1: Editar Cuenta */}
          <TouchableOpacity style={styles.actionButton} onPress={() => console.log('a')}>
            <Edit3 size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Editar Cuenta</Text>
          </TouchableOpacity>

          {/* Opción 2: Eliminar Cuenta */}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => console.log('b')}
          >
            <Trash2 size={24} color={'red'} />
            <Text style={[styles.actionText, styles.deleteText]}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
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
  ////////////////////////////////
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
  },
  draggableIcon: {
    backgroundColor: COLORS.secondaryText,
  },
  contentContainer: {
    paddingTop: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondaryText,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 18,
    marginLeft: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 5,
    borderBottomWidth: 0, // No border for the last item
  },
  deleteText: {
    color: COLORS.danger || '#D32F2F',
  },
});
