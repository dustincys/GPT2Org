chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        chrome.scripting.executeScript({
            target: {
                tabId: request.tabId
            },
            files: ['lib/Readability.js', 'capture.js']
        }).then(() => {
            console.log('Readability.js capture.js executed successfully');
        }).catch((error) => {
            console.error('Error executing Readability.js:', error);
        });
    }
});

chrome.runtime.onInstalled.addListener(function setInit(details) {
    chrome.storage.sync.set({
        "ronProtocol": "capture",
        "ronTemplate": "orp",
        "rnnProtocol": "roam-ref",
        "rnnTemplate": "p",
        "clockedProtocol": "capture",
        "clockedTemplate": "orc",
        "journalProtocol": "capture",
        "journalTemplate": "orj",
        "elfeedProtocol": "elfeed-summary",
        "apiKey": '',
        "modelName": 'gpt-4o-mini',
        "apiKeyDS": '',
        "modelNameDS": 'deepseek-chat',
        "apiKeyKM": '',
        "modelNameKM": 'kimi-k2-0711-preview',
        "prompt": 'I will provide you a web page content. You should ignore the noise text in it. if it is a tumor biology or medicine related paper, please summarize in 4 sections: how the biology experiment design, how the data generated, what is the innovative points the paper proposed, what is the conclusion. If it is a software or algorithm or tool paper, please summarize in 5 sections: what is the input, what is the output, what is model or algorithm, what is the innovative points, and what is the conclusion.Please summarize each section in no more than 10 bullets in simple Chinese. If it is not a tumor biology or medicine related paper, please just summarize it in no more than 10 bullets in simple Chinese in total.',
        "useNewStyleLinks": true,
        "toUseModel": "DeepSeek",
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
        chrome.storage.sync.get(null, async (data) => {
            const apiKey = data.apiKey;
            const model = data.modelName;
            const apiKeyDS = data.apiKeyDS;
            const modelDS = data.modelNameDS;
            const apiKeyKM = data.apiKeyKM;
            const modelKM = data.modelNameKM;
            const prompt = data.prompt;
            const toUseModel = data.toUseModel;
            const requestUrl = request.url;

            var hashStr = '';
            if (toUseModel === "DeepSeek") {
                hashStr = `${apiKeyDS}${prompt}${modelDS}${requestUrl}`;
            } else if (toUseModel === "OpenAI") {
                hashStr = `${apiKey}${prompt}${model}${requestUrl}`;
            } else if (toUseModel === "Kimi") {
                hashStr = `${apiKeyKM}${prompt}${modelKM}${requestUrl}`;
            } else {
                hashStr = `${apiKeyDS}${prompt}${modelDS}${requestUrl}`;
            }

            const hashedKey = await hashString(hashStr);

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
                    if (data.toUseModel === "DeepSeek") {
                        apiUrl = "https://api.deepseek.com/chat/completions";
                        to_use_apikey = apiKeyDS;
                        to_use_model = modelDS;
                    } else if (data.toUseModel === "OpenAI") {
                        apiUrl = "https://api.openai.com/v1/chat/completions";
                        to_use_apikey = apiKey;
                        to_use_model = model;
                    } else if (data.toUseModel === "Kimi") {
                        apiUrl = "https://api.moonshot.cn/v1/chat/completions";
                        to_use_apikey = apiKeyKM;
                        to_use_model = modelKM;
                    } else {
                        apiUrl = "https://api.deepseek.com/chat/completions";
                        to_use_apikey = apiKeyDS;
                        to_use_model = modelDS;
                    }

                    if (to_use_apikey) {
                        // 1. Send a signal to Popup to start the UI (hide spinner)
                        chrome.runtime.sendMessage({
                            action: "streamStart"
                        });

                        fetch(apiUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${to_use_apikey}`,
                                },
                                body: JSON.stringify({
                                    "model": to_use_model,
                                    "messages": [{
                                            "role": "system",
                                            "content": prompt
                                        },
                                        {
                                            "role": "user",
                                            "content": request.content
                                        },
                                    ],
                                    "stream": true // <--- IMPORTANT: Enable streaming
                                }),
                            })
                            .then(async (response) => {
                                if (!response.ok) {
                                    throw new Error(`API request failed with status ${response.status}`);
                                }

                                const reader = response.body.getReader();
                                const decoder = new TextDecoder("utf-8");
                                let fullSummary = "";

                                while (true) {
                                    const {
                                        done,
                                        value
                                    } = await reader.read();
                                    if (done) break;

                                    const chunk = decoder.decode(value, {
                                        stream: true
                                    });
                                    const lines = chunk.split("\n");

                                    for (const line of lines) {
                                        const trimmed = line.trim();
                                        // Parse standard SSE format: "data: {...}"
                                        if (trimmed.startsWith("data: ")) {
                                            const dataStr = trimmed.slice(6);
                                            if (dataStr === "[DONE]") continue; // Stream finished

                                            try {
                                                const json = JSON.parse(dataStr);
                                                // OpenAI/DeepSeek/Kimi use choices[0].delta.content
                                                const contentDelta = json.choices[0]?.delta?.content || "";

                                                if (contentDelta) {
                                                    fullSummary += contentDelta;
                                                    // Send partial chunk to popup
                                                    chrome.runtime.sendMessage({
                                                        action: "streamChunk",
                                                        chunk: contentDelta
                                                    });
                                                }
                                            } catch (e) {
                                                console.warn("Stream parse error:", e);
                                            }
                                        }
                                    }
                                }
                                return fullSummary;
                            })
                            .then((summary) => {
                                chrome.storage.local.set({
                                    [hashedKey]: summary
                                }).then(() => {
                                    console.log('Data has been stored in cache');
                                }).catch((error) => {
                                    console.error('Error saving data:', error);
                                });

                                // Notify popup that everything is done
                                chrome.runtime.sendMessage({
                                    "action": "apiRequestCompleted",
                                    "success": true,
                                    "summary": summary,
                                    "url": request.url,
                                    "title": request.title,
                                });
                            })
                            .catch((error) => {
                                console.error(error);
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
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.update(tabs[0].id, {
                url: url
            });
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

            if (data.debug) {
                console.log(uri);
            }

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

            if (data.debug) {
                console.log(uri);
            }

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

            if (data.debug) {
                console.log(uri);
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

            if (data.debug) {
                console.log(uri);
            }

            setLocation(uri);
        });
    }

    if (request.action === "saveElfeed") {
        chrome.storage.sync.get(null, (data) => {
            let uri = "org-protocol://" +
                data.elfeedProtocol +
                "?url=" +
                request.url +
                "&title=" +
                request.title +
                "&summary=" +
                request.content;

            if (data.debug) {
                console.log(uri);
            }

            setLocation(uri);
        });
    }
});
