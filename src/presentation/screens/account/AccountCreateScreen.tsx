import { AccountType } from '@domain/entities';
import { CreateAccountDto } from '@infrastructure/dtos/accounts';
import { Button, InputNumber, InputText } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
import { AccountStackParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccountStore } from '@store/useAccountStore';
import { useCatalogsStore } from '@store/useCatalogsStore';
import { useMutation } from '@tanstack/react-query';
import { Formik, FormikProps } from 'formik';
import { Banknote, Check, DollarSign, Hash, MapPin } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// --- CONSTANTES Y VALORES INICIALES ---

const INITIAL_VALUES: CreateAccountDto = {
  name: '',
  balance: 0,
  accountTypeId: '',
  bank: '',
  accountNumber: '',
};

// --- COMPONENTE TypeSelectionCard (Memoizado) ---

interface TypeCardProps {
  type: AccountType;
  isSelected: boolean;
  onSelect: (type: AccountType) => void;
}

// 1. Optimización: Memoizar para evitar re-render innecesarios de las tarjetas.
const TypeSelectionCard = React.memo(({ type, isSelected, onSelect }: TypeCardProps) => {
  // Nota: Asumiendo que type.iconItem es un Componente React (LucideIcon).
  const IconComponent = type.iconItem;

  // 2. Optimización: Usar publicId como clave en el manejo del tipo (más seguro que todo el objeto).
  const handlePress = () => onSelect(type);

  return (
    <TouchableOpacity
      style={[
        styles.typeCard,
        { backgroundColor: type.color },
        isSelected && styles.typeCardSelected,
      ]}
      onPress={handlePress}
    >
      <View style={styles.typeCardIconTitle}>
        <IconComponent size={30} color="#fff" />
        <Text style={styles.typeCardTitle}>{type.displayName}</Text>
      </View>
      {isSelected && <Check size={24} color="#fff" style={styles.checkIcon} />}
      <Text style={styles.typeCardDescription}>{type.description}</Text>
    </TouchableOpacity>
  );
});

// --- PANTALLA PRINCIPAL ---

