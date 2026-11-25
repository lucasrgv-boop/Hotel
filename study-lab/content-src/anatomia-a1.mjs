// Pacote de conteúdo: Anatomia A1.
// Fonte única: as duas apostilas enviadas pela estudante.
//   m1 = Apostila de Revisão – Anatomia A1 (Nervoso, Digestório, Urinário, Genital Masculino e Feminino)
//   m2 = Apostila de Revisão – A1 (Cardiovascular, Respiratório, Digestório)
// Gera public/content.json. Rode: node content-src/anatomia-a1.mjs
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const pages = JSON.parse(readFileSync(here + "pages.json", "utf8"));
const platesRaw = JSON.parse(readFileSync(here + "plates.json", "utf8"));

const s = (m, p, q) => ({ m, p, ...(q ? { q } : {}) });

// Texto das ilustrações (página 1 de cada apostila), transcrito para a busca.
const ILUS_M1 = `Ilustração – Resumo visual

Sistema Nervoso. Estruturas indicadas: cérebro, cerebelo, tronco encefálico, medula espinhal, dendritos, corpo celular, axônio, bainha de mielina. Principais funções: receber e processar informações e controlar o corpo. Divisão: SNC: encéfalo e medula espinhal; SNP: nervos e gânglios.

Sistema Digestório. Estruturas indicadas: boca, faringe, esôfago, fígado, estômago, vesícula biliar, pâncreas, intestino grosso, intestino delgado, reto, ânus. Funções: digerir, absorver nutrientes e eliminar resíduos. Enzimas importantes: amilase (carboidratos), pepsina (proteínas), lipase (gorduras), tripsina (proteínas). Partes do intestino delgado: duodeno, jejuno e íleo. Órgãos anexos: fígado, vesícula biliar e pâncreas.

Sistema Urinário. Estruturas indicadas: rim, ureter, bexiga urinária, uretra. Função: filtrar o sangue e eliminar a urina. Estruturas do rim: córtex renal, medula renal, pelve renal, néfron.

Sistema Genital Masculino. Estruturas indicadas: bexiga, vesículas seminais, ducto deferente, próstata, epidídimo, testículo, uretra (escrito "Uretro" na imagem), pênis. Função: produzir espermatozoides e testosterona. Caminho do espermatozoide: testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra.

Sistema Genital Feminino. Estruturas indicadas: tuba uterina (trompa), ovário, útero, colo do útero, vagina, vulva. Função: produzir óvulos, hormônios e permitir a gestação. Hormônios: estrogênio e progesterona. Caminho do óvulo: ovário → tuba uterina → útero.

Resumo rápido: Nervoso: controla e coordena (cérebro e medula). Digestório: digere e absorve (estômago e intestinos). Urinário: filtra e elimina (rins). Genital masculino: produz espermatozoides (testículos). Genital feminino: produz óvulos (ovários).

Dicas finais: identifique as estruturas nas imagens; decore os caminhos: sangue, alimento, urina e gametas; entenda as funções principais; saiba diferenciar os órgãos e suas localizações.`;

const ILUS_M2 = `Ilustração – Resumo completo para sua A1

Sistema Cardiovascular. Função: transportar sangue, oxigênio, nutrientes, hormônios e resíduos pelo corpo. Estruturas indicadas: veia cava superior, aorta, artéria pulmonar, átrio direito, átrio esquerdo, valva tricúspide, valva mitral, ventrículo direito, ventrículo esquerdo, veia cava inferior, artérias coronárias. Principais estruturas: coração com 4 cavidades (AD, VD, AE, VE); valvas tricúspide, pulmonar, mitral e aórtica; vasos sanguíneos: artérias, veias e capilares. Circulação sanguínea: pulmonar: coração → pulmões → coração; sistêmica: coração → corpo → coração. Pressão arterial: sistólica: contração do coração; diastólica: relaxamento. Camadas do coração: endocárdio, miocárdio, epicárdio.

Sistema Respiratório. Função: captar oxigênio (O₂) e eliminar gás carbônico (CO₂). Estruturas indicadas: laringe, traqueia, brônquio, bronquíolos, alvéolos (p. trocas gasosas), pulmão direito, pulmão esquerdo, diafragma. Principais órgãos: nariz e cavidade nasal: filtram, aquecem e umidificam o ar; faringe: passagem do ar; laringe: voz; traqueia: conduz o ar; brônquios: levam o ar aos pulmões; bronquíolos: ramificações menores; alvéolos: trocas gasosas; pulmões: respiram. Alvéolos pulmonares: é aqui que ocorre a hematose: O₂ vai para o sangue e CO₂ é eliminado. Como acontece a respiração? Inspiração: diafragma contrai e o ar entra. Expiração: diafragma relaxa e o ar sai.

Sistema Digestório. Função: digerir os alimentos, absorver nutrientes e eliminar resíduos. Estruturas indicadas: boca, faringe, esôfago, fígado, vesícula biliar, estômago, pâncreas, intestino grosso, intestino delgado, reto, ânus. Órgãos e funções: boca: mastigação; faringe: passagem; esôfago: conduz o alimento; estômago: mistura e digere (principalmente proteínas); intestino delgado: absorve nutrientes; intestino grosso: absorve água e forma as fezes; fígado: produz a bile; vesícula biliar: armazena a bile; pâncreas: produz enzimas digestivas. Partes do intestino delgado: duodeno: recebe bile e suco pancreático; jejuno: absorção de nutrientes; íleo: finaliza a absorção. Enzimas importantes: amilase: carboidratos; pepsina: proteínas; lipase: gorduras; tripsina: proteínas. Digestão: mecânica: mastigação e movimentos; química: enzimas e sucos digestivos. Caminho do alimento: boca → faringe → esôfago → estômago → duodeno → jejuno → íleo → intestino grosso → reto → ânus.

Dicas finais: memorize os nomes das estruturas; entenda as funções de cada órgão; faça desenhos para fixar; revise os caminhos (sangue, ar e alimento).`;

const chunks = (arr, labels) => arr.map((text, i) => ({ page: i + 1, label: labels[i], text }));

const materials = [
  {
    id: "m1",
    subjectId: "anatomia",
    title: "Apostila Anatomia A1",
    fileName: "Apostila_Anatomia_A1_Larissa.pdf",
    kind: "pdf",
    pageLabel: "p.",
    figures: [{ page: 1, img: "img/ilustracao-a1.jpg", caption: "Ilustração da apostila: Nervoso, Digestório, Urinário, Genital Masculino e Feminino" }],
    chunks: chunks(
      [pages.a1[0] + "\n\n" + ILUS_M1, ...pages.a1.slice(1)],
      ["p. 1 · capa e ilustração", "p. 2", "p. 3", "p. 4", "p. 5 · simulado", "p. 6 · gabarito"]
    ),
  },
  {
    id: "m2",
    subjectId: "anatomia",
    title: "Apostila Cardio, Respiratório e Digestório",
    fileName: "Apostila_A1_Cardiovascular_Respiratorio_Digestorio.pdf",
    kind: "pdf",
    pageLabel: "p.",
    figures: [{ page: 1, img: "img/ilustracao-a2.jpg", caption: "Ilustração da apostila: Cardiovascular, Respiratório e Digestório" }],
    chunks: chunks([pages.a2[0] + "\n\n" + ILUS_M2, ...pages.a2.slice(1)], ["p. 1 · capa e ilustração", "p. 2", "p. 3", "p. 4 · simulado", "p. 5 · gabarito"]),
  },
];

// ---------------------------------------------------------------------------
// Atlas: ilustrações recortadas por sistema, com as etiquetas da própria imagem.
// fn = função da estrutura segundo o texto da apostila (ou aviso quando o texto não descreve).
const FN = {
  "Cérebro": ["pensamento, memória, sentidos e movimentos voluntários", s("m1", 2)],
  "Cerebelo": ["equilíbrio, postura e coordenação", s("m1", 2)],
  "Tronco encefálico": ["funções vitais, como respiração e frequência cardíaca", s("m1", 2)],
  "Medula espinhal": ["conduz informações entre encéfalo e corpo e participa dos reflexos", s("m1", 2)],
  "Dendritos": ["recebem sinais", s("m1", 2)],
  "Corpo celular": ["contém o núcleo", s("m1", 2)],
  "Axônio": ["conduz o impulso", s("m1", 2)],
  "Bainha de mielina": ["facilita a condução do impulso", s("m1", 2)],
  "Boca": ["mastiga e mistura com saliva", s("m1", 2)],
  "Faringe": ["passagem", s("m1", 2)],
  "Esôfago": ["conduz o alimento ao estômago", s("m1", 2)],
  "Fígado": ["produz bile", s("m1", 2)],
  "Estômago": ["mistura e inicia principalmente a digestão de proteínas", s("m1", 2)],
  "Vesícula biliar": ["armazena e libera bile", s("m1", 2)],
  "Pâncreas": ["produz enzimas digestivas e bicarbonato, além dos hormônios insulina e glucagon", s("m1", 2)],
  "Intestino grosso": ["absorve água e forma fezes", s("m1", 2)],
  "Intestino delgado": ["digestão e absorção (duodeno, jejuno e íleo)", s("m1", 2)],
  "Reto": ["armazena fezes", s("m1", 2)],
  "Ânus": ["eliminação", s("m1", 2)],
  "Rim": ["filtra o sangue e produz urina", s("m1", 3)],
  "Ureter": ["leva a urina do rim até a bexiga", s("m1", 3)],
  "Bexiga urinária": ["armazena urina", s("m1", 3)],
  "Uretra": ["conduz a urina para fora (no homem, conduz urina ou sêmen, em momentos diferentes)", s("m1", 3)],
  "Vesículas seminais": ["produzem parte do líquido seminal", s("m1", 3)],
  "Ducto deferente": ["transporte dos espermatozoides", s("m1", 3)],
  "Próstata": ["secreção que compõe o sêmen", s("m1", 3)],
  "Epidídimo": ["maturação e armazenamento dos espermatozoides", s("m1", 3)],
  "Testículo": ["produz espermatozoides e testosterona", s("m1", 3)],
  "Pênis": ["órgão copulador", s("m1", 3)],
  "Tuba uterina": ["transporta o óvulo; local mais comum da fecundação", s("m1", 4)],
  "Ovário": ["produz óvulos, estrogênio e progesterona", s("m1", 4)],
  "Útero": ["local de desenvolvimento do embrião/feto", s("m1", 4)],
  "Colo do útero": ["porção inferior do útero", s("m1", 4)],
  "Vagina": ["canal que comunica o útero com o exterior", s("m1", 4)],
  "Vulva": ["genitais externos", s("m1", 4)],
  "Veia cava superior": ["traz o sangue do corpo para o átrio direito (veias cavas)", s("m2", 2)],
  "Veia cava inferior": ["traz o sangue do corpo para o átrio direito (veias cavas)", s("m2", 2)],
  "Aorta": ["leva o sangue do ventrículo esquerdo para o corpo", s("m2", 2)],
  "Artéria pulmonar": ["leva o sangue do ventrículo direito para os pulmões", s("m2", 2)],
  "Átrio direito": ["recebe sangue do corpo", s("m2", 2)],
  "Átrio esquerdo": ["recebe sangue dos pulmões", s("m2", 2)],
  "Valva tricúspide": ["entre átrio e ventrículo direitos; evita refluxo", s("m2", 2)],
  "Valva mitral": ["entre átrio e ventrículo esquerdos (também chamada bicúspide); evita refluxo", s("m2", 2)],
  "Ventrículo direito": ["envia sangue aos pulmões", s("m2", 2)],
  "Ventrículo esquerdo": ["envia sangue ao corpo", s("m2", 2)],
  "Artérias coronárias": ["aparecem só na ilustração; o texto da apostila não descreve a função delas", s("m2", 1)],
  "Laringe": ["passagem do ar e voz", s("m2", 2)],
  "Traqueia": ["conduz o ar", s("m2", 2)],
  "Brônquio": ["leva o ar aos pulmões", s("m2", 2)],
  "Bronquíolos": ["ramificações menores dos brônquios", s("m2", 2)],
  "Alvéolos": ["trocas gasosas (hematose)", s("m2", 2)],
  "Pulmão direito": ["tem três lobos", s("m2", 2)],
  "Pulmão esquerdo": ["tem dois lobos, deixando espaço para o coração", s("m2", 2)],
  "Diafragma": ["na inspiração contrai e desce; na expiração relaxa e sobe", s("m2", 2)],
};

