# Hotel Paraíso

Jogo simples de administrar um hotel, em **3D estilo cartoon visto de lado** (casa de bonecas aberta na frente, todos os andares visíveis), rodando direto no navegador (Three.js, sem build).

## Como jogar

O jogo começa num **mapa-múndi**. Cada hotel é uma **temporada de 12 meses** (1 mês = 1 dia de jogo, cerca de 1 minuto).

- Hóspedes chegam pela rua e fazem fila na **recepção**. **Clique num hóspede** e depois num **quarto livre** (ou clique direto num quarto livre para alocar o primeiro da fila).
- O balão mostra o **tipo de quarto** desejado (azul = Simples, roxo = Luxo, dourado = Suíte), as **diárias** (bolinhas), a **paciência** (anel) e um selo de exigência: **T** = idoso, quer o térreo; **↑** = quer andar alto.
- A placa acima de cada quarto mostra a situação: **verde = LIVRE**, **vermelho = OCUPADO**, **laranja = SUJO**, **azul = LIMPANDO/CONSERTO**, **roxo = PEDIDO!** (toalha, comida ou barulho: clique para atender), **cinza = QUEBRADO** (clique para consertar por $40).
- Atender rápido em sequência gera **combo** com bônus.
- **Eventos**: inspetor disfarçado, celebridade com fãs, quarto quebrado, queda de energia, onda de calor e o festival de cada país.
- **Melhorias**: andares, camareiras, técnico de manutenção, concierge (atende pedidos), recepcionista, gerador, decoração, marketing e kit de limpeza.
- No fim da temporada, cada uma das **3 metas** cumpridas vale uma **estrela**. 1 estrela libera o próximo país.
- As estrelas viram pontos para **bônus permanentes da rede** (capital inicial, fama, paciência, limpeza, gorjetas, obras mais baratas).
- **Desafio do dia**: um hotel sorteado por data, 4 meses, mesmos hóspedes e eventos para todos, sem bônus. Na página publicada há um placar compartilhado.

### Países

| Hotel | Cenário | Regra especial | Festival |
| --- | --- | --- | --- |
| Hotel Copacabana (Rio) | praia, calçadão | tutorial | Carnaval |
| Hotel Manhattan (Nova York) | arranha-céus, táxis | menos paciência, mais chegadas | Réveillon |
| Hôtel Lumière (Paris) | casario, torre de ferro | avaliação pesa o dobro, bistrô | Festa Nacional |
| Hotel Sakura (Tóquio) | cerejeiras, lanternas | 4 espaços por andar, quarto sujo derruba a avaliação | Hanami |
| Chalé Alpino (Zermatt) | neve, pinheiros, montanhas | alta/baixa temporada, spa | Semana do esqui |
| Oásis Dubai | deserto, torre de vidro | muitos VIPs, Suíte vale 50% a mais | Festival de Compras |

### Controles

| Ação | Mouse / teclado | Toque |
| --- | --- | --- |
| Selecionar / alocar / limpar | clique | toque |
| Mover câmera | arrastar, WASD / setas | arrastar |
| Zoom | roda do mouse | pinça |
| Girar | Q / E | — |
| Ver o prédio inteiro | F | — |
| Pausar / velocidade | Espaço, 1, 2, 3 | botões no topo |
| Melhorias | U | botão MELHORIAS |

## Rodando

Como usa módulos ES, precisa de um servidor HTTP simples:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Também funciona publicado no GitHub Pages (é tudo estático).

## Estrutura

- `index.html`, `css/style.css` — página e HUD.
- `js/main.js` — renderizador (sombras suaves, tone mapping), câmera lateral, dia/noite, entrada.
- `js/game.js` — regras da temporada: hóspedes, fila, funcionários, pedidos, eventos, metas, pontuação, salvamento.
- `js/levels.js` — os 6 hotéis (cenário, regras, metas, festival), bônus da rede e o mapa-múndi em pontos.
- `js/meta.js` — progresso da campanha (estrelas, recordes, bônus) e desafio do dia com placar.
- `js/worldmap.js` — tela do mapa-múndi.
- `js/building.js` — modelos 3D do hotel e cenários de cada país: andares empilhados, quartos, lanchonete, academia, piscina, elevador, jardim e rua.
- `js/characters.js` — personagens cartoon e balões de ícone.
- `js/textures.js` — texturas e ícones vetoriais gerados por código.
- `js/audio.js` — efeitos sonoros 8-bit via WebAudio.
- `js/config.js` — preços, custos e balanceamento.
- `vendor/` — Three.js r170, RoundedBoxGeometry, RoomEnvironment e pós-processamento (bloom) dos exemplos do Three.js (licença MIT).

## Versão em arquivo único

`dist/hotel-paraiso.html` traz o jogo inteiro (CSS, JS e Three.js) num só arquivo HTML: basta abrir com duplo clique no navegador, sem precisar de servidor. Para gerá-lo de novo depois de mudar o código:

```bash
bash tools/build-single.sh
```

O mapa-múndi foi gerado a partir do [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, domínio público).
