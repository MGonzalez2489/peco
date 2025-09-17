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

//TODO: Styling
export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: LoginDto) => login(data),
    onError(error) {
      alert(error.message);
    },
  });

  return (
    <MainLayout showNavbar={false} title="login">
      <Formik
        initialValues={{ email: '', password: '' }}
        validate={(values) => {
          const errors = {};
          if (!values.email) {
            errors['email'] = 'Required';
          } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
            errors['email'] = 'Invalid email address';
          }
          return errors;
        }}
        onSubmit={(values) => mutation.mutate(values)}
      >
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.content}>
                <Text style={styles.title}>Bienvenido de nuevo</Text>
                <Text style={styles.subTitle}>Inicia sesión para continuar con tus finanzas.</Text>

                <InputText
                  label="Email"
                  value={values.email}
                  placeholder="Email"
                  onChangeText={handleChange('email')}
                  errorMsg={touched.email ? errors.email : undefined}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <InputText
                  label="Contraseña"
                  placeholder="Password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  errorMsg={touched.password ? errors.password : undefined}
                  secureTextEntry={true}
                  onSubmitEditing={() => handleSubmit()}
                  autoCapitalize="none"
                />

                <Button
                  label="Entrar"
                  onPress={() => handleSubmit()}
                  isDisabled={mutation.isPending}
                  isLoading={mutation.isPending}
                />

                <TouchableOpacity style={styles.link}>
                  <Text style={styles.linkText}>Forgot your password?</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.bottomContainer}>
              <Text style={styles.bottomText}>¿No tienes cuenta?</Text>
              <TouchableOpacity
                style={styles.bottomLink}
                onPress={() => navigation.navigate('RegisterScreen')}
              >
                <Text style={styles.bottomLinkText}>Registrate</Text>
              </TouchableOpacity>
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
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  subTitle: {
    marginBottom: 50,
    fontSize: 15,
    color: '#a8b0b9',
  },

  link: {
    marginTop: 15,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  bottomText: {
    color: '#666666',
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
