/**
 * EnergyMonitor - Скрипт для автоматизации и мониторинга майнинга в игре.
 *
 * @version 2.0
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
 * MutationObserver для отслеживания изменений в игре.
 */

// Экспериментальный скрипт EnergyMonitor для мониторинга и автоматизации процесса добычи ресурсов в игре

// Определение селекторов для элементов интерфейса игры
const SELECTORS = {
    balanceSpan: '#root > div:nth-child(2) > div > div > div:nth-child(1) > div.p-4.pt-0 > div.space-y-1 > div > span:nth-child(2) > span:nth-child(1)',
    energySpan: '#root > div:nth-child(2) > div > div > div:nth-child(1) > div.p-4.pt-0 > div:nth-child(2) > div > div.flex.justify-between.text-sm.cursor-pointer > span:nth-child(2) > span:nth-child(1)',
    miningButton: '#root > div:nth-child(2) > footer > div.w-full.navbar-mining-bg.flex.justify-center.px-4 > div > button'
};

// Переменные для хранения данных мониторинга
let lastEnergyValue = 0;
let buttonObserver = null;
let maxEnergy = 0;
let minEnergy = 0;
let isFirstCheck = true;
let lastLogMessage = '';

// Переменные для хранения статистики добычи ресурсов
let miningStartTime = null;
let miningStartBalance = null;
let miningStartEnergy = null;
let totalMiningTime = 0;
let totalMinedCoins = 0;
let totalUsedEnergy = 0;

// Переменные для хранения статистики восстановления энергии
let energyRecoveryStartTime = null;
let energyRecoveryStartValue = null;

// Функция для логирования сообщений с временной меткой и цветом
function styledLog(message) {
    const timeString = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const styledMessage = `%c[${timeString}] %c${message}`;
    const timeStyle = 'font-weight: bold; color: black;';
    const messageStyle = 'color: #006400; font-family: "Courier New", Courier, monospace;';

    if (message !== lastLogMessage) {
        console.log(styledMessage, timeStyle, messageStyle);
        lastLogMessage = message;
    }
}

// Функция для получения текущего значения энергии из интерфейса игры
function getEnergyValue() {
    const energyElement = document.querySelector(SELECTORS.energySpan);
    if (!energyElement) return null;
    const text = energyElement.textContent.replace(/\u00A0/g, '');
    return parseInt(text.replace(',', '')); // Удаление десятичной точки
}

// Функция для получения текущего значения баланса из интерфейса игры
function getBalanceValue() {
    const balanceElement = document.querySelector(SELECTORS.balanceSpan);
    if (!balanceElement) return null;
    const balanceText = balanceElement.textContent.replace(/,/g, '');
    return parseFloat(balanceText);
}

