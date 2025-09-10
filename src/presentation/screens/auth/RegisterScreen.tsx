import { LoginDto } from "@infrastructure/dtos/auth";
import { StackScreenProps } from "@react-navigation/stack";
import { useAuthStore } from "@store/useAuthStore";
import { COLORS } from "@styles/colors";
import { ComponentStyles } from "@styles/components";
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

interface Props extends StackScreenProps<AuthStackParams, "RegisterScreen"> {}

//TODO: styling, confirm password validator
export const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuthStore();
  const emailInpRef = useRef(null);
  const passInpRef = useRef(null);
  const confirmInpref = useRef(null);

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

            <TextInput
              ref={emailInpRef}
              style={ComponentStyles.input}
              placeholder="Email"
              placeholderTextColor="#A0A0A0"
              value={values.email}
              onChangeText={handleChange("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType={"next"}
              onSubmitEditing={() => passInpRef.current?.focus()}
            />

            <TextInput
              ref={passInpRef}
              style={ComponentStyles.input}
              placeholder="Password"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={values.password}
              onChangeText={handleChange("password")}
              onSubmitEditing={() => confirmInpref.current?.focus()}
            />

            <TextInput
              ref={confirmInpref}
              style={ComponentStyles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={values.confirmPassword}
              onChangeText={handleChange("confirmPassword")}
              onSubmitEditing={() => handleSubmit()}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSubmit()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={ComponentStyles.btnPrimaryText}>Crear</Text>
              )}
            </TouchableOpacity>
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
