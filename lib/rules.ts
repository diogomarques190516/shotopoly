import type { Locale } from './i18n';

type RulesSection = { title: string; body: string };
type RulesMap = Record<Locale, RulesSection[]>;

const RULES: RulesMap = {
  pt: [
    {
      title: 'Objetivo',
      body: 'Acumula o máximo de dinheiro possível enquanto os teus adversários bebem. Não há condição de fim automática — o jogo acaba quando o grupo decidir. Vence quem tiver mais dinheiro no momento em que o jogo terminar.',
    },
    {
      title: 'Como Começar',
      body: 'Cria uma sala e partilha o código de 4 letras com os outros jogadores. Cada jogador entra com o seu nome. O host clica em "Começar Jogo" quando todos estiverem prontos. Cada jogador começa com €1.500k.',
    },
    {
      title: 'Como Funcionam os Turnos',
      body: 'Os jogadores jogam por ordem. No teu turno, carrega em "Lançar Dados". Dois dados são lançados e o total determina quantas casas avanças. O jogo resolve automaticamente o que acontece na casa onde caíste.',
    },
    {
      title: 'Tipos de Casas',
      body: 'GO — recebes €200k sempre que passas ou caís aqui.\n\nPropriedade — podes comprar, pagar renda ou negociar a compra ao dono.\n\nSurpresa — tiras uma carta de evento aleatória entre 50 possíveis.\n\nImposto — pagas ao banco automaticamente.\n\nCadeia — casa de visita, nada acontece.\n\nPra Cadeia — vais direto para a Cadeia.\n\nOpen Bar — casa neutra, descansa.',
    },
    {
      title: 'Comprar uma Propriedade',
      body: 'Quando caís numa propriedade sem dono tens três opções:\n\n1. Pagar o preço completo em dinheiro.\n2. Pagar 60% do preço em dinheiro e os restantes 40% em shots — desconto com bebida.\n3. Passar e não comprar.',
    },
    {
      title: 'Pagar Renda',
      body: 'Quando caís numa propriedade de outro jogador, o dono escolhe como quer cobrar:\n\nDinheiro — o valor da renda atual, que aumenta com o nível da propriedade.\n\nShots — a quantidade depende do nível da propriedade (nível 1 = 1 shot, nível 2 = 2 shots, nível 3 = 3 shots).\n\nO jogador que caiu espera enquanto o dono decide.',
    },
    {
      title: 'Roubar uma Propriedade',
      body: 'Ao cair numa propriedade de outro jogador, podes também comprá-la diretamente:\n\nPreço = 2x o preço original + €200k por cada nível de upgrade.\n\nExemplo: propriedade de €500k no nível 2 custa €1.000k + €400k = €1.400k.\n\nSe a propriedade estiver no nível máximo (3), não pode ser comprada desta forma.\n\nQuando comprada: o dinheiro vai para o dono anterior e a propriedade muda de dono mantendo o nível atual.',
    },
    {
      title: 'Fazer Upgrade',
      body: 'Quando o teu token cai na tua própria propriedade, aparece o menu de upgrade:\n\nNível 2 — custa €200k e duplica a renda.\nNível 3 (máximo) — custa €400k e triplica a renda.\n\nPodes sempre escolher continuar sem fazer upgrade. O nível de cada propriedade é visível no tabuleiro através dos indicadores coloridos.',
    },
    {
      title: 'Cartas de Evento',
      body: 'Existem 50 cartas de evento diferentes. Quando caís numa casa Surpresa, uma carta é retirada aleatoriamente. Podem acontecer muitas coisas:\n\nReceber ou pagar dinheiro ao banco, cobrar de todos os jogadores, obrigar jogadores a beber, mover o teu token, trocar posições, lançar os dados de novo, entre outras situações especiais.',
    },
    {
      title: 'Shots',
      body: 'Os shots são rastreados por jogador no contador visível em cada carta. Quando alguém deve shots, o contador sobe. Os shots bebem-se na realidade — são os outros jogadores à mesa que garantem o cumprimento.',
    },
    {
      title: 'Fim do Jogo',
      body: 'O jogo não tem fim automático. Quando o grupo decidir parar, vence quem tiver mais dinheiro. Quem tiver mais shots por beber é o rei da noite.',
    },
  ],

  en: [
    {
      title: 'Objective',
      body: 'Accumulate as much money as possible while your opponents drink. There is no automatic end condition — the game ends when the group decides. The player with the most money when the game stops wins.',
    },
    {
      title: 'Getting Started',
      body: 'Create a room and share the 4-letter code with the other players. Each player joins with their name. The host taps "Start Game" when everyone is ready. Each player starts with €1,500k.',
    },
    {
      title: 'How Turns Work',
      body: 'Players take turns in order. On your turn, tap "Roll Dice". Two dice are rolled and the total determines how many spaces you advance. The game automatically resolves what happens on the space you land on.',
    },
    {
      title: 'Space Types',
      body: 'GO — collect €200k every time you pass or land here.\n\nProperty — you can buy it, pay rent, or negotiate a purchase from the owner.\n\nSurprise — draw a random event card from 50 possible ones.\n\nTax — you pay the bank automatically.\n\nJail — just visiting, nothing happens.\n\nGo to Jail — go directly to Jail.\n\nFree Parking — neutral space, rest.',
    },
    {
      title: 'Buying a Property',
      body: 'When you land on an unowned property you have three options:\n\n1. Pay the full price in cash.\n2. Pay 60% in cash and the remaining 40% in shots — drink for a discount.\n3. Pass and do not buy.',
    },
    {
      title: 'Paying Rent',
      body: 'When you land on another player\'s property, the owner chooses how to collect:\n\nCash — the current rent value, which increases with the property level.\n\nShots — the amount depends on the property level (level 1 = 1 shot, level 2 = 2 shots, level 3 = 3 shots).\n\nThe player who landed waits while the owner decides.',
    },
    {
      title: 'Stealing a Property',
      body: 'When landing on another player\'s property, you can also buy it directly:\n\nPrice = 2× the original price + €200k per upgrade level.\n\nExample: a €500k property at level 2 costs €1,000k + €400k = €1,400k.\n\nIf the property is at max level (3), it cannot be bought this way.\n\nWhen purchased: the money goes to the previous owner and the property changes hands keeping its current level.',
    },
    {
      title: 'Upgrading',
      body: 'When your token lands on your own property, the upgrade menu appears:\n\nLevel 2 — costs €200k and doubles the rent.\nLevel 3 (max) — costs €400k and triples the rent.\n\nYou can always choose to continue without upgrading. Each property\'s level is visible on the board through the coloured indicators.',
    },
    {
      title: 'Event Cards',
      body: 'There are 50 different event cards. When you land on a Surprise space, a card is drawn at random. Many things can happen:\n\nCollect or pay money to the bank, collect from all players, make players drink, move your token, swap positions, roll the dice again, among other special situations.',
    },
    {
      title: 'Shots',
      body: 'Shots are tracked per player on the counter visible on each card. When someone owes shots, the counter goes up. Shots are drunk in real life — the other players at the table enforce it.',
    },
    {
      title: 'End of Game',
      body: 'The game has no automatic end. When the group decides to stop, the player with the most money wins. Whoever has the most shots left to drink is the king of the night.',
    },
  ],

  fr: [
    {
      title: 'Objectif',
      body: 'Accumule le maximum d\'argent possible pendant que tes adversaires boivent. Il n\'y a pas de condition de fin automatique — le jeu se termine quand le groupe le décide. Celui qui a le plus d\'argent quand le jeu s\'arrête gagne.',
    },
    {
      title: 'Démarrage',
      body: 'Crée une salle et partage le code à 4 lettres avec les autres joueurs. Chaque joueur rejoint avec son prénom. L\'hôte appuie sur "Commencer la Partie" quand tout le monde est prêt. Chaque joueur commence avec €1 500k.',
    },
    {
      title: 'Déroulement des Tours',
      body: 'Les joueurs jouent à tour de rôle. À ton tour, appuie sur "Lancer les Dés". Deux dés sont lancés et le total détermine combien de cases tu avances. Le jeu résout automatiquement ce qui se passe sur la case où tu atterris.',
    },
    {
      title: 'Types de Cases',
      body: 'GO — tu reçois €200k chaque fois que tu passes ou atterris ici.\n\nPropriété — tu peux acheter, payer un loyer ou négocier un achat au propriétaire.\n\nSurprise — tu tires une carte événement aléatoire parmi 50 possibles.\n\nImpôt — tu paies la banque automatiquement.\n\nPrison — simple visite, rien ne se passe.\n\nEn Prison — tu vas directement en Prison.\n\nParking Gratuit — case neutre, repose-toi.',
    },
    {
      title: 'Acheter une Propriété',
      body: 'Quand tu atterris sur une propriété sans propriétaire, tu as trois options :\n\n1. Payer le prix complet en argent.\n2. Payer 60 % en argent et les 40 % restants en shots — réduction avec boisson.\n3. Passer et ne pas acheter.',
    },
    {
      title: 'Payer un Loyer',
      body: 'Quand tu atterris sur la propriété d\'un autre joueur, le propriétaire choisit comment encaisser :\n\nArgent — la valeur du loyer actuel, qui augmente avec le niveau de la propriété.\n\nShots — la quantité dépend du niveau (niveau 1 = 1 shot, niveau 2 = 2 shots, niveau 3 = 3 shots).\n\nLe joueur qui a atterri attend pendant que le propriétaire décide.',
    },
    {
      title: 'Voler une Propriété',
      body: 'En atterrissant sur la propriété d\'un autre joueur, tu peux aussi l\'acheter directement :\n\nPrix = 2× le prix original + €200k par niveau d\'amélioration.\n\nExemple : une propriété à €500k au niveau 2 coûte €1 000k + €400k = €1 400k.\n\nSi la propriété est au niveau maximum (3), elle ne peut pas être achetée de cette façon.\n\nAprès achat : l\'argent va au propriétaire précédent et la propriété change de mains en conservant son niveau actuel.',
    },
    {
      title: 'Amélioration',
      body: 'Quand ton pion atterrit sur ta propre propriété, le menu d\'amélioration apparaît :\n\nNiveau 2 — coûte €200k et double le loyer.\nNiveau 3 (max) — coûte €400k et triple le loyer.\n\nTu peux toujours choisir de continuer sans amélioration. Le niveau de chaque propriété est visible sur le plateau via les indicateurs colorés.',
    },
    {
      title: 'Cartes Événement',
      body: 'Il y a 50 cartes événement différentes. Quand tu atterris sur une case Surprise, une carte est tirée au hasard. Beaucoup de choses peuvent arriver :\n\nRecevoir ou payer de l\'argent à la banque, percevoir de tous les joueurs, obliger des joueurs à boire, déplacer ton pion, échanger des positions, relancer les dés, parmi d\'autres situations spéciales.',
    },
    {
      title: 'Shots',
      body: 'Les shots sont suivis par joueur sur le compteur visible sur chaque carte. Quand quelqu\'un doit des shots, le compteur monte. Les shots se boivent en vrai — les autres joueurs à table s\'en assurent.',
    },
    {
      title: 'Fin de Partie',
      body: 'Le jeu n\'a pas de fin automatique. Quand le groupe décide de s\'arrêter, le joueur avec le plus d\'argent gagne. Celui qui a le plus de shots restant à boire est le roi de la nuit.',
    },
  ],

  de: [
    {
      title: 'Ziel',
      body: 'Sammle so viel Geld wie möglich, während deine Gegner trinken. Es gibt keine automatische Endbedingung — das Spiel endet, wenn die Gruppe es entscheidet. Wer bei Spielende das meiste Geld hat, gewinnt.',
    },
    {
      title: 'Spielstart',
      body: 'Erstelle einen Raum und teile den 4-Buchstaben-Code mit den anderen Spielern. Jeder Spieler tritt mit seinem Namen bei. Der Host tippt auf "Spiel starten", wenn alle bereit sind. Jeder Spieler startet mit €1.500k.',
    },
    {
      title: 'Wie Runden Ablaufen',
      body: 'Die Spieler sind der Reihe nach dran. Tippe in deinem Zug auf "Würfeln". Zwei Würfel werden geworfen und die Summe bestimmt, wie viele Felder du vorziehst. Das Spiel löst automatisch auf, was auf dem Feld passiert, auf dem du landest.',
    },
    {
      title: 'Feldtypen',
      body: 'GO — erhalte €200k, jedes Mal wenn du hier vorbeikommst oder landest.\n\nGrundstück — kaufen, Miete zahlen oder dem Besitzer abkaufen.\n\nÜberraschung — ziehe eine zufällige Ereigniskarte aus 50 möglichen.\n\nSteuer — du zahlst automatisch an die Bank.\n\nGefängnis — nur Besuch, nichts passiert.\n\nIns Gefängnis — gehe direkt ins Gefängnis.\n\nFreies Parken — neutrales Feld, ausruhen.',
    },
    {
      title: 'Grundstück Kaufen',
      body: 'Wenn du auf einem herrenlosen Grundstück landest, hast du drei Optionen:\n\n1. Den vollen Preis in bar zahlen.\n2. 60 % in bar und die restlichen 40 % in Shots zahlen — Rabatt gegen Trinken.\n3. Passen und nicht kaufen.',
    },
    {
      title: 'Miete Zahlen',
      body: 'Wenn du auf dem Grundstück eines anderen Spielers landest, entscheidet der Besitzer, wie er kassiert:\n\nGeld — der aktuelle Mietwert, der mit dem Grundstückslevel steigt.\n\nShots — die Menge hängt vom Level ab (Level 1 = 1 Shot, Level 2 = 2 Shots, Level 3 = 3 Shots).\n\nDer gelandete Spieler wartet, während der Besitzer entscheidet.',
    },
    {
      title: 'Grundstück Klauen',
      body: 'Wenn du auf dem Grundstück eines anderen Spielers landest, kannst du es auch direkt kaufen:\n\nPreis = 2× der Originalpreis + €200k pro Upgrade-Level.\n\nBeispiel: Ein €500k-Grundstück auf Level 2 kostet €1.000k + €400k = €1.400k.\n\nIst das Grundstück auf Maxlevel (3), kann es so nicht gekauft werden.\n\nNach dem Kauf: Das Geld geht an den Vorbesitzer, das Grundstück wechselt den Besitzer und behält sein aktuelles Level.',
    },
    {
      title: 'Upgrade',
      body: 'Wenn dein Spielstein auf deinem eigenen Grundstück landet, erscheint das Upgrade-Menü:\n\nLevel 2 — kostet €200k und verdoppelt die Miete.\nLevel 3 (max) — kostet €400k und verdreifacht die Miete.\n\nDu kannst immer ohne Upgrade weiterspielen. Das Level jedes Grundstücks ist auf dem Spielfeld durch farbige Indikatoren sichtbar.',
    },
    {
      title: 'Ereigniskarten',
      body: 'Es gibt 50 verschiedene Ereigniskarten. Wenn du auf einem Überraschungsfeld landest, wird eine Karte zufällig gezogen. Viele Dinge können passieren:\n\nGeld von der Bank erhalten oder zahlen, von allen Spielern kassieren, Spieler zum Trinken zwingen, deinen Spielstein bewegen, Positionen tauschen, erneut würfeln und weitere besondere Situationen.',
    },
    {
      title: 'Shots',
      body: 'Shots werden pro Spieler auf dem Zähler verfolgt, der auf jeder Karte sichtbar ist. Wenn jemand Shots schuldet, steigt der Zähler. Die Shots werden in der Realität getrunken — die anderen Spieler am Tisch sorgen dafür.',
    },
    {
      title: 'Spielende',
      body: 'Das Spiel hat kein automatisches Ende. Wenn die Gruppe aufhören möchte, gewinnt der Spieler mit dem meisten Geld. Wer die meisten noch zu trinkenden Shots hat, ist König der Nacht.',
    },
  ],

  es: [
    {
      title: 'Objetivo',
      body: 'Acumula el máximo de dinero posible mientras tus adversarios beben. No hay condición de fin automática — el juego termina cuando el grupo lo decida. Gana quien tenga más dinero cuando el juego se detenga.',
    },
    {
      title: 'Cómo Empezar',
      body: 'Crea una sala y comparte el código de 4 letras con los otros jugadores. Cada jugador entra con su nombre. El host pulsa "Iniciar Juego" cuando todos estén listos. Cada jugador comienza con €1.500k.',
    },
    {
      title: 'Cómo Funcionan los Turnos',
      body: 'Los jugadores juegan por orden. En tu turno, pulsa "Lanzar Dados". Se lanzan dos dados y el total determina cuántas casillas avanzas. El juego resuelve automáticamente lo que ocurre en la casilla donde caes.',
    },
    {
      title: 'Tipos de Casillas',
      body: 'GO — recibes €200k cada vez que pasas o caes aquí.\n\nPropiedad — puedes comprarla, pagar alquiler o negociar la compra al dueño.\n\nSorpresa — sacas una carta de evento aleatoria entre 50 posibles.\n\nImpuesto — pagas al banco automáticamente.\n\nCárcel — solo visita, no pasa nada.\n\nA la Cárcel — vas directamente a la Cárcel.\n\nAparcamiento Libre — casilla neutral, descansa.',
    },
    {
      title: 'Comprar una Propiedad',
      body: 'Cuando caes en una propiedad sin dueño tienes tres opciones:\n\n1. Pagar el precio completo en dinero.\n2. Pagar el 60 % en dinero y el 40 % restante en shots — descuento con bebida.\n3. Pasar y no comprar.',
    },
    {
      title: 'Pagar Alquiler',
      body: 'Cuando caes en la propiedad de otro jugador, el dueño elige cómo cobrar:\n\nDinero — el valor del alquiler actual, que aumenta con el nivel de la propiedad.\n\nShots — la cantidad depende del nivel (nivel 1 = 1 shot, nivel 2 = 2 shots, nivel 3 = 3 shots).\n\nEl jugador que cayó espera mientras el dueño decide.',
    },
    {
      title: 'Robar una Propiedad',
      body: 'Al caer en la propiedad de otro jugador, también puedes comprarla directamente:\n\nPrecio = 2× el precio original + €200k por cada nivel de mejora.\n\nEjemplo: una propiedad de €500k en nivel 2 cuesta €1.000k + €400k = €1.400k.\n\nSi la propiedad está en nivel máximo (3), no puede comprarse de esta forma.\n\nAl comprar: el dinero va al dueño anterior y la propiedad cambia de manos manteniendo su nivel actual.',
    },
    {
      title: 'Mejorar',
      body: 'Cuando tu ficha cae en tu propia propiedad, aparece el menú de mejora:\n\nNivel 2 — cuesta €200k y duplica el alquiler.\nNivel 3 (máx) — cuesta €400k y triplica el alquiler.\n\nSiempre puedes elegir continuar sin mejorar. El nivel de cada propiedad es visible en el tablero a través de los indicadores de color.',
    },
    {
      title: 'Cartas de Evento',
      body: 'Hay 50 cartas de evento diferentes. Cuando caes en una casilla Sorpresa, se saca una carta al azar. Pueden ocurrir muchas cosas:\n\nRecibir o pagar dinero al banco, cobrar de todos los jugadores, obligar a jugadores a beber, mover tu ficha, intercambiar posiciones, lanzar los dados de nuevo, entre otras situaciones especiales.',
    },
    {
      title: 'Shots',
      body: 'Los shots se rastrean por jugador en el contador visible en cada carta. Cuando alguien debe shots, el contador sube. Los shots se beben en la realidad — los demás jugadores en la mesa se encargan de que se cumpla.',
    },
    {
      title: 'Fin del Juego',
      body: 'El juego no tiene fin automático. Cuando el grupo decida parar, gana quien tenga más dinero. Quien tenga más shots por beber es el rey de la noche.',
    },
  ],
};

export function getRulesSections(locale: Locale): RulesSection[] {
  return RULES[locale] ?? RULES.pt;
}
