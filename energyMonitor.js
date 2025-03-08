/**
 * EnergyMonitor - Скрипт для автоматизации и мониторинга майнинга в игре.
 *
 * @version 3.0
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
    miningButton: '#root > div:nth-child(2) > footer > div.w-full.navbar-mining-bg.flex.justify-center.px-4 > div > button',
    energyBarIndicator: '#root > div:nth-child(2) > div > div > div:nth-child(1) > div.p-4.pt-0 > div:nth-child(2) > div > div.space-y-1 > div > div',
    miningTab: '#radix-\\:r3\\:-trigger-\\/mining',
    rentTab: '#radix-\\:r3\\:-trigger-\\/miners\\/rent',
};

// Переменные для хранения данных мониторинга
let lastEnergyValue = 0;
let buttonObserver = null;
let minEnergy = 0; // % энергии для остановки майнинга
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

function getPercentageFromTransformStyle(style) {
    const match = style.match(/translateX\((-?\d+(\.\d+)?)%\)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

function createEventForButton(button) {
    const buttonRect = button.getBoundingClientRect();
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;
    const randomX = centerX + (Math.random() * 20) - 10;
    const randomY = centerY + (Math.random() * 20) - 10;

    return new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        screenX: randomX,
        screenY: randomY,
        clientX: randomX,
        clientY: randomY
    });
}

function delay(callback, ms = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            callback();
            resolve();
        }, ms);
    });
}

// Функция для проверки кнопки добычи ресурсов и выполнения действий на основе уровней энергии
function checkButton() {
    const button = document.querySelector(SELECTORS.miningButton);
    if (!button) return;

    let restartInterval = null;
    const buttonText = button.textContent.trim();
    const energyBarElement = document.querySelector(SELECTORS.energyBarIndicator);
    const transformStyle = energyBarElement.style.transform;
    const energyPercentage = getPercentageFromTransformStyle(transformStyle);


    if (energyPercentage !== null) {
        const currentEnergy = (100 + energyPercentage).toFixed(2);
        // styledLog(`Оставшаяся энергия в процентах: ${currentEnergy}%`);

        if (currentEnergy >= 99.5) {
            clearInterval(restartInterval);
            if (buttonText.includes('Начать майнинг')) {
                miningStartTime = Date.now();
                miningStartBalance = getBalanceValue();
                miningStartEnergy = currentEnergy;

                button.dispatchEvent(createEventForButton(button));

                styledLog(`Начата добыча с энергией: ${currentEnergy.toLocaleString()}`);
            }
        } else if (currentEnergy <= minEnergy) {
            if (buttonText.includes('Остановить майнинг')) {
                const miningTab = document.querySelector(SELECTORS.miningTab);
                const rentTab = document.querySelector(SELECTORS.rentTab);

                const stats = calculateMiningStats(true);

                button.dispatchEvent(createEventForButton(button));

                setTimeout(() => {
                    rentTab.dispatchEvent(createEventForButton(rentTab))
                }, 1000);

                setTimeout(() => {
                    miningTab.dispatchEvent(createEventForButton(miningTab))
                }, 2000);

                if (stats) {
                    styledLog(`Остановлена добыча:
                    Время сессии: ${stats.sessionTime.toFixed(1)} секунд
                    Монеты получены: ${stats.sessionCoins.toFixed(4)}
                    Монеты в час: ${stats.coinsPerHour.toFixed(2)}`);
                }

                miningStartTime = null;
                miningStartBalance = null;
                miningStartEnergy = null;
                restartInterval = setInterval(() => {
                    if (!miningStartTime || !miningStartBalance) startEnergyMonitor(minEnergy)
                }, 30 * 60 * 1000)
            }
        }
    }
    lastEnergyValue = getEnergyValue();
    isFirstCheck = false;
}

// Функция для измерения восстановления энергии
// function measureEnergyRecovery() {
//     const currentEnergy = getEnergyValue();
//     if (currentEnergy === null) return;
//
//     if (!energyRecoveryStartTime) {
//         energyRecoveryStartTime = Date.now();
//         energyRecoveryStartValue = currentEnergy;
//         setTimeout(measureEnergyRecovery, 30 * 60 * 1000); // Проверка каждые 30 минут
//     } else {
//         const timeElapsed = (Date.now() - energyRecoveryStartTime) / 3600000; // Перевод в часы
//         const energyRecovered = currentEnergy - energyRecoveryStartValue;
//         const recoveryRate = energyRecovered / timeElapsed;
//
//         styledLog(`Скорость восстановления энергии: ${recoveryRate.toFixed(2)} единиц в час`);
//
//         // Сброс переменных для следующего измерения
//         energyRecoveryStartTime = null;
//         energyRecoveryStartValue = null;
//
//         // Перезапуск измерения
//         measureEnergyRecovery();
//     }
// }

// Функция для запуска мониторинга уровней энергии и процесса добычи ресурсов
function startEnergyMonitor(minEnergyLevel) {
    stopEnergyMonitor();

    isFirstCheck = true;
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
        characterDataOldValue: true,
        attributes: true
    });

    styledLog(`Мониторинг энергии запущен. Минимальная энергия: ${minEnergyLevel.toLocaleString()}`);
    checkButton();

    // Начать измерение восстановления энергии
    // measureEnergyRecovery();
}

// Функция для остановки мониторинга уровней энергии и процесса добычи ресурсов
function stopEnergyMonitor() {
    if (buttonObserver) {
        buttonObserver.disconnect();
        buttonObserver = null;
        styledLog('Мониторинг энергии остановлен');
    }
}

function logStatus() {
    const energyBarElement = document.querySelector(SELECTORS.energyBarIndicator);

    if (!energyBarElement) {
        styledLog('%cОШИБКА: Индикатор энергии не найден', 'color: red');
        return;
    }

    const transformStyle = energyBarElement.style.transform;
    const energyPercentage = getPercentageFromTransformStyle(transformStyle);
    const remainingEnergy = (100 + energyPercentage).toFixed(2);

    styledLog(
        '%cТекущие показатели:\n' +
        `%cЭнергия: ${remainingEnergy}%\n` +
        `Минимальная энергия: ${minEnergy}\n` +
        `Майнинг активен: ${miningStartTime !== null ? 'Да' : 'Нет'}\n` +
        `Баланс: ${getBalanceValue().toFixed(1)} секунд\n`
    );
}

// Пример использования функций startEnergyMonitor и stopEnergyMonitor
// startEnergyMonitor(2); // Запуск мониторинга ограничением в 2% энергии для остановки
// stopEnergyMonitor(); // Остановка мониторинга