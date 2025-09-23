import { RootNavigatorParams } from '@presentation/navigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropsWithChildren, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const rootNav = useNavigation<StackNavigationProp<RootNavigatorParams>>();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      rootNav.navigate('LoginScreen');
    }
  }, [isAuthenticated, rootNav]);

  //TODO: USE expiresAt property to handle the logout process better

  return <>{children}</>;
};
