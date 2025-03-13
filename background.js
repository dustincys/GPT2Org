function onExecuted(result) {
}

function onExecutedCapture(result) {
    var capture_exec = browser.tabs.executeScript({ file: "capture.js" });
    capture_exec.then(onExecuted, onError);
}
function onError(error) {
}

function runScripts() {
    var readability_exec = browser.tabs.executeScript({ file: "lib/Readability.js" });
    readability_exec.then(onExecutedCapture, onError);
}

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
        "prompt": 'I will provide you a web page content. You should ignore the noise text in it. if it is a tumor biology or medicine related paper, please summarize in 4 sections: how the biology experiment design, how the data generated, what is the innovative points the paper proposed, what is the conclusion. If it is a software or algorithm or tool paper, please summarize in 5 sections: what is the input, what is the output, what is model or algorithm, what is the innovative points, and what is the conclusion.Please summarize each section in no more than 10 bullets in simple Chinese. If it is not a tumor biology or medicine related paper, please just summarze it in no more than 10 bullets in simple Chinese in total.',
        "useNewStyleLinks": true,
        "toUseDeepSeek": true,
        "debug": false,
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        runScripts();
    }
});

//                            Add summarize funcs                            //

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

            browser.storage.local.get(hashedKey).then((result) => {
                if (result.hasOwnProperty(hashedKey)) {
                    const summary = result[hashedKey];
                    const decodedTitle = decodeURIComponent(request.title);
                    const decodedURL = decodeURIComponent(request.url);

                    navigator.clipboard.writeText(`Title: ${decodedTitle}\nURL: ${decodedURL}\nSummary:\n${summary}`);
                    chrome.runtime.sendMessage({
                        "action": "apiRequestCompleted",
                        "success": true,
                        "summary": summary,
                        "url": request.url,
                        "title": request.title,
                    });
                } else {
                    if (data.toUseDeepSeek) {
                        const apiUrl = "https://api.deepseek.com/chat/completions";
                        const to_use_apikey = apiKeyDS;
                        const to_use_model = modelDS;
                    } else {
                        const apiUrl = "https://api.openai.com/v1/chat/completions";
                        const to_use_apikey = apiKey;
                        const to_use_model = model;
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
                                    const decodedTitle = decodeURIComponent(request.title);
                                    const decodedURL = decodeURIComponent(request.url);

                                    navigator.clipboard.writeText(`Title: ${decodedTitle}\nURL: ${decodedURL}\nSummary:\n${summary}`);

                                    browser.storage.local.set({ [hashedKey]: summary })
                                    .catch((error) => {
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
                                    chrome.runtime.sendMessage({
                                        "action": "apiRequestCompleted",
                                        "success": false,
                                    });
                                }
                            })
                            .catch((error) => {
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


// add org or org-roam protocol ///////////////////////////////////////////////
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
            location.href = uri;
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
            location.href = uri;
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
            location.href = uri;
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
            location.href = uri;
        });
    }
});
