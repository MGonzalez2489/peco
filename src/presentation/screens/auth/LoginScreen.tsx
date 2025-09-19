import { LoginDto } from '@infrastructure/dtos/auth';
import { Button, InputText } from '@presentation/components';
import { MainLayout } from '@presentation/layout';
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
import { AuthStackParams } from 'src/presentation/navigation';

type Props = StackScreenProps<AuthStackParams, 'LoginScreen'>;

const validateLogin = (values: LoginDto) => {
  const errors: Record<string, string> = {};
  if (!values.email) {
    errors['email'] = 'El email es requerido.';
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors['email'] = 'Dirección de email no válida.';
  }
  if (!values.password) {
    errors['password'] = 'La contraseña es requerida.';
  }
  return errors;
};

export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: LoginDto) => login(data),
    onError(error) {
      alert(`Error de sesión: ${error.message}`);
    },
  });

  return (
    <MainLayout showNavbar={false} title="login">
      <Formik
        initialValues={{ email: '', password: '' }}
        validate={validateLogin}
        onSubmit={(values) => mutation.mutate(values)}
      >
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.logoSpacer}>
                <Text>Logo</Text>
              </View>
              <View style={styles.formContent}>
                <Text style={styles.title}>Bienvenido de nuevo</Text>
                <Text style={styles.subTitle}>Inicia sesión para continuar con tus finanzas.</Text>
                <InputText
                  label="Email"
                  value={values.email}
                  placeholder="ejemplo@correo.com"
                  onChangeText={handleChange('email')}
                  errorMsg={touched.email ? errors.email : undefined}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <InputText
                  label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  errorMsg={touched.password ? errors.password : undefined}
                  secureTextEntry={true}
                  onSubmitEditing={() => handleSubmit()}
                  autoCapitalize="none"
                />
                {/* Link de Recuperación */}
                <TouchableOpacity
                  style={styles.link}
                  onPress={() => {
                    /* navigation.navigate('ForgotPasswordScreen') */
                  }}
                >
                  <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
                <View style={styles.spacer} />
                <Button
                  label="Entrar"
                  onPress={() => handleSubmit()}
                  isDisabled={mutation.isPending}
                  isLoading={mutation.isPending}
                />
              </View>
            </ScrollView>

            {/* Contenedor de Registro (Sticky) */}
            <View style={styles.bottomContainer}>
              <Text style={styles.bottomText}>¿No tienes cuenta?</Text>
              <TouchableOpacity
                style={styles.bottomLink}
                onPress={() => navigation.navigate('RegisterScreen')}
              >
                <Text style={styles.bottomLinkText}>Regístrate</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContent: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 5,
  },
  subTitle: {
    marginBottom: 40,
    fontSize: 16,
    color: COLORS.secondaryText,
  },
  passwordInput: {
    marginTop: 10,
    marginBottom: 10,
  },
  link: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    // Empuja el botón hacia abajo, pero es flexible
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
