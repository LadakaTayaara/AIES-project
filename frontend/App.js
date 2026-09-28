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
                            borderTopColor: theme.colors.borderSubtle,
                            height: 54,
                            paddingBottom: 6,
                            paddingTop: 6,
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        tabBarActiveTintColor: theme.colors.text,
                        tabBarInactiveTintColor: theme.colors.textTertiary,
                    }}
                >
                    <Tab.Screen
                        name="Scanner"
                        component={CameraScannerScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => (
                                <Crosshair color={color} size={18} strokeWidth={2} />
                            ),
                            tabBarLabel: 'SCANNER',
                            tabBarLabelStyle: {
                                fontSize: 10,
                                fontWeight: '600',
                                letterSpacing: 0.6,
                            },
                        }}
                    />
                    <Tab.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => (
                                <Radio color={color} size={18} strokeWidth={2} />
                            ),
                            tabBarLabel: 'TELEMETRY',
                            tabBarLabelStyle: {
                                fontSize: 10,
                                fontWeight: '600',
                                letterSpacing: 0.6,
                            },
                        }}
                    />
                </Tab.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