export const AccountCreateScreen = () => {
  const { accountTypes } = useCatalogsStore();
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);

  const { create } = useAccountStore();
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();
  const formikRef = useRef<FormikProps<CreateAccountDto>>(null);

  const selectedTypeId = selectedType?.publicId || '';

  const mutation = useMutation({
    mutationFn: (data: CreateAccountDto) => create(data),
    onSuccess(data) {
      navigation.navigate('AccountCreateSuccessScreen', { account: data });
    },
    onError(error) {
      console.error('Error creating account', error);
      alert(error.message);
    },
  });

  // 4. Optimización: Centralizar la lógica de scroll en una función useCallback.
  const scrollViewRef = useRef<ScrollView>(null);
  const formRef = useRef<View>(null);

  const handleTypeSelect = useCallback((type: AccountType) => {
    setSelectedType(type);

    setTimeout(() => {
      formRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => console.log('Error midiendo el layout')
      );
    }, 100);
  }, []); // Dependencias vacías, solo se crea una vez.

  // 5. Optimización: Uso de React.useMemo para el validador (Formik)
  const validateForm = React.useMemo(
    () => (values: CreateAccountDto) => {
      const errors: Record<string, string> = {};

      if (!values.name) {
        errors.name = 'El nombre de la cuenta es obligatorio.';
      }
      // Añadir validación para el tipo de cuenta.
      if (!selectedTypeId) {
        errors.accountTypeId = 'Debe seleccionar un tipo de cuenta.';
      }

      // Convertir el balance a número para la validación de formato si es necesario,
      // o asumir que InputNumber ya maneja la entrada segura.
      if (isNaN(Number(values.balance))) {
        errors.balance = 'El balance debe ser un número.';
      }

      return errors;
    },
    [selectedTypeId]
  ); // Se recalcula si el ID del tipo de cuenta cambia.

  // 6. Optimización: Simplificar la función onSubmit (Formik)
  const handleSubmit = useCallback(
    (values: CreateAccountDto) => {
      if (!selectedType) {
        alert('Debe seleccionar un tipo de cuenta para continuar.');
        return;
      }

      // Asegurar que el balance sea un número antes de mutar
      const request: CreateAccountDto = {
        ...values,
        balance: Number(values.balance), // Asumiendo que values.balance puede ser string si viene de un InputNumber no procesado.
        accountTypeId: selectedType.publicId, // Usar el publicId del objeto seleccionado
      };

      // Nota: Es mejor validar `values.balance` como string en Formik si `InputNumber`
      // no garantiza que el valor sea un número en el estado de Formik.
      mutation.mutate(request);
    },
    [mutation, selectedType]
  );

  // 7. Optimización: Separar el renderizado condicional del formulario en un componente auxiliar.
  // Esto no solo mejora la legibilidad sino que ayuda al rendimiento de Formik.
  const RenderFormSection = React.useCallback(() => {
    if (!selectedType || !formikRef.current) return null;

    const { handleChange, values, errors, touched, setFieldValue } = formikRef.current;
    const isEfectivo = selectedType.displayName === 'Efectivo';

    return (
      <View ref={formRef} style={styles.formContainer}>
        <Text style={styles.sectionTitle}>
          2. Detalles de la Cuenta ({selectedType.displayName})
        </Text>

        {/* Input Name */}
        <InputText
          label="Nombre de la Cuenta"
          placeholder="Ej: Cuenta de Cheques"
          value={values.name}
          onChangeText={handleChange('name')}
          LeftIcon={Banknote}
          autoCapitalize="none"
          autoCorrect={false}
          errorMsg={touched.name && errors.name ? errors.name : undefined}
        />

        {/* Input Balance */}
        <InputNumber
          label="Balance Inicial"
          placeholder="0"
          value={values.balance}
          onChangeText={(val) => setFieldValue('balance', val)}
          LeftIcon={DollarSign}
          errorMsg={touched.balance && errors.balance ? errors.balance : undefined}
        />

        {/* Campos Condicionales (Bancos) */}
        {!isEfectivo && (
          <>
            <InputText
              label="Banco"
              placeholder="Ej: Banco Nacional S.A."
              value={values.bank}
              onChangeText={handleChange('bank')}
              LeftIcon={MapPin}
            />
            <InputText
              label="Número de Cuenta (Opcional)"
              placeholder="Número de cuenta o Alias"
              keyboardType="number-pad"
              value={values.accountNumber}
              onChangeText={handleChange('accountNumber')}
              LeftIcon={Hash}
            />
          </>
        )}

        <View style={{ height: 20 }} />
      </View>
    );
  }, [selectedType]); // Solo re-renderiza cuando el tipo seleccionado cambia.

  return (
    <MainLayout title="Crear cuenta">
      {/* 8. Optimización: La KeyboardAvoidingView debe envolver el Formik/ScrollView, no viceversa si se usa MainLayout. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Formik
          innerRef={formikRef}
          initialValues={INITIAL_VALUES}
          validate={validateForm} // Usar el validador memoizado
          onSubmit={handleSubmit} // Usar el submit memoizado
          enableReinitialize={false} // No es necesario re-inicializar
        >
          {({ handleSubmit, isValid }) => (
            <>
              {/* ScrollView es el contenedor principal del contenido que se desplaza */}
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* PASO 1: Selector Visual de Tipo */}
                <Text style={styles.sectionTitle}>1. Selecciona el Tipo de Cuenta</Text>
                <Text style={styles.sectionSubtitle}>
                  Define cómo se comportarán tus transacciones en esta cuenta.
                </Text>

                <View style={styles.typeSelectionContainer}>
                  {accountTypes.map((type) => (
                    <TypeSelectionCard
                      key={type.publicId}
                      type={type}
                      isSelected={selectedType?.publicId === type.publicId} // Comparar por ID
                      onSelect={handleTypeSelect}
                    />
                  ))}
                </View>

                {/* PASO 2: Formulario (Renderizado optimizado) */}
                {selectedType && <RenderFormSection />}
              </ScrollView>

              {/* Botón de Creación Fijo (Usa el `isValid` de Formik) */}
              {selectedType && (
                <View style={styles.buttonContainer}>
                  <Button
                    label="Crear"
                    onPress={handleSubmit}
                    disabled={!isValid || mutation.isPending} // Deshabilitar si no es válido o está cargando
                    isLoading={mutation.isPending}
                  />
                </View>
              )}
            </>
          )}
        </Formik>
      </KeyboardAvoidingView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  buttonContainer: {
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