const PLATES = [
  { id: "nervoso", topicId: "nervoso", m: "m1", title: "Sistema Nervoso" },
  { id: "cardiovascular", topicId: "cardiovascular", m: "m2", title: "Coração" },
  { id: "respiratorio", topicId: "respiratorio", m: "m2", title: "Sistema Respiratório" },
  { id: "digestorio-a1", topicId: "digestorio", m: "m1", title: "Sistema Digestório (apostila Anatomia A1)" },
  { id: "digestorio-a2", topicId: "digestorio", m: "m2", title: "Sistema Digestório (apostila Cardio/Resp/Dig)" },
  { id: "urinario", topicId: "urinario", m: "m1", title: "Sistema Urinário" },
  { id: "masculino", topicId: "masculino", m: "m1", title: "Sistema Genital Masculino" },
  { id: "feminino", topicId: "feminino", m: "m1", title: "Sistema Genital Feminino" },
];

const plates = PLATES.map((p) => {
  const raw = platesRaw[p.id];
  return {
    ...p,
    materialId: p.m,
    page: 1,
    img: `img/${p.id}.jpg`,
    w: raw.w,
    h: raw.h,
    labels: raw.labels.map((l) => {
      const [fn, src] = FN[l.name] || ["", null];
      // A função vem do texto da apostila; quando a estrutura é de outra apostila, a fonte acompanha.
      let fsrc = src;
      if (p.m === "m2" && src?.m === "m1" && p.topicId === "digestorio") fsrc = s("m2", 3);
      return { ...l, fn, src: fsrc };
    }),
  };
});

