import { CreateEntry } from '@actions/entries';
import { Account, Entry, EntryCategory } from '@domain/entities';
import { CreateEntryDto } from '@infrastructure/dtos/entries';
import { ResultDto } from '@infrastructure/dtos/responses';
import { Button, InputNumber, InputText } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Formik, FormikProps } from 'formik';
import { ArrowLeft, Banknote, Edit3, Minus, Plus, Tag } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SelectorButtonProps {
  label: string;
  value: string;
  icon: React.ElementType;
  onPress: () => void;
}

// --- Componentes Reutilizables ---

const SelectorButton = ({ label, value, icon: IconComponent, onPress }: SelectorButtonProps) => (
  <TouchableOpacity style={styles.selectorButton} onPress={onPress}>
    <View style={styles.selectorIconWrapper}>
      <IconComponent size={24} color="#000" />
    </View>
    <View style={styles.selectorTextContent}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <Text style={styles.selectorValue}>{value}</Text>
    </View>
    <View style={styles.selectorArrow}>
      <ArrowLeft size={20} color="#999" style={{ transform: [{ rotate: '180deg' }] }} />
    </View>
  </TouchableOpacity>
);

// 1. Define Formik Values and use strong typing
interface EntryFormValues {
  amount: number; // Use string for initial state, will be number for payload
  description: string;
  categoryId: string;
  entryTypeId: string;
  accountId: string;
}

// 2. Refine the initial values and make them a function to ensure fresh start
const getInitialValues = (initialTypePublicId: string): EntryFormValues => ({
  description: '',
  amount: 0,
  categoryId: '',
  entryTypeId: initialTypePublicId,
  accountId: '',
});

interface Props {
  accountId?: string;
}

