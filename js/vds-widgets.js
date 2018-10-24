window.GM = window.GM || {};

GM.vds = {};
GM.vds.form = {};
GM.vds.VDSEditor = CQ.Ext.extend(CQ.wcm.Viewport, {
	"loadedRootPath": "",
	constructor: function (config) {
		var editor = this;

		CQ.Util.applyDefaults(config, {
			"editorRootPath": "/data/vds"
		});
		this.loadedRootPath = config.editorRootPath;

		var treeActions = [
			{
				"id": "cq-vdseditor-tree-refresh",
				"iconCls": "cq-siteadmin-refresh",
				"tooltip": {
					"text": "Refresh the tree",
					"autoHide": true
				},
				handler: function () {
					editor.reloadTree();
				},
			}
		];

		var gridActions = [
			new CQ.PrivilegedAction({
				"text": "New...",
				"iconCls": "cq-siteadmin-create-icon",
				handler: GM.vds.VDSEditor.handleNew(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Edit...",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleEdit(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Update...",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor),
					GM.vds.VDSEditor.hasUpdatableGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleUpdate(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Update Spreadsheet...",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor),
					GM.vds.VDSEditor.hasUpdatableGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleUpdateSpreadsheet(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Copy...",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleCopy(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Delete",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleDelete(editor)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Order Up",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleReorder(editor, true)
			}),
			new CQ.PrivilegedAction({
				"text": "Order Down",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleReorder(editor, false)
			}),
			"-",
			new CQ.PrivilegedAction({
				"text": "Activate Tree",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleReplicate(editor, "activate", true)
			}),
			new CQ.PrivilegedAction({
				"text": "Activate Item",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleReplicate(editor, "activate", false)
			}),
			new CQ.PrivilegedAction({
				"text": "Deactivate Item",
				"conditions": [
					GM.vds.VDSEditor.hasGridSelection(editor)
				],
				handler: GM.vds.VDSEditor.handleReplicate(editor, "deactivate", false)
			}),
			"->",
			new CQ.Ext.Action({
				"text": "Tools",
				"iconCls": "cq-siteadmin-tools-icon",
				"menu": new CQ.Ext.menu.Menu({
					"items": [
						new CQ.Ext.Action({
							"text": "Initialize VDS",
							handler: GM.vds.VDSEditor.handleInitialize(editor)
						}),
						new CQ.Ext.Action({
							"text": "Show VDS Status",
							handler: GM.vds.VDSEditor.handleShowStatus(editor)
						})
					]
				})
			}),
		];

		var treeLoader = new CQ.tree.SlingTreeLoader({
			"path": config.editorRootPath,
			"baseAttrs": {
				singleClickExpand: true
			},
			"nameExcludes": [
				"vds:content",
				"vds:imported",
				"vds:authored"
			],
			getTitle: function (name, o) {
				return GM.vds.VDSEditor.readVDSProperty(o, "jcr:title") || "[" + name + "]";
			},
			readAttributes: function(name, o) {
				// Add additional attributes from the JSON response object to
				// the attributes object used by createNode to create the
				// TreeNode.
				var result = CQ.tree.SlingTreeLoader.prototype.readAttributes.call(this, name, o);
				result["jcr:primaryType"] = o["jcr:primaryType"];
				return result;
			}
		});
		
		var treeRoot = new CQ.Ext.tree.AsyncTreeNode({
			"name": config.editorRootPath.substring(1),
			"text": "Vehicle Data Store",
			"expanded": true
		});

		var gridColumnModel = {
			"defaultWidth": "140",
			"columns": [
				{
					"header": "Title",
					"dataIndex": "jcr:title",
				},
				{
					"header": "Code",
					"dataIndex": "jcr:name"
				},
				{
					"header": "Type",
					"dataIndex": "jcr:primaryType"
				},
				{
					"header": "Modified",
					"dataIndex": "lastModified"
				},
				{
					"width": 70,
					"header": "Modified By",
					"dataIndex": "lastModifiedBy"
				},
				{
					"width": 70,
					"header": "Publish",
					"dataIndex": "replicationStatus"
				},
				{
					"header": "VDS Context",
					"dataIndex": "vdsContextPath"
				},
				{
					"id": "autoExpand",
					"header": "VDS Object",
					"dataIndex": "vdsObjectPath"
				},{
					"header": "parentType",
					"dataIndex": "parentType"
				}
			]
		};

		var gridStore = new CQ.Ext.data.JsonStore({
			"url": editor.getGridUri(config.editorRootPath),
			"root": "children",
			"idProperty": "jcr:path",
			"fields": [
				{
					"name": "jcr:title",
					convert: function (value, record) {
						return GM.vds.VDSEditor.readVDSProperty(record, "jcr:title");
					}
				},
				{
					"name": "jcr:name",
					"mapping": "jcr:name"
				},
				{
					"name": "jcr:primaryType",
					"mapping": "jcr:primaryType"
				},
				{
					"name": "lastModified",
					convert: function (value, record) {
						var lastModified = GM.vds.VDSEditor.readVDSProperty(record, "jcr:lastModified");
						if (lastModified) {
							return new Date(lastModified).format("Y-m-d H:i T");
						}
						return "";
					}
				},
				{
					"name": "lastModifiedBy",
					convert: function (value, record) {
						return GM.vds.VDSEditor.readVDSProperty(record, "jcr:lastModifiedBy");
					}
				},
				{
					"name": "replicationStatus",
					convert: function (value, record) {
						var lastAction = record["cq:lastReplicationAction"];
						switch (lastAction) {
							case "Activate":
								var lastModified = GM.vds.VDSEditor.readVDSProperty(record, "jcr:lastModified");
								var lastReplicated = record["cq:lastReplicated"];

								if (lastModified > lastReplicated) {
									return "Modified";
								}

								return "Activated";
							case "Deactivate":
								return "Deactivated";
						}
						return "(None)";
					}
				},
				{
					"name": "vdsPath",
					convert: function (value, record) {
						var path = record["jcr:path"];
						return editor.getRelativeVDSPath(path);
					}
				},
				{
					"name": "vdsParentPath",
					convert: function (value, record) {
						var path = record["jcr:path"];
						var vdsPath = editor.getRelativeVDSPath(path);
						return  GM.vds.VDSEditor.getParentVDSPath(vdsPath);
					}
				},
				{
					"name": "vdsContextPath",
					convert: function (value, record) {
						var path = record["jcr:path"];
						var vdsPath = editor.getRelativeVDSPath(path);
						var vdsContextPath = GM.vds.VDSEditor.parseVDSContextPath(vdsPath);
						return vdsContextPath;
					}
				},
				{
					"name": "vdsObjectPath",
					convert: function (value, record) {
						var path = record["jcr:path"];
						var vdsPath = editor.getRelativeVDSPath(path);
						var vdsObjectPath = GM.vds.VDSEditor.parseVDSObjectPath(vdsPath);
						return vdsObjectPath;
					}
				}
			]
		});

		var items = [
			{
				"id": "cq-vdseditor-ui",
				"xtype": "panel",
				"region": "center",
				"layout": "border",
				"border": false,
				"items": [
					{
						"id": "cq-vdseditor-tree",
						"xtype": "treepanel",
						"region": "west",
						"margins": "5 0 5 5",
						"width": "240",
						"autoScroll": true,
						"containerScroll": true,
						"split": true,
						"loader": treeLoader,
						"root": treeRoot,
						"rootVisible": true,
						"tbar": treeActions,
						"listeners": {
							click: function (node, event) {
								CQ.Ext.History.add(node.getPath(), true);
								editor.checkActions();
								editor.loadPath(node.getPath());
							}
						}
					},
					{
						"id": "cq-vdseditor-grid",
						"xtype": "grid",
						"region": "center",
						"margins": "5 5 5 0",
						"stripeRows": true,
						"store": gridStore,
						"tbar": gridActions,
						"autoExpandColumn": "autoExpand",
						"colModel": new CQ.Ext.grid.ColumnModel(gridColumnModel),
						"selModel": new CQ.Ext.grid.RowSelectionModel({
							"singleSelect": true,
							"listeners": {
								selectionchange: function (selModel) {
									editor.checkActions();
								}
							}
						}),
						"listeners": {
							rowdblclick: function (grid, index, e) {
								GM.vds.VDSEditor.handleEdit(editor)();
							}
						}
					}
				]
			}
		];

		config.id = "cq-vdseditor";
		config.items = items;

		GM.vds.VDSEditor.superclass.constructor.call(this, config);

		// Hidden field for history token
		var hiddenHistoryTokenHolder = new CQ.Ext.form.Hidden({
			"id": CQ.Ext.History.fieldId,
			"renderTo": CQ.Util.ROOT_ID
		});

		// This is for IE compatibility with the history manager:
		//var historyFrame = document.createElement("iframe");
		//historyFrame.id = CQ.Ext.History.iframeId;
		//historyFrame.src = CQ.Ext.SSL_SECURE_URL;
		//historyFrame.className = "x-hidden";
		//historyFrame.frameBorder = "0";
		//historyFrame.border = "0";
		//new CQ.Ext.Element(historyFrame).appendTo(CQ.Util.getRoot());

		CQ.Ext.History.init();
		CQ.Ext.History.on("change", function (token) {
			var current = editor.getSelectedTreePath();
			if (token != current) {
				editor.loadPath(token);
			}
		});

		var anchor = CQ.HTTP.getAnchor(document.location.href);
		if (anchor) {
			editor.loadPath(decodeURI(anchor));
		} else {
			editor.loadPath(config.editorRootPath);
		}
	},

	initComponent: function () {
		GM.vds.VDSEditor.superclass.initComponent.call(this);
	},

	loadPath: function (path, reload) {
		this.mask();

		var tree = CQ.Ext.getCmp("cq-vdseditor-tree");
		if (tree.getRootNode().getPath() == path) {
			if (reload) {
				tree.getRootNode().reload();
			}
			tree.getRootNode().select();
		} else {
			tree.selectPath(path, null, function (success, node) {
				if (success) {
					// TODO: Need to take note of newly added children here.
					if (node instanceof CQ.Ext.tree.AsyncTreeNode) {
						node.reload();
					}
					node.expand();
				}
			});
		}

		var store = CQ.Ext.getCmp("cq-vdseditor-grid").getStore();
		store.proxy.setApi(CQ.Ext.data.Api.actions.read, this.getGridUri(path));
		store.reload({
			callback: function() {
				this.unmask();
			},
			"scope": this
		});
	},

	getGridUri: function (path) {
		return CQ.HTTP.externalize(path, true) + ".list.json"
	},

	getSelectedTreeNode: function () {
		var tree = CQ.Ext.getCmp("cq-vdseditor-tree");
		var node = tree.getSelectionModel().getSelectedNode();
		return node;
	},

	getSelectedTreePath: function () {
		var node = this.getSelectedTreeNode();
		return node ? node.getPath() : null;
	},

	getSelectedGridRecord: function () {
		var grid = CQ.Ext.getCmp("cq-vdseditor-grid");
		return grid.getSelectionModel().getSelected();
	},

	getGridStore: function () {
		var grid = CQ.Ext.getCmp("cq-vdseditor-grid");
		return grid.getStore();
	},

	reloadTree: function () {
		this.loadPath(this.getSelectedTreePath(), true);
	},

	checkActions: function () {
		var grid = CQ.Ext.getCmp("cq-vdseditor-grid");
		var gridToolButtons = grid.getTopToolbar().items;
		gridToolButtons.each(function (item, index, length) {
			if (item.hasOwnProperty("baseAction")) {
				var action = item.baseAction;
				if (typeof action.checkConditions === "function") {
					if (action.checkConditions()) {
						item.enable();
					} else {
						item.disable();
					}
				}
			}
		});
	},

	mask: function () {
		if (!this.loadMask) {
			this.loadMask = new CQ.Ext.LoadMask("cq-vdseditor-ui", {
				"msg": "Loading..."
			});
		}
		this.loadMask.show();
	},

	unmask: function () {
		if (!this.loadMask) {
			return;
		}
		this.loadMask.hide();
	},

	createDialog: function (config) {
		//var dialog = new CQ.Dialog(config);
		var dialog = CQ.WCM.getDialog(config);

		dialog.on("beforesubmit", function() {
			this.mask();
		}, this);

		dialog.responseScope = this;
		dialog.success = function (e, response) {
			this.unmask();
			if (response.result && response.result.Message && response.result.Message == 'Another update is in progress. Please try again at a later time.') {
				this.showError(response.result.Message);
			}
			else {
				this.reloadTree();
			}
		};
		dialog.failure = function() {
			this.unmask();
			this.showError("Error saving data. Please reload the page and try again.");
		};

		return dialog;
	},

	getRelativeVDSPath: function (fullVdsPath) {
		// Special case.
		if (fullVdsPath == this.loadedRootPath) {
			return "";
		}

		return fullVdsPath.replace(this.loadedRootPath + "/", "");
	},
	getFeatureDefsRepoPath: function (featuresRepoPath) {
		var vdsPathParts = featuresRepoPath.split("/");
		return vdsPathParts.slice(0, vdsPathParts.length - 2).join("/") + "/Features";
	},
	showSuccess: function (message) {
		CQ.Ext.Msg.alert("Success", message);
	},

	showError: function (message) {
		CQ.Ext.Msg.alert("Error", message);
	},

	executeCommand: function (commandName, path, additionalParams, callback) {
		CQ.Ext.Ajax.request({
			"url": GM.vds.VDSEditor.VDS_COMMAND_URL,
			"params": CQ.Util.applyDefaults(additionalParams, {
				"cmd": commandName,
				"path": path
			}),
			"scope": this,
			"timeout": 1800000,
			callback: function (options, success, response) {
				if (callback) {
					callback.call(this, success, response);
				} else {
					if (!success) {
						this.showError("Command {" + commandName + ", " + path + "} was not successful.");
					}
				}
			}
		});
	}
});

CQ.Ext.reg("vdseditor", GM.vds.VDSEditor);

GM.vds.VDSEditor.readVDSProperty = function (record, propertyName) {
	var vdsContent = record["vds:content"];
	if (vdsContent) {
		return vdsContent[propertyName];
	}
	return record[propertyName];
};

GM.vds.VDSEditor.getParentVDSPath = function (vdsPath) {
	var vdsPathParts = vdsPath.split("/");
	return vdsPathParts.slice(0, vdsPathParts.length - 1).join("/");
};

GM.vds.VDSEditor.parseVDSContextPath = function (vdsPath) {
	var vdsPathParts = vdsPath.split("/");
	if (vdsPathParts.length > 3) {
		return vdsPathParts.slice(0, 3).join("/");
	}
	return "";
};

GM.vds.VDSEditor.parseVDSObjectPath = function (vdsPath) {
	var vdsPathParts = vdsPath.split("/");
	if (vdsPathParts.length > 3) {
		return vdsPathParts.slice(3).join("/");
	}
	return "";
};

GM.vds.VDSEditor.getNodeTypeInSequence = function (initialNodeType, displacement) {
	var typeSequence = ["vds:Brand", "vds:Region", "vds:Language", "vds:Year", "vds:ModelFamily", "vds:Model", "vds:Trim", "vds:Features", "vds:Feature", "vds:regionalIncentives", "vds:regionalIncentive"];
	
	var index = typeSequence.indexOf(initialNodeType);
	if (index >= 0) {
		return typeSequence[index + 1];
	}
	return null;
}

GM.vds.VDSEditor.pickDialogConfig = function (editor, record) {
	switch (record.data["jcr:primaryType"]) {
		case "vds:Brand":
			return GM.vds.VDSEditor.getBrandDialogConfig.call(editor);
		case "vds:Region":
			return GM.vds.VDSEditor.getRegionDialogConfig.call(editor);
		case "vds:Language":
			return GM.vds.VDSEditor.getLanguageDialogConfig.call(editor);
		case "vds:Year":
			return GM.vds.VDSEditor.getYearDialogConfig.call(editor);
		case "vds:ModelFamily":
			return GM.vds.VDSEditor.getModelFamilyDialogConfig.call(editor);
		case "vds:Model":
			return GM.vds.VDSEditor.getModelDialogConfig.call(editor);
		case "vds:Trim":
			return GM.vds.VDSEditor.getTrimDialogConfig.call(editor);
		case "vds:Feature":
			return GM.vds.VDSEditor.getFeatureDefDialogConfig.call(editor);
		case "vds:regionalIncentive":
			return GM.vds.VDSEditor.getRegionalIncentiveDefDialogConfig.call(editor);
	}
	return null;
};

GM.vds.VDSEditor.handleEditFeatures = function(editor, record) {
	var featuresRepoPath = record.id;
	var featureDefsRepoPath = editor.getFeatureDefsRepoPath(featuresRepoPath);
	editor.mask();
	CQ.Ext.Ajax.request({
		"url": featureDefsRepoPath + ".list.json",
		"scope": this,
		callback: function (options, success, response) {
			var items = [];
			var obj = JSON.parse(response.responseText);
			for(var key in obj["children"]) {
				var feature = obj["children"][key];
				if(feature["jcr:primaryType"]=="vds:Feature") {
					var code = feature["vds:content"]["code"];
					var description = feature["vds:content"]["description"];
					items.push({"xtype": "overridefield", "name": code, "fieldLabel": description + " (" + code + ")"});
				}
			}
			var config = GM.vds.VDSEditor.getFeaturesDialogConfig.call(this, items);
			GM.vds.VDSEditor.showEditFeaturesDialog.call(this, editor, record, config);
		}
	});
}

GM.vds.VDSEditor.showEditFeaturesDialog = function(editor, record, config) {
	editor.mask();

	var recordRepoPath = record.id;
	var recordVDSPath = editor.getRelativeVDSPath(recordRepoPath);
	config.params["path"] = recordVDSPath;

	var dialog = editor.createDialog(config);
	dialog.loadContent(record.id.replace('#', '%23'), ".1.json");

	dialog.on("beforeshow", function (thisDialog) {
		editor.unmask();
	});
	dialog.on("loadcontent", function (thisDialog, records, opts, success) {
		if (success) {
			dialog.show();
		}
	});
}

GM.vds.VDSEditor.handleEditRegionalIncentives = function(editor, record) {
	var regionaIncentivesRepoPath = record.id;
	var regionalIncentiveDefsRepoPath = editor.getregionalIncentiveDefsRepoPath(regionaIncentivesRepoPath);
	editor.mask();
	CQ.Ext.Ajax.request({
		"url": regionalIncentiveDefsRepoPath + ".list.json",
		"scope": this,
		callback: function (options, success, response) {
			var items = [];
			var obj = JSON.parse(response.responseText);
			for(var key in obj["children"]) {
				var feature = obj["children"][key];
				if(feature["jcr:primaryType"]=="vds:regionalIncentive") {
					var code = feature["vds:content"]["code"];
					var description = feature["vds:content"]["description"];
					items.push({"xtype": "overridefield", "name": code, "fieldLabel": description + " (" + code + ")"});
				}
			}
			var config = GM.vds.VDSEditor.getRegionalIncentivesDialogConfig.call(this, items);
			GM.vds.VDSEditor.showEditRegionalIncentivesDialog.call(this, editor, record, config);
		}
	});
}

GM.vds.VDSEditor.showEditRegionalIncentivesDialog = function(editor, record, config) {
	editor.mask();

	var recordRepoPath = record.id;
	var recordVDSPath = editor.getRelativeVDSPath(recordRepoPath);
	config.params["path"] = recordVDSPath;

	var dialog = editor.createDialog(config);
	dialog.loadContent(record.id.replace('#', '%23'), ".1.json");

	dialog.on("beforeshow", function (thisDialog) {
		editor.unmask();
	});
	dialog.on("loadcontent", function (thisDialog, records, opts, success) {
		if (success) {
			dialog.show();
		}
	});
}

GM.vds.VDSEditor.pickNewDialogConfig = function (editor, nodeType) {
	var config = null;
	switch (nodeType) {
		case "vds:Brand":
			config = GM.vds.VDSEditor.getNewDialogConfig.call(editor);
			config["title"] = "Create New Brand Context";
			break;
		case "vds:Region":
			config = GM.vds.VDSEditor.getNewDialogConfig.call(editor);
			config["title"] = "Create New Region Context";
			break;
		case "vds:Language":
			config = GM.vds.VDSEditor.getNewDialogConfig.call(editor);
			config["title"] = "Create New Language Context";
			break;
		case "vds:Year":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Year Object";
			break;
		case "vds:ModelFamily":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Model Family Object";
			break;
		case "vds:Model":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Model Object";
			break;
		case "vds:Trim":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Trim Object";
			break;
		case "vds:Feature":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Feature Definition Object";
			break;
		case "vds:regionalIncentive":
			config = GM.vds.VDSEditor.getNewImportableDialogConfig.call(editor);
			config["title"] = "Create New Regional Incentive Definition Object";
			break;
	}

	return config;
};

GM.vds.VDSEditor.handleNew = function (editor) {
	return function () {
		var selectedParentTreeNode = editor.getSelectedTreeNode();
		
		var parentNodeType = selectedParentTreeNode.attributes["jcr:primaryType"];
		if(parentNodeType=="vds:FeatureValues") {
			editor.showError("Cannot create new objects here.");
			return;
		}
		
		var parentNodeType = selectedParentTreeNode.attributes["jcr:primaryType"];
		var newNodeType = parentNodeType ? GM.vds.VDSEditor.getNodeTypeInSequence(parentNodeType, 1) : "vds:Brand";

		if (!newNodeType) {
			editor.showError("Cannot create new objects here.");
			return;
		}

		var config = GM.vds.VDSEditor.pickNewDialogConfig(editor, newNodeType);

		var parentRepoPath = selectedParentTreeNode.getPath();
		var parentVDSPath = editor.getRelativeVDSPath(parentRepoPath);
		config.params["path"] = parentVDSPath;

		var dialog = editor.createDialog(config);
		dialog.show();
	};
};

GM.vds.VDSEditor.handleEdit = function (editor) {
	return function () {
		editor.mask();

		var record = editor.getSelectedGridRecord();

		//if(record.data["jcr:primaryType"]=="vds:FeatureValues") {
		//	GM.vds.VDSEditor.handleEditFeatures(editor, record);
		//} else 
		if(record.data["jcr:primaryType"]=="vds:Features") {
			var selectedParentTreeNode = editor.getSelectedTreeNode();
			
			var parentNodeType = selectedParentTreeNode.attributes["jcr:primaryType"];
			if(parentNodeType=="vds:Model") {
				editor.showError("Cannot edit this object.");
				editor.unmask();
				return;
			}

			GM.vds.VDSEditor.handleEditFeatures(editor, record);
			
			//editor.showError("Cannot edit this object.");
			//editor.unmask();
		} else if (record.data["jcr:primaryType"]=="vds:regionalIncentives") {
			editor.showError("Cannot edit this object.");
			editor.unmask();
			return;
		}
		else {
			var config = GM.vds.VDSEditor.pickDialogConfig(editor, record);
	
			var recordRepoPath = record.id;
			var recordVDSPath = editor.getRelativeVDSPath(recordRepoPath);
			config.params["path"] = recordVDSPath;
	
			var dialog = editor.createDialog(config);
			dialog.loadContent(record.id.replace('#', '%23'), ".1.json");
	
			dialog.on("beforeshow", function (thisDialog) {
				editor.unmask();
			});
			dialog.on("loadcontent", function (thisDialog, records, opts, success) {
				if (success) {
					dialog.show();
				}
			});
		}
	};
};

GM.vds.VDSEditor.handleUpdate = function (editor) {
	return function () {
		var record = editor.getSelectedGridRecord();

		var config = GM.vds.VDSEditor.getUpdateImportableDialogConfig.call(editor);

		config.params["path"] = record.data["vdsParentPath"];
		config.params["nodeName"] = record.data["jcr:name"];

		var dialog = editor.createDialog(config);
		dialog.show();
	};
};

GM.vds.VDSEditor.handleUpdateSpreadsheet = function (editor) {
	return function () {
		var record = editor.getSelectedGridRecord();

		var config = GM.vds.VDSEditor.getUpdateSpreadsheetImportableDialogConfig.call(editor);

		config.params["path"] = record.data["vdsParentPath"];
		config.params["nodeName"] = record.data["jcr:name"];

		var dialog = editor.createDialog(config);
		dialog.show();
	};
};


GM.vds.VDSEditor.handleCopy = function (editor) { 
	return function () {
		var record = editor.getSelectedGridRecord();

		var config = GM.vds.VDSEditor.getCopyDialogConfig.call(editor);

		config.params["path"] = record.data["vdsPath"];

		var dialog = editor.createDialog(config);
		dialog.show();
	};
};

GM.vds.VDSEditor.handleDelete = function (editor) {
	return function () {
		var record = editor.getSelectedGridRecord();
		var vdsPath = record.data["vdsPath"];

		var doDelete = function () {
			editor.mask();
			editor.executeCommand(
				"delete",
				vdsPath,
				{},
				function (success, response) {
					this.unmask();
					if (success) {
						this.reloadTree();
					} else {
						this.showError("Delete was unsuccessful.");
					}
				}
			);
		};

		CQ.Ext.Msg.confirm(
			"Confirm Delete",
			"Are you sure you want to delete [" + vdsPath + "]?",
			function (button) {
				if (button == "yes") {
					doDelete();
				}
			}
		);
	};
};

GM.vds.VDSEditor.handleReorder = function (editor, reorderUp) {
	return function () {
		var record = editor.getSelectedGridRecord();
		var vdsParentPath = record.data["vdsParentPath"];
		var sourceNodeName = record.data["jcr:name"];

		var gridStore = editor.getGridStore();
		var sourceRecordIndex = gridStore.indexOf(record);
		if (sourceRecordIndex == -1) {
			return;
		}

		var destinationRecordIndex = sourceRecordIndex + (reorderUp ? -1 : 2);
		if (destinationRecordIndex < 0 || destinationRecordIndex > gridStore.getCount()) {
			return;
		}

		var destinationNodeName = "";
		if (destinationRecordIndex < gridStore.getCount()) {
			var destinationRecord = gridStore.getAt(destinationRecordIndex);
			destinationNodeName = destinationRecord.data["jcr:name"];
		}

		editor.mask();
		editor.executeCommand(
			"reorder",
			vdsParentPath,
			{
				"sourceNodeName": sourceNodeName,
				"destinationNodeName": destinationNodeName
			},
			function (success, response) {
				editor.unmask();
				if (success) {
					this.reloadTree();
				} else {
					this.showError("Reordering failed.");
				}
			}
		);
	};
};

GM.vds.VDSEditor.handleReplicate = function (editor, replicationType, recursive) {
	return function () {
		var record = editor.getSelectedGridRecord();
		var vdsPath = record.data["vdsPath"];

		var doReplicate = function () {
			editor.mask();
			editor.executeCommand(
				"replicate",
				vdsPath,
				{
					"replicationType": replicationType,
					"recursive": recursive
				},
				function (success, response) {
					editor.unmask();
					if (success) {
						this.reloadTree();
					} else {
						this.showError("Replication failed or exceeded timeout limit of thirty minutes! Please examine server logs.");
					}
				}
			);
		};

		if (recursive) {
			CQ.Ext.Msg.confirm(
				"Confirm Tree Activation",
				"Are you sure you want to tree activate [" + vdsPath + "]?",
				function (button) {
					if (button == "yes") {
						doReplicate();
					}
				}
			);
		} else {
			doReplicate();
		}
	};
};

GM.vds.VDSEditor.handleInitialize = function (editor) {
	return function () {
		editor.mask();
		editor.executeCommand(
			"status",
			"",
			{},
			function (success, response) {
				editor.unmask();
				if (success) {
					window.location.reload();
				} else {
					this.showError("Initialization failed! Please examine server logs.");
				}
			}
		);
	};
};

GM.vds.VDSEditor.handleShowStatus = function (editor) {
	return function () {
		var iframeWindow = new CQ.Ext.Window({
			"title": "VDS Status",
			"renderTo": "cq-vdseditor-ui",
			"width": 600,
			"height": 400,
			"layout": "fit",
			"items": [
				{
					"xtype": "iframepanel",
					"url": GM.vds.VDSEditor.VDS_COMMAND_URL + "?cmd=status&path="
				}
			]
		});
		iframeWindow.show();
	};
};

GM.vds.VDSEditor.hasGridSelection = function (editor) {
	return function () {
		return !!editor.getSelectedGridRecord();
	}
};

GM.vds.VDSEditor.hasUpdatableGridSelection = function (editor) {
	return function () {
		var record = editor.getSelectedGridRecord();
		switch (record.data["jcr:primaryType"]) {
			case "vds:Year":
			case "vds:ModelFamily":
			case "vds:Model":
			case "vds:Trim":
			case "vds:Features":
			case "vds:regionalIncentive":
				return true;
		}
		return false;
	}
};

GM.vds.VDSEditor.VDS_COMMAND_URL = "/bin/vdscommand";
GM.vds.form.OverrideField = CQ.Ext.extend(CQ.form.CompositeField, {
	"vdsImportedNodeName": "",
	"vdsAuthoredNodeName": "",

	"importedContentField": null,
	"overrideContentField": null,
	"overrideCheckbox": null,

	constructor: function (config) {
		var overrideField = this;

		CQ.Util.applyDefaults(config, {
			"vdsImportedNodeName": "vds:imported",
			"vdsAuthoredNodeName": "vds:authored",
			"vdsEditPropertyPrefix": "edit:",

			"border": false,
		});

		overrideField.vdsImportedNodeName = config.vdsImportedNodeName;
		overrideField.vdsAuthoredNodeName = config.vdsAuthoredNodeName;

		overrideField.importedContentField = new CQ.Ext.form.TextField({
			"ignoreData": true,
			"submitValue": false,
			"readOnly": true,
			"columnWidth": 1
		});

		overrideField.authoredContentField = new CQ.Ext.form.TextField({
			"name": config.vdsEditPropertyPrefix + config.name,
			"disabled": true,
			"columnWidth": 1
		});

		overrideField.overrideCheckbox = new CQ.Ext.form.Checkbox({
			"submitValue": false,
			"checked": false,
			"listeners": {
				check: function (checkbox, checked) {
					overrideField.authoredContentField.setDisabled(!checked);
					if (checked) {
						overrideField.authoredContentField.focus();
					}
				}
			}
		});

		config.items = [
			{
				"xtype": "panel",
				"layout": "column",
				"border": false,
				"items": [
					{
						"xtype": "panel",
						"layout": "anchor",
						"columnWidth": 0.5,
						"padding": "0 2px 0 0",
						"border": false,
						"items": [
							{
								"xtype": "label",
								"text": "Imported",
								"anchor": "100%",
								"style": {
									"fontSize": "11px"
								}
							},
							{
								"xtype": "panel",
								"anchor": "100%",
								"layout": "column",
								"border": false,
								"items": [
									overrideField.importedContentField
								]
							}
						]
					},
					{
						"xtype": "panel",
						"layout": "anchor",
						"columnWidth": 0.5,
						"padding": "0 0 0 2px",
						"border": false,
						"items": [
							{
								"xtype": "label",
								"text": "Override",
								"anchor": "100%",
								"style": {
									"fontSize": "11px"
								}
							},
							{
								"xtype": "panel",
								"anchor": "100%",
								"layout": "column",
								"border": false,
								"items": [
									overrideField.authoredContentField,
									overrideField.overrideCheckbox
								]
							}
						]
					}
				]
			}
		];

		GM.vds.form.OverrideField.superclass.constructor.call(this, config);
	},

	initComponent: function () {
		GM.vds.form.OverrideField.superclass.initComponent.call(this);
	},

	processRecord: function (record, path) {
		if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
			var importedValue = record.get(this.vdsImportedNodeName + "/" + this.getName());
			var authoredValue = record.get(this.vdsAuthoredNodeName + "/" + this.getName());

			this.setValue(importedValue, authoredValue);

			this.fireEvent('loadcontent', this, record, path);
		}
	},

	setValue: function (importedValue, authoredValue) {
		this.importedContentField.setValue(importedValue);

		if (authoredValue !== undefined) {
			this.overrideCheckbox.setValue(true);
			this.authoredContentField.setValue(authoredValue);
		} else {
			this.overrideCheckbox.setValue(false);
			this.authoredContentField.setDisabled(true);
		}
	}
});

CQ.Ext.reg("overridefield", GM.vds.form.OverrideField);
GM.vds.form.VDSAuthoredField = CQ.Ext.extend(CQ.Ext.form.TextField, {
	"vdsAuthoredNodeName": "",
	"vdsPropertyName": "",

	constructor: function (config) {
		var thisField = this;

		CQ.Util.applyDefaults(config, {
			"vdsAuthoredNodeName": "vds:authored",
			"vdsEditPropertyPrefix": "edit:",
		});

		thisField.vdsAuthoredNodeName = config.vdsAuthoredNodeName;
		thisField.vdsPropertyName = config.name;

		config.name = config.vdsEditPropertyPrefix + thisField.vdsPropertyName,

		GM.vds.form.VDSAuthoredField.superclass.constructor.call(this, config);
	},

	initComponent: function () {
		GM.vds.form.VDSAuthoredField.superclass.initComponent.call(this);
	},

	processRecord: function (record, path) {
		if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
			var authoredValue = record.get(this.vdsAuthoredNodeName + "/" + this.vdsPropertyName);

			this.setValue(authoredValue);

			this.fireEvent('loadcontent', this, record, path);
		}
	},
});

