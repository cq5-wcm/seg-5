/*
 * Copyright 1997-2008 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */
/*
 * Copyright 1997-2008 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

// create tagging package
CQ.Ext.ns("CQ.tagging");

// calls the TagJsonServlet on the server (meta data for one tag)
CQ.tagging.TAG_JSON_SUFFIX = ".tag.json";

// calls the TagTreeServlet on the server (full tree of namespace)
// @deprecated
CQ.tagging.TAG_TREE_JSON_SUFFIX = ".tagtree.json";

// calls the TagListServlet on the server (list of tags below certain tag with all details)
CQ.tagging.TAG_LIST_JSON_SUFFIX = ".tags.json";

// name of the default namespace
CQ.tagging.DEFAULT_NAMESPACE = "default";

// where the tag languages are defined ("languages" multi-value property)
CQ.tagging.LANGUAGES_URL = "/etc/tags.json";

// private - splits tagID into namespace and local (also works for title paths)
CQ.tagging.parseTag = function(tag, isPath) {
    var tagInfo = {
        namespace: null,
        local: tag,
        getTagID: function() {
            return this.namespace + ":" + this.local;
        }
    };

    // parse tag pattern: namespace:local
    var colonPos = tag.indexOf(isPath ? '/' : ':');
    if (colonPos > 0) {
        // the first colon ":" delimits a namespace
        // don't forget to trim the strings (in case of title paths)
        tagInfo.namespace = tag.substring(0, colonPos).trim();
        tagInfo.local = tag.substring(colonPos + 1).trim();
    }
    
    return tagInfo;
};

// private - same as parseTag(), but only suited for tagIDs and returns namespace = "default" if no namespace is given
CQ.tagging.parseTagID = function(tagID) {
    var tagInfo = CQ.tagging.parseTag(tagID);
    if (tagInfo.namespace === null) {
        tagInfo.namespace = CQ.tagging.DEFAULT_NAMESPACE;
    }
    return tagInfo;
};

// private
CQ.tagging.getLocalizedTitle = function(tag, locale, attr, name) {
    if (locale && locale.code) {
        return tag[attr + "." + locale.code.toLowerCase()] ||
               tag[attr + "." + locale.language] ||
               tag[attr] ||
               name;
    } else {
        return tag[attr] || name;
    }
};

// private
CQ.tagging.getLocaleSelectCombo = function(selectFn, value) {
    selectFn = selectFn || CQ.Ext.emptyFn;
    value = value ? value.toLowerCase() : null;
    return {
        ref: "../localeSelect",
        xtype: "combo",
        width: 150,
        // avoids closing of the parent popupMenu when clicking in the combo list
        listClass: "x-menu",
        forceSelection: true,
        selectOnFocus: true,
        triggerAction: "all",
        mode: "local", // we load the store manually
        valueField: "locale",
        displayField: "title",
        store: new CQ.Ext.data.Store({
            proxy: new CQ.Ext.data.HttpProxy({
                url: CQ.tagging.LANGUAGES_URL,
                method: "GET"
            }),
            reader: new CQ.Ext.data.ArrayReader({
                root: "languages",
                fields: [{
                        name: "locale",
                        mapping: 0,
                        // languages is an array of strings, hence "value" points to the full string
                        convert: function(v, value) {
                            return value;
                        }
                    },{
                        name: "title",
                        mapping: 0,
                        convert: function(v, value) {
                            var l = CQ.I18n.getLanguages()[value];
                            return (l && l.title) ? CQ.I18n.getVarMessage(l.title) : value;
                        }
                    }
                ]
            })
        }),
        listeners: {
            select: function(cb) {
                selectFn(cb.getValue().toLowerCase());
            },
            render: function(cb) {
                if (value) {
                    cb.loadAndSetValue(value);
                }
            }
        },
        loadAndSetValue: function(value) {
            this.getStore().on("load", function() {
                this.setLocale(value);
            }, this);
            this.getStore().on("exception", function() {
                this.setLocale(value);
            }, this);
            this.getStore().load();
        },
        // like setValue, but adds the value + title to the store if it does not exist there yet
        setLocale: function(locale) {
            var store = this.getStore();
            var pos = store.findExact("locale", locale);
            if (pos >= 0) {
                this.setValue(locale);
            } else {
                var langs = CQ.I18n.getLanguages();
                if (langs[locale]) {
                    var data = {};
                    data.locale = locale;
                    data.title = CQ.I18n.getVarMessage(langs[locale].title);
                    store.add([ new store.recordType(data) ]);
                    this.setValue(locale);
                }
            }
        }
    };    
};
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 *
 * All Rights Reserved.
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * Visual representation of a tag.
 * @class CQ.tagging.TagLabel
 * @extends CQ.Ext.BoxComponent
 * @private
 */
CQ.tagging.TagLabel = CQ.Ext.extend(CQ.Ext.BoxComponent, {
    constructor: function(config) {
        CQ.Util.applyDefaults(config, {
            cls: "taglabel",
            showPath: true,
            tag: {},
            type: "set",
            displayTitles: true,
            readOnly: false,
            locale: null
        });
        
        CQ.tagging.TagLabel.superclass.constructor.call(this, config);
        
        this.calculateText();
    },
    
    initComponent: function() {
        // first call initComponent on the superclass:
        CQ.tagging.TagLabel.superclass.initComponent.call(this);
        
        this.addEvents(
            /**
             * @event remove
             * Fires when the remove button was clicked
             * @param {CQ.tagging.TagLabel} label This tag label component
             */
            'remove'
        );
    },
    
    calculateText: function() {
        var tag = this.tag;
        if (typeof tag === "string") {
            this.text = tag;
        } else if (!this.displayTitles) {
            this.text = tag.tagID;
        } else {
            this.text = CQ.tagging.getLocalizedTitle(tag, this.locale, "titlePath");
        }
    },
    
    setLocale: function(locale) {
        this.locale = locale;
        this.calculateText();
        this.el.update(CQ.tagging.TagLabel.createLabelHtml(this.text, this.showPath));
        this.createToolTip();
    },
    
    onRender : function(ct, position){
        if(!this.el) {
            var html = CQ.tagging.TagLabel.createLabelHtml(this.text, this.showPath);
            
            // create element
            this.el = ct.createChild({
                "tag": "div",
                "id": this.getId(),
                "html": html
            }, position);
            
            this.setType(this.type);
            if (!this.readOnly) {
                // provide remove event
                this.removeBtn = this.getEl().child(".taglabel-tool-remove");
                this.removeBtn.on('click', function() {
                    this.fireEvent("remove", this);
                }, this);

                this.removeBtn.addClassOnOver("taglabel-tool-remove_hover");
                this.el.addClassOnOver("taglabel_hover");
            }
        }
        
        CQ.tagging.TagLabel.superclass.onRender.call(this, ct, position);
    },
    
    setType: function(type) {
        if (!this.el) {
            // in case the label wasn't render yet, just store the value
            this.type = type;
        } else {
            this.el.removeClass(this.type + "tag");
            this.type = type;
            this.el.addClass(this.type + "tag");
        
            this.createToolTip();
        }
    },
    
    createToolTip: function() {
        if (this.tip) {
            this.tip.destroy();
        }
        var title = this.tag.titlePath || this.text;
        if (title) {
            title = CQ.shared.XSS.getXSSValue(title);
        }
        this.tip = new CQ.Ext.ToolTip({
            target: this.getEl().child(".taglabel-body"),
            title: title,
            html: CQ.tagging.TagLabel.createTooltipHtml(this.tag, this.type),
            dismissDelay: 0, // never dismiss
            maxWidth: 500,
            // HACK: IE does not like "auto" as width in quicktips
            width: "auto" //document.all ? 400 : "auto"
        });
    },
    
    // @public
    highlight: function() {
        this.getEl().child(".parentpath").highlight("#ffff9c", {attr: "color", duration: 1.5});
        this.getEl().child(".tagname").highlight("#ffff9c", {attr: "color", duration: 1.5});
    }
    
});

CQ.tagging.TagLabel.createLabelHtml = function(text, showPath) {
    // build html structure that allows background images for
    // the 4 corners + top and bottom side (tl, tc, tr, bl, bc, br)
    
    // NOTE: only a table works here across all browsers (IE). if we would use
    // simple div's internally with floating, we would have to set a fixed
    // width on the whole tag label to let it float around normally with other
    // taglabels. but we want the width to be "auto", depending on the text
    // inside this label
    var htmlPrefix = "<table>" +
                    "<tr>" +
                        "<td class='taglabel-tl'></td>" +
                        "<td class='taglabel-tc' colspan='2'></td>" +
                        "<td class='taglabel-tr'></td>" +
                    "</tr>" +
                    "<tr>" +
                        "<td class='taglabel-ml'></td>" +
                        "<td class='taglabel-mc'>";
                        
    var htmlSuffix =    "</td>" +
                        "<td class='taglabel-tool-cell'>" +
                            "<div class='taglabel-tool taglabel-tool-remove'></div>" +
                        "</td>" +
                        "<td class='taglabel-mr'></td>" +
                    "</tr>" +
                    "<tr>" +
                        "<td class='taglabel-bl'></td>" +
                        "<td class='taglabel-bc' colspan='2'></td>" +
                        "<td class='taglabel-br'></td>" +
                    "</tr>" +
                 "</table>";
                 
    var parent = "";
    var local = text;
    var pos;
    if (local.indexOf('/') > 0) {
        pos = local.lastIndexOf('/');
        parent = local.substring(0, pos+1);
        local = local.substring(pos+1);
    } else if (local.indexOf(':') > 0) {
        pos = local.lastIndexOf(':');
        parent = local.substring(0, pos+1);
        local = local.substring(pos+1);
    }
    
    var nameCls = "tagname";
    if (!showPath || !parent || parent === "") {
        nameCls += " no-parentpath";
    }
    
    if (!showPath) {
        parent = "";
    }
    
    var html = htmlPrefix + "<div class='taglabel-body'>";
    html += "<div class='parentpath'>" + CQ.shared.XSS.getXSSValue(parent) + "</div>";
    html += "<div class='" + nameCls + "'>" + CQ.shared.XSS.getXSSValue(local) + "</div>";
    html += "</div>" + htmlSuffix;
    return html;
};

