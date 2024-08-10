let isCSPDisabled = false;
let isInitializing = true;
let ignoreNextStorageChange = false;
let loggingEnabled = false;

log("Initializing extension...");

chrome.storage.sync.get(['disableCSP'], function(result) {
    isCSPDisabled = result.disableCSP || false;
    log("Initial CSP disable state retrieved:", isCSPDisabled);
    updateRule().then(() => {
        updateIcon();
        isInitializing = false;
    });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (isInitializing) {
        log("Ignoring change event during initialization");
        return;
    }

    if (ignoreNextStorageChange) {
        log("Ignoring change event triggered by our own set.");
        ignoreNextStorageChange = false;
        return;
    }

    if (changes.disableCSP) {
        log("CSP disable state changed:", changes.disableCSP.newValue);
        isCSPDisabled = changes.disableCSP.newValue;
        updateRule().then(updateIcon);
    } else {
        log("No relevant changes in storage:", changes);
    }
});

chrome.action.onClicked.addListener((tab) => {
    isCSPDisabled = !isCSPDisabled;
    log("Toggling CSP disable state to:", isCSPDisabled);

    ignoreNextStorageChange = true;
    chrome.storage.sync.set({disableCSP: isCSPDisabled}, function() {
        log("CSP disable state saved:", isCSPDisabled);
        updateRule().then(updateIcon);
    });
});

function updateRule() {
    const ruleId = 1;

    log("Updating rules, isCSPDisabled =", isCSPDisabled);

    return new Promise((resolve, reject) => {
        chrome.declarativeNetRequest.getDynamicRules(function(rules) {
            const ruleExists = rules.some(rule => rule.id === ruleId);

            if (ruleExists) {
                log("Rule with ID", ruleId, "already exists. Removing it first.");
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [ruleId]
                }, function() {
                    if (chrome.runtime.lastError) {
                        logError("Error removing rule:", chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        log("Rule removed successfully.");
                        addRuleIfNeeded(resolve, reject);
                    }
                });
            } else {
                addRuleIfNeeded(resolve, reject);
            }
        });
    });
}

function addRuleIfNeeded(resolve, reject) {
    if (isCSPDisabled) {
        const ruleId = 1;
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [{
                id: ruleId,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        { header: "content-security-policy", operation: "remove" },
                        { header: "x-content-security-policy", operation: "remove" },
                        { header: "x-webkit-csp", operation: "remove" }
                    ]
                },
                condition: {
                    urlFilter: "*",
                    resourceTypes: ["main_frame", "sub_frame"]
                }
            }]
        }, function() {
            if (chrome.runtime.lastError) {
                logError("Error adding rules:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                log("Rules added successfully.");
                resolve();
            }
        });
    } else {
        resolve();
    }
}

function updateIcon() {
    const iconPath = isCSPDisabled ? 'icons/icon_enabled.png' : 'icons/icon_disabled.png';
    log("Updating icon to:", iconPath);
    chrome.action.setIcon({ path: iconPath }, function() {
        if (chrome.runtime.lastError) {
            logError("Error updating icon:", chrome.runtime.lastError);
        } else {
            log("Icon updated successfully.");
        }
    });
}

function log(...args) {
    if (loggingEnabled) {
        console.log(...args);
    }
}

function logError(...args) {
    if (loggingEnabled) {
        console.error(...args);
    }
}