CQ.Ext.reg("vdsauthoredfield", GM.vds.form.VDSAuthoredField);
//// As a merge of VDSAuthoredField and VDSPathField. Could possibly inherit or use a Util.
GM.vds.form.VDSAuthoredPathField = CQ.Ext.extend(CQ.form.PathField, {
	"vdsAuthoredNodeName": "",
	"vdsPropertyName": "",
	"vdsRootPath": "",
	constructor: function (config) {
		var thisField = this;

		CQ.Util.applyDefaults(config, {
			"vdsAuthoredNodeName": "vds:authored",
			"vdsEditPropertyPrefix": "edit:",
		});
		// Get the VDS root path.
		thisField.vdsRootPath = thisField.getVDSRoot();

		// Customize the pathfield config.
		config.rootPath = "/content";
		config.rootTitle = "Content";
		thisField.vdsAuthoredNodeName = config.vdsAuthoredNodeName;
		thisField.vdsPropertyName = config.name;

		config.name = config.vdsEditPropertyPrefix + thisField.vdsPropertyName,

		GM.vds.form.VDSAuthoredPathField.superclass.constructor.call(this, config);
	},

	initComponent: function () {
		GM.vds.form.VDSAuthoredPathField.superclass.initComponent.call(this);
	},

	processRecord: function (record, path) {
		if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
			var authoredValue = record.get(this.vdsAuthoredNodeName + "/" + this.vdsPropertyName);

			this.setValue(authoredValue);

			this.fireEvent('loadcontent', this, record, path);
		}
	},
	getValue: function () {
		// Translate from VDS path to repository path.
		var vdsPath = GM.vds.form.VDSAuthoredPathField.superclass.getValue.call(this);
		var repositoryPath = this.translateVDSPathToRepository(vdsPath);

		return repositoryPath;
	},

	setValue: function (value) {
		// Translate from repository path to VDS path.
		var repositoryPath = value;
		var vdsPath = this.translateRepositoryPathToVDS(repositoryPath);
		
		GM.vds.form.VDSAuthoredPathField.superclass.setValue.call(this, vdsPath);
	},

	translateVDSPathToRepository: function (vdsPath) {
		return this.vdsRootPath + "/" + vdsPath;
	},

	translateRepositoryPathToVDS: function (repositoryPath) {
		if (repositoryPath == this.vdsRootPath) {
			return "";
		}

		return repositoryPath.replace(this.vdsRootPath + "/", "");
	},

	getVDSRoot: function () {
		// TODO: We should do this with an AJAX call to the command serlvet.
		return "/data/vds";
	}
});