CQ.tagging.TagLabel.createTooltipHtml = function(tag, type) {
    if (type == "new") {
        return "<p class='taglabel-note top'>" +
               CQ.I18n.getMessage("You added this new tag. It will be created and saved when you submit the form.") +
               "</p>";
    } else if (type == "denied") {
        return "<p class='taglabel-note top'>" +
               CQ.I18n.getMessage("You added this new tag, but are not allowed to create it. Please remove it before submitting the form.") +
               "</p>";
    }
    
    var html = tag.tagID ? tag.tagID + "<br><br>": "";
    
    html += "<table class='taglabel-localizations'>";
    var langs = CQ.I18n.getLanguages(), locale, label;
    CQ.Ext.iterate(tag, function(name, value) {
        if (name.indexOf("titlePath.") == 0) {
            locale = name.substring("titlePath.".length);
            label = langs[locale] ? langs[locale].title : locale;
            html += "<tr><td class='taglabel-label'>" + CQ.shared.XSS.getXSSValue(label) + ": </td><td>" + CQ.shared.XSS.getXSSValue(value) + "</td></tr>";
        }
    });
    html += "</table>";
    
    if (tag.description) {
        html += "<p>" + CQ.shared.XSS.getXSSValue(tag.description) + "</p>";
    }
    
    if (type == "added") {
        html += "<p class='taglabel-note'>" +
                CQ.I18n.getMessage("You added this existing tag. Submit the form to save.") +
                "</p>";
    }
    
    return html;
};

// register xtype
CQ.Ext.reg("taglabel", CQ.tagging.TagLabel);

/**
 * <code>CQ.tagging.TagInputField</code> is a form widget for entering tags. It has a popup menu
 * for selecting from existing tags, includes auto-completion and many other features.
 * 
 * @class CQ.tagging.TagInputField
 * @extends CQ.form.CompositeField
 *
 * @constructor
 * Creates a new <code>CQ.tagging.TagInputField</code>.
 * Example:
 * <pre><code>
var myComp = new CQ.tagging.TagInputField({
    "id": "tagInputField",
    "fieldLabel": "Tags / Keywords",
    "name": "./cq:tags",
    
    "displayTitles": false,
    "namespaces": []
});
   </pre></code>
 * @param {Object} config The config object
 */
