import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

// Solicitar permisos de notificaciones
export async function solicitarPermisosNotificaciones() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Notificaciones de torneos',
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    let { status, canAskAgain } =
        await Notifications.getPermissionsAsync();

    if (status !== 'granted' && canAskAgain) {
        const resultado =
            await Notifications.requestPermissionsAsync();

        status = resultado.status;
        canAskAgain = resultado.canAskAgain;
    }

    if (status !== 'granted') {
        Alert.alert(
            'Notificaciones desactivadas',
            'Activa las notificaciones para recibir avisos de torneos.',
            !canAskAgain
                ? [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Abrir ajustes',
                        onPress: () => Linking.openSettings(),
                    },
                ]
                : [{ text: 'Aceptar' }]
        );

        return false;
    }

    return true;
}

// Notificación al crear un torneo
export async function enviarNotificacionLocal(
    nombreTorneo: string
) {
    const permitido =
        await solicitarPermisosNotificaciones();

    if (!permitido) {
        return;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🏆 Torneo creado exitosamente',
            body: `El torneo "${nombreTorneo}" fue creado correctamente.`,
            sound: 'default',
            data: {
                url: '/',
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 5,
        },
    });
}