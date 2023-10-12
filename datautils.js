window._tabithaDataUtils = ((window) => {
	const getAllWindowDataRaw = async () => {
		const chromeGroups = await chrome.tabGroups.query({});
		const chromeWindows = await chrome.windows.getAll({});
		const chromeTabs = await chrome.tabs.query({});

		return {
			windows: chromeWindows,
			groups: chromeGroups,
			tabs: chromeTabs,
		};
	};

	const _handleMessage = (text) => {
		const holder = document.querySelector("#message-box");
		const message = document.createElement("p");
		message.innerText = `${text}`;
		holder.appendChild(message);
	};

	const _handleFileName = (data) => {
		const createDate = `_${1 * new Date()}`;
		const apiType = `_${data?.API || "unknown"}`;
		return `tabitha_sesh${apiType}${createDate}.json`;
	};

	const downloadJSON = (data) => {
		try {
			const jsonString = JSON.stringify(data, null, 4);
			const dLink = document.createElement("a");
			const jsonBLob = new Blob([jsonString], { type: "octet/stream" });
			const dName = _handleFileName(data);

			const dURL = window.URL.createObjectURL(jsonBLob);
			dLink.setAttribute("href", dURL);
			dLink.setAttribute("download", dName);
			dLink.click();
		} catch (e) {
			_handleMessage("There was an error", e.message);
			console.error("There was an error", e);
		}
	};

	const getDataAttributes = (el) => Object.assign({}, el?.dataset || {});

	const saveWindowById = async (windowId) => {
		const tabs = await chrome.tabs.query({ windowId: windowId });
		const groups = await getSomeGroupData({ windowId: windowId });
		return {
			API: "V0",
			type: "WINDOW",
			tabs,
			groups,
		};
	};

	const saveWindowBySelected = async (selected) => {
		const tabs = await chrome.tabs.query({});
		// const groups = await chrome.tabGroups.query({ windowId: windowId });

		;
		const selectedTabs = selected.map((selectedEl) =>
			getDataAttributes(selectedEl)
		);

		const selectedTabIds = selected
			.map((selectedEl) =>
				selectedEl.classList.contains("tab") ? selectedEl.dataset.id : 0
			)
			.filter((id) => id !== 0);

		const onlySelectedTabs = tabs.filter((tb) =>
			selectedTabIds.includes(String(tb.id))
		);

		return {
			API: "V0",
			type: "WINDOW",
			tabs: onlySelectedTabs,
			groups: [],
		};
	};

	const saveSession = async () => {
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
	};

	const exportAllWindowsJSON = async () => {
		const tabData = await saveSession();
		downloadJSON(tabData);
	};

	const exportAllSelected = async (allSelectedHTMLElements) => {
		const tabData = await saveWindowBySelected(allSelectedHTMLElements);
		downloadJSON(tabData);
	};

	const exportCurrentWindowSession = async (e) => {
		_handleMessage("exporting current window...");
		const sessionData = await saveCurrentWindow();
		downloadJSON(sessionData);
		_handleMessage("done");
	};
	const importJSON = async () => {
		chrome.tabs.onUpdated.addListener(tabUpdatedHandler);
		// ... load all the new tabs under a new group
		try {
			const importedSessionJSON = JSON.parse(this.result);
			const { API, type, length } = importedSessionJSON;
			// V0 API
			if (API === "V0") {
				if (type === "FULL_SESSION") {
					// restoreSession(importedSessionJSON);
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
			_handleMessage("There was an error", e.message);
		}
		chrome.tabs.onUpdated.removeListener(tabUpdatedHandler);
	};

	const uploadJSON = (e) => {
		const files = e.target.files;
		const reader = new FileReader();
		reader.onload = importJSON;
		[...files].forEach((file) => reader.readAsText(file));
	};
	return {
		exportAllSelected,
		exportAllWindowsJSON,
		exportCurrentWindowSession,
		downloadJSON,
		uploadJSON,
	};
})(window);
