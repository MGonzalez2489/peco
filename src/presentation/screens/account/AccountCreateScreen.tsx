import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  DollarSign,
  CreditCard,
  Banknote,
  MapPin,
  Hash,
} from 'lucide-react-native';
import { Button, InputText } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
// Asumiendo que InputText está disponible y funciona correctamente

// --- Tipos y Data ---
type AccountType = 'Debito' | 'Efectivo' | 'Ahorros';

// ... (Definiciones de ACCOUNT_TYPES y TypeSelectionCard, que permanecen igual) ...

const ACCOUNT_TYPES = [
  {
    id: 'Debito',
    label: 'Débito',
    icon: CreditCard,
    color: '#00B8D9',
    description: 'Cuentas para gastos diarios o tarjetas vinculadas.',
  },
  {
    id: 'Efectivo',
    label: 'Efectivo',
    icon: DollarSign,
    color: '#34C759',
    description: 'Para manejar dinero en efectivo, carteras o billeteras.',
  },
  {
    id: 'Ahorros',
    label: 'Ahorros',
    icon: Banknote,
    color: '#9747FF',
    description: 'Cuentas con propósito de ahorro o inversión a largo plazo.',
  },
];

interface TypeCardProps {
  type: (typeof ACCOUNT_TYPES)[0];
  isSelected: boolean;
  onSelect: (type: AccountType) => void;
}

const TypeSelectionCard = ({ type, isSelected, onSelect }: TypeCardProps) => {
  const IconComponent = type.icon;

  return (
    <TouchableOpacity
      style={[
        styles.typeCard,
        { backgroundColor: type.color },
        isSelected && styles.typeCardSelected,
      ]}
      onPress={() => onSelect(type.id as AccountType)}
    >
      <View style={styles.typeCardIconTitle}>
        <IconComponent size={30} color="#fff" />
        <Text style={styles.typeCardTitle}>{type.label}</Text>
      </View>
      {isSelected && <Check size={24} color="#fff" style={styles.checkIcon} />}
      <Text style={styles.typeCardDescription}>{type.description}</Text>
    </TouchableOpacity>
  );
};

// --- Pantalla Principal ---

export const AccountCreateScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    initialBalance: '',
    bank: '',
    accountNumber: '',
  });

  // 1. Referencias para el scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const formRef = useRef<View>(null); // Referencia al contenedor del formulario

  const isFormValid = selectedType && formData.name && formData.initialBalance;

  const handleTypeSelect = (type: AccountType) => {
    setSelectedType(type);

    // 2. Esperar el siguiente ciclo de renderizado para que el formulario se monte
    setTimeout(() => {
      // 3. Medir y hacer scroll al formulario
      formRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y, animated: true });
        },
        () => console.log('Error midiendo el layout')
      );
    }, 100);
  };

  const handleCreateAccount = () => {
    if (isFormValid) {
      Alert.alert('Éxito', `Cuenta de ${selectedType} creada: ${formData.name}`);
    } else {
      Alert.alert('Error', 'Por favor, selecciona un tipo y completa los campos obligatorios.');
    }
  };

  // const renderHeader = () => (
  //   <View style={[styles.header, { paddingTop: insets.top }]}>
  //     <TouchableOpacity style={styles.headerButton}>
  //       <ArrowLeft size={24} color="#000" />
  //     </TouchableOpacity>
  //     <Text style={styles.headerTitle}>Crear Cuenta</Text>
  //     <View style={{ width: 44 }} />
  //   </View>
  // );

  return (
    <MainLayout title="Crear cuenta">
      {/* ScrollView con Referencia */}
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* PASO 1: Selector Visual de Tipo */}
        <Text style={styles.sectionTitle}>1. Selecciona el Tipo de Cuenta</Text>
        <Text style={styles.sectionSubtitle}>
          Define cómo se comportarán tus transacciones en esta cuenta.
        </Text>

        <View style={styles.typeSelectionContainer}>
          {ACCOUNT_TYPES.map((type) => (
            <TypeSelectionCard
              key={type.id}
              type={type}
              isSelected={selectedType === type.id}
              onSelect={handleTypeSelect} // Usamos la nueva función con scroll
            />
          ))}
        </View>

        {/* PASO 2: Formulario de Detalles (Referencia para scroll) */}
        {selectedType && (
          <View ref={formRef} style={styles.formContainer}>
            <Text style={styles.sectionTitle}>2. Detalles de la Cuenta ({selectedType})</Text>

            <InputText
              label="Nombre de la Cuenta"
              placeholder="Ej: Cuenta de Cheques"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              LeftIcon={Banknote}
            />

            <InputText
              label="Balance Inicial"
              placeholder="0"
              keyboardType="numeric"
              value={formData.initialBalance}
              onChangeText={(text) => setFormData({ ...formData, initialBalance: text })}
              LeftIcon={DollarSign}
            />

            {/* Campos Condicionales para Cuentas Bancarias */}
            {selectedType !== 'Efectivo' && (
              <>
                <InputText
                  label="Banco"
                  placeholder="Ej: Banco Nacional S.A."
                  value={formData.bank}
                  onChangeText={(text) => setFormData({ ...formData, bank: text })}
                  leftIcon={<MapPin color="#000" />}
                />
                <InputText
                  label="Número de Cuenta (Opcional)"
                  placeholder="Número de cuenta o Alias"
                  keyboardType="number-pad"
                  value={formData.accountNumber}
                  onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                  leftIcon={<Hash color="#000" />}
                />
              </>
            )}

            <View style={{ height: 20 }} />
          </View>
        )}
      </ScrollView>

      {/* Botón de Creación Flotante o Fijo */}
      {selectedType && <Button label="Crear cuenta" onPress={() => console.log('crear cuenta')} />}
    </MainLayout>
  );
};

