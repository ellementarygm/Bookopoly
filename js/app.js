const svg = d3.select("#board");
const width = 700;
const height = 700;

svg.attr("width", width).attr("height", height);

const cornerSize = width / 7.5;
const numSideTiles = 9;
const tileWidth = (width - 2 * cornerSize) / numSideTiles;
const tileHeight = cornerSize;
const strokeWidth = 2;
allPrompts = []
chancePrompts = []
class BoardSpace {
    constructor(type, index, imagePath = null, prompt = false, modifier = false, destination = false) {
        this.type = type;
        this.index = index;
        this.imagePath = imagePath;

        this.prompt = prompt;
        this.modifier = modifier;
        this.destination = destination;

        this.isCorner = index % 10 === 0;
        this.computePosition();
    }

    computePosition() {
        const i = this.index;
        if (i === 0) { this.x = width - cornerSize; this.y = height - cornerSize; this.side = "bottom"; }
        else if (i > 0 && i < 10) { this.x = width - cornerSize - i * tileWidth; this.y = height - cornerSize; this.side = "bottom"; }
        else if (i === 10) { this.x = 0; this.y = height - cornerSize; this.side = "left"; }
        else if (i > 10 && i < 20) { this.x = 0; this.y = height - cornerSize - (i - 10) * tileWidth; this.side = "left"; }
        else if (i === 20) { this.x = 0; this.y = 0; this.side = "top"; }
        else if (i > 20 && i < 30) { this.x = cornerSize + (i - 21) * tileWidth; this.y = 0; this.side = "top"; }
        else if (i === 30) { this.x = width - cornerSize; this.y = 0; this.side = "right"; }
        else { this.x = width - cornerSize; this.y = cornerSize + (i - 31) * tileWidth; this.side = "right"; }
    }

    getRotation() {
        return { bottom: 0, left: 90, top: 180, right: -90 }[this.side];
    }

    draw(group) {
        const horizontal = this.side === "top" || this.side === "bottom";
        const tileW = this.isCorner ? cornerSize : horizontal ? tileWidth : tileHeight;
        const tileH = this.isCorner ? cornerSize : horizontal ? tileHeight : tileWidth;
        const cx = this.x + tileW / 2;
        const cy = this.y + tileH / 2;

        if (this.imagePath) {
            let imgW = this.isCorner ? tileW : tileHeight * 74 / 120;
            let imgH = this.isCorner ? tileH : tileHeight;
            const rotation = this.isCorner ? 0 : this.getRotation();

            group.append("image")
                .attr("href", this.imagePath)
                .attr("x", cx - imgW / 2)
                .attr("y", cy - imgH / 2)
                .attr("width", imgW)
                .attr("height", imgH)
                .attr("preserveAspectRatio", "xMidYMid meet")
                .attr("transform", `rotate(${rotation}, ${cx}, ${cy})`);
        }

        group.append("rect")
            .attr("x", this.x)
            .attr("y", this.y)
            .attr("width", tileW)
            .attr("height", tileH)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", strokeWidth);

        this.centerX = cx;
        this.centerY = cy;
    }
}
spacePrompts = {}

class Board {
    constructor(group) {
        this.group = group;
        this.spaces = [];

        this.highlight = this.group.append("rect")
            .attr("fill", "none")
            .attr("stroke", "#bd4a49")
            .attr("stroke-width", 4)
            .attr("rx", 4)
            .attr("ry", 4)
            .raise();
    }

    async init() {
        const [chestRes, chanceRes] = await Promise.all([
            fetch("data/ChestCards.json"),
            fetch("data/ChanceCards.json")
        ]);

        this.chestCards = await chestRes.json();
        this.chanceCards = await chanceRes.json();

        await this.setSpaces();

        this.chanceCards.forEach((card) => {
            if (card?.modifier && card.modifier == "month") {
                const today = new Date();
                const monthIndex = today.getMonth() + 1;
                let keywords = getSeasonalWords(monthIndex);
                allPrompts.push(`${card.description} ${keywords}`);
                chancePrompts.push(`${card.description} ${keywords}`);
            } else {
                allPrompts.push(card.description);
                chancePrompts.push(card.description);
            }
        })
    }


    async setSpaces() {
        const res = await fetch("data/Spaces.json");
        const data = await res.json();

        this.spaceData = data;

        this.spaces = data.map(space =>
            new BoardSpace(
                space.type,
                space.index,
                space.path,
                space?.prompt,
                space?.modifier,
                space?.destination
            )
        );

        this.spaces.forEach((space) => {
            if (space?.prompt) {
                allPrompts.push(space.prompt);
                spacePrompts[space.index] = space.prompt;
            }
        });
    }

    draw() {
        const innerSize = width - 2 * cornerSize;
        this.group.append("image")
            .attr("href", "assets/inner.svg")
            .attr("x", cornerSize)
            .attr("y", cornerSize)
            .attr("width", innerSize)
            .attr("height", innerSize)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .lower();

        this.spaces.forEach(s => s.draw(this.group));
    }

    highlightSpace(space) {
        const horizontal = space.side === "top" || space.side === "bottom";
        const tileW = space.isCorner ? cornerSize : horizontal ? tileWidth : tileHeight;
        const tileH = space.isCorner ? cornerSize : horizontal ? tileHeight : tileWidth;

        this.highlight
            .attr("x", space.x + 1)
            .attr("y", space.y + 1)
            .attr("width", tileW - 2)
            .attr("height", tileH - 2)
            .raise();
    }
}
function getDate() {
    const today = new Date();
    const local = today.toLocaleDateString('en-CA');
    return local;
}

const completeBtn = document.getElementById("complete-btn");
const rejectBtn = document.getElementById("reject-btn");
const bookInput = document.getElementById("book-title-input");
completeBtn.onclick = () => {
    if (bookInput.value == "") { return; }
    let title = bookInput.value;
    bookInput.value = "";
    player1.completePrompt(title, getDate());

};
rejectBtn.onclick = () => {  
    rejectBtn.disabled = true;
    player1.rejectPrompt(getDate());
    player1.saveToLocal();
};
function getSeasonalWords(index) {
    const monthWordsByIndex = [
        null,
        ["Secret", "Gold", "City", "One", "Year", "Stone", "Every", "Light"],       // January
        ["Dream", "Heart", "Crown", "Mine", "Sweet", "Love", "Time", "Bride"],      // February
        ["Lie", "Iron", "Never", "Magic", "Ruin", "True", "Heir", "King"],          // March
        ["Heart", "Friend", "Crazy", "Hope", "Good", "Broken", "Heart", "Date"],    // April
        ["Obsession", "Shadow", "Kingdom", "Rose", "Hill", "Maybe", "Hate", "God/Goddess"], // May
        ["Day", "You", "End", "Star", "On", "Season", "Storm", "Fate"],             // June
        ["Wild", "Island", "Disaster", "Kiss", "Way", "Keep", "Boy/Girl", "Always"], // July
        ["Drown", "Best", "Story", "Lost", "Sword", "Sea", "Our", "Know"],          // August
        ["Sweet", "Ink", "Academy", "Pride", "Spell", "Name", "Book", "Hollow"],    // September
        ["Witch", "Dark", "Bury", "Moon", "Blood", "Bone", "Ghost", "Only"],         // October
        ["Spice", "Hunt", "Woods", "Never", "Night", "Shadow", "Fall", "Smoke"],    // November
        ["Yours", "Silver", "Date", "Wish", "Last", "Vow", "Child", "We"]           // December
    ];
    return monthWordsByIndex[index].join(", ");
}
function getCurrentSeason() {
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec

    if (month >= 2 && month <= 4) return "spring";   // Mar–May
    if (month >= 5 && month <= 7) return "summer";   // Jun–Aug
    if (month >= 8 && month <= 10) return "fall";    // Sep–Nov
    return "winter";                                // Dec–Feb
}
function getAcrossIndex(index) {
    let result = 0;
    if (index > 0 && index < 10) {
        result = (30 - index);
    } else if (index > 10 && index < 20) {
        result = 50 - index;
    } else if (index > 20 && index < 30) {
        result = 30 - index;
    } else if (index > 30 && index < 40) {
        result = 50 - index;
    }
    return result;
}

