# Hotel Paraíso

Jogo simples de administrar um hotel, em **3D estilo cartoon visto de lado** (casa de bonecas aberta na frente, todos os andares visíveis), rodando direto no navegador (Three.js, sem build).

## Como jogar

- Hóspedes chegam pela rua e fazem fila na **recepção**.
- **Clique num hóspede** e depois num **quarto livre** para alocá-lo (ou clique direto num quarto livre para alocar o primeiro da fila).
- O balão mostra o **tipo de quarto** desejado (cor: azul = Simples, roxo = Luxo, dourado = Suíte), as **diárias** (bolinhas) e a **paciência** (barra).
- Ao sair, o hóspede paga (diária × noites + gorjeta pela satisfação) e o quarto fica **sujo**: clique nele para **limpar**.
- Com o dinheiro:
  - **Construa** em espaços vazios: quartos, lanchonete, academia, piscina.
  - **Reforme** quartos para Luxo e Suíte (diárias maiores, hóspedes VIP).
  - **Melhorias**: novos andares, camareiras (limpeza automática), recepcionista (alocação automática), decoração, marketing e kit de limpeza.
- A **avaliação** (estrelas) sobe com hóspedes satisfeitos e cai com quem desiste da fila. Mais estrelas = mais hóspedes e clientes mais exigentes.
- Ciclo de dia e noite; salários são pagos à meia-noite. O jogo salva automaticamente no navegador.

### Controles

| Ação | Mouse / teclado | Toque |
| --- | --- | --- |
| Selecionar / alocar / limpar | clique | toque |
| Mover câmera | arrastar, WASD / setas | arrastar |
| Zoom | roda do mouse | pinça |
| Girar | Q / E | — |
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
- `js/game.js` — regras: hóspedes, fila, limpeza, camareiras, economia, salvamento.
- `js/building.js` — modelos 3D do hotel: andares empilhados, quartos, lanchonete, academia, piscina, elevador, jardim e rua.
- `js/characters.js` — personagens cartoon e balões de ícone.
- `js/textures.js` — texturas e ícones vetoriais gerados por código.
- `js/audio.js` — efeitos sonoros 8-bit via WebAudio.
- `js/config.js` — preços, custos e balanceamento.
- `vendor/` — Three.js r170 e RoundedBoxGeometry (licença MIT).

## Versão em arquivo único

`dist/hotel-paraiso.html` traz o jogo inteiro (CSS, JS e Three.js) num só arquivo HTML: basta abrir com duplo clique no navegador, sem precisar de servidor. Para gerá-lo de novo depois de mudar o código:

```bash
bash tools/build-single.sh
```
