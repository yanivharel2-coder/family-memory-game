// === הגדרות המדיה שלך ===
const availableImages = [];
for (let i = 1; i <= 28; i++) {
    availableImages.push(`${i}.jpg`);
}

const availableSounds = [];
for (let i = 1; i <= 18; i++) {
    availableSounds.push(`s${i}.mp3`);
}

// === משתני מצב משחק ===
let gameMode = 1; 
let isTimedMode = false; 
let targetPairsCount = 4; 
let currentPlayer = 1;
let scores = { player1: 0, player2: 0 };
let totalTurns = 0; 

let flippedCards = [];
let lockBoard = false;
let matchedPairs = 0;
let currentAudio = null; 
let audioTimeout = null; 

// משתני זמן וטיימר קבועים למצב עבודת צוות
let timerInterval = null;
let timeLeft = 30;
let maxTime = 30; // משתנה דינמית בין 30 (למשחק) ל-15 (לחשבון)
let currentMathAnswer = 0;
let lastMatchedPairCards = []; 

const playerHits = [
    { emoji: '⚡', name: 'חשמל' },
    { emoji: '❄️', name: 'קרח' },
    { emoji: '🤎', name: 'בוץ' },
    { emoji: '👊', name: 'אגרוף' }
];

// === אלמנטים מה-DOM ===
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameBoard = document.getElementById('game-board');
const startBtn = document.getElementById('start-btn');
const backBtn = document.getElementById('back-btn');
const subModeSection = document.getElementById('sub-mode-section');
const playerTurnIndicator = document.getElementById('player-turn-indicator');
const currentPlayerSpan = document.getElementById('current-player');
const scoreP1 = document.getElementById('score-p1');
const scoreP2 = document.getElementById('score-p2');
const turnsCountSpan = document.getElementById('turns-count');

const timerContainer = document.getElementById('timer-container');
const timerBar = document.getElementById('timer-bar');
const mathModal = document.getElementById('math-modal');
const mathQuestion = document.getElementById('math-question');
const mathOptions = document.getElementById('math-options');

const dragonAttack = document.getElementById('dragon-attack');
const playerHitEffect = document.getElementById('player-hit-effect');
const hitEmojiSpan = document.getElementById('hit-emoji');
const victoryScreen = document.getElementById('victory-screen');

// === ניווט ובחירות בתפריט ===
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        gameMode = parseInt(e.target.dataset.mode);
        
        if (gameMode === 3) {
            subModeSection.classList.remove('hidden');
        } else {
            subModeSection.classList.add('hidden');
        }
    });
});

document.querySelectorAll('.sub-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sub-mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        isTimedMode = e.target.dataset.timed === 'true';
    });
});

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        targetPairsCount = parseInt(e.target.dataset.pairs);
        // הסרנו את שינוי הזמן לפי דרגת הקושי - הזמן נקבע סטטית לפי שלב המשחק
    });
});

startBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', returnToMenu);

// === פונקציות המשחק ===

function startGame() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    if (dragonAttack) dragonAttack.classList.add('hidden');
    if (playerHitEffect) playerHitEffect.classList.add('hidden');
    if (victoryScreen) victoryScreen.classList.add('hidden');
    
    matchedPairs = 0;
    scores.player1 = 0;
    scores.player2 = 0;
    currentPlayer = 1;
    totalTurns = 0;
    flippedCards = [];
    lockBoard = false;
    
    stopCurrentAudio();
    clearInterval(timerInterval);

    turnsCountSpan.textContent = totalTurns;
    
    if (gameMode === 3) {
        scoreP1.textContent = `זוגות שנמצאו: 0`;
        scoreP2.classList.add('hidden');
        playerTurnIndicator.classList.add('hidden');
        
        if (isTimedMode) {
            timerContainer.classList.remove('hidden');
            startTimer(30); // שלב מציאת הזוגות מתחיל תמיד עם 30 שניות קבועות
        } else {
            timerContainer.classList.add('hidden');
        }
    } else {
        timerContainer.classList.add('hidden');
        scoreP1.textContent = gameMode === 2 ? `שחקן 1: 0` : `זוגות שנמצאו: 0`;
        if (gameMode === 2) {
            scoreP2.classList.remove('hidden');
            scoreP2.textContent = `שחקן 2: 0`;
            playerTurnIndicator.classList.remove('hidden');
            currentPlayerSpan.textContent = "שחקן 1";
        } else {
            scoreP2.classList.add('hidden');
            playerTurnIndicator.classList.add('hidden');
        }
    }

    buildBoard();
}