class Player {
    constructor(board, svgPath = "assets/ReaderToken.svg", startIndex = 0) {
        this.currentPrompt = "You do not have a current prompt. Roll to continue.";
        this.goRewards = -1;
        this.claimedRewards = 0;
        this.rerollCount = 4;
        this.hasRerolled = false;
        this.hasDoubleChance = false;
        this.moveToDestination = false
        this.animalToGo = false;
        this.canRoll = true;
        this.inJail = false;
        this.jailCount = 0;
        this.hasPrompt = false;
        this.hasChancePrompt = false;
        this.history = [];
        this.board = board;
        this.index = startIndex;
        this.promptText = document.getElementById("current-prompt");
        this.historyTable = document.getElementById("prompt-history-body");
        this.space = board.spaces[0];
        // --- CARD STATE ---
        this.cards = [];
        // board.chestCards.forEach((card) => {

        //     this.cards.push(card);
        // })
        // console.log("cards", this.cards)
        this.currentCardIndex = 0;

        // --- TOKEN SETUP ---
        const s = board.spaces[startIndex];
        this.scale = 1;
        this.naturalSize = 50;

        this.token = board.group.append("image")
            .attr("href", svgPath)
            .attr("width", this.naturalSize * this.scale)
            .attr("height", this.naturalSize * this.scale)
            .attr("x", s.centerX - (this.naturalSize * this.scale) / 2)
            .attr("y", s.centerY - (this.naturalSize * this.scale) / 2)
            .attr("transform", `rotate(${this.getRotation(s)}, ${s.centerX}, ${s.centerY})`);

        board.highlightSpace(s);
        this.token.raise();

        // --- DOM ELEMENTS ---
        this.leftCard = document.getElementById("left-card");
        this.currentCard = document.getElementById("current-card");
        this.rightCard = document.getElementById("right-card");
        this.overlay = document.getElementById("cards-overlay");
        this.cardsBtn = document.getElementById("cards-btn");
        this.closeBtn = document.getElementById("close-btn");
        this.playBtn = document.getElementById("play-btn");

        const badge = document.querySelector(".badge");
        if (badge) badge.textContent = this.cards.length;

        // --- EVENT LISTENERS ---
        this.cardsBtn.addEventListener("click", () => this.showCards());
        this.closeBtn.addEventListener("click", () => this.hideCards());
        this.playBtn.addEventListener("click", () => this.playCard());
        this.rightCard.addEventListener("click", () => this.scroll("right"));
        this.leftCard.addEventListener("click", () => this.scroll("left"));

        // Render initial cards
        this.updateCardDisplay();
    }
    saveToLocal() {
        const state = this.getState();
        localStorage.setItem("playerState", JSON.stringify(state));
    }
    static fromState(board, state) {
        const player = new Player(board);

        player.index = state.index;
        player.space = board.spaces[state.index];

        player.currentPrompt = state.currentPrompt;
        player.hasPrompt = state.hasPrompt;
        player.hasChancePrompt = state.hasChancePrompt;

        player.inJail = state.inJail;
        player.jailCount = state.jailCount;

        player.rerollCount = state.rerollCount;

        player.history = state.history || [];
        player.cards = state.cards || [];

        player.goRewards = state.goRewards;
        player.claimedRewards = state.claimedRewards || 0;
        player.hasDoubleChance = state.hasDoubleChance;
        player.moveToDestination = state.moveToDestination;
        player.animalToGo = state.animalToGo;
        player.canRoll = state.canRoll;

        player.placeOnIndex(state.index);
        const badge = document.getElementById("card-badge");
        badge.textContent = player.cardCount();

        return player;
    }
    getState() {
        return {
            index: this.index,
            currentPrompt: this.currentPrompt,
            hasPrompt: this.hasPrompt,
            hasChancePrompt: this.hasChancePrompt,
            inJail: this.inJail,
            jailCount: this.jailCount,
            rerollCount: this.rerollCount,
            history: this.history,
            cards: this.cards,
            goRewards: this.goRewards,
            claimedRewards: this.claimedRewards,
            hasDoubleChance: this.hasDoubleChance,
            moveToDestination: this.moveToDestination,
            animalToGo: this.animalToGo,
            canRoll: this.canRoll
        };
    }
    // -----------------------
    // CARD API
    // -----------------------
    cardCount() {
        return this.cards.length;
    }
    saveCard(card) {
        this.cards.push(card);
        this.currentCardIndex = this.cards.length - 1;
        this.updateCardDisplay();
        player1.saveToLocal();
    }
    checkCondition(condition) {
        const conditions = {
            "on_go_animal_sanctuary": () => {
                let index = this.space.index;
                return index == 30;
            },
            "no_jail": () => {
                return !this.inJail;
            },
            "rolling": () => {
                return false;
            },
            "has_prompt_across": () => {
                const bad = [0, 2, 7, 8, 14, 17, 30, 22, 23, 28, 33, 36];
                return this.hasPrompt && !(bad.includes(this.space.index));
            },
            "has_property_color": () => {
                const brown = [1, 3];
                const ltBlue = [6, 8, 9];
                const pink = [11, 13, 14];
                const orange = [16, 18, 19];
                const red = [21, 23, 24];
                const yellow = [26, 27, 29];
                const green = [31, 32, 34];
                const blue = [37, 39];

                let index = this.space.index;

                return (
                    brown.includes(index) ||
                    ltBlue.includes(index) ||
                    pink.includes(index) ||
                    orange.includes(index) ||
                    red.includes(index) ||
                    yellow.includes(index) ||
                    green.includes(index) ||
                    blue.includes(index)
                );
            },
            "in_jail": () => {
                return this.inJail && this.hasPrompt;
            },
            "in_jail_1": () => {
                return this.inJail && this.jailCount == 1;
            },
            "on_chance": () => {
                const chanceSpaces = [7, 22, 36]
                let index = this.space.index;
                return chanceSpaces.includes(index) && false;
            },
            "has_prompt": () => {
                return this.hasPrompt && !this.inJail;
            },
            "has_side_prompt": () => {
                return this.hasPrompt && !this.inJail && !this.space.isCorner;
            },
            "no_prompt": () => {
                return !this.hasPrompt;
            }
        }

        if (!conditions[condition]) {
            console.warn(`Unknown condition: ${condition}`);
            return true;
        }

        return conditions[condition]();
    }
    doAction(action) {
        const actions = {
            "move_to_index": () => {
                let destination = this.playedCard.destination;
                if (this.hasPrompt) {

                    let data = {
                        "prompt": this.getCurrentPrompt(),
                        "title": `PROMPT SKIPPED (${this.playedCard.title})`,
                        "date":  getDate()
                    }
                    this.history.push(data);
                    this.hasPrompt = false;
                    this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                }
                this.moveToIndex(destination);
            },
            "reject_prompt": () => {
                this.rejectPrompt( getDate(), false);
            },
            "reroll": () => {
                this.rerollCount++;
            },
            "dnf_prompt": () => {

                let data = {
                    "prompt": this.getCurrentPrompt(),
                    "title": `DNF PROMPT. (${this.playedCard.title})`,
                    "date":  getDate()
                }
                this.history.push(data);
                this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                this.hasPrompt = false;
                this.hasChancePrompt = false;
                this.canRoll = true;
                rollBtn.disabled = false;
            },
            "choose_any_chance": () => {

                let data = {
                    "prompt": this.getCurrentPrompt(),
                    "title": `PROMPT REPLACED. (${this.playedCard.title})`,
                    "date":  getDate()
                }
                this.history.push(data);

                togglePromptList(true, chancePrompts);

            },
            "choose_any_prompt": () => {
                if (this.hasPrompt) {

                    let data = {
                        "prompt": this.getCurrentPrompt(),
                        "title": `PROMPT REPLACED. (${this.playedCard.title})`,
                        "date":  getDate()
                    }
                    this.history.push(data);
                }
                togglePromptList(true, allPrompts);
            },
            "animal_sanctuary_go": () => {
                this.animalToGo = true;
            },
            "move_to_current_season": () => {
                const seasons = {
                    "spring": 5,
                    "summer": 15,
                    "fall": 25,
                    "winter": 35
                }
                let current = getCurrentSeason();
                if (this.hasPrompt) {

                    let data = {
                        "prompt": this.getCurrentPrompt(),
                        "title": `PROMPT SKIPPED (${this.playedCard.title})`,
                        "date":  getDate()
                    }
                    this.history.push(data);
                    this.hasPrompt = false;
                    this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                }
                this.moveToIndex(seasons[current]);
            },
            "remove_jail": () => {

                let data = {
                    prompt: this.currentPrompt,
                    title: `JAIL REMOVED. (${this.playedCard.title})`,
                    date:  getDate()
                };

                this.jailCount = this.jailCount + 1;
                let prev = `(Jail: ${this.jailCount - 1}/2)`
                let next = data.prompt.replace(prev, `(Jail: ${this.jailCount}/2)`)
                data.prompt = next;
                this.currentPrompt = next;
                this.history.push(data);
                if (this.jailCount >= 2) {
                    this.canRoll = true;
                    rollBtn.disabled = false;
                    this.inJail = false;
                    this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                    this.hasPrompt = false;
                    this.hasChancePrompt = false;
                    this.jailCount = 0;
                } else {
                    this.canRoll = false;
                    rollBtn.disabled = true;
                    this.hasPrompt = true;
                }
                this.setPromptWindow();
            },
            "replace_prompt": () => {

                let data = {
                    "prompt": this.getCurrentPrompt(),
                    "title": `PROMPT REPLACED. (${this.playedCard.title})`,
                    "date":  getDate()
                }
                this.history.push(data);

                this.currentPrompt = `${this.playedCard.title}: ${this.playedCard.description}`;
                this.hasPrompt = true;
                this.hasChancePrompt = false;
                this.canRoll = false;
                rollBtn.disabled = true;
                this.setPromptWindow();
            },
            "skip_prompt": () => {

                let data = {
                    prompt: this.getCurrentPrompt(),
                    title: `PROMPT SKIPPED. (${this.playedCard.title})`,
                    date:  getDate()
                };
                this.history.push(data);

                this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                this.hasPrompt = false;
                this.canRoll = true;
                rollBtn.disabled = false;
                this.setPromptWindow();
            },
            "swap_prompt_across": () => {
                let index = getAcrossIndex(this.space.index);
                let prompt = spacePrompts?.[index] ? spacePrompts[index] : "Error in your favor, choose any prompt!";

                let data = {
                    prompt: this.getCurrentPrompt(),
                    title: `PROMPT SWAPPED. (${this.playedCard.title})`,
                    date:  getDate()
                };
                this.history.push(data);

                this.currentPrompt = prompt;
                this.hasPrompt = true;
                this.canRoll = false;
                rollBtn.disabled = true;
                this.setPromptWindow();
            },
            "swap_prompt_color": () => {

                let data = {
                    "prompt": this.getCurrentPrompt(),
                    "title": `PROMPT SWAPPED. (${this.playedCard.title})`,
                    "date":  getDate()
                }
                this.history.push(data);

                const colorGroups = {
                    brown: [1, 3],
                    ltBlue: [6, 8, 9],
                    pink: [11, 13, 14],
                    orange: [16, 18, 19],
                    red: [21, 23, 24],
                    yellow: [26, 27, 29],
                    green: [31, 32, 34],
                    blue: [37, 39]
                };

                const index = this.space.index;

                for (const group of Object.values(colorGroups)) {
                    if (group.includes(index)) {
                        const prompts = group.map(i => spacePrompts[i]);
                        togglePromptList(true, prompts);
                        break;
                    }
                }
            },
            "swap_prompt_side": () => {
                const sideGroups = {
                    bottom: [1, 3, 4, 5, 6, 8, 9],
                    left: [11, 12, 13, 14, 16, 18, 19],
                    top: [21, 23, 24, 25, 26, 27, 28, 29],
                    right: [31, 32, 34, 35, 37, 38, 39]
                };

                const index = this.space.index;


                let data = {
                    "prompt": this.getCurrentPrompt(),
                    "title": `PROMPT SWAPPED. (${this.playedCard.title})`,
                    "date":  getDate()
                }
                this.history.push(data);

                for (const group of Object.values(sideGroups)) {
                    if (group.includes(index)) {
                        const prompts = group.map(i => spacePrompts[i]);
                        togglePromptList(true, prompts);
                        break;
                    }
                }
            },
            "move_to_seasonal": () => {
                const seasonal = [5, 15, 25, 35];
                const currentIndex = this.space.index;
                let index = seasonal.find(i => i > currentIndex) ?? seasonal[0];
                if (this.hasPrompt) {

                    let data = {
                        "prompt": this.getCurrentPrompt(),
                        "title": `PROMPT SKIPPED (${this.playedCard.title})`,
                        "date":  getDate()
                    }
                    this.history.push(data);
                    this.hasPrompt = false;
                    this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                }
                this.moveToIndex(index);
            },
            "move_to_utility": () => {
                const utility = [12, 28];
                const currentIndex = this.space.index;
                let index = utility.find(i => i > currentIndex) ?? utility[0];
                if (this.hasPrompt) {

                    let data = {
                        "prompt": this.getCurrentPrompt(),
                        "title": `PROMPT SKIPPED (${this.playedCard.title})`,
                        "date":  getDate()
                    }
                    this.history.push(data);
                    this.hasPrompt = false;
                    this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                }
                this.moveToIndex(index);
            },
            "double_next_go": () => {
                this.doubleGo = true;
            },
            "move_to_any_three": () => {

                let data = {
                    prompt: this.getCurrentPrompt(),
                    title: `PROMPT SKIPPED. (${this.playedCard.title})`,
                    date:  getDate()
                };
                this.history.push(data);

                this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                this.hasPrompt = false;
                this.setPromptWindow();

                openMoveSpacesModal();
            },
            "double_chance": () => {
                this.hasDoubleChance = false;
            }
        }
        if (actions[action]) {
            actions[action]();
        } else {
            console.warn(`Unknown action: ${action}`);
        }

    }
    playCard() {
        if (!this.cards.length) return;
        this.hideCards();
        const card = this.cards[this.currentCardIndex];
        if (card.condition && !this.checkCondition(card.condition)) {
            // Does not meet condition to play
            return;
        }

        this.playedCard = card;
        this.doAction(card.action);
        this.cards.splice(this.currentCardIndex, 1);

        const buttonEl = document.getElementById("cards-btn");
        const badge = buttonEl.querySelector(".badge");
        badge.textContent = player1.cardCount();
        badge.classList.add("updated");
        setTimeout(() => badge.classList.remove("updated"), 300);

        // Adjust index
        if (this.currentCardIndex >= this.cards.length) {
            this.currentCardIndex = this.cards.length - 1;
        }

        this.updateCardDisplay();
        this.saveToLocal();
    }

