const spinner = document.getElementById("spinner");
const summaryContainer = document.getElementById("summaryContainer");

const summaryContent = document.getElementById("summaryContent");
const summaryURL = document.getElementById("summaryURL");
const summaryTitle = document.getElementById("summaryTitle");

const saveOrgBtn = document.getElementById("saveSummaryOrg");
const saveRoamBtn = document.getElementById("saveSummaryRoam");
const saveClockedBtn = document.getElementById("saveSummaryClocked");
const saveJournalBtn = document.getElementById("saveSummaryJournal");
const saveElfeedBtn = document.getElementById("saveSummaryCurrentElfeed");


function escapeIt(text) {
    return encodeURIComponent(text)
        .replace(/\(/g, "%28")  // Escape '('
        .replace(/\)/g, "%29")  // Escape ')'
        .replace(/'/g, "%27")   // Escape "'"
        .replace(/\n/g, "%0A");
}

saveElfeedBtn.addEventListener("click", () => {
    saveElfeedBtn.disabled = true;
    chrome.runtime.sendMessage({
        "action": "saveElfeed",
        "content": escapeIt(summaryContent.textContent),
        "url": summaryURL.textContent,
        "title": summaryTitle.textContent,
    });
});

saveJournalBtn.addEventListener("click", () => {
    saveJournalBtn.disabled = true;
    chrome.runtime.sendMessage({
        "action": "saveJournal",
        "content": escapeIt(summaryContent.textContent),
        "url": summaryURL.textContent,
        "title": summaryTitle.textContent,
    });
});

saveClockedBtn.addEventListener("click", () => {
    saveClockedBtn.disabled = true;
    chrome.runtime.sendMessage({
        "action": "saveClocked",
        "content": escapeIt(summaryContent.textContent),
        "url": summaryURL.textContent,
        "title": summaryTitle.textContent,
    });
});


saveOrgBtn.addEventListener("click", () => {
    saveOrgBtn.disabled = true;
    chrome.runtime.sendMessage({
        "action": "saveOrg",
        "content": escapeIt(summaryContent.textContent),
        "url": summaryURL.textContent,
        "title": summaryTitle.textContent,
    });
});

saveRoamBtn.addEventListener("click", () => {
    saveRoamBtn.disabled = true;
    chrome.runtime.sendMessage({
        "action": "saveRoam",
        "content": escapeIt(summaryContent.textContent),
        "url": summaryURL.textContent,
        "title": summaryTitle.textContent,
    });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "apiRequestCompleted") {
        spinner.style.display = "none";
        if (request.success) {
            summaryContent.textContent = request.summary;
            summaryURL.textContent = request.url;
            summaryTitle.textContent = request.title;

            summaryContainer.style.display = "block";
            setTimeout(() => {
                summaryContainer.style.opacity = "1";
            }, 100);

            sendResponse({ status: "success", message: "Data processed successfully." });
        } else {
            sendResponse({ status: "error", message: "Failed to process data." });
        }
    }
});


chrome.runtime.sendMessage({
    action: "capture",
});