export const CreateEntryScreen = ({ accountId }: Props) => {
  const { entryTypes, entryCategories } = useCatalogsStore();
  const { accounts, loadAccounts } = useAccountStore();
  const queryClient = useQueryClient();

  // Initialize default selected objects, using useMemo for efficiency
  const defaultEntryType = useMemo(() => entryTypes[0], [entryTypes]);
  const defaultAccount = useMemo(() => {
    if (accountId) return accounts.find((f) => f.publicId === accountId);
    else return accounts.find((f) => f.isRoot);
  }, [accounts, accountId]);
  const defaultCategory = useMemo(() => entryCategories[0], [entryCategories]);
  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();
  // 3. Use FormikProps with strong typing
  const formikRef = useRef<FormikProps<EntryFormValues>>(null);
  // 4. Mutation setup
  const mutation = useMutation({
    mutationFn: (data: CreateEntryDto) => CreateEntry(data),
    onSuccess: (response: ResultDto<Entry>) => {
      //TODO: LOAD ONLY ONE ACCOUNT OR UPDATE THE EXISTING ACCOUNT WITH THE NEW ENTRY INFO
      loadAccounts();
      queryClient.invalidateQueries({ queryKey: ['entries', 'infinite'] });

      // You should navigate to a success screen or pop the stack
      const nEntry = response.data;
      navigation.navigate('CreateEntryConfirmation', { entry: nEntry });
      // navigation.goBack();
      // Add a success toast/alert here if needed
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Error al crear el registro.');
    },
  });

  const handleEntryTypePress = useCallback((g: typeof defaultEntryType, setFieldValue) => {
    setFieldValue('entryTypeId', g.publicId);
  }, []);

  // 7. Initial Formik value population (One-time setup)
  useEffect(() => {
    if (formikRef.current) {
      formikRef.current.setFieldValue('entryTypeId', defaultEntryType.publicId);
      if (defaultAccount) {
        formikRef.current.setFieldValue('accountId', defaultAccount.publicId);
      }
      if (defaultCategory) {
        formikRef.current.setFieldValue('categoryId', defaultCategory.publicId);
      }
    }
  }, [defaultEntryType, defaultAccount, defaultCategory]);

  // Derive the selected objects from Formik state for rendering
  const getSelectedObjects = (values: EntryFormValues) => {
    const selEntryType =
      entryTypes.find((t) => t.publicId === values.entryTypeId) || defaultEntryType;
    const selAccount = accounts.find((a) => a.publicId === values.accountId) || defaultAccount;
    const selEntryCat =
      entryCategories.find((c) => c.publicId === values.categoryId) || defaultCategory;
    return { selEntryType, selAccount, selEntryCat };
  };

  const RenderEntryTypeOptions = useCallback(
    (setFieldValue: (field: string, value: any) => void) => {
      // Get the currently selected type ID from Formik, falling back to default
      const selectedTypeId = formikRef.current?.values.entryTypeId || defaultEntryType.publicId;

      return (
        <View style={styles.typeToggleContainer}>
          {entryTypes.map((e) => (
            <TouchableOpacity
              key={e.publicId}
              onPress={() => handleEntryTypePress(e, setFieldValue)}
              style={[
                styles.typeButton,
                {
                  backgroundColor: selectedTypeId === e.publicId ? e.color : '#eee',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: selectedTypeId === e.publicId ? '#fff' : '#000' },
                ]}
              >
                {e.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    [entryTypes, defaultEntryType.publicId, handleEntryTypePress]
  );

  return (
    <MainLayout title="Nueva transaccion">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Formik
          innerRef={formikRef}
          initialValues={getInitialValues(defaultEntryType.publicId)}
          onSubmit={(values) => {
            if (!defaultCategory || !defaultAccount) {
              Alert.alert('Error', 'Debe seleccionar una cuenta y una categoría.');
              return;
            }

            console.log('amount', values.amount);

            const payload: CreateEntryDto = {
              description: values.description || '',
              amount: values.amount,
              categoryId: values.categoryId || defaultCategory.publicId,
              entryTypeId: values.entryTypeId,
              accountId: values.accountId || defaultAccount.publicId,
            };

            mutation.mutate(payload);
          }}
        >
          {({ handleChange, values, setFieldValue, handleSubmit }) => {
            const { selEntryType, selAccount, selEntryCat } = getSelectedObjects(values);

            const handleSelectAccount = () => {
              navigation.push('SelectAccount', {
                onSelect: (account: Account) => {
                  // setFieldValue es la función más reciente
                  setFieldValue('accountId', account.publicId);
                },
              });
            };

            const handleSelEntryCategory = () => {
              navigation.push('SelectEntryCategory', {
                onSelect: (entryCategory: EntryCategory) => {
                  // setFieldValue es la función más reciente
                  setFieldValue('categoryId', entryCategory.publicId);
                },
              });
            };

            return (
              <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View>
                    {/* 1. Selector de Ingreso/Gasto (Segmented Control Estilizado) */}
                    {RenderEntryTypeOptions(setFieldValue)}
                    {/* Description */}
                    <InputText
                      label="Descripción (Opcional)"
                      placeholder="Compra en supermercado, Pago de nómina..."
                      LeftIcon={Edit3}
                      value={values.description}
                      onChangeText={handleChange('description')}
                    />

                    {/* Amount */}
                    <View style={styles.amountInputContainer}>
                      <Text style={[styles.amountLabel, { color: selEntryType.color }]}>
                        {selEntryType.displayName}
                      </Text>
                      <View style={styles.amountInputRow}>
                        <InputNumber
                          LeftIcon={selEntryType.name === 'income' ? Plus : Minus}
                          keyboardType="numeric"
                          value={values.amount}
                          placeholder="0.00"
                          onChangeText={(val) => setFieldValue('amount', val)}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      {/* 4. Selectores de Categoría y Cuenta */}
                      <Text style={styles.sectionLabel}>Clasificación</Text>

                      <SelectorButton
                        label="Categoría"
                        value={selEntryCat.name}
                        icon={Tag}
                        onPress={handleSelEntryCategory}
                      />

                      <SelectorButton
                        label="Cuenta"
                        value={selAccount.name}
                        icon={Banknote}
                        onPress={handleSelectAccount}
                      />

                      {/* 5. Otros Campos Comunes (Ej: Fecha) */}
                      {/* <SelectorButton */}
                      {/*   label="Fecha" */}
                      {/*   value={new Date().toLocaleDateString()} */}
                      {/*   icon={Calendar} */}
                      {/*   onPress={() => console.log('Abrir selector de Fecha')} */}
                      {/* /> */}
                    </View>
                  </View>
                </ScrollView>
                <Button label="Crear" onPress={handleSubmit} />
              </View>
            );
          }}
        </Formik>
      </KeyboardAvoidingView>
    </MainLayout>
  );
};

// --- Estilos ---

const styles = StyleSheet.create({
  // 1. Selector de Tipo (Toggle)
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    margin: 3, // Margen para el efecto de botón flotante dentro del contenedor
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 2. Campo de Cantidad Prominente
  amountInputContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    padding: 0,
    minWidth: 100, // Asegura un tamaño mínimo
    textAlign: 'center',
  },

  // 3 & 4. Grupo de Inputs y Selectores
  inputGroup: {
    gap: 15,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 5,
  },

  // Componente SelectorButton (Imitando un Input estilizado)
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectorIconWrapper: {
    marginRight: 10,
  },
  selectorTextContent: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    textTransform: 'capitalize',
  },
  selectorArrow: {
    paddingLeft: 10,
  },
});