    getCards() {
        return [...this.cards];
    }

    showCards() {
        this.overlay.style.display = "flex";
        this.currentCardIndex = 0;
        this.updateCardDisplay();
        disableMainButtons(true);
    }
    hideCards() {
        this.overlay.style.display = "none";
        disableMainButtons(false, true);
    }
    updateCardTransforms() {
        const radius = 220;     
        const angleStep = 35;   

        const cards = [
            { el: this.leftCard, offset: -1 },
            { el: this.currentCard, offset: 0 },
            { el: this.rightCard, offset: 1 }
        ];

        cards.forEach(({ el, offset }) => {
            if (!el || el.style.display === "none") return;

            const angle = offset * angleStep;
            const z = Math.cos(angle * Math.PI / 180) * radius;
            const x = Math.sin(angle * Math.PI / 180) * radius;

            el.style.transform = `
            translateX(${x}px)
            rotateY(${angle}deg)
            translateZ(${z}px)
        `;

            el.style.opacity = offset === 0 ? "1" : "0.6";
        });
    }
    buildCardHTML(card) {
        const html = `
        <img class="card-front-img" src="assets/ChestFront.svg">
        <div class="card-text-overlay">
            <h2 class="card-title">${card.title}</h2>
            <p class="card-desc">${card.description}</p>
        </div>
    `;

        const temp = document.createElement("div");
        temp.innerHTML = html;

        const p = temp.querySelector(".card-desc");
        const len = p.textContent.length;
        p.style.fontSize =
            len > 150 ? "12px" :
                len > 100 ? "14px" : "16px";

        return temp.innerHTML;
    }
    updateCardDisplay() {
        if (!this.cards.length) {
            this.currentCard.innerHTML = this.buildCardHTML({ title: "OUT OF CARDS", description: "" });
            this.leftCard.style.display = "none";
            this.rightCard.style.display = "none";
            this.playBtn.disabled = true;
            return;
        }

        this.playBtn.disabled = false;
        this.leftCard.style.display = "block";
        this.rightCard.style.display = "block";
        if (this.cards.length == 1) {
            this.leftCard.style.display = "none";
            this.rightCard.style.display = "none";
        }
        if (this.cards.length == 2) {
            this.leftCard.style.display = "none";
        }
        let card = this.cards[this.currentCardIndex];
        if (card?.condition) {
            this.playBtn.disabled = !this.checkCondition(card.condition);
        } else {
            this.playBtn.disabled = false;
        }
        const indices = [
            (this.currentCardIndex - 1 + this.cards.length) % this.cards.length,
            this.currentCardIndex,
            (this.currentCardIndex + 1) % this.cards.length
        ];

        const elements = [this.leftCard, this.currentCard, this.rightCard];

        elements.forEach((el, i) => {
            el.innerHTML = this.buildCardHTML(this.cards[indices[i]]);

            const angle =
                this.carouselAngle +
                (i - 1) * this.cardSpacingAngle;

            el.style.transform = `
            rotateY(${angle}deg)
            translateZ(${this.carouselRadius}px)
        `;

            el.style.opacity = i === 1 ? "1" : "0.6";
            el.style.zIndex = i === 1 ? "3" : "1";
        });
        this.updateCardTransforms();
    }
    rejectPrompt(date, illegal = true) {
        if (this.inJail) { return; }
        this.inJail = illegal;
        rejectBtn.disabled = illegal;
        let data = {
            "prompt": this.getCurrentPrompt(),
            "title": illegal ? "PROMPT REJECTED." : `PROMPT REJECTED. (${this.playedCard.title})`,
            "date": date
        }
        this.history.push(data);
        this.canRoll = true;
        rollBtn.disabled = false;
        this.currentPrompt = illegal ? "Prompt rejected. You must read two books to complete the next prompt." : `Prompt rejected. (${this.playedCard.title}) Roll to continue.`;
        this.hasPrompt = false;
        this.hasChancePrompt = false;
        this.setPromptWindow();
        this.saveToLocal();
    }
    completePrompt(title, date) {
        let data = {
            "prompt": this.currentPrompt,
            "title": title,
            "date": date
        }

        if (this.inJail) {
            this.jailCount = this.jailCount + 1;
            let prev = `(Jail: ${this.jailCount - 1}/2)`
            let next = data.prompt.replace(prev, `(Jail: ${this.jailCount}/2)`)
            data.prompt = next;
            this.currentPrompt = next;
            this.history.push(data);
            if (this.jailCount >= 2) {
                this.canRoll = true;
                this.inJail = false;
                this.currentPrompt = "You do not have a current prompt. Roll to continue.";
                this.hasPrompt = false;
                this.hasChancePrompt = false;
                this.jailCount = 0;
            } else {
                this.canRoll = false;
                this.hasPrompt = true;
            }
            this.setPromptWindow();
            return;
        }
        this.history.push(data);
        this.canRoll = true;
        this.currentPrompt = "You do not have a current prompt. Roll to continue.";
        this.hasPrompt = false;
        this.hasChancePrompt = false;
        this.setPromptWindow();
        this.saveToLocal();
    }
    createHistoryRow(data, index) {
        const { prompt, title, date } = data;

        const tr = document.createElement("tr");

        // Prompt
        const tdPrompt = document.createElement("td");
        tdPrompt.textContent = prompt;
        tr.appendChild(tdPrompt);

        // Title
        const tdTitle = document.createElement("td");
        tdTitle.textContent = title;
        tr.appendChild(tdTitle);

        // Date
        const tdDate = document.createElement("td");
        tdDate.textContent = date;
        tr.appendChild(tdDate);

        // Action button cell
        const tdActions = document.createElement("td");

        const btn = document.createElement("button");
        btn.classList.add("edit-btn");
        btn.addEventListener("click", () => {
            const titleCell = tdTitle;
            const oldTitle = titleCell.textContent;

            const input = document.createElement("input");
            input.type = "text";
            input.value = oldTitle;

            titleCell.textContent = "";
            titleCell.appendChild(input);
            input.focus();

            const save = () => {
                const newTitle = input.value.trim() || oldTitle;
                titleCell.textContent = newTitle;
                this.history[index].title = newTitle;
                player1.saveToLocal();
            };

            input.addEventListener("blur", save);
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") titleCell.textContent = oldTitle;
            });
        });

        const img = document.createElement("img");
        img.src = "assets/Edit.svg";
        img.alt = "✏️";

        btn.appendChild(img);
        tdActions.appendChild(btn);

        tr.appendChild(tdActions);

        return tr;
    }
    getCurrentPrompt() {
        if (this.hasChancePrompt) {
            if (this.inJail) {
                this.currentPrompt = `${this.currentChance.description} (Jail: ${this.jailCount}/2)`;
            } else {
                this.currentPrompt = this.currentChance.description;
            }
        }
        return this.currentPrompt;
    }
    setPromptWindow() {
        completeBtn.disabled = !this.hasPrompt;
        rejectBtn.disabled = !this.hasPrompt;
        bookInput.disabled = !this.hasPrompt;
        if (this.hasPrompt && this.inJail) {
            rejectBtn.disabled = true;
        }
        if (this.hasChancePrompt) {
            if (this.inJail) {
                this.currentPrompt = `${this.currentChance.description} (Jail: ${this.jailCount}/2)`;
            } else {
                this.currentPrompt = this.currentChance.description;
            }
        }
        bookInput.value = "";

        this.promptText.textContent = this.currentPrompt;
        this.historyTable.innerHTML = "";
        [...this.history]
            .reverse()
            .forEach((data, i) => {
                let realIndex = this.history.length - 1 - i;
                let row = this.createHistoryRow(data, realIndex);
                this.historyTable.appendChild(row);
            });
        player1.saveToLocal();
    }
    setChancePrompt(space) {
        this.hasChancePrompt = true;
        this.hasPrompt = true;
        player1.saveToLocal();
    }
    setPrompt(space, random = false) {
        if (space?.prompt) {
            this.hasPrompt = true;
            if (this.inJail) {
                if (random) {
                    this.currentPrompt = `${space.prompt} (${random}) (Jail: ${this.jailCount}/2)`;
                } else {
                    this.currentPrompt = `${space.prompt} (Jail: ${this.jailCount}/2)`;
                }
            } else {
                if (random) {
                    this.currentPrompt = `${space.prompt} (${random})`;
                } else {
                    this.currentPrompt = space.prompt;
                }
            }
        } else {
            this.hasPrompt = false;
            this.hasChancePrompt = false;
            this.currentPrompt = "You do not have a current prompt. Roll to continue."
        };
        this.saveToLocal();
    }
    setSpace(space) {
        this.space = space;
        this.canRoll = false;
        this.hasChancePrompt = false;
        this.hasPrompt = false;

        if (this.space.type == "basic") {
            this.canRoll = false;
            this.setPrompt(this.space);
        } else if (this.space.type == "chance") {
            this.canRoll = false;
            this.setChancePrompt();
        } else if (this.space.type == "random") {
            this.canRoll = false;
            let random = this.getRandom(this.space.modifier);
            this.setPrompt(this.space, random);
        } else if (this.space.type == "moveTo") {
            let index = this.space.destination;
            if (this.space.index == 30 && this.animalToGo) {
                index = 0;
                this.animalToGo = false;
            }
            this.moveToDestination = index;
        } else {
            this.canRoll = true;
        }
        this.saveToLocal();
    }

    getRandom(modifier) {
        const mods = {
            randomColor: () => {
                const options = [
                    "Red",
                    "Orange",
                    "Yellow",
                    "Light Green",
                    "Green",
                    "Light Blue",
                    "Blue",
                    "Light Purple",
                    "Purple",
                    "Pink",
                    "Gold or Silver",
                    "More Than 7 Colors",
                    "Aqua/Teal",
                    "Black",
                    "White",
                    "Gray"
                ];

                const i = Math.floor(Math.random() * options.length);
                return options[i];
            },

            randomLetter: () => {
                const letters = [
                    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
                    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y"
                ];
                return letters[Math.floor(Math.random() * letters.length)];
            }
        };
        if (!mods[modifier]) {
            console.warn("Unknown modifier:", modifier);
            return null;
        }

        return mods[modifier]();
    }

    scroll(direction) {
        if (!this.cards.length) return;

        this.currentCardIndex =
            direction === "right"
                ? (this.currentCardIndex + 1) % this.cards.length
                : (this.currentCardIndex - 1 + this.cards.length) % this.cards.length;

        let card = this.cards[this.currentCardIndex];
        this.playBtn.disabled = (card.condition && !this.checkCondition(card.condition));

        this.updateCardDisplay();
    }

    // -----------------------
    // BOARD MOVEMENT
    // -----------------------
    getRotation(space) {
        if (space.isCorner) {
            switch (space.index) {
                case 0: return 0;
                case 10: return 0;
                case 20: return 180;
                case 30: return 180;
                default: return 0;
            }
        }
        return { bottom: 0, left: 90, top: 180, right: 270 }[space.side] || 0;
    }
    moveToIndex(endIndex) {
        disableMainButtons(true);
        const start = this.index;
        const end = ((endIndex % 40) + 40) % 40;

        let steps;
        if (end === start) steps = 40;
        else if (end > start) steps = end - start;
        else steps = (40 - start) + end;

        this.index = end;

        const path = [];
        const push = i => path.push(this.board.spaces[i]);
        for (let i = 0; i <= steps; i++) {
            push((start + i) % 40);
        }

        const token = this.token;
        const highlight = this.board.highlight;

        const interpolateRotation = (rotA, rotB, f) => {
            let delta = rotB - rotA;
            delta = ((delta + 180) % 360) - 180;
            return rotA + delta * f;
        };

        // --- GO crossing flag ---
        let crossedGo = false;

        token.transition()
            .duration(path.length * 300)
            .ease(d3.easeLinear)
            .attrTween("x", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                // --- trigger GO reward when passing index 0 ---
                if (!crossedGo && path[a].index === 0 && end !== 0) {
                    crossedGo = true;
                    incrementGoCounter(this);
                }

                const x =
                    (path[a].centerX * (1 - f) + path[b].centerX * f) -
                    (this.naturalSize * this.scale) / 2;

                const space = path[a];
                const horizontal = space.side === "top" || space.side === "bottom";
                const tileW = space.isCorner ? cornerSize : horizontal ? tileWidth : tileHeight;
                highlight.attr("x", space.x + 1).attr("width", tileW - 2);

                return x;
            })
            .attrTween("y", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                const y =
                    (path[a].centerY * (1 - f) + path[b].centerY * f) -
                    (this.naturalSize * this.scale) / 2;

                const space = path[a];
                const horizontal = space.side === "top" || space.side === "bottom";
                const tileH = space.isCorner ? cornerSize : horizontal ? tileHeight : tileWidth;
                highlight.attr("y", space.y + 1).attr("height", tileH - 2);

                return y;
            })
            .attrTween("transform", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                const cx = path[a].centerX * (1 - f) + path[b].centerX * f;
                const cy = path[a].centerY * (1 - f) + path[b].centerY * f;

                const rotA = this.getRotation(path[a]);
                const rotB = this.getRotation(path[b]);
                const rot = interpolateRotation(rotA, rotB, f);

                return `rotate(${rot}, ${cx}, ${cy})`;
            })
            .on("end", () => {
                disableMainButtons(false, true);
                const landedSpace = this.board.spaces[this.index];
                this.board.highlightSpace(landedSpace);
                player1.setSpace(landedSpace);
                if (typeof showSpaceOverlay === "function") showSpaceOverlay(landedSpace);
            });

        token.raise();
    }
    moveBy(steps) {
        const start = this.index;
        const rawEnd = start + steps;
        const end = rawEnd % 40;
        this.index = end;

        const path = [];
        const push = i => path.push(this.board.spaces[i]);
        if (end >= start) for (let i = start; i <= end; i++) push(i);
        else { for (let i = start; i < 40; i++) push(i); for (let i = 0; i <= end; i++) push(i); }

        const token = this.token;
        const highlight = this.board.highlight;
        const interpolateRotation = (rotA, rotB, f) => {
            let delta = rotB - rotA;
            delta = ((delta + 180) % 360) - 180;
            return rotA + delta * f;
        };

        // --- GO crossing flag ---
        let crossedGo = false;

        token.transition()
            .duration(path.length * 300)
            .ease(d3.easeLinear)
            .attrTween("x", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                // --- trigger GO reward when passing index 0 ---
                if (!crossedGo && path[a].index === 0 && end !== 0) {
                    crossedGo = true;
                    incrementGoCounter(this);
                }

                const x = (path[a].centerX * (1 - f) + path[b].centerX * f) - (this.naturalSize * this.scale) / 2;
                const space = path[a];
                const horizontal = space.side === "top" || space.side === "bottom";
                const tileW = space.isCorner ? cornerSize : horizontal ? tileWidth : tileHeight;
                highlight.attr("x", space.x + 1).attr("width", tileW - 2);
                return x;
            })
            .attrTween("y", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                const y = (path[a].centerY * (1 - f) + path[b].centerY * f) - (this.naturalSize * this.scale) / 2;
                const space = path[a];
                const horizontal = space.side === "top" || space.side === "bottom";
                const tileH = space.isCorner ? cornerSize : horizontal ? tileHeight : tileWidth;
                highlight.attr("y", space.y + 1).attr("height", tileH - 2);
                return y;
            })
            .attrTween("transform", () => t => {
                const i = t * (path.length - 1);
                const a = Math.floor(i);
                const b = Math.min(a + 1, path.length - 1);
                const f = i - a;

                const cx = path[a].centerX * (1 - f) + path[b].centerX * f;
                const cy = path[a].centerY * (1 - f) + path[b].centerY * f;

                const rotA = this.getRotation(path[a]);
                const rotB = this.getRotation(path[b]);
                const rot = interpolateRotation(rotA, rotB, f);

                return `rotate(${rot}, ${cx}, ${cy})`;
            })
            .on("end", () => {
                const landedSpace = this.board.spaces[this.index];
                this.board.highlightSpace(landedSpace);
                player1.setSpace(landedSpace);
                if (typeof showSpaceOverlay === "function") showSpaceOverlay(landedSpace);
            });

        token.raise();
    }
    moveTo(endIndex) {
        disableMainButtons(true);
        const startIndex = this.index;

        const startSpace = this.board.spaces[startIndex];
        const endSpace = this.board.spaces[endIndex];

        this.index = endIndex;

        const token = this.token;
        const highlight = this.board.highlight;

        const interpolateRotation = (rotA, rotB, f) => {
            let delta = rotB - rotA;
            delta = ((delta + 180) % 360) - 180;
            return rotA + delta * f;
        };

        const rotA = this.getRotation(startSpace);
        const rotB = this.getRotation(endSpace);

        token.transition()
            .duration(2000)
            .ease(d3.easeCubicInOut)
            .attrTween("x", () => t => {
                const x =
                    startSpace.centerX * (1 - t) +
                    endSpace.centerX * t -
                    (this.naturalSize * this.scale) / 2;

                return x;
            })
            .attrTween("y", () => t => {
                const y =
                    startSpace.centerY * (1 - t) +
                    endSpace.centerY * t -
                    (this.naturalSize * this.scale) / 2;

                return y;
            })
            .attrTween("transform", () => t => {
                const cx =
                    startSpace.centerX * (1 - t) +
                    endSpace.centerX * t;

                const cy =
                    startSpace.centerY * (1 - t) +
                    endSpace.centerY * t;

                const rot = interpolateRotation(rotA, rotB, t);

                return `rotate(${rot}, ${cx}, ${cy})`;
            })
            .on("start", () => {
                this.board.highlightSpace(startSpace);
            })
            .on("end", () => {
                disableMainButtons(false, true);
                const landed = this.board.spaces[this.index];
                this.board.highlightSpace(landed);
                player1.setSpace(landed);
                if (typeof showSpaceOverlay === "function") showSpaceOverlay(landed);
            });

        token.raise();
    }
    placeOnIndex(index) {
        const end = ((index % 40) + 40) % 40;

        this.index = end;
        this.space = this.board.spaces[end];

        const s = this.space;


        this.token
            .interrupt()
            .attr("x", s.centerX - (this.naturalSize * this.scale) / 2)
            .attr("y", s.centerY - (this.naturalSize * this.scale) / 2)
            .attr("transform", `rotate(${this.getRotation(s)}, ${s.centerX}, ${s.centerY})`);

        this.board.highlightSpace(s);

        this.token.raise();

        //this.setSpace(s);

        if (typeof showSpaceOverlay === "function") {
            //showSpaceOverlay(s);
        }
    }
}

