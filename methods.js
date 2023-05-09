(async() => {


    console.log("Loading Tabitha");
   
    function discardTab(tabId) {
        try {  
            chrome.tabs.discard(tabId);   
            // chrome.tabs.discard({
            //     tabId: tabId
            // });
        } catch (tabDiscardError) {
            console.error("Error discarding tab.");
            console.error(tabDiscardError);
        }
    }
  
    function moveTab(tabId, moveIndex, windowId) {
        chrome.tabs.move(tabId, {index: moveIndex, windowId})
    }
    
    async function getTabsByQuery(queryOptions) {

        return chrome.tabs.query(queryOptions);

    }
    
    async function getCurrentTab(queryOptions = { active: true, lastFocusedWindow: true}) {
        console.log("getCurrentTab->queryOptions:", queryOptions);
        const tab = await chrome.tabs.query({ active: true, currentWindow: true});
        console.log("getCurrentTab -> The Tab", tab);
        return tab;
    }
    
    async function moveCurrentTabForward() {
        console.log("Going forward");
        const [tab] = await getCurrentTab();
            console.log("Moving tab forwards", tab);
            const windowId = tab.windowId || 1;
            console.log("Moving tab backwards", tab, windowId, tab.index);
            moveTab(tab.id, tab.index + 1, windowId);

    }
    
    async function moveCurrentTabBackward() {
        const [tab] = await getCurrentTab();
        const windowId = tab.windowId || 1;
        console.log("Moving tab backwards", tab, windowId, tab.index);
        moveTab(tab.id, tab.index - 1, windowId);
    }
  
    async function unloadAllTabs () {
        console.log("Unloading all tabs");
        const alltargetTabs = await getTabsByQuery({url: ['*://*/*']});
        [...alltargetTabs].forEach(async(tab) => {
            if (!tab?.discarded && tab?.status !== "unloaded" ) {
                await discardTab(tab?.id);
            }
        })
    }
    
    const WINDOW_TYPES = {
        NORMAL: 'normal',
        POPUP: 'popup',
        PANEL: 'panel',
        APP: 'app',
        DEVTOOLS: 'devtools'
    }
    
    document.querySelector('#move-up').addEventListener('click', moveCurrentTabForward);
    document?.querySelector?.('#move-down')?.addEventListener('click', moveCurrentTabBackward);
    document?.querySelector?.('#unload-all')?.addEventListener('click', unloadAllTabs);
    
    })();