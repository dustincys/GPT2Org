
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            files: ['lib/Readability.js', 'capture.js']
        }).then(() => {
            console.log('Readability.js capture.js executed successfully');
        }).catch((error) => {
            console.error('Error executing Readability.js:', error);
        });
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    chrome.storage.sync.set({
        "ronProtocol": "capture",
        "ronTemplate": "orp",
        "rnnProtocol": "roam-ref",
        "rnnTemplate": "p",
        "clockedProtocol": "capture",
        "clockedTemplate": "orc",
        "journalProtocol": "capture",
        "journalTemplate": "orj",
        "apiKey": '',
        "modelName": 'gpt-4o-mini',
        "apiKeyDS": '',
        "modelNameDS": 'deepseek-chat',
        "prompt": 'I will provide you a web page content. You should ignore the noise text in it. if it is a tumor biology or medicine related paper, please summarize in 4 sections: how the biology experiment design, how the data generated, what is the innovative points the paper proposed, what is the conclusion. If it is a software or algorithm or tool paper, please summarize in 5 sections: what is the input, what is the output, what is model or algorithm, what is the innovative points, and what is the conclusion.Please summarize each section in no more than 10 bullets in simple Chinese. If it is not a tumor biology or medicine related paper, please just summarize it in no more than 10 bullets in simple Chinese in total.',
        "useNewStyleLinks": true,
        "toUseDeepSeek": true,
        "debug": false,
    });
});


// Add summarize functions

async function hashString(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hashHex;
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarizeContent") {
        chrome.storage.sync.get(null, async(data) => {
            const apiKey = data.apiKey;
            const model = data.modelName;
            const apiKeyDS = data.apiKeyDS;
            const modelDS = data.modelNameDS;
            const prompt = data.prompt;
            const toUseDeepSeek = data.toUseDeepSeek;
            const requestUrl = request.url;

            const hashedKey = await hashString(`${apiKey}${apiKeyDS}${prompt}${model}${modelDS}${toUseDeepSeek}${requestUrl}`);

            chrome.storage.local.get(hashedKey, (result) => {
                if (result.hasOwnProperty(hashedKey)) {
                    chrome.runtime.sendMessage({
                        "action": "apiRequestCompleted",
                        "success": true,
                        "summary": result[hashedKey],
                        "url": request.url,
                        "title": request.title,
                    });
                } else {
                    if (data.toUseDeepSeek) {
                        apiUrl = "https://api.deepseek.com/chat/completions";
                        to_use_apikey = apiKeyDS;
                        to_use_model = modelDS;
                    } else {
                        apiUrl = "https://api.openai.com/v1/chat/completions";
                        to_use_apikey = apiKey;
                        to_use_model = model;
                    }
                    if (to_use_apikey) {
                        fetch(apiUrl, {
                            "method": "POST",
                            "headers": {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${to_use_apikey}`,
                            },
                            body: JSON.stringify({
                                "model": to_use_model,
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": prompt,
                                    },
                                    {
                                        "role": "user",
                                        "content": request.content,
                                    },
                                ],
                            }),
                        })
                            .then((response) => {
                                if (!response.ok) {
                                    throw new Error(
                                        `API request failed with status ${response.status}`
                                    );
                                }
                                return response.json();
                            })
                            .then((data) => {
                                if (data.choices && data.choices.length > 0) {
                                    const summary = data.choices[0].message.content.trim();

                                    chrome.storage.local.set({ [hashedKey]: summary }).then(() => {
                                        console.log('Data has been stored in cache');
                                    }).catch((error) => {
                                        console.error('Error saving data:', error);
                                    });

                                    chrome.runtime.sendMessage({
                                        "action": "apiRequestCompleted",
                                        "success": true,
                                        "summary": summary,
                                        "url": request.url,
                                        "title": request.title,
                                    });
                                } else {
                                    console.error("Error: No summary data received from the API");
                                    chrome.runtime.sendMessage({
                                        "action": "apiRequestCompleted",
                                        "success": false,
                                    });
                                }
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                                chrome.runtime.sendMessage({
                                    "action": "apiRequestCompleted",
                                    "success": false,
                                });
                            });
                    }
                }
            });
        });
    }
});

// Add org or org-roam protocol ///////////////////////////////////////////////
function setLocation(url) {
    // Query for the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.update(tabs[0].id, { url: url });
        } else {
            console.error("No active tab found.");
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveOrg") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.ronProtocol +
                    "?template=" +
                    data.ronTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.ronProtocol +
                    ":/" +
                    data.ronTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            // location.href = uri;
            setLocation(uri);
        });
    }
    if (request.action === "saveRoam") {
        chrome.storage.sync.get(null, (data) => {
            let uri = "org-protocol://" +
                data.rnnProtocol +
                "?template=" +
                data.rnnTemplate +
                "&ref=" +
                request.url +
                "&title=" +
                request.title +
                "&body=" +
                request.content;
            setLocation(uri);
        });
    }
    if (request.action === "saveClocked") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.clockedProtocol +
                    "?template=" +
                    data.clockedTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.clockedProtocol +
                    ":/" +
                    data.clockedTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            setLocation(uri);
        });
    }

    if (request.action === "saveJournal") {
        chrome.storage.sync.get(null, (data) => {
            let uri;
            if (data.useNewStyleLinks) {
                uri = "org-protocol://" +
                    data.journalProtocol +
                    "?template=" +
                    data.journalTemplate +
                    "&url=" +
                    request.url +
                    "&title=" +
                    request.title +
                    "&body=" +
                    request.content;
            } else {
                uri = "org-protocol://" +
                    data.journalProtocol +
                    ":/" +
                    data.journalTemplate +
                    "/" +
                    request.url +
                    "/" +
                    request.title +
                    "/" +
                    request.content;
            }
            setLocation(uri);
        });
    }
});