const counterContainer = document.getElementById("goCounter");
const counterEarned = document.getElementById("goCounterEarned");
const counterClaimed = document.getElementById("goCounterClaimed");
const claimBtn = document.getElementById("go-reward-btn");
let fireworksClaimInterval = null;

function startClaimFireworks() {
    const bannerRect = counterContainer.getBoundingClientRect();

    fireworksClaimInterval = setInterval(() => {
        const x = rand(bannerRect.left, bannerRect.right);
        const y = rand(bannerRect.top, bannerRect.bottom);
        createFirework(x, y);
    }, 200);
}

function stopClaimFireworks() {
    if (fireworksClaimInterval) {
        clearInterval(fireworksClaimInterval);
        fireworksClaimInterval = null;
    }
}

claimBtn.onclick = () => {
    startClaimFireworks();
    player1.claimedRewards++;
    player1.saveToLocal();
    counterClaimed.textContent = player1.claimedRewards;
    claimBtn.disabled = !(player1.goRewards > player1.claimedRewards);
    setTimeout(() => stopClaimFireworks(), 2000);
};

function incrementGoCounter(player) {
    player.goRewards++;
    if (player.doubleGo) {
        player.goRewards++;
        player.doubleGo = false;
    }

    counterEarned.textContent = player.goRewards;
    claimBtn.disabled = !(player1.goRewards > player1.claimedRewards);
    
    // const container = document.querySelector(".goCounter");
    const container = counterEarned;
    const rect = counterEarned.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2 - containerRect.left;
    const centerY = rect.top + rect.height / 2 - containerRect.top;

    const particleCount = 20;
    const radius = 100;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "goParticle";


        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        const angle = (i / particleCount) * 2 * Math.PI;
        const distance = radius * (0.7 + 0.3 * Math.random());
        const x = Math.cos(angle) * distance + "px";
        const y = Math.sin(angle) * distance + "px";

        particle.style.setProperty("--x", x);
        particle.style.setProperty("--y", y);

        container.appendChild(particle);


        particle.addEventListener("animationend", () => particle.remove());
    }
}