function buildBoard(keepMatched = false) {
    let currentDeckState = [];
    
    if (keepMatched && gameMode === 3) {
        const existingCards = Array.from(gameBoard.children);
        existingCards.forEach(card => {
            currentDeckState.push({
                image: card.dataset.image,
                isMatched: card.classList.contains('matched') || card.style.visibility === 'hidden'
            });
        });
        currentDeckState.sort(() => 0.5 - Math.random());
    } else {
        const shuffledImages = [...availableImages].sort(() => 0.5 - Math.random());
        const selectedImages = shuffledImages.slice(0, targetPairsCount);
        let deck = [...selectedImages, ...selectedImages];
        deck.sort(() => 0.5 - Math.random());
        
        deck.forEach(img => {
            currentDeckState.push({ image: img, isMatched: false });
        });
    }

    gameBoard.innerHTML = '';
    
    currentDeckState.forEach(cardData => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.image = cardData.image;

        card.innerHTML = `
            <div class="card-face card-front">❓</div>
            <div class="card-face card-back">
                <img src="images/${cardData.image}" alt="Family Pic">
            </div>
        `;

        if (cardData.isMatched) {
            card.classList.add('flipped', 'matched');
            card.style.visibility = 'hidden';
        } else {
            card.addEventListener('click', flipCard);
        }
        
        gameBoard.appendChild(card);
    });
}

function flipCard() {
    if (lockBoard) return;
    if (this === flippedCards[0]) return; 

    this.classList.add('flipped');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        totalTurns++;
        turnsCountSpan.textContent = totalTurns;
        checkMatch();
    }
}

function checkMatch() {
    let isMatch = flippedCards[0].dataset.image === flippedCards[1].dataset.image;

    if (isMatch) {
        lastMatchedPairCards = [...flippedCards];
        
        if (gameMode === 3) {
            clearInterval(timerInterval);
            lockBoard = true;
            setTimeout(() => {
                showMathChallenge();
            }, 500);
        } else {
            disableCardsStandard();
        }
    } else {
        unflipCards();
    }
}

function disableCardsStandard() {
    matchedPairs++;
    updateScoresUI();
    playRandomSound();
    flippedCards = [];
    checkGameEnd();
}

function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        flippedCards[0].classList.remove('flipped');
        flippedCards[1].classList.remove('flipped');
        flippedCards = [];
        lockBoard = false;
        
        if (gameMode === 2) {
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            currentPlayerSpan.textContent = `שחקן ${currentPlayer}`;
        }
    }, 1000);
}

function updateScoresUI() {
    if (gameMode === 2) {
        if (currentPlayer === 1) {
            scores.player1++;
            scoreP1.textContent = `שחקן 1: ${scores.player1}`;
        } else {
            scores.player2++;
            scoreP2.textContent = `שחקן 2: ${scores.player2}`;
        }
    } else {
        scores.player1++;
        scoreP1.textContent = `זוגות שנמצאו: ${scores.player1}`;
    }
}

function checkGameEnd() {
    if (matchedPairs === targetPairsCount) {
        clearInterval(timerInterval);
        
        if (gameMode === 3) {
            lockBoard = true;
            stopCurrentAudio();
            
            const finalHitAudio = new Audio('sounds/hit.mp3');
            finalHitAudio.play().catch(e => console.log("סאונד סיום נחסם"));
            
            if (victoryScreen) victoryScreen.classList.remove('hidden');
            
            setTimeout(() => {
                if (victoryScreen) victoryScreen.classList.add('hidden');
                alert(`ניצחון מוחץ! הדרקון הובס ב-${totalTurns} תורות! 🏆🏆🏆`);
                returnToMenu();
            }, 2500);
        } else {
            setTimeout(() => {
                let endMessage = `המשחק הסתיים ב-${totalTurns} תורות!\n`;
                if (gameMode === 2) {
                    if (scores.player1 > scores.player2) endMessage += 'שחקן 1 ניצח! 🎉';
                    else if (scores.player2 > scores.player1) endMessage += 'שחקן 2 ניצח! 🎉';
                    else endMessage += 'תיקו משפחתי! 🤝';
                } else {
                    endMessage += 'כל הכבוד! סיימת את המשחק! 🏆';
                }
                alert(endMessage);
                returnToMenu();
            }, 600);
        }
    }
}

