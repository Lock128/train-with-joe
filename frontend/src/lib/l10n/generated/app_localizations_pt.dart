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
  String tierLabel(String tier) {
    return 'Plano: $tier';
  }

  @override
  String get tierFree => 'Grátis';

  @override
  String get tierBasic => 'Básico';

  @override
  String get tierPro => 'Pro';

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

  @override
  String get createTraining => 'Criar treino';

  @override
  String get startTraining => 'Iniciar treino';

  @override
  String get trainingHistory => 'Histórico de treino';

  @override
  String get results => 'Resultados';

  @override
  String get analyzeImagesForVocabulary => 'Analisar imagens para vocabulário';

  @override
  String get analyzeAnImage => 'Analisar uma imagem';

  @override
  String get vocabularyList => 'Lista de vocabulário';

  @override
  String get listNotFound => 'Lista não encontrada';

  @override
  String get trainingNotFound => 'Treino não encontrado';

  @override
  String get executionNotFound => 'Execução não encontrada';

  @override
  String get noVocabularyListsAvailable =>
      'Nenhuma lista de vocabulário disponível';

  @override
  String get createVocabularyListsFirst =>
      'Crie listas de vocabulário primeiro para criar um treino.';

  @override
  String get noVocabularyListsYet => 'Ainda não há listas de vocabulário';

  @override
  String get analyzeImageToCreate =>
      'Analise uma imagem para criar sua primeira lista de vocabulário!';

  @override
  String get errorLoadingVocabularyLists =>
      'Erro ao carregar as listas de vocabulário';

  @override
  String get noTrainingsYet => 'Ainda não há treinos';

  @override
  String get createFirstTraining => 'Crie um treino para começar a praticar!';

  @override
  String get errorLoadingTrainings => 'Erro ao carregar os treinos';

  @override
  String get trainingName => 'Nome do treino (opcional)';

  @override
  String get enterTrainingName => 'Digite um nome para seu treino';

  @override
  String get trainingMode => 'Modo de treino';

  @override
  String get textInput => 'Entrada de texto';

  @override
  String get multipleChoice => 'Múltipla escolha';

  @override
  String get aiTraining => 'Treino com IA';

  @override
  String get trainingDirection => 'Direção do treino';

  @override
  String get wordToTranslation => 'Palavra → Tradução';

  @override
  String get translationToWord => 'Tradução → Palavra';

  @override
  String get yourVocabularyLists => 'Suas listas de vocabulário';

  @override
  String get publicVocabularyLists => 'Listas de vocabulário públicas';

  @override
  String get searchLists => 'Pesquisar listas';

  @override
  String get searchListsHint => 'Título, editora, escola, série, ISBN, idioma…';

  @override
  String get noListsYet => 'Você ainda não tem listas de vocabulário.';

  @override
  String get noListsMatchSearch => 'Nenhuma lista corresponde à sua pesquisa.';

  @override
  String get noTrainingsMatchFilters =>
      'Nenhum treino corresponde aos seus filtros';

  @override
  String get clearFilters => 'Limpar filtros';

  @override
  String numberOfWords(int count) {
    return 'Número de palavras: $count';
  }

  @override
  String wordsAvailable(int count) {
    return '$count palavras disponíveis nas listas selecionadas';
  }

  @override
  String maxWordsPicked(int count) {
    return '$count palavras disponíveis nas listas selecionadas (máx. 100 serão escolhidas aleatoriamente)';
  }

  @override
  String get randomizedMode => 'Modo aleatório';

  @override
  String get randomizedModeDescription =>
      'Escolher palavras diferentes cada vez que iniciar este treino';

  @override
  String get wordRemoved => 'Palavra removida';

  @override
  String get failedToRemoveWord => 'Falha ao remover a palavra';

  @override
  String get renameTraining => 'Renomear treino';

  @override
  String get cancel => 'Cancelar';

  @override
  String get rename => 'Renomear';

  @override
  String get deleteTraining => 'Excluir treino';

  @override
  String get deleteTrainingConfirm =>
      'Tem certeza de que deseja excluir este treino? Isso não pode ser desfeito.';

  @override
  String get delete => 'Excluir';

  @override
  String get failedToDeleteTraining => 'Falha ao excluir o treino';

  @override
  String get addWords => 'Adicionar palavras';

  @override
  String addCount(int count) {
    return 'Adicionar $count';
  }

  @override
  String get renameList => 'Renomear lista';

  @override
  String get save => 'Salvar';

  @override
  String get languages => 'Idiomas';

  @override
  String get none => 'Nenhum';

  @override
  String get bookDetails => 'Detalhes do livro';

  @override
  String get deleteList => 'Excluir lista';

  @override
  String deleteListConfirm(String title) {
    return 'Excluir \"$title\"? Isso não pode ser desfeito.';
  }

  @override
  String get editWord => 'Editar palavra';

  @override
  String get addWord => 'Adicionar palavra';

  @override
  String get add => 'Adicionar';

  @override
  String get deleteWord => 'Excluir palavra';

  @override
  String deleteWordConfirm(String word) {
    return 'Remover \"$word\" desta lista?';
  }

  @override
  String get exportAsText => 'Exportar como texto';

  @override
  String get pickFromGallery => 'Escolher da galeria';

  @override
  String get takePhoto => 'Tirar foto';

  @override
  String get addMore => 'Adicionar mais';

  @override
  String get autoDetect => 'Detecção automática';

  @override
  String get goToVocabularyLists => 'Ir para listas de vocabulário';

  @override
  String nWords(int count) {
    return '$count palavras';
  }

  @override
  String failedToPickImages(String error) {
    return 'Falha ao selecionar imagens: $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return 'Falha ao tirar foto: $error';
  }

  @override
  String get cancelSubscription => 'Cancelar assinatura';

  @override
  String get cancelSubscriptionConfirm =>
      'Tem certeza de que deseja cancelar sua assinatura? Você ainda terá acesso até o final do seu período de faturamento.';

  @override
  String get keepSubscription => 'Manter assinatura';

  @override
  String get subscriptionCreated => 'Assinatura criada com sucesso!';

  @override
  String purchaseFailed(String error) {
    return 'Compra falhou: $error';
  }

  @override
  String get restoringPurchases => 'Restaurando compras...';

  @override
  String get purchasesRestored => 'Compras restauradas com sucesso!';

  @override
  String failedToRestorePurchases(String error) {
    return 'Falha ao restaurar compras: $error';
  }

  @override
  String get restorePurchases => 'Restaurar compras';

  @override
  String get subscribe => 'Assinar';

  @override
  String get pricingLegalPrefix => 'By subscribing, you agree to our ';

  @override
  String get pricingTermsLink => 'Terms of Use (EULA)';

  @override
  String get pricingTermsLinkGeneric => 'Terms of Service';

  @override
  String get pricingLegalAnd => 'and';

  @override
  String get pricingPrivacyLink => 'Privacy Policy';

  @override
  String get pricingLegalSuffix => '.';

  @override
  String get tryAgain => 'Tentar novamente';

  @override
  String get backToTraining => 'Voltar ao treino';

  @override
  String overallAccuracy(int percent) {
    return 'Precisão geral: $percent%';
  }

  @override
  String get wordFlaggedForReview => 'Palavra marcada para revisão';

  @override
  String get statusAnalyzing => 'Analisando imagens…';

  @override
  String get statusFailed => 'A análise falhou';

  @override
  String get statusPartiallyCompleted =>
      'Algumas imagens não puderam ser analisadas';

  @override
  String get allModes => 'Todos os modos';

  @override
  String get allLists => 'Todas as listas';

  @override
  String get forceRemoveTraining => 'Forçar remoção do treino';

  @override
  String forceRemoveConfirm(String name) {
    return 'Remover \"$name\" da lista? Isso também tentará excluí-lo do servidor.';
  }

  @override
  String removedTraining(String name) {
    return '\"$name\" removido';
  }

  @override
  String get admin => 'Admin';

  @override
  String get accessDenied => 'Acesso negado';

  @override
  String get load => 'Carregar';

  @override
  String get noDataAvailable => 'Nenhum dado disponível';

  @override
  String get confirmMigration => 'Confirmar migração';

  @override
  String get sourceAndTargetMustDiffer =>
      'O usuário de origem e destino devem ser diferentes.';

  @override
  String get migrate => 'Migrar';

  @override
  String get alreadyHaveAccount => 'Já tem uma conta? Entrar';

  @override
  String get haveVerificationCode => 'Tem um código de verificação?';

  @override
  String get backToSignIn => 'Voltar ao login';

  @override
  String get gettingStarted => 'Primeiros passos';

  @override
  String get gettingStartedSubtitle =>
      'Não sabe por onde começar? Aqui estão algumas ideias:';

  @override
  String get gettingStartedTryPublicLists =>
      'Experimente com listas existentes';

  @override
  String get gettingStartedTryPublicListsDesc =>
      'Explore listas de vocabulário públicas e comece um treino imediatamente';

  @override
  String get gettingStartedScanVocabulary => 'Escaneie seu próprio vocabulário';

  @override
  String get gettingStartedScanVocabularyDesc =>
      'Tire uma foto do seu livro ou anotações para criar uma lista de vocabulário';

  @override
  String get gettingStartedChangeLanguage => 'Mude seu idioma';

  @override
  String get gettingStartedChangeLanguageDesc =>
      'Altere o idioma do app nas configurações de acordo com sua preferência';

  @override
  String get gettingStartedExploreTraining => 'Explore os modos de treino';

  @override
  String get gettingStartedExploreTrainingDesc =>
      'Escolha entre entrada de texto, múltipla escolha ou treino com IA';

  @override
  String get deleteAccount => 'Excluir conta';

  @override
  String get deleteAccountConfirm =>
      'Tem certeza de que deseja excluir sua conta? Todos os seus dados serão removidos permanentemente, incluindo listas de vocabulário, treinos e assinaturas. Esta ação não pode ser desfeita.';

  @override
  String get deleteAccountFinalConfirm => 'Confirmação final';

  @override
  String get deleteAccountTypeDelete =>
      'Digite DELETE para confirmar a exclusão permanente da conta.';

  @override
  String get deleteAccountFailed =>
      'Falha ao excluir a conta. Tente novamente.';

  @override
  String get parentalGateTitle => 'Apenas para adultos';

  @override
  String get parentalGateDescription =>
      'Peça a um pai ou responsável para resolver isto para continuar:';

  @override
  String get parentalGateWrongAnswer => 'Resposta incorreta. Tente novamente.';

  @override
  String get parentalGateCooldown => 'Muitas tentativas. Aguarde um momento…';

  @override
  String get parentalGateAnswerLabel => 'Resposta';

  @override
  String get forgotPassword => 'Esqueceu a senha?';

  @override
  String get resetPassword => 'Redefinir senha';

  @override
  String get resetPasswordDescription =>
      'Digite seu e-mail e enviaremos um código para redefinir sua senha.';

  @override
  String get sendResetCode => 'Enviar código';

  @override
  String get enterResetCode => 'Digite o código';

  @override
  String get enterResetCodeDescription =>
      'Digite o código de 6 dígitos enviado para seu e-mail junto com sua nova senha.';

  @override
  String get verificationCode => 'Código de verificação';

  @override
  String get enterVerificationCode => 'Digite o código de verificação';

  @override
  String get codeMustBeSixDigits => 'O código deve ter 6 dígitos';

  @override
  String get newPassword => 'Nova senha';

  @override
  String get enterNewPassword => 'Digite uma nova senha';

  @override
  String get confirmNewPassword => 'Confirmar nova senha';

  @override
  String get passwordMinLength => 'A senha deve ter pelo menos 8 caracteres';

  @override
  String get passwordsDoNotMatch => 'As senhas não coincidem';

  @override
  String get resetPasswordButton => 'Redefinir senha e entrar';

  @override
  String get resendCode => 'Não recebeu o código? Reenviar';

  @override
  String get codeSentAgain => 'Um novo código foi enviado para seu e-mail';

  @override
  String get setNewPassword => 'Definir nova senha';

  @override
  String get setNewPasswordDescription =>
      'Sua conta requer uma nova senha. Escolha uma para continuar.';

  @override
  String get setNewPasswordButton => 'Definir senha e continuar';

  @override
  String get subscriptionMonthly =>
      'Assinatura mensal com renovação automática';

  @override
  String get subscriptionDisclosure =>
      'As assinaturas são renovadas automaticamente, a menos que sejam canceladas pelo menos 24 horas antes do final do período atual. A renovação será cobrada dentro de 24 horas antes do final do período atual. Você pode gerenciar e cancelar suas assinaturas nas configurações da sua conta na App Store após a compra.';
}