let player1;
function syncUI() {
    rollBtn.disabled = !player1.canRoll;
    counterEarned.textContent = player1.goRewards < 0 ? 0 : player1.goRewards;
    counterClaimed.textContent = player1.claimedRewards || 0;
    claimBtn.disabled = !(player1.goRewards > player1.claimedRewards);
    const badge = document.getElementById("card-badge");
    badge.textContent = player1.cardCount();
}
async function startGame() {
    boardGroup = svg.append("g");
    board = new Board(boardGroup);
    await board.init();
    board.draw();
    const saved = localStorage.getItem("playerState");

    if (saved) {
        player1 = Player.fromState(board, JSON.parse(saved));
    } else {
        player1 = new Player(board);
    }
    syncUI();
}

startGame();

function resetGame(player) {
    player.currentPrompt = "You do not have a current prompt. Roll to continue.";
    player.goRewards = -1;
    player.claimedRewards = 0;
    player.rerollCount = 4;
    player.hasDoubleChance = false;
    player.moveToDestination = false;
    player.animalToGo = false;
    player.canRoll = true;
    player.inJail = false;
    player.jailCount = 0;
    player.hasPrompt = false;
    player.hasChancePrompt = false;
    player.history = [];


    player.cards = [];
    player.currentCardIndex = 0;

    player.placeOnIndex(0);


    player.updateCardDisplay();
    player.setPromptWindow();

    player.saveToLocal();
    rollBtn.disabled = false;
    syncUI();
}