CQ.tagging.TagInputField = CQ.Ext.extend(CQ.form.CompositeField, {
    
    // -----------------------------------------------------------------------< config options >
    
    /**
     * @cfg {Array} namespaces  A list of the tag namespaces that should be displayed and allowed.
     * If empty, all available namespaces will be allowed. Otherwise either an array of Strings
     * (the namespace names) or for more configuration an array of objects as this:
     * <pre><code>
 {
    name: "namespace",
    maximum: 1 // maximum number of tags allowed from this namespace; if -1 no limit (default)
 }
       </pre></code>
     */
    namespaces: [],
    
    /**
     * @cfg {Boolean} displayTitles  Whether to display tag titles instead of the pure tag IDs in
     * the input field, autocompletion, tree or cloud view. Default is <code>true</code>.
     */
    displayTitles: true,
    
    /**
     * @cfg {Boolean} showPathInLabels  Whether to display the complete path for namespace and/or container tags
     * (eg. "Newsletter : Company / News") in the labels or just the title (eg. "News" in this example). Default
     * is <code>true</code>.
     */
    showPathInLabels: true,
    
    /**
     * @cfg {String} tagsBasePath  The base path for the tag storage on the server (defaults to /etc/tags).
     * Should not contain a trailing "/".
     */
    tagsBasePath: "/etc/tags",
    
    /**
     * @cfg {Number} popupWidth  The initial width of the popup menu for selecting tags from the existing tag
     * namespaces. Defaults to 500.
     */
    popupWidth: 500,

    /**
     * @cfg {Number} popupHeight  The initial height of the popup menu for selecting tags from the existing tag
     * namespaces. Defaults to 300.
     */
    popupHeight: 300,

    /**
     * @cfg {String} popupResizeHandles  An {@link CQ.Ext.Resizable} handles string for specifying the sides of the popup
     * that should display resize handles. Set to <code>null</code> to disable resizing for the popup menu.
     * Defaults to <code>sw se</code> (bottom left and bottom right only).
     */
    popupResizeHandles: "sw se",
    
    /**
     * @cfg {String} popupAlignment An {@link CQ.Ext.Element.alignTo} anchor position to use for the popup menu relative
     * to the text field
     */
    popupAlignTo: "tl-bl",
    
    /**
     * @cfg {Number} suggestMinChars
     * (see {@link CQ.Ext.form.ComboBox#minChars}) The minimum number of characters the user must
     * type before autocomplete and typeahead activate (defaults to 3) 
     */
    suggestMinChars: 3,
    
    // -----------------------------------------------------------------------< private properties >

    // private
    tags: [],
    
    // private
    hiddenTagIDs: [],
    
    /**
     * Json of all existing namespaces. Loaded upon focus
     * @private
     */
    tagNamespaces: null,
    
    // private
    tagNamespacesLoaded: false,
    
    // private
    allNamespacesAllowed: false,
    
    // private
    allowedNamespaces: {},
    
    // private - CQ.Ext.Panel, the big, dummy input box that contains labels and the real text field
    dummyInput: null,
    
    // private - CQ.Ext.form.ComboBox, the main input field 
    textField: null,
    
    // private - CQ.Ext.menu.Menu, the popup menu for selecting from existing tags
    popupMenu: null,
    
    // private - CQ.Ext.TabPanel, the main tab widget in the popup menu (one tab per tag namespace)
    namespacesTabPanel: null,
    
    // private - remembers the actual menu visibility state before the trigger button was clicked
    menuIsVisible: false,
    
    /**
     * List of hidden form fields that get dynamically updated
     * when the textField changes. Used to hold the array of tags
     * when the form is submitted.
     * 
     * @private
     * @type Object (Array<CQ.Ext.form.Hidden>)
     */
    hiddenFields: [],
    
    // private - CQ.Ext.data.MemoryProxy() holding the auto-completion data
    autoCompletionProxy: null,
    
    // private - default config for entries in namespaces[] config
    namespacesDefaultConfig: {
        maximum: -1, // any number allowed
        displayAs: "cloud",
        allowDisplayChange: true
    },
    
    // -----------------------------------------------------------------------< constructor >
    
    constructor: function(config) {
        CQ.Util.applyDefaults(config, {
            // TagInputField config
            "tagsBasePath": "/etc/tags",
            "displayTitles": true,
            "showPathInLabels": true,
            "namespaces": [],
            "popupWidth": 500,
            "popupHeight": 300,
            "popupResizeHandles": "sw se", // bottom left and bottom right resize handles only
            "popupAlignTo": "tl-bl",
            "suggestMinChars": 3,

            // inherited config
            "border": false,
            "layout": "fit"
        });
        if (config.readOnly) {
            config.cls = (config.cls ? config.cls + " " : "") + "x-form-disabled";
        }

        // for use of "this" in closures
        var tagInputField = this;
        
        this.autoCompletionProxy = new CQ.Ext.data.MemoryProxy(null);
        
        var textField = new CQ.Ext.form.ComboBox({
            wrapCls: "floating", // special config, see on render handler below
            cls: "invisible-input",
            hidden: config.readOnly,
            hideLabel: true,
            hideTrigger: true,
            resizable: true,
            autoCreate: {tag: "input", type: "text", size: "18", autocomplete: "off"},
            name: CQ.Sling.IGNORE_PARAM, // let sling ignore this field
            displayField: config.displayTitles ? "titlePath" : "tagID",
            minChars: config.suggestMinChars,
            typeAhead: false, // type ahead in combo only works for single value completion
            queryParam: config.displayTitles ? "suggestByTitle" : "suggestByName",
            lazyInit: false,
            store: new CQ.Ext.data.Store({
                proxy: new CQ.Ext.data.HttpProxy({
                    url: config.tagsBasePath + CQ.tagging.TAG_LIST_JSON_SUFFIX,
                    method: "GET"
                }),
                reader: new CQ.Ext.data.JsonReader({
                    root: "tags",
                    fields: [
                        "tagID",
                        {
                            name: "titlePath",
                            mapping: function(o) {
                                return CQ.tagging.getLocalizedTitle(o, tagInputField.locale, "titlePath");
                            }
                        }
                    ]
                }),
                baseParams: {
                    count: "false",
                    "_charset_": "utf-8"
                    // these are the default values for the suggest servlet
                    // ignoreCase: "true",
                    // matchWordStart: "false"
                }
            }),
            title: CQ.I18n.getMessage("Matching tags"),
            listEmptyText: CQ.I18n.getMessage("No matching tag found"),
            listWidth: 500,
            // custom template to highlight typed text in auto-completion list
            tpl: new CQ.Ext.XTemplate(
                '<tpl for="."><div class="x-combo-list-item">{[this.markText(values)]}</div></tpl>',
                {
                    markText: function(values) {
                        var val = values[config.displayTitles ? "titlePath" : "tagID"];
                        // make sure
                        var typed = textField.getRawValue().toLowerCase();
                        var pos = val.toLowerCase().lastIndexOf(typed);
                        if (pos >= 0) {
                            return val.substring(0, pos) + "<b>" + val.substr(pos, typed.length) + "</b>" + val.substring(pos + typed.length);
                        } else {
                            return val;
                        }
                    }
                }
            )
        });
        this.textField = textField;
        
        this.textField.comboBoxOnLoad = this.textField.onLoad;
        // filter out not-allowed namespaces
        this.textField.onLoad = function() {
            if (!tagInputField.allNamespacesAllowed && !this.store.isFiltered()) {
                this.store.filterBy(function(record, id) {
                    var ns = tagInputField.getNamespaceDefinition(record.get("tagID"));
                    var cfg = tagInputField.getNamespaceConfig(ns.name);
                    return cfg !== null && cfg !== undefined;
                });
            }
            this.comboBoxOnLoad();
        };

        this.textField.on('render', function(textField) {
            // add the special config "wrapCls" to wrapper div
            textField.wrap.addClass(textField.wrapCls);

            // add keydown listener to prevent form submission in standard HTML form
            CQ.Ext.EventManager.on(textField.el.dom, "keydown", function(evt) {
                if (evt.keyCode == CQ.Ext.EventObject.ENTER) {
                    if (evt.preventDefault) {
                        // ff
                        evt.preventDefault();
                    } else {
                        // ie
                        evt.returnValue = false;
                    }
                }
            }, this, {"normalized": false});
        });
        
        this.inputDummy = new CQ.Ext.Panel({
            "cls": "dummy-input",
            "border": false
        });
        
        config.items = [
            this.inputDummy
        ];

        this.namespacesTabPanel = new CQ.Ext.TabPanel({
            enableTabScroll: true,
            deferredRender: false, // needed for the tree views inside the non-visible tabs on start to be displayed
            border: false,
            width: config.popupWidth,
            height: config.popupHeight,
            bbar: [{
                    iconCls: "cq-siteadmin-refresh",
                    handler: function() {
                        this.loadTagNamespaces();
                    },
                    scope: this
                },
                "->",
                CQ.tagging.getLocaleSelectCombo(function(locale) {
                    tagInputField.setLocale(locale);
                })
            ]
        });

        CQ.tagging.TagInputField.superclass.constructor.call(this, config);
    },
    
    // -----------------------------------------------------------------------< component init & rendering >
    
    /**
     * Initializes the component.
     * @private
     */
    initComponent: function() {
        // first call initComponent on the superclass:
        CQ.tagging.TagInputField.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event addtag
             * Fires when a tag was added to the value of this field (not fired upon setValue)
             * @param {CQ.tagging.TagInputField} field This tag input field
             * @param {Object} tag The newly added tag (with tagID, title, name, path, description, etc. members)
             */
            'addtag',
            /**
             * @event removetag
             * Fires when a tag was removed from the value of this field
             * @param {CQ.tagging.TagInputField} field This tag input field
             * @param {Object} tag The newly added tag (with tagID, title, name, path, description, etc. members)
             */
            'removetag'
        );
        
        // for use of "this" in closures
        var tagInputField = this;

        this.initAllowedNamespaces();
                
        this.inputDummy.add(this.textField);
        
        this.menuIsVisible = false;
        // store and use the actual visible state in our trigger click handler below
        var storeMenuVisibilityHandler = function() {
            tagInputField.menuIsVisible = tagInputField.popupMenu.isVisible();
        };
        this.textField.on('keydown', storeMenuVisibilityHandler);
        
        // resize handling copied from TriggerField
        this.inputDummy.deferHeight = true;
        this.inputDummy.getResizeEl = function(){
            return this.wrap;
        };
        this.inputDummy.getPositionEl = function(){
            return this.wrap;
        };
        
        this.inputDummy.on("render", function(comp) {
            // wrap + trigger button
            comp.wrap = comp.el.wrap({cls: "x-form-field-wrap"});
            comp.trigger = comp.wrap.createChild({
                tag: "img",
                cls: this.readOnly ? " x-hidden" : "arrow-trigger",
                src: CQ.Ext.BLANK_IMAGE_URL
            });
            if(!comp.width){
                comp.wrap.setWidth(comp.el.getWidth() + comp.trigger.getWidth());
            }

            comp.trigger.on("click", function() {
                if (tagInputField.disabled) {
                    return;
                }
                
                tagInputField.initLocale();
                
                if (!tagInputField.tagNamespacesLoaded) {
                    tagInputField.loadTagNamespaces();
                }
                
                if (tagInputField.menuIsVisible) {
                    tagInputField.popupMenu.hide();
                } else {
                    tagInputField.popupMenu.show(comp.el, tagInputField.popupAlignTo);
                }
            });

            comp.trigger.on("mousedown", storeMenuVisibilityHandler);
            
            // pass clicks on to real input field
            comp.getEl().on("click", function() {
                this.textField.focus();
            }, this);
        }, this);
        
        this.inputDummy.onResize = function(w, h) {
            // change width and height before passing to Panel.onResize
            
            // panel is smaller because of the trigger button on the right
            if (typeof w == 'number') {
                w = w - this.trigger.getWidth();
            }
            // height should depend on inner contents
            h = "auto";
            
            CQ.Ext.Panel.prototype.onResize.call(this, w, h);
            
            // now set the width of the wrap depending on what Panel set + the trigger width
            this.wrap.setWidth(this.el.getWidth() + this.trigger.getWidth());
        };
        
        // select existing tag from autocompletion (override onSelect method of combo box)
        this.textField.onSelect = function(record, index) {
            if (this.fireEvent('beforeselect', this, record, index) !== false) {
                var tag = tagInputField.getTagDefinition(record.data.tagID);
                // new add the tag object belonging to the selected tagID
                tagInputField.comingFromTextField = true;
                if (tagInputField.addTag(tag, true)) {
                    this.setValue("");
                }
                
                this.collapse();
                this.fireEvent('select', this, record, index);
            }
        };
        
        // mark the focus on the dummy input field
        this.textField.on("focus", function(textField) {
            this.inputDummy.addClass("dummy-input-focus");
            this.inputDummy.trigger.addClass("trigger-focus");
            
            if (!this.tagNamespacesLoaded) {
                this.loadTagNamespaces();
            }
        }, this);
        this.textField.on("blur", function(textField) {
            this.inputDummy.removeClass("dummy-input-focus");
            this.inputDummy.trigger.removeClass("trigger-focus");
        }, this);
        
        this.textField.enableKeyEvents = true;
        this.textField.on("keydown", function(textField, e) {
            if (e.getKey() == e.ENTER) {
                // try to add the textfield's value as tag on ENTER
                
                // differentiate between enters with a autocomplete popup open or without
                if (!this.textField.isExpanded()) {
                    if (!this.readTextField()) {
                        this.textField.focus();
                    }
                }
                
            } else if (e.getKey() == e.BACKSPACE) {
                var text = this.textField.getValue();
                
                // NOTE: disabling backspace because it is annoying when using backspace
                // to delete chars in the input field and suddenly removing the previous
                // label - for which there is no undo. Proper solution should "select"
                // the label first and a second backspace should delete it.
                //// delete the previous tag label on backspace
                //if (!text && this.tags.length) {
                //    var tagObj = this.tags[this.tags.length - 1];
                //    this.removeTag(tagObj.tag);
                //}
                // ensure the autocompletion popup is closed when the input field becomes empty
                if (text && text.length == 1) {
                    this.textField.collapse();
                }
            }
        }, this);

        // build popup menu menu
        if (CQ.Ext.menu.Adapter) {
            // up to CQ 5.3 and Ext 2.x => components must be wrapped inside Adapter to be used inside Menu
            this.popupMenu = new CQ.Ext.menu.Menu({ cls: "x-tagging-menu" });
        
            this.popupMenu.add(new CQ.Ext.menu.Adapter(this.namespacesTabPanel, { hideOnClick: false }));
        
            if (this.popupResizeHandles) {
                // make the menu resizable
                var menuResizer = new CQ.Ext.Resizable(this.popupMenu.getEl(), {
                    "pinned": true,
                    "handles": this.popupResizeHandles
                });
                menuResizer.on('resize', function(r, width, height) {
                    // Note: 4px border for tabpanel + menuadapter depend on the styles used (and configs)
                    this.namespacesTabPanel.setSize(width - 4, height - 4);
                }, this);
            }
        } else {
            // since CQ 5.4 and Ext 3.x => components can be used directly in menu
            this.popupMenu = new CQ.Ext.menu.Menu({
                cls: "x-tagging-menu",
                enableScrolling: false // required to for proper resizability (see below)
            });
        
            this.popupMenu.add(this.namespacesTabPanel);
        
            if (this.popupResizeHandles) {
                this.popupMenu.on("render", function() {
                    // make the menu resizable
                    var menuResizer = new CQ.Ext.Resizable(this.popupMenu.getEl(), {
                        "pinned": true,
                        "handles": this.popupResizeHandles
                    });
                    menuResizer.on('resize', function(r, width, height) {
                        // Note: 4px border for tabpanel + menuadapter depend on the styles used (and configs)
                        this.namespacesTabPanel.setSize(width - 4, height - 4);
                    }, this);
                }, this);
            }
        }
    },
    
    /**
     * Handler for the rendering event. Used to subscribe to events of
     * the parentdialog, ie. to create tags before the submit.
     * @private
     */
    onRender: function(e) {
        CQ.tagging.TagInputField.superclass.onRender.apply(this, arguments);
        
        // register handler for creating tags
        this.formOwner = this.findParentByType("dialog");
        if (this.formOwner) {
            // tag field inside dialog
            this.formOwner.on("beforesubmit", this.prepareSubmit, this);
        } else {
            this.formOwner = this.findParentByType(CQ.Ext.form.FormPanel);
            if (this.formOwner) {
                // tag field inside ext form
                var frm = this.formOwner.getForm();
                frm.on("beforeaction", this.prepareSubmit, this);
            } else {
                // tag field inside standard HTML form
                // IMPORTANT: the submit event is not fired if the form is
                // submitted by javascript.
                var el = this.getEl().dom.parentNode;
                while (el && el.tagName) {
                    if (el.tagName.toLowerCase() == "form") {
                        break;
                    }
                    el = el.parentNode;
                }
                if (el) {
                    var f = this;
                    CQ.Ext.EventManager.on(el, "submit", function(evt) {
                        if (f.prepareSubmit()) {
                            return;
                        }
                        // abort form submission
                        if (evt.preventDefault) {
                            // ff
                            evt.preventDefault();
                        } else {
                            // ie
                            evt.returnValue = false;
                        }
                    }, this, {"normalized": false});
                }
            }
        }
    },
    
    // -----------------------------------------------------------------------< public methods >
    
    /**
     * Adds the given tag object to the value of this field (which is a list of tags).
     * This must be an existing tag.
     * @param {String/Object} tag  a tag object (as returned from <code>getTagDefinition()</code>
     *                             or a plain entered tag string
     * @param {Boolean} doFx  whether to animate an existing tag when it is tried to re-add (optional)
     * @param {Boolean} syncCheck  if the can-create-tag check on the server should be done synchronously (optional)
     * @return {Boolean} true if the tag could be added, false if it was not allowed
     * @public
     */    
    addTag: function(tag, doFx, syncCheck) {
        if (!tag) {
            return false;
        }
        
        if (this.hasTag(tag)) {
            if (doFx) {
                this.getTag(tag).label.highlight();
            }
            return false;
        }
        
        if (!this.checkMaximum(tag)) {
            return false;
        }
        
        var type;
        if (typeof tag === "string") {
            // newly entered tag, plain string
            type = "new";
            
            var tagObj = this.internalAddTag(tag);
            
            // user might not be allowed to create this new tag
            this.runCanCreateTagCheck(tagObj, syncCheck);

        } else {
            // existing tag
            type = "added";
            
            this.internalAddTag(tag);
        }
        
        this.inputDummy.doLayout();
        
        this.fireEvent('addtag', this, tag);
        
        return true;
    },

    /**
     * Removes the given tag from the value of this field (which is a list of tags).
     * @param {String/Object} tag  a tag object (as returned from <code>getTagDefinition()</code>
     *                             or a plain entered tag string
     * @public
     */    
    removeTag: function(tag) {
        if (!tag) {
            return;
        }
        
        // don't run update and events if the tag is already gone
        var tagObj = this.getTag(tag);
        if (tagObj !== null) {
            this.internalRemoveTag(tagObj);
            this.inputDummy.doLayout();
            
            this.fireEvent('removetag', this, tag);
        }
    },
    
    // up to cq 5.3
    processInit: function(path) {
        this.processPath(path);
    },

    // since cq 5.4
    processPath: function(path) {
        this.contentPath = path;
    },
    
    /**
     * Overridden setter for the value that expects an Array of String,
     * ie. a list of tagIDs.
     * @param {Array} value An Array of String, one for each tag
     * @public
     */
    setValue: function(valueArray) {
        this.clear();
        
        this.initLocale();
        
        if (valueArray && valueArray.length > 0) {
            var tags = null;

            // optimization: in a cq Dialog, we know the content path, and if this
            // is a standard cq:tags property, we can load all tag definitions for
            // the tags referenced by that resource in one go
            if (this.contentPath && (this.name === "cq:tags" || this.name === "./cq:tags") ) {
                // load all tags referenced by this resource from server (faster than many multiple requests per tag below)
                var tagJson = this.loadJson(this.contentPath + CQ.tagging.TAG_LIST_JSON_SUFFIX + "?count=false");
                if (tagJson && tagJson.tags) {
                    tags = tagJson.tags;
                }
                
                // reset so that the next, possibly manual setValue() call works based on the passed array only
                this.contentPath = null;
            }
        
            if (!tags || tags.length === 0) {
                tags = [];
                
                // go through values (which are tag ID strings) and load their tag definitions
                for (var i=0, iEnd = valueArray.length; i < iEnd; i++) {
                    var tagID = valueArray[i];
                    var tagInfo = CQ.tagging.parseTagID(tagID);
            
                    // load single tag data from server
                    var tag = this.loadJson(this.tagsBasePath + "/" + tagInfo.namespace + "/" + tagInfo.local + CQ.tagging.TAG_JSON_SUFFIX);
                    tags.push(tag || tagID);
                }
            }
        
            this.value = [];
            
            // internally add all tags
            CQ.Ext.each(tags, function(tag) {
                var namespace = CQ.tagging.parseTagID(tag.tagID || tag).namespace;
            
                if (typeof tag === "string" || !this.isAllowedNamespace(namespace)) {
                    // not allowed namespace, keep pure tagID in the background
                    this.hiddenTagIDs.push(tag.tagID || tag);
                } else {
                    // allowed => display
                    this.internalAddTag(tag, "set");
                }
            
                this.value.push(tag.tagID || tag);
            }, this);
        }

        this.inputDummy.doLayout();
    },
    
    /**
     * Overridden getter for the value that returns an Array of String,
     * ie. a list of tagIDs.
     * @return {Array} value An Array of String, one for each tag
     * @public
     */
    getValue: function() {
        this.value = [];
        
        // return the tag ids only of valid, existing tags
        for (var i=0; i < this.tags.length; i++) {
            var tag = this.tags[i].tag;
            if (tag.tagID) {
                this.value.push(tag.tagID);
            }
        }
        
        this.value = this.value.concat(this.hiddenTagIDs);
       
        return this.value;
    },
    
    /**
     * Returns the raw data value which may or may not be a valid, defined value.
     * To return a normalized value see {@link #getValue}.
     * @return {Mixed} value The field value
     */
    getRawValue: function() {
        // should be overridden by implementing classes
        return this.getValue();
    },

    /**
     * Returns the locale for the tags to use initially. The user can switch
     * it manually in the popup menu. Per default, uses the locale of the
     * current WCM page.
     */
    getDefaultLocale: function() {
        // tags on a page should be in the page locale by default
        return CQ.WCM.getPageLocale(CQ.WCM.getPagePath()) || CQ.I18n.parseLocale("en");
    },

    // -----------------------------------------------------------------------< private >
    
    initLocale: function() {
        if (!this.locale) {
            this.locale = this.getDefaultLocale();
            
            this.textField.getStore().baseParams.locale = this.locale.code;

            this.namespacesTabPanel.localeSelect.loadAndSetValue(this.locale.code.toLowerCase());
        }
    },
    
    setLocale: function(locale) {
        locale = typeof locale === "object" ? locale : CQ.I18n.parseLocale(locale);
        
        if (locale && (!this.locale || this.locale.code != locale.code)) {
            this.locale = locale;
            
            // update tag labels
            CQ.Ext.each(this.tags, function(tagObj) {
                if (tagObj.label) {
                    tagObj.label.setLocale(this.locale);
                }
            }, this);
            
            // suggest as you type
            this.textField.getStore().baseParams.locale = this.locale.code;
            
            // reload tag tabs
            this.loadTagNamespaces();
        }
    },
    
    // private
    hasTag: function(tag) {
        return this.getTag(tag) !== null;
    },
    
    // private
    getTag: function(tag) {
        for (var i=0; i < this.tags.length; i++) {
            if (this.tags[i].equals(tag)) {
                return this.tags[i];
            }
        }
        return null;
    },
    
    // private
    internalAddTag: function(tag, type) {
        type = type || (typeof tag === "string" ? "new" : "added");

        // create ui label
        var tagLabel = new CQ.tagging.TagLabel({
            tag: tag,
            namespace: null,
            type: type,
            showPath: this.showPathInLabels,
            displayTitles: this.displayTitles,
            readOnly: this.readOnly,
            locale: this.locale
        });
        
        tagLabel.on("remove", function() {
            this.removeTag(tag);
            this.textField.focus();
        }, this);
        
        // insert before the last element, the real input field
        this.inputDummy.insert(this.inputDummy.items.getCount()-1, tagLabel);
        
        var tagObj = {
            "label": tagLabel,
            "tag": tag,
            "type": type,
            equals: function(otherTag) {
                if (typeof this.tag === "string") {
                    return this.tag == otherTag;
                } else {
                    return this.tag.tagID == otherTag.tagID;
                }
            }
        };
        this.tags.push(tagObj);
        
        return tagObj;
    },
    
    // private
    internalRemoveTag: function(tagObj) {
        this.inputDummy.remove(tagObj.label);
        
        for (var i=0; i < this.tags.length; i++) {
            if (this.tags[i].equals(tagObj.tag)) {
                this.tags.splice(i, 1);
                break;
            }
        }
    },
    
    // private  
    clear: function() {
        for (var i=0; i < this.tags.length; i++) {
            this.inputDummy.remove(this.tags[i].label);
        }

        this.tags = [];
        this.hiddenTagIDs = [];
    },
    
    // private
    toggleTag: function(tag, doFx) {
        if (this.hasTag(tag)) {
            this.removeTag(tag);
        } else {
            this.addTag(tag, doFx);
        }
        
        // TODO: highlight "used" tag nodes
        // handle this in event handler (find node + change class)
        //node.getUI().removeClass("tagging-node-selected");
        //node.getUI().addClass("tagging-node-selected");
    },
    
    // private
    checkMaximum: function(tag) {
        var ns;
        
        if (typeof tag === "string") {
            // new tag
            if (this.displayTitles) {
                ns = this.getNamespaceDefinitionByTitlePath(tag);
            } else {
                ns = this.getNamespaceDefinition(tag);
            }
        } else {
            // existing tag
            ns = this.getNamespaceDefinition(tag.tagID);
        }
        
        if (ns === null) {
            // if the namespace is not found, we can't change for a maximum and have to accept it
            return true;
        }
        
        var cfg = this.getNamespaceConfig(ns.name);
        // check if namespace allowed
        if (!cfg) {
            CQ.Ext.Msg.show({
                cls: "x-above-menu",
                title: CQ.I18n.getMessage("Cannot add tag"),
                msg: CQ.I18n.getMessage("Namespace '{0}' not allowed.", [this.displayTitles ? ns.title : ns.name]),
                buttons: CQ.Ext.Msg.OK,
                
                fn: this.focusBackAfterMsgBox,
                scope: this
            });
            return false;
        }
        
        // check maximum setting
        if (cfg.maximum === -1) {
            // infinity
            return true;
        }
        
        // count both existing and to-be-created tags
        var count = this.countTagsOfNamespace(ns.name);
        
        if (count >= cfg.maximum) {
            // Note: this method is asynchronous (hence using the callback fn)
            CQ.Ext.Msg.show({
                cls: "x-above-menu",
                title: CQ.I18n.getMessage("Cannot add tag"),
                msg: CQ.I18n.getMessage("You can have only a maximum of '{0}' tags for the namespace '{1}'.", [cfg.maximum, this.displayTitles ? ns.title : ns.name]),
                buttons: CQ.Ext.Msg.OK,
                
                fn: this.focusBackAfterMsgBox,
                scope: this
            });
            return false;
        }
        return true;
    },
    
    // private
    focusBackAfterMsgBox: function() {
        if (this.comingFromTextField) {
            this.textField.focus();
            try {
                // required e.g. in Asset Editor where the form panel has to
                // be unmasked when prepareSubmit failed (bug 29859)
                this.formOwner.cleanUp();
            }
            catch (e) {
                // formOwner or cleanUp not defined (which is mostly the case)
            }
        } else {
            this.popupMenu.show(this.inputDummy.getEl(), this.popupAlignTo);
        }
    },
    
    // private - counts the number of selected tags that are of namespace ns
    countTagsOfNamespace: function(nsName) {
        var count = 0;
        for (var i=0; i < this.tags.length; i++) {
            var tag = this.tags[i].tag;
            // looking at tagID here
            var namespaceName = CQ.tagging.parseTagID(tag.tagID || tag).namespace;
            if (namespaceName == nsName) {
                count++;
            }
        }
        return count;
    },
    
    // -----------------------------------------------------------------------< submit + creating tags >

    // private
    readTextField: function(syncCheck) {
        var text = this.textField.getRawValue().trim();
        if (text === "") {
            return true;
        }
        
        var tag;
        try {
            if (this.displayTitles) {
                tag = this.getTagDefinitionByTitlePath(text);
            } else {
                tag = this.getTagDefinition(text);
            }
        } catch (e) {
            CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), typeof e === "string" ? e : e.message, function() {
                this.textField.focus();
            }, this);
            return false;
        }
        
        this.comingFromTextField = true;
        // tag will be null if not found by getTagDefinition*(), use plain text for new tag then
        var success = this.addTag(tag || text, true, syncCheck);
        
        if (success) {
            this.textField.setValue("");
        }
        return success;
    },
    
    // private
    prepareSubmit: function() {
        // check the text field for contents
        if (!this.readTextField(true)) {
            return false;
        }
        
        var tagIDs = [];
        var newTags = [];
        var denied = [];
        
        // go over all tags and categorize them
        for (var i=0; i < this.tags.length; i++) {
            var tagObj = this.tags[i];
            if (tagObj.type == "set" || tagObj.type == "added") {
                tagIDs.push(tagObj.tag.tagID);
            } else if (tagObj.type == "new") {
                newTags.push(tagObj.tag);
            } else if (tagObj.type == "denied") {
                denied.push(tagObj.tag);
            }
        }
        
        // first check if there are denied new tags and stop the submit in this case
        if (denied.length > 0) {
            CQ.Ext.Msg.alert(
                CQ.I18n.getMessage("Error"),
                CQ.I18n.getMessage("You are not allowed to create these new tag(s):<br><br>{0}<br><br>Please remove before submitting the form.", [ denied.join("<br>") ])
            );
            return false;
        }
        
        // (try to) create the new tags on the server
        if (newTags.length > 0) {
            var result = this.createTags(newTags);
            if (result.failed.length > 0) {
                CQ.Ext.Msg.alert(
                    CQ.I18n.getMessage("Error from Server"),
                    CQ.I18n.getMessage("Could not create tag(s):<br><br>{0}<br><br>The form was not saved.", [ result.failed.join("<br>") ])
                );
                // stop form submit, don't set the tags on the current content
                return false;
            }
            // add the newly created tags (tagIDs) to the tags array
            tagIDs = tagIDs.concat(result.created);
            
            // please reload the tag tree next time
            this.tagNamespacesLoaded = false;
        }
        
        // don't forget to pass through the hidden tagIDs
        tagIDs = tagIDs.concat(this.hiddenTagIDs);
        
        // prepare the form dom for the submit (with hidden fields)
        this.updateHiddenFields(tagIDs);
        
        return true;
    },
    
    // private
    createTags: function(tags) {
        // create new tags
        var result = {
            created: [],
            failed: []
        };
        
        CQ.Ext.each(tags, function(tag) {
            // create tag on server
            var response = CQ.HTTP.post(
                "/bin/tagcommand",
                undefined, // synchronous execution
                {
                    "cmd": this.displayTitles ? "createTagByTitle" : "createTag",
                    "locale": this.locale.code,
                    "tag": tag,
                    "_charset_": "utf-8"
                }
            );

            // collect all tags that could not be created.
            if (!CQ.HTTP.isOk(response)) {
                result.failed.push("'" + tag + "': " + response.headers[CQ.HTTP.HEADER_MESSAGE]);
            } else {
                // the tag ID is stored in the Path parameter of the html reponse
                var tagID = response.headers[CQ.HTTP.HEADER_PATH];
                result.created.push(tagID);
            }
        }, this);
        
        return result;
    },

    // private
    runCanCreateTagCheck: function(tagObj, syncCheck) {
        function handleResponse(options, success, xhr) {
            if (!success) {
                tagObj.type = "denied";
                tagObj.label.setType("denied");
            }
        }
        
        // check on server
        var response = CQ.HTTP.post(
            "/bin/tagcommand",
            // decide between sync and async response handling
            syncCheck ? undefined : handleResponse,
            {
                "cmd": this.displayTitles ? "canCreateTagByTitle" : "canCreateTag",
                "locale": this.locale.code,
                "tag": tagObj.tag,
                "_charset_": "utf-8"
            }
        );
        
        if (syncCheck) {
            handleResponse(null, CQ.utils.HTTP.isOk(response), null);
        }
    },
    
    // -----------------------------------------------------------------------< tag store lookup >
    
    /**
     * Retrieves a full tag object (with tagID, name, title, path, description, etc.) by
     * the given tagID. Note: this will only work for the namespaces given in the
     * <code>namespaces</code> config, because otherwise no appropriate tag data is loaded.
     * @param {String} tagID  a tagID string (eg. "newsletter:company")
     * @private
     */    
    getTagDefinition: function(tagID) {
        var tagInfo = CQ.tagging.parseTagID(tagID);
        return this.loadJson(this.tagsBasePath + "/" + tagInfo.namespace + "/" + tagInfo.local + CQ.tagging.TAG_JSON_SUFFIX);
    },
    
    // private
    // returns a tag object if found or null if tag has to be created
    getTagDefinitionByTitlePath: function(titlePath) {
        return this.loadJson(this.tagsBasePath + CQ.tagging.TAG_JSON_SUFFIX + "?title=" + titlePath);
    },
    
    // private
    getNamespaceDefinition: function(nsTagID) {
        var nsName = CQ.tagging.parseTagID(nsTagID).namespace;
        return this.tagNamespaces[nsName];
    },
    
    // private
    getNamespaceDefinitionByTitlePath: function(nsTitlePath) {
        var nsTitle = CQ.tagging.parseTag(nsTitlePath).namespace;
        if (nsTitle === null) {
            return this.tagNamespaces[CQ.tagging.DEFAULT_NAMESPACE];
        }
        
        // scan namespace titles for a match
        for (var n in this.tagNamespaces) {
            if (this.tagNamespaces.hasOwnProperty(n)) {
                if (nsTitle == this.tagNamespaces[n].title) {
                    return this.tagNamespaces[n];
                }
            }
        }
        return null;
    },
    
    // -----------------------------------------------------------------------< namespace config >

    // private    
    initAllowedNamespaces: function() {
        this.allowedNamespaces = {};
        
        if (this.namespaces.length === 0) {
            this.allNamespacesAllowed = true;
            return;
        }
            
        for (var i = 0, iEnd = this.namespaces.length; i < iEnd; i++) {
            var ns = this.namespaces[i];
            // can be just a string with the namespace name or a full config object
            if (typeof ns == "string") {
                ns = { name: ns };
            }
            
            CQ.Util.applyDefaults(ns, this.namespacesDefaultConfig);
            this.allowedNamespaces[ns.name] = ns;
        }
    },
    
    // private
    isAllowedNamespace: function(ns) {
        return this.allNamespacesAllowed || this.allowedNamespaces[ns];
    },
    
    // private
    getNamespaceConfig: function(nsName) {
        if (this.allNamespacesAllowed) {
            return this.namespacesDefaultConfig;
        } else {
            return this.allowedNamespaces[nsName];
        }
    },
    
    // -----------------------------------------------------------------------< loading json >
    
    /**
     * Helper function that loads a json from the given URL. If there is no
     * response or any other error, it will be logged and <code>null</code> returned.
     * @private
     */
    loadJson: function(url) {
        try {
            if (url) {
                var response = CQ.HTTP.get(url);
                if (CQ.HTTP.isOk(response)) {
                    return CQ.Util.eval(response);
                } else {
                    CQ.Log.debug("CQ.tagging.TagInputField#loadTags: no response for {0}, empty data}", url);
                    return null;
                }
            }
        } catch (e) {
            CQ.Log.warn("CQ.tagging.TagInputField#loadTags: {0}", e.message);
            return null;
        }
        
    },
    
    // private
    loadTagNamespaces: function() {
        this.tagNamespaces = {};
        var tagJson = this.loadJson(this.tagsBasePath + CQ.tagging.TAG_LIST_JSON_SUFFIX + "?count=false");
        if (tagJson && tagJson.tags) {
            CQ.Ext.each(tagJson.tags, function(t) {
                this.tagNamespaces[t.name] = t;
            }, this);
        }
        
        this.setupPopupMenu();
        
        this.tagNamespacesLoaded = true;
    },
    
    // -----------------------------------------------------------------------< gui >
    
    // private GUI
    setupPopupMenu: function() {
        // since the tree is used to add/remove tags by clicks, we disable GUI selections altogher
        var noSelectionsHandler = function(selectionModel, oldSel, newSel) {
            return false;
        };
        
        var tagfield = this;

        var tab = 0;
        // in case of a reload, clear existing tabs
        if (this.namespacesTabPanel && this.namespacesTabPanel.items.getCount() > 0) {
            tab = this.namespacesTabPanel.items.indexOf(this.namespacesTabPanel.getActiveTab());
            this.namespacesTabPanel.removeAll(true);
        }
        
        for (var n in this.tagNamespaces) {
            if (!this.tagNamespaces.hasOwnProperty(n)) {
                continue;
            }
            
            var ns = this.tagNamespaces[n];
            var cfg = this.getNamespaceConfig(ns.name);
            if (!cfg) {
                continue;
            }
            
            // similar to TagAdmin.js
            var treeLoader = new CQ.tree.SlingTreeLoader({
                // sling tree loader config
                path: this.tagsBasePath,
                typeIncludes: ["cq:Tag"],
                getTitle: function(name, o) {
                    return CQ.tagging.getLocalizedTitle(o, tagfield.locale, "jcr:title", name);
                },
                // standard tree loader config
                baseAttrs: {
                    singleClickExpand: true,
                    uiProvider: CQ.tagging.TagLabel.TreeNodeUI
                }
            });
            
            var rootNode = new CQ.Ext.tree.AsyncTreeNode({
                // no leading slash for name of root node, will be added automatically in getPath()
                "name": this.tagsBasePath.substring(1) + "/" + ns.name,
                "text": ns.title ? ns.title : ns.name,
                
                listeners: {
                    load: function(node) {
                        var tp = node.treePanel;
                        if (tp.loadMask) {
                            tp.loadMask.hide();
                            tp.loadMask = null;
                        }
                    }
                }
            });
            
            var treePanel = new CQ.Ext.tree.TreePanel({
                "root": rootNode,
                "rootVisible": false,
                "loader": treeLoader,
                "autoScroll": true,
                "containerScroll": true
            });
            rootNode.treePanel = treePanel;
            
            if (CQ.Ext.menu.Adapter) {
                // up to cq 5.3 and ext 2.x
                treePanel.on("render", function(tp) {
                    tp.loadMask = new CQ.Ext.LoadMask(tp.body, {
                        msg: CQ.I18n.getMessage("Loading..."),
                        removeMask: true
                    });
                
                    function showMask() {
                        if (tp.loadMask) {
                            tp.loadMask.show();
                        }
                    }
                    showMask.defer(100);
                });
            } else {
                // since cq 5.4 and ext 3.x
                treePanel.on("render", function(tp) {
                    tp.loadMask = new CQ.Ext.LoadMask(tp.body, {
                        msg: CQ.I18n.getMessage("Loading..."),
                        removeMask: true
                    });
                });
                
                treePanel.on("afterlayout", function(tp) {
                    if (tp.loadMask) {
                        tp.loadMask.show();
                    }
                });
            }
            
            treePanel.on('click', this.onTagNodeClicked, this);
            treePanel.getSelectionModel().on('beforeselect', noSelectionsHandler);

            var title = (this.displayTitles && ns.title) ? CQ.tagging.getLocalizedTitle(ns, this.locale, "title") : ns.name;
            if (title) {
                title = CQ.shared.XSS.getXSSValue(title);
            }
            var tabTip = CQ.I18n.getMessage("Namespace", [], "Tag Namespace") + ": " + (!this.displayTitles && ns.title ? ns.title : ns.name);
            if (tabTip) {
                tabTip = CQ.shared.XSS.getXSSValue(tabTip);
            }

            this.namespacesTabPanel.add({
                "title": title,
                
                "tabTip": tabTip,
                
                // wrap treepanel in a simple panel for fit layout + scrolling
                "xtype": "panel",
                "layout": "fit",
                "border": false,
                "items": treePanel
                
            });
        }
        this.namespacesTabPanel.setActiveTab(tab);
    },
    
    // private
    onTagNodeClicked: function(node, event) {
        this.comingFromTextField = false;
        
        var path = node.getPath();
        // "/etc/tags/default/new" => "default/new"
        path = path.substring( this.tagsBasePath.length + 1);
        var tagInfo = CQ.tagging.parseTag(path, true);
        var tag = this.getTagDefinition(tagInfo.getTagID());
        
        this.toggleTag(tag, true);
        // reposition popup in case the inputDummy has resized
        this.popupMenu.show(this.inputDummy.getEl(), this.popupAlignTo);
    },
    
    /**
     * Updates the hidden form fields according to the values passed.
     * @param {Object} values an Array of Strings with the tag ids.
     * @private
     */
    updateHiddenFields: function(values) {
        for (var i=0; i < this.hiddenFields.length; i++) {
            this.remove(this.hiddenFields[i]);
        }
        
        this.hiddenFields = [];
        
        // ensure the field is deleted before the values are set
        // (in case no values are present => empty text field)
        var deleteHiddenField = new CQ.Ext.form.Hidden({
            name: this.getName() + CQ.Sling.DELETE_SUFFIX
        });
        this.add(deleteHiddenField);
        this.hiddenFields.push(deleteHiddenField);

        // ensure multivalue property (when only one value is set)
        var typeHintHiddenField = new CQ.Ext.form.Hidden({
            name: this.getName() + "@TypeHint",
            value: "String[]"
        });
        this.add(typeHintHiddenField);
        this.hiddenFields.push(typeHintHiddenField);
        
        for (i=0; i < values.length; i++) {
            var hiddenField = new CQ.Ext.form.Hidden({
                name: this.getName(), // all hidden fields have the name of this field
                value: values[i]
            });
            this.add(hiddenField);
            this.hiddenFields.push(hiddenField);
        }
        this.doLayout();
    }
    
});

