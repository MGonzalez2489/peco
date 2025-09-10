import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const ComponentStyles = StyleSheet.create({
  inputLabel: {
    marginBottom: 5,
    color: COLORS.text,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  btnPrimary: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
    marginTop: 10,
    color: "#fff",
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
});
