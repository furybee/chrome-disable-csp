let isCSPDisabled = false;

chrome.storage.sync.get(['disableCSP'], function(result) {
    isCSPDisabled = result.disableCSP || false;
    updateRule();
    updateIcon();
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.disableCSP) {
        isCSPDisabled = changes.disableCSP.newValue;
        updateRule();
        updateIcon();
    }
});

chrome.action.onClicked.addListener((tab) => {
    isCSPDisabled = !isCSPDisabled;
    chrome.storage.sync.set({disableCSP: isCSPDisabled}, function() {
        updateRule();
        updateIcon();
    });
});

function updateRule() {
    const ruleId = 1;

    // First, remove any existing rule with this ID
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: isCSPDisabled ? [{
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
        }] : []
    });
}

function updateIcon() {
    const iconPath = isCSPDisabled ? 'icons/icon_enabled.png' : 'icons/icon_disabled.png';
    chrome.action.setIcon({ path: iconPath });
}