// --- Estilos (Solo cambios relevantes al flujo) ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  typeSelectionContainer: {
    gap: 15,
    marginBottom: 30,
  },
  typeCard: {
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  typeCardSelected: {
    borderWidth: 4,
    borderColor: '#fff',
  },
  typeCardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  typeCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  typeCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  checkIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  formContainer: {
    gap: 10,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#999',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// import { CreateAccountDto } from '@infrastructure/dtos/accounts';
// import { Button, InputNumber, InputText } from '@presentation/components';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
// import { useAccountStore } from '@store/useAccountStore';
// import { useMutation } from '@tanstack/react-query';
// import { Formik, FormikProps } from 'formik';
// import { useRef } from 'react';
// import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
// import { MainLayout } from 'src/presentation/layout';
// import { AccountStackParams } from 'src/presentation/navigation/AccountsNavigation';
//
// const initialValues = {
//   name: '',
//   balance: 0,
//   accountTypeId: '',
//   bank: '',
//   accountNumber: '',
// };
//
// type Props = StackScreenProps<AccountStackParams, 'AccountCreateScreen'>;
// export const AccountCreateScreen = ({ route }: Props) => {
//   const { create } = useAccountStore();
//   const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
//   const accountType = route.params?.accountType;
//   const formikRef = useRef<FormikProps<any>>(null);
//
//   const mutation = useMutation({
//     mutationFn: (data: CreateAccountDto) => create(data),
//     onSuccess(data) {
//       navigation.navigate('AccountCreateSuccessScreen', { account: data });
//     },
//     onError(error) {
//       console.log('Error creating account', error);
//       alert(error.message);
//     },
//   });
//
//   return (
//     <MainLayout title="Crear cuenta" showNavbar={true}>
//       <Formik
//         innerRef={formikRef}
//         initialValues={initialValues}
//         validate={(values) => {
//           const errors = {};
//           if (!values.name) {
//             errors['name'] = 'Required';
//           }
//
//           return errors;
//         }}
//         onSubmit={(values) => {
//           const request = {
//             ...values,
//             balance: Number(values.balance),
//             accountTypeId: accountType.publicId,
//           };
//           mutation.mutate(request);
//         }}
//       >
//         {({ handleChange, handleSubmit, values, errors, touched }) => (
//           <KeyboardAvoidingView
//             behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//             style={styles.container}
//           >
//             <View>
//               {/* Required Fields */}
//               <View>
//                 {/* Name */}
//                 <InputText
//                   value={values.name}
//                   label="Nombre"
//                   placeholder="Nombre de la cuenta"
//                   autoCorrect={false}
//                   onChangeText={handleChange('name')}
//                   errorMsg={touched.name ? errors.name : undefined}
//                 />
//
//                 {/* Initial Balance */}
//                 <InputNumber
//                   value={values.balance}
//                   label="Balance inicial"
//                   onChangeText={handleChange('balance')}
//                 />
//               </View>
//               <View style={{ paddingTop: 30 }}></View>
//               {/* Optional Fields */}
//               <View>
//                 {/* Bank */}
//                 <InputText
//                   value={values.bank}
//                   onChangeText={handleChange('bank')}
//                   placeholder="Banco"
//                   label="Banco"
//                   autoCapitalize="none"
//                 />
//
//                 {/* Account Number */}
//
//                 <InputText
//                   value={values.accountNumber}
//                   onChangeText={handleChange('accountNumber')}
//                   placeholder="Numero de cuenta"
//                   label="Numero de cuenta"
//                   autoCapitalize="none"
//                   keyboardType="number-pad"
//                 />
//               </View>
//               <View style={{ paddingTop: 30 }}></View>
//             </View>
//             <Button label="Crear" onPress={handleSubmit} />
//           </KeyboardAvoidingView>
//         )}
//       </Formik>
//     </MainLayout>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'space-between',
//   },
// });
