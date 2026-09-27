import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Aperture, Map } from 'lucide-react-native';

// Screens
import CameraScannerScreen from './screens/CameraScreen';
import DashboardScreen from './screens/DashboardScreen';

// Theme
import { theme } from './themes';

const Tab = createBottomTabNavigator();

const NavigatorTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: 'rgba(0, 240, 255, 0.2)',
    primary: theme.colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <NavigationContainer theme={NavigatorTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: 'rgba(0, 240, 255, 0.2)',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textDim,
          }}
        >
          <Tab.Screen
            name="Scanner"
            component={CameraScannerScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Aperture color={color} size={size} />
              ),
              tabBarLabelStyle: {
                fontFamily: 'monospace',
                letterSpacing: 1,
              }
            }}
          />
          <Tab.Screen
            name="Tactical Map"
            component={DashboardScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Map color={color} size={size} />
              ),
              tabBarLabelStyle: {
                fontFamily: 'monospace',
                letterSpacing: 1,
              }
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
