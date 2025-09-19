import { LoginDto } from '@infrastructure/dtos/auth';
import { Button, InputText } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
import { AuthStackParams } from '@presentation/navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuthStore } from '@store/useAuthStore';
import { COLORS } from '@styles/colors';
import { useMutation } from '@tanstack/react-query';
import { Formik } from 'formik';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = StackScreenProps<AuthStackParams, 'RegisterScreen'>;

// Función de validación (traducida y mejor estructurada)
const validateRegister = (values: any) => {
  // Usamos 'any' ya que LoginDto no incluye confirmPassword
  const errors: Record<string, string> = {};

  // 1. Email
  if (!values.email) {
    errors['email'] = 'El correo electrónico es obligatorio.';
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors['email'] = 'Dirección de correo no válida.';
  }

  // 2. Contraseñas
  if (!values.password) {
    errors['password'] = 'La contraseña es obligatoria.';
  }
  if (!values.confirmPassword) {
    errors['confirmPassword'] = 'La confirmación es obligatoria.';
  } else if (values.password !== values.confirmPassword) {
    errors['confirmPassword'] = 'Las contraseñas no coinciden.';
  }

  return errors;
};

export const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: LoginDto) => register(data),
    onError(error) {
      alert(`Error de registro: ${error}`);
    },
  });

  return (
    <MainLayout showNavbar={false} title="Registro">
      <Formik
        initialValues={{ email: '', password: '', confirmPassword: '' }}
        validate={validateRegister}
        onSubmit={(values) => {
          // Solo enviamos email y password al backend, como en tu lógica original
          mutation.mutate({ email: values.email, password: values.password });
        }}
      >
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.logoSpacer}>
                <Text>Logo</Text>
              </View>

              <View style={styles.formContent}>
                <Text style={styles.title}>Crear una cuenta</Text>
                <Text style={styles.subTitle}>
                  Regístrate para empezar a organizar tus finanzas.
                </Text>

                {/* Input Email */}
                <InputText
                  label="Email"
                  value={values.email}
                  placeholder="ejemplo@correo.com"
                  onChangeText={handleChange('email')}
                  errorMsg={touched.email ? errors.email : undefined}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                {/* Input Contraseña */}
                <InputText
                  label="Contraseña"
                  value={values.password}
                  placeholder="Ingresa tu contraseña"
                  onChangeText={handleChange('password')}
                  errorMsg={touched.password ? errors.password : undefined}
                  autoCapitalize="none"
                  secureTextEntry={true}
                />

                {/* Input Confirmar Contraseña */}
                <InputText
                  label="Confirmar Contraseña"
                  value={values.confirmPassword}
                  placeholder="Vuelve a ingresar tu contraseña"
                  onChangeText={handleChange('confirmPassword')}
                  errorMsg={touched.confirmPassword ? errors.confirmPassword : undefined}
                  autoCapitalize="none"
                  secureTextEntry={true}
                  onSubmitEditing={() => handleSubmit()}
                />

                <View style={styles.spacer} />

                {/* Botón de Registro */}
                <Button
                  label="Crear Cuenta"
                  onPress={() => handleSubmit()}
                  isDisabled={mutation.isPending}
                  isLoading={mutation.isPending}
                />
              </View>
            </ScrollView>

            {/* Contenedor de Login (Sticky) */}
            <View style={styles.bottomContainer}>
              <Text style={styles.bottomText}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity
                style={styles.bottomLink}
                onPress={() => navigation.navigate('LoginScreen')}
              >
                <Text style={styles.bottomLinkText}>Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </Formik>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  logoSpacer: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    width: '100%',
  },
  title: {
    fontSize: 32, // Tamaño grande para el título
    fontWeight: '700', // Más audaz
    color: COLORS.text,
    marginBottom: 5,
  },
  subTitle: {
    marginBottom: 40,
    fontSize: 16,
    color: COLORS.secondaryText,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: COLORS.white,
  },
  bottomText: {
    color: COLORS.secondaryText,
    fontSize: 14,
  },
  bottomLink: {
    marginLeft: 5,
  },
  bottomLinkText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
