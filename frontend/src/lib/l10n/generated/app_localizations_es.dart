// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Entrena con Joe';

  @override
  String get home => 'Inicio';

  @override
  String get scan => 'Escanear';

  @override
  String get lists => 'Listas';

  @override
  String get training => 'Entrenamiento';

  @override
  String get statistics => 'Estadísticas';

  @override
  String get subscription => 'Suscripción';

  @override
  String get info => 'Info';

  @override
  String get settings => 'Ajustes';

  @override
  String get signOut => 'Cerrar sesión';

  @override
  String get welcome => '¡Bienvenido!';

  @override
  String get quickActions => 'Acciones rápidas';

  @override
  String get scanImageForVocabulary => 'Escanear imagen para vocabulario';

  @override
  String get myVocabularyLists => 'Mis listas de vocabulario';

  @override
  String get myTrainings => 'Mis entrenamientos';

  @override
  String get manageSubscription => 'Gestionar suscripción';

  @override
  String get noActiveSubscription => 'Sin suscripción activa';

  @override
  String subscriptionStatus(String status) {
    return 'Estado: $status';
  }

  @override
  String get errorLoadingUserData => 'Error al cargar datos del usuario';

  @override
  String get retry => 'Reintentar';

  @override
  String get language => 'Idioma';

  @override
  String get trainingSounds => 'Sonidos de entrenamiento';

  @override
  String get enableTrainingSounds => 'Activar sonidos de entrenamiento';

  @override
  String get appInfo => 'Info de la app';

  @override
  String get frontend => 'Frontend';

  @override
  String get backend => 'Backend';

  @override
  String get commitId => 'ID de commit';

  @override
  String get buildNumber => 'Número de compilación';

  @override
  String get failedToLoadBackendInfo => 'No se pudo cargar la info del backend';

  @override
  String get configurationError => 'Error de configuración';

  @override
  String get abortTraining => '¿Cancelar entrenamiento?';

  @override
  String get abortTrainingMessage => 'Tu progreso en esta sesión se perderá.';

  @override
  String get continueText => 'Continuar';

  @override
  String get abort => 'Cancelar';

  @override
  String wordProgress(int current, int total) {
    return 'Palabra $current de $total';
  }

  @override
  String get yourAnswer => 'Tu respuesta';

  @override
  String get typeTheTranslation => 'Escribe la traducción';

  @override
  String get submit => 'Enviar';

  @override
  String get muteSounds => 'Silenciar sonidos';

  @override
  String get unmuteSounds => 'Activar sonidos';

  @override
  String get english => 'Inglés';

  @override
  String get german => 'Alemán';

  @override
  String get spanish => 'Español';

  @override
  String get japanese => 'Japonés';

  @override
  String get french => 'Francés';

  @override
  String get portuguese => 'Portugués';
}
