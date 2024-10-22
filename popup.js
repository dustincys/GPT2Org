const spinner = document.getElementById("spinner");
const summaryContainer = document.getElementById("summaryContainer");

const summaryContent = document.getElementById("summaryContent");
const summaryURL = document.getElementById("summaryURL");
const summaryTitle = document.getElementById("summaryTitle");

const saveOrgBtn = document.getElementById("saveSummaryOrg");
const saveRoamBtn = document.getElementById("saveSummaryRoam");

saveOrgBtn.addEventListener("click", () => {
    saveOrgBtn.disabled = true;

    chrome.runtime.sendMessage({
        action: "saveOrg",
        content: summaryContent.textContent,
        url: summaryURL.textContent,
        title: summaryTitle.textContent,
    });
});

saveRoamBtn.addEventListener("click", () => {
    saveRoamBtn.disabled = true;

    chrome.runtime.sendMessage({
        action: "saveRoam",
        content: summaryContent.textContent,
        url: summaryURL.textContent,
        title: summaryTitle.textContent,
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
        } else {
        }
    }
});
