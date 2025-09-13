import { formatCurrency } from "@infrastructure/utils";
import { DropDown } from "@presentation/components";
import { MainLayout } from "@presentation/layout";
import { useAccountStore } from "@store/useAccountStore";
import { useCatalogsStore } from "@store/useCatalogsStore";
import { COLORS } from "@styles/colors";
import { ComponentStyles } from "@styles/components";
import { Formik } from "formik";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

  const [selEntryType, setSelEntryType] = useState(entryTypes[0]);

  useEffect(() => {
    setSelEntryType(entryTypes[0]);
  }, entryTypes);

  return (
    <MainLayout
      title=""
      rightAction={() => alert("right")}
      RightActionIcon={Check}
      showNavbar={false}
    >
      <Formik
        initialValues={{ ...initialValues, entryTypeId: selEntryType.publicId }}
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
              <View style={styles.btnContainer}>
                {entryTypes.map((g) => (
                  <TouchableOpacity
                    key={g.publicId}
                    style={[
                      values.entryTypeId === g.publicId
                        ? {
                            ...styles.btn,
                            ...styles.btnActive,
                            backgroundColor: g.color,
                          }
                        : styles.btn,
                    ]}
                    onPress={() => {
                      setSelEntryType(g);
                      setFieldValue("entryTypeId", g.publicId);
                    }}
                  >
                    <Text style={styles.btnText}>{g.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* <Text>Entry Type</Text> */}
              {/* <DropDown */}
              {/*   labelId="displayName" */}
              {/*   valueId="publicId" */}
              {/*   items={entryTypes} */}
              {/*   formControlName="entryTypeId" */}
              {/*   setFieldValue={setFieldValue} */}
              {/* /> */}

              <View
                style={{
                  backgroundColor: selEntryType.color,
                  padding: 15,
                  minHeight: 150,
                  justifyContent: "center",
                }}
              >
                {/* <Text>Accounts</Text> */}
                {/* <DropDown */}
                {/*   labelId="name" */}
                {/*   valueId="publicId" */}
                {/*   items={accounts} */}
                {/*   formControlName="accountId" */}
                {/*   setFieldValue={setFieldValue} */}
                {/* /> */}
                {/* <Text>Category</Text> */}
                {/* <DropDown */}
                {/*   labelId="name" */}
                {/*   valueId="publicId" */}
                {/*   formControlName="categoryId" */}
                {/*   setFieldValue={setFieldValue} */}
                {/*   items={entryCategories} */}
                {/* /> */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingRight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 50,
                      color: COLORS.primary,
                      paddingHorizontal: 15,
                    }}
                  >
                    {selEntryType.name === "income" ? "+" : "-"}
                  </Text>
                  <Text
                    style={{
                      height: 60,
                      fontSize: 50,
                      color: COLORS.primary,
                    }}
                  >
                    {formatCurrency(values.amount)}
                  </Text>

                  {/* otras opciones */}
                  {/* <View */}
                  {/*   style={{ */}
                  {/*     flexDirection: "row", */}
                  {/*     justifyContent: "space-evenly", */}
                  {/*   }} */}
                  {/* > */}
                  {/*   <View> */}
                  {/*     <Text style={{ color: "white" }}>Cuenta</Text> */}
                  {/*     <Text style={{ color: "white" }}>Categoria</Text> */}
                  {/*   </View> */}
                  {/* </View> */}
                </View>
                {/* <Text>Descripcion</Text> */}
                {/* <TextInput */}
                {/*   style={ComponentStyles.input} */}
                {/*   onChangeText={handleChange("description")} */}
                {/* /> */}
              </View>
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
    justifyContent: "space-between",
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f3f3f3",
  },
  btn: {
    paddingHorizontal: 60,
    paddingVertical: 13,
    flex: 1,
  },
  btnSeparator: {
    paddingHorizontal: 0,
    backgroundColor: "gray",
  },
  btnText: {
    fontWeight: "bold",
    color: COLORS.primary,
  },
  btnActive: {
    elevation: 8, // Sombra para Android
    shadowColor: "#000", // Sombra para iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
