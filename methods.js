(async () => {
	console.log("Loading Tabitha");

	const WINDOW_TYPES = {
		NORMAL: "normal",
		POPUP: "popup",
		PANEL: "panel",
		APP: "app",
		DEVTOOLS: "devtools",
	};

	const API_TYPE = {};

	function handleMessage(text) {
		const holder = document.querySelector("#message-box");
		const message = document.createElement("p");
		message.innerText = `${text}`;
		holder.appendChild(message);
	}

	async function getAllTargetTabs({ lastFocused, currentWindow, groupId }) {
		const options = { url: ["*://*/*"] };
		options.lastFocusedWindow = lastFocused ? true : undefined;
		options.currentWindow = currentWindow ? true : undefined;
		options.groupId = groupId ? groupId : undefined;

		return getTabsByQuery(options);
	}

	const omit = (prop, { [prop]: _, ...rest }) => rest;
	const omitMulti = (keys, obj) =>
		keys.reduce((rest, key) => omit(key, rest), obj);

	async function discardTab(tabId) {
		try {
			await chrome.tabs.discard(tabId);
			// chrome.tabs.discard({
			//     tabId: tabId
			// });
		} catch (tabDiscardError) {
			console.error("Error discarding tab.");
			handleMessage("There was an error", tabDiscardError.message);
			console.error(tabDiscardError);
		}
	}

	function moveTab(tabId, moveIndex, windowId) {
		chrome.tabs.move(tabId, { index: moveIndex, windowId: windowId });
	}

	async function getTabsByQuery(queryOptions) {
		return chrome.tabs.query(queryOptions);
	}

	async function getCurrentTab(
		queryOptions = { active: true, lastFocusedWindow: true }
	) {
		const tab = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		return tab;
	}

	async function getCurrentWindow(queryOptions = {}) {
		const window = await chrome.windows.getCurrent({ populate: true });
		return window;
	}

	function modelWindowsData(targetWindows) {
		return [...targetWindows].map((window) => modelWindowData(window));
	}

	const modelWindowData = (window) =>
		omitMulti(["id", "createData", "alwaysOnTop"], window);

	function modelGroupsData(targetGroups) {
		return [...targetGroups]; //.map((group) => modelGroupData(group));
	}

	const modelGroupData = (tab) => tab;

	function modelTabsData(targetTabs) {
		return [...targetTabs].map((tab) => modelTabData(tab));
	}

	const modelTabData = (tab) =>
		omitMulti(
			["id", "audible", /*"autoDiscardable",*/ "discarded", "favIconUrl"],
			tab
		);

	function modelGroupsCreateData(targetGroups) {
		return [...targetGroups].map((group) => modelGroupCreateData(group));
	}

	const modelGroupCreateData = (tab) =>
		omitMulti(["id", "windowId", "collapsed", "color", "title"], tab);

	function modelTabsCreateData(targetTabs) {
		return [...targetTabs].map(modelTabCreateData);
	}

	const modelTabCreateData = (tab) =>
		omitMulti(
			[
				"id",
				"audible",
				"autoDiscardable",
				"discarded",
				"favIconUrl",
				"groupId",
				"height",
				"highlighted",
				"incognito",
				"mutedInfo",
				"status",
				"selected",
				"title",
				"width",
			],
			tab
		);

	async function getSomeTabData(queryOpts) {
		const selectedTabs = await getTabsByQuery(queryOpts);
		return modelTabsData(selectedTabs);
	}

	async function getAllTabData() {
		const allTargetTabs = await getTabsByQuery({ url: ["*://*/*"] });
		return modelTabsData(allTargetTabs);
	}

	async function getSomeGroupData(queryOpts) {
		const selectedGroups = await chrome.tabGroups.query(queryOpts);
		return modelGroupsData(selectedGroups);
	}

	async function getAllGroupData() {
		const allTabGroups = await chrome.tabGroups.query({});
		return modelGroupsData(allTabGroups);
	}

	async function getAllWindowData() {
		const allWindows = await chrome.windows.getAll({});
		return modelWindowsData(allWindows);
	}

	const getSetFromKey = (list, key, whenMissing) => {
		const set = new Set();
		return list.reduce((set, item) => {
			const val = item[key] || whenMissing;
			set.add(val);
			return set;
		}, set);
	};

	// WIP
	async function restoreSession(session) {
		handleMessage("Cannot currently restore entire sessions");
		// const { tabs, /*groups,*/ windows } = session;
		// const tabCreateData = modelTabsCreateData(tabs);
		// // const groupCreateData = modelGroupData(groups);
		// const windowCreateData = modelWindowsData(windows);
		// // const groupIdSet = getSetFromKey(groups, "id");
		// const windowIdSet = getSetFromKey(windows, "id");
		// const chromeWindows = {};
		// // const chromeTabGroups = {};
		// windowIdSet.forEach((windowId) => {
		// 	const windowOptions = windowCreateData.find(
		// 		(window) => window.id === windowId
		// 	);
		// 	chromeWindows[windowId] = createWindow(windowOptions);
		// });
		// tabCreateData.forEach((tab) => {
		// 	const chromeWindowId = chromeWindows[tab.windowId].id;
		// 	handleMessage(tab.windowId);
		// 	tab.windowId = chromeWindowId;
		// 	// tab.groupId = chromeTabGroups[tab.groupId].id;
		// 	handleMessage(tab.windowId);
		// 	createTab(tab, (newTab) => {
		// 		moveTab(newTab.id, tab.index, chromeWindowId);
		// 	});
		// });
		// groupIdSet.forEach((groupId) => {
		// 	const groupOptions = groupCreateData.find((group) => group.id === groupId);
		// 	chromeTabGroups[groupId] = createGroup(groupOptions);
		// });
	}
	// WIP
	// async function attemtpRestoreWindow(session) {
	// 	const { tabs, window } = session;
	// 	const tabCreateData = modelTabsCreateData(tabs);
	// 	const windowCreateData = modelWindowsData(window);
	// 	const windowIdSet = getSetFromKey(windows, "id");
	// 	const chromeWindows = {};

	// 	tabCreateData.forEach((tab) => {
	// 		const chromeWindowId = chromeWindows[tab.windowId].id;
	// 		handleMessage(tab.windowId);
	// 		tab.windowId = chromeWindowId;
	// 		// tab.groupId = chromeTabGroups[tab.groupId].id;
	// 		handleMessage(tab.windowId);
	// 		createTab(tab, (newTab) => {
	// 			moveTab(newTab.id, tab.index, chromeWindowId);
	// 		});
	// 	});
	// }

	async function saveSession() {
		/*
			create the JSON object like so:
			{
				API: "V0",
				windows: [],
				groups: [],
				tabs: [],
			}
		*/
		const windows = await getAllWindowData();
		const groups = await getAllGroupData();
		const tabs = await getAllTabData();
		return {
			API: "V0",
			type: "FULL_SESSION",
			tabs,
			groups,
			windows,
		};
	}

	async function saveCurrentWindow() {
		const tabs = await getSomeTabData({ currentWindow: true });
		const currentWindowId = tabs?.[0]?.windowId || 0;
		const groups = await getSomeGroupData({ windowId: currentWindowId });

		return {
			API: "V0",
			type: "WINDOW",
			tabs,
			groups,
		};
	}

	const TABS_TO_UNLOAD = new Set();
	const addTabToUnload = (tab) => {
		TABS_TO_UNLOAD.add(tab?.id || 0);
	};

	const tabUpdatedHandler = (tabId, changeInfo, changedTab) => {
		if (TABS_TO_UNLOAD.has(tabId)) {
			if (changeInfo.url) {
				chrome.tabs.discard(tabId);
				TABS_TO_UNLOAD.delete(tabId);
			}
		}
	};

	const createWindow = async (windowOptions, callback) => {
		chrome.windows.create(windowOptions, callback);
	};

	const createGroup = async (groupOptions, callback) => {
		chrome.tabs.group(groupOptions, callback);
	};

	const createTab = async (tabOptions, callback) => {
		chrome.tabs.create(tabOptions, callback);
	};

	// Stays right here
	const createTabAndUnload = (tabOptions) =>
		createTab(tabOptions, addTabToUnload);

	const handleFileName = (data) => {
		const createDate = `_${1 * new Date()}`;
		const apiType = `_${data?.API || "unknown"}`;
		return `tabitha_sesh${apiType}${createDate}.json`;
	};

	const downloadJSON = (data) => {
		// handleMessage("downloading");
		try {
			const jsonString = JSON.stringify(data, null, 4);
			const dLink = document.createElement("a");
			const jsonBLob = new Blob([jsonString], { type: "octet/stream" });
			const dName = handleFileName(data);

			const dURL = window.URL.createObjectURL(jsonBLob);
			dLink.setAttribute("href", dURL);
			dLink.setAttribute("download", dName);
			dLink.click();
		} catch (e) {
			handleMessage("There was an error", e.message);
			console.error("There was an error", e);
		}
	};

	async function exportJSON() {
		const tabData = await saveSession();
		downloadJSON(tabData);
	}

	async function exportJSONWithOptions(options) {
		return async function () {
			const alltargetTabs = await getTabsByQuery({
				url: ["*://*/*"],
				currentWindow: true,
			});
			const tabs = [...alltargetTabs].map((tab) => ({
				url: tab.url,
				title: tab.title,
				incognito: tab.incognito,
				groupId: tab.groupId,
			}));
			downloadJSON(tabs);
		};
	}

	const exportCurrentWindowSession = async (e) => {
		handleMessage("exporting current window...");
		const sessionData = await saveCurrentWindow();
		downloadJSON(sessionData);
	};

	async function importJSON() {
		chrome.tabs.onUpdated.addListener(tabUpdatedHandler);
		// ... load all the new tabs under a new group
		try {
			const importedSessionJSON = JSON.parse(this.result);
			const { API, type, length } = importedSessionJSON;
			// V0 API
			if (API === "V0") {
				if (type === "FULL_SESSION") {
					restoreSession(importedSessionJSON);
				}
				if (type === "WINDOW") {
					restoreWindow(importedSessionJSON);
				}
			}

			if (length) {
				importedSessionJSON.forEach((tab) => {
					createTabAndUnload(tab);
				});
			}
		} catch (e) {
			console.error("There was an error", e);
			handleMessage("There was an error", e.message);
		}
		chrome.tabs.onUpdated.removeListener(tabUpdatedHandler);
	}

	const uploadJSON = (e) => {
		const files = e.target.files;
		const reader = new FileReader();
		reader.onload = importJSON;
		[...files].forEach((file) => reader.readAsText(file));
	};

	async function moveCurrentTabForward() {
		const [tab] = await getCurrentTab();
		const windowId = tab.windowId || 1;
		moveTab(tab.id, tab.index + 1, windowId);
	}

	async function moveCurrentTabBackward() {
		const [tab] = await getCurrentTab();
		const windowId = tab.windowId || 1;
		moveTab(tab.id, tab.index - 1, windowId);
	}

	async function moveCurrentTabToEnd() {
		const [tab] = await getCurrentTab();
		const windowId = tab.windowId || 1;
		const window = await getCurrentWindow();
		const { tabs } = window || {};
		const { index: lastIndex } = tabs?.pop() || { index: tab.index };
		moveTab(tab.id, lastIndex, windowId);
	}

	async function moveCurrentTabToStart() {
		const [tab] = await getCurrentTab();
		const windowId = tab.windowId || 1;
		moveTab(tab.id, 0, windowId);
	}

	async function unloadAllTabs() {
		handleMessage("Tabs Unloading...");
		const alltargetTabs = await getTabsByQuery({ url: ["*://*/*"] });
		[...alltargetTabs].forEach(async (tab) => {
			if (
				!tab?.discarded &&
				tab?.status !== "unloaded" &&
				tab.active !== true
			) {
				await discardTab(tab?.id);
			}
		});
	}

	const handleTabs = async (e) => {
		getAllTabData(e);
		const tabs = await getSomeTabData({ currentWindow: true });
		const currentWindowId = tabs?.[0]?.windowId;
		const sessionData = await saveCurrentWindow();
		await restoreWindow(sessionData);
	};

	const modelTabUpdateOptions = (tab) => {
		const { active, autoDiscardable, highlighted, muted, pinned } =
			tab || {};
		return {
			active,
			autoDiscardable,
			highlighted,
			muted,
			pinned,
		};
	};

	const restoreWindow = async (sessionData) => {
		handleMessage("Restoring...");
		const { groups, tabs } = sessionData || {};
		const tabGroups = {};
		const groupIds = tabs.reduce((groups, tab) => {
			groups?.[tab.groupId];
		}, tabGroups);

		createWindow({ focused: true }, function (window) {
			const windowId = window.id;
			const tabsInGroups = {};

			tabs.forEach(async (tab, i, a) => {
				const isLastItem = i === a.length - 1;
				const tabCreateOptions = {
					...(modelTabCreateData(tab) || {}),
					windowId,
				};
				const newTab = await chrome.tabs.create(tabCreateOptions);
				// const newTab = createTabAndUnload(tabCreateOptions);
				const tabUpdateOptions = modelTabUpdateOptions(tab);
				const updatedTab = await chrome.tabs.update(tabUpdateOptions);

				const { groupId } = tab || {};
				const shouldAddTabToGroup = tab.groupId !== -1;
				if (shouldAddTabToGroup) {
					tabsInGroups[groupId] = [
						...(tabsInGroups[groupId] || []),
						newTab.id,
					];
				}
				if (isLastItem) {
					groups.forEach(async (group) => {
						// Create a new tab group
						const tabIds = tabsInGroups[group.id] || undefined;
						const groupCreateOptions = {
							...(modelGroupCreateData(group) || {}),
							tabIds,
							createProperties: {
								windowId,
							},
						};

						chrome.tabs.group(
							groupCreateOptions,
							function (groupId) {
								const { title, color, collapsed } = group || {};

								// Update the group's color
								chrome.tabGroups.update(
									groupId,
									{
										title,
										color,
										collapsed,
									},
									function () {
										tabIds.map(discardTab);
										// Tab group created and color updated
									}
								);
							}
						);
					});
				}
			});
		});
	};

	document
		.querySelector?.("#move-start")
		.addEventListener("click", moveCurrentTabToStart);
	document
		.querySelector("#move-up")
		.addEventListener("click", moveCurrentTabForward);
	document
		.querySelector?.("#move-down")
		.addEventListener("click", moveCurrentTabBackward);
	document
		.querySelector?.("#move-end")
		.addEventListener("click", moveCurrentTabToEnd);
	document
		.querySelector?.("#unload-all")
		.addEventListener("click", unloadAllTabs);
	document
		.querySelector?.("#download-link-backup")
		.addEventListener("click", exportJSON);
	document
		.querySelector?.("#download-active-window-session")
		.addEventListener("click", exportCurrentWindowSession);
	// document
	// 	.querySelector?.("#download-link-options")
	// 	.addEventListener("click", handleTabs);
	document
		.querySelector?.("#upload-and-open")
		.addEventListener("change", uploadJSON);
})();
