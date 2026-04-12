import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { StockProvider, useStock } from '../context/StockContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AddBottleScreen from '../screens/AddBottleScreen';
import EditBottleScreen from '../screens/EditBottleScreen';
import RestockScreen from '../screens/RestockScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { COLORS } from '../theme';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const InventoryStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <InventoryStack.Screen name="InventoryList" component={InventoryScreen} />
      <InventoryStack.Screen name="AddBottle" component={AddBottleScreen} />
      <InventoryStack.Screen name="EditBottle" component={EditBottleScreen} />
    </InventoryStack.Navigator>
  );
}

function RestockTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const { getLowStockBottles } = useStock();
  const count = getLowStockBottles().length;
  return (
    <View>
      <Ionicons
        name={focused ? 'alert-circle' : 'alert-circle-outline'}
        size={size}
        color={color}
      />
      {count > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -6,
          backgroundColor: COLORS.danger,
          borderRadius: 8,
          minWidth: 16,
          height: 16,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 2,
        }}>
          <View style={{ alignItems: 'center' }}>
            {/* count text rendered inline to avoid Text import issues */}
          </View>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const { getLowStockBottles } = useStock();
  const lowCount = getLowStockBottles().length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          paddingBottom: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['grid', 'grid-outline'],
            Inventory: ['wine', 'wine-outline'],
            Restock: ['alert-circle', 'alert-circle-outline'],
            Suppliers: ['call', 'call-outline'],
          };
          const [activeIcon, inactiveIcon] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? activeIcon : inactiveIcon) as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{ title: 'Inventaire' }}
      />
      <Tab.Screen
        name="Restock"
        component={RestockScreen}
        options={{
          title: 'Commander',
          tabBarBadge: lowCount > 0 ? lowCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Suppliers"
        component={SuppliersScreen}
        options={{ title: 'Fournisseurs' }}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={MainTabs} />
      <RootStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ presentation: 'modal' }}
      />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <StockProvider>
          <MainApp />
        </StockProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