const rollBtn = document.getElementById("roll-btn");
const cardsBtn = document.getElementById("cards-btn");
const rulesBtn = document.getElementById("rules-btn");
const currentBtn = document.getElementById("current-btn");
const promptsOverlay = document.getElementById("prompts-overlay");
const closePromptsBtn = document.getElementById("close-prompts-btn");

const diceOverlay = document.getElementById("dice-overlay");
const cube = document.getElementById("cube");

const banner = document.getElementById("dice-result-banner");
const bannerText = document.getElementById("dice-result-text");
const confirmBtn = document.getElementById("confirm-roll");
const rerollBtn = document.getElementById("reroll-roll");
const rerollCounter = document.getElementById("rerollCounter")
const faceRotations = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: 180 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: -90, y: 0 },
    6: { x: 90, y: 0 }
};
function disableMainButtons(disabled, checkPlayerCanRoll = false) {
    rollBtn.disabled = checkPlayerCanRoll && !disabled
        ? !player1.canRoll
        : disabled;

    cardsBtn.disabled = disabled;
    rulesBtn.disabled = disabled;
    currentBtn.disabled = disabled;
    settingsBtn.disabled = disabled;
}


function rollDice() {
    rerollBtn.disabled = player1.rerollCount <= 0 || player1.hasRerolled;
    rerollCounter.textContent = player1.rerollCount;

    diceOverlay.classList.remove("hidden");
    disableMainButtons(true);

    const result = Math.floor(Math.random() * 6) + 1;
    const target = faceRotations[result];
    const spins = 2 + Math.floor(Math.random() * 2);

    cube.style.transition = "none";
    cube.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cube.style.transition = "transform 2s cubic-bezier(0.22, 1, 0.36, 1)";
            cube.style.transform = `rotateX(${360 * spins + target.x}deg) rotateY(${360 * spins + target.y}deg) rotateZ(0deg)`;
        });
    });

    setTimeout(() => {
        bannerText.textContent = `You rolled a ${result}!`;
        banner.classList.add("show");
        startBannerFireworks();

        confirmBtn.onclick = () => {
            player1.hasRerolled = false;
            player1.moveBy(result);
            banner.classList.remove("show");
            stopBannerFireworks();
            setTimeout(() => diceOverlay.classList.add("hidden"), 300);
        };

        rerollBtn.onclick = () => {
            if (player1.hasRerolled || player1.rerollCount <= 0) return;

            player1.rerollCount--;
            player1.hasRerolled = true;
            rerollBtn.disabled = true;
            rerollCounter.textContent = player1.rerollCount;
            banner.classList.remove("show");
            stopBannerFireworks();
            setTimeout(() => rollDice(), 300);
        };
    }, 2200);
}

