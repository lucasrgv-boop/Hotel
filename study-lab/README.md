# Study Lab

Plataforma de estudos que transforma os seus materiais (PDF, DOCX, PPTX, TXT/MD) em aprendizagem ativa: preparação guiada para a prova, resumos em oito formatos, quiz com correção comentada, flashcards com repetição espaçada, simulado cronometrado, revisão dos pontos fracos e um professor virtual que cita o material e a página de cada explicação.

Todo conteúdo didático vem dos materiais. Quando algo não está neles, o app diz isso.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/index.html (arquivo único) e dist/artifact.html (página do Artifact)
```

A página publicada lê `content.json` e as imagens de `img/`, servidos ao lado do HTML.

### Conteúdo atual: Anatomia A1

Gerado a partir das duas apostilas (Anatomia A1 e Cardiovascular/Respiratório/Digestório) por `content-src/anatomia-a1.mjs`:

```bash
node content-src/anatomia-a1.mjs   # recria public/content.json
```

- `content-src/pages.json`: texto de cada página das apostilas (para as citações e a busca).
- `content-src/plates.json`: posição de cada etiqueta nas ilustrações recortadas (`public/img/*.jpg`), em % da imagem.

## Arquitetura

```
src/
  content/demo.js      Pacote de demonstração (guia de uso do próprio app)
  lib/content.js       Modelo de conteúdo: normaliza e junta pacotes
  lib/progress.js      Pontos, níveis, sequência, metas, conquistas, domínio por assunto, repetição espaçada
  lib/storage.js       Salvamento local (IndexedDB) + conta (capacidade db do Artifact)
  lib/search.js        Busca BM25 nos trechos, com destaque
  lib/importers.js     Extração de texto de PDF, DOCX e PPTX no navegador
  lib/generate.js      Geração de estudo: com o Claude (capacidade sample) ou automática por regras
  lib/ai.js            Acesso ao Claude e mensagens de erro
  components/          Questão (5 tipos), sequência de questões, peças de interface
  views/               Início, Trilha (preparação), Atlas, Biblioteca, Resumos, Quiz, Flashcards, Simulado, Revisão, Professor
  components/Plate.jsx Ilustração com as etiquetas escondidas/reveladas (atlas, questões e cartões de imagem)
public/content.json    Pacote de conteúdo gerado a partir dos materiais enviados no chat
```

## Formato do pacote de conteúdo (`content.json`)

Para adicionar uma matéria, inclua-a em `subjects` e adicione os materiais, assuntos, questões e cartões. Cada item aponta para a origem com `src: { m: <id do material>, p: <página>, q: <citação literal> }`.

```json
{
  "exam": { "name": "Nome da prova" },
  "subjects": [{ "id": "bio", "name": "Biologia" }],
  "materials": [{ "id": "m1", "subjectId": "bio", "title": "Apostila 1", "fileName": "apostila.pdf", "kind": "pdf", "pageLabel": "p.",
                  "chunks": [{ "page": 1, "text": "texto da página" }] }],
  "topics": [{ "id": "t1", "materialIds": ["m1"], "title": "Assunto", "importance": 3, "minutes": 10, "why": "...",
               "summary": { "full": "...", "simple": "..." },
               "concepts": [{ "term": "...", "definition": "...", "src": { "p": 1 } }],
               "keywords": ["..."], "attention": [], "examples": [], "comparisons": [], "memorize": [] }],
  "questions": [
    { "id": "q1", "topicId": "t1", "type": "mcq", "prompt": "...", "options": ["a", "b", "c", "d"], "answer": 0, "explanation": "...", "src": { "p": 1, "q": "..." } },
    { "id": "q2", "topicId": "t1", "type": "tf", "prompt": "...", "answer": false, "explanation": "..." },
    { "id": "q3", "topicId": "t1", "type": "cloze", "prompt": "Frase com ____.", "answer": ["resposta", "variação aceita"] },
    { "id": "q4", "topicId": "t1", "type": "match", "prompt": "Associe...", "pairs": [{ "left": "...", "right": "..." }] },
    { "id": "q5", "topicId": "t1", "type": "open", "prompt": "...", "answer": "resposta modelo", "keyPoints": ["..."] },
    { "id": "q6", "topicId": "t1", "type": "order", "prompt": "Coloque em ordem...", "items": ["1º", "2º", "3º"] },
    { "id": "q7", "topicId": "t1", "type": "spot", "plate": "p1", "label": "p1-0", "ask": "name | tap", "prompt": "..." }
  ],
  "flashcards": [{ "id": "f1", "topicId": "t1", "front": "...", "back": "...", "explanation": "...", "src": { "p": 1 } }],
  "plates": [{ "id": "p1", "topicId": "t1", "materialId": "m1", "title": "...", "img": "img/p1.jpg", "w": 800, "h": 600,
               "labels": [{ "id": "p1-0", "name": "Estrutura", "x": 10, "y": 20, "w": 12, "h": 5, "fn": "função segundo o texto" }] }],
  "notes": ["Avisos sobre lacunas dos materiais, por exemplo um assunto citado mas não explicado."]
}
```

## Funções que dependem do Claude

O professor virtual, a organização de arquivos importados com IA e a correção de perguntas abertas usam a capacidade `sample` do Artifact (o Claude da conta de quem está vendo, com permissão pedida na primeira vez). Sem ela, o app continua funcionando:

- o professor mostra os trechos mais relevantes dos materiais, com a origem;
- a importação usa a geração automática, que monta resumos, lacunas, múltipla escolha e cartões só com frases do próprio arquivo;
- as perguntas abertas são corrigidas por autoavaliação, comparando com a resposta esperada.
