import { formatCurrency } from "@infrastructure/utils";
import { MainLayout } from "@presentation/layout";
import { useAccountStore } from "@store/useAccountStore";
import { useCatalogsStore } from "@store/useCatalogsStore";
import { COLORS } from "@styles/colors";
import { Formik } from "formik";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const { top } = useSafeAreaInsets();

  const [selEntryType, setSelEntryType] = useState(entryTypes[0]);

  const renderEntryTypeOptions = (setFieldValue: any) => {
    return (
      <View style={{ ...styles.btnContainer, paddingTop: top }}>
        {entryTypes.map((g) => (
          <TouchableOpacity
            key={g.publicId}
            style={[
              selEntryType.publicId === g.publicId
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
    );
  };

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
            {/* main view */}
            <View>
              {renderEntryTypeOptions(setFieldValue)}

              {/* amount */}
              <View
                style={{
                  backgroundColor: selEntryType.color,
                  padding: 15,
                  minHeight: 150,
                  justifyContent: "center",
                }}
              >
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
                </View>
              </View>

              {/* otras opciones */}
              <View
                style={{
                  backgroundColor: selEntryType.color,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  paddingHorizontal: 35,
                }}
              >
                <TouchableOpacity>
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "700",
                      paddingBottom: 3,
                    }}
                  >
                    Cuenta
                  </Text>
                  <Text style={{ color: "white" }}>selectedAccount</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "700",
                      paddingBottom: 3,
                    }}
                  >
                    Categoria
                  </Text>
                  <Text style={{ color: "white" }}>selectedCategory</Text>
                </TouchableOpacity>
              </View>

              {/* aqui van los numeros */}
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
