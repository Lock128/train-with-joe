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
  String tierLabel(String tier) {
    return 'Nivel: $tier';
  }

  @override
  String get tierFree => 'Gratis';

  @override
  String get tierBasic => 'Básico';

  @override
  String get tierPro => 'Pro';

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

  @override
  String get createTraining => 'Crear entrenamiento';

  @override
  String get startTraining => 'Iniciar entrenamiento';

  @override
  String get trainingHistory => 'Historial de entrenamiento';

  @override
  String get results => 'Resultados';

  @override
  String get analyzeImagesForVocabulary => 'Analizar imágenes para vocabulario';

  @override
  String get analyzeAnImage => 'Analizar una imagen';

  @override
  String get vocabularyList => 'Lista de vocabulario';

  @override
  String get listNotFound => 'Lista no encontrada';

  @override
  String get trainingNotFound => 'Entrenamiento no encontrado';

  @override
  String get executionNotFound => 'Ejecución no encontrada';

  @override
  String get noVocabularyListsAvailable =>
      'No hay listas de vocabulario disponibles';

  @override
  String get createVocabularyListsFirst =>
      'Crea listas de vocabulario primero para crear un entrenamiento.';

  @override
  String get noVocabularyListsYet => 'Aún no hay listas de vocabulario';

  @override
  String get analyzeImageToCreate =>
      '¡Analiza una imagen para crear tu primera lista de vocabulario!';

  @override
  String get errorLoadingVocabularyLists =>
      'Error al cargar las listas de vocabulario';

  @override
  String get noTrainingsYet => 'Aún no hay entrenamientos';

  @override
  String get createFirstTraining =>
      '¡Crea un entrenamiento para empezar a practicar!';

  @override
  String get errorLoadingTrainings => 'Error al cargar los entrenamientos';

  @override
  String get trainingName => 'Nombre del entrenamiento (opcional)';

  @override
  String get enterTrainingName => 'Introduce un nombre para tu entrenamiento';

  @override
  String get trainingMode => 'Modo de entrenamiento';

  @override
  String get textInput => 'Entrada de texto';

  @override
  String get multipleChoice => 'Opción múltiple';

  @override
  String get aiTraining => 'Entrenamiento IA';

  @override
  String get trainingDirection => 'Dirección del entrenamiento';

  @override
  String get wordToTranslation => 'Palabra → Traducción';

  @override
  String get translationToWord => 'Traducción → Palabra';

  @override
  String get yourVocabularyLists => 'Tus listas de vocabulario';

  @override
  String get publicVocabularyLists => 'Listas de vocabulario públicas';

  @override
  String get searchLists => 'Buscar listas';

  @override
  String get searchListsHint =>
      'Título, editorial, escuela, grado, ISBN, idioma…';

  @override
  String get noListsYet => 'Aún no tienes listas de vocabulario.';

  @override
  String get noListsMatchSearch => 'Ninguna lista coincide con tu búsqueda.';

  @override
  String get noTrainingsMatchFilters =>
      'Ningún entrenamiento coincide con tus filtros';

  @override
  String get clearFilters => 'Borrar filtros';

  @override
  String numberOfWords(int count) {
    return 'Número de palabras: $count';
  }

  @override
  String wordsAvailable(int count) {
    return '$count palabras disponibles en las listas seleccionadas';
  }

  @override
  String maxWordsPicked(int count) {
    return '$count palabras disponibles en las listas seleccionadas (se elegirán máx. 100 al azar)';
  }

  @override
  String get randomizedMode => 'Modo aleatorio';

  @override
  String get randomizedModeDescription =>
      'Elige palabras diferentes cada vez que inicies este entrenamiento';

  @override
  String get wordRemoved => 'Palabra eliminada';

  @override
  String get failedToRemoveWord => 'No se pudo eliminar la palabra';

  @override
  String get renameTraining => 'Renombrar entrenamiento';

  @override
  String get cancel => 'Cancelar';

  @override
  String get rename => 'Renombrar';

  @override
  String get deleteTraining => 'Eliminar entrenamiento';

  @override
  String get deleteTrainingConfirm =>
      '¿Estás seguro de que quieres eliminar este entrenamiento? No se puede deshacer.';

  @override
  String get delete => 'Eliminar';

  @override
  String get failedToDeleteTraining => 'No se pudo eliminar el entrenamiento';

  @override
  String get addWords => 'Añadir palabras';

  @override
  String addCount(int count) {
    return 'Añadir $count';
  }

  @override
  String get renameList => 'Renombrar lista';

  @override
  String get save => 'Guardar';

  @override
  String get languages => 'Idiomas';

  @override
  String get none => 'Ninguno';

  @override
  String get bookDetails => 'Detalles del libro';

  @override
  String get deleteList => 'Eliminar lista';

  @override
  String deleteListConfirm(String title) {
    return '¿Eliminar \"$title\"? No se puede deshacer.';
  }

  @override
  String get editWord => 'Editar palabra';

  @override
  String get addWord => 'Añadir palabra';

  @override
  String get add => 'Añadir';

  @override
  String get deleteWord => 'Eliminar palabra';

  @override
  String deleteWordConfirm(String word) {
    return '¿Eliminar \"$word\" de esta lista?';
  }

  @override
  String get exportAsText => 'Exportar como texto';

  @override
  String get pickFromGallery => 'Elegir de la galería';

  @override
  String get takePhoto => 'Tomar foto';

  @override
  String get addMore => 'Añadir más';

  @override
  String get autoDetect => 'Detección automática';

  @override
  String get goToVocabularyLists => 'Ir a listas de vocabulario';

  @override
  String nWords(int count) {
    return '$count palabras';
  }

  @override
  String failedToPickImages(String error) {
    return 'Error al seleccionar imágenes: $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return 'Error al tomar foto: $error';
  }

  @override
  String get cancelSubscription => 'Cancelar suscripción';

  @override
  String get cancelSubscriptionConfirm =>
      '¿Estás seguro de que quieres cancelar tu suscripción? Seguirás teniendo acceso hasta el final de tu período de facturación.';

  @override
  String get keepSubscription => 'Mantener suscripción';

  @override
  String get subscriptionCreated => '¡Suscripción creada con éxito!';

  @override
  String purchaseFailed(String error) {
    return 'Compra fallida: $error';
  }

  @override
  String get restoringPurchases => 'Restaurando compras...';

  @override
  String get purchasesRestored => '¡Compras restauradas con éxito!';

  @override
  String failedToRestorePurchases(String error) {
    return 'Error al restaurar compras: $error';
  }

  @override
  String get restorePurchases => 'Restaurar compras';

  @override
  String get subscribe => 'Suscribirse';

  @override
  String get pricingLegalPrefix => 'Al suscribirte, aceptas nuestros ';

  @override
  String get pricingTermsLink => 'Términos de uso (EULA)';

  @override
  String get pricingTermsLinkGeneric => 'Términos de servicio';

  @override
  String get pricingLegalAnd => 'y la';

  @override
  String get pricingPrivacyLink => 'Política de privacidad';

  @override
  String get pricingLegalSuffix => '.';

  @override
  String get tryAgain => 'Intentar de nuevo';

  @override
  String get backToTraining => 'Volver al entrenamiento';

  @override
  String overallAccuracy(int percent) {
    return 'Precisión general: $percent%';
  }

  @override
  String get wordFlaggedForReview => 'Palabra marcada para revisión';

  @override
  String get statusAnalyzing => 'Analizando imágenes…';

  @override
  String get statusFailed => 'El análisis falló';

  @override
  String get statusPartiallyCompleted =>
      'Algunas imágenes no pudieron ser analizadas';

  @override
  String get allModes => 'Todos los modos';

  @override
  String get allLists => 'Todas las listas';

  @override
  String get forceRemoveTraining => 'Forzar eliminación del entrenamiento';

  @override
  String forceRemoveConfirm(String name) {
    return '¿Eliminar \"$name\" de la lista? También se intentará eliminarlo del servidor.';
  }

  @override
  String removedTraining(String name) {
    return '\"$name\" eliminado';
  }

  @override
  String get admin => 'Admin';

  @override
  String get accessDenied => 'Acceso denegado';

  @override
  String get load => 'Cargar';

  @override
  String get noDataAvailable => 'No hay datos disponibles';

  @override
  String get confirmMigration => 'Confirmar migración';

  @override
  String get sourceAndTargetMustDiffer =>
      'El usuario de origen y destino deben ser diferentes.';

  @override
  String get migrate => 'Migrar';

  @override
  String get alreadyHaveAccount => '¿Ya tienes una cuenta? Iniciar sesión';

  @override
  String get haveVerificationCode => '¿Tienes un código de verificación?';

  @override
  String get backToSignIn => 'Volver a iniciar sesión';

  @override
  String get gettingStarted => 'Primeros pasos';

  @override
  String get gettingStartedSubtitle =>
      '¿No sabes por dónde empezar? Aquí tienes algunas ideas:';

  @override
  String get gettingStartedTryPublicLists => 'Prueba con listas existentes';

  @override
  String get gettingStartedTryPublicListsDesc =>
      'Explora listas de vocabulario públicas y empieza un entrenamiento de inmediato';

  @override
  String get gettingStartedScanVocabulary => 'Escanea tu propio vocabulario';

  @override
  String get gettingStartedScanVocabularyDesc =>
      'Toma una foto de tu libro de texto o apuntes para crear una lista de vocabulario';

  @override
  String get gettingStartedChangeLanguage => 'Cambia tu idioma';

  @override
  String get gettingStartedChangeLanguageDesc =>
      'Cambia el idioma de la app en los ajustes según tu preferencia';

  @override
  String get gettingStartedExploreTraining =>
      'Explora los modos de entrenamiento';

  @override
  String get gettingStartedExploreTrainingDesc =>
      'Elige entre entrada de texto, opción múltiple o entrenamiento con IA';

  @override
  String get deleteAccount => 'Eliminar cuenta';

  @override
  String get deleteAccountConfirm =>
      '¿Estás seguro de que quieres eliminar tu cuenta? Todos tus datos se eliminarán permanentemente, incluyendo listas de vocabulario, entrenamientos y suscripciones. Esta acción no se puede deshacer.';

  @override
  String get deleteAccountFinalConfirm => 'Confirmación final';

  @override
  String get deleteAccountTypeDelete =>
      'Escribe DELETE para confirmar la eliminación permanente de la cuenta.';

  @override
  String get deleteAccountFailed =>
      'No se pudo eliminar la cuenta. Inténtalo de nuevo.';

  @override
  String get parentalGateTitle => 'Solo para adultos';

  @override
  String get parentalGateDescription =>
      'Pide a un padre o tutor que resuelva esto para continuar:';

  @override
  String get parentalGateWrongAnswer =>
      'Eso no es correcto. Inténtalo de nuevo.';

  @override
  String get parentalGateCooldown => 'Demasiados intentos. Por favor espera…';

  @override
  String get parentalGateAnswerLabel => 'Respuesta';

  @override
  String get forgotPassword => '¿Olvidaste tu contraseña?';

  @override
  String get resetPassword => 'Restablecer contraseña';

  @override
  String get resetPasswordDescription =>
      'Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.';

  @override
  String get sendResetCode => 'Enviar código';

  @override
  String get enterResetCode => 'Ingresa el código';

  @override
  String get enterResetCodeDescription =>
      'Ingresa el código de 6 dígitos enviado a tu correo junto con tu nueva contraseña.';

  @override
  String get verificationCode => 'Código de verificación';

  @override
  String get enterVerificationCode => 'Ingresa el código de verificación';

  @override
  String get codeMustBeSixDigits => 'El código debe tener 6 dígitos';

  @override
  String get newPassword => 'Nueva contraseña';

  @override
  String get enterNewPassword => 'Ingresa una nueva contraseña';

  @override
  String get confirmNewPassword => 'Confirmar nueva contraseña';

  @override
  String get passwordMinLength =>
      'La contraseña debe tener al menos 8 caracteres';

  @override
  String get passwordsDoNotMatch => 'Las contraseñas no coinciden';

  @override
  String get resetPasswordButton => 'Restablecer contraseña e iniciar sesión';

  @override
  String get resendCode => '¿No recibiste el código? Reenviar';

  @override
  String get codeSentAgain => 'Se ha enviado un nuevo código a tu correo';

  @override
  String get setNewPassword => 'Establecer nueva contraseña';

  @override
  String get setNewPasswordDescription =>
      'Tu cuenta requiere una nueva contraseña. Elige una para continuar.';

  @override
  String get setNewPasswordButton => 'Establecer contraseña y continuar';

  @override
  String get subscriptionMonthly =>
      'Suscripción mensual con renovación automática';

  @override
  String get subscriptionDisclosure =>
      'Las suscripciones se renuevan automáticamente a menos que se cancelen al menos 24 horas antes del final del período actual. Se cobrará la renovación dentro de las 24 horas anteriores al final del período actual. Puedes gestionar y cancelar tus suscripciones en los ajustes de tu cuenta en la App Store después de la compra.';

  @override
  String get more => 'Más';

  @override
  String get selectImages => 'Seleccionar imágenes';

  @override
  String get scanAndTranslate => 'Escanear y traducir';

  @override
  String get from => 'De:';

  @override
  String get to => 'A:';

  @override
  String analyzeNImages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'imágenes',
      one: 'imagen',
    );
    return 'Analizar $count $_temp0';
  }

  @override
  String get analyzeMoreImages => 'Analizar más imágenes';

  @override
  String get viewAllLists => 'Ver todas las listas';

  @override
  String get allModesFilter => 'Todos los modos';

  @override
  String get remove => 'Eliminar';

  @override
  String get randomized => 'Aleatorio';

  @override
  String fromNLists(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'listas de vocabulario',
      one: 'lista de vocabulario',
    );
    return 'De $count $_temp0';
  }

  @override
  String get wordsRandomlySelected =>
      'Las palabras se seleccionan aleatoriamente cada vez que inicias este entrenamiento.';

  @override
  String wordsCount(int count) {
    return 'Palabras ($count)';
  }

  @override
  String get noWordsInTraining => 'No hay palabras en este entrenamiento.';

  @override
  String totalTime(String duration) {
    return 'Tiempo total: $duration';
  }

  @override
  String get wordBreakdown => 'Desglose de palabras';

  @override
  String get noResultsAvailable => 'No hay resultados disponibles.';

  @override
  String get toggleAdminMode => 'Alternar modo admin';

  @override
  String get forceRemove => 'Forzar eliminación';

  @override
  String get backToTrainings => 'Volver a entrenamientos';

  @override
  String get addCustomWord => 'Añadir palabra personalizada';

  @override
  String get analyzeImage => 'Analizar imagen';

  @override
  String get changeDateRange => 'Cambiar rango de fechas';

  @override
  String get backToTrainingDetail => 'Volver al entrenamiento';

  @override
  String tierUpdatedTo(String tier) {
    return 'Nivel actualizado a $tier';
  }

  @override
  String get failedToUpdateTier => 'No se pudo actualizar el nivel';

  @override
  String get syncFromCognito => 'Sincronizar desde Cognito';

  @override
  String get noUsersFound => 'No se encontraron usuarios.';

  @override
  String get tier => 'Nivel';

  @override
  String get overview => 'Resumen';

  @override
  String get dailyBreakdown => 'Desglose diario';

  @override
  String get noTrainingActivity =>
      'Sin actividad de entrenamiento en este período.';

  @override
  String get noExecutionDetails => 'No hay detalles de ejecución disponibles.';

  @override
  String get searchUserAbove =>
      'Busca un usuario arriba para ver sus estadísticas.';

  @override
  String userLabel(String label) {
    return 'Usuario: $label';
  }

  @override
  String get applyTierOverride => 'Aplicar nivel';

  @override
  String get editWordTooltip => 'Editar palabra';

  @override
  String get deleteWordTooltip => 'Eliminar palabra';

  @override
  String get addWordTooltip => 'Añadir palabra';
}