// register xtype
CQ.Ext.reg("tags", CQ.tagging.TagInputField);

/**
 * Overrides Tree node UI.
 * @private
 */
CQ.tagging.TagLabel.TreeNodeUI = CQ.Ext.extend(CQ.Ext.tree.TreeNodeUI, {

    /**
     * Creates a new <code>CQ.tagging.TagLabel.TreeNodeUI</code> instance.
     * @constructor
     * @param {Object} config The config object
     */
    constructor: function(config) {
        CQ.tagging.TagLabel.TreeNodeUI.superclass.constructor.call(this, config);
    },

    // private
    render : function(bulkRender){
        var a = this.node.attributes;
        if (a.qtip) {
            a.qtip = CQ.shared.XSS.getXSSValue(a.qtip);
        }
        if (a.qtipTitle) {
            a.qtipTitle = CQ.shared.XSS.getXSSValue(a.qtipTitle);
        }
        CQ.tagging.TagLabel.TreeNodeUI.superclass.render.call(this,bulkRender);
    },

    // private
    renderElements : function(n, a, targetNode, bulkRender){
        n.text = CQ.shared.XSS.getXSSValue(n.text);
        CQ.tagging.TagLabel.TreeNodeUI.superclass.renderElements.call(this, n, a, targetNode, bulkRender);
    }

});
/*
 * Copyright 1997-2008 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * The <code>CQ.tagging.TagAdmin</code> class provides the admin console for 
 * WCM tag administration.
 * @class CQ.tagging.TagAdmin
 * @extends CQ.Ext.Viewport
 *
 * @private
 */
