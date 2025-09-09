import { LoginDto } from "@infrastructure/dtos/auth";
import { StackScreenProps } from "@react-navigation/stack";
import { useAuthStore } from "@store/useAuthStore";
import { COLORS } from "@styles/colors";
import { useMutation } from "@tanstack/react-query";
import { Formik } from "formik";
import { useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthStackParams } from "src/presentation/navigation";

interface Props extends StackScreenProps<AuthStackParams, "LoginScreen"> {}

//TODO: Styling
export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuthStore();
  const emailInpRef = useRef(null);
  const passInpRef = useRef(null);

  //
  const mutation = useMutation({
    mutationFn: (data: LoginDto) => login(data),
  });

  return (
    <Formik
      initialValues={{ email: "", password: "" }}
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
      onSubmit={(values) => mutation.mutate(values)}
    >
      {({ handleChange, handleSubmit, values, errors, touched }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Bienvenido de nuevo</Text>
            <Text style={styles.subTitle}>
              Inicia sesión para continuar con tus finanzas.
            </Text>

            <TextInput
              ref={emailInpRef}
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#A0A0A0"
              value={values.email}
              onChangeText={handleChange("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType={"next"}
              onSubmitEditing={() => passInpRef.current?.focus()}
            />
            <Text> {errors.email && touched.email && errors.email}</Text>

            <TextInput
              ref={passInpRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={values.password}
              onChangeText={handleChange("password")}
              onSubmitEditing={() => handleSubmit()}
            />
            <Text>
              {errors.password && touched.password && errors.password}
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSubmit()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomContainer}>
            <Text style={styles.bottomText}>¿No tienes cuenta?</Text>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("RegisterScreen")}
            >
              <Text style={styles.bottomLinkText}>Registrate</Text>
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
    color: COLORS.primary,
    marginBottom: 10,
  },
  subTitle: {
    marginBottom: 50,
    fontSize: 15,
    color: "#a8b0b9",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
