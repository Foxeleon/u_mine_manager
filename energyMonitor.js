/**
 * EnergyMonitor - Скрипт для автоматизации и мониторинга майнинга в игре.
 *
 * @version 1.0
 * @author Andrey Wirz
 *
 * Основные возможности:
 * - Автоматическое управление процессом майнинга
 * - Мониторинг уровня энергии и баланса
 * - Расчет статистики майнинга (скорость, эффективность)
 * - Измерение скорости восстановления энергии
 * - Логирование событий и статистики
 *
 * Использование:
 * startEnergyMonitor(9000, 500); // Запуск мониторинга с максимальной энергией 9000 и минимальной 500
 * stopEnergyMonitor(); // Остановка мониторинга
 *
 * Параметры startEnergyMonitor:
 * - totalEnergy: максимальный уровень энергии
 * - minEnergyLevel: минимальный уровень энергии для остановки майнинга
 *
 * Скрипт использует селекторы DOM для взаимодействия с элементами игрового интерфейса
 * и MutationObserver для отслеживания изменений в игре.
 */

const SELECTORS = {
    energySpan: '#radix-\\:r0\\:-content-mining > div > div:nth-child(1) > div.p-4.pt-0 > div > div.space-y-2 > div.flex.justify-between.items-center > span:nth-child(2) > span',
    balanceSpan: '#radix-\\:r0\\:-content-mining > div > div:nth-child(1) > div.p-4.pt-0 > div > div.flex.justify-between.items-center > span:nth-child(2) > span',
    miningButton: '#radix-\\:r0\\:-content-mining > div > button'
};

let lastEnergyValue = 0;
let buttonObserver = null;
let maxEnergy = 0;
let minEnergy = 0;
let isFirstCheck = true;
let lastLogMessage = '';

// Переменные для отслеживания майнинга
let miningStartTime = null;
let miningStartBalance = null;
let miningStartEnergy = null;
let totalMiningTime = 0;
let totalMinedCoins = 0;
let totalUsedEnergy = 0;
let sessionStartTime = Date.now();

// Переменные для измерения скорости восстановления энергии
let energyRecoveryStartTime = null;
let energyRecoveryStartValue = null;

function styledLog(message) {
    const timeString = getTimeString();
    const styledMessage = `%c[%c${timeString}%c] %c${message}`;
    const timeStyle = 'font-weight: bold; color: black;';
    const messageStyle = 'color: #006400; font-family: "Courier New", Courier, monospace;';

    if (message !== lastLogMessage) {
        console.log(styledMessage, 'color: black;', timeStyle, 'color: black;', messageStyle);
        lastLogMessage = message;
    }
}

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
    const balanceText = balanceElement.textContent.replace(/,/g, '');
    return parseFloat(balanceText);
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

    styledLog(`Процент оставшейся энергии: ${percentRemaining}%`);

    if (currentEnergy >= maxEnergy) {
        if (buttonText.includes('Начать майнинг')) {
            miningStartTime = Date.now();
            miningStartBalance = getBalanceValue();
            miningStartEnergy = currentEnergy;

            button.click();
            styledLog(`Запуск майнинга при энергии: ${currentEnergy.toLocaleString()}`);
        }
    } else if (currentEnergy <= minEnergy) {
        if (buttonText.includes('Остановить майнинг')) {
            const stats = calculateMiningStats(true);
            button.click();

            if (stats) {
                styledLog(`Остановка майнинга:
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
                Средняя эффективность: ${stats.totalStats.avgCoinsPerEnergy.toFixed(4)} монет/100 энергии`);
            }

            miningStartTime = null;
            miningStartBalance = null;
            miningStartEnergy = null;
        }
    }

    lastEnergyValue = currentEnergy;
    isFirstCheck = false;
}

function measureEnergyRecovery() {
    const currentEnergy = getEnergyValue();
    if (currentEnergy === null) return;

    if (!energyRecoveryStartTime) {
        energyRecoveryStartTime = Date.now();
        energyRecoveryStartValue = currentEnergy;
        setTimeout(measureEnergyRecovery, 30 * 60 * 1000); // Запускаем повторное измерение через 30 минут
    } else {
        const timeElapsed = (Date.now() - energyRecoveryStartTime) / 3600000; // в часах
        const energyRecovered = currentEnergy - energyRecoveryStartValue;
        const recoveryRate = energyRecovered / timeElapsed;

        styledLog(`Скорость восстановления энергии: ${recoveryRate.toFixed(2)} единиц/час`);

        // Сбрасываем значения для следующего измерения
        energyRecoveryStartTime = null;
        energyRecoveryStartValue = null;

        // Запускаем новое измерение
        measureEnergyRecovery();
    }
}

function startEnergyMonitor(totalEnergy, minEnergyLevel) {
    stopEnergyMonitor();

    isFirstCheck = true;
    maxEnergy = totalEnergy;
    minEnergy = minEnergyLevel;

    const targetNode = document.querySelector(SELECTORS.energySpan)?.parentNode;
    if (!targetNode) {
        styledLog(`Элемент энергии не найден`);
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

    styledLog(`Монитор энергии активирован. Максимальная энергия: ${totalEnergy.toLocaleString()}, Минимальная энергия: ${minEnergyLevel.toLocaleString()}`);
    checkButton();

    // Запускаем измерение скорости восстановления энергии
    measureEnergyRecovery();
}

function stopEnergyMonitor() {
    if (buttonObserver) {
        buttonObserver.disconnect();
        buttonObserver = null;
        styledLog(`Монитор энергии остановлен`);
    }
}

// Пример использования:
// startEnergyMonitor(9000, 500); // Запуск с указанием максимальной и минимальной энергии
// stopEnergyMonitor(); // Для остановки