CQ.tagging.TagAdmin = CQ.Ext.extend(CQ.Ext.Viewport, {

    /**
     * @cfg {String} tagsBasePath  The base path for the tag storage on the server (defaults to /etc/tags).
     * Should not contain a trailing "/".
     */
    tagsBasePath: "/etc/tags",
    
    /**
     * Creates a new <code>CQ.tagging.TagAdmin</code> instance.
     * @constructor
     * @param {Object} config The config object
     */
    constructor: function(config) {
        this.debug = config.debug;
        var admin = this;

        CQ.Util.applyDefaults(config, {
            tagsBasePath: "/etc/tags"
        });

        // actions
        var actions = [];
        var disabledActions = [];
        var tagActions = [];
        actions.push({
            "id":"cq-tagadmin-grid-refresh",
            "iconCls":"cq-siteadmin-refresh",
            "handler":this.reloadAll,
            "scope":this,
            "tooltip": {
                "text":CQ.I18n.getMessage("Refresh the list of tags"),
                "autoHide":true
            }
        });
        actions.push("-");
        if (config.actions) {
            actions = actions.concat(
                    this.formatActions(config.actions, disabledActions, tagActions));
        }    

        actions.push("-");
        actions.push({
            xtype: "button",
            enableToggle: true,
            text: CQ.I18n.getMessage("Count usage"),
            handler: function(b) {
                this.mask();
                var checked = b.pressed;
                var grid = CQ.Ext.getCmp("cq-tagadmin-grid");
                grid.getColumnModel().setHidden(5, !checked);
                grid.getStore().reload({
                    params: {
                        count: checked ? "true" : "false"
                    },
                    callback: function() { this.unmask(); },
                    scope: this
                });
            },
            scope:this
        });
        
        actions.push("->");
        
        var userLocale = CQ.User.getCurrentUser().getLanguage();
        this.setLocale(userLocale);
        
        actions.push(
            CQ.tagging.getLocaleSelectCombo(function(locale) {
                admin.setLocale(locale, true);
            }, userLocale.toLowerCase())
        );
        
        var treeLoader = new CQ.tree.SlingTreeLoader({
            // sling tree loader config
            path: config.tagsBasePath,
            typeIncludes: ["cq:Tag"],
            getTitle: function(name, o) {
                return CQ.tagging.getLocalizedTitle(o, admin.locale, "jcr:title", name);
            },
            // standard tree loader config
            baseAttrs: {
                singleClickExpand: true,
                allowDrop: true,
                uiProvider: CQ.tagging.TagAdmin.TreeNodeUI
            }
        });
        
        var treeRoot = new CQ.Ext.tree.AsyncTreeNode({
            // no leading slash for name of root node, will be added automatically in getPath()
            name: config.tagsBasePath.substring(1),
            text: CQ.I18n.getMessage("Tags"),
            draggable: false,
            expanded: true
        });

        // grid config
        var cm = new CQ.Ext.grid.ColumnModel([
            new CQ.Ext.grid.RowNumberer(),
            {
                "header":CQ.I18n.getMessage("Title"),
                "dataIndex":"title",
                "renderer": function(value, metadata, record){
                    return CQ.shared.XSS.getXSSValue(value);
                }

            },{
                "header":CQ.I18n.getMessage("Name"),
                "dataIndex":"name"
            },{
                "header":CQ.I18n.getMessage("Description"),
                "dataIndex":"description",
                "renderer": function(value, metadata, record){
                    return CQ.shared.XSS.getXSSRecordPropertyValue(record, "description");
                }
            },{
                "header":CQ.I18n.getMessage("TagID"),
                "dataIndex":"tagID"
            },{
                "header":CQ.I18n.getMessage("Count"),
                "dataIndex":"count",
                hidden: true
            // },{
            //     "header":CQ.I18n.getMessage("Modifier"),
            //     "dataIndex":"lastModifiedBy"
            // },{
            //     "header":CQ.I18n.getMessage("Modification Date"),
            //     "dataIndex":"lastModified"
            },{
                "header":CQ.I18n.getMessage("Publication Date"),
                "dataIndex":"pubDate"
            },{
                "header":CQ.I18n.getMessage("Publisher"),
                "dataIndex":"publisher"
            }
        ]);
        cm.defaultSortable = true;

        var sm = new CQ.Ext.grid.RowSelectionModel({
            "singleSelect":true,
            "listeners": {
                "selectionchange": function(sm) {
                    for (var i=0; i<disabledActions.length; i++) {
                        disabledActions[i].setDisabled(!sm.hasSelection());
                    }
                }
            }
        });
        
        var gridReader = new CQ.Ext.data.JsonReader({
            totalProperty: "results",
            root: "tags",
            id: "path",
            fields: [
                "name",
                {
                    name: "title",
                    mapping: function(o) {
                        return CQ.tagging.getLocalizedTitle(o, admin.locale, "title");
                    }
                },
                "description", "description" + CQ.shared.XSS.KEY_SUFFIX, "tagID", "count",
                "lastModified", "lastModifiedBy",
                "pubDate", "publisher"
            ]
        });

        var store = new CQ.Ext.data.GroupingStore({
            autoLoad: false,
            proxy: new CQ.Ext.data.HttpProxy({
                url: treeRoot.getPath() + CQ.tagging.TAG_LIST_JSON_SUFFIX,
                method: "GET"
            }),
            reader: gridReader,
            baseParams: {
                count: "false"
            }
        });

        // init component by calling super constructor
        CQ.tagging.TagAdmin.superclass.constructor.call(this, {
            "id":"cq-tagadmin",
            "layout":"border",
            "renderTo":"CQ",
            "stateful":true,
            "stateEvents": [ "pathselected" ],
            "items": [
                {
                    "id":"cq-tagadmin-wrapper",
                    "xtype":"panel",
                    "layout":"border",
                    "region":"center",
                    "border":false,
                    "items": [
                        {
                            "id":"cq-header",
                            "xtype":"container",
                            "autoEl":"div",
                            "region":"north",
                            "items": [
                                {
                                    "xtype":"panel",
                                    "border":false,
                                    "layout":"column",
                                    "cls": "cq-header-toolbar",
                                    "items": [
                                        new CQ.Switcher({}),
                                        new CQ.UserInfo({})
                                    ]
                                },
                                new CQ.HomeLink({})
                            ]
                        },{
                            "xtype":"treepanel",
                            "id":"cq-tagadmin-tree",
                            "region":"west",
                            "margins":"5 0 5 5",
                            "width": CQ.themes.TagAdmin.TREE_WIDTH,
                            "autoScroll":true,
                            "containerScroll":true,
                            "collapsible":true,
                            "collapseMode":"mini",
                            "hideCollapseTool": true,
                            "animate":true,
                            "split":true,
                            "enableDD":true,
                            "ddScroll":true,
                            "ddAppendOnly": true, // no ordering
                            "ddGroup":CQ.tagging.TagAdmin.DD_GROUP,
                            "dropConfig": {
                                ddGroup: CQ.tagging.TagAdmin.DD_GROUP,
                                appendOnly: true,
                                completeDrop : function(de){
                                    var ns = de.dropNode, p = de.point, t = de.target;
                                    if(!CQ.Ext.isArray(ns)){
                                        ns = [ns];
                                    }
                                    var n;
                                    for(var i = 0, len = ns.length; i < len; i++){
                                        n = ns[i];
                                        if(p == "above"){
                                            t.parentNode.insertBefore(n, t);
                                        }else if(p == "below"){
                                            t.parentNode.insertBefore(n, t.nextSibling);
                                        }else{
                                            // CQ START: add support for "merge" point
                                            if (admin.mergeNode) {
                                                var node = n;
                                                n = t; // focus/highlight ui on target node
                                                // fire custom event
                                                if (this.tree.fireEvent("beforemergenode", this.tree, node, t)) {
                                                    node.remove();
                                                }
                                            } else {
                                                t.appendChild(n);
                                            }
                                            // CQ END: add support for "merge" point
                                        }
                                    }
                                    n.ui.focus();
                                    if(CQ.Ext.enableFx && this.tree.hlDrop){
                                        n.ui.highlight();
                                    }
                                    t.ui.endDrop();
                                    this.tree.fireEvent("nodedrop", de);
                                }
                            },
                            "loader": treeLoader,
                            "root": treeRoot,
                            "rootVisible": true,
                            "tbar": [
                                {
                                    "id":"cq-tagadmin-tree-refresh",
                                    "iconCls":"cq-siteadmin-refresh",
                                    "handler":function(){
                                        admin.reloadTree();
                                    },
                                    "tooltip": {
                                        "text":CQ.I18n.getMessage("Refresh the tree"),
                                        "autoHide":true
                                    }
                                }
                            ],
                            listeners: {
                                click: function(node, event) {
                                    admin.loadPath(node.getPath());
                                },
                                nodedragover: function(e) {
                                    // change drag icon to show difference between move and merge (ctrl)
                                    var ghost = e.source.getProxy().getEl();
                                    if (e.rawEvent.browserEvent.ctrlKey) {
                                        ghost.addClass("x-tree-drop-ok-append");
                                        ghost.removeClass("x-dd-drop-ok");
                                    } else {
                                        ghost.removeClass("x-tree-drop-ok-append");
                                        ghost.addClass("x-dd-drop-ok");
                                    }
                                },
                                beforenodedrop: function(dropEvent) {
                                    admin.mergeNode = dropEvent.rawEvent.browserEvent.ctrlKey;
                                },
                                beforemovenode: function(tree, node, oldParent, newParent, index) {
                                    return admin.performMoveOrMerge(node, newParent);
                                },
                                // custom event (see completeDrop above)
                                beforemergenode: function(tree, node, target) {
                                    return admin.performMoveOrMerge(node, target, true);
                                },
                                append: function(tree, parent, node, index) {
                                    if (node.getDepth() > 1) {
                                        node.attributes.cls = "tag";
                                    } else {
                                        node.attributes.cls = "namespace";
                                    }
                                    node.ui.render();
                                }
                            }
                        },{
                            "xtype": "grid",
                            "id":"cq-tagadmin-grid",
                            "region":"center",
                            "margins":"5 5 5 0",
                            "stripeRows":true,
                            "cm":cm,
                            "sm":sm,
                            "viewConfig": new CQ.Ext.grid.GroupingView({
                                "forceFit":true,
                                "groupTextTpl": '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "'
                                    + CQ.I18n.getMessage("Tags") + '" : "'
                                    + CQ.I18n.getMessage("Tag") + '"]})'
                            }),
                            "store":store,
                            "tbar": actions,
                            "listeners": {
                                "rowcontextmenu": function(grid, index, e) {
                                    if (!this.contextMenu && (tagActions.length > 0)) {
                                        this.contextMenu = new CQ.Ext.menu.Menu({
                                            "items": tagActions
                                        });
                                    }
                                    var xy = e.getXY();
                                    this.contextMenu.showAt(xy);
                                    e.stopEvent();
                                },
                                "rowdblclick": function() {
                                    CQ.tagging.TagAdmin.editTag.call(admin);
                                }
                            }
                        }
                    ]
                }
            ]
        });
        this.loadPath();
    },

    initComponent : function() {
        CQ.tagging.TagAdmin.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event pathselected
             * Fires when a path in the pages tree was selected.
             * @param {CQ.Ext.TagAdmin} this
             * @param {String} path The selected path
             */
            "pathselected"
        );
    },
    
    performMoveOrMerge: function(node, newParent, isMerge) {
        // need to execute this request synchronous to prevent
        // nodes from being moved if the request fails
        this.mask();
        
        var newParentPath = newParent.getPath();
        var params = {
            "cmd": isMerge ? "mergeTag" : "moveTag",
            "path": node.getPath(),
            "dest": isMerge ? newParentPath : newParentPath + "/" + node.attributes.name
        };
        var response = CQ.HTTP.post("/bin/tagcommand", null, params);
        
        this.unmask();
        
        var success = (response.headers.Status || "500") == "200";
        if (success) {
            this.reloadGrid();
        }
        return success;
    },

    loadPath: function(path) {
        this.mask();
        // if path is not given, simply select the root (eg. on startup)
        this.treePath = path = path ? path : this.tagsBasePath;
        
        // workaround for buggy selectPath(): when selecting the root node, no slash must be at the beginning
        CQ.Ext.getCmp("cq-tagadmin-tree").selectPath(path == this.tagsBasePath ? this.tagsBasePath.substring(1) : path, "name");

        // now load the data from the server
        var store = CQ.Ext.getCmp("cq-tagadmin-grid").getStore();
        store.proxy.api["read"].url = path + CQ.tagging.TAG_LIST_JSON_SUFFIX;
        store.reload({
            callback: function() {
                this.unmask();
            },
            scope: this
        });

        this.fireEvent("pathselected", this, path);
    },

    getState:function() {
        return { "treePath": this.treePath };
    },

    // the ext tree path (eg. /default/bla)
    getCurrentTreePath: function() {
        var tree = CQ.Ext.getCmp("cq-tagadmin-tree");
        var node = tree.getSelectionModel().getSelectedNode();
        if (node != null) {
            return node.getPath();
        }
    },
    
    getSelectedTags: function() {
        var grid = CQ.Ext.getCmp("cq-tagadmin-grid");
        return grid.getSelectionModel().getSelections();
    },
    
    getSelectedTag: function() {
        var selections = this.getSelectedTags();
        if (selections.length > 0) {
            return selections[0].id;
        }
        return null;
    },
    
    setLocale: function(locale, reload) {
        this.locale = typeof locale === "object" ? locale : CQ.I18n.parseLocale(locale);
        
        if (reload) {
            var store = CQ.Ext.getCmp("cq-tagadmin-grid").getStore();
            
            this.reloadAll();
        }
    },
    
    reloadTree: function() {
        CQ.Ext.getCmp("cq-tagadmin-tree").getRootNode().reload();
    },
    
    reloadGrid: function() {
        this.loadPath(this.treePath);
    },

    reloadAll: function() {
        this.reloadTree();
        this.reloadGrid();
    },

    /**
     * Masks the main panel for loading.
     */
    mask: function() {
        if (!this.loadMask) {
            this.loadMask = new CQ.Ext.LoadMask(this.id + "-wrapper", {
                "msg": CQ.I18n.getMessage("Loading...")
            });
        }
        this.loadMask.show();
    },

    /**
     * Unmasks the main panel after loading.
     */
    unmask: function(timeout) {
        if (!this.loadMask) return;
        this.loadMask.hide();
    },


    // private
    formatActions: function(actionCfgs, disabledActions, tagActions) {
        var actions = [];
        for (var a in actionCfgs) {
            if (typeof(actionCfgs[a]) != "object") {
                continue;
            }
            // check for separators, splits, ...
            if (actionCfgs[a].xtype == "separator") {
                actions.push(actionCfgs[a].value);
                tagActions.push(actionCfgs[a].value);
            } else {
                if (actionCfgs[a].menu) {
                    actionCfgs[a].menu = new CQ.Ext.menu.Menu({
                        "items":this.formatActions(actionCfgs[a].menu,
                                disabledActions, tagActions)
                    });
                }
                var actionCfg = this.formatActionConfig(actionCfgs[a]);
                var action = new CQ.Ext.Action(actionCfg);
                actions.push(action);

                if (actionCfg.disabled) {
                    disabledActions.push(action);
                }

                tagActions.push(action);
            }
        }
        return actions;
    },

    // private
    formatActionConfig: function(config) {
        if (!config.scope) {
            config.scope = this;
        }
        if (typeof(config.handler) == "string") {
            config.handler = eval(config.handler);
        }
        if (config.text) {
            config.text = CQ.I18n.getVarMessage(config.text);
        }
        if (config.tooltip && config.tooltip.text) {
            config.tooltip.text = CQ.I18n.getVarMessage(config.tooltip.text);
        }
        if (config.tooltip && config.tooltip.title) {
            config.tooltip.title = CQ.I18n.getVarMessage(config.tooltip.title);
        }
        return config;
    },

    postTagCommand: function(cmd, tag, params) {
        this.mask();
        
        params = CQ.Util.applyDefaults(params || {}, {
            cmd: cmd,
            path: tag,
            "_charset_": "utf-8"
        });
        CQ.HTTP.post(
            CQ.tagging.TagAdmin.TAG_COMMAND_URL,
            function(options, success, response) {
                if (success) {
                    this.reloadAll();
                } else {
                    this.unmask();
                }
            },
            params,
            this
        );
    },

    createDialog: function(config, errorMsg) {
        var dialog = CQ.WCM.getDialog(config);
        dialog.on("beforesubmit", function() {
            this.mask();
        }, this);
        dialog.responseScope = this;
        dialog.success = this.reloadAll;
        dialog.failure = function(form, action) {
            this.unmask();
            CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), errorMsg);
        };
        return dialog;
    }
});