rollBtn.addEventListener("click", rollDice);

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function createFirework(x, y) {
    const particleCount = 12;

    if (x === undefined) x = rand(0.1, 0.9) * window.innerWidth;
    if (y === undefined) y = rand(0.1, 0.9) * window.innerHeight;

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;

        const angle = rand(0, Math.PI * 2);
        const distance = rand(40, 100);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;


        const rotStart = rand(0, 360);
        const rotEnd = rotStart + (rand(30, 120) * (Math.random() < 0.5 ? 1 : -1));

        document.body.appendChild(p);

        setTimeout(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotEnd}deg)`;
            p.style.opacity = 0;
        }, 50);

        setTimeout(() => p.remove(), 2500);
    }
}



function startFireworks(interval = 400) {
    return setInterval(() => createFirework(), interval);
}

let fireworksInterval = null;

function startBannerFireworks() {
    const bannerRect = banner.getBoundingClientRect();

    fireworksInterval = setInterval(() => {
        const x = rand(bannerRect.left, bannerRect.right);
        const y = rand(bannerRect.top, bannerRect.bottom);
        createFirework(x, y);
    }, 200);
}

function stopBannerFireworks() {
    if (fireworksInterval) {
        clearInterval(fireworksInterval);
        fireworksInterval = null;
    }
}

let pendingCardForCollection = null;
const spaceOverlay = document.getElementById("space-overlay");
const closeSpaceOverlay = document.getElementById("take-card-btn");

const cardInner = document.getElementById("card-inner");
const cardBack = document.getElementById("card-back");
const cardFront = document.getElementById("card-front-img");
const cardPulse = document.querySelector(".card-pulse");

function createCardBurst(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleCount = 16;

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement("div");
        p.className = "card-particle";

        p.style.left = `${centerX}px`;
        p.style.top = `${centerY}px`;

        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 40;

        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        document.body.appendChild(p);

        requestAnimationFrame(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
            p.style.opacity = 0;
        });

        setTimeout(() => p.remove(), 1000);
    }
}
function typeTextStable(element, text, speed = 30, callback) {
    element.innerHTML = "";

    if (text.length > 150) {
        element.style.fontSize = "12px";
    } else if (text.length > 100) {
        element.style.fontSize = "14px";
    } else {
        element.style.fontSize = "16px";
    }

    const spans = text.split("").map(char => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.visibility = "hidden";
        element.appendChild(span);
        return span;
    });

    let i = 0;
    const interval = setInterval(() => {
        if (i < spans.length) {
            spans[i].style.visibility = "visible";
            i++;
        } else {
            clearInterval(interval);
            if (callback) callback();
        }
    }, speed);
}

function typeText(element, text, speed = 30, callback) {
    element.textContent = "";
    let i = 0;
    const interval = setInterval(() => {
        element.textContent += text.charAt(i);
        i++;
        if (i >= text.length) {
            clearInterval(interval);
            if (callback) callback();
        }
    }, speed);
}
let flipTimeouts = [];

function autoFlipCard(spaceType) {
    flipTimeouts.forEach(clearTimeout);
    flipTimeouts = [];

    closeSpaceOverlay.style.display = "none";

    cardInner.classList.remove("flipped", "revealed", "glow-bloom");
    cardPulse.classList.remove("hint");

    const frontTitle = document.getElementById("card-title");
    const frontDesc = document.getElementById("card-desc");
    const overlay = document.getElementById("card-text-overlay");

    overlay.style.top = spaceType === "chance" ? "140px" : "90px";
    frontTitle.textContent = "";
    frontDesc.textContent = "";
    frontTitle.style.display = "none";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            flipTimeouts.push(setTimeout(() => {
                cardPulse.classList.add("hint");
            }, 400));

            flipTimeouts.push(setTimeout(() => {
                cardPulse.classList.remove("hint");
                cardInner.classList.add("flipped");

                flipTimeouts.push(setTimeout(() => {
                    cardInner.classList.add("revealed", "glow-bloom");
                    createCardBurst(cardInner);


                    if (spaceType === "community_chest" && board.chestCards?.length) {
                        const available = board.chestCards.filter(
                            card => !player1.cards.some(c => c.id === card.id)
                        );

                        if (available.length === 0) {
                            frontTitle.style.display = "block";

                            typeTextStable(frontTitle, "You Hoarder!", 40, () => {
                                typeTextStable(frontDesc, "Sorry, there are no more cards left! Play some of your cards...", 20, () => {
                                    closeSpaceOverlay.style.display = "block";
                                });
                            });
                            return null;
                        }

                        const card = available[Math.floor(Math.random() * available.length)];

                        // const card = board.chestCards[
                        //     Math.floor(Math.random() * board.chestCards.length)
                        // ];

                        player1.saveCard(card);
                        pendingCardForCollection = cardInner;

                        frontTitle.style.display = "block";

                        typeTextStable(frontTitle, card.title, 40, () => {
                            typeTextStable(frontDesc, card.description, 20, () => {
                                closeSpaceOverlay.style.display = "block";
                            });
                        });
                    }

                    if (spaceType === "chance" && board.chanceCards?.length) {
                        const card = board.chanceCards[Math.floor(Math.random() * board.chanceCards.length)];
                        
                        player1.currentChance = structuredClone(card);

                        if (card?.modifier === "month") {
                            const monthIndex = new Date().getMonth() + 1;
                            const keywords = getSeasonalWords(monthIndex);
                            player1.currentChance.description += ` ${keywords}`;
                        }
                        player1.saveToLocal();
                        typeTextStable(frontDesc, player1.currentChance.description, 22, () => {
                            closeSpaceOverlay.style.display = "block";
                        });
                    }

                }, 700));

            }, 1200));
        });
    });
}


function showSpaceOverlay(space) {
    if (!space.imagePath) return;


    cardInner.classList.remove("flipped", "hint");

    cardBack.src = space.imagePath;
    closeSpaceOverlay.innerText = "Continue";


    closeSpaceOverlay.style.display = "block";
    if (space.type === "community_chest") {
        closeSpaceOverlay.innerText = "Take Card";
        closeSpaceOverlay.style.display = "none";
        cardFront.src = "assets/ChestFront.svg";
        cardFront.parentElement.style.display = "block";
    } else if (space.type === "chance") {
        cardFront.src = "assets/ChanceFront.svg";
        cardFront.parentElement.style.display = "block";
    } else {
        cardFront.src = "";
        cardFront.parentElement.style.display = "none";
    }

    const overlayCard = document.getElementById("card-inner");
    const card = overlayCard.parentElement.parentElement.parentElement;
    const rotateWrapper = document.querySelector(".card-rotate");

    if (space.isCorner) {
        overlayCard.style.aspectRatio = "320 / 320";
        card.style.width = "320px";
        if (space.index === 20) {
            requestAnimationFrame(() => {
                rotateWrapper.style.transform = "rotate(-180deg)";
            });
        } else if (space.index === 30) {
            requestAnimationFrame(() => {
                rotateWrapper.style.transform = "rotate(180deg)";
            });
        } else {
            requestAnimationFrame(() => {
                rotateWrapper.style.transform = "rotate(0deg)";
            });
        }
    } else {
        overlayCard.style.aspectRatio = "200 / 320";
        card.style.width = "200px";
        rotateWrapper.style.transform = "rotate(0deg)";
        if (space.index > 20 && space.index < 30) {
            requestAnimationFrame(() => {
                rotateWrapper.style.transform = "rotate(0deg)";
            });
        }
    }

    // overlayCard.classList.remove("rotate-top", "rotate-bottom");
    // if (!space.isCorner) {
    //     if (space.side === "top") overlayCard.classList.add("rotate-bottom");
    // }

    spaceOverlay.classList.remove("hidden");
    const modal = document.querySelector(".space-modal");
    modal.classList.remove("glow-bloom"); // reset
    requestAnimationFrame(() => {
        modal.classList.add("glow-bloom");
    });
    if (space.type === "chance" || space.type === "community_chest") {
        autoFlipCard(space.type);
    }
}


function getElementCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function createLandingSpark(x, y) {
    for (let i = 0; i < 12; i++) {
        const p = document.createElement("div");
        p.className = "card-particle";
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.width = "8px";
        p.style.height = "8px";
        p.style.opacity = 1;
        document.body.appendChild(p);

        const angle = Math.random() * 2 * Math.PI;
        const distance = 20 + Math.random() * 20;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        requestAnimationFrame(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
            p.style.opacity = 0;
        });
        setTimeout(() => p.remove(), 600);
    }
}

function createCardTrail(x, y) {
    const p = document.createElement("div");
    p.className = "card-particle";


    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.width = "10px";
    p.style.height = "10px";
    p.style.opacity = 1;
    p.style.filter = "blur(0.5px)";
    p.style.boxShadow = "0 0 12px rgba(255,215,120,0.9)";

    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 20;

    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    requestAnimationFrame(() => {
        p.style.transform = `
            translate(${dx}px, ${dy}px)
            scale(0.2)
        `;
        p.style.opacity = 0;
    });

    setTimeout(() => p.remove(), 600);
}

function getBadgePosition(buttonEl) {
    const badge = buttonEl.querySelector(".badge");
    const rect = badge.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}
function animateCardToBadgeFromPoint(cardEl, buttonEl, start, duration = 1200) {
    const end = getBadgePosition(buttonEl);
    const rect = cardEl.getBoundingClientRect();

    const clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
        transformOrigin: "center center",
        zIndex: "99999",
        pointerEvents: "none",
        opacity: "1",
        visibility: "visible",
        display: "block",
        willChange: "transform"
    });

    document.body.appendChild(clone);

    const cpX = start.x + (end.x - start.x) / 2;
    const cpY = start.y - 160;

    let startTime = null;
    let burstDone = false;
    let burstT = null;

    function animate(time) {
        if (!startTime) startTime = time;
        const t = Math.min((time - startTime) / duration, 1);

        const x = (1 - t) ** 2 * start.x +
            2 * (1 - t) * t * cpX +
            t ** 2 * end.x;

        const y = (1 - t) ** 2 * start.y +
            2 * (1 - t) * t * cpY +
            t ** 2 * end.y;

        if (t < 0.25) {
            const local = t / 0.25;
            const scale = 1 - local;
            const spin = -360 * (1 - local);

            clone.style.transform = `
                translate(${x - start.x}px, ${y - start.y}px)
                scale(${scale})
                rotate(${spin}deg)
            `;

            requestAnimationFrame(animate);
            return;
        }

        if (!burstDone) {
            clone.style.transform = `
                translate(${x - start.x}px, ${y - start.y}px)
                scale(0)
            `;

            burstDone = true;
            burstT = t;

            clone.remove();
            createCardBurstAt(x, y);
        }

        if (t > burstT && Math.random() < 0.35) {
            createCardTrail(x, y);
        }

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            createLandingSpark(end.x, end.y);

            const badge = buttonEl.querySelector(".badge");
            badge.textContent = player1.cardCount();
            badge.classList.add("updated");
            setTimeout(() => badge.classList.remove("updated"), 300);
        }
    }

    requestAnimationFrame(animate);
}





function animateCardToButton(cardEl, buttonEl, duration = 1000) {
    const start = getElementCenter(cardEl);
    const end = getElementCenter(buttonEl);

    cardEl.style.visibility = "hidden";

    const clone = cardEl.cloneNode(true);
    clone.style.position = "fixed";
    clone.style.left = `${start.x - cardEl.offsetWidth / 2}px`;
    clone.style.top = `${start.y - cardEl.offsetHeight / 2}px`;
    clone.style.width = `${cardEl.offsetWidth}px`;
    clone.style.height = `${cardEl.offsetHeight}px`;
    clone.style.margin = 0;
    clone.style.zIndex = 5000;
    clone.style.transition = "none";
    clone.style.transformOrigin = "center center";
    document.body.appendChild(clone);

    const cpX = start.x + (end.x - start.x) / 2;
    const cpY = start.y - 150;

    let startTime = null;
    function animate(time) {
        if (!startTime) startTime = time;
        const t = Math.min((time - startTime) / duration, 1);

        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;
        const scale = 1 - 0.7 * t;

        clone.style.transform = `translate(${x - start.x}px, ${y - start.y}px) scale(${scale})`;

        if (Math.random() < 0.3) createCardTrail(x, y);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            createLandingSpark(end.x, end.y);
            clone.remove();
            cardEl.style.visibility = "visible";

            const badge = buttonEl.querySelector(".badge");
            badge.textContent = player1.cardCount();
            badge.classList.add("updated");
            setTimeout(() => badge.classList.remove("updated"), 300);
        }
    }
    requestAnimationFrame(animate);
}
function createCardBurstAt(x, y) {
    const particleCount = 10;
    const distance = 20 + Math.random() * 25;

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement("div");
        p.className = "card-particle";
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.width = "12px";
        p.style.height = "12px";
        p.style.opacity = "1";
        p.style.boxShadow = "0 0 14px rgba(255,215,120,0.9)";
        p.style.pointerEvents = "none";

        document.body.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        requestAnimationFrame(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
            p.style.opacity = "0";
        });

        setTimeout(() => p.remove(), 800);
    }
}

function handleCloseOverlay() {
    if (pendingCardForCollection) {
        const start = getElementCenter(pendingCardForCollection);

        animateCardToBadgeFromPoint(
            pendingCardForCollection,
            document.getElementById("cards-btn"),
            start
        );

        pendingCardForCollection = null;
    }

    spaceOverlay.classList.add("hidden");
    cardInner.classList.remove("flipped", "revealed", "glow-bloom", "hint");
    if (player1.moveToDestination !== false) {
        player1.moveTo(player1.moveToDestination);
        player1.moveToDestination = false;
    } else {
        disableMainButtons(false, true);
    }
}

closeSpaceOverlay.onclick = handleCloseOverlay;

currentBtn.addEventListener("click", () => {
    disableMainButtons(true);
    player1.setPromptWindow();
    promptsOverlay.classList.remove("hidden");
});


closePromptsBtn.addEventListener("click", () => {
    disableMainButtons(false, true);
    promptsOverlay.classList.add("hidden");
});

let selectedPrompt = null;

const promptListOverlay = document.getElementById("select-prompt-overlay");
const promptList = document.getElementById("prompt-list");
const promptConfirmBtn = document.getElementById("confirm-select-prompt-btn");
const searchInput = document.getElementById("prompt-search");

function togglePromptList(show, prompts = []) {
    if (show) {
        promptList.innerHTML = "";
        prompts.forEach((prompt) => {
            let li = document.createElement("li");
            li.textContent = prompt;
            li.dataset.prompt = prompt;
            promptList.appendChild(li)
        })
        promptListOverlay.classList.remove("hidden");
    } else {
        promptListOverlay.classList.add("hidden");
    }
}

promptList.addEventListener("click", (e) => {
    if (e.target.tagName !== "LI") return;

    promptList.querySelectorAll("li").forEach(li =>
        li.classList.remove("selected")
    );

    e.target.classList.add("selected");
    selectedPrompt = e.target.dataset.prompt;

    promptConfirmBtn.disabled = false;
});

promptConfirmBtn.addEventListener("click", () => {
    if (!selectedPrompt) return;

    player1.currentPrompt = selectedPrompt;
    player1.hasPrompt = true;
    player1.canRoll = false;
    rollBtn.disabled = true;

    document.getElementById("select-prompt-overlay").classList.add("hidden");
});

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    promptList.querySelectorAll("li").forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(query)
            ? ""
            : "none";
    });
});

function openMoveSpacesModal() {
    document.getElementById("move-spaces-overlay").classList.remove("hidden");
}

document.querySelectorAll(".space-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const spaces = parseInt(btn.dataset.spaces, 10);
        document.getElementById("move-spaces-overlay").classList.add("hidden");

        player1.moveBy(spaces);
    });
});

const rulesOverlay = document.getElementById("rules-overlay");
const closeRulesBtn = document.getElementById("close-rules-btn");

rulesBtn.addEventListener("click", () => {
    rulesOverlay.classList.remove("hidden");
});

closeRulesBtn.addEventListener("click", () => {
    rulesOverlay.classList.add("hidden");
});

const settingsBtn = document.getElementById("settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const confirmRestart = document.getElementById("confirm-restart");
const confirmYes = document.getElementById("confirm-restart-yes");
const confirmNo = document.getElementById("confirm-restart-no");

settingsBtn.addEventListener("click", () => {
    settingsOverlay.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
    settingsOverlay.classList.add("hidden");
});


document.getElementById("download-save-btn").addEventListener("click", () => {
    const state = player1.getState();
    const json = JSON.stringify(state, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bookopoly_save.json";
    a.click();

    URL.revokeObjectURL(url);
});

document.getElementById("load-save-btn").addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const text = await file.text();
        try {
            const loadedState = JSON.parse(text);
            player1 = Player.fromState(player1.board, loadedState);
            syncUI();
            alert("Save loaded!");
        } catch (err) {
            console.error(err);
            alert("Failed to load save: invalid JSON");
        }
    };

    input.click();
});

document.getElementById("restart-game-btn").addEventListener("click", () => {
    confirmRestart.classList.remove("hidden");
});

confirmNo.addEventListener("click", () => {
    confirmRestart.classList.add("hidden");
});


confirmYes.addEventListener("click", () => {
    resetGame(player1);
    confirmRestart.classList.add("hidden");
    settingsOverlay.classList.add("hidden");
});