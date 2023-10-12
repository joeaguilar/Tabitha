const makeCompatibleWithDataString = (dataStringName) =>
	dataStringName.toLowerCase().replace("data-", "").replace("-", "");
const DataAttributeWatcher = (observedElement) => {
	const options = {
		attributes: true,
		childList: true,
		subtree: true,
		attributeOldValue: true,
	};
	const attributeSubscriptions = {};
	const subscribeToAttribute = (attr, callback) => {
		attributeSubscriptions[attr] = callback;
	};
	const unsubscribeToAttribute = (attr) => {
		delete attributeSubscriptions[attr];
	};
	var MutationObserver =
		window.MutationObserver ||
		window.WebKitMutationObserver ||
		window.MozMutationObserver;
	const observer = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			const { attributeName, oldValue, target, type } = mutation;
			if (type === "attributes") {
				const payload = {
					rawAttributeName: attributeName,
					attributeName: makeCompatibleWithDataString(attributeName),
					mutation,
					newValue: target?.getAttribute?.(attributeName),
					oldValue,
					target,
				};
				attributeSubscriptions?.[payload.attributeName]
					? attributeSubscriptions[payload.attributeName]?.(payload)
					: console.warn(
							"data mutation did not run with params",
							payload
					  );
			}
		}
	});
	return new Proxy(
		(attrName, callback, autoStart = true) => {
			// const observedAttributes = Object.keys(attributeSubscriptions);
			const attrKey = attrName.toLowerCase();
			const start = () => {
				subscribeToAttribute(attrKey, callback);
				const localOptions = {
					...options,
					// attributeFilter: [...observedAttributes, attrKey],
				};
				observer.observe(observedElement, localOptions);
			};
			const stop = () => observer.disconnect();

			const remove = () => {
				attributeSubscriptions[attrKey] = undefined;

				observer.observe(observedElement, {
					...options,
					// attributeFilter: [...Object.keys(attributeSubscriptions)],
				});
			};
			if (autoStart) start();
			return { start, stop, observer, remove };
		},
		{
			get: (watcher, name) => watcher.bind(undefined, name),
		}
	);
};

const { exportAllSelected } = window._tabithaDataUtils || {};

const LABEL = {
	Index: "Index",
	URL: "URL",
	Id: "Id",
	WindowId: "Window ID",
	GroupId: "Group ID",
	Title: "Title",
	BUTTON: {
		Focus: "Focus",
		Close: "Close",
		Discard: "Discard",
		SoftReload: "Reload",
		HardReload: "Hard Reload",
		Mute: "Mute",
		SetAutoDiscard: "Set Auto Discardable",
		UnsetAutoDiscard: "Unset Auto Discardable",
		Deselect: "Deselect",
		Pin: "Pin",
		Unpin: "Unpin",
	},
	GROUP: {
		// Coming soon
	},
	WINDOW: {
		Save: "Save",
		Close: "Close",
	},
};