// ---------------------------------------------------------------------------
// Assuntos
const topics = [
  {
    id: "nervoso",
    title: "Sistema Nervoso",
    materialIds: ["m1"],
    importance: 3,
    minutes: 15,
    color: "lilac",
    thumb: "img/thumb-nervoso.jpg",
    plates: ["nervoso"],
    why: "Divisões (SNC × SNP), partes do encéfalo e o neurônio caem no simulado da apostila em 5 das 20 questões.",
    summary: {
      full: `O sistema nervoso recebe estímulos, processa informações e coordena respostas e funções do organismo.

Ele se divide em **Sistema Nervoso Central (SNC)**, formado por encéfalo e medula espinhal, e **Sistema Nervoso Periférico (SNP)**, formado por nervos e gânglios.

No encéfalo: o **cérebro** cuida de pensamento, memória, sentidos e movimentos voluntários; o **cerebelo**, de equilíbrio, postura e coordenação; o **tronco encefálico**, de funções vitais, como respiração e frequência cardíaca. A **medula espinhal** conduz informações entre encéfalo e corpo e participa dos reflexos.

O sistema **somático** cuida da sensibilidade e do controle voluntário; o **autônomo**, do controle involuntário. O autônomo tem o **simpático** (alerta, luta ou fuga) e o **parassimpático** (repouso e digestão).

No **neurônio**, os dendritos recebem sinais, o corpo celular contém o núcleo, o axônio conduz o impulso e a mielina facilita a condução.`,
      simple: `É a central de comando do corpo.

**Central (SNC)** = encéfalo + medula espinhal. **Periférico (SNP)** = nervos + gânglios.

Cérebro pensa e lembra. Cerebelo equilibra. Tronco encefálico mantém o básico da vida: respiração e batimentos.

No neurônio, os **dendritos recebem** sinais e o **axônio conduz** o impulso. A mielina facilita a condução.`,
    },
    concepts: [
      { term: "SNC", definition: "Sistema Nervoso Central: encéfalo e medula espinhal.", src: s("m1", 2) },
      { term: "SNP", definition: "Sistema Nervoso Periférico: nervos e gânglios.", src: s("m1", 2) },
      { term: "Cérebro", definition: "Pensamento, memória, sentidos e movimentos voluntários.", src: s("m1", 2) },
      { term: "Cerebelo", definition: "Equilíbrio, postura e coordenação.", src: s("m1", 2) },
      { term: "Tronco encefálico", definition: "Funções vitais, como respiração e frequência cardíaca.", src: s("m1", 2) },
      { term: "Medula espinhal", definition: "Conduz informações entre encéfalo e corpo e participa dos reflexos.", src: s("m1", 2) },
      { term: "Somático", definition: "Sensibilidade e controle voluntário.", src: s("m1", 2) },
      { term: "Autônomo", definition: "Controle involuntário. Divide-se em simpático e parassimpático.", src: s("m1", 2) },
      { term: "Simpático", definition: "Alerta / luta ou fuga.", src: s("m1", 2) },
      { term: "Parassimpático", definition: "Repouso e digestão.", src: s("m1", 2) },
      { term: "Neurônio", definition: "Dendritos recebem sinais; corpo celular contém núcleo; axônio conduz o impulso; mielina facilita a condução.", src: s("m1", 2) },
    ],
    keywords: ["SNC", "SNP", "encéfalo", "cérebro", "cerebelo", "tronco encefálico", "medula espinhal", "simpático", "parassimpático", "neurônio", "axônio", "dendritos", "mielina"],
    attention: [
      { text: "**Cérebro × cerebelo:** nomes parecidos, funções diferentes. Cerebelo é equilíbrio, postura e coordenação.", src: s("m1", 2) },
      { text: "Funções vitais (respiração, frequência cardíaca) são do **tronco encefálico**, não do cérebro.", src: s("m1", 2) },
      { text: "**Simpático** = alerta, luta ou fuga. **Parassimpático** = repouso e digestão. É fácil trocar.", src: s("m1", 2) },
      { text: "Nervos e gânglios são do **SNP**. O SNC é só encéfalo e medula espinhal.", src: s("m1", 2) },
      { text: "Dendritos **recebem**; axônio **conduz** o impulso.", src: s("m1", 2) },
    ],
    examples: [],
    comparisons: [
      { a: "SNC", b: "SNP", difference: "SNC: encéfalo e medula espinhal. SNP: nervos e gânglios.", src: s("m1", 2) },
      { a: "Cérebro", b: "Cerebelo", difference: "Cérebro: pensamento, memória, sentidos e movimentos voluntários. Cerebelo: equilíbrio, postura e coordenação.", src: s("m1", 2) },
      { a: "Somático", b: "Autônomo", difference: "Somático: sensibilidade e controle voluntário. Autônomo: controle involuntário.", src: s("m1", 2) },
      { a: "Simpático", b: "Parassimpático", difference: "Simpático: alerta, luta ou fuga. Parassimpático: repouso e digestão.", src: s("m1", 2) },
      { a: "Dendritos", b: "Axônio", difference: "Dendritos recebem sinais; o axônio conduz o impulso.", src: s("m1", 2) },
    ],
    memorize: [
      { text: "SNC = encéfalo + medula espinhal · SNP = nervos + gânglios", src: s("m1", 2) },
      { text: "Cérebro: pensar · Cerebelo: equilíbrio · Tronco encefálico: funções vitais", src: s("m1", 2) },
      { text: "Simpático: luta ou fuga · Parassimpático: repouso e digestão", src: s("m1", 2) },
      { text: "Neurônio: dendritos recebem · corpo celular contém o núcleo · axônio conduz · mielina facilita", src: s("m1", 2) },
    ],
    practice: ["Cérebro", "Cerebelo", "Tronco encefálico", "Medula espinhal", "Nervos", "Dendritos", "Corpo celular", "Axônio", "Bainha de mielina"],
    sources: [s("m1", 2), s("m1", 1)],
  },
  {
    id: "cardiovascular",
    title: "Sistema Cardiovascular",
    materialIds: ["m2"],
    importance: 3,
    minutes: 18,
    color: "rose",
    thumb: "img/thumb-cardiovascular.jpg",
    plates: ["cardiovascular"],
    why: "Cavidades, valvas, vasos e o caminho do sangue: o assunto mais detalhado da segunda apostila.",
    summary: {
      full: `O sistema cardiovascular transporta sangue, oxigênio, nutrientes e hormônios, ajuda a remover resíduos e a regular a temperatura.

O **coração** é uma bomba muscular com quatro cavidades: **átrio direito** (recebe sangue do corpo), **ventrículo direito** (envia sangue aos pulmões), **átrio esquerdo** (recebe sangue dos pulmões) e **ventrículo esquerdo** (envia sangue ao corpo).

As **valvas** evitam o refluxo: tricúspide (entre átrio e ventrículo direitos), pulmonar (saída do ventrículo direito), mitral ou bicúspide (entre átrio e ventrículo esquerdos) e aórtica (saída do ventrículo esquerdo).

**Artérias** levam sangue para fora do coração; **veias** levam o sangue de volta; **capilares** permitem trocas de gases, nutrientes e resíduos.

Circulação **pulmonar**: coração → pulmões → coração. **Sistêmica**: coração → corpo → coração.

Camadas: **endocárdio** (interna), **miocárdio** (muscular, que contrai) e **epicárdio** (externa). Pressão **sistólica**: durante a contração; **diastólica**: durante o relaxamento.`,
      simple: `O coração é uma bomba com 4 "salas": 2 átrios em cima, que **recebem**, e 2 ventrículos embaixo, que **enviam**.

Lado direito: cuida do sangue que vai para os pulmões. Lado esquerdo: do sangue que vai para o corpo.

As valvas são portinhas que **impedem o sangue de voltar**.

Artéria **sai** do coração, veia **volta** ao coração, capilar faz as **trocas**.`,
    },
    concepts: [
      { term: "Átrio direito", definition: "Recebe sangue do corpo.", src: s("m2", 2) },
      { term: "Ventrículo direito", definition: "Envia sangue aos pulmões.", src: s("m2", 2) },
      { term: "Átrio esquerdo", definition: "Recebe sangue dos pulmões.", src: s("m2", 2) },
      { term: "Ventrículo esquerdo", definition: "Envia sangue ao corpo.", src: s("m2", 2) },
      { term: "Valvas", definition: "Tricúspide, pulmonar, mitral/bicúspide e aórtica. Evitam refluxo sanguíneo.", src: s("m2", 2) },
      { term: "Artérias", definition: "Levam sangue para fora do coração.", src: s("m2", 2) },
      { term: "Veias", definition: "Levam sangue de volta ao coração.", src: s("m2", 2) },
      { term: "Capilares", definition: "Permitem trocas de gases, nutrientes e resíduos.", src: s("m2", 2) },
      { term: "Circulação pulmonar", definition: "Coração → pulmões → coração.", src: s("m2", 2) },
      { term: "Circulação sistêmica", definition: "Coração → corpo → coração.", src: s("m2", 2) },
      { term: "Miocárdio", definition: "Camada muscular do coração, que contrai.", src: s("m2", 2) },
      { term: "Pressão sistólica × diastólica", definition: "Sistólica: durante a contração do coração. Diastólica: durante o relaxamento.", src: s("m2", 2) },
    ],
    keywords: ["átrios", "ventrículos", "valvas", "tricúspide", "mitral", "aórtica", "pulmonar", "artérias", "veias", "capilares", "miocárdio", "sistólica", "diastólica"],
    attention: [
      { text: "**Artéria sai, veia volta:** a definição é pela direção em relação ao coração.", src: s("m2", 2) },
      { text: "**Tricúspide** fica do lado **direito**; **mitral (bicúspide)** do lado **esquerdo**.", src: s("m2", 2) },
      { text: "Valva **pulmonar** é a saída do ventrículo direito; valva **aórtica** é a saída do ventrículo esquerdo.", src: s("m2", 2) },
      { text: "A camada que contrai é o **miocárdio** (não endocárdio nem epicárdio).", src: s("m2", 2) },
      { text: "Sistólica = **contração**; diastólica = **relaxamento**.", src: s("m2", 2) },
    ],
    examples: [],
    comparisons: [
      { a: "Átrios", b: "Ventrículos", difference: "Átrios recebem sangue (direito: do corpo; esquerdo: dos pulmões). Ventrículos enviam (direito: aos pulmões; esquerdo: ao corpo).", src: s("m2", 2) },
      { a: "Artérias", b: "Veias", difference: "Artérias levam sangue para fora do coração; veias levam de volta. Capilares fazem as trocas.", src: s("m2", 2) },
      { a: "Circulação pulmonar", b: "Circulação sistêmica", difference: "Pulmonar: coração → pulmões → coração. Sistêmica: coração → corpo → coração.", src: s("m2", 2) },
      { a: "Sistólica", b: "Diastólica", difference: "Sistólica: pressão durante a contração. Diastólica: durante o relaxamento.", src: s("m2", 2) },
    ],
    memorize: [
      { text: "Caminho do sangue: corpo → veias cavas → átrio direito → valva tricúspide → ventrículo direito → valva pulmonar → artérias pulmonares → pulmões → veias pulmonares → átrio esquerdo → valva mitral → ventrículo esquerdo → valva aórtica → aorta → corpo", src: s("m2", 2) },
      { text: "Camadas: endocárdio (interna) · miocárdio (contrai) · epicárdio (externa)", src: s("m2", 2) },
      { text: "4 valvas: tricúspide, pulmonar, mitral/bicúspide, aórtica — evitam refluxo", src: s("m2", 2) },
    ],
    practice: ["Veia cava superior", "Veia cava inferior", "Aorta", "Artéria pulmonar", "Átrio direito", "Átrio esquerdo", "Ventrículo direito", "Ventrículo esquerdo", "Valva tricúspide", "Valva mitral"],
    sources: [s("m2", 2), s("m2", 1)],
  },
  {
    id: "respiratorio",
    title: "Sistema Respiratório",
    materialIds: ["m2"],
    importance: 3,
    minutes: 12,
    color: "violet",
    thumb: "img/thumb-respiratorio.jpg",
    plates: ["respiratorio"],
    why: "Caminho do ar, hematose, diafragma e lobos dos pulmões: 5 das 15 questões do simulado da apostila.",
    summary: {
      full: `O sistema respiratório capta oxigênio (O₂), elimina gás carbônico (CO₂) e participa do equilíbrio do pH.

**Nariz/cavidade nasal** filtram, aquecem e umidificam o ar. **Faringe**: passagem do ar. **Laringe**: passagem do ar e voz. **Traqueia**: conduz o ar. **Brônquios**: levam o ar aos pulmões. **Bronquíolos**: ramificações menores. **Alvéolos**: trocas gasosas.

**Hematose:** nos alvéolos, o oxigênio passa para o sangue e o gás carbônico passa do sangue para os alvéolos, para ser expirado.

**Inspiração:** o diafragma contrai e desce, permitindo a entrada de ar. **Expiração:** o diafragma relaxa e sobe, favorecendo a saída de ar.

O pulmão **direito** tem três lobos; o **esquerdo**, dois, deixando espaço para o coração.`,
      simple: `O ar faz uma viagem: **nariz → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos**.

Nos alvéolos acontece a **hematose**: o O₂ entra no sangue e o CO₂ sai.

Diafragma **contrai e desce** → ar entra. **Relaxa e sobe** → ar sai.

Pulmão direito: **3** lobos. Esquerdo: **2** (sobra espaço para o coração).`,
    },
    concepts: [
      { term: "Nariz / cavidade nasal", definition: "Filtram, aquecem e umidificam o ar.", src: s("m2", 2) },
      { term: "Laringe", definition: "Passagem do ar e voz.", src: s("m2", 2) },
      { term: "Traqueia", definition: "Conduz ar.", src: s("m2", 2) },
      { term: "Brônquios", definition: "Levam ar aos pulmões.", src: s("m2", 2) },
      { term: "Bronquíolos", definition: "Ramificações menores.", src: s("m2", 2) },
      { term: "Alvéolos", definition: "Trocas gasosas.", src: s("m2", 2) },
      { term: "Hematose", definition: "Nos alvéolos, o O₂ passa para o sangue e o CO₂ passa do sangue para os alvéolos, para ser expirado.", src: s("m2", 2) },
      { term: "Inspiração", definition: "Diafragma contrai e desce, permitindo a entrada de ar.", src: s("m2", 2) },
      { term: "Expiração", definition: "Diafragma relaxa e sobe, favorecendo a saída de ar.", src: s("m2", 2) },
    ],
    keywords: ["O₂", "CO₂", "laringe", "traqueia", "brônquios", "bronquíolos", "alvéolos", "hematose", "diafragma", "lobos"],
    attention: [
      { text: "Hematose acontece nos **alvéolos**, não nos brônquios.", src: s("m2", 2) },
      { text: "Na **inspiração** o diafragma **contrai e desce**; na expiração **relaxa e sobe**.", src: s("m2", 2) },
      { text: "Direito = **3** lobos; esquerdo = **2**.", src: s("m2", 2) },
      { text: "Laringe é **passagem do ar e voz**; faringe é só passagem.", src: s("m2", 2) },
    ],
    examples: [],
    comparisons: [
      { a: "Inspiração", b: "Expiração", difference: "Inspiração: diafragma contrai e desce, o ar entra. Expiração: diafragma relaxa e sobe, o ar sai.", src: s("m2", 2) },
      { a: "Pulmão direito", b: "Pulmão esquerdo", difference: "Direito: três lobos. Esquerdo: dois lobos, deixando espaço para o coração.", src: s("m2", 2) },
      { a: "Brônquios", b: "Bronquíolos", difference: "Brônquios levam o ar aos pulmões; bronquíolos são as ramificações menores.", src: s("m2", 2) },
    ],
    memorize: [
      { text: "Caminho do ar: nariz → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos", src: s("m2", 3) },
      { text: "Hematose: nos alvéolos (O₂ entra no sangue, CO₂ sai)", src: s("m2", 2) },
      { text: "Pulmão direito 3 lobos · esquerdo 2", src: s("m2", 2) },
    ],
    practice: ["Laringe", "Traqueia", "Brônquio", "Bronquíolos", "Alvéolos", "Pulmão direito", "Pulmão esquerdo", "Diafragma"],
    sources: [s("m2", 2), s("m2", 3)],
  },
  {
    id: "digestorio",
    title: "Sistema Digestório",
    materialIds: ["m1", "m2"],
    importance: 3,
    minutes: 18,
    color: "peach",
    thumb: "img/thumb-digestorio.jpg",
    plates: ["digestorio-a1", "digestorio-a2"],
    why: "Está nas duas apostilas e soma 10 questões nos simulados delas: o assunto com mais peso.",
    summary: {
      full: `O sistema digestório realiza a digestão dos alimentos, absorve nutrientes e elimina resíduos. Ele aparece nas duas apostilas, com o mesmo conteúdo.

**Órgãos:** boca (mastiga e mistura com saliva), faringe (passagem), esôfago (conduz ao estômago), estômago (mistura e inicia principalmente a digestão de proteínas), intestino delgado (digestão e absorção), intestino grosso (absorve água e forma fezes), reto (armazena fezes) e ânus (eliminação).

**Órgãos anexos:** fígado (produz bile), vesícula biliar (armazena e libera bile) e pâncreas (produz enzimas digestivas e bicarbonato, além dos hormônios insulina e glucagon).

**Intestino delgado:** duodeno (recebe bile e secreções pancreáticas), jejuno (absorve grande parte dos nutrientes) e íleo (continua a absorção).

**Enzimas:** amilase (carboidratos/amido), pepsina (proteínas, no estômago), lipase (gorduras) e tripsina (proteínas).

**Digestão mecânica:** quebra física, como mastigação e movimentos do estômago. **Química:** ação de enzimas e sucos digestivos (apostila Cardio/Resp/Dig).`,
      simple: `O alimento faz o caminho **boca → faringe → esôfago → estômago → duodeno → jejuno → íleo → intestino grosso → reto → ânus**.

O estômago começa a digerir **proteínas**. O intestino **delgado** absorve a maior parte dos nutrientes. O **grosso** absorve água e forma as fezes.

O **fígado produz** a bile e a **vesícula guarda**. O pâncreas faz enzimas e também insulina e glucagon.

Enzimas: **amilase** → amido · **pepsina** e **tripsina** → proteínas · **lipase** → gorduras.`,
    },
    concepts: [
      { term: "Estômago", definition: "Mistura e inicia principalmente a digestão de proteínas.", src: s("m1", 2) },
      { term: "Intestino delgado", definition: "Digestão e absorção. Partes: duodeno, jejuno e íleo.", src: s("m1", 2) },
      { term: "Intestino grosso", definition: "Absorve água e forma fezes.", src: s("m1", 2) },
      { term: "Fígado", definition: "Produz bile.", src: s("m1", 2) },
      { term: "Vesícula biliar", definition: "Armazena e libera bile.", src: s("m1", 2) },
      { term: "Pâncreas", definition: "Produz enzimas digestivas e bicarbonato, além dos hormônios insulina e glucagon.", src: s("m1", 2) },
      { term: "Duodeno", definition: "Recebe bile e secreções pancreáticas.", src: s("m1", 2) },
      { term: "Jejuno", definition: "Absorve grande parte dos nutrientes.", src: s("m1", 2) },
      { term: "Íleo", definition: "Continua a absorção.", src: s("m1", 2) },
      { term: "Amilase", definition: "Digere carboidratos/amido.", src: s("m1", 2) },
      { term: "Pepsina", definition: "Digere proteínas no estômago.", src: s("m1", 2) },
      { term: "Lipase", definition: "Digere gorduras.", src: s("m1", 2) },
      { term: "Tripsina", definition: "Digere proteínas.", src: s("m1", 2) },
      { term: "Digestão mecânica × química", definition: "Mecânica: quebra física (mastigação, movimentos do estômago). Química: ação de enzimas e sucos digestivos.", src: s("m2", 3) },
    ],
    keywords: ["bile", "fígado", "vesícula biliar", "pâncreas", "duodeno", "jejuno", "íleo", "amilase", "pepsina", "lipase", "tripsina", "absorção"],
    attention: [
      { text: "**Fígado produz** a bile; **vesícula biliar armazena e libera**. Cai nos simulados das duas apostilas.", src: s("m1", 2) },
      { text: "Quem absorve a maior parte dos nutrientes é o **intestino delgado**; o grosso absorve **água**.", src: s("m1", 2) },
      { text: "**Pepsina e tripsina** digerem proteínas; amilase é amido/carboidratos; lipase é gordura.", src: s("m1", 2) },
      { text: "O pâncreas também produz **hormônios**: insulina e glucagon.", src: s("m1", 2) },
      { text: "Ordem do intestino delgado: **duodeno → jejuno → íleo**.", src: s("m1", 2) },
    ],
    examples: [],
    comparisons: [
      { a: "Fígado", b: "Vesícula biliar", difference: "Fígado produz bile; vesícula biliar armazena e libera bile.", src: s("m1", 2) },
      { a: "Intestino delgado", b: "Intestino grosso", difference: "Delgado: digestão e absorção de nutrientes. Grosso: absorve água e forma fezes.", src: s("m1", 2) },
      { a: "Digestão mecânica", b: "Digestão química", difference: "Mecânica: quebra física, como mastigação e movimentos do estômago. Química: ação de enzimas e sucos digestivos.", src: s("m2", 3) },
    ],
    memorize: [
      { text: "Caminho do alimento: boca → faringe → esôfago → estômago → duodeno → jejuno → íleo → intestino grosso → reto → ânus", src: s("m1", 2) },
      { text: "Amilase: amido · Pepsina: proteínas (estômago) · Lipase: gorduras · Tripsina: proteínas", src: s("m1", 2) },
      { text: "Anexos: fígado (produz bile), vesícula (armazena), pâncreas (enzimas, bicarbonato, insulina, glucagon)", src: s("m1", 2) },
    ],
    practice: ["Esôfago", "Estômago", "Fígado", "Vesícula biliar", "Pâncreas", "Intestino delgado", "Intestino grosso", "Reto", "Ânus"],
    sources: [s("m1", 2), s("m2", 3)],
  },
  {
    id: "urinario",
    title: "Sistema Urinário",
    materialIds: ["m1"],
    importance: 2,
    minutes: 10,
    color: "amber",
    thumb: "img/thumb-urinario.jpg",
    plates: ["urinario"],
    why: "Néfron, formação da urina e a diferença ureter × uretra: 5 das 20 questões do simulado da apostila.",
    summary: {
      full: `O sistema urinário filtra o sangue, forma e elimina a urina e ajuda a regular água, eletrólitos e equilíbrio ácido-base.

**Rins** filtram o sangue e produzem urina. **Ureteres** levam a urina até a bexiga. **Bexiga** armazena urina. **Uretra** conduz a urina para fora.

No rim: **córtex** (região externa), **medula** (região interna), **pelve renal** (coleta a urina para o ureter) e **néfron** (unidade funcional).

No néfron, o **glomérulo** faz a filtração e os **túbulos** fazem a reabsorção de substâncias úteis e a secreção de substâncias.

A urina se forma em três etapas: **filtração, reabsorção e secreção**.`,
      simple: `O rim é o filtro do sangue. A urina faz o caminho **rins → ureteres → bexiga → uretra → exterior**.

**Ureter** (com "e") liga o rim à bexiga. **Uretra** leva a urina para fora.

A unidade que trabalha dentro do rim é o **néfron**: filtra (glomérulo), reabsorve e secreta (túbulos).`,
    },
    concepts: [
      { term: "Rins", definition: "Filtram sangue e produzem urina.", src: s("m1", 3) },
      { term: "Ureteres", definition: "Levam urina até a bexiga.", src: s("m1", 3) },
      { term: "Bexiga", definition: "Armazena urina.", src: s("m1", 3) },
      { term: "Uretra", definition: "Conduz urina para fora.", src: s("m1", 3) },
      { term: "Córtex renal", definition: "Região externa do rim.", src: s("m1", 3) },
      { term: "Medula renal", definition: "Região interna do rim.", src: s("m1", 3) },
      { term: "Pelve renal", definition: "Coleta urina para o ureter.", src: s("m1", 3) },
      { term: "Néfron", definition: "Unidade funcional do rim.", src: s("m1", 3) },
      { term: "Glomérulo", definition: "Filtração.", src: s("m1", 3) },
      { term: "Túbulos", definition: "Reabsorção de substâncias úteis e secreção de substâncias.", src: s("m1", 3) },
    ],
    keywords: ["rins", "ureteres", "bexiga", "uretra", "néfron", "glomérulo", "túbulos", "filtração", "reabsorção", "secreção", "pelve renal"],
    attention: [
      { text: "**Ureter** leva do rim até a bexiga; **uretra** leva da bexiga para fora. Cuidado para não trocar.", src: s("m1", 3) },
      { text: "Unidade funcional do rim = **néfron**.", src: s("m1", 3) },
      { text: "Glomérulo **filtra**; túbulos **reabsorvem e secretam**.", src: s("m1", 3) },
      { text: "Córtex é **externo**, medula é **interna**.", src: s("m1", 3) },
    ],
    examples: [],
    comparisons: [
      { a: "Ureter", b: "Uretra", difference: "Ureteres levam urina até a bexiga; uretra conduz urina para fora.", src: s("m1", 3) },
      { a: "Córtex renal", b: "Medula renal", difference: "Córtex: região externa. Medula: região interna.", src: s("m1", 3) },
      { a: "Glomérulo", b: "Túbulos", difference: "Glomérulo: filtração. Túbulos: reabsorção de substâncias úteis e secreção de substâncias.", src: s("m1", 3) },
    ],
    memorize: [
      { text: "Caminho da urina: rins → ureteres → bexiga → uretra → exterior", src: s("m1", 3) },
      { text: "Formação da urina: filtração, reabsorção e secreção", src: s("m1", 3) },
      { text: "Rim: córtex (externo), medula (interna), pelve renal (coleta), néfron (unidade funcional)", src: s("m1", 3) },
    ],
    practice: ["Rins", "Córtex renal", "Medula renal", "Pelve renal", "Ureteres", "Bexiga", "Uretra"],
    sources: [s("m1", 3)],
  },
  {
    id: "masculino",
    title: "Sistema Genital Masculino",
    materialIds: ["m1"],
    importance: 2,
    minutes: 10,
    color: "sky",
    thumb: "img/thumb-masculino.jpg",
    plates: ["masculino"],
    why: "Testículo, epidídimo e o caminho do espermatozoide caem no simulado da apostila.",
    summary: {
      full: `O sistema genital masculino produz espermatozoides e hormônios sexuais e permite a reprodução.

**Testículos** produzem espermatozoides e testosterona. **Epidídimo**: maturação e armazenamento. **Ducto deferente**: transporte. **Vesículas seminais**: produzem parte do líquido seminal. **Próstata**: secreção que compõe o sêmen. **Uretra**: conduz urina ou sêmen, em momentos diferentes. **Pênis**: órgão copulador. **Escroto**: protege os testículos e ajuda a regular a temperatura.

Caminho do espermatozoide: testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra → exterior.

**Testosterona:** participa das características sexuais masculinas e da produção de espermatozoides.`,
      simple: `Fábrica: **testículos** (espermatozoides + testosterona). Amadurece e guarda: **epidídimo**. Estrada: **ducto deferente**.

O líquido do sêmen vem em parte das **vesículas seminais** e da **próstata**.

Caminho: **testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra**.`,
    },
    concepts: [
      { term: "Testículos", definition: "Produzem espermatozoides e testosterona.", src: s("m1", 3) },
      { term: "Epidídimo", definition: "Maturação e armazenamento (dos espermatozoides).", src: s("m1", 3) },
      { term: "Ducto deferente", definition: "Transporte.", src: s("m1", 3) },
      { term: "Vesículas seminais", definition: "Produzem parte do líquido seminal.", src: s("m1", 3) },
      { term: "Próstata", definition: "Secreção que compõe o sêmen.", src: s("m1", 3) },
      { term: "Uretra", definition: "Conduz urina ou sêmen, em momentos diferentes.", src: s("m1", 3) },
      { term: "Escroto", definition: "Protege os testículos e ajuda a regular a temperatura.", src: s("m1", 3) },
      { term: "Testosterona", definition: "Participa das características sexuais masculinas e da produção de espermatozoides.", src: s("m1", 3) },
    ],
    keywords: ["testículos", "testosterona", "epidídimo", "ducto deferente", "vesículas seminais", "próstata", "uretra", "escroto"],
    attention: [
      { text: "Quem **produz** espermatozoides são os **testículos**; o epidídimo faz **maturação e armazenamento**.", src: s("m1", 3) },
      { text: "Próstata e vesículas seminais fazem **secreções do sêmen**, não espermatozoides.", src: s("m1", 3) },
      { text: "Na ordem do caminho, o **epidídimo vem antes** do ducto deferente.", src: s("m1", 3) },
    ],
    examples: [],
    comparisons: [
      { a: "Testículo", b: "Epidídimo", difference: "Testículo produz espermatozoides e testosterona; epidídimo faz maturação e armazenamento.", src: s("m1", 3) },
      { a: "Vesículas seminais", b: "Próstata", difference: "Vesículas seminais: produzem parte do líquido seminal. Próstata: secreção que compõe o sêmen.", src: s("m1", 3) },
    ],
    memorize: [
      { text: "Caminho do espermatozoide: testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra → exterior", src: s("m1", 3) },
      { text: "Testosterona: características sexuais masculinas + produção de espermatozoides", src: s("m1", 3) },
    ],
    practice: ["Testículos", "Epidídimo", "Ducto deferente", "Vesículas seminais", "Próstata", "Uretra", "Pênis", "Escroto"],
    sources: [s("m1", 3)],
  },
  {
    id: "feminino",
    title: "Sistema Genital Feminino",
    materialIds: ["m1"],
    importance: 2,
    minutes: 10,
    color: "pink",
    thumb: "img/thumb-feminino.jpg",
    plates: ["feminino"],
    why: "Ovários, tubas (fecundação) e endométrio fecham o simulado da apostila.",
    summary: {
      full: `O sistema genital feminino produz óvulos e hormônios sexuais e possibilita a gestação.

**Ovários** produzem óvulos, estrogênio e progesterona. **Tubas uterinas** transportam o óvulo e são o local mais comum da fecundação. **Útero**: local de desenvolvimento do embrião/feto. **Endométrio**: revestimento interno uterino. **Colo uterino**: porção inferior do útero. **Vagina**: canal que comunica o útero com o exterior. **Vulva**: genitais externos.

**Estrogênio** participa do desenvolvimento sexual e do ciclo menstrual. **Progesterona** prepara e ajuda a manter o endométrio.

Caminho: ovário → tuba uterina → útero.`,
      simple: `**Ovário** faz os óvulos e os hormônios (estrogênio e progesterona).

O óvulo segue **ovário → tuba uterina → útero**. A fecundação costuma acontecer na **tuba uterina**.

O **endométrio** é o "forro" de dentro do útero; a progesterona prepara e mantém esse forro.`,
    },
    concepts: [
      { term: "Ovários", definition: "Produzem óvulos, estrogênio e progesterona.", src: s("m1", 4) },
      { term: "Tubas uterinas", definition: "Transportam o óvulo; local mais comum da fecundação.", src: s("m1", 4) },
      { term: "Útero", definition: "Local de desenvolvimento do embrião/feto.", src: s("m1", 4) },
      { term: "Endométrio", definition: "Revestimento interno uterino.", src: s("m1", 4) },
      { term: "Colo uterino", definition: "Porção inferior do útero.", src: s("m1", 4) },
      { term: "Vagina", definition: "Canal que comunica o útero com o exterior.", src: s("m1", 4) },
      { term: "Vulva", definition: "Genitais externos.", src: s("m1", 4) },
      { term: "Estrogênio", definition: "Participa do desenvolvimento sexual e do ciclo menstrual.", src: s("m1", 4) },
      { term: "Progesterona", definition: "Prepara e ajuda a manter o endométrio.", src: s("m1", 4) },
    ],
    keywords: ["ovários", "óvulos", "tubas uterinas", "fecundação", "útero", "endométrio", "colo uterino", "vagina", "vulva", "estrogênio", "progesterona"],
    attention: [
      { text: "A fecundação ocorre mais comumente na **tuba uterina**, não no útero.", src: s("m1", 4) },
      { text: "**Progesterona** prepara e mantém o endométrio; **estrogênio** participa do desenvolvimento sexual e do ciclo menstrual.", src: s("m1", 4) },
      { text: "Endométrio é o **revestimento interno** do útero; colo uterino é a **porção inferior**.", src: s("m1", 4) },
    ],
    examples: [],
    comparisons: [
      { a: "Estrogênio", b: "Progesterona", difference: "Estrogênio: desenvolvimento sexual e ciclo menstrual. Progesterona: prepara e ajuda a manter o endométrio.", src: s("m1", 4) },
      { a: "Útero", b: "Endométrio", difference: "Útero: local de desenvolvimento do embrião/feto. Endométrio: revestimento interno do útero.", src: s("m1", 4) },
    ],
    memorize: [
      { text: "Caminho: ovário → tuba uterina → útero", src: s("m1", 4) },
      { text: "Fecundação: tuba uterina (local mais comum)", src: s("m1", 4) },
    ],
    practice: ["Ovários", "Tubas uterinas", "Útero", "Endométrio", "Colo do útero", "Vagina", "Vulva"],
    sources: [s("m1", 4), s("m1", 3)],
  },
];
topics.forEach((t, i) => (t.order = i));

