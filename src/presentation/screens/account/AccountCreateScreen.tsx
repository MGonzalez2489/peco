import { ComponentStyles } from "@styles/components";
import { Formik } from "formik";
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
import { MainLayout } from "src/presentation/layout";

const initialValues = {
  name: "na",
  balance: "ba",
  accountType: "ac",
  bank: "bankaaaa",
  accountNumber: "123",
};

//TODO: Review if a common form component can be created to
//avoid repeating keyboardavoidingView behavior
export const AccountCreateScreen = () => {
  return (
    <MainLayout title="Crear cuenta">
      <Formik
        initialValues={initialValues}
        onSubmit={() => console.log("values")}
      >
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
          >
            <View>
              {/* Required Fields */}
              <View>
                {/* Name */}
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Nombre de la cuenta"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="default"
                  autoCapitalize="none"
                  value={values.name}
                  onChangeText={handleChange("name")}
                />
                {/* Initial Balance */}
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Balance inicial"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  value={values.balance}
                  onChangeText={handleChange("balance")}
                />
                {/* Account Type */}
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Tipo de cuenta"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="default"
                  autoCapitalize="none"
                  value={values.accountType}
                  onChangeText={handleChange("accountType")}
                />
              </View>
              <View style={{ paddingTop: 30 }}></View>
              {/* Optional Fields */}
              <View>
                {/* Bank */}
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Banco"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="default"
                  autoCapitalize="none"
                  value={values.bank}
                  onChangeText={handleChange("bank")}
                />
                {/* Account Number */}
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Numero de cuenta"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="default"
                  autoCapitalize="none"
                  value={values.accountNumber}
                  onChangeText={handleChange("accountNumber")}
                />
              </View>
              <View style={{ paddingTop: 30 }}></View>
            </View>
            <TouchableOpacity
              style={ComponentStyles.btnPrimary}
              onPress={() => handleSubmit()}
            >
              {false ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#fff" }}>Crear</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}
      </Formik>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 50,
  },
});
