import { API_URL_ANDROID, API_URL_IOS, STAGE } from '@env';
import axios from 'axios';
import { Platform } from 'react-native';
import { StorageAdapter } from '../adapters/storage.adapter';

const testUrl = Platform.OS === 'ios' ? API_URL_IOS : API_URL_ANDROID;

export const url = STAGE === 'production' ? 'prodUrl' : testUrl;
const api = axios.create({
  baseURL: url,
  headers: {
    'Content-Type': 'application/json',
  },
});

//TODO: interceptors
//
api.interceptors.request.use(async (config) => {
  const token = await StorageAdapter.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await StorageAdapter.clearStorage();
      console.log('Sesion expirada o no autorizada');
    }
  }
);

export { api };
