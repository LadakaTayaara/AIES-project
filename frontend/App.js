import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Crosshair, Radio } from 'lucide-react-native';

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
        border: theme.colors.border,
        primary: theme.colors.primary,
    },
};

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" backgroundColor={theme.colors.void} />
            <NavigationContainer theme={NavigatorTheme}>
                <Tab.Navigator
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            backgroundColor: theme.colors.surface,
                            borderTopWidth: 1,
                            borderTopColor: 'rgba(245, 158, 11, 0.20)',
                            height: 64,
                            paddingBottom: 10,
                            paddingTop: 8,
                            elevation: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                        },
                        tabBarActiveTintColor: theme.colors.primary,
                        tabBarInactiveTintColor: theme.colors.textMuted,
                    }}
                >
                    <Tab.Screen
                        name="Scanner"
                        component={CameraScannerScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => (
                                <Crosshair color={color} size={size + 2} />
                            ),
                            tabBarLabel: 'HUD SCANNER',
                            tabBarLabelStyle: {
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                            },
                        }}
                    />
                    <Tab.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => (
                                <Radio color={color} size={size + 2} />
                            ),
                            tabBarLabel: 'TELEMETRY MAP',
                            tabBarLabelStyle: {
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                            },
                        }}
                    />
                </Tab.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