// ---------------------------------------------------------------------------
// Questões. "official" = questão do simulado da apostila, com resposta do gabarito.
let qn = 0;
const Q = (topicId, type, prompt, data) => ({ id: `q${++qn}`, topicId, type, prompt, ...data });
const G1 = (n) => s("m1", 6, null); // gabarito apostila 1
const G2 = (n) => s("m2", 5, null);

const questions = [
  // ---- Nervoso
  Q("nervoso", "open", "Quais estruturas formam o Sistema Nervoso Central?", { answer: "Encéfalo e medula espinhal.", keyPoints: ["encéfalo", "medula espinhal"], explanation: "Questão 1 do simulado da apostila. Gabarito: encéfalo e medula espinhal. Nervos e gânglios são do SNP.", src: G1(1), official: "Apostila Anatomia A1 · questão 1" }),
  Q("nervoso", "mcq", "Quais estruturas formam o Sistema Nervoso Central (SNC)?", { options: ["Encéfalo e medula espinhal", "Nervos e gânglios", "Cérebro e nervos", "Medula espinhal e gânglios"], answer: 0, explanation: "SNC = encéfalo + medula espinhal. Nervos e gânglios formam o SNP.", src: s("m1", 2, "Sistema Nervoso Central (SNC): encéfalo e medula espinhal") }),
  Q("nervoso", "mcq", "Qual é a função principal do cerebelo?", { options: ["Coordenação dos movimentos, equilíbrio e postura", "Pensamento e memória", "Controle da respiração e da frequência cardíaca", "Conduzir informações entre encéfalo e corpo"], answer: 0, explanation: "Gabarito da questão 2: coordenação dos movimentos, equilíbrio e postura. Pensamento e memória são do cérebro.", src: s("m1", 2, "Cerebelo: equilíbrio, postura e coordenação"), official: "Apostila Anatomia A1 · questão 2" }),
  Q("nervoso", "cloze", "O ____ participa do controle de funções vitais, como respiração e frequência cardíaca.", { answer: ["tronco encefálico", "tronco cerebral"], explanation: "Gabarito da questão 3: tronco encefálico.", src: s("m1", 2, "Tronco encefálico: funções vitais, como respiração e frequência cardíaca"), official: "Apostila Anatomia A1 · questão 3" }),
  Q("nervoso", "open", "O que fazem os dendritos e o axônio de um neurônio?", { answer: "Dendritos recebem sinais; axônio conduz o impulso.", keyPoints: ["dendritos recebem sinais", "axônio conduz o impulso"], explanation: "Questão 4 do simulado da apostila.", src: G1(4), official: "Apostila Anatomia A1 · questão 4" }),
  Q("nervoso", "mcq", "Qual divisão do sistema autônomo está associada ao estado de alerta?", { options: ["Simpático", "Parassimpático", "Somático", "Sistema Nervoso Central"], answer: 0, explanation: "Gabarito da questão 5: sistema simpático (alerta / luta ou fuga). O parassimpático é repouso e digestão.", src: s("m1", 2, "Simpático: alerta/luta ou fuga"), official: "Apostila Anatomia A1 · questão 5" }),
  Q("nervoso", "tf", "O sistema parassimpático está associado ao estado de alerta (luta ou fuga).", { answer: false, explanation: "Falso. Alerta/luta ou fuga é o simpático; o parassimpático é repouso e digestão.", src: s("m1", 2, "Parassimpático: repouso e digestão") }),
  Q("nervoso", "tf", "Nervos e gânglios fazem parte do Sistema Nervoso Periférico.", { answer: true, explanation: "Verdadeiro. SNP: nervos e gânglios.", src: s("m1", 2, "Sistema Nervoso Periférico (SNP): nervos e gânglios") }),
  Q("nervoso", "tf", "O sistema somático é responsável pelo controle involuntário.", { answer: false, explanation: "Falso. Somático: sensibilidade e controle voluntário. O controle involuntário é do autônomo.", src: s("m1", 2, "Somático: sensibilidade e controle voluntário") }),
  Q("nervoso", "cloze", "A ____ espinhal conduz informações entre encéfalo e corpo e participa dos reflexos.", { answer: ["medula"], explanation: "Medula espinhal: conduz informações entre encéfalo e corpo e participa dos reflexos.", src: s("m1", 2, "Conduz informações entre encéfalo e corpo e participa dos reflexos") }),
  Q("nervoso", "match", "Associe cada parte do sistema nervoso à sua função.", { pairs: [{ left: "Cérebro", right: "Pensamento, memória e movimentos voluntários" }, { left: "Cerebelo", right: "Equilíbrio, postura e coordenação" }, { left: "Tronco encefálico", right: "Funções vitais (respiração, frequência cardíaca)" }, { left: "Medula espinhal", right: "Conduz informações e participa dos reflexos" }], explanation: "Todas as funções estão em \"Estruturas do encéfalo\" e \"Medula espinhal\".", src: s("m1", 2) }),
  Q("nervoso", "match", "Associe cada parte do neurônio ao que ela faz.", { pairs: [{ left: "Dendritos", right: "Recebem sinais" }, { left: "Corpo celular", right: "Contém o núcleo" }, { left: "Axônio", right: "Conduz o impulso" }, { left: "Mielina", right: "Facilita a condução" }], explanation: "Dendritos recebem sinais; corpo celular contém núcleo; axônio conduz o impulso; mielina facilita a condução.", src: s("m1", 2, "Dendritos recebem sinais; corpo celular contém núcleo; axônio conduz o impulso") }),

  // ---- Cardiovascular
  Q("cardiovascular", "open", "Quais são as quatro cavidades do coração?", { answer: "Átrio direito, ventrículo direito, átrio esquerdo e ventrículo esquerdo.", keyPoints: ["átrio direito", "ventrículo direito", "átrio esquerdo", "ventrículo esquerdo"], explanation: "Questão 1 do simulado da apostila.", src: G2(1), official: "Apostila Cardio/Resp/Dig · questão 1" }),
  Q("cardiovascular", "mcq", "Qual é a função das valvas cardíacas?", { options: ["Impedir o refluxo do sangue", "Produzir a contração do coração", "Realizar as trocas de gases", "Levar sangue para fora do coração"], answer: 0, explanation: "Gabarito da questão 2: impedir o refluxo do sangue.", src: s("m2", 2, "Evitam refluxo sanguíneo"), official: "Apostila Cardio/Resp/Dig · questão 2" }),
  Q("cardiovascular", "match", "Diferencie artérias, veias e capilares.", { pairs: [{ left: "Artérias", right: "Levam sangue para fora do coração" }, { left: "Veias", right: "Levam sangue de volta ao coração" }, { left: "Capilares", right: "Permitem trocas de gases, nutrientes e resíduos" }], explanation: "Questão 3 do simulado da apostila.", src: s("m2", 2, "Artérias levam sangue para fora do coração; veias levam sangue de volta"), official: "Apostila Cardio/Resp/Dig · questão 3" }),
  Q("cardiovascular", "open", "Diferencie circulação pulmonar e circulação sistêmica.", { answer: "Pulmonar: coração – pulmões – coração. Sistêmica: coração – corpo – coração.", keyPoints: ["pulmonar: coração → pulmões → coração", "sistêmica: coração → corpo → coração"], explanation: "Questão 4 do simulado da apostila.", src: G2(4), official: "Apostila Cardio/Resp/Dig · questão 4" }),
  Q("cardiovascular", "mcq", "Qual camada do coração é responsável pela contração muscular?", { options: ["Miocárdio", "Endocárdio", "Epicárdio"], answer: 0, explanation: "Gabarito da questão 5: miocárdio, a camada muscular que contrai. Endocárdio é a interna e epicárdio, a externa.", src: s("m2", 2, "Miocárdio: camada muscular que contrai"), official: "Apostila Cardio/Resp/Dig · questão 5" }),
  Q("cardiovascular", "mcq", "Qual cavidade do coração envia sangue ao corpo?", { options: ["Ventrículo esquerdo", "Ventrículo direito", "Átrio esquerdo", "Átrio direito"], answer: 0, explanation: "Ventrículo esquerdo envia sangue ao corpo; o direito envia aos pulmões.", src: s("m2", 2, "ventrículo esquerdo (envia sangue ao corpo)") }),
  Q("cardiovascular", "mcq", "Qual valva fica entre o átrio e o ventrículo esquerdos?", { options: ["Mitral (bicúspide)", "Tricúspide", "Pulmonar", "Aórtica"], answer: 0, explanation: "Mitral/bicúspide: entre átrio e ventrículo esquerdos. A tricúspide fica do lado direito.", src: s("m2", 2, "Mitral/bicúspide: entre átrio e ventrículo esquerdos") }),
  Q("cardiovascular", "tf", "As veias levam o sangue para fora do coração.", { answer: false, explanation: "Falso. Artérias levam para fora; veias levam o sangue de volta.", src: s("m2", 2, "veias levam sangue de volta") }),
  Q("cardiovascular", "tf", "A pressão sistólica é a pressão durante o relaxamento do coração.", { answer: false, explanation: "Falso. Sistólica: durante a contração. Diastólica: durante o relaxamento.", src: s("m2", 2, "Sistólica: pressão durante a contração do coração") }),
  Q("cardiovascular", "tf", "O átrio esquerdo recebe o sangue que vem dos pulmões.", { answer: true, explanation: "Verdadeiro. Átrio esquerdo recebe sangue dos pulmões (pelas veias pulmonares).", src: s("m2", 2, "átrio esquerdo (recebe sangue dos pulmões)") }),
  Q("cardiovascular", "cloze", "O ____ é a camada interna do coração.", { answer: ["endocárdio"], explanation: "Endocárdio: interna. Miocárdio: muscular. Epicárdio: externa.", src: s("m2", 2, "Endocárdio: camada interna") }),
  Q("cardiovascular", "match", "Associe cada valva à sua localização.", { pairs: [{ left: "Tricúspide", right: "Entre átrio e ventrículo direitos" }, { left: "Pulmonar", right: "Saída do ventrículo direito" }, { left: "Mitral", right: "Entre átrio e ventrículo esquerdos" }, { left: "Aórtica", right: "Saída do ventrículo esquerdo" }], explanation: "As quatro valvas evitam o refluxo do sangue.", src: s("m2", 2, "Tricúspide: entre átrio e ventrículo direitos") }),
  Q("cardiovascular", "order", "Coloque em ordem a primeira metade do caminho do sangue (do corpo até os pulmões).", { items: ["Corpo", "Veias cavas", "Átrio direito", "Valva tricúspide", "Ventrículo direito", "Valva pulmonar", "Artérias pulmonares", "Pulmões"], explanation: "Corpo → veias cavas → átrio direito → valva tricúspide → ventrículo direito → valva pulmonar → artérias pulmonares → pulmões.", src: s("m2", 2, "Corpo → veias cavas → átrio direito → valva tricúspide → ventrículo direito") }),
  Q("cardiovascular", "order", "Coloque em ordem a segunda metade do caminho do sangue (dos pulmões até o corpo).", { items: ["Pulmões", "Veias pulmonares", "Átrio esquerdo", "Valva mitral", "Ventrículo esquerdo", "Valva aórtica", "Aorta", "Corpo"], explanation: "Pulmões → veias pulmonares → átrio esquerdo → valva mitral → ventrículo esquerdo → valva aórtica → aorta → corpo.", src: s("m2", 2, "veias pulmonares → átrio esquerdo → valva mitral → ventrículo esquerdo") }),

  // ---- Respiratório
  Q("respiratorio", "mcq", "Qual é a função principal do sistema respiratório?", { options: ["Captar O₂ e eliminar CO₂", "Transportar nutrientes e hormônios", "Filtrar o sangue e formar urina", "Produzir bile"], answer: 0, explanation: "Gabarito da questão 6: captar O₂ e eliminar CO₂. A apostila também cita a participação no equilíbrio do pH.", src: s("m2", 2, "captar oxigênio (O₂), eliminar gás carbônico (CO₂)"), official: "Apostila Cardio/Resp/Dig · questão 6" }),
  Q("respiratorio", "mcq", "Onde ocorre a hematose?", { options: ["Nos alvéolos pulmonares", "Na traqueia", "Nos brônquios", "Na laringe"], answer: 0, explanation: "Gabarito da questão 7: nos alvéolos pulmonares.", src: s("m2", 2, "Nos alvéolos, o oxigênio passa para o sangue"), official: "Apostila Cardio/Resp/Dig · questão 7" }),
  Q("respiratorio", "open", "Qual é a função do diafragma na inspiração?", { answer: "Contrai e desce, aumentando o espaço torácico e favorecendo a entrada de ar.", keyPoints: ["contrai", "desce", "o ar entra"], explanation: "Questão 8 do simulado da apostila.", src: G2(8), official: "Apostila Cardio/Resp/Dig · questão 8" }),
  Q("respiratorio", "mcq", "Quantos lobos possui o pulmão direito e quantos o esquerdo?", { options: ["Direito: 3 · Esquerdo: 2", "Direito: 2 · Esquerdo: 3", "Os dois têm 3", "Os dois têm 2"], answer: 0, explanation: "Gabarito da questão 9: direito 3 lobos, esquerdo 2 (deixando espaço para o coração).", src: s("m2", 2, "Pulmão direito tem três lobos; esquerdo tem dois lobos"), official: "Apostila Cardio/Resp/Dig · questão 9" }),
  Q("respiratorio", "order", "Coloque em ordem o caminho do ar até os alvéolos.", { items: ["Nariz", "Faringe", "Laringe", "Traqueia", "Brônquios", "Bronquíolos", "Alvéolos"], explanation: "Gabarito da questão 10: nariz → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos.", src: s("m2", 3, "Nariz → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos"), official: "Apostila Cardio/Resp/Dig · questão 10" }),
  Q("respiratorio", "tf", "Na hematose, o gás carbônico passa do sangue para os alvéolos, para ser expirado.", { answer: true, explanation: "Verdadeiro. O O₂ passa para o sangue e o CO₂ passa do sangue para os alvéolos.", src: s("m2", 2, "o gás carbônico passa do sangue para os alvéolos") }),
  Q("respiratorio", "tf", "Na expiração, o diafragma contrai e desce.", { answer: false, explanation: "Falso. Na expiração o diafragma relaxa e sobe. Contrair e descer é na inspiração.", src: s("m2", 2, "Expiração: diafragma relaxa e sobe") }),
  Q("respiratorio", "mcq", "Qual órgão é responsável pela passagem do ar e pela voz?", { options: ["Laringe", "Faringe", "Traqueia", "Brônquios"], answer: 0, explanation: "Laringe: passagem do ar e voz. A faringe é só passagem.", src: s("m2", 2, "Laringe: passagem do ar e voz") }),
  Q("respiratorio", "match", "Associe cada estrutura à sua função.", { pairs: [{ left: "Cavidade nasal", right: "Filtra, aquece e umidifica o ar" }, { left: "Traqueia", right: "Conduz ar" }, { left: "Brônquios", right: "Levam ar aos pulmões" }, { left: "Alvéolos", right: "Trocas gasosas" }], explanation: "Funções listadas em \"Órgãos\" do sistema respiratório.", src: s("m2", 2) }),
  Q("respiratorio", "cloze", "Na inspiração, o diafragma ____ e desce, permitindo a entrada de ar.", { answer: ["contrai", "se contrai"], explanation: "Inspiração: diafragma contrai e desce. Expiração: relaxa e sobe.", src: s("m2", 2, "Inspiração: diafragma contrai e desce") }),

  // ---- Digestório
  Q("digestorio", "mcq", "Qual órgão realiza a maior parte da absorção dos nutrientes?", { options: ["Intestino delgado", "Intestino grosso", "Estômago", "Esôfago"], answer: 0, explanation: "Gabarito (Anatomia A1, questão 6, e Cardio/Resp/Dig, questão 11): intestino delgado. O grosso absorve água.", src: s("m1", 2, "Intestino delgado: digestão e absorção"), official: "Apostila Anatomia A1 · questão 6" }),
  Q("digestorio", "mcq", "Qual órgão produz a bile?", { options: ["Fígado", "Vesícula biliar", "Pâncreas", "Estômago"], answer: 0, explanation: "Gabarito da questão 7: fígado. A vesícula biliar só armazena e libera.", src: s("m1", 2, "Fígado: produz bile"), official: "Apostila Anatomia A1 · questão 7" }),
  Q("digestorio", "cloze", "A ____ biliar armazena e libera a bile.", { answer: ["vesícula"], explanation: "Gabarito da questão 8: vesícula biliar.", src: s("m1", 2, "Vesícula biliar: armazena e libera bile"), official: "Apostila Anatomia A1 · questão 8" }),
  Q("digestorio", "match", "Cite enzimas digestivas e o que elas digerem.", { pairs: [{ left: "Amilase", right: "Carboidratos / amido" }, { left: "Pepsina", right: "Proteínas (no estômago)" }, { left: "Lipase", right: "Gorduras" }, { left: "Tripsina", right: "Proteínas" }], explanation: "Questão 9 (Anatomia A1) e 13 (Cardio/Resp/Dig). Pepsina e tripsina digerem proteínas.", src: s("m1", 2, "Amilase: carboidratos/amido. Pepsina: proteínas no estômago."), official: "Apostila Anatomia A1 · questão 9" }),
  Q("digestorio", "order", "Ordene o trajeto do alimento desde a boca até o ânus.", { items: ["Boca", "Faringe", "Esôfago", "Estômago", "Duodeno", "Jejuno", "Íleo", "Intestino grosso", "Reto", "Ânus"], explanation: "Boca → faringe → esôfago → estômago → duodeno → jejuno → íleo → intestino grosso → reto → ânus. (O gabarito resume duodeno, jejuno e íleo como intestino delgado.)", src: s("m1", 2, "Boca → faringe → esôfago → estômago → duodeno → jejuno → íleo"), official: "Apostila Anatomia A1 · questão 10" }),
  Q("digestorio", "open", "Qual órgão produz a bile e qual a armazena?", { answer: "Fígado produz; vesícula biliar armazena.", keyPoints: ["fígado produz", "vesícula biliar armazena"], explanation: "Questão 12 do simulado da apostila Cardio/Resp/Dig.", src: G2(12), official: "Apostila Cardio/Resp/Dig · questão 12" }),
  Q("digestorio", "order", "Quais são as três partes do intestino delgado? Coloque na ordem do caminho do alimento.", { items: ["Duodeno", "Jejuno", "Íleo"], explanation: "Gabarito da questão 14: duodeno, jejuno e íleo.", src: s("m2", 3, "Duodeno: recebe bile e secreção pancreática. Jejuno: importante na absorção. Íleo: continua a absorção."), official: "Apostila Cardio/Resp/Dig · questão 14" }),
  Q("digestorio", "mcq", "O estômago inicia principalmente a digestão de quê?", { options: ["Proteínas", "Gorduras", "Amido", "Água"], answer: 0, explanation: "Estômago: mistura e inicia principalmente a digestão de proteínas (com a pepsina).", src: s("m1", 2, "Estômago: mistura e inicia principalmente a digestão de proteínas") }),
  Q("digestorio", "tf", "A vesícula biliar produz a bile.", { answer: false, explanation: "Falso. O fígado produz; a vesícula biliar armazena e libera.", src: s("m1", 2, "Fígado: produz bile. Vesícula biliar: armazena e libera bile.") }),
  Q("digestorio", "tf", "Além de enzimas digestivas e bicarbonato, o pâncreas produz os hormônios insulina e glucagon.", { answer: true, explanation: "Verdadeiro. Pâncreas: enzimas digestivas, bicarbonato, insulina e glucagon.", src: s("m1", 2, "Pâncreas: produz enzimas digestivas e bicarbonato, além dos hormônios insulina e glucagon") }),
  Q("digestorio", "tf", "O intestino grosso absorve água e forma as fezes.", { answer: true, explanation: "Verdadeiro.", src: s("m1", 2, "Intestino grosso: absorve água e forma fezes") }),
  Q("digestorio", "cloze", "O ____ recebe a bile e as secreções pancreáticas.", { answer: ["duodeno"], explanation: "Duodeno: recebe bile e secreções pancreáticas.", src: s("m1", 2, "Duodeno: recebe bile e secreções pancreáticas") }),
  Q("digestorio", "mcq", "A mastigação e os movimentos do estômago são exemplos de qual tipo de digestão?", { options: ["Mecânica", "Química"], answer: 0, explanation: "Digestão mecânica: quebra física, como mastigação e movimentos do estômago. Química: ação de enzimas e sucos digestivos.", src: s("m2", 3, "Mecânica: quebra física, como mastigação e movimentos do estômago") }),
  Q("digestorio", "match", "Associe cada órgão à sua função.", { pairs: [{ left: "Esôfago", right: "Conduz ao estômago" }, { left: "Reto", right: "Armazena fezes" }, { left: "Jejuno", right: "Absorve grande parte dos nutrientes" }, { left: "Ânus", right: "Eliminação" }], explanation: "Funções da lista de órgãos e do intestino delgado.", src: s("m1", 2) }),

  // ---- Urinário
  Q("urinario", "open", "Quais são os quatro órgãos principais do sistema urinário?", { answer: "Rins, ureteres, bexiga e uretra.", keyPoints: ["rins", "ureteres", "bexiga", "uretra"], explanation: "Questão 11 do simulado da apostila.", src: G1(11), official: "Apostila Anatomia A1 · questão 11" }),
  Q("urinario", "mcq", "Qual é a unidade funcional do rim?", { options: ["Néfron", "Glomérulo", "Pelve renal", "Córtex renal"], answer: 0, explanation: "Gabarito da questão 12: néfron. O glomérulo é uma parte do néfron (filtração).", src: s("m1", 3, "Néfron: unidade funcional"), official: "Apostila Anatomia A1 · questão 12" }),
  Q("urinario", "order", "Quais são os três processos básicos de formação da urina? Coloque na ordem da apostila.", { items: ["Filtração", "Reabsorção", "Secreção"], explanation: "Gabarito da questão 13: filtração, reabsorção e secreção.", src: s("m1", 3, "Filtração, reabsorção e secreção."), official: "Apostila Anatomia A1 · questão 13" }),
  Q("urinario", "mcq", "Qual estrutura transporta a urina do rim até a bexiga?", { options: ["Ureter", "Uretra", "Pelve renal", "Néfron"], answer: 0, explanation: "Gabarito da questão 14: ureter. A uretra leva a urina da bexiga para fora.", src: s("m1", 3, "Ureteres: levam urina até a bexiga"), official: "Apostila Anatomia A1 · questão 14" }),
  Q("urinario", "cloze", "A ____ urinária armazena a urina.", { answer: ["bexiga"], explanation: "Gabarito da questão 15: bexiga urinária.", src: s("m1", 3, "Bexiga: armazena urina"), official: "Apostila Anatomia A1 · questão 15" }),
  Q("urinario", "order", "Coloque em ordem o caminho da urina.", { items: ["Rins", "Ureteres", "Bexiga", "Uretra", "Exterior"], explanation: "Rins → ureteres → bexiga → uretra → exterior.", src: s("m1", 3, "Rins → ureteres → bexiga → uretra → exterior") }),
  Q("urinario", "match", "Associe cada estrutura do rim à sua descrição.", { pairs: [{ left: "Córtex", right: "Região externa" }, { left: "Medula", right: "Região interna" }, { left: "Pelve renal", right: "Coleta urina para o ureter" }, { left: "Néfron", right: "Unidade funcional" }], explanation: "Estruturas do rim, segundo a apostila.", src: s("m1", 3, "Córtex: região externa. Medula: região interna.") }),
  Q("urinario", "tf", "No néfron, o glomérulo é responsável pela reabsorção de substâncias úteis.", { answer: false, explanation: "Falso. Glomérulo: filtração. Túbulos: reabsorção e secreção.", src: s("m1", 3, "Glomérulo: filtração. Túbulos: reabsorção de substâncias úteis e secreção de substâncias.") }),
  Q("urinario", "tf", "Além de formar urina, o sistema urinário ajuda a regular água, eletrólitos e o equilíbrio ácido-base.", { answer: true, explanation: "Verdadeiro, está na função do sistema urinário.", src: s("m1", 3, "ajudar a regular água, eletrólitos e equilíbrio ácido-base") }),

  // ---- Masculino
  Q("masculino", "mcq", "Onde são produzidos os espermatozoides e a testosterona?", { options: ["Testículos", "Epidídimo", "Próstata", "Vesículas seminais"], answer: 0, explanation: "Gabarito da questão 16: testículos.", src: s("m1", 3, "Testículos: produzem espermatozoides e testosterona"), official: "Apostila Anatomia A1 · questão 16" }),
  Q("masculino", "open", "Qual é a função do epidídimo?", { answer: "Maturação e armazenamento dos espermatozoides.", keyPoints: ["maturação", "armazenamento"], explanation: "Questão 17 do simulado da apostila.", src: G1(17), official: "Apostila Anatomia A1 · questão 17" }),
  Q("masculino", "order", "Coloque em ordem o caminho do espermatozoide.", { items: ["Testículo", "Epidídimo", "Ducto deferente", "Ductos ejaculatórios", "Uretra", "Exterior"], explanation: "Testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra → exterior.", src: s("m1", 3, "Testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra → exterior") }),
  Q("masculino", "match", "Associe cada estrutura à sua função.", { pairs: [{ left: "Ducto deferente", right: "Transporte" }, { left: "Vesículas seminais", right: "Produzem parte do líquido seminal" }, { left: "Próstata", right: "Secreção que compõe o sêmen" }, { left: "Escroto", right: "Protege os testículos e regula a temperatura" }], explanation: "Estruturas do sistema genital masculino, segundo a apostila.", src: s("m1", 3) }),
  Q("masculino", "tf", "A próstata produz os espermatozoides.", { answer: false, explanation: "Falso. Os testículos produzem os espermatozoides; a próstata produz uma secreção que compõe o sêmen.", src: s("m1", 3, "Próstata: secreção que compõe o sêmen") }),
  Q("masculino", "tf", "A uretra masculina conduz urina ou sêmen, em momentos diferentes.", { answer: true, explanation: "Verdadeiro.", src: s("m1", 3, "Uretra: conduz urina ou sêmen, em momentos diferentes") }),
  Q("masculino", "cloze", "A ____ participa das características sexuais masculinas e da produção de espermatozoides.", { answer: ["testosterona"], explanation: "Testosterona: características sexuais masculinas e produção de espermatozoides.", src: s("m1", 3, "Testosterona: participa das características sexuais masculinas") }),

  // ---- Feminino
  Q("feminino", "mcq", "Qual estrutura do sistema genital feminino produz óvulos e hormônios?", { options: ["Ovários", "Útero", "Tubas uterinas", "Endométrio"], answer: 0, explanation: "Gabarito da questão 18: ovários (óvulos, estrogênio e progesterona).", src: s("m1", 4, "Ovários: produzem óvulos, estrogênio e progesterona"), official: "Apostila Anatomia A1 · questão 18" }),
  Q("feminino", "mcq", "Qual é o local mais comum da fecundação?", { options: ["Tuba uterina", "Útero", "Ovário", "Colo uterino"], answer: 0, explanation: "Gabarito da questão 19: tuba uterina.", src: s("m1", 4, "Tubas uterinas: transportam o óvulo; local mais comum da fecundação"), official: "Apostila Anatomia A1 · questão 19" }),
  Q("feminino", "open", "Qual é a função do endométrio?", { answer: "É o revestimento interno do útero, que se prepara para uma possível implantação do embrião.", keyPoints: ["revestimento interno do útero", "prepara para a implantação do embrião"], explanation: "Questão 20 do simulado da apostila.", src: G1(20), official: "Apostila Anatomia A1 · questão 20" }),
  Q("feminino", "order", "Coloque em ordem o caminho do óvulo.", { items: ["Ovário", "Tuba uterina", "Útero"], explanation: "Ovário → tuba uterina → útero.", src: s("m1", 4) }),
  Q("feminino", "match", "Associe cada estrutura à sua descrição.", { pairs: [{ left: "Útero", right: "Desenvolvimento do embrião/feto" }, { left: "Colo uterino", right: "Porção inferior do útero" }, { left: "Vagina", right: "Comunica o útero com o exterior" }, { left: "Vulva", right: "Genitais externos" }], explanation: "Estruturas do sistema genital feminino, segundo a apostila.", src: s("m1", 4) }),
  Q("feminino", "tf", "A progesterona prepara e ajuda a manter o endométrio.", { answer: true, explanation: "Verdadeiro.", src: s("m1", 4, "Progesterona: prepara e ajuda a manter o endométrio") }),
  Q("feminino", "tf", "A fecundação ocorre mais comumente no útero.", { answer: false, explanation: "Falso. O local mais comum é a tuba uterina; o útero é onde o embrião/feto se desenvolve.", src: s("m1", 4, "local mais comum da fecundação") }),
  Q("feminino", "cloze", "O ____ participa do desenvolvimento sexual e do ciclo menstrual.", { answer: ["estrogênio", "estrógeno"], explanation: "Estrogênio: desenvolvimento sexual e ciclo menstrual.", src: s("m1", 4, "Estrogênio: participa do desenvolvimento sexual e do ciclo menstrual") }),
];