// Функция для вычисления статистики добычи ресурсов
function calculateMiningStats(isStoppingMining = false) {
    if (!miningStartTime) return null;

    const currentTime = Date.now();
    const currentBalance = getBalanceValue();
    const currentEnergy = getEnergyValue();

    if (currentBalance === null || currentEnergy === null) return null;

    const timeElapsed = (currentTime - miningStartTime) / 1000; // Перевод в секунды
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

// Функция для проверки кнопки добычи ресурсов и выполнения действий на основе уровней энергии
function checkButton() {
    const button = document.querySelector(SELECTORS.miningButton);
    if (!button) return;

    const buttonText = button.textContent.trim();
    const currentEnergy = getEnergyValue();

    if (currentEnergy === null) return;
    if (currentEnergy === lastEnergyValue && !isFirstCheck) return;

    const percentRemaining = ((currentEnergy / maxEnergy) * 100).toFixed(2);

    styledLog(`Оставшаяся энергия в процентах: ${percentRemaining}%`);

    if (currentEnergy >= maxEnergy) {
        if (buttonText.includes('Начать майнинг')) {
            miningStartTime = Date.now();
            miningStartBalance = getBalanceValue();
            miningStartEnergy = currentEnergy;

            // Simulate a user click event at random coordinates within a 20x20 pixel area around the button's center
            const buttonRect = button.getBoundingClientRect();
            const centerX = buttonRect.left + buttonRect.width / 2;
            const centerY = buttonRect.top + buttonRect.height / 2;
            const randomX = centerX + (Math.random() * 20) - 10;
            const randomY = centerY + (Math.random() * 20) - 10;

            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                screenX: randomX,
                screenY: randomY,
                clientX: randomX,
                clientY: randomY
            });

            button.dispatchEvent(event);

            styledLog(`Начата добыча с энергией: ${currentEnergy.toLocaleString()}`);
        }
    } else if (currentEnergy <= minEnergy) {
        if (buttonText.includes('Остановить добычу')) {
            const stats = calculateMiningStats(true);
            button.click();

            if (stats) {
                styledLog(`Остановлена добыча:
                Время сессии: ${stats.sessionTime.toFixed(1)} секунд
                Монеты получены: ${stats.sessionCoins.toFixed(4)}
                Энергия использована: ${stats.sessionEnergy}
                Монеты в час: ${stats.coinsPerHour.toFixed(2)}
                Монеты на единицу энергии: ${stats.coinsPerEnergy.toFixed(4)}
                
                Общее время добычи: ${stats.totalStats.totalTime.toFixed(1)} секунд
                Общие монеты получены: ${stats.totalStats.totalCoins.toFixed(4)}
                Общая энергия использована: ${stats.totalStats.totalEnergy}
                Средние монеты в час: ${stats.totalStats.avgCoinsPerHour.toFixed(2)}
                Средние монеты на единицу энергии: ${stats.totalStats.avgCoinsPerEnergy.toFixed(4)}`);
            }

            miningStartTime = null;
            miningStartBalance = null;
            miningStartEnergy = null;
        }
    }

    lastEnergyValue = currentEnergy;
    isFirstCheck = false;
}

// Функция для измерения восстановления энергии
function measureEnergyRecovery() {
    const currentEnergy = getEnergyValue();
    if (currentEnergy === null) return;

    if (!energyRecoveryStartTime) {
        energyRecoveryStartTime = Date.now();
        energyRecoveryStartValue = currentEnergy;
        setTimeout(measureEnergyRecovery, 30 * 60 * 1000); // Проверка каждые 30 минут
    } else {
        const timeElapsed = (Date.now() - energyRecoveryStartTime) / 3600000; // Перевод в часы
        const energyRecovered = currentEnergy - energyRecoveryStartValue;
        const recoveryRate = energyRecovered / timeElapsed;

        styledLog(`Скорость восстановления энергии: ${recoveryRate.toFixed(2)} единиц в час`);

        // Сброс переменных для следующего измерения
        energyRecoveryStartTime = null;
        energyRecoveryStartValue = null;

        // Перезапуск измерения
        measureEnergyRecovery();
    }
}

// Функция для запуска мониторинга уровней энергии и процесса добычи ресурсов
function startEnergyMonitor(totalEnergy, minEnergyLevel) {
    stopEnergyMonitor();

    isFirstCheck = true;
    maxEnergy = totalEnergy;
    minEnergy = minEnergyLevel;

    const targetNode = document.querySelector(SELECTORS.energySpan)?.parentNode;
    if (!targetNode) {
        styledLog('Элемент энергии не найден');
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

    styledLog(`Мониторинг энергии запущен. Максимальная энергия: ${totalEnergy.toLocaleString()}, Минимальная энергия: ${minEnergyLevel.toLocaleString()}`);
    checkButton();

    // Начать измерение восстановления энергии
    measureEnergyRecovery();
}

// Функция для остановки мониторинга уровней энергии и процесса добычи ресурсов
function stopEnergyMonitor() {
    if (buttonObserver) {
        buttonObserver.disconnect();
        buttonObserver = null;
        styledLog('Мониторинг энергии остановлен');
    }
}

// Пример использования функций startEnergyMonitor и stopEnergyMonitor
// startEnergyMonitor(9000, 500); // Запуск мониторинга с максимальной энергией 9000 и минимальной энергией 500
// stopEnergyMonitor(); // Остановка мониторинга