CQ.Ext.reg("tagadmin", CQ.tagging.TagAdmin);

CQ.tagging.TagAdmin.TAG_COMMAND_URL = "/bin/tagcommand";

// constants
CQ.tagging.TagAdmin.DD_GROUP = "cq.tagadmin.tree";

/**
 * Overrides Tree node UI.
 * @private
 */
CQ.tagging.TagAdmin.TreeNodeUI = CQ.Ext.extend(CQ.Ext.tree.TreeNodeUI, {

    /**
     * Creates a new <code>CQ.tagging.TagAdmin.TreeNodeUI</code> instance.
     * @constructor
     * @param {Object} config The config object
     */
    constructor: function(config) {
        CQ.tagging.TagAdmin.TreeNodeUI.superclass.constructor.call(this, config);
    },

    // private
    render : function(bulkRender){
        var a = this.node.attributes;
        if (a.qtip) {
            a.qtip = CQ.shared.XSS.getXSSValue(a.qtip);
        }
        if (a.qtipTitle) {
            a.qtipTitle = CQ.shared.XSS.getXSSValue(a.qtipTitle);
        }
        CQ.tagging.TagAdmin.TreeNodeUI.superclass.render.call(this,bulkRender);
    },

    // private
    renderElements : function(n, a, targetNode, bulkRender){
        n.text = CQ.shared.XSS.getXSSValue(n.text);
        CQ.tagging.TagAdmin.TreeNodeUI.superclass.renderElements.call(this, n, a, targetNode, bulkRender);
    }

});
/*
 * Copyright 1997-2008 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.tagging.TagAdmin.baseDialogConfig = {
    xtype: "dialog",
    params: {
        "_charset_": "utf-8"
    },
    buttons: CQ.Dialog.OKCANCEL
};

CQ.tagging.TagAdmin.createTag = function() {
    var dialogConfig = CQ.Util.applyDefaults({
        title: CQ.I18n.getMessage("Create Tag"),
        formUrl: CQ.tagging.TagAdmin.TAG_COMMAND_URL,
        params: {
            cmd: "createTag"
        },
        okText: CQ.I18n.getMessage("Create"),
        items: {
            xtype: "panel",
            items: [
                {
                    name: "jcr:title",
                    fieldLabel: CQ.I18n.getMessage("Title"),
                    allowBlank: false
                },{
                    name: "tag",
                    fieldLabel: CQ.I18n.getMessage("Name"),
                    allowBlank: false
                },{
                    name: "jcr:description",
                    fieldLabel: CQ.I18n.getMessage("Description"),
                    xtype: "textarea"
                }
            ]
        }
    }, CQ.tagging.TagAdmin.baseDialogConfig);

    var tagPath = this.getCurrentTreePath();
    if (tagPath == this.tagsBasePath) {
        // creating a new namespace
        // not setting parentTagID here => create namespace instead of tag
        dialogConfig.title = CQ.I18n.getMessage("Create Namespace");
        dialogConfig.items.items[0].fieldLabel = CQ.I18n.getMessage("Namespace Title");
        dialogConfig.items.items[1].fieldLabel = CQ.I18n.getMessage("Namespace Name");
        
    } else {
        var parentTagID = tagPath.substring(this.tagsBasePath.length + 1);
        
        // ensure the first path element (namespace) ends with ":"
        if (parentTagID.indexOf("/") > 0) {
            // replace (first) slash after namespace and end it with a slash
            parentTagID = parentTagID.replace("/", ":") + "/";
        } else {
            // add colon after namespace
            parentTagID = parentTagID + ":";
        }
        dialogConfig.params.parentTagID = parentTagID;
    }

    var dialog = this.createDialog(dialogConfig, CQ.I18n.getMessage("Could not create tag."));
    dialog.show();
};

(function() {
    
var languages = null;

CQ.tagging.TagAdmin.editTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    if (!languages) {
        languages = CQ.HTTP.eval(CQ.tagging.LANGUAGES_URL).languages;
    }
    
    var allLangs = CQ.I18n.getLanguages();
    
    var localizedTitles = [];
    CQ.Ext.each(languages, function(lang) {
        var title = allLangs[lang] ? CQ.I18n.getVarMessage(allLangs[lang].title) : lang;
        localizedTitles.push({
            name: "jcr:title." + lang,
            fieldLabel: title,
            xtype: "textfield"
        });
    });
   
    var dialogConfig = CQ.Util.applyDefaults({
        title: CQ.I18n.getMessage("Edit Tag"),
        okText: CQ.I18n.getMessage("Save"),
        items: {
            xtype: "panel",
            items: [
                {
                    name: "jcr:title",
                    fieldLabel: CQ.I18n.getMessage("Title"),
                    allowBlank: false
                },{
                    name: "jcr:description",
                    fieldLabel: CQ.I18n.getMessage("Description"),
                    xtype: "textarea"
                },{
                    name: "jcr:lastModified",
                    xtype: "hidden",
                    ignoreData: true
                },{
                    title: "Localization",
                    xtype: "dialogfieldset",
                    collapsible: true,
                    items: localizedTitles
                }
            ]
        }
    }, CQ.tagging.TagAdmin.baseDialogConfig);

    var dialog = this.createDialog(dialogConfig, CQ.I18n.getMessage("Could not save tag."));
    dialog.loadContent(tag, ".0.json");
    dialog.show();
};

})();

CQ.tagging.TagAdmin.deleteTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    CQ.Ext.Msg.confirm(
        this.getCurrentTreePath() == this.tagsBasePath ?
                    CQ.I18n.getMessage("Delete Namespace?") :
                    CQ.I18n.getMessage("Delete Tag?"),
        CQ.I18n.getMessage("You are going to delete: {0}<br/><br/>Are you sure?", [tag]),
        function(btnId) {
            if (btnId == "yes") {
                this.postTagCommand("deleteTag", tag);
            }
        },
        this
    );
};

CQ.tagging.TagAdmin.getParent = function(path) {
    var pathSteps = path.split("/");
    var parentPath = "";
    for (var i=0; i < pathSteps.length - 1; i++) {
        if (i > 0) {
            parentPath += "/";
        }
        parentPath += pathSteps[i];
    }
    return parentPath;
};

CQ.tagging.TagAdmin.getName = function(path) {
    var pathSteps = path.split("/");
    return pathSteps[pathSteps.length - 1];
};

// register "tagPath" vtype
(function() {
    CQ.Ext.apply(CQ.Ext.form.VTypes, {
        tagPath: function(val, field) {
            return ( /^\/etc\/tags(\/|$)/.test(val) );
        },
        tagPathText: CQ.I18n.getMessage("Not a valid tag path. Must start with /etc/tags.")
    });
})();

CQ.tagging.TagAdmin.moveTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    var admin = this;
    
    var dialog = new CQ.Dialog({
        title: CQ.I18n.getMessage("Move Tag"),
        okText: CQ.I18n.getMessage("Move"),
        buttons: CQ.Dialog.OKCANCEL,
        items: {
            xtype: "panel",
            items: [
                {
                    name: "tag",
                    fieldLabel: CQ.I18n.getMessage("Move"),
                    disabled: true,
                    value: tag
                },{
                    xtype: "pathfield",
                    name: "destParent",
                    fieldLabel: CQ.I18n.getMessage("to"),
                    rootPath: this.tagsBasePath,
                    predicate: "tag",
                    allowBlank: false,
                    vtype: "tagPath",
                    value: CQ.tagging.TagAdmin.getParent(tag)
                },{
                    name: "destName",
                    fieldLabel: CQ.I18n.getMessage("Rename to"),
                    allowBlank: false,
                    value: CQ.tagging.TagAdmin.getName(tag)
                }
            ]
        },
        ok: function() {
            var dest = this.getField("destParent").getValue();
            var name = this.getField("destName").getValue();
            // if ends with "/"
            if (dest.match(/\/$/)) {
                dest += name;
            } else {
                dest += "/" + name;
            }
            admin.postTagCommand("moveTag", tag, { dest: dest });
            this.hide();
        }
    });
    dialog.show();
};

CQ.tagging.TagAdmin.mergeTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    var admin = this;
    
    var dialog = new CQ.Dialog({
        title: CQ.I18n.getMessage("Merge Tag"),
        okText: CQ.I18n.getMessage("Merge"),
        buttons: CQ.Dialog.OKCANCEL,
        items: {
            xtype: "panel",
            items: [
                {
                    name: "tag",
                    fieldLabel: CQ.I18n.getMessage("Merge"),
                    disabled: true,
                    value: tag
                },{
                    xtype: "pathfield",
                    name: "dest",
                    fieldLabel: CQ.I18n.getMessage("into"),
                    fieldDescription: CQ.I18n.getMessage("After the merge, this will be the only tag left of the two."),
                    rootPath: this.tagsBasePath,
                    predicate: "tag",
                    allowBlank: false,
                    vtype: "tagPath",
                    value: tag
                }
            ]
        },
        ok: function() {
            var dest = this.getField("dest").getValue();
            admin.postTagCommand("mergeTag", tag, { dest: dest });
            this.hide();
        }
    });
    dialog.show();
};

CQ.tagging.TagAdmin.activateTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    this.postTagCommand("activateTag", tag);
};

CQ.tagging.TagAdmin.deactivateTag = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    this.postTagCommand("deactivateTag", tag);
};

CQ.tagging.TagAdmin.listTaggedItems = function() {
    var tag = this.getSelectedTag();
    if (tag == null) return;
    
    var renderPageTitle = function(value, p, record) {
        var url = CQ.HTTP.externalize(record.json.path);
        if (url.indexOf(".") == -1) {
            url += ".html";
        }
        return String.format('<a href="{0}" target="_blank">{1}</a>', url, value);
    };
    var grid = new CQ.Ext.grid.GridPanel({
        store: new CQ.Ext.data.GroupingStore({
            proxy: new CQ.Ext.data.HttpProxy({
                url: CQ.tagging.TagAdmin.TAG_COMMAND_URL,
                method: "GET"
            }),
            baseParams: { cmd: "list", path: tag},
            autoLoad:true,
            reader: new CQ.Ext.data.JsonReader({
                root: 'taggedItems',
                totalProperty: 'results',
                id: 'item',
                fields: [
                    'title',
                    'itemPath'
                ]
            })
        }),
        cm:new CQ.Ext.grid.ColumnModel([
            new CQ.Ext.grid.RowNumberer(),
            {
                header: CQ.I18n.getMessage("Title"),
                dataIndex: 'title',
                renderer: renderPageTitle
            },{
                header: CQ.I18n.getMessage("Path"),
                dataIndex: 'itemPath'
            }
        ]),
        viewConfig: {
            forceFit: true,
            groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})'
        },
        sm: new CQ.Ext.grid.RowSelectionModel({singleSelect:true})
    });
    var win = new CQ.Ext.Window({
        title:CQ.I18n.getMessage("Items tagged with") + tag,
        width:800,
        height:400,
        autoScroll:true,
        items: grid,
        layout:'fit',
        maximizable:true,
        minimizable:true,
        y:200
    }).show();
};
