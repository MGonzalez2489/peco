import { LoginDto } from "@infrastructure/dtos/auth";
import { Button, InputText } from "@presentation/components";
import { AuthStackParams } from "@presentation/navigation";
import { StackScreenProps } from "@react-navigation/stack";
import { useAuthStore } from "@store/useAuthStore";
import { COLORS } from "@styles/colors";
import { useMutation } from "@tanstack/react-query";
import { Formik } from "formik";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props extends StackScreenProps<AuthStackParams, "RegisterScreen"> {}

//TODO: styling, confirm password validator
export const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuthStore();

  //
  const mutation = useMutation({
    mutationFn: (data: LoginDto) => register(data),
    onError(error) {
      alert(error);
    },
  });

  return (
    <Formik
      initialValues={{ email: "", password: "", confirmPassword: "" }}
      validate={(values) => {
        const errors = {};
        if (!values.email) {
          errors["email"] = "Required";
        } else if (
          !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)
        ) {
          errors["email"] = "Invalid email address";
        }
        return errors;
      }}
      onSubmit={(values) => {
        mutation.mutate({ email: values.email, password: values.password });
      }}
    >
      {({ handleChange, handleSubmit, values, errors, touched }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Crear cuenta</Text>

            <InputText
              label="Email"
              value={values.email}
              placeholder="Email"
              onChange={handleChange("email")}
              errorMsg={touched.email ? errors.email : undefined}
            />

            <InputText
              label="Contraseña"
              value={values.password}
              placeholder="Contraseña"
              isPassword={true}
              onChange={handleChange("password")}
              errorMsg={touched.password ? errors.password : undefined}
            />

            <InputText
              label="Confirmar Contraseña"
              value={values.password}
              placeholder="Confirmar contraseña"
              isPassword={true}
              onChange={handleChange("confirmPassword")}
              errorMsg={
                touched.confirmPassword ? errors.confirmPassword : undefined
              }
            />

            <Button
              label="Crear"
              onPress={() => handleSubmit()}
              isDisabled={mutation.isPending}
              isLoading={mutation.isPending}
            />
          </View>

          <View style={styles.bottomContainer}>
            <Text style={styles.bottomText}>¿Ya tienes una cuenta?</Text>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <Text style={styles.bottomLinkText}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 50,
  },

  button: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  bottomText: {
    color: "#666666",
    fontSize: 14,
  },
  bottomLink: {
    marginLeft: 5,
  },
  bottomLinkText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "bold",
  },
});