function showMathChallenge() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    currentMathAnswer = num1 * num2;

    mathQuestion.textContent = `${num1} × ${num2} = ?`;
    
    const optionsSet = new Set();
    optionsSet.add(currentMathAnswer);
    
    while(optionsSet.size < 4) {
        const wrongOpt = (Math.floor(Math.random() * 10) + 1) * (Math.floor(Math.random() * 10) + 1);
        optionsSet.add(wrongOpt);
    }
    
    const optionsArray = Array.from(optionsSet).sort(() => 0.5 - Math.random());
    
    mathOptions.innerHTML = '';
    optionsArray.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.addEventListener('click', () => handleMathAnswer(opt));
        mathOptions.appendChild(btn);
    });

    mathModal.classList.remove('hidden');
    
    if (isTimedMode) {
        startTimer(15); // שלב פתרון התרגיל מקבל תמיד 15 שניות קבועות
    }
}

function handleMathAnswer(selectedAnswer) {
    mathModal.classList.add('hidden');
    clearInterval(timerInterval);

    if (selectedAnswer === currentMathAnswer) {
        triggerPlayerHit();
    } else {
        triggerDragonAttack();
    }
}

function triggerPlayerHit() {
    lockBoard = true;
    
    const randomHit = playerHits[Math.floor(Math.random() * playerHits.length)];
    if (hitEmojiSpan) hitEmojiSpan.textContent = randomHit.emoji;
    
    if (playerHitEffect) playerHitEffect.classList.remove('hidden');
    
    playRandomSound();

    setTimeout(() => {
        if (playerHitEffect) playerHitEffect.classList.add('hidden');
        
        lastMatchedPairCards.forEach(card => {
            card.classList.add('matched');
            card.style.visibility = 'hidden';
        });
        
        matchedPairs++;
        scores.player1++;
        scoreP1.textContent = `זוגות שנמצאו: ${scores.player1}`;
        
        flippedCards = [];
        lockBoard = false;

        if (matchedPairs < targetPairsCount) {
            if (isTimedMode) startTimer(30); // חוזרים למשחק הזיכרון - מחזירים ל-30 שניות
        } else {
            checkGameEnd();
        }
    }, 600);
}

// פונקציית הטיימר המעודכנת שמקבלת את הזמן כפרמטר
function startTimer(seconds) {
    clearInterval(timerInterval);
    maxTime = seconds;
    timeLeft = maxTime;
    timerBar.style.width = '100%';

    timerInterval = setInterval(() => {
        timeLeft -= 0.1; 
        const percentage = (timeLeft / maxTime) * 100;
        timerBar.style.width = `${percentage}%`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeOut();
        }
    }, 100);
}

function handleTimeOut() {
    triggerDragonAttack();
}

function triggerDragonAttack() {
    if (mathModal) mathModal.classList.add('hidden'); 
    clearInterval(timerInterval);
    lockBoard = true; 

    if (dragonAttack) dragonAttack.classList.remove('hidden');

    setTimeout(() => {
        if (flippedCards.length > 0) {
            flippedCards.forEach(card => card.classList.remove('flipped'));
        }
        if (lastMatchedPairCards.length > 0) {
            lastMatchedPairCards.forEach(card => card.classList.remove('flipped'));
        }
        flippedCards = [];
        buildBoard(true);
    }, 1100);

    setTimeout(() => {
        if (dragonAttack) dragonAttack.classList.add('hidden');
        lockBoard = false;
        
        if (isTimedMode && matchedPairs < targetPairsCount) {
            startTimer(30); // אחרי מתקפת הדרקון, חוזרים לחפש זוגות עם 30 שניות מלאות
        }
    }, 2200);
}

function playRandomSound() {
    if (availableSounds.length === 0) return;
    stopCurrentAudio();

    const randomSound = availableSounds[Math.floor(Math.random() * availableSounds.length)];
    currentAudio = new Audio(`sounds/${randomSound}`);
    currentAudio.play().catch(e => console.log("סאונד נחסם"));

    audioTimeout = setTimeout(() => {
        stopCurrentAudio();
    }, 10000);
}

// ... (שאר קוד הניהול נשאר ללא שינוי)
function stopCurrentAudio() { if (audioTimeout) { clearTimeout(audioTimeout); audioTimeout = null; } if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; } }
function returnToMenu() { stopCurrentAudio(); clearInterval(timerInterval); if (mathModal) mathModal.classList.add('hidden'); if (dragonAttack) dragonAttack.classList.add('hidden'); if (playerHitEffect) playerHitEffect.classList.add('hidden'); if (victoryScreen) victoryScreen.classList.add('hidden'); gameScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); }