import { API_URL_ANDROID, API_URL_IOS, STAGE } from "@env";
import axios from "axios";
import { Platform } from "react-native";

const testUrl = Platform.OS === "ios" ? API_URL_IOS : API_URL_ANDROID;

export const url = STAGE === "production" ? "prodUrl" : testUrl;

const api = axios.create({
  baseURL: url,
  headers: {
    "Content-Type": "application/json",
  },
});

//TODO: interceptors
//

export { api };
