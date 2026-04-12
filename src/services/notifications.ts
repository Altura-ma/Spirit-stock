import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function notifyLowStock(bottleName: string, quantity: number, threshold: number) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Stock faible',
        body: `${bottleName} : ${quantity} restant${quantity > 1 ? 's' : ''} (seuil : ${threshold})`,
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

export async function notifyOutOfStock(bottleName: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rupture de stock',
        body: `${bottleName} est épuisé — pensez à commander !`,
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}
