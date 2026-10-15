import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Registro de notificaciones silenciosas (Blind Silent Push)
        application.registerForRemoteNotifications()
        return true
    }

    // Despertar mudo de 30 segundos (content-available: 1) sin metadatos
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        NSLog("[BlindPush] Recibido pulso de despertar mudo. Conectando a Gateway Nym...")
        // En producción: activa el daemon UniFFI en background para vaciar el buzón Sphinx
        DispatchQueue.global().asyncAfter(deadline: .now() + 1.0) {
            completionHandler(.newData)
        }
    }
}
