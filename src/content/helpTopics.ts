import { CalendarDays, Utensils, Dumbbell, Heart, Scale, Ruler, Activity, FlaskConical, Watch, Bluetooth, Package, UserRound, Users, Shield, BookOpen, TrendingUp, Library } from 'lucide-react';

export interface HelpTopic {
  id: string;
  title: string;
  intro: string;
  route: string;
  location: string;
  icon: typeof Heart;
  steps: { label: string; desc: string }[];
  tips?: string[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'today', title: 'Hoje: seus registros do dia', icon: CalendarDays, route: '/', location: 'Hoje',
    intro: 'Alimentação, líquidos, atividade e evolução reunidos na data que você escolheu.',
    steps: [
      { label: 'Escolher a data', desc: 'Use o calendário no topo. Os lançamentos manuais ficam no dia selecionado, inclusive quando você registra um dia anterior.' },
      { label: 'Registrar alimentos', desc: 'Abra o botão + e escolha foto, texto, código de barras ou um produto ou kit cadastrado. Confira a quantidade e os nutrientes antes de salvar.' },
      { label: 'Corrigir uma refeição', desc: 'Abra as opções do alimento registrado para editar ou excluir. Os totais do dia acompanham suas alterações.' },
      { label: 'Líquidos e atividade', desc: 'Registre bebidas e exercícios pelos atalhos correspondentes. As calorias gastas aparecem separadas das consumidas.' },
      { label: 'Peso, glicemia e fotos', desc: 'Use os atalhos dos indicadores para abrir os registros disponíveis e acompanhar seu progresso.' },
      { label: 'Metas e sugestões', desc: 'Confira calorias, proteína, carboidrato, gordura e hidratação. As sugestões da IA dependem das informações do perfil e dos registros disponíveis.' },
    ], tips: ['Antes de salvar, confira sempre o dia selecionado e os valores sugeridos pela IA.'],
  },
  {
    id: 'menu', title: 'Cardápio e lista de compras', icon: Utensils, route: '/menu', location: 'Cardápio',
    intro: 'Planeje as refeições da semana conforme suas metas e preferências.',
    steps: [
      { label: 'Preparar as preferências', desc: 'Em Perfil → Preferências alimentares, informe gostos, restrições e alergias antes de gerar sugestões.' },
      { label: 'Gerar a semana', desc: 'Abra a criação de cardápio e confira as opções oferecidas. A IA usa os dados disponíveis para sugerir refeições e quantidades.' },
      { label: 'Consultar refeições', desc: 'Escolha o dia e abra a refeição para consultar ingredientes, preparo e nutrientes.' },
      { label: 'Comprar os ingredientes', desc: 'Abra a lista de compras e marque os itens que já possui ou comprou.' },
    ], tips: ['Uma sugestão de refeição não significa que ela já foi consumida: confira os registros na tela Hoje.'],
  },
  {
    id: 'workouts', title: 'Criar, editar e agendar treinos', icon: Dumbbell, route: '/workouts', location: 'Treinos',
    intro: 'Monte sessões manualmente ou use os geradores de treino disponíveis.',
    steps: [
      { label: 'Criar manualmente', desc: 'Dê um nome ao treino, selecione os exercícios da biblioteca e organize a sequência.' },
      { label: 'Usar a IA ou o assistente', desc: 'Informe objetivo, categorias, equipamentos extras e dias. O assistente reúne as respostas por etapas; preencha os itens obrigatórios para avançar e revise o resumo antes de gerar.' },
      { label: 'Escolher sugestões', desc: 'Quando aparecerem grupos sugeridos, confira as demonstrações e selecione os exercícios desejados antes de concluir.' },
      { label: 'Usar informações de saúde', desc: 'Ative as opções de exames ou análise corporal no gerador se desejar usar esses dados disponíveis. Isso não substitui orientação profissional.' },
      { label: 'Ajustar cada exercício', desc: 'No editor do treino, altere séries, repetições e descanso por exercício. Os valores gerais servem como padrão; sua alteração pode ser aplicada a todos.' },
      { label: 'Organizar a rotina', desc: 'Configure os dias do treino, edite a sequência e use as opções de copiar ou adicionar exercícios de outros treinos quando disponíveis.' },
    ], tips: ['Usuários vinculados recebem os treinos do Gestor e não podem criar, excluir ou compartilhar treinos por conta própria.'],
  },
  {
    id: 'play', title: 'Executar um treino', icon: Activity, route: '/workouts', location: 'Treinos → iniciar treino',
    intro: 'Demonstrações e controles para acompanhar a sessão exercício por exercício.',
    steps: [
      { label: 'Começar a sessão', desc: 'Inicie o treino e escolha as opções apresentadas, incluindo o modo de hoje e o uso do descanso.' },
      { label: 'Avançar e voltar', desc: 'Use os controles do treino ou os gestos disponíveis no celular para navegar entre os exercícios.' },
      { label: 'Descansar', desc: 'Quando ativado, o intervalo entre exercícios mostra uma contagem regressiva com o descanso configurado.' },
      { label: 'Motivo e análise', desc: 'Use o botão Motivo do treino para mostrar ou ocultar a justificativa. A análise técnica tem seu próprio controle quando disponível.' },
      { label: 'Voz e alongamento', desc: 'Comandos por voz são opcionais e dependem de permissão do microfone e suporte do aparelho. O alongamento final aparece nos treinos que o incluem.' },
      { label: 'Finalizar', desc: 'Conclua a sessão pelos controles do treino para registrar sua execução.' },
    ], tips: ['O modo de hoje adapta a sessão à disposição informada; não é uma avaliação médica.'],
  },
  {
    id: 'library', title: 'Biblioteca de exercícios', icon: Library, route: '/exercises', location: 'Treinos → Biblioteca',
    intro: 'Exercícios reutilizáveis com demonstrações, categorias e equipamentos.',
    steps: [
      { label: 'Encontrar exercícios', desc: 'Use a busca e os filtros de categoria e equipamento para localizar opções.' },
      { label: 'Ver demonstrações', desc: 'Abra o exercício para consultar a mídia e as informações disponíveis.' },
      { label: 'Cadastrar e reutilizar', desc: 'Quando sua conta permitir, cadastre exercícios e selecione-os ao montar treinos. A biblioteca é independente de cada sessão.' },
      { label: 'Organizar mídias', desc: 'As opções de importação e administração dependem do seu acesso. Importações com processamento podem continuar em segundo plano.' },
    ], tips: ['Usuários vinculados usam os exercícios disponibilizados pelo Gestor; o cadastro é feito por quem gerencia seus treinos.'],
  },
  {
    id: 'health', title: 'Saúde: visão geral', icon: Heart, route: '/health', location: 'Saúde → Visão geral',
    intro: 'Um único lugar para acompanhar o corpo e os indicadores de saúde.',
    steps: [
      { label: 'Escolher uma área', desc: 'Use as opções Visão geral, Bioimpedância, Medidas, Sinais e Exames no topo.' },
      { label: 'Entender os indicadores', desc: 'Peso, IMC e gasto em repouso usam os dados disponíveis do perfil e da bioimpedância. Alguns valores são estimativas.' },
      { label: 'Manter o perfil correto', desc: 'Confira altura, peso, data de nascimento e sexo em Perfil: eles influenciam os cálculos.' },
    ], tips: ['Indicadores e análises são educativos e não substituem consulta, diagnóstico ou prescrição.'],
  },
  {
    id: 'bio', title: 'Bioimpedância e comparação corporal', icon: Scale, route: '/health?tab=bioimpedance', location: 'Saúde → Bioimpedância',
    intro: 'Consulte diferentes exames e compare a composição corporal ao longo do tempo.',
    steps: [
      { label: 'Enviar um laudo', desc: 'Use o envio da aba Bioimpedância para analisar a foto do exame. O processamento ocorre em segundo plano; confira o resultado ao terminar.' },
      { label: 'Abrir outra data', desc: 'Escolha um exame no seletor de datas para ver os valores daquela medição.' },
      { label: 'Comparar exames', desc: 'Selecione duas medições para comparar índices, diferenças e evolução visual.' },
      { label: 'Explorar os dois corpos', desc: 'Na evolução visual, gordura por região e equilíbrio muscular têm desenhos próprios, setas, valores e legendas de cores. Arraste o controle para acompanhar a mudança entre as datas.' },
      { label: 'Excluir um exame', desc: 'Use a opção de excluir e confirme a remoção do exame selecionado.' },
    ], tips: ['Dados ausentes não são zero. O desenho é ilustrativo, não uma fotografia ou exame clínico.', 'Valores derivados da leitura direta da balança são estimativas; não equivalem necessariamente aos índices do Fitdays.'],
  },
  {
    id: 'measurements', title: 'Medidas com trena', icon: Ruler, route: '/health?tab=measurements', location: 'Saúde → Medidas',
    intro: 'Registre perímetros corporais e compare mudanças com nomes e setas no desenho.',
    steps: [
      { label: 'Nova medição', desc: 'Abra o registro, confira a data e preencha as medidas em centímetros. Os últimos valores aparecem como sugestão: substitua-os pelos valores medidos agora.' },
      { label: 'Usar o desenho', desc: 'Toque nos pontos do corpo para localizar os campos, como cintura, quadril, braços e pernas.' },
      { label: 'Editar ou excluir', desc: 'Abra uma medição do histórico. A edição traz os valores originais daquela data.' },
      { label: 'Comparar e animar', desc: 'Escolha duas datas e mova a barra da medição mais antiga para a mais recente. As setas identificam as medidas e mostram os valores durante a comparação.' },
    ], tips: ['Meça sempre no mesmo ponto e em condições semelhantes. Campo vazio é exibido como dado ausente.'],
  },
  {
    id: 'vitals', title: 'Sinais vitais e históricos', icon: Heart, route: '/health?tab=vitals', location: 'Saúde → Sinais',
    intro: 'Consulte os sinais disponíveis e acompanhe tendências por período.',
    steps: [
      { label: 'Escolher o indicador', desc: 'Consulte frequência cardíaca, pressão, oxigenação, sono, passos e outros indicadores que tenham registros.' },
      { label: 'Comparar períodos', desc: 'Use os controles de período e os gráficos para acompanhar valores e tendências, respeitando os dias sem registro.' },
      { label: 'Trazer dados do relógio', desc: 'No Android nativo, o cartão Samsung Health permite conectar, consultar um resumo e confirmar os dados a importar.' },
    ], tips: ['A lista disponível depende dos dados compartilhados pelo aparelho e dos registros importados; nem todo relógio fornece todos os indicadores.'],
  },
  {
    id: 'blood', title: 'Exames de sangue', icon: FlaskConical, route: '/health?tab=blood', location: 'Saúde → Exames',
    intro: 'Envie laudos e acompanhe a evolução dos marcadores encontrados.',
    steps: [
      { label: 'Enviar PDF ou foto', desc: 'Envie o laudo legível nesta aba. A análise continua em segundo plano enquanto você navega.' },
      { label: 'Conferir os resultados', desc: 'Revise os marcadores extraídos e suas unidades. Um índice pode aparecer mesmo com apenas uma medição.' },
      { label: 'Ver evolução', desc: 'Escolha os marcadores para comparar os registros disponíveis; os gráficos usam as medições existentes.' },
      { label: 'Excluir um laudo', desc: 'Abra o exame desejado, use excluir e confirme a remoção.' },
    ], tips: ['A IA pode interpretar um laudo incorretamente. Compare com o documento original e procure um profissional para avaliar resultados.'],
  },
  {
    id: 'watch', title: 'Importar do Samsung Health', icon: Watch, route: '/health?tab=vitals', location: 'App Android → Saúde → Sinais',
    intro: 'O Galaxy Watch compartilha dados com o Samsung Health; o Pilar Saúde os lê pelo Health Connect.',
    steps: [
      { label: 'Preparar o compartilhamento', desc: 'No Android, autorize o Samsung Health a compartilhar os dados com o Health Connect e conceda ao Pilar Saúde as permissões solicitadas.' },
      { label: 'Escolher o período', desc: 'No cartão Samsung Health, escolha 30 dias, 90 dias ou 1 ano para consultar peso e sinais disponíveis.' },
      { label: 'Revisar antes de importar', desc: 'Confira o resumo e marque quais valores deseja salvar. A atualização do peso do perfil é opcional e precisa da sua confirmação.' },
      { label: 'Encontrar os dados', desc: 'Peso vai para o histórico; sinais e gordura diária aparecem em Sinais. A última leitura de peso e gordura pode formar um registro de bioimpedância.' },
      { label: 'Calorias gastas', desc: 'As calorias importadas são as de hoje e entram como Atividade do relógio nos exercícios da tela Hoje. O período histórico não importa calorias de todos os dias passados.' },
    ], tips: ['Disponível apenas no app nativo, não no navegador.', 'Fitdays só aparece nessa importação se compartilhar dados com o Health Connect. O laudo completo do Fitdays não é importado automaticamente.'],
  },
  {
    id: 'scale', title: 'Leitura direta da balança', icon: Bluetooth, route: '/health?tab=bioimpedance', location: 'App Android → Saúde → Bioimpedância',
    intro: 'Conexão Bluetooth experimental para balanças compatíveis, incluindo a família Proscan/Fitdays.',
    steps: [
      { label: 'Preparar a balança', desc: 'Ative o Bluetooth e as permissões solicitadas. Evite manter outro aplicativo conectado à balança ao mesmo tempo.' },
      { label: 'Conectar e medir', desc: 'Abra o cartão da balança no app nativo, procure o aparelho e siga o estado mostrado durante a pesagem.' },
      { label: 'Conferir antes de salvar', desc: 'Revise a leitura e os dados do seu perfil. Peso e impedância, quando fornecida, servem de base para estimativas de composição corporal.' },
    ], tips: ['A compatibilidade com o protocolo exato da Proscan Voice ainda precisa ser confirmada no aparelho.', 'Essa conexão não baixa o histórico armazenado no Fitdays nem garante todos os índices proprietários.'],
  },
  {
    id: 'products', title: 'Meus produtos e kits', icon: Package, route: '/products', location: 'Perfil → Meus produtos',
    intro: 'Guarde alimentos frequentes e combinações para registrar refeições com menos digitação.',
    steps: [
      { label: 'Encontrar o cadastro', desc: 'Abra Perfil → Meus produtos. Produtos não fica no menu principal.' },
      { label: 'Cadastrar um produto', desc: 'Informe os valores nutricionais e a porção de referência. Confira a unidade para evitar quantidades incorretas.' },
      { label: 'Montar um kit', desc: 'Agrupe produtos e quantidades que costuma consumir juntos.' },
      { label: 'Registrar o consumo', desc: 'Use a opção de consumir e confira a quantidade e a data ativa da tela Hoje.' },
    ],
  },
  {
    id: 'projections', title: 'Projeções de peso', icon: TrendingUp, route: '/projections', location: 'Projeções',
    intro: 'Estimativas baseadas nas pesagens registradas ou no saldo de calorias.',
    steps: [
      { label: 'Por peso registrado', desc: 'Analise a tendência das pesagens reais disponíveis.' },
      { label: 'Por calorias', desc: 'Compare a estimativa calculada com os registros de consumo e gasto.' },
      { label: 'Interpretar a previsão', desc: 'Observe as diferenças entre as duas fontes. Registros incompletos, líquidos e variações de rotina influenciam a projeção.' },
    ], tips: ['Projeção não é uma promessa de resultado ou um diagnóstico.'],
  },
  {
    id: 'profile', title: 'Perfil, preferências e app Android', icon: UserRound, route: '/profile', location: 'Perfil',
    intro: 'Mantenha seus dados e encontre as opções da conta.',
    steps: [
      { label: 'Atualizar seus dados', desc: 'Revise dados pessoais, objetivo e atividade para melhorar as estimativas do app.' },
      { label: 'Preferências alimentares', desc: 'Abra a opção no Perfil para informar restrições, gostos e estilo alimentar.' },
      { label: 'Produtos e conta', desc: 'Meus produtos abre seus cadastros. As opções de conta permitem gerenciar senha e sair da sessão.' },
      { label: 'Baixar app Android', desc: 'Use Baixar app Android no Perfil. O download depende de existir um APK disponível; se o arquivo não abrir, ele pode ainda não ter sido disponibilizado ou exigir acesso.' },
    ], tips: ['Instalar a versão web não libera a leitura do relógio ou Bluetooth da balança: esses recursos exigem o APK nativo.'],
  },
  {
    id: 'manager', title: 'Gestor e usuários vinculados', icon: Users, route: '/gestor', location: 'Perfil → Meus usuários (Gestor ou master)',
    intro: 'Acompanhe os usuários sob sua gestão e prepare os treinos para eles.',
    steps: [
      { label: 'Criar um usuário', desc: 'Em Meus usuários, use Novo e preencha os dados. O formulário mostra as condições da senha; senhas comuns ou vazadas podem ser recusadas.' },
      { label: 'Analisar a evolução', desc: 'Abra o resumo do usuário e escolha o período para consultar os gráficos e registros disponíveis de alimentação, atividade e saúde.' },
      { label: 'Entrar na conta vinculada', desc: 'Use a ação de acesso ao usuário para trabalhar em sua conta. A faixa no topo identifica esse acesso; Voltar para minha conta encerra-o.' },
      { label: 'Preparar treinos', desc: 'Nesse acesso, o Gestor pode criar e editar treinos e usar a biblioteca. Também há opções para copiar treinos entre usuários.' },
      { label: 'Alterar senha', desc: 'O Gestor pode alterar a senha dos seus vinculados; o master pode gerenciar outras contas conforme seu acesso.' },
      { label: 'Avisar o usuário', desc: 'Ao criar ou salvar um treino na conta vinculada, o aviso aparece dentro do app. Não é uma notificação com o app fechado.' },
    ], tips: ['Essas opções só aparecem para contas com acesso de gestão. O usuário vinculado não pode criar, excluir ou compartilhar seus treinos por conta própria.'],
  },
  {
    id: 'privacy', title: 'Privacidade e segurança', icon: Shield, route: '/profile', location: 'Perfil → dados e privacidade',
    intro: 'Conheça as opções para consultar, exportar e controlar seus dados.',
    steps: [
      { label: 'Exportar dados', desc: 'No Perfil, use a exportação disponível em JSON ou PDF para guardar uma cópia dos seus registros.' },
      { label: 'Excluir a conta', desc: 'A exclusão da conta é uma ação permanente. Leia a confirmação antes de prosseguir.' },
      { label: 'Consultar os documentos', desc: 'Leia a Política de Privacidade e os Termos de Uso para entender o tratamento de dados, o uso de IA e o acesso de gestão.' },
    ], tips: ['Não compartilhe sua senha. Fotos, laudos e outros dados de saúde merecem atenção especial.'],
  },
  {
    id: 'nutrition', title: 'Entender calorias e nutrientes', icon: BookOpen, route: '/', location: 'Hoje → indicadores nutricionais',
    intro: 'Uma referência rápida para entender os números das refeições.',
    steps: [
      { label: 'Proteína (P)', desc: 'Participa da construção e manutenção dos tecidos. Fornece aproximadamente 4 kcal por grama.' },
      { label: 'Carboidrato (C)', desc: 'É uma fonte de energia. Fornece aproximadamente 4 kcal por grama.' },
      { label: 'Gordura (G)', desc: 'Participa de funções hormonais e da absorção de vitaminas. Fornece aproximadamente 9 kcal por grama.' },
      { label: 'Calorias e metas', desc: 'Calorias representam energia. As metas do app são estimativas baseadas nos seus dados e objetivo; necessidades individuais devem ser avaliadas por um profissional.' },
    ],
  },
];

export function getContextHelp(pathname: string, search: string): HelpTopic {
  const tab = new URLSearchParams(search).get('tab');
  const healthTopics: Record<string, string> = { bioimpedance: 'bio', measurements: 'measurements', vitals: 'vitals', blood: 'blood' };
  const healthId = healthTopics[tab ?? ''];
  const id = pathname === '/health' || pathname === '/bioimpedance'
    ? healthId ?? 'health'
    : pathname.startsWith('/workouts') ? 'workouts'
    : pathname.startsWith('/admin') ? 'manager'
    : pathname === '/food-preferences' || pathname === '/onboarding' ? 'profile' : undefined;
  return helpTopics.find(topic => id ? topic.id === id : topic.route === pathname) ?? helpTopics[0];
}
