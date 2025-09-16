import { CreateAccountDto } from '@infrastructure/dtos/accounts';
import { InputNumber, InputText } from '@presentation/components';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { useMutation } from '@tanstack/react-query';
import { Formik, FormikProps } from 'formik';
import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MainLayout } from 'src/presentation/layout';
import { AccountStackParams } from 'src/presentation/navigation/AccountsNavigation';

const initialValues = {
  name: '',
  balance: 0,
  accountTypeId: '',
  bank: '',
  accountNumber: '',
};

type Props = StackScreenProps<AccountStackParams, 'AccountCreateScreen'>;
//TODO: FORM VALIDATIONS
export const AccountCreateScreen = ({ route }: Props) => {
  const { create } = useAccountStore();
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
  const accountType = route.params?.accountType;
  const formikRef = useRef<FormikProps<any>>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateAccountDto) => create(data),
    onSuccess(data) {
      navigation.navigate('AccountCreateSuccessScreen', { account: data });
    },
    onError(error) {
      console.log('Error creating account', error);
      alert(error.message);
    },
  });

  useEffect(() => {
    navigation.setOptions({
      title: `Cuenta de ${accountType.displayName}`,
      headerStyle: {
        backgroundColor: accountType.color,
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
  }, [navigation, accountType]);
  return (
    <MainLayout title="Crear cuenta" showNavbar={false}>
      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        onSubmit={(values) => {
          const request = {
            ...values,
            balance: Number(values.balance),
            accountTypeId: accountType.publicId,
          };
          mutation.mutate(request);
        }}
      >
        {({ handleChange, handleSubmit, values, errors, touched, setFieldValue }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View>
              {/* Required Fields */}
              <View>
                {/* Name */}
                <InputText
                  value={values.name}
                  label="Nombre"
                  placeholder="Nombre de la cuenta"
                  autoCorrect={false}
                  onChangeText={handleChange('name')}
                />

                {/* Initial Balance */}
                <InputNumber
                  value={values.balance}
                  label="Balance inicial"
                  onChangeText={handleChange('balance')}
                />
              </View>
              <View style={{ paddingTop: 30 }}></View>
              {/* Optional Fields */}
              <View>
                {/* Bank */}
                <InputText
                  value={values.bank}
                  onChangeText={handleChange('bank')}
                  placeholder="Banco"
                  label="Banco"
                  autoCapitalize="none"
                />

                {/* Account Number */}

                <InputText
                  value={values.accountNumber}
                  onChangeText={handleChange('accountNumber')}
                  placeholder="Numero de cuenta"
                  label="Numero de cuenta"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ paddingTop: 30 }}></View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Formik>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