CQ.Ext.reg("vdsauthoredpathfield", GM.vds.form.VDSAuthoredPathField);
//// As a merge of VDSAuthoredField and VDSPathField. Could possibly inherit or use a Util.
GM.vds.form.VDSAuthoredVDSPathField = CQ.Ext.extend(CQ.form.PathField, {
	"vdsAuthoredNodeName": "",
	"vdsPropertyName": "",
	"vdsRootPath": "",
	constructor: function (config) {
		var thisField = this;

		CQ.Util.applyDefaults(config, {
			"vdsAuthoredNodeName": "vds:authored",
			"vdsEditPropertyPrefix": "edit:",
		});
		// Get the VDS root path.
		thisField.vdsRootPath = thisField.getVDSRoot();

		// Customize the pathfield config.
		config.rootPath = thisField.vdsRootPath;
		config.rootTitle = "VDS";
		thisField.vdsAuthoredNodeName = config.vdsAuthoredNodeName;
		thisField.vdsPropertyName = config.name;

		config.name = config.vdsEditPropertyPrefix + thisField.vdsPropertyName,

		GM.vds.form.VDSAuthoredVDSPathField.superclass.constructor.call(this, config);
	},

	initComponent: function () {
		GM.vds.form.VDSAuthoredVDSPathField.superclass.initComponent.call(this);
	},

	processRecord: function (record, path) {
		if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
			var authoredValue = record.get(this.vdsAuthoredNodeName + "/" + this.vdsPropertyName);

			this.setValue(authoredValue);

			this.fireEvent('loadcontent', this, record, path);
		}
	},
	getValue: function () {
		// Translate from VDS path to repository path.
		var vdsPath = GM.vds.form.VDSAuthoredVDSPathField.superclass.getValue.call(this);
		var repositoryPath = this.translateVDSPathToRepository(vdsPath);

		return repositoryPath;
	},

	setValue: function (value) {
		// Translate from repository path to VDS path.
		var repositoryPath = value;
		var vdsPath = this.translateRepositoryPathToVDS(repositoryPath);
		
		GM.vds.form.VDSAuthoredVDSPathField.superclass.setValue.call(this, vdsPath);
	},

	translateVDSPathToRepository: function (vdsPath) {
		return this.vdsRootPath + "/" + vdsPath;
	},

	translateRepositoryPathToVDS: function (repositoryPath) {
		if (repositoryPath == this.vdsRootPath) {
			return "";
		}

		return repositoryPath.replace(this.vdsRootPath + "/", "");
	},

	getVDSRoot: function () {
		// TODO: We should do this with an AJAX call to the command serlvet.
		return "/data/vds";
	}
});