(async () => {
	const allSelected = [];
	const allSearched = [];
	let dragSourceElement;
	let showDuplicates = false;
	let showGroups = false;
	let shouldSearch = false;
	const getAllWindowDataRaw = async () => {
		const allTabGroups = await chrome.tabGroups.query({});
		const allWindows = await chrome.windows.getAll({});
		const allTabs = await chrome.tabs.query({});

		return {
			windows: allWindows,
			groups: allTabGroups,
			tabs: allTabs,
		};
	};

	const getAllTabsDataRaw = async () => {
		return {
			windows: undefined,
			groups: undefined,
			tabs: await chrome.tabs.query({}),
		};
	};

	const allSearchedToSelected = () => {
		allSearched.forEach((el) => allSelected.push(el));
	};

	const doExportSelected = () => exportAllSelected(allSelected);

	const getDataAttributes = (el) => Object.assign({}, el?.dataset || {});

	const toggleShowDuplicates = () => {
		showDuplicates = !showDuplicates;
	};
	const toggleShowGroups = () => {
		showGroups = !showGroups;
	};

	function moveTab(tabId, moveIndex, windowId) {
		chrome.tabs.move(tabId, { index: moveIndex, windowId: windowId });
	}

	// Moves the group and all its tabs within its window, or to a new window.
	function moveGroup(groupId, moveIndex, windowId) {
		chrome.tabGroups.move(groupId, {
			index: moveIndex,
			windowId: windowId,
		});
	}

	function addTabToGroup(tabId, groupId) {
		chrome.tabs.group({ groupId, tabIds: [tabId] });
	}

	// todo: wrap in error handlers
	async function discardTabById(tabId) {
		discardTab(tabId);
		// chrome.tabs.discard(tabId);
	}

	async function setActiveTabById(tabId) {
		await chrome.tabs.update(tabId, {
			active: true,
		});
	}

	async function muteTabById(tabId) {
		await chrome.tabs.update(tabId, {
			muted: true,
		});
	}

	async function pinTabById(tabId) {
		await chrome.tabs.update(tabId, {
			pinned: true,
		});
	}

	async function unpinTabById(tabId) {
		await chrome.tabs.update(tabId, {
			pinned: false,
		});
	}

	async function toggleShouldDiscardById(tabId, shouldDiscardd) {
		await chrome.tabs.update(tabId, {
			autoDiscardable: shouldDiscard,
		});
	}

	async function hardReloadById(tabId) {
		await reloadById(tabId, true);
	}

	async function softReloadById(tabId) {
		await reloadById(tabId);
	}

	async function reloadById(tabId, shouldBypassCache) {
		await chrome.tabs.reload(tabId, {
			bypassCache: shouldBypassCache,
		});
	}

	async function closeById(tabId) {
		await chrome.tabs.remove(tabId);
	}

	async function discardTab(tabId) {
		try {
			await chrome.tabs.discard(tabId);
		} catch (tabDiscardError) {
			console.error("Error discarding tab.");
			handleMessage("There was an error", tabDiscardError.message);
			console.error(tabDiscardError);
		}
	}

	async function createGroup(tabIds, title) {
		const group = await chrome.tabs.group({ tabIds });
		await chrome.tabGroups.update(group, { title });
	}
	// todo: wire up actions and buttons
	function handleTabithaAction(e) {
		const payload = e.detail;
		const { id: rawId, groupid, windowid } = payload || {};
		const id = Number(rawId);

		// console.log("handleTabithaAction#Have the payload", payload);
		switch (payload.label) {
			case LABEL.BUTTON.Close:
				closeById(id);
				break;
			case LABEL.BUTTON.Discard:
				discardTabById(id);
				break;
			case LABEL.BUTTON.Focus:
				setActiveTabById(id);
				break;
			case LABEL.BUTTON.HardReload:
				hardReloadById(id);
				break;
			case LABEL.BUTTON.SoftReload:
				softReloadById(id);
				break;
			case LABEL.BUTTON.Mute:
				muteTabById(id);
				break;
			case LABEL.BUTTON.SetAutoDiscard:
				toggleShouldDiscardById(id, true);
				break;
			case LABEL.BUTTON.UnsetAutoDiscard:
				toggleShouldDiscardById(id, false);
				break;
			case LABEL.BUTTON.Deselect:
				deselect(id);
				break;
			case LABEL.BUTTON.Pin:
				pinTabById(id);
				break;
			case LABEL.BUTTON.Unpin:
				unpinTabById(id);
				break;
			default:
				console.log("Unsupported payload", payload);
		}
	}

	const handleTabithaAction2 = (e) => {
		const payload = e.detail;
		const { type } = payload || {};

		actionMap?.[type]?.[label]?.(payload);

		const actionMap = {
			[LABEL.BUTTON]: {
				[Close]: ({ id }) => closeById,
			},
		};

		const wrapInIdCallback =
			(fn) =>
			({ id }) =>
				fn(id);

		buttonActions = {
			Close: ({ id }) => closeById(id),
			Discard: ({ id }) => discardTabById(id),
			Focus: ({ id }) => setActiveTabById(id),
			HardReload: ({ id }) => hardReloadById(id),
			SodftReload: ({ id }) => softReloadById(id),
			Mute: ({ id }) => muteTabById(id),
			SetAutoDiscard: ({ id }) => toggleShouldDiscardById(id, true),
			UnsetAutoDiscard: ({ id }) => toggleShouldDiscardById(id, false),
			Deselect: ({ id }) => deselect(id),
			Pin: ({ id }) => pinTabById(id),
			Unpin: ({ id }) => unpinTabById(id),
		};
	};

	const searchForTabs = async (key) => {};

	const saveWindowBySelected = async (selected) => {
		const tabs = await chrome.tabs.query({ windowId: windowId });
		const groups = await chrome.tabGroups.query({ windowId: windowId });

		const allSelectedAsAttributes = selected.map((selectedEl) =>
			getDataAttributes(selectedEl)
		);

		allSelectedAsAttributes.filter((selectedEl) => {});

		return {
			API: "V0",
			type: "WINDOW",
			tabs,
			groups,
		};
	};

	function broadcastTabithaAction(e, payload) {
		// e.currentTarget.dataset;
		const event = new CustomEvent("tabitha-action", {
			detail: payload,
		});
		window.dispatchEvent(event);
	}

	const buildTabithaWindowDataFromSelected = () => {
		const allWindowsData = getAllWindowDataRaw();
	};

	window.addEventListener("tabitha-action", handleTabithaAction);

	const findDuplicateUrls = (tabs) => {
		const seen = {};
		const tl = tabs?.length || 0;
		for (let i = 0, tab = tabs[i]; i < tl; ++i, tab = tabs[i]) {
			if (seen[tab.url] === undefined) {
				seen[tab.url] = false;
			} else {
				seen[tab.url] = true;
			}
		}
		return seen;
	};

	function findDuplicates(urls) {
		return urls.filter(
			(url, index) =>
				urls.indexOf(url) !== index && urls.lastIndexOf(url) === index
		);
	}

	const prepareColor = (id) =>
		"#" + (id >> 0).toString(16).slice(0, 8).padEnd(8, "F");

	const createElementFromHTML = (htmlString) => {
		const div = document.createElement("div");
		div.innerHTML = htmlString.trim();
		return div.firstElementChild;
	};

	const overwriteDataAttributes = (el, data) =>
		Object.assign(el.dataset, data);

	const getAllDataAttributes = (el, data) => Object.assign(data, el.dataset);

	const encodeData = (type, id) => `${type}-${id}`;

	const decodeData = (dString) => {
		const [type, id] = dString.split("-");
		return [type, id];
	};

	const moveItemOnDropEvent = (e) => {
		const { index, windowid, groupid, type } =
			e?.currentTarget?.dataset || {};
		const [fromType, itemId] = decodeData(
			e.dataTransfer.getData("text") || ""
		);

		if (fromType === "track") {
			deselect(itemId);
		}

		if (type === "tab") {
			if (itemId && index && windowid) {
				moveTab(Number(itemId), Number(index), Number(windowid));
			}
		}
		if (type === "group") {
			if (itemId && groupid) {
				addTabToGroup(Number(itemId), Number(groupid));
			}
		}
		if (type === "window") {
			moveTab(Number(itemId), Number(-1), Number(windowid));
		}
	};

	const moveTabOnDropEvent = (e) => {
		const { index, windowid, groupid } = e?.target?.dataset || {};
		var tabId = e.dataTransfer.getData("text");
		if (tabId && index && windowid) {
			moveTab(Number(tabId), Number(index), Number(windowid));
			if (groupid !== "-1") {
				// moveGroup();
			}
		}
	};

	function extractCorrectTabElement(maybeTabEl) {
		let maybeTab = maybeTabEl;
		let tabElName = maybeTabEl?.tagName?.toLowerCase() || "";
		if (tabElName !== "div") {
			maybeTab = maybeTab.parentNode;
		}
		return maybeTab;
	}

	function extractGroupElement(maybeTabEl) {
		let maybeTab = maybeTabEl;
		let tabElName = maybeTabEl?.tagName?.toLowerCase() || "";
		let attempts = 0;
		while (
			(tabElName !== "div" &&
				!maybeTab?.classList?.contains?.("group")) ||
			attempts > 5
		) {
			maybeTab = maybeTab.parentNode;
			++attempts;
		}
		return maybeTab;
	}

	function dragEnter(e) {
		e.target.parentNode.classList.add("dragover");
	}

	function dragLeave(e) {
		e.target.parentNode.classList.remove("dragover");
	}

	function dragStart(e) {
		const { currentTarget: target } = e || {};
		const { id, type } = target.dataset || {};
		e.dataTransfer.setData("text/plain", encodeData(type, id));
		target.style.opacity = "0.4";

		dragSourceElement = target;
		e.dataTransfer.effectAllowed = "move";
		target.classList.remove("dragover");
	}

	const drop = (e) => {
		e.stopPropagation();
		e.preventDefault();
		e.target.parentNode.classList.remove("dragover");
		e.currentTarget.classList.remove("dragover");
		e.target.classList.remove("dragover");

		if (e.target && dragSourceElement !== e.target) {
			if (dragSourceElement.dataset.type === "track") {
				dragSourceElement = findInSelected(
					dragSourceElement.dataset.id
				);
			}

			moveItemOnDropEvent(e);

			const sourceTab =
				dragSourceElement.dataset.groupid === "-1"
					? extractCorrectTabElement(dragSourceElement)
					: extractGroupElement(dragSourceElement);

			sourceTab.classList.remove("dragover");
			const destTab = extractCorrectTabElement(e.target);

			const insertInto =
				destTab.dataset.type === "window" ? "beforeEnd" : "beforeBegin";

			destTab.insertAdjacentElement(insertInto, sourceTab);
			destTab.classList.remove("dragover");
			sourceTab.style.opacity = "1";
		}

		return false;
	};

	function dragOver(ev) {
		ev.preventDefault();
	}

	function dragEnd(e) {
		e.currentTarget.style.opacity = "1";
	}

	const swapEls = (fromEl, toEl) => {
		// debugger;
		const marker = document.createElement("div");
		fromEl.parentNode.insertBefore(marker, fromEl);
		toEl.parentNode.insertBefore(fromEl, toEl);
		marker.parentNode.insertBefore(toEl, marker);
		marker.parentNode.removeChild(marker);
	};

	function deselectAll() {
		allSelected.forEach((selected) =>
			selected.classList.remove("selected")
		);
		allSelected.length = 0;
	}

	const groupSelected = async () => {
		const selectedIds = allSelected.map(({ id }) => id);
		createGroup(selectedIds, "Grouped");
	};

	const createButton = (btnTypeClass, label, id, onClick) => {
		const btn = document.createElement("input");
		btn.classList.add(btnTypeClass);
		btn.setAttribute("value", label);
		btn.setAttribute("type", "button");
		btn.setAttribute("id", idBuilder(id));
		btn.addEventListener("click", onClick);
		return btn;
	};

	const createButtonTwo = (buttonConfigs) => {
		const { label, windowid, groupid, index, id } = buttonConfigs || {};

		const buttonHTML =
			/* html */
			`<button data-label="${label}" data-id="${id}" data-windowid="${windowid}" data-groupid="${groupid}" data-index="${index}" >
				<div class="button-content-wrapper">
					<span class="button-text">${label}</span>
				</div>
			</button>`;

		const button = createElementFromHTML(buttonHTML);
		return button;
	};

	const clickHandler = (e) => {
		// Emit the target, the target has all the dataset attributes
		const dataAttrs = getAllDataAttributes(e.currentTarget, {});
		broadcastTabithaAction(e, dataAttrs);
	};

	const createSelectedTabControls = (btnProps) => {
		const div = document.createElement("div");
		div.classList.add("tab-actions");
		overwriteDataAttributes(div, btnProps);

		const allButtons = Object.keys(LABEL.BUTTON)
			.map((label) => createButtonTwo({ ...btnProps, label }))
			.forEach((el) => {
				el.addEventListener("click", clickHandler);
				div.appendChild(el);
			});

		return div;
	};

	const removeSelectedTabControls = (tabActions) =>
		[...tabActions.children].map((el) => {
			el.removeEventListener("click", clickHandler);
			el.remove();
		});

	const removeStaleElements = (allGroup, compareGroup, howToRemove) =>
		allGroup
			.filter((item) => !compareGroup.includes(item))
			.map(howToRemove || ((el) => el.remove()));

	const displayAllSelected = () => {
		const selectedTabWrapper = document.querySelector(
			"#selected-tab-wrapper"
		);
		const gridBoy = document.querySelector(".grid-boy");

		if (selectedTabWrapper) {
			selectedTabWrapper;
			selectedTabWrapper.remove();
		}

		if (allSelected.length === 0) {
			if (gridBoy) gridBoy.classList.add("full");
			return;
		}

		gridBoy.classList.remove("full");

		const selectedTabHolder = document.querySelector("#selected-tabs");
		if (!selectedTabHolder) {
			console.error(
				"Cannot find block element with id 'selected-tabs'. Check the HTML."
			);
			return;
		}
		const divvy = document.createElement("div");
		/* */ divvy.classList.add("tab-wrapper");
		/* */ divvy.setAttribute("id", "selected-tab-wrapper");

		const trackEls = allSelected.map((el) => {
			let maybeSelected = document.querySelector(
				`.tab-info[data-id="${el?.dataset?.id || 0}"]`
			);

			let maybeButtonBars = document.querySelector(
				`.tab-actions[data-id="${el?.dataset?.id || 0}"]`
			);

			if (!maybeSelected) {
				const { title: url, dataset } = el || {};
				const {
					index,
					title,
					type,
					faviconurl,
					windowid,
					groupid,
					id,
				} = dataset || {};
				const sTitle = sanitize(title);
				let imgSource = faviconurl;
				if (type === "window") {
					imgSource = "/icons/window.svg";
				}

				if (type === "group") {
					imgSource = "/icons/folder.svg";
				}

				const seletedInfoEl = `<div class="tab-info"  title="${url}" data-type="track" data-id="${id}" data-windowid="${windowid}" data-groupid="${groupid}" data-index="${index}" >
				<img src=${imgSource} width="24px" height="24px" data-id="${id}" data-groupid="${groupid}" data-windowid="${windowid}" data-index="${index}" >
				<div class="info-wrapper">
				<p class="tab-info-text">${LABEL.Title}: ${sTitle}</p>
				<p class="tab-info-text">${LABEL.Index}: ${index}</p>
				<p class="tab-info-text">${LABEL.Id}: ${id}</p>
				<p class="tab-info-text">${LABEL.URL}: ${url}</p>
				<p class="tab-info-text">${LABEL.WindowId}: ${windowid}</p>
				<p class="tab-info-text">${LABEL.GroupId}: ${groupid}</p>
				</div>
				</div>`;

				const tab = createElementFromHTML(seletedInfoEl);
				tab.setAttribute("draggable", true);
				tab.addEventListener("dragstart", dragStart);
				tab.addEventListener("dragend", dragEnd);
				tab.addEventListener("drop", drop);
				maybeSelected = tab;
			}

			if (!maybeButtonBars) {
				maybeButtonBars = createSelectedTabControls(
					getAllDataAttributes(el, {})
				);
			}
			divvy.appendChild(maybeSelected);
			divvy.appendChild(maybeButtonBars);
		});

		removeStaleElements(
			[...document.querySelectorAll(`div.tab-info`)],
			trackEls,
			(el) => {
				el.removeEventListener("dragstart", dragStart);
				el.removeEventListener("dragend", dragEnd);
				el.removeEventListener("drop", drop);
				el.remove();
			}
		);

		removeStaleElements(
			[...document.querySelectorAll(`div.tab-info`)],
			trackEls,
			(el) => {
				removeSelectedTabControls([
					...document.querySelectorAll(`.tab-actions`),
				]);
				el.removeEventListener("dragstart", dragStart);
				el.removeEventListener("dragend", dragEnd);
				el.removeEventListener("drop", drop);
				el.remove();
			}
		);
		selectedTabHolder.appendChild(divvy);
	};

	const findInSelected = (id) =>
		allSelected.filter((el) => Number(el.dataset.id) === Number(id))[0];

	function deselect(id) {
		// Find selected by id
		const found = findInSelected(id);

		if (allSelected.includes(found)) {
			allSelected.splice(allSelected.indexOf(found), 1);
			found.classList.remove("selected");
		}

		displayAllSelected();
	}

	function toggleSelected(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		let target = ev?.target;

		let tagName = target?.tagName?.toLowerCase();
		if (tagName === "img" || tagName === "span") {
			target = target.parentNode;
			tagName = target?.tagName?.toLowerCase();
		}

		if (allSelected.includes(target)) {
			allSelected.splice(allSelected.indexOf(target), 1);
			target.classList.remove("selected");
		} else {
			allSelected.push(target);
			target.classList.add("selected");
		}
		displayAllSelected();
	}

	const sanitize = (str) => str?.split?.(/[\<\>]/).join('"');

	// TODO: Revist these constructors
	const createTabText = (tabProps, isDuplicate) => {
		let maybeTab = document.querySelector(`.tab[data-id="${tabProps.id}"]`);
		let tabString = "";
		if (!maybeTab) {
			const {
				active,
				audible,
				autoDiscardable,
				discarded,
				favIconUrl,
				groupId,
				height,
				highlighted,
				id,
				incognito,
				index,
				mutedInfo,
				pinned,
				selected,
				status,
				title,
				url,
				width,
				windowId,
			} = tabProps || {};
			const sTitle = sanitize(title);
			tabString = `<div class="tab ${isDuplicate ? " duplicate" : ""}${
				active ? " active" : ""
			}"  title="${
				sTitle + " | " + url
			}" data-id="${id}" data-type="tab" data-title="${title}" data-faviconurl="${favIconUrl}" data-windowid="${windowId}" data-groupid="${groupId}" data-index="${index}" >
		<p class="tab-title">${sTitle}</p>
		<p class="tab-url">${url}</p>
		<img src=${favIconUrl} width="24px" height="24px" data-id="${id}" data-windowid="${windowId}" data-groupid="${groupId}" data-index="${index}" >
		</div>`;

			const tab = createElementFromHTML(tabString);

			tab.setAttribute("draggable", true);
			tab.addEventListener("dragstart", dragStart);
			tab.addEventListener("dragover", dragOver);
			tab.addEventListener("dragenter", dragEnter);
			tab.addEventListener("dragleave", dragLeave);
			tab.addEventListener("dragend", dragEnd);
			tab.addEventListener("drop", drop);
			maybeTab = tab;
			overwriteDataAttributes(maybeTab, tabProps);
		} else {
			overwriteDataAttributes(maybeTab, tabProps);
		}

		showDuplicates && isDuplicate
			? maybeTab.classList.add("duplicate")
			: maybeTab.classList.remove("duplicate");

		return [maybeTab, tabString];
	};

	const getAllTabsByWindowId = (windowid) =>
		document.querySelector(`.tab-wrapper[data-windowid="${windowid}"]`)
			.children;

	const getAllTabs = () => [...document.querySelectorAll(`.tab`)];

	const doSearch = async (e) => {
		const term = e.currentTarget.value;

		if (term.length === 0) {
			allSearched.length = 0;
			[...document.querySelectorAll(".tab.found")].forEach((el) => {
				el.classList.remove("found");
			});
		}

		if (term.length < 3) {
			return;
		}

		const tabs = getAllTabs();
		allSearched.length = 0;
		tabs.forEach((el) => {
			if (el.dataset.url.includes(term)) {
				el.classList.add("found");
				allSearched.push(el);
			} else {
				el.classList.remove("found");
			}
		});
	};

	const doUpdate = async () => {
		// const tStart = performance.now();

		const df = document.createDocumentFragment();
		const maybeTabHolder = document.querySelector(`[id="tab-items2"]`);
		const tabHolder = maybeTabHolder
			? maybeTabHolder
			: createElementFromHTML(`<div id="tab-items2"><div/>`);

		const { tabs, groups, windows } = await getAllWindowDataRaw();

		const maybeGroupEle = "";

		const groupEls = !showGroups
			? []
			: groups.reduce((groupDict, group) => {
					let maybeGroup = document.querySelector(
						`div.group-name[data-groupid="${group.id}"]`
					);
					if (!maybeGroup) {
						maybeGroup = document.createElement("div");
						maybeGroup.addEventListener("dragover", dragOver);
						maybeGroup.addEventListener("dragenter", dragEnter);
						maybeGroup.addEventListener("dragleave", dragLeave);
						maybeGroup.addEventListener("dragend", dragEnd);
						maybeGroup.addEventListener("drop", drop);
						maybeGroup.addEventListener("click", toggleSelected);
					} else {
						maybeGroup.innerHTML = "";
						maybeGroup.classList = "";
					}
					const groupName = document.createElement("span");
					groupName.classList = "";
					groupName.classList.add(...["group-name", group.color]);
					groupName.innerText = group.title;
					maybeGroup.classList.add(...["group-name", group.color]);
					overwriteDataAttributes(maybeGroup, group);
					maybeGroup.dataset.type = "group";
					groupDict[group.id] = maybeGroup;
					maybeGroup.appendChild(groupName);
					return groupDict;
			  }, {});

		removeStaleElements(
			[...document.querySelectorAll(`div.group-name`)],
			groupEls,
			(el) => {
				el.removeEventListener("dragover", dragOver);
				el.removeEventListener("dragenter", dragEnter);
				el.removeEventListener("dragleave", dragLeave);
				el.removeEventListener("dragend", dragEnd);
				el.removeEventListener("drop", drop);
				el.removeEventListener("click", toggleSelected);
				el.remove();
			}
		);

		const windowEls = windows.reduce((windowDict, windowConfig) => {
			let maybeWindow = document.querySelector(
				`div.tab-wrapper[data-id="${windowConfig.id}"]`
			);

			if (!maybeWindow) {
				maybeWindow = document.createElement("div");
				maybeWindow.addEventListener("dragover", dragOver);
				maybeWindow.addEventListener("dragenter", dragEnter);
				maybeWindow.addEventListener("dragleave", dragLeave);
				maybeWindow.addEventListener("dragend", dragEnd);
				maybeWindow.addEventListener("drop", drop);
				maybeWindow.addEventListener("click", toggleSelected);
				maybeWindow.classList.add("tab-wrapper");
			}

			if (windowConfig.focused) {
				maybeWindow.classList.add("window-focused");
			}

			overwriteDataAttributes(maybeWindow, windowConfig);
			maybeWindow.dataset.type = "window";
			maybeWindow.dataset.windowid = windowConfig.id;
			windowDict[windowConfig.id] = maybeWindow;

			if (showGroups) {
				Object.values(groupEls).forEach((group) => {
					if (Number(group.dataset.windowid) === windowConfig.id) {
						maybeWindow.appendChild(group);
					}
				});
			}

			return windowDict;
		}, {});
		removeStaleElements(
			[...document.querySelectorAll(`div.tab-wrapper`)],
			Object.values(windowEls),
			(el) => {
				el.removeEventListener("dragover", dragOver);
				el.removeEventListener("dragenter", dragEnter);
				el.removeEventListener("dragleave", dragLeave);
				el.removeEventListener("dragend", dragEnd);
				el.removeEventListener("drop", drop);
				el.removeEventListener("click", toggleSelected);
				el.remove();
			}
		);

		const allSeen = findDuplicateUrls(tabs);
		const tabEls = tabs.map((tab) => {
			const isDuplicate = showDuplicates ? allSeen[tab.url] : undefined;
			const divvy = windowEls[tab.windowId];
			const [tabEl /* , tabString */] = createTabText(tab, isDuplicate);
			let attachEL = tabEl;
			if (showGroups) {
				const gDivvy =
					tab.groupId !== -1 ? groupEls[tab.groupId] : undefined;
				if (gDivvy) {
					gDivvy.appendChild(attachEL);
					attachEL = gDivvy;
				}
			}
			divvy.appendChild(attachEL);
			return attachEL;
		});
		removeStaleElements(
			[...document.querySelectorAll(`.tab`)],
			tabEls,
			(tb) => {
				tb.removeEventListener("dragstart", dragStart);
				tb.removeEventListener("dragover", dragOver);
				tb.removeEventListener("dragenter", dragEnter);
				tb.removeEventListener("dragleave", dragLeave);
				tb.removeEventListener("dragend", dragEnd);
				tb.removeEventListener("drop", drop);
				tb.remove();
			}
		);
		allSelected.forEach((item) => item.classList.add("selected"));

		// Go into each tab
		// Swap for the one that gets replaced
		Object.values(windowEls).forEach((wd) => df.appendChild(wd));

		tabHolder.appendChild(df);
		displayAllSelected();

		// const tStop = performance.now();
		// console.log(`it took this long to update ${tStop - tStart}`);
	};

	document.addEventListener("DOMContentLoaded", async () => {
		const events = {
			"#show-groups": toggleShowGroups,
			"#show-duplicates": toggleShowDuplicates,
			"#export-selected": doExportSelected,
			"#deselect-all": deselectAll,
			"#select-searched": allSearchedToSelected,
		};

		Object.entries(events).forEach(([selector, fn]) => {
			const fnHandler = (e) => {
				e ? fn(e) : fn();

				doUpdate();
			};
			const el = document.querySelector(selector);
			el.addEventListener("click", fnHandler);
		});

		document.querySelector("#search").addEventListener("change", doSearch);
		document.querySelector("#search").addEventListener("keyup", doSearch);
		// [toggleShowGroups, toggleShowDuplicates].forEach((fn, ind) => {
		// 	const selector = ind === 0 ? "#show-groups" : "#show-duplicates";
		// 	const fnHandler = (e) => {
		// 		e ? fn(e) : fn();

		// 		doUpdate();
		// 	};
		// 	const el = document.querySelector(selector);
		// 	el.addEventListener("click", fnHandler);
		// });

		// [doExportSelected, deselectAll].forEach((fn, ind) => {
		// 	const selector = ind === 0 ? "#export-selected" : "#deselect-all";
		// 	const fnHandler = (e) => {
		// 		e ? fn(e) : fn();

		// 		doUpdate();
		// 	};
		// 	const el = document.querySelector(selector);
		// 	el.addEventListener("click", fnHandler);
		// });

		doUpdate();
	});

	chrome.tabs.onUpdated.addListener(function (tabId, updateInfo) {
		const isNewTab = updateInfo?.url === "chrome://newtab/";
		const el = document.querySelector(`[data-id="${tabId}"]`);
		if (!el) {
			console.error("Couldn't find tab with id", tabId, updateInfo);
			return;
		}
		Object.entries(updateInfo).forEach(([k, v]) => {
			el.dataset[k] = v;
		});
		doUpdate();
	});

	const chromeEventHandler = (eventName) => (a, b, c, d) => {
		if (eventName !== "windows.onFocusChanged") {
			doUpdate();
			// Since we are listenning for all events,
			// the only event that gives -1 is the windows.onFocusChanged
			// Which means we dont want to update
		} else if (a > -1) {
			doUpdate();
		}

		// console.log("This is what we get from the event", eventName);
		// console.log("a", a);
		// console.log("b", b);
		// console.log("c", c);
		// console.log("d", d);
	};

	const moveTabs = (tabid, moveConfig) => {
		doUpdate();
	};
	chrome.tabs.onCreated.addListener((newTabInfo) => {
		chromeEventHandler("onCreated")(newTabInfo);
		doUpdate();
	});

	chrome.tabs.onMoved.addListener(moveTabs);
	chrome.tabs.onRemoved.addListener(chromeEventHandler("onRemoved"));
	chrome.tabs.onReplaced.addListener(chromeEventHandler("onReplaced"));
	chrome.tabs.onDetached.addListener(chromeEventHandler("onDetached"));
	chrome.tabs.onAttached.addListener(chromeEventHandler("onAttached"));
	chrome.tabs.onActivated.addListener(chromeEventHandler("onActivated"));
	chrome.windows.onFocusChanged.addListener(
		chromeEventHandler("windows.onFocusChanged")
	);
	chrome.windows.onCreated.addListener(
		chromeEventHandler("windows.onCreated")
	);
	chrome.windows.onRemoved.addListener(
		chromeEventHandler("windows.onRemoved")
	);
	// chrome.tabs.onUpdated.addListener(chromeEventHandler("onUpdated"));
	// chrome.storage.onChanged.addListener(chromeEventHandler("storage.onChanged"));
})();
