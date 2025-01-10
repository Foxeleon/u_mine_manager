const SELECTORS = {
    energySpan: '#radix-\\:r0\\:-content-mining > div > div:nth-child(1) > div.p-4.pt-0 > div > div.space-y-2 > div.flex.justify-between.items-center > span:nth-child(2) > span',
    balanceSpan: '#radix-\\:r0\\:-content-mining > div > div:nth-child(1) > div.p-4.pt-0 > div > div.flex.justify-between.items-center > span:nth-child(2) > span',
    miningButton: '#radix-\\:r0\\:-content-mining > div > button'
};

let lastEnergyValue = 0;
let buttonObserver = null;
let maxEnergy = 0;
let isFirstCheck = true;

// Переменные для отслеживания майнинга
let miningStartTime = null;
let miningStartBalance = null;
let miningStartEnergy = null;
let totalMiningTime = 0;
let totalMinedCoins = 0;
let totalUsedEnergy = 0;
let sessionStartTime = Date.now();

function getTimeString() {
    return new Date().toLocaleTimeString('ru-RU', { hour12: false });
}

function getEnergyValue() {
    const energyElement = document.querySelector(SELECTORS.energySpan);
    if (!energyElement) return null;
    const text = energyElement.textContent.replace(/\u00A0/g, '');
    return parseInt(text.replace('.', '')); // Убираем точку из числа
}

function getBalanceValue() {
    const balanceElement = document.querySelector(SELECTORS.balanceSpan);
    if (!balanceElement) return null;
    return parseFloat(balanceElement.textContent);
}

function calculateMiningStats(isStoppingMining = false) {
    if (!miningStartTime) return null;

    const currentTime = Date.now();
    const currentBalance = getBalanceValue();
    const currentEnergy = getEnergyValue();

    if (currentBalance === null || currentEnergy === null) return null;

    const timeElapsed = (currentTime - miningStartTime) / 1000; // в секундах
    const coinsMinedSession = currentBalance - miningStartBalance;
    const energyUsedSession = miningStartEnergy - currentEnergy;

    if (isStoppingMining) {
        totalMiningTime += timeElapsed;
        totalMinedCoins += coinsMinedSession;
        totalUsedEnergy += energyUsedSession;
    }

    return {
        sessionTime: timeElapsed,
        sessionCoins: coinsMinedSession,
        sessionEnergy: energyUsedSession,
        coinsPerHour: (coinsMinedSession / timeElapsed) * 3600,
        coinsPerEnergy: coinsMinedSession / (energyUsedSession || 1) * 100,
        totalStats: {
            totalTime: totalMiningTime,
            totalCoins: totalMinedCoins,
            totalEnergy: totalUsedEnergy,
            avgCoinsPerHour: (totalMinedCoins / totalMiningTime) * 3600,
            avgCoinsPerEnergy: totalMinedCoins / (totalUsedEnergy || 1) * 100
        }
    };
}

function checkButton() {
    const button = document.querySelector(SELECTORS.miningButton);
    if (!button) return;

    const buttonText = button.textContent.trim();
    const currentEnergy = getEnergyValue();

    if (currentEnergy === null) return;
    if (currentEnergy === lastEnergyValue && !isFirstCheck) return;

    const percentRemaining = ((currentEnergy / maxEnergy) * 100).toFixed(2);

    console.log(`[${getTimeString()}] 
    Процент оставшейся энергии: ${percentRemaining}%
    Всего энергии: ${maxEnergy.toLocaleString()}
    Текущая энергия: ${currentEnergy.toLocaleString()}
    Баланс: ${getBalanceValue()?.toFixed(2)}
    `);

    if (currentEnergy >= maxEnergy) {
        if (buttonText.includes('Начать майнинг')) {
            miningStartTime = Date.now();
            miningStartBalance = getBalanceValue();
            miningStartEnergy = currentEnergy;

            button.click();
            console.log(`[${getTimeString()}] Запуск майнинга при энергии: ${currentEnergy.toLocaleString()}`);
        }
    } else if (currentEnergy < 500) {
        if (buttonText.includes('Остановить майнинг')) {
            const stats = calculateMiningStats(true);
            button.click();

            if (stats) {
                console.log(`[${getTimeString()}] Остановка майнинга:
                Длительность сессии: ${stats.sessionTime.toFixed(1)} сек
                Добыто монет: ${stats.sessionCoins.toFixed(4)}
                Использовано энергии: ${stats.sessionEnergy}
                Скорость: ${stats.coinsPerHour.toFixed(2)} монет/час
                Эффективность: ${stats.coinsPerEnergy.toFixed(4)} монет/100 энергии
                
                Общая статистика:
                Общее время майнинга: ${stats.totalStats.totalTime.toFixed(1)} сек
                Всего добыто: ${stats.totalStats.totalCoins.toFixed(4)} монет
                Всего использовано энергии: ${stats.totalStats.totalEnergy}
                Средняя скорость: ${stats.totalStats.avgCoinsPerHour.toFixed(2)} монет/час
                Средняя эффективность: ${stats.totalStats.avgCoinsPerEnergy.toFixed(4)} монет/100 энергии
                `);
            }

            miningStartTime = null;
            miningStartBalance = null;
            miningStartEnergy = null;
        }
    }

    lastEnergyValue = currentEnergy;
    isFirstCheck = false;
}

function startEnergyMonitor(totalEnergy) {
    stopEnergyMonitor();

    isFirstCheck = true;
    maxEnergy = totalEnergy;

    const targetNode = document.querySelector(SELECTORS.energySpan)?.parentNode;
    if (!targetNode) {
        console.log(`[${getTimeString()}] Элемент энергии не найден`);
        return;
    }

    buttonObserver = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            checkButton();
        });
    });

    buttonObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true
    });

    console.log(`[${getTimeString()}] Монитор энергии активирован. Целевая энергия: ${totalEnergy.toLocaleString()}`);
    checkButton();
}

function stopEnergyMonitor() {
    if (buttonObserver) {
        buttonObserver.disconnect();
        buttonObserver = null;
        console.log(`[${getTimeString()}] Монитор энергии остановлен`);
    }
}

// Пример использования:
// startEnergyMonitor(9000); // Запуск с указанием максимальной энергии
// stopEnergyMonitor(); // Для остановки