CQ.Ext.reg("vdsauthoredvdspathfield", GM.vds.form.VDSAuthoredVDSPathField);
GM.vds.VDSEditor.baseDialogConfig = {
	"xtype": "dialog",
	"buttons": CQ.Dialog.OKCANCEL,
	"okText": "Save",
	"params": {
		"_charset_": "utf-8"
	}
};
GM.vds.VDSEditor.getNewDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"okText": "Create",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "new"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "nodeName",
					"fieldLabel": "Code",
					"fieldDescription": "Enter a code to identify the new node.",
					"allowBlank": false
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getNewImportableDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"okText": "Create",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "new"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "nodeName",
					"fieldLabel": "Code",
					"fieldDescription": "Enter a code to identify the new node.",
					"allowBlank": false
				},
				{
					"xtype": "checkbox",
					"name": "attemptImport",
					"fieldLabel": "Import from feed?",
					"fieldDescription": "Select this to attempt to create the node by importing feed data.",
					"inputValue": "true",
					"checked": false
				},
				
				// add import features flag
				{
					"xtype": "checkbox",
					"name": "importFeatures",
					"fieldLabel": "Import Features?",
					"fieldDescription": "Select this to include features in the imported data.",
					"inputValue": "true",
					"checked": false
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getUpdateImportableDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Tree Update",
		"okText": "Update",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "import"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "checkbox",
					"name": "importFeatures",
					"fieldLabel": "Import Features?",
					"fieldDescription": "Select this to include features in the imported data.",
					"inputValue": "true",
					"checked": false
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getUpdateSpreadsheetImportableDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Tree Update XLS",
		"okText": "Update",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "importSpreadsheet"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "pathfield",
					"name": "assetPath",
					"rootPath": "/content/dam",
					"fieldLabel": "Asset Path",
					"fieldDescription": "Enter location in DAM of spreadsheet to import.",
					"allowBlank": false
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getBrandDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Brand Configuration",
		"params": {
			"jcr:lastModified": "",
			"jcr:lastModifiedBy": ""
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "jcr:title",
					"fieldLabel": "Title"
				},
				{
					"xtype": "textfield",
					"name": "jcr:description",
					"fieldLabel": "Description"
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getRegionDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Region Configuration",
		"params": {
			"jcr:lastModified": "",
			"jcr:lastModifiedBy": ""
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "jcr:title",
					"fieldLabel": "Title"
				},
				{
					"xtype": "textfield",
					"name": "jcr:description",
					"fieldLabel": "Description"
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getLanguageDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Language Configuration",
		"params": {
			"jcr:lastModified": "",
			"jcr:lastModifiedBy": ""
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "jcr:title",
					"fieldLabel": "Title"
				},
				{
					"xtype": "textfield",
					"name": "jcr:description",
					"fieldLabel": "Description"
				},
				{
					"xtype": "dialogfieldset",
					"collapsible": true,
					"collapsed": false,
					"title": "DAM Asset Link",
					"items": [
						{
							"xtype": "pathfield",
							"name": "vds:linkedDamPath",
							"rootPath": "/content/dam",
							"fieldLabel": "Linked DAM Path",
							"fieldDescription": "Choose a path in the DAM to link with this brand/region/language tree."
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"collapsible": true,
					"collapsed": false,
					"title": "DDP Import Settings",
					"items": [
						{
							"xtype": "textfield",
							"name": "vds:importBasePath",
							"fieldLabel": "Base DDP URL",
							"fieldDescription": "Enter the base URL to the DDP feed for this brand/region/language."
						},
						{
							"xtype": "textfield",
							"name": "vds:importUser",
							"fieldLabel": "DDP Username"
						},
						{
							"xtype": "textfield",
							"name": "vds:importPassword",
							"fieldLabel": "DDP Password"
						},
						{
							"xtype": "textfield",
							"name": "vds:cfdBasePath",
							"fieldLabel": "Base CFD URL",
							"fieldDescription": "Enter the base URL to the CFD (Consumer-Friendly Description) feed for this brand/region/language."
						},
						{
							"xtype": "selection",
							"type": "checkbox",
							"name": "vds:importVDSFeatureFormatV11",
							"fieldLabel": "Import To Feature Format 1.1",
							"fieldDescription": "If checked, the feature format of V1.1 will be used"
						},
						{
							"xtype": "selection",
							"type": "checkbox",
							"name": "vds:importVDSFeatureFormatV12",
							"fieldLabel": "Import To Feature Format 1.2",
							"fieldDescription": "If checked, the feature format of V1.2 will be used"
						},
						{
							"xtype": "selection",
							"type": "checkbox",
							"name": "vds:autoUpdate",
							"fieldLabel": "Enable auto update from market XML",
							"fieldDescription": "If checked, this branch will be included in auto update operation"
						},{
							"xtype": "textfield",
							"name": "vds:versionIdFormat",
							"fieldLabel": "Version Id format",
							"fieldDescription": "Enter the date format used in DDP data version Id. Leave blank to use default format (recommended)"
						},{
							"xtype": "textfield",
							"name": "vds:currentVersionId",
							"fieldLabel": "Current Version Id",
							"fieldDescription": "This shows the current data version Id if available",
							"disabled": true
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"collapsible": true,
					"collapsed": false,
					"title": "BYO Settings",
					"items": [
						{
							"xtype": "textfield",
							"name": "vds:byoBasePath",
							"fieldLabel": "BYO Base URL",
							"fieldDescription": "Enter the base URL to the MRM BYO service for this brand/region/language."
						},
						{
							"xtype": "textfield",
							"name": "vds:byoUser",
							"fieldLabel": "BYO Username"
						},
						{
							"xtype": "textfield",
							"name": "vds:byoPassword",
							"fieldLabel": "BYO Password"
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"collapsible": true,
					"collapsed": false,
					"title": "Canadian Location Switcher Text Values",
					"items": [
						{
							"fieldLabel": "Current Location Prefix",
							"xtype": "textfield",
							"name": "vds:current_location_prefix",
							"fieldDescription": "Text appearing before the current location (i.e. postal code)"
						},
						{
							"fieldLabel": "&#39;Change Location&#39; Link Text",
							"xtype": "textfield",
							"name": "vds:change_location_link_text",
							"fieldDescription": "Text used for the &#39;change location&#39; link"
						},
						{
							"fieldLabel": "Location Unknown",
							"xtype": "textfield",
							"name": "vds:location_unknown",
							"fieldDescription": "Text displayed when postal code can not be determined."
						},
						{
							"fieldLabel": "Change Location Placeholder Text",
							"xtype": "textfield",
							"name": "vds:change_location_placeholder_text",
							"fieldDescription": "Text displayed in the &#39;change location text box&#39; when it contains no value"
						},
                        {
                            "fieldLabel": "Postalcode Submit Button Text",
                            "xtype": "textfield",
                            "name": "vds:postalcode_submit_button_txt",
                            "fieldDescription": "Text displayed in the Submit button for postal code"
                        },
						{
							"fieldLabel": "Invalid Postal Code Message",
							"xtype": "textfield",
							"name": "vds:invalid_postal_code_mesg",
							"fieldDescription": "Text displayed below the &#39;change location text box&#39; when an invalid postal code is entered"
						},
						{
							"xtype": "textfield",
							"name": "vds:useLocationButtonText",
							"fieldLabel": "Use Location Button",
							"fieldDescription": "Text displayed on the Use Location button.",
							"defaultValue" : "Use Current Location"
						},
						{
							"xtype": "textfield",
							"name": "vds:geoPermissionDeniedText",
							"fieldLabel": "Geolocation Permission Denied Text",
							"fieldDescription": "Text to display when user denies permission for geolocation.",
							"defaultValue" : "Geolocation is turned off. Please turn it on before continuing."
						},
						{
							"xtype": "textfield",
							"name": "vds:geoLocationUnavailableText",
							"fieldLabel": "Geolocation Location Unavailable Text",
							"fieldDescription": "Text to display when location is unavailable.",
							"defaultValue" : "Location information is unavailable. Please fill in Zip Code to Continue."
						},
						{
							"xtype": "textfield",
							"name": "vds:geoTimeoutText",
							"fieldLabel": "Geolocation Timeout Text",
							"fieldDescription": "Text to display when the location service times out.",
							"defaultValue" : "The request to get your location has timed out. Please try again."
						},
						{
							"xtype": "textfield",
							"name": "vds:geoUnknownText",
							"fieldLabel": "Geolocation Unknown Error Text",
							"fieldDescription": "Text to display when an unknown error occurs.",
							"defaultValue" : "An unknown error occurred. Please try again."
						},
						{
							"xtype": "textfield",
							"name": "vds:geoNotSupportedText",
							"fieldLabel": "Geolocation Not Supported Text",
							"fieldDescription": "Text to display when geolocation is not supported.",
							"defaultValue" : "Geolocation is not supported on this Device."
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"collapsible": true,
					"collapsed": false,
					"title": "Regional Pricing Text Values",
					"items": [
						{
							"xtype": "textfield",
							"name": "vds:seeDealer",
							"fieldLabel": "See Dealer",
							"fieldDescription": "Enter the see dealer text for this brand/region/language."
						},
						{
							"xtype": "textfield",
							"name": "vds:seeDealerForDetails",
							"fieldLabel": "See Dealer For Details",
							"fieldDescription": "Enter the see dealer for details text for this brand/region/language"
						},
						{
							"fieldLabel": "National Fee Text",
							"xtype": "textfield",
							"name": "vds:national_fee_text",
							"fieldDescription": "The National fee disclaimer text (e.g. Includes A/C Tax)"
						},
						{
							"fieldLabel": "National Fee Text with Freight",
							"xtype": "textfield",
							"name": "vds:national_fee_text_with_freight",
							"fieldDescription": "The National fee disclaimer text with Freight (e.g. Includes Freight and A/C Tax)"
						},
						{
							"fieldLabel": "Quebec Fee Text",
							"xtype": "textfield",
							"name": "vds:quebec_fee_text",
							"fieldDescription": "The Quebec fee disclaimer text (e.g. Includes Freight and Dealer Fees"
						},
						{
							"fieldLabel": "Quebec Fee With A/C Text",
							"xtype": "textfield",
							"name": "vds:quebec_fee_with_ac__text",
							"fieldDescription": "The Quebec fee with A/C disclaimer text (e.g. Includes Freight, A/C Tax, and Dealer Fees"
						},
						{
							"fieldLabel": "Cash Credit Title",
							"xtype": "textfield",
							"name": "vds:cash_credit_title",
							"fieldDescription": "Text Title of the Cash Credit Vehicle Attribute Teaser"
						},
						{
							"fieldLabel": "Cash Credit Prefix",
							"xtype": "textfield",
							"name": "vds:cash_credit_prefix",
							"fieldDescription": "Text proceeding the cash credit (single) value"
						},
						{
							"fieldLabel": "Cash Credit Suffix",
							"xtype": "textfield",
							"name": "vds:cash_credit_suffix",
							"fieldDescription": "Text following the cash credit (single) value"
						},
						{
							"fieldLabel": "Cash Credit Range Prefix",
							"xtype": "textfield",
							"name": "vds:cash_credit_range_prefix",
							"fieldDescription": "Text proceeding the cash credit value range"
						},
						{
							"fieldLabel": "Text following the cash credit value range",
							"xtype": "textfield",
							"name": "vds:cash_credit_range_suffix",
							"fieldDescription": "Text following the cash credit value range"
						},
						{
							"fieldLabel": "Cash Credit Range Conjunction",
							"xtype": "textfield",
							"name": "vds:cash_credit_range_conjunction",
							"fieldDescription": "Conjunction used when there is a cash credit range"
						},
						{
							"fieldLabel": "Cash Credit Range (from zero) Prefix",
							"xtype": "textfield",
							"name": "vds:cash_credit_range_starting_at_zero_prefix",
							"fieldDescription": "Text proceeding the cash credit value range when it starts from zero"
						},
						{
							"fieldLabel": "Cash Credit Range (from zero) Suffix",
							"xtype": "textfield",
							"name": "vds:cash_credit_range_starting_at_zero_suffix",
							"fieldDescription": "Text following the cash credit value range when it starts from zero"
						},
						{
							"fieldLabel": "&#39;Includes Owner Cash&#39; Label",
							"xtype": "textfield",
							"name": "vds:includes_owner_cash",
							"fieldDescription": "Label used for the &#39;includes owner cash&#39; disclaimer"
						},
						{
							"fieldLabel": "&#39;Includes Owner Cash&#39; Details Link Text",
							"xtype": "textfield",
							"name": "vds:includes_owner_cash_details_link_text",
							"fieldDescription": "Text used for the &#39;includes owner cash&#39; disclaimer details link"
						},
						{
							"fieldLabel": "&#39;Includes Owner Cash&#39; Details Link",
							"xtype": "pathfield",
							"name": "vds:includes_owner_cash_details_link",
							"fieldDescription": "Link to the &#39;includes owner cash&#39; disclaimer details"
						},
						{
							"fieldLabel": "MSRP Disclaimer Text",
							"xtype": "richtext",
							"rtePlugins": [{
								"table": {
									"primaryType": "nt:unstructured",
									"features": "*"
								}
							},
								{
									"format": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"lists": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"justify": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"edit": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"findreplace": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"paraformat": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"subsuperscript": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"misctools": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"styles": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"links": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								}
							],
							"name": "vds:msrp_disclaimer_text",
							"fieldDescription": "The MSRP Disclaimer Text"
						},
						{
							"fieldLabel": "MSRP Disclaimer Symbol",
							"xtype": "textfield",
							"name": "vds:msrp_disclaimer_symbol",
							"fieldDescription": "The MSRP Disclaimer Symbol"
						},
						{
							"fieldLabel": "Cash Credit Disclaimer Text",
							"xtype": "richtext",
							"rtePlugins": [{
								"table": {
									"primaryType": "nt:unstructured",
									"features": "*"
								}
							},
								{
									"format": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"lists": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"justify": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"edit": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"findreplace": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"paraformat": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"subsuperscript": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"misctools": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"styles": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"links": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								}
							],
							"name": "vds:cash_credit_disclaimer_text",
							"fieldDescription": "The Cash Credit Disclaimer Text"
						},
						{
							"fieldLabel": "Cash Credit Disclaimer Symbol",
							"xtype": "textfield",
							"name": "vds:cash_credit_disclaimer_symbol",
							"fieldDescription": "The Cash Credit Disclaimer Symbol"
						},
						{
							"fieldLabel": "National Pricing Disclaimer Text",
							"xtype": "richtext",
							"rtePlugins": [{
								"table": {
									"primaryType": "nt:unstructured",
									"features": "*"
								}
							},
								{
									"format": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"lists": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"justify": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"edit": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"findreplace": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"paraformat": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"subsuperscript": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"misctools": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"styles": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"links": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								}
							],
							"name": "vds:national_pricing_disclaimer_text",
							"fieldDescription": "The National Pricing Disclaimer Text"
						},
						{
							"fieldLabel": "National Pricing Disclaimer Symbol",
							"xtype": "textfield",
							"name": "vds:national_pricing_disclaimer_symbol",
							"fieldDescription": "The National Pricing Disclaimer Symbol"
						},
						{
							"fieldLabel": "National Pricing with Freight Disclaimer Text",
							"xtype": "richtext",
							"rtePlugins": [{
								"table": {
									"primaryType": "nt:unstructured",
									"features": "*"
								}
							},
								{
									"format": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"lists": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"justify": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"edit": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"findreplace": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"paraformat": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"subsuperscript": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"misctools": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"styles": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"links": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								}
							],
							"name": "vds:national_pricing_with_freight_disclaimer_text",
							"fieldDescription": "The National Pricing with Freight Disclaimer Text"
						},
						{
							"fieldLabel": "National Pricing with Freight Disclaimer Symbol",
							"xtype": "textfield",
							"name": "vds:national_pricing_with_freight_disclaimer_symbol",
							"fieldDescription": "The National Pricing with Freight Disclaimer Symbol"
						},
						{
							"fieldLabel": "Quebec Pricing Disclaimer Text",
							"xtype": "richtext",
							"rtePlugins": [{
								"table": {
									"primaryType": "nt:unstructured",
									"features": "*"
									}
								},
								{
									"format": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"lists": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"justify": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"edit": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"findreplace": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"paraformat": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"subsuperscript": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"misctools": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"styles": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								},
								{
									"links": {
										"primaryType": "nt:unstructured",
										"features": "*"
									}
								}
							],
							"name": "vds:Quebec_pricing_disclaimer_text",
							"fieldDescription": "The Quebec Pricing Disclaimer Text"
						},
						{
							"fieldLabel": "Quebec Pricing Disclaimer Symbol",
							"xtype": "textfield",
							"name": "vds:Quebec_pricing_disclaimer_symbol",
							"fieldDescription": "The Quebec Pricing Disclaimer Symbol"
						},
						{
							"xtype": "pathfield",
							"name": "vds:compcompLink",
							"rootPath": "/content",
							"fieldLabel": "Linked Competitive Compare Page",
							"fieldDescription": "Choose the path to the Competitive Compare Page."
						},
						{
							"xtype": "pathfield",
							"name": "vds:currentOffersLink",
							"rootPath": "/content",
							"fieldLabel": "Linked Current Offers Page",
							"fieldDescription": "Choose the path to the Current Offers Page."
						},
						{
							"xtype": "pathfield",
							"name": "vds:locateAVehicle",
							"rootPath": "/content",
							"fieldLabel": "Linked Locate A Vehicle Page",
							"fieldDescription": "Choose the path to the Locate A Vehicle Page."
						},
						{
							"xtype": "pathfield",
							"name": "vds:locateADealer",
							"rootPath": "/content",
							"fieldLabel": "Linked Locate A Dealer Page",
							"fieldDescription": "Choose the path to the Locate A Dealer Page."
						}
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getYearDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Year Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				//
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getModelFamilyDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Model Family Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": [
						// From DDP market, model family level.
						{
							"xtype": "overridefield",
							"name": "jcr:title",
							"fieldLabel": "Title"
						},
						{
							"xtype": "overridefield",
							"name": "modelYear",
							"fieldLabel": "Model Year"
						},
						// featureGroup
						{
							"xtype": "overridefield",
							"name": "formattedAcTax",
							"fieldLabel": "Formatted A/C Tax"
						},
						{
							"xtype": "overridefield",
							"name": "formattedFreightCharge",
							"fieldLabel": "Formatted Freight Charge"
						},
						{
							"xtype": "overridefield",
							"name": "formattedPrice",
							"fieldLabel": "Formatted Price"
						},
						{
							"xtype": "overridefield",
							"name": "asShownPrice",
							"fieldLabel": "'As Shown' Price"
						},
						{
							"xtype": "overridefield",
							"name": "formattedTotalPrice",
							"fieldLabel": "Formatted Total Price"
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"title": "Attributes",
					"items": [
						// From DDP attributes, model level.
						{
							"xtype": "vdsauthoredfield",
							"name": "maxTorque",
							"fieldLabel": "Max Torque"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "maxHorsepower",
							"fieldLabel": "Max Horsepower"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "maxTowing",
							"fieldLabel": "Max Towing"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fuelEconomyCity",
							"fieldLabel": "Fuel Economy City"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fuelEconomyHighway",
							"fieldLabel": "Fuel Economy Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rangeCity",
							"fieldLabel": "Range City"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rangeHighway",
							"fieldLabel": "Range Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "segment",
							"fieldLabel": "Segment"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "transmission",
							"fieldLabel": "Transmission"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineType",
							"fieldLabel": "Engine Type"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "suspensionRear",
							"fieldLabel": "Suspension Rear"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "suspensionFront",
							"fieldLabel": "Suspension Front"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "emissions",
							"fieldLabel": "Emissions"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "passengerCapacity",
							"fieldLabel": "Passenger Capacity"
						},

						// Custom VDS attributes.
						{
							"xtype": "vdsauthoredfield",
							"name": "starSafety",
							"fieldLabel": "Star Safety Rating"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "airbags",
							"fieldLabel": "Airbags"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "testTrack",
							"fieldLabel": "0-60 Time"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rearCamera",
							"fieldLabel": "Rear Camera"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "powertrainWarranty",
							"fieldLabel": "Powertrain Warranty"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "maxCargo",
							"fieldLabel": "Max Payload"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "cargo",
							"fieldLabel": "Cargo Volume"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV6",
							"fieldLabel": "Engine Type is V6"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV8",
							"fieldLabel": "Engine Type is V8"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeTurbo",
							"fieldLabel": "Engine Type is Turbo"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeHybrid",
							"fieldLabel": "Engine Type is Hybrid"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fuelEconomyCityHighway",
							"fieldLabel": "Fuel Economy City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rangeCityHighway",
							"fieldLabel": "Range City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "gasRange",
							"fieldLabel": "Gas Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "batteryRange",
							"fieldLabel": "Battery Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "totalRange",
							"fieldLabel": "Total Range"
						},
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getModelDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Model Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": [
						// From DDP market, model level.
						{
							"xtype": "overridefield",
							"name": "jcr:title",
							"fieldLabel": "Title"
						},
						// saleType
						{
							"xtype": "overridefield",
							"name": "formattedAcTax",
							"fieldLabel": "Formatted A/C Tax"
						},
						{
							"xtype": "overridefield",
							"name": "formattedFreightCharge",
							"fieldLabel": "Formatted Freight Charge"
						},
						{
							"xtype": "overridefield",
							"name": "formattedPrice",
							"fieldLabel": "Formatted Price"
						},
						{
							"xtype": "overridefield",
							"name": "asShownPrice",
							"fieldLabel": "'As Shown' Price"
						},
						{
							"xtype": "overridefield",
							"name": "formattedTotalPrice",
							"fieldLabel": "Formatted Total Price"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fvdIncentiveCodes",
							"fieldLabel": "FVD Incentive Codes"
						},
						{
							"xtype": "vdsauthoredvdspathfield",
							"name": "defaultTrimPath",
							"fieldLabel": "Default Trim Path"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "popularEngineDriveType",
							"fieldLabel": "Popular Engine"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "multiEngineDisclaimerNotation",
							"fieldLabel": "Multi Engine Disclaimer Notation"
						},
						{
							"xtype": "vdsauthoredpathfield",
							"name": "modelOverviewPath",
							"fieldLabel": "Model Overview Path"
						},
						{
							"xtype": "vdsauthoredpathfield",
							"name": "byoPath",
							"fieldLabel": "Build Your Own Path"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "vehicleSegment",
							"fieldLabel": "Vehicle Segment Label"
						}
					]
				},
				{
					"xtype": "dialogfieldset",
					"title": "Attributes",
					"items": [
						// From DDP attributes, model level.
						{
							"xtype": "overridefield",
							"name": "maxTorque",
							"fieldLabel": "Max Torque"
						},
						{
							"xtype": "overridefield",
							"name": "maxHorsepower",
							"fieldLabel": "Max Horsepower"
						},
						{
							"xtype": "overridefield",
							"name": "maxTowing",
							"fieldLabel": "Max Towing"
						},
						{
							"xtype": "overridefield",
							"name": "fuelEconomyCity",
							"fieldLabel": "Fuel Economy City"
						},
						{
							"xtype": "overridefield",
							"name": "fuelEconomyHighway",
							"fieldLabel": "Fuel Economy Highway"
						},
						{
							"xtype": "overridefield",
							"name": "rangeCity",
							"fieldLabel": "Range City"
						},
						{
							"xtype": "overridefield",
							"name": "rangeHighway",
							"fieldLabel": "Range Highway"
						},
						{
							"xtype": "overridefield",
							"name": "segment",
							"fieldLabel": "Segment"
						},
						{
							"xtype": "overridefield",
							"name": "transmission",
							"fieldLabel": "Transmission"
						},
						{
							"xtype": "overridefield",
							"name": "engineType",
							"fieldLabel": "Engine Type"
						},
						{
							"xtype": "overridefield",
							"name": "suspensionRear",
							"fieldLabel": "Suspension Rear"
						},
						{
							"xtype": "overridefield",
							"name": "suspensionFront",
							"fieldLabel": "Suspension Front"
						},
						{
							"xtype": "overridefield",
							"name": "emissions",
							"fieldLabel": "Emissions"
						},
						{
							"xtype": "overridefield",
							"name": "passengerCapacity",
							"fieldLabel": "Passenger Capacity"
						},

						// Custom VDS attributes.
						{
							"xtype": "vdsauthoredfield",
							"name": "starSafety",
							"fieldLabel": "Star Safety Rating"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "airbags",
							"fieldLabel": "Airbags"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "testTrack",
							"fieldLabel": "0-60 Time"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rearCamera",
							"fieldLabel": "Rear Camera"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "powertrainWarranty",
							"fieldLabel": "Powertrain Warranty"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "maxCargo",
							"fieldLabel": "Max Payload"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "cargo",
							"fieldLabel": "Cargo Volume"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV6",
							"fieldLabel": "Engine Type is V6"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV8",
							"fieldLabel": "Engine Type is V8"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeTurbo",
							"fieldLabel": "Engine Type is Turbo"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeHybrid",
							"fieldLabel": "Engine Type is Hybrid"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fuelEconomyCityHighway",
							"fieldLabel": "Fuel Economy City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rangeCityHighway",
							"fieldLabel": "Range City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "gasRange",
							"fieldLabel": "Gas Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "batteryRange",
							"fieldLabel": "Battery Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "totalRange",
							"fieldLabel": "Total Range"
						},
						{
							"xtype": "overridefield",
							"name": "fuelConsumptionExtraUrban",
							"fieldLabel": "Fuel Consumption Extra Urban"
						},
						{
							"xtype": "overridefield",
							"name": "fuelConsumptionUrban",
							"fieldLabel": "Fuel Consumption Urban"
						},
						{
							"xtype": "overridefield",
							"name": "acceleration",
							"fieldLabel": "Acceleration"
						},
						{
							"xtype": "overridefield",
							"name": "co2Emission",
							"fieldLabel": "CO2 Emission"
						},
						{
							"xtype": "overridefield",
							"name": "maxAllowableWeight",
							"fieldLabel": "Max Allowable Weight"
						},
						{
							"xtype": "overridefield",
							"name": "fuelConsumptionCombined",
							"fieldLabel": "Combined Fuel Consumption"
						},
						{
							"xtype": "overridefield",
							"name": "powerOutput",
							"fieldLabel": "Power Output"
						},
						{
							"xtype": "overridefield",
							"name": "loadSpaceSeatsUp",
							"fieldLabel": "Load Space With Seats Up"
						},
						{
							"xtype": "overridefield",
							"name": "maxTorqueRpm",
							"fieldLabel": "Max Torque RPM"
						},
						{
							"xtype": "overridefield",
							"name": "powerOutputRpm",
							"fieldLabel": "Max Power Output RPM"
						}
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getTrimDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Trim Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": [
						// From DDP market, trim level.
						{
							"xtype": "overridefield",
							"name": "jcr:title",
							"fieldLabel": "Title"
						},
						{
							"xtype": "overridefield",
							"name": "formattedAcTax",
							"fieldLabel": "Formatted A/C Tax"
						},
						{
							"xtype": "overridefield",
							"name": "formattedConfig",
							"fieldLabel": "Formatted Config"
						},
						{
							"xtype": "overridefield",
							"name": "configCab",
							"fieldLabel": "Config Cab"
						},
						{
							"xtype": "overridefield",
							"name": "configBox",
							"fieldLabel": "Config Box"
						},
						{
							"xtype": "overridefield",
							"name": "formattedFreightCharge",
							"fieldLabel": "Formatted Freight Charge"
						},
						{
							"xtype": "overridefield",
							"name": "formattedPrice",
							"fieldLabel": "Formatted Price"
						},
						{
							"xtype": "overridefield",
							"name": "asShownPrice",
							"fieldLabel": "'As Shown' Price"
						},
						{
							"xtype": "overridefield",
							"name": "formattedTotalPrice",
							"fieldLabel": "Formatted Total Price"
						},
						{
							"xtype": "overridefield",
							"name": "price",
							"fieldLabel": "Price"
						},
						{
							"xtype": "overridefield",
							"name": "formattedDrive",
							"fieldLabel": "Formatted Drive"
						},
						{
							"xtype": "overridefield",
							"name": "packagePricing",
							"fieldLabel": "Package Pricing"
						},
						{
							"xtype": "overridefield",
							"name": "configCode",
							"fieldLabel": "Config Code"
						},
						{
							"xtype": "overridefield",
							"name": "cheapestDriveType",
							"fieldLabel": "Cheapest Drive Type"
						},
						{
							"xtype": "overridefield",
							"name": "cheapestTrim",
							"fieldLabel": "Cheapest Trim"
						},
						{
							"xtype": "overridefield",
							"name": "exteriorColor",
							"fieldLabel": "Default Exterior Color"
						},
						{
							"xtype": "overridefield",
							"name": "interiorColor",
							"fieldLabel": "Default Interior Color"
						},
					]
				},
				{
					"xtype": "dialogfieldset",
					"title": "Attributes",
					"items": [
						// From DDP attributes, model level.
						{
							"xtype": "overridefield",
							"name": "maxTorque",
							"fieldLabel": "Max Torque"
						},
						{
							"xtype": "overridefield",
							"name": "maxHorsepower",
							"fieldLabel": "Max Horsepower"
						},
						{
							"xtype": "overridefield",
							"name": "maxTowing",
							"fieldLabel": "Max Towing"
						},
						{
							"xtype": "overridefield",
							"name": "fuelEconomyCity",
							"fieldLabel": "Fuel Economy City"
						},
						{
							"xtype": "overridefield",
							"name": "fuelEconomyHighway",
							"fieldLabel": "Fuel Economy Highway"
						},
						{
							"xtype": "overridefield",
							"name": "rangeCity",
							"fieldLabel": "Range City"
						},
						{
							"xtype": "overridefield",
							"name": "rangeHighway",
							"fieldLabel": "Range Highway"
						},
						{
							"xtype": "overridefield",
							"name": "segment",
							"fieldLabel": "Segment"
						},
						{
							"xtype": "overridefield",
							"name": "transmission",
							"fieldLabel": "Transmission"
						},
						{
							"xtype": "overridefield",
							"name": "engineType",
							"fieldLabel": "Engine Type"
						},
						{
							"xtype": "overridefield",
							"name": "suspensionRear",
							"fieldLabel": "Suspension Rear"
						},
						{
							"xtype": "overridefield",
							"name": "suspensionFront",
							"fieldLabel": "Suspension Front"
						},
						{
							"xtype": "overridefield",
							"name": "emissions",
							"fieldLabel": "Emissions"
						},
						{
							"xtype": "overridefield",
							"name": "passengerCapacity",
							"fieldLabel": "Passenger Capacity"
						},

						// Custom VDS attributes.
						{
							"xtype": "vdsauthoredfield",
							"name": "starSafety",
							"fieldLabel": "Star Safety Rating"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "airbags",
							"fieldLabel": "Airbags"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "testTrack",
							"fieldLabel": "0-60 Time"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rearCamera",
							"fieldLabel": "Rear Camera"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "powertrainWarranty",
							"fieldLabel": "Powertrain Warranty"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "maxCargo",
							"fieldLabel": "Max Payload"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "cargo",
							"fieldLabel": "Cargo Volume"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV6",
							"fieldLabel": "Engine Type is V6"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeV8",
							"fieldLabel": "Engine Type is V8"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeTurbo",
							"fieldLabel": "Engine Type is Turbo"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "engineTypeHybrid",
							"fieldLabel": "Engine Type is Hybrid"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "fuelEconomyCityHighway",
							"fieldLabel": "Fuel Economy City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "rangeCityHighway",
							"fieldLabel": "Range City/Highway"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "gasRange",
							"fieldLabel": "Gas Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "batteryRange",
							"fieldLabel": "Battery Range"
						},
						{
							"xtype": "vdsauthoredfield",
							"name": "totalRange",
							"fieldLabel": "Total Range"
						},
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getRegionalIncentiveDefDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Regional Incentive Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": [
						{
							"xtype": "overridefield",
							"name": "code",
							"fieldLabel": "Code"
						},
						{
							"xtype": "overridefield",
							"name": "minAmount",
							"fieldLabel": "Min Amount"
						},
						{
							"xtype": "overridefield",
							"name": "maxAmount",
							"fieldLabel": "Max Amount"
						},
						{
							"xtype": "overridefield",
							"name": "includesOwner",
							"fieldLabel": "Includes Owner Cash"
						}
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getRegionalIncentivesDialogConfig = function (items) {
	return CQ.Util.applyDefaults({
		"title": "Regional Incentives Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": items
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getFeaturesDialogConfig = function (items) {
	return CQ.Util.applyDefaults({
		"title": "Features Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": items
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getFeatureDefDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Features Configuration",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "edit"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "dialogfieldset",
					"title": "General",
					"items": [
						{
							"xtype": "overridefield",
							"name": "code",
							"fieldLabel": "Code"
						},
						{
							"xtype": "overridefield",
							"name": "description",
							"fieldLabel": "Description"
						},
						{
							"xtype": "overridefield",
							"name": "groupTitle",
							"fieldLabel": "Group"
						},
						{
							"xtype": "overridefield",
							"name": "href",
							"fieldLabel": "Href"
						},
						{
							"xtype": "overridefield",
							"name": "highlights",
							"fieldLabel": "Highlights"
						}
					]
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
GM.vds.VDSEditor.getCopyDialogConfig = function () {
	return CQ.Util.applyDefaults({
		"title": "Copy Node",
		"okText": "Copy",
		"formUrl": GM.vds.VDSEditor.VDS_COMMAND_URL,
		"params": {
			"cmd": "copy"
		},
		"items": {
			"xtype": "panel",
			"items": [
				{
					"xtype": "textfield",
					"name": "destinationParentPath",
					"fieldLabel": "Destination Parent Path",
					"fieldDescription": "Enter the path to the parent node where the node should be copied to. Ex: chevrolet/us/en/2012"
				},
				{
					"xtype": "textfield",
					"name": "destinationNodeName",
					"fieldLabel": "Destination Node Name",
					"fieldDescription": "Enter the name for the new node.  If blank, source node name will be used."
				}
			]
		}
	}, GM.vds.VDSEditor.baseDialogConfig);
};
