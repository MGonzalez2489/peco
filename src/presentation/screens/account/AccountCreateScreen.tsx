import { CreateAccountDto } from "@infrastructure/dtos/accounts";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAccountStore } from "@store/useAccountStore";
import { useCatalogsStore } from "@store/useCatalogsStore";
import { COLORS } from "@styles/colors";
import { ComponentStyles } from "@styles/components";
import { useMutation } from "@tanstack/react-query";
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
import { AccountStackParams } from "src/presentation/navigation/AccountsNavigation";

const initialValues = {
  name: "",
  balance: "0",
  accountTypeId: "",
  bank: "",
  accountNumber: "",
};

export const AccountCreateScreen = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const { accountTypes } = useCatalogsStore();
  const { create } = useAccountStore();
  const navigation = useNavigation<StackNavigationProp<AccountStackParams>>();

  const dItems = accountTypes.map((item) => ({
    ...item,
    icon: undefined,
  }));

  const mutation = useMutation({
    mutationFn: (data: CreateAccountDto) => create(data),
    onSuccess(data) {
      navigation.navigate("AccountCreateSuccessScreen", { account: data });
    },
    onError(error) {
      console.log("Error creating account", error);
      alert(error.message);
    },
  });

  return (
    <MainLayout title="Crear cuenta">
      <Formik
        initialValues={initialValues}
        onSubmit={(values) => {
          const request = { ...values, balance: Number(values.balance) };
          mutation.mutate(request);
        }}
      >
        {({
          handleChange,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
        }) => (
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
                  autoCorrect={false}
                  onChangeText={handleChange("name")}
                />
                {/* Initial Balance */}
                <Text style={ComponentStyles.inputLabel}>Balance Inicial</Text>
                <TextInput
                  style={ComponentStyles.input}
                  placeholder="Balance inicial"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="numeric"
                  autoCapitalize="none"
                  value={values.balance}
                  onChangeText={handleChange("balance")}
                  onEndEditing={() => setOpen(true)}
                />

                {/* Account Type */}
                <Text style={ComponentStyles.inputLabel}>Tipo</Text>
                <DropDownPicker
                  schema={{
                    label: "displayName",
                    value: "publicId",
                    icon: "icon",
                  }}
                  open={open}
                  value={value}
                  setOpen={setOpen}
                  items={dItems}
                  setValue={setValue}
                  onChangeValue={(selectedValue) => {
                    setFieldValue("accountTypeId", selectedValue);
                  }}
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
              {mutation.isPending ? (
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
  },
});
