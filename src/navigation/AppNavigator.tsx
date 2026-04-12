import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { StockProvider } from '../context/StockContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AddBottleScreen from '../screens/AddBottleScreen';
import EditBottleScreen from '../screens/EditBottleScreen';
import RestockScreen from '../screens/RestockScreen';
import SuppliersScreen from '../screens/SuppliersScreen';

import { COLORS } from '../theme';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const InventoryStack = createNativeStackNavigator();

function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <InventoryStack.Screen name="InventoryList" component={InventoryScreen} />
      <InventoryStack.Screen name="AddBottle" component={AddBottleScreen} />
      <InventoryStack.Screen name="EditBottle" component={EditBottleScreen} />
    </InventoryStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Inventory: focused ? 'wine' : 'wine-outline',
            Restock: focused ? 'alert-circle' : 'alert-circle-outline',
            Suppliers: focused ? 'call' : 'call-outline',
          };
          return (
            <Ionicons
              name={(icons[route.name] || 'ellipse') as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="Inventory" component={InventoryNavigator} options={{ title: 'Inventaire' }} />
      <Tab.Screen name="Restock" component={RestockScreen} options={{ title: 'À commander' }} />
      <Tab.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Fournisseurs' }} />
    </Tab.Navigator>
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
          <MainTabs />
        </StockProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
