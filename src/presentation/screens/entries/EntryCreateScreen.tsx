import { CreateEntry } from '@actions/entries';
import { Account, EntryCategory } from '@domain/entities';
import { CreateEntryDto } from '@infrastructure/dtos/entries';
import { EntryCalculator } from '@presentation/components/entries';
import { MainLayout } from '@presentation/layout';
import { EntryStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { COLORS } from '@styles/colors';
import { useMutation } from '@tanstack/react-query';
import { Formik, FormikProps } from 'formik';
import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const initialValues = {
  description: '',
  amount: 0,
  categoryId: '',
  entryTypeId: '',
  accountId: '',
};

export const EntryCreateScreen = () => {
  const { entryTypes, entryCategories } = useCatalogsStore();
  const { accounts } = useAccountStore();
  const [selEntryType, setSelEntryType] = useState(entryTypes[0]);
  const [selAccount, setSelAccount] = useState<Account | undefined>(undefined);
  const [selEntryCat, setSelEntryCat] = useState<EntryCategory | undefined>(undefined);

  const navigation = useNavigation<StackNavigationProp<EntryStackParams>>();
  const formikRef = useRef<FormikProps<any>>(null);

  const [amount, setAmount] = useState('0');

  const renderEntryTypeOptions = (setFieldValue: any) => {
    return (
      <View style={{ ...styles.btnContainer }}>
        {entryTypes.map((g) => (
          <TouchableOpacity
            key={g.publicId}
            style={[
              selEntryType.publicId === g.publicId
                ? {
                    ...styles.btn,
                    ...styles.btnActive,
                    backgroundColor: g.color,
                  }
                : styles.btn,
            ]}
            onPress={() => {
              setSelEntryType(g);
              setFieldValue('entryTypeId', g.publicId);
            }}
          >
            <Text style={styles.btnText}>{g.displayName}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  //FIXME: this function throw a warning
  const handleSelectAccount = (setFieldValue) => {
    navigation.navigate('SelAccount', {
      onSelect(account) {
        setSelAccount(account);
        setFieldValue('accountId', account.publicId);
      },
    });
  };

  const handleSelEntryCategory = (setFieldValue) => {
    navigation.navigate('SelEntryCategory', {
      onSelect(entryCategory) {
        setSelEntryCat(entryCategory);
        setFieldValue('categoryId', entryCategory.publicId);
      },
    });
  };

  useEffect(() => {
    setSelEntryType(entryTypes[0]);
  }, [entryTypes]);

  useEffect(() => {
    setSelEntryCat(entryCategories[0]);
  }, [entryCategories]);

  useEffect(() => {
    setSelAccount(accounts[0]);
  }, [accounts]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: selEntryType.color,
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: '800',
      },
      headerRight: () => (
        <TouchableOpacity onPress={() => formikRef.current.submitForm()}>
          <Check color={'white'} />
        </TouchableOpacity>
      ),
      headerRightContainerStyle: {
        paddingRight: 10,
      },
    });
  }, [navigation, selEntryType]);

  const handleAmountChange = (value) => {
    setAmount(value);
  };

  const mutation = useMutation({
    mutationFn: (data: CreateEntryDto) => CreateEntry(data),
    onError(error) {
      alert(error.message);
    },
  });

  return (
    <MainLayout title="" showNavbar={false}>
      <Formik
        innerRef={formikRef}
        initialValues={{ ...initialValues, entryTypeId: selEntryType.publicId }}
        onSubmit={(values) => {
          const payload = {
            description: '',
            amount: Number(amount),
            categoryId: selEntryCat.publicId,
            entryTypeId: selEntryType.publicId,
            accountId: selAccount.publicId,
          };
          mutation.mutate(payload);
        }}
      >
        {({ handleChange, handleSubmit, values, errors, touched, setFieldValue }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            {/* main view */}
            {renderEntryTypeOptions(setFieldValue)}

            {/* amount */}
            <View
              style={{
                backgroundColor: selEntryType.color,
                padding: 15,
                minHeight: 150,
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingRight: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 50,
                    color: COLORS.primary,
                    paddingHorizontal: 15,
                  }}
                >
                  {selEntryType.name === 'income' ? '+' : '-'}
                </Text>
                <Text
                  style={{
                    height: 60,
                    fontSize: 50,
                    color: COLORS.primary,
                  }}
                >
                  {amount}
                </Text>
              </View>
            </View>

            {/* otras opciones */}
            <View
              style={{
                backgroundColor: selEntryType.color,
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                paddingHorizontal: 40,
              }}
            >
              {/* Cuenta */}
              <TouchableOpacity onPress={() => handleSelectAccount(setFieldValue)}>
                <Text
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: '700',
                    paddingBottom: 3,
                  }}
                >
                  Cuenta
                </Text>
                <Text style={{ color: 'white', textTransform: 'capitalize', textAlign: 'center' }}>
                  {selAccount?.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSelEntryCategory(setFieldValue)}>
                <Text
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: '700',
                    paddingBottom: 3,
                  }}
                >
                  Categoria
                </Text>
                <Text style={{ color: 'white', textAlign: 'center' }}>{selEntryCat?.name}</Text>
              </TouchableOpacity>
            </View>

            {/* aqui van los numeros */}
            <EntryCalculator handleValue={handleAmountChange} />
          </KeyboardAvoidingView>
        )}
      </Formik>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  btnSeparator: {
    paddingHorizontal: 0,
    backgroundColor: 'gray',
  },
  btnText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  btnActive: {
    elevation: 8, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
