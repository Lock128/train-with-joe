// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Treine com Joe';

  @override
  String get home => 'Início';

  @override
  String get scan => 'Escanear';

  @override
  String get lists => 'Listas';

  @override
  String get training => 'Treino';

  @override
  String get statistics => 'Estatísticas';

  @override
  String get subscription => 'Assinatura';

  @override
  String get info => 'Info';

  @override
  String get settings => 'Configurações';

  @override
  String get signOut => 'Sair';

  @override
  String get welcome => 'Bem-vindo!';

  @override
  String get quickActions => 'Ações rápidas';

  @override
  String get scanImageForVocabulary => 'Escanear imagem para vocabulário';

  @override
  String get myVocabularyLists => 'Minhas listas de vocabulário';

  @override
  String get myTrainings => 'Meus treinos';

  @override
  String get manageSubscription => 'Gerenciar assinatura';

  @override
  String get noActiveSubscription => 'Sem assinatura ativa';

  @override
  String subscriptionStatus(String status) {
    return 'Status: $status';
  }

  @override
  String get errorLoadingUserData => 'Erro ao carregar dados do usuário';

  @override
  String get retry => 'Tentar novamente';

  @override
  String get language => 'Idioma';

  @override
  String get trainingSounds => 'Sons de treino';

  @override
  String get enableTrainingSounds => 'Ativar sons de treino';

  @override
  String get appInfo => 'Info do app';

  @override
  String get frontend => 'Frontend';

  @override
  String get backend => 'Backend';

  @override
  String get commitId => 'ID do commit';

  @override
  String get buildNumber => 'Número do build';

  @override
  String get failedToLoadBackendInfo => 'Falha ao carregar info do backend';

  @override
  String get configurationError => 'Erro de configuração';

  @override
  String get abortTraining => 'Cancelar treino?';

  @override
  String get abortTrainingMessage => 'Seu progresso nesta sessão será perdido.';

  @override
  String get continueText => 'Continuar';

  @override
  String get abort => 'Cancelar';

  @override
  String wordProgress(int current, int total) {
    return 'Palavra $current de $total';
  }

  @override
  String get yourAnswer => 'Sua resposta';

  @override
  String get typeTheTranslation => 'Digite a tradução';

  @override
  String get submit => 'Enviar';

  @override
  String get muteSounds => 'Silenciar sons';

  @override
  String get unmuteSounds => 'Ativar sons';

  @override
  String get english => 'Inglês';

  @override
  String get german => 'Alemão';

  @override
  String get spanish => 'Espanhol';

  @override
  String get japanese => 'Japonês';

  @override
  String get french => 'Francês';

  @override
  String get portuguese => 'Português';
}
