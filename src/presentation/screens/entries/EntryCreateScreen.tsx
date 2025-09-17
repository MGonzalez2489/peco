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
import { COLORS } from '@styles/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Formik, FormikProps } from 'formik';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

export const EntryCreateScreen = ({ accountId }: Props) => {
  const { entryTypes, entryCategories } = useCatalogsStore();
  const { accounts, loadAccounts } = useAccountStore();
  const queryClient = useQueryClient();

  // Initialize default selected objects, using useMemo for efficiency
  const defaultEntryType = useMemo(() => entryTypes[0], [entryTypes]);
  const defaultAccount = useMemo(() => {
    if (accountId) return accounts.find((f) => f.publicId === accountId);
    else return accounts[0];
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
      navigation.navigate('EntryCreateSuccessScreen', { entry: nEntry });
      // navigation.goBack();
      // Add a success toast/alert here if needed
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Error al crear el registro.');
    },
  });
  const handleSelectAccount = useCallback(
    (setFieldValue) => {
      navigation.navigate('SelAccount', {
        onSelect: (account: Account) => {
          setFieldValue('accountId', account.publicId);
        },
      });
    },
    [navigation]
  );

  const handleSelEntryCategory = useCallback(
    (setFieldValue) => {
      navigation.navigate('SelEntryCategory', {
        onSelect: (entryCategory: EntryCategory) => {
          setFieldValue('categoryId', entryCategory.publicId);
        },
      });
    },
    [navigation]
  );

  const handleEntryTypePress = useCallback((g: typeof defaultEntryType, setFieldValue) => {
    setFieldValue('entryTypeId', g.publicId);
  }, []);

  const RenderEntryTypeOptions = useCallback(
    (setFieldValue: (field: string, value: any) => void) => {
      // Get the currently selected type ID from Formik, falling back to default
      const selectedTypeId = formikRef.current?.values.entryTypeId || defaultEntryType.publicId;

      return (
        <View style={styles.btnContainer}>
          {entryTypes.map((g) => (
            <TouchableOpacity
              key={g.publicId}
              style={[
                styles.btn,
                selectedTypeId === g.publicId
                  ? { ...styles.btnActive, backgroundColor: g.color }
                  : {},
              ]}
              onPress={() => handleEntryTypePress(g, setFieldValue)}
            >
              <Text
                style={[
                  styles.btnText,
                  selectedTypeId !== g.publicId && { color: COLORS.primary }, // Apply primary color if not active
                ]}
              >
                {g.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    [entryTypes, defaultEntryType.publicId, handleEntryTypePress]
  );

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

  return (
    <MainLayout title="Nueva Transaccion">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Formik
          innerRef={formikRef}
          initialValues={getInitialValues(defaultEntryType.publicId)}
          onSubmit={(values) => {
            if (!defaultCategory || !defaultAccount) {
              Alert.alert('Error', 'Debe seleccionar una cuenta y una categoría.');
              return;
            }

            const payload: CreateEntryDto = {
              description: values.description || '',
              // Ensure amount is a number for the API call
              amount: parseFloat(values.amount.toString()) || 0,
              categoryId: values.categoryId || defaultCategory.publicId,
              entryTypeId: values.entryTypeId,
              accountId: values.accountId || defaultAccount.publicId,
            };

            mutation.mutate(payload);
          }}
        >
          {({ handleChange, values, setFieldValue, handleSubmit }) => {
            const { selEntryType, selAccount, selEntryCat } = getSelectedObjects(values);

            return (
              <View style={styles.container}>
                <View>
                  {/* Entry Type Options */}
                  {RenderEntryTypeOptions(setFieldValue)}
                  {/* Description */}
                  <InputText
                    label="Descripcion"
                    placeholder="Descripcion"
                    value={values.description}
                    onChangeText={handleChange('description')}
                  />

                  {/* Amount */}
                  <InputNumber
                    label="Cantidad"
                    value={values.amount}
                    keyboardType="decimal-pad"
                    onChangeText={handleChange('amount')}
                  />
                  {/* Category */}
                  <Text style={{ marginBottom: 5, color: COLORS.text }}>Categoria</Text>
                  <Pressable
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      alignItems: 'center',

                      height: 50,
                      backgroundColor: COLORS.background,
                      borderRadius: 8,
                      paddingHorizontal: 15,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#E0E0E0',
                    }}
                    onPress={() => handleSelEntryCategory(setFieldValue)}
                  >
                    <Text>{selEntryCat.name}</Text>
                    <ChevronRight />
                  </Pressable>
                  {/* Account */}
                  <Text style={{ marginBottom: 5, color: COLORS.text }}>Cuenta</Text>
                  <Pressable
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      alignItems: 'center',
                      height: 50,
                      backgroundColor: COLORS.background,
                      borderRadius: 8,
                      paddingHorizontal: 15,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#E0E0E0',
                    }}
                    onPress={() => handleSelectAccount(setFieldValue)}
                  >
                    <Text style={{ textTransform: 'capitalize' }}>{selAccount.name}</Text>
                    <ChevronRight />
                  </Pressable>
                </View>
                <Button label="Crear" onPress={handleSubmit} />
              </View>
            );
          }}
        </Formik>
      </KeyboardAvoidingView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3f3',
    marginVertical: 10,
    marginBottom: 20,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: 'bold',
    color: 'white', // Ensure text color is set for non-active states
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.7,
    // shadowRadius: 1,
  },
  btnActive: {
    // elevation: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 4,
  },
});
