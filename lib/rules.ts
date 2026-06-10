import type { Locale } from './i18n';

type RulesSection = { title: string; body: string };
type RulesMap = Record<Locale, RulesSection[]>;

const RULES: RulesMap = {
  pt: [
    {
      title: 'Objetivo',
      body: 'Acumula a maior fortuna possível enquanto os teus adversários bebem. O jogo tem um número fixo de rondas, escolhido pelo host ao começar (Rápido ~20 min, Clássico ~35 min, Maratona ~50 min). Quando as rondas acabam, vence quem tiver a maior fortuna: dinheiro + valor das propriedades e upgrades.',
    },
    {
      title: 'Como Começar',
      body: 'Cria uma sala e partilha o código de 4 letras com os outros jogadores. Cada jogador entra com o seu nome. O host escolhe a duração do jogo e clica em "Começar Jogo". Cada jogador começa com €1.5M.',
    },
    {
      title: 'Como Funcionam os Turnos',
      body: 'Os jogadores jogam por ordem. No teu turno, carrega em "Lançar Dados". Dois dados são lançados e o total determina quantas casas avanças. O jogo resolve automaticamente o que acontece na casa onde caíste. Se um jogador estiver ausente, qualquer outro pode saltar a vez dele após 60 segundos.',
    },
    {
      title: 'Tipos de Casas',
      body: 'GO — recebes €200k sempre que passas ou caís aqui.\n\nPropriedade — podes comprar ou pagar renda ao dono.\n\nSurpresa — tiras uma carta de evento aleatória entre 50 possíveis.\n\nImposto — pagas ao banco automaticamente.\n\nCadeia — casa de visita, nada acontece.\n\nPra Cadeia — vais preso 3 rondas. Na tua vez podes pagar €50k de caução para jogar logo, ou saltar a ronda.\n\nPortal — casa neutra, descansa.',
    },
    {
      title: 'Comprar uma Propriedade',
      body: 'Quando caís numa propriedade sem dono tens três opções:\n\n1. Pagar o preço completo em dinheiro.\n2. Pagar 60% do preço em dinheiro e o resto em shots — desconto com bebida.\n3. Passar e não comprar.',
    },
    {
      title: 'Pagar Renda',
      body: 'Quando caís numa propriedade de outro jogador, escolhes como pagar:\n\nDinheiro — o valor total da renda, que aumenta com o nível da propriedade (e duplica se o dono tiver o monopólio da cor).\n\nDesconto + Shots — pagas metade da renda em dinheiro e bebes shots conforme o nível da propriedade (nível 1 = 1 shot, nível 2 = 2 shots, nível 3 = 3 shots).',
    },
    {
      title: 'Fazer Upgrade',
      body: 'Quando o teu token cai na tua própria propriedade, aparece o menu de upgrade:\n\nNível 2 — custa €200k e duplica a renda.\nNível 3 (máximo) — custa €400k e triplica a renda.\n\nTambém podes vender a propriedade por metade do preço. O nível de cada propriedade é visível no tabuleiro através dos indicadores coloridos.',
    },
    {
      title: 'Monopólio de Cor',
      body: 'Se fores dono de todas as propriedades da mesma cor, a renda de cada uma duplica. Combinado com upgrades, é a forma mais rápida de arruinar os adversários.',
    },
    {
      title: 'Cartas de Evento',
      body: 'Existem 50 cartas de evento diferentes. Quando caís numa casa Surpresa, uma carta é tirada aleatoriamente. Podem acontecer muitas coisas:\n\nReceber ou pagar dinheiro ao banco, cobrar de todos os jogadores, obrigar jogadores a beber, mover o teu token, trocar posições, lançar os dados de novo, entre outras situações especiais.',
    },
    {
      title: 'Shots',
      body: 'Os shots são rastreados por jogador no contador visível no painel. Quando alguém deve shots, o contador sobe; quando bebe, carrega no contador para descontar. Os shots bebem-se na realidade — são os outros jogadores à mesa que garantem o cumprimento.',
    },
    {
      title: 'Fim do Jogo',
      body: 'O jogo acaba automaticamente quando as rondas escolhidas terminam — vence quem tiver a maior fortuna (dinheiro + propriedades + upgrades). O jogo também acaba de imediato se todos os outros jogadores ficarem na bancarrota. Quem tiver mais shots por beber é o rei da noite.',
    },
  ],

  en: [
    {
      title: 'Objective',
      body: 'Build the biggest fortune while your opponents drink. The game has a fixed number of rounds, chosen by the host at the start (Fast ~20 min, Classic ~35 min, Marathon ~50 min). When the rounds run out, the player with the biggest fortune wins: cash + value of properties and upgrades.',
    },
    {
      title: 'Getting Started',
      body: 'Create a room and share the 4-letter code with the other players. Each player joins with their name. The host picks the game length and taps "Start Game". Each player starts with €1.5M.',
    },
    {
      title: 'How Turns Work',
      body: 'Players take turns in order. On your turn, tap "Roll Dice". Two dice are rolled and the total determines how many spaces you advance. The game automatically resolves what happens on the space you land on. If a player is away, anyone can skip their turn after 60 seconds.',
    },
    {
      title: 'Space Types',
      body: 'GO — collect €200k every time you pass or land here.\n\nProperty — buy it or pay rent to the owner.\n\nSurprise — draw a random event card from 50 possible ones.\n\nTax — you pay the bank automatically.\n\nJail — just visiting, nothing happens.\n\nGo to Jail — you are jailed for 3 rounds. On your turn you can pay €50k bail to play immediately, or skip the round.\n\nFree Parking — neutral space, rest.',
    },
    {
      title: 'Buying a Property',
      body: 'When you land on an unowned property you have three options:\n\n1. Pay the full price in cash.\n2. Pay 60% in cash and the rest in shots — drink for a discount.\n3. Pass and do not buy.',
    },
    {
      title: 'Paying Rent',
      body: 'When you land on another player\'s property, you choose how to pay:\n\nCash — the full rent, which increases with the property level (and doubles if the owner holds the colour monopoly).\n\nDiscount + Shots — pay half the rent in cash and drink shots based on the property level (level 1 = 1 shot, level 2 = 2 shots, level 3 = 3 shots).',
    },
    {
      title: 'Upgrading',
      body: 'When your token lands on your own property, the upgrade menu appears:\n\nLevel 2 — costs €200k and doubles the rent.\nLevel 3 (max) — costs €400k and triples the rent.\n\nYou can also sell the property for half its price. Each property\'s level is visible on the board through the coloured indicators.',
    },
    {
      title: 'Colour Monopoly',
      body: 'If you own every property of the same colour, each one\'s rent doubles. Combined with upgrades, it\'s the fastest way to ruin your opponents.',
    },
    {
      title: 'Event Cards',
      body: 'There are 50 different event cards. When you land on a Surprise space, a card is drawn at random. Many things can happen:\n\nCollect or pay money to the bank, collect from all players, make players drink, move your token, swap positions, roll the dice again, among other special situations.',
    },
    {
      title: 'Shots',
      body: 'Shots are tracked per player on the counter in the panel. When someone owes shots, the counter goes up; when they drink, tap the counter to subtract. Shots are drunk in real life — the other players at the table enforce it.',
    },
    {
      title: 'End of Game',
      body: 'The game ends automatically when the chosen rounds run out — the biggest fortune (cash + properties + upgrades) wins. The game also ends immediately if every other player goes bankrupt. Whoever has the most shots left to drink is the king of the night.',
    },
  ],

  fr: [
    {
      title: 'Objectif',
      body: 'Construis la plus grande fortune pendant que tes adversaires boivent. La partie a un nombre fixe de tours, choisi par l\'hôte au départ (Rapide ~20 min, Classique ~35 min, Marathon ~50 min). Quand les tours sont épuisés, le joueur avec la plus grande fortune gagne : argent + valeur des propriétés et améliorations.',
    },
    {
      title: 'Démarrage',
      body: 'Crée une salle et partage le code à 4 lettres avec les autres joueurs. Chaque joueur rejoint avec son prénom. L\'hôte choisit la durée de la partie et appuie sur "Démarrer la Partie". Chaque joueur commence avec €1,5M.',
    },
    {
      title: 'Déroulement des Tours',
      body: 'Les joueurs jouent à tour de rôle. À ton tour, appuie sur "Lancer les Dés". Deux dés sont lancés et le total détermine combien de cases tu avances. Le jeu résout automatiquement ce qui se passe sur la case où tu atterris. Si un joueur est absent, n\'importe qui peut passer son tour après 60 secondes.',
    },
    {
      title: 'Types de Cases',
      body: 'GO — tu reçois €200k chaque fois que tu passes ou atterris ici.\n\nPropriété — achète-la ou paie un loyer au propriétaire.\n\nSurprise — tu tires une carte événement aléatoire parmi 50 possibles.\n\nImpôt — tu paies la banque automatiquement.\n\nPrison — simple visite, rien ne se passe.\n\nEn Prison — tu es emprisonné 3 tours. À ton tour, tu peux payer €50k de caution pour jouer immédiatement, ou passer le tour.\n\nParking Gratuit — case neutre, repose-toi.',
    },
    {
      title: 'Acheter une Propriété',
      body: 'Quand tu atterris sur une propriété sans propriétaire, tu as trois options :\n\n1. Payer le prix complet en argent.\n2. Payer 60 % en argent et le reste en shots — réduction avec boisson.\n3. Passer et ne pas acheter.',
    },
    {
      title: 'Payer un Loyer',
      body: 'Quand tu atterris sur la propriété d\'un autre joueur, tu choisis comment payer :\n\nArgent — le loyer complet, qui augmente avec le niveau de la propriété (et double si le propriétaire détient le monopole de la couleur).\n\nRéduction + Shots — paie la moitié du loyer en argent et bois des shots selon le niveau (niveau 1 = 1 shot, niveau 2 = 2 shots, niveau 3 = 3 shots).',
    },
    {
      title: 'Amélioration',
      body: 'Quand ton pion atterrit sur ta propre propriété, le menu d\'amélioration apparaît :\n\nNiveau 2 — coûte €200k et double le loyer.\nNiveau 3 (max) — coûte €400k et triple le loyer.\n\nTu peux aussi vendre la propriété pour la moitié de son prix. Le niveau de chaque propriété est visible sur le plateau via les indicateurs colorés.',
    },
    {
      title: 'Monopole de Couleur',
      body: 'Si tu possèdes toutes les propriétés de la même couleur, le loyer de chacune double. Combiné aux améliorations, c\'est le moyen le plus rapide de ruiner tes adversaires.',
    },
    {
      title: 'Cartes Événement',
      body: 'Il y a 50 cartes événement différentes. Quand tu atterris sur une case Surprise, une carte est tirée au hasard. Beaucoup de choses peuvent arriver :\n\nRecevoir ou payer de l\'argent à la banque, percevoir de tous les joueurs, obliger des joueurs à boire, déplacer ton pion, échanger des positions, relancer les dés, parmi d\'autres situations spéciales.',
    },
    {
      title: 'Shots',
      body: 'Les shots sont suivis par joueur sur le compteur du panneau. Quand quelqu\'un doit des shots, le compteur monte ; quand il boit, appuie sur le compteur pour décompter. Les shots se boivent en vrai — les autres joueurs à table s\'en assurent.',
    },
    {
      title: 'Fin de Partie',
      body: 'La partie se termine automatiquement quand les tours choisis sont épuisés — la plus grande fortune (argent + propriétés + améliorations) gagne. La partie se termine aussi immédiatement si tous les autres joueurs font faillite. Celui qui a le plus de shots restant à boire est le roi de la nuit.',
    },
  ],

  de: [
    {
      title: 'Ziel',
      body: 'Baue das größte Vermögen auf, während deine Gegner trinken. Das Spiel hat eine feste Rundenzahl, die der Host am Anfang wählt (Schnell ~20 Min, Klassisch ~35 Min, Marathon ~50 Min). Wenn die Runden vorbei sind, gewinnt der Spieler mit dem größten Vermögen: Geld + Wert der Grundstücke und Upgrades.',
    },
    {
      title: 'Spielstart',
      body: 'Erstelle einen Raum und teile den 4-Buchstaben-Code mit den anderen Spielern. Jeder Spieler tritt mit seinem Namen bei. Der Host wählt die Spieldauer und tippt auf "Spiel starten". Jeder Spieler startet mit €1,5M.',
    },
    {
      title: 'Wie Runden Ablaufen',
      body: 'Die Spieler sind der Reihe nach dran. Tippe in deinem Zug auf "Würfeln". Zwei Würfel werden geworfen und die Summe bestimmt, wie viele Felder du vorziehst. Das Spiel löst automatisch auf, was auf dem Feld passiert. Ist ein Spieler abwesend, kann jeder nach 60 Sekunden seinen Zug überspringen.',
    },
    {
      title: 'Feldtypen',
      body: 'GO — erhalte €200k, jedes Mal wenn du hier vorbeikommst oder landest.\n\nGrundstück — kaufe es oder zahle Miete an den Besitzer.\n\nÜberraschung — ziehe eine zufällige Ereigniskarte aus 50 möglichen.\n\nSteuer — du zahlst automatisch an die Bank.\n\nGefängnis — nur Besuch, nichts passiert.\n\nIns Gefängnis — du sitzt 3 Runden ein. In deinem Zug kannst du €50k Kaution zahlen und sofort spielen, oder die Runde aussetzen.\n\nFreies Parken — neutrales Feld, ausruhen.',
    },
    {
      title: 'Grundstück Kaufen',
      body: 'Wenn du auf einem herrenlosen Grundstück landest, hast du drei Optionen:\n\n1. Den vollen Preis in bar zahlen.\n2. 60 % in bar und den Rest in Shots zahlen — Rabatt gegen Trinken.\n3. Passen und nicht kaufen.',
    },
    {
      title: 'Miete Zahlen',
      body: 'Wenn du auf dem Grundstück eines anderen Spielers landest, wählst du, wie du zahlst:\n\nGeld — die volle Miete, die mit dem Grundstückslevel steigt (und sich verdoppelt, wenn der Besitzer das Farbmonopol hält).\n\nRabatt + Shots — zahle die halbe Miete in bar und trinke Shots je nach Level (Level 1 = 1 Shot, Level 2 = 2 Shots, Level 3 = 3 Shots).',
    },
    {
      title: 'Upgrade',
      body: 'Wenn dein Spielstein auf deinem eigenen Grundstück landet, erscheint das Upgrade-Menü:\n\nLevel 2 — kostet €200k und verdoppelt die Miete.\nLevel 3 (max) — kostet €400k und verdreifacht die Miete.\n\nDu kannst das Grundstück auch für den halben Preis verkaufen. Das Level jedes Grundstücks ist auf dem Spielfeld durch farbige Indikatoren sichtbar.',
    },
    {
      title: 'Farbmonopol',
      body: 'Besitzt du alle Grundstücke derselben Farbe, verdoppelt sich die Miete jedes einzelnen. Kombiniert mit Upgrades ist das der schnellste Weg, deine Gegner zu ruinieren.',
    },
    {
      title: 'Ereigniskarten',
      body: 'Es gibt 50 verschiedene Ereigniskarten. Wenn du auf einem Überraschungsfeld landest, wird eine Karte zufällig gezogen. Viele Dinge können passieren:\n\nGeld von der Bank erhalten oder zahlen, von allen Spielern kassieren, Spieler zum Trinken zwingen, deinen Spielstein bewegen, Positionen tauschen, erneut würfeln und weitere besondere Situationen.',
    },
    {
      title: 'Shots',
      body: 'Shots werden pro Spieler auf dem Zähler im Panel verfolgt. Wenn jemand Shots schuldet, steigt der Zähler; beim Trinken tippe auf den Zähler zum Abziehen. Die Shots werden in der Realität getrunken — die anderen Spieler am Tisch sorgen dafür.',
    },
    {
      title: 'Spielende',
      body: 'Das Spiel endet automatisch, wenn die gewählten Runden vorbei sind — das größte Vermögen (Geld + Grundstücke + Upgrades) gewinnt. Das Spiel endet auch sofort, wenn alle anderen Spieler bankrott sind. Wer die meisten noch zu trinkenden Shots hat, ist König der Nacht.',
    },
  ],

  es: [
    {
      title: 'Objetivo',
      body: 'Construye la mayor fortuna posible mientras tus adversarios beben. La partida tiene un número fijo de rondas, elegido por el host al empezar (Rápida ~20 min, Clásica ~35 min, Maratón ~50 min). Cuando se acaban las rondas, gana quien tenga la mayor fortuna: dinero + valor de propiedades y mejoras.',
    },
    {
      title: 'Cómo Empezar',
      body: 'Crea una sala y comparte el código de 4 letras con los otros jugadores. Cada jugador entra con su nombre. El host elige la duración de la partida y pulsa "Iniciar Juego". Cada jugador comienza con €1,5M.',
    },
    {
      title: 'Cómo Funcionan los Turnos',
      body: 'Los jugadores juegan por orden. En tu turno, pulsa "Lanzar Dados". Se lanzan dos dados y el total determina cuántas casillas avanzas. El juego resuelve automáticamente lo que ocurre en la casilla donde caes. Si un jugador está ausente, cualquiera puede saltar su turno tras 60 segundos.',
    },
    {
      title: 'Tipos de Casillas',
      body: 'GO — recibes €200k cada vez que pasas o caes aquí.\n\nPropiedad — cómprala o paga alquiler al dueño.\n\nSorpresa — sacas una carta de evento aleatoria entre 50 posibles.\n\nImpuesto — pagas al banco automáticamente.\n\nCárcel — solo visita, no pasa nada.\n\nA la Cárcel — quedas preso 3 rondas. En tu turno puedes pagar €50k de fianza para jugar ya, o saltar la ronda.\n\nAparcamiento Libre — casilla neutral, descansa.',
    },
    {
      title: 'Comprar una Propiedad',
      body: 'Cuando caes en una propiedad sin dueño tienes tres opciones:\n\n1. Pagar el precio completo en dinero.\n2. Pagar el 60 % en dinero y el resto en shots — descuento con bebida.\n3. Pasar y no comprar.',
    },
    {
      title: 'Pagar Alquiler',
      body: 'Cuando caes en la propiedad de otro jugador, eliges cómo pagar:\n\nDinero — el alquiler completo, que aumenta con el nivel de la propiedad (y se duplica si el dueño tiene el monopolio del color).\n\nDescuento + Shots — pagas la mitad del alquiler en dinero y bebes shots según el nivel (nivel 1 = 1 shot, nivel 2 = 2 shots, nivel 3 = 3 shots).',
    },
    {
      title: 'Mejorar',
      body: 'Cuando tu ficha cae en tu propia propiedad, aparece el menú de mejora:\n\nNivel 2 — cuesta €200k y duplica el alquiler.\nNivel 3 (máx) — cuesta €400k y triplica el alquiler.\n\nTambién puedes vender la propiedad por la mitad de su precio. El nivel de cada propiedad es visible en el tablero a través de los indicadores de color.',
    },
    {
      title: 'Monopolio de Color',
      body: 'Si posees todas las propiedades del mismo color, el alquiler de cada una se duplica. Combinado con mejoras, es la forma más rápida de arruinar a tus adversarios.',
    },
    {
      title: 'Cartas de Evento',
      body: 'Hay 50 cartas de evento diferentes. Cuando caes en una casilla Sorpresa, se saca una carta al azar. Pueden ocurrir muchas cosas:\n\nRecibir o pagar dinero al banco, cobrar de todos los jugadores, obligar a jugadores a beber, mover tu ficha, intercambiar posiciones, lanzar los dados de nuevo, entre otras situaciones especiales.',
    },
    {
      title: 'Shots',
      body: 'Los shots se rastrean por jugador en el contador del panel. Cuando alguien debe shots, el contador sube; cuando bebe, pulsa el contador para descontar. Los shots se beben en la realidad — los demás jugadores en la mesa se encargan de que se cumpla.',
    },
    {
      title: 'Fin del Juego',
      body: 'La partida termina automáticamente cuando se acaban las rondas elegidas — gana la mayor fortuna (dinero + propiedades + mejoras). La partida también termina de inmediato si todos los demás jugadores quiebran. Quien tenga más shots por beber es el rey de la noche.',
    },
  ],
};

export function getRulesSections(locale: Locale): RulesSection[] {
  return RULES[locale] ?? RULES.pt;
}
