// Pacote de demonstração: o próprio guia de uso do Study Lab.
// Serve para mostrar todas as funções funcionando antes de os seus materiais chegarem.
// Todo o conteúdo abaixo descreve o app, então nada é inventado sobre a sua matéria.
export const DEMO_PACK = {
  demo: true,
  title: "Guia do Study Lab",
  subjects: [{ id: "guia", name: "Guia do Study Lab" }],
  materials: [
    {
      id: "guia-m1",
      subjectId: "guia",
      title: "Guia do Study Lab",
      fileName: "guia-study-lab.txt",
      kind: "texto",
      pageLabel: "p.",
      chunks: [
        {
          page: 1,
          text:
            "Origem dos conteúdos\n" +
            "O Study Lab é uma plataforma de estudos que transforma os seus materiais em atividades de aprendizagem ativa. " +
            "Todo o conteúdo didático é baseado exclusivamente nos materiais enviados pelo estudante. " +
            "Quando uma informação não está nos materiais, a plataforma informa isso claramente em vez de inventar uma resposta. " +
            "Cada resumo, pergunta e flashcard indica de qual material e de qual página veio a informação. " +
            "A biblioteca organiza os materiais por matéria e por assunto e permite pesquisar palavras em todos os arquivos ao mesmo tempo.",
        },
        {
          page: 2,
          text:
            "Flashcards e repetição espaçada\n" +
            "Flashcard é um cartão de memorização com uma pergunta ou conceito na frente e a resposta no verso. " +
            "Depois de virar o cartão, o estudante marca uma de três opções: Não sei, Tenho dúvida ou Já aprendi. " +
            "Os cartões marcados como Não sei voltam poucos cartões depois, ainda na mesma sessão. " +
            "Os cartões marcados como Tenho dúvida voltam um pouco mais tarde na sessão. " +
            "Repetição espaçada é a técnica de revisar um conteúdo em intervalos crescentes: quanto mais vezes o estudante acerta, mais tempo o cartão demora para voltar.",
        },
        {
          page: 3,
          text:
            "Quiz e simulado\n" +
            "O quiz é o modo de treino: depois de cada resposta, o app mostra se o estudante acertou, explica o motivo, mostra a resposta correta e permite tentar novamente. " +
            "O quiz tem cinco tipos de pergunta: múltipla escolha, verdadeiro ou falso, pergunta aberta, associação e completar lacunas. " +
            "O simulado imita uma prova real: tem cronômetro, quantidade de questões configurável e questões embaralhadas. " +
            "Durante o simulado as respostas não são mostradas. " +
            "Ao finalizar, o simulado mostra a nota de 0 a 10, o percentual de acertos, a correção comentada de cada questão e os assuntos com mais dificuldade.",
        },
        {
          page: 4,
          text:
            "Revisão, pontos e professor virtual\n" +
            "A revisão inteligente reúne as perguntas erradas, os assuntos com mais erros e os cartões que ainda não foram aprendidos. " +
            "Um assunto é considerado dominado quando o estudante acerta pelo menos 80% do que foi praticado nele. " +
            "Cada acerto na primeira tentativa vale 10 pontos; um acerto depois de errar vale 4 pontos. " +
            "A sequência de estudos conta os dias seguidos em que o estudante praticou. " +
            "O professor virtual responde perguntas com base nos materiais e cita o material e a página de cada explicação. " +
            "Na preparação para a prova, cada assunto segue a ordem: explicação simples, exemplos, mini-teste e reforço dos erros; no final vem um simulado geral.",
        },
      ],
    },
  ],
  topics: [
    {
      id: "guia-t1",
      materialIds: ["guia-m1"],
      title: "De onde vem o conteúdo",
      importance: 3,
      minutes: 4,
      why: "É a regra que garante que tudo o que você estuda aqui veio dos seus arquivos.",
      summary: {
        full:
          "O Study Lab transforma os materiais do estudante em atividades de aprendizagem ativa. Todo o conteúdo didático é baseado exclusivamente nesses materiais.\n\nQuando uma informação não está nos materiais, a plataforma avisa em vez de inventar. Cada resumo, pergunta e flashcard indica o material e a página de origem. A biblioteca organiza os materiais por matéria e assunto e permite pesquisar em todos os arquivos ao mesmo tempo.",
        simple:
          "Tudo o que aparece aqui sai dos seus arquivos. Se algo não estiver neles, o app diz que não está. E sempre mostra de onde tirou cada informação.",
      },
      concepts: [
        { term: "Study Lab", definition: "Plataforma que transforma os seus materiais em atividades de aprendizagem ativa.", src: { p: 1 } },
        { term: "Fonte", definition: "Indicação do material e da página de onde veio cada resumo, pergunta ou flashcard.", src: { p: 1 } },
      ],
      keywords: ["materiais", "fonte", "biblioteca", "pesquisa"],
      attention: [{ text: "Se a informação não estiver nos materiais, a plataforma informa isso em vez de inventar.", src: { p: 1 } }],
      examples: [],
      comparisons: [],
      memorize: [{ text: "Todo conteúdo vem exclusivamente dos materiais enviados.", src: { p: 1 } }],
    },
    {
      id: "guia-t2",
      materialIds: ["guia-m1"],
      title: "Flashcards e repetição espaçada",
      importance: 2,
      minutes: 5,
      why: "Explica por que os cartões que você erra voltam mais vezes.",
      summary: {
        full:
          "Flashcard é um cartão com uma pergunta ou conceito na frente e a resposta no verso. Depois de virar o cartão, o estudante marca Não sei, Tenho dúvida ou Já aprendi.\n\nCartões marcados como Não sei voltam poucos cartões depois, na mesma sessão; os marcados como Tenho dúvida voltam um pouco mais tarde. A repetição espaçada revisa o conteúdo em intervalos crescentes: quanto mais acertos, mais tempo o cartão demora para voltar.",
        simple: "Você vira o cartão e diz se sabia. O que você não sabe volta logo. O que você já sabe demora mais para voltar.",
      },
      concepts: [
        { term: "Flashcard", definition: "Cartão de memorização com pergunta ou conceito na frente e resposta no verso.", src: { p: 2 } },
        { term: "Repetição espaçada", definition: "Técnica de revisar em intervalos crescentes: quanto mais acertos, mais tempo o cartão demora para voltar.", src: { p: 2 } },
      ],
      keywords: ["flashcard", "repetição espaçada", "não sei", "tenho dúvida", "já aprendi"],
      attention: [{ text: "Não sei faz o cartão voltar mais rápido do que Tenho dúvida.", src: { p: 2 } }],
      examples: [{ text: "Um cartão marcado como Não sei volta poucos cartões depois, ainda na mesma sessão.", src: { p: 2 } }],
      comparisons: [
        { a: "Não sei", b: "Tenho dúvida", difference: "Não sei faz o cartão voltar poucos cartões depois; Tenho dúvida faz voltar um pouco mais tarde na sessão.", src: { p: 2 } },
      ],
      memorize: [{ text: "Três marcações: Não sei, Tenho dúvida, Já aprendi.", src: { p: 2 } }],
    },
    {
      id: "guia-t3",
      materialIds: ["guia-m1"],
      title: "Quiz e simulado",
      importance: 3,
      minutes: 5,
      why: "Treinar com correção imediata e depois testar em condição de prova.",
      summary: {
        full:
          "O quiz é o modo de treino: após cada resposta, mostra se você acertou, explica o motivo, mostra a resposta correta e deixa tentar de novo. Há cinco tipos de pergunta: múltipla escolha, verdadeiro ou falso, aberta, associação e completar lacunas.\n\nO simulado imita a prova: cronômetro, quantidade configurável e questões embaralhadas. As respostas não aparecem durante a prova. No fim, você vê nota de 0 a 10, percentual, correção comentada e os assuntos com mais dificuldade.",
        simple: "Quiz é treino com correção na hora. Simulado é prova de verdade: só mostra as respostas no final.",
      },
      concepts: [
        { term: "Quiz", definition: "Modo de treino com correção, explicação e nova tentativa após cada resposta.", src: { p: 3 } },
        { term: "Simulado", definition: "Prova com cronômetro e questões embaralhadas, que só mostra as respostas ao finalizar.", src: { p: 3 } },
      ],
      keywords: ["quiz", "simulado", "cronômetro", "nota", "correção"],
      attention: [{ text: "Durante o simulado as respostas não são mostradas.", src: { p: 3 } }],
      examples: [],
      comparisons: [
        { a: "Quiz", b: "Simulado", difference: "O quiz corrige cada resposta na hora; o simulado só corrige ao finalizar, com nota e cronômetro.", src: { p: 3 } },
      ],
      memorize: [{ text: "Cinco tipos de pergunta: múltipla escolha, verdadeiro ou falso, aberta, associação e lacuna.", src: { p: 3 } }],
    },
    {
      id: "guia-t4",
      materialIds: ["guia-m1"],
      title: "Revisão, pontos e professor",
      importance: 2,
      minutes: 5,
      why: "Mostra como o app acompanha suas dificuldades e como pedir ajuda.",
      summary: {
        full:
          "A revisão inteligente reúne perguntas erradas, assuntos com mais erros e cartões ainda não aprendidos. Um assunto é dominado quando você acerta pelo menos 80% do que praticou nele.\n\nAcerto na primeira tentativa vale 10 pontos; acerto depois de errar vale 4. A sequência conta os dias seguidos de estudo. O professor virtual responde com base nos materiais e cita material e página. Na preparação para a prova, cada assunto segue: explicação simples, exemplos, mini-teste e reforço dos erros, com um simulado geral no final.",
        simple: "O app guarda o que você erra e monta a revisão com isso. Acertar dá pontos. O professor responde citando a página do material.",
      },
      concepts: [
        { term: "Assunto dominado", definition: "Assunto em que o estudante acerta pelo menos 80% do que praticou.", src: { p: 4 } },
        { term: "Sequência de estudos", definition: "Quantidade de dias seguidos em que o estudante praticou.", src: { p: 4 } },
        { term: "Professor virtual", definition: "Responde perguntas com base nos materiais e cita o material e a página de cada explicação.", src: { p: 4 } },
      ],
      keywords: ["revisão", "pontos", "sequência", "professor", "preparação"],
      attention: [{ text: "Acerto depois de errar vale 4 pontos, não 10.", src: { p: 4 } }],
      examples: [],
      comparisons: [],
      memorize: [
        { text: "Ordem da preparação: explicação simples → exemplos → mini-teste → reforço → simulado geral.", src: { p: 4 } },
        { text: "Dominado = 80% de acertos ou mais.", src: { p: 4 } },
      ],
    },
  ],
  questions: [
    { id: "gq1", topicId: "guia-t1", type: "tf", prompt: "Quando uma informação não está nos materiais, o Study Lab cria uma resposta provável para não deixar o estudante sem resposta.", answer: false, explanation: "Falso. A plataforma informa claramente que a informação não está nos materiais, em vez de inventar.", src: { p: 1, q: "Quando uma informação não está nos materiais, a plataforma informa isso claramente em vez de inventar uma resposta." } },
    { id: "gq2", topicId: "guia-t1", type: "mcq", prompt: "O que cada resumo, pergunta e flashcard indica?", options: ["O material e a página de onde veio a informação", "A dificuldade estimada da prova", "O nome do professor que criou a questão", "A data em que o material foi enviado"], answer: 0, explanation: "Cada item indica o material e a página de origem, para você conferir no texto original.", src: { p: 1, q: "Cada resumo, pergunta e flashcard indica de qual material e de qual página veio a informação." } },
    { id: "gq3", topicId: "guia-t1", type: "cloze", prompt: "A biblioteca organiza os materiais por matéria e por ____.", answer: ["assunto", "assuntos"], explanation: "A biblioteca organiza por matéria e por assunto, e permite pesquisar em todos os arquivos.", src: { p: 1, q: "A biblioteca organiza os materiais por matéria e por assunto" } },
    { id: "gq4", topicId: "guia-t2", type: "mcq", prompt: "Quais são as três marcações de um flashcard?", options: ["Não sei, Tenho dúvida, Já aprendi", "Fácil, Médio, Difícil", "Certo, Errado, Pular", "Nunca, Às vezes, Sempre"], answer: 0, explanation: "Depois de virar o cartão, você marca Não sei, Tenho dúvida ou Já aprendi.", src: { p: 2, q: "o estudante marca uma de três opções: Não sei, Tenho dúvida ou Já aprendi." } },
    { id: "gq5", topicId: "guia-t2", type: "tf", prompt: "Um cartão marcado como Não sei volta poucos cartões depois, ainda na mesma sessão.", answer: true, explanation: "Verdadeiro. É assim que os cartões errados aparecem com mais frequência.", src: { p: 2, q: "Os cartões marcados como Não sei voltam poucos cartões depois, ainda na mesma sessão." } },
    { id: "gq6", topicId: "guia-t2", type: "open", prompt: "Com suas palavras: o que é repetição espaçada?", answer: "É revisar um conteúdo em intervalos crescentes: quanto mais você acerta, mais tempo o cartão demora para voltar.", keyPoints: ["intervalos crescentes", "mais acertos = mais tempo até voltar"], explanation: "A ideia central é aumentar o intervalo conforme os acertos.", src: { p: 2, q: "Repetição espaçada é a técnica de revisar um conteúdo em intervalos crescentes" } },
    { id: "gq7", topicId: "guia-t2", type: "match", prompt: "Associe cada marcação ao que acontece com o cartão.", pairs: [{ left: "Não sei", right: "Volta poucos cartões depois" }, { left: "Tenho dúvida", right: "Volta um pouco mais tarde na sessão" }, { left: "Já aprendi", right: "Demora mais para voltar" }], explanation: "Quanto menos você sabe, mais cedo o cartão volta.", src: { p: 2 } },
    { id: "gq8", topicId: "guia-t3", type: "mcq", prompt: "O que NÃO acontece durante o simulado?", options: ["Mostrar as respostas corretas", "Contar o tempo no cronômetro", "Embaralhar as questões", "Permitir escolher a quantidade de questões"], answer: 0, explanation: "No simulado as respostas só aparecem ao finalizar.", src: { p: 3, q: "Durante o simulado as respostas não são mostradas." } },
    { id: "gq9", topicId: "guia-t3", type: "cloze", prompt: "Ao finalizar, o simulado mostra a nota de 0 a ____.", answer: ["10", "dez"], explanation: "A nota vai de 0 a 10, junto com o percentual de acertos.", src: { p: 3, q: "o simulado mostra a nota de 0 a 10" } },
    { id: "gq10", topicId: "guia-t3", type: "tf", prompt: "O quiz tem cinco tipos de pergunta.", answer: true, explanation: "Verdadeiro: múltipla escolha, verdadeiro ou falso, aberta, associação e completar lacunas.", src: { p: 3, q: "O quiz tem cinco tipos de pergunta" } },
    { id: "gq11", topicId: "guia-t3", type: "open", prompt: "Qual a diferença entre o quiz e o simulado?", answer: "O quiz é treino e corrige cada resposta na hora, com explicação e nova tentativa. O simulado imita a prova: tem cronômetro e só mostra as respostas ao finalizar.", keyPoints: ["quiz corrige na hora", "simulado só no final", "simulado tem cronômetro"], explanation: "Treino com correção imediata versus prova com correção no fim.", src: { p: 3 } },
    { id: "gq12", topicId: "guia-t4", type: "mcq", prompt: "Quantos pontos vale um acerto na primeira tentativa?", options: ["10", "4", "1", "20"], answer: 0, explanation: "Primeira tentativa vale 10 pontos; depois de errar, 4.", src: { p: 4, q: "Cada acerto na primeira tentativa vale 10 pontos" } },
    { id: "gq13", topicId: "guia-t4", type: "cloze", prompt: "Um assunto é considerado dominado com pelo menos ____% de acertos.", answer: ["80", "oitenta"], explanation: "O limite para dominado é 80% do que foi praticado.", src: { p: 4, q: "pelo menos 80% do que foi praticado nele" } },
    { id: "gq14", topicId: "guia-t4", type: "match", prompt: "Associe cada etapa da preparação à sua posição.", pairs: [{ left: "1ª etapa", right: "Explicação simples" }, { left: "2ª etapa", right: "Exemplos" }, { left: "3ª etapa", right: "Mini-teste" }, { left: "4ª etapa", right: "Reforço dos erros" }], explanation: "Explicação simples, exemplos, mini-teste e reforço; no final, o simulado geral.", src: { p: 4 } },
    { id: "gq15", topicId: "guia-t4", type: "tf", prompt: "O professor virtual cita o material e a página de cada explicação.", answer: true, explanation: "Verdadeiro. Assim você pode conferir no texto original.", src: { p: 4, q: "cita o material e a página de cada explicação" } },
  ],
  flashcards: [
    { id: "gf1", topicId: "guia-t1", front: "De onde vem todo o conteúdo do Study Lab?", back: "Exclusivamente dos materiais enviados pelo estudante.", explanation: "Se algo não está nos materiais, o app avisa.", src: { p: 1 } },
    { id: "gf2", topicId: "guia-t1", front: "O que a biblioteca permite fazer?", back: "Organizar por matéria e assunto e pesquisar palavras em todos os arquivos ao mesmo tempo.", src: { p: 1 } },
    { id: "gf3", topicId: "guia-t2", front: "Flashcard", back: "Cartão com pergunta ou conceito na frente e resposta no verso.", src: { p: 2 } },
    { id: "gf4", topicId: "guia-t2", front: "Repetição espaçada", back: "Revisar em intervalos crescentes: mais acertos, mais tempo até o cartão voltar.", src: { p: 2 } },
    { id: "gf5", topicId: "guia-t2", front: "O que acontece com um cartão marcado como Não sei?", back: "Volta poucos cartões depois, na mesma sessão.", src: { p: 2 } },
    { id: "gf6", topicId: "guia-t3", front: "Quiz × Simulado", back: "Quiz corrige na hora; simulado só corrige ao finalizar.", explanation: "O simulado tem cronômetro e questões embaralhadas.", src: { p: 3 } },
    { id: "gf7", topicId: "guia-t3", front: "O que o resultado do simulado mostra?", back: "Nota de 0 a 10, percentual, correção comentada e assuntos com mais dificuldade.", src: { p: 3 } },
    { id: "gf8", topicId: "guia-t4", front: "Quando um assunto é considerado dominado?", back: "Com pelo menos 80% de acertos no que foi praticado.", src: { p: 4 } },
    { id: "gf9", topicId: "guia-t4", front: "Ordem de estudo de cada assunto na preparação", back: "Explicação simples → exemplos → mini-teste → reforço dos erros.", explanation: "No final: simulado geral.", src: { p: 4 } },
  ],
};
