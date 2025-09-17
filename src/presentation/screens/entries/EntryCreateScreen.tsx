import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Formik, FormikProps } from 'formik';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';

import { CreateEntry } from '@actions/entries';
import { Account, EntryCategory } from '@domain/entities';
import { CreateEntryDto } from '@infrastructure/dtos/entries';
import { EntryCalculator } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useAccountStore } from '@store/useAccountStore';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { COLORS } from '@styles/colors';

// 1. Define Formik Values and use strong typing
interface EntryFormValues {
  amount: number | string; // Use string for initial state, will be number for payload
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

export const EntryCreateScreen: React.FC = () => {
  const { entryTypes, entryCategories } = useCatalogsStore();
  const { accounts } = useAccountStore();

  // Initialize default selected objects, using useMemo for efficiency
  const defaultEntryType = useMemo(() => entryTypes[0], [entryTypes]);
  const defaultAccount = useMemo(() => accounts[0], [accounts]);
  const defaultCategory = useMemo(() => entryCategories[0], [entryCategories]);

  // State for the calculator input (since Formik can't easily handle its complex changes)
  const [calculatorAmount, setCalculatorAmount] = useState('0');

  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();
  // 3. Use FormikProps with strong typing
  const formikRef = useRef<FormikProps<EntryFormValues>>(null);

  // 4. Mutation setup
  const mutation = useMutation({
    mutationFn: (data: CreateEntryDto) => CreateEntry(data),
    onSuccess: () => {
      // You should navigate to a success screen or pop the stack
      navigation.goBack();
      // Add a success toast/alert here if needed
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Error al crear el registro.');
    },
  });

  // --- Utility Functions ---

  // 5. Use useCallback for stable functions, especially navigation callbacks
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

  // --- Navbar and Side Effects ---

  // 6. Use a single, consolidated useEffect for navigation options
  useEffect(() => {
    // Get the current selected type from the form's state (if available) or default
    const currentEntryType =
      entryTypes.find((t) => t.publicId === formikRef.current?.values.entryTypeId) ||
      defaultEntryType;

    navigation.setOptions({
      // Use the actual selected type's color for dynamic header styling
      headerStyle: {
        backgroundColor: currentEntryType.color,
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: '800',
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => formikRef.current?.submitForm()}
          // Disable button while mutating
          disabled={mutation.isPending}
          style={styles.headerRightContainer}
        >
          <Check color={mutation.isPending ? 'gray' : 'white'} />
        </TouchableOpacity>
      ),
    });

    // Dependencies: navigation, formikRef, entryTypes, mutation.isPending
  }, [navigation, formikRef.current?.values.entryTypeId, entryTypes, mutation.isPending]);

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

  // --- Rendering Helpers ---

  // 8. Move complex rendering logic outside the main component if possible,
  // or wrap it in a useMemo to avoid re-creation on every render.
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

  // Derive the selected objects from Formik state for rendering
  const getSelectedObjects = (values: EntryFormValues) => {
    const selEntryType =
      entryTypes.find((t) => t.publicId === values.entryTypeId) || defaultEntryType;
    const selAccount = accounts.find((a) => a.publicId === values.accountId) || defaultAccount;
    const selEntryCat =
      entryCategories.find((c) => c.publicId === values.categoryId) || defaultCategory;
    return { selEntryType, selAccount, selEntryCat };
  };

  // --- Main Render ---
  return (
    <MainLayout title="" showNavbar={false}>
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
            amount: parseFloat(calculatorAmount) || 0,
            categoryId: values.categoryId || defaultCategory.publicId,
            entryTypeId: values.entryTypeId,
            accountId: values.accountId || defaultAccount.publicId,
          };

          mutation.mutate(payload);
        }}
      >
        {({ handleSubmit, values, setFieldValue }) => {
          const { selEntryType, selAccount, selEntryCat } = getSelectedObjects(values);

          // Render logic moved inside the Formik render prop
          return (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >
              {/* Entry Type Options */}
              {RenderEntryTypeOptions(setFieldValue)}

              {/* Amount Display */}
              <View
                style={{
                  ...styles.amountDisplayContainer,
                  backgroundColor: selEntryType.color,
                }}
              >
                <View style={styles.amountTextRow}>
                  <Text style={styles.signText}>{selEntryType.name === 'income' ? '+' : '-'}</Text>
                  <Text style={styles.amountText}>{calculatorAmount}</Text>
                </View>

                {/* Account and Category Selectors */}
                <View style={styles.selectRow}>
                  {/* Cuenta */}
                  <TouchableOpacity
                    onPress={() => handleSelectAccount(setFieldValue)}
                    style={styles.selectItem}
                  >
                    <Text style={styles.selectLabel}>Cuenta</Text>
                    <Text style={styles.selectValue}>{selAccount?.name ?? 'Seleccionar'}</Text>
                  </TouchableOpacity>

                  {/* Categoria */}
                  <TouchableOpacity
                    onPress={() => handleSelEntryCategory(setFieldValue)}
                    style={styles.selectItem}
                  >
                    <Text style={styles.selectLabel}>Categoria</Text>
                    <Text style={styles.selectValue}>{selEntryCat?.name ?? 'Seleccionar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calculator */}
              <EntryCalculator handleValue={setCalculatorAmount} />

              {/* Optional: Add a hidden input for description if needed later */}
              {/* <TextInput value={values.description} onChangeText={handleChange('description')} /> */}
            </KeyboardAvoidingView>
          );
        }}
      </Formik>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightContainer: {
    paddingRight: 10,
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3f3',
  },
  btn: {
    paddingHorizontal: 60,
    paddingVertical: 13,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: 'bold',
    color: 'white', // Ensure text color is set for non-active states
  },
  btnActive: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // --- New/Refined Styles for Amount Display ---
  amountDisplayContainer: {
    padding: 10,
    minHeight: 200,
    justifyContent: 'space-evenly',
  },
  amountTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
    paddingHorizontal: 15,
  },
  signText: {
    fontSize: 50,
    color: COLORS.primary,
  },
  amountText: {
    height: 60,
    fontSize: 50,
    color: COLORS.primary,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 10, // Added margin for better separation
  },
  selectItem: {
    alignItems: 'center',
    flex: 1,
  },
  selectLabel: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
    paddingBottom: 3,
  },
  selectValue: {
    color: 'white',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
});
