import { Button, DropDown } from "@presentation/components";
import { MainLayout } from "@presentation/layout";
import { useAccountStore } from "@store/useAccountStore";
import { useCatalogsStore } from "@store/useCatalogsStore";
import { ComponentStyles } from "@styles/components";
import { Formik } from "formik";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const initialValues = {
  description: "",
  amount: 0,
  categoryId: "",
  entryTypeId: "",
  accountId: "",
};

export const EntryCreateScreen = () => {
  const { entryTypes, entryCategories } = useCatalogsStore();
  const { accounts } = useAccountStore();
  return (
    <MainLayout title="create entry">
      <Formik
        initialValues={initialValues}
        onSubmit={(values) => console.log("submit", values)}
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
              <Text>Entry Type</Text>
              <DropDown
                labelId="displayName"
                valueId="publicId"
                items={entryTypes}
                formControlName="entryTypeId"
                setFieldValue={setFieldValue}
              />
              <Text>Accounts</Text>
              <DropDown
                labelId="name"
                valueId="publicId"
                items={accounts}
                formControlName="accountId"
                setFieldValue={setFieldValue}
              />
              <Text>Category</Text>
              <DropDown
                labelId="name"
                valueId="publicId"
                formControlName="categoryId"
                setFieldValue={setFieldValue}
                items={entryCategories}
              />
              <Text>Monto</Text>
              <TextInput
                style={ComponentStyles.input}
                onChangeText={handleChange("amount")}
              />
              <Text>Descripcion</Text>
              <TextInput
                style={ComponentStyles.input}
                onChangeText={handleChange("description")}
              />
            </View>
            <Button label="Crear" onPress={() => handleSubmit()} />
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
