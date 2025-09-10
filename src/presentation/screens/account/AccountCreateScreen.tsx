import { COLORS } from "@styles/colors";
import { ComponentStyles } from "@styles/components";
import { Formik } from "formik";
import { useState } from "react";
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
import DropDownPicker from "react-native-dropdown-picker";
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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
  ]);

  return (
    <MainLayout title="Crear cuenta">
      <Formik
        initialValues={initialValues}
        onSubmit={(values) => console.log("values", values)}
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
                <Text style={ComponentStyles.inputLabel}>Nombre</Text>
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
                <Text style={ComponentStyles.inputLabel}>Balance Inicial</Text>
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
                <Text style={ComponentStyles.inputLabel}>Tipo</Text>
                <DropDownPicker
                  open={open}
                  value={value}
                  items={items}
                  setOpen={setOpen}
                  setValue={setValue}
                  setItems={setItems}
                  onChangeValue={handleChange("accountType")}
                  placeholder="Tipo de Cuenta"
                  style={ComponentStyles.input}
                  listItemContainerStyle={{
                    backgroundColor: COLORS.background,
                  }}
                  dropDownContainerStyle={{
                    borderTopWidth: 0,
                    borderColor: "#E0E0E0",
                  }}
                />
              </View>
              <View style={{ paddingTop: 30 }}></View>
              {/* Optional Fields */}
              <View>
                {/* Bank */}
                <Text style={ComponentStyles.inputLabel}>Banco</Text>
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
                <Text style={ComponentStyles.inputLabel}>Numero de cuenta</Text>
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
                <Text style={ComponentStyles.btnPrimaryText}>Crear</Text>
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