// Questões de identificação nas imagens (prova prática). Uma por estrutura diferente de cada ilustração.
for (const p of plates) {
  const seen = new Set();
  p.labels.forEach((l, i) => {
    if (seen.has(l.name)) return;
    seen.add(l.name);
    // Alterna entre "qual é esta estrutura?" e "toque na estrutura".
    const ask = i % 2 === 0 ? "name" : "tap";
    questions.push({
      id: `spot-${l.id}`,
      topicId: p.topicId,
      type: "spot",
      plate: p.id,
      label: l.id,
      ask,
      prompt: ask === "name" ? "Qual estrutura a etiqueta destacada indica?" : `Toque na etiqueta que indica: ${l.name}`,
      explanation: l.fn ? `${l.name}: ${l.fn}.` : l.name,
      src: { m: p.materialId, p: 1 },
    });
  });
}

// ---------------------------------------------------------------------------
// Flashcards
let fn = 0;
const F = (topicId, front, back, explanation, src) => ({ id: `f${++fn}`, topicId, front, back, ...(explanation ? { explanation } : {}), src });
const flashcards = [
  F("nervoso", "O que forma o SNC?", "Encéfalo e medula espinhal.", "Nervos e gânglios são do SNP.", s("m1", 2)),
  F("nervoso", "O que forma o SNP?", "Nervos e gânglios.", null, s("m1", 2)),
  F("nervoso", "Cerebelo", "Equilíbrio, postura e coordenação.", "Não confundir com o cérebro.", s("m1", 2)),
  F("nervoso", "Tronco encefálico", "Funções vitais, como respiração e frequência cardíaca.", null, s("m1", 2)),
  F("nervoso", "Cérebro", "Pensamento, memória, sentidos e movimentos voluntários.", null, s("m1", 2)),
  F("nervoso", "Simpático × parassimpático", "Simpático: alerta, luta ou fuga. Parassimpático: repouso e digestão.", null, s("m1", 2)),
  F("nervoso", "Somático × autônomo", "Somático: sensibilidade e controle voluntário. Autônomo: controle involuntário.", null, s("m1", 2)),
  F("nervoso", "Dendritos × axônio", "Dendritos recebem sinais; axônio conduz o impulso.", "A mielina facilita a condução.", s("m1", 2)),
  F("cardiovascular", "As 4 cavidades do coração", "Átrio direito, ventrículo direito, átrio esquerdo e ventrículo esquerdo.", null, s("m2", 2)),
  F("cardiovascular", "Quem recebe sangue do corpo?", "Átrio direito.", "O átrio esquerdo recebe dos pulmões.", s("m2", 2)),
  F("cardiovascular", "Quem envia sangue ao corpo?", "Ventrículo esquerdo.", "O ventrículo direito envia aos pulmões.", s("m2", 2)),
  F("cardiovascular", "Função das valvas", "Evitar o refluxo sanguíneo.", "Tricúspide, pulmonar, mitral/bicúspide e aórtica.", s("m2", 2)),
  F("cardiovascular", "Tricúspide × mitral", "Tricúspide: entre átrio e ventrículo direitos. Mitral (bicúspide): entre átrio e ventrículo esquerdos.", null, s("m2", 2)),
  F("cardiovascular", "Artérias × veias × capilares", "Artérias levam para fora do coração; veias trazem de volta; capilares fazem as trocas.", null, s("m2", 2)),
  F("cardiovascular", "Circulação pulmonar × sistêmica", "Pulmonar: coração → pulmões → coração. Sistêmica: coração → corpo → coração.", null, s("m2", 2)),
  F("cardiovascular", "Camadas do coração", "Endocárdio (interna), miocárdio (muscular, contrai), epicárdio (externa).", null, s("m2", 2)),
  F("cardiovascular", "Pressão sistólica × diastólica", "Sistólica: durante a contração. Diastólica: durante o relaxamento.", null, s("m2", 2)),
  F("respiratorio", "Função do sistema respiratório", "Captar O₂ e eliminar CO₂ (e participar do equilíbrio do pH).", null, s("m2", 2)),
  F("respiratorio", "Onde ocorre a hematose?", "Nos alvéolos pulmonares.", "O₂ vai para o sangue; CO₂ sai do sangue para os alvéolos.", s("m2", 2)),
  F("respiratorio", "Caminho do ar", "Nariz → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos.", null, s("m2", 3)),
  F("respiratorio", "Diafragma na inspiração", "Contrai e desce, e o ar entra.", "Na expiração: relaxa e sobe.", s("m2", 2)),
  F("respiratorio", "Lobos dos pulmões", "Direito: 3. Esquerdo: 2.", "O esquerdo deixa espaço para o coração.", s("m2", 2)),
  F("respiratorio", "Cavidade nasal", "Filtra, aquece e umidifica o ar.", null, s("m2", 2)),
  F("respiratorio", "Laringe", "Passagem do ar e voz.", null, s("m2", 2)),
  F("digestorio", "Quem produz a bile?", "Fígado.", "A vesícula biliar armazena e libera.", s("m1", 2)),
  F("digestorio", "Quem armazena a bile?", "Vesícula biliar.", null, s("m1", 2)),
  F("digestorio", "Maior parte da absorção de nutrientes", "Intestino delgado.", "O intestino grosso absorve água.", s("m1", 2)),
  F("digestorio", "Partes do intestino delgado", "Duodeno, jejuno e íleo.", "Duodeno recebe bile e secreções pancreáticas.", s("m1", 2)),
  F("digestorio", "Amilase", "Carboidratos / amido.", null, s("m1", 2)),
  F("digestorio", "Pepsina e tripsina", "Proteínas.", "A pepsina age no estômago.", s("m1", 2)),
  F("digestorio", "Lipase", "Gorduras.", null, s("m1", 2)),
  F("digestorio", "Pâncreas", "Enzimas digestivas e bicarbonato, além de insulina e glucagon.", null, s("m1", 2)),
  F("digestorio", "Caminho do alimento", "Boca → faringe → esôfago → estômago → duodeno → jejuno → íleo → intestino grosso → reto → ânus.", null, s("m1", 2)),
  F("digestorio", "Digestão mecânica × química", "Mecânica: quebra física (mastigação, movimentos do estômago). Química: enzimas e sucos digestivos.", null, s("m2", 3)),
  F("urinario", "Unidade funcional do rim", "Néfron.", null, s("m1", 3)),
  F("urinario", "Formação da urina", "Filtração, reabsorção e secreção.", "Glomérulo filtra; túbulos reabsorvem e secretam.", s("m1", 3)),
  F("urinario", "Ureter × uretra", "Ureter: do rim até a bexiga. Uretra: da bexiga para fora.", null, s("m1", 3)),
  F("urinario", "Caminho da urina", "Rins → ureteres → bexiga → uretra → exterior.", null, s("m1", 3)),
  F("urinario", "Córtex × medula renal", "Córtex: região externa. Medula: região interna.", "Pelve renal coleta a urina para o ureter.", s("m1", 3)),
  F("masculino", "Onde se produzem espermatozoides e testosterona?", "Nos testículos.", null, s("m1", 3)),
  F("masculino", "Epidídimo", "Maturação e armazenamento dos espermatozoides.", null, s("m1", 3)),
  F("masculino", "Caminho do espermatozoide", "Testículo → epidídimo → ducto deferente → ductos ejaculatórios → uretra → exterior.", null, s("m1", 3)),
  F("masculino", "Próstata e vesículas seminais", "Produzem secreções do sêmen (líquido seminal).", null, s("m1", 3)),
  F("masculino", "Escroto", "Protege os testículos e ajuda a regular a temperatura.", null, s("m1", 3)),
  F("feminino", "Ovários", "Produzem óvulos, estrogênio e progesterona.", null, s("m1", 4)),
  F("feminino", "Local mais comum da fecundação", "Tuba uterina.", null, s("m1", 4)),
  F("feminino", "Endométrio", "Revestimento interno do útero.", "A progesterona prepara e ajuda a mantê-lo.", s("m1", 4)),
  F("feminino", "Estrogênio × progesterona", "Estrogênio: desenvolvimento sexual e ciclo menstrual. Progesterona: prepara e mantém o endométrio.", null, s("m1", 4)),
  F("feminino", "Caminho do óvulo", "Ovário → tuba uterina → útero.", null, s("m1", 4)),
];
// Cartões com imagem: a estrutura com o nome escondido.
for (const p of plates) {
  if (p.id === "digestorio-a2") continue; // o digestório já tem cartões pela outra ilustração
  const seen = new Set();
  for (const l of p.labels) {
    if (seen.has(l.name)) continue;
    seen.add(l.name);
    flashcards.push({ id: `fi-${l.id}`, topicId: p.topicId, front: "Que estrutura é esta?", plate: p.id, label: l.id, back: l.name, explanation: l.fn ? l.fn.charAt(0).toUpperCase() + l.fn.slice(1) + "." : "", src: l.src || { m: p.materialId, p: 1 } });
  }
}

const pack = {
  title: "Anatomia A1",
  exam: { name: "Anatomia A1", detail: "avaliação prática e teórica" },
  subjects: [{ id: "anatomia", name: "Anatomia" }],
  materials,
  plates,
  topics,
  questions,
  flashcards,
  notes: [
    "Na lista \"Identificar na prática\" aparecem nervos, córtex renal, medula renal, pelve renal, escroto e endométrio, mas essas estruturas não têm etiqueta nas ilustrações das apostilas. Treine-as com as peças ou imagens usadas na aula.",
    "Na ilustração do sistema genital masculino está escrito \"Uretro\"; o texto da apostila chama a estrutura de uretra.",
    "Na ilustração da apostila Cardio/Respiratório/Digestório, a etiqueta \"Fígado\" aparece duas vezes no sistema digestório.",
    "As artérias coronárias aparecem nomeadas na ilustração do coração, mas o texto das apostilas não descreve a função delas.",
  ],
};

writeFileSync(new URL("../public/content.json", import.meta.url), JSON.stringify(pack));
console.log(`content.json: ${topics.length} assuntos, ${questions.length} questões (${questions.filter((q) => q.type === "spot").length} de imagem), ${flashcards.length} cartões, ${plates.length} ilustrações`);
