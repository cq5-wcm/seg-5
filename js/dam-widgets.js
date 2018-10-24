/*
 * Copyright 1997-2009 Day Management AG
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
 * Copyright 1997-2009 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

// initialize CQ.dam package
CQ.dam = {};

CQ.dam.endorsed = {};
CQ.dam.form = {};

// initialize CQ.dam.themes package
CQ.dam.themes = {};
/*
 * Copyright 1997-2009 Day Management AG
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
 * The <code>CQ.dam.Util</code> library contains all CQ DAM utilities.
 * @static
 * @class CQ.dam.Util
 */
CQ.dam.Util = function() {

    var assetEditorPath = null;

    return {

        alertNoSelection: function() {
            CQ.Ext.Msg.show({
                "title": CQ.I18n.getMessage("No Assets Selected"),
                "msg": CQ.I18n.getMessage("Please select one or multiple assets to perform this action."),
                "buttons": CQ.Ext.Msg.OK,
                "icon": CQ.Ext.MessageBox.INFO
            });
        },

        setAssetEditorPath: function(path) {
            assetEditorPath = path;
        },

        resultDblClick: function(args) {
            CQ.dam.Util.openAsset();
        },

        openAsset: function(editorPath, assetPath) {
            if (!editorPath) editorPath = assetEditorPath;
            var s = CQ.search.Util.getSelectedPaths();
            if (!assetPath) assetPath = s[0];
            if (!assetEditorPath || !assetPath) return;
            try {
                var url = CQ.HTTP.externalize(CQ.HTTP.encodePath(assetPath) + ".form.html" + editorPath + ".html", true);
                // disable multi assets for now
//                if (s.length > 1) {
//                    for (var i = 0; i < s.length; i++) {
//                        url = CQ.HTTP.addParameter(url, "path", s[i]);
//                    }
//                }
                CQ.shared.Util.open(url, null, "AssetEditorWindow");
            }
            catch (e) {
            }
        },

       downloadAsset: function(selection, path) {
            try {
                if (!selection) selection = [];
                else if (!path) path = selection[0]["jcr:path"];

                var url = CQ.HTTP.externalize(CQ.HTTP.encodePath(path) + ".assetdownload.zip", true);
                if (selection.length > 1) {
                    for (var i = 0; i < selection.length; i++) {
                        url = CQ.HTTP.addParameter(url, "path", CQ.HTTP.encodePath(selection[i]["jcr:path"]));
                    }
                }
                url = CQ.HTTP.addParameter(url, "_charset_", "utf-8");
                CQ.shared.Util.open(url, null, "AssetDownloadWindow");
            }
            catch (e) {
            }
        }        

    };
}();
/**
 * SWFUpload v2.0 by Jacob Roberts, Nov 2007, http://www.swfupload.org, http://linebyline.blogspot.com
 * -------- -------- -------- -------- -------- -------- -------- --------
 * SWFUpload is (c) 2006 Lars Huring and Mammon Media and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * See Changelog.txt for version history
 *
 * Development Notes:
 *  * This version of SWFUpload requires Flash Player 9.0.28 and should autodetect the correct flash version.
 *  * In Linux Flash Player 9 setting the post file variable name does not work. It is always set to "Filedata".
 *  * There is a lot of repeated code that could be refactored to single functions.  Feel free.
 *  * It's dangerous to do "circular calls" between Flash and JavaScript. I've taken steps to try to work around issues
 *     by having the event calls pipe through setTimeout.  However you should still avoid calling in to Flash from
 *     within the event handler methods.  Especially the "startUpload" event since it cannot use the setTimeout hack.
 */


/* *********** */
/* Constructor */
/* *********** */

CQ.dam.endorsed.SWFUpload = function (init_settings) {
    this.initSWFUpload(init_settings);
};

CQ.dam.endorsed.SWFUpload.prototype.initSWFUpload = function (init_settings) {
    // Remove background flicker in IE (read this: http://misterpixel.blogspot.com/2006/09/forensic-analysis-of-ie6.html)
    // This doesn't have anything to do with SWFUpload but can help your UI behave better in IE.
    try {
        document.execCommand('BackgroundImageCache', false, true);
    } catch (ex1) {
    }


    try {
        this.customSettings = {};   // A container where developers can place their own settings associated with this instance.
        this.settings = {};
        this.eventQueue = [];
        this.movieName = "CQ_dam_endorsed_SWFUpload_" + CQ.dam.endorsed.SWFUpload.movieCount++;
        this.movieElement = null;

        // Setup global control tracking
        CQ.dam.endorsed.SWFUpload.instances[this.movieName] = this;

        // Load the settings.  Load the Flash movie.
        this.initSettings(init_settings);
        this.loadFlash();

        this.displayDebugInfo();

    } catch (ex2) {
        this.debug(ex2);
    }
}

/* *************** */
/* Static thingies */
/* *************** */
CQ.dam.endorsed.SWFUpload.instances = {};
CQ.dam.endorsed.SWFUpload.movieCount = 0;
CQ.dam.endorsed.SWFUpload.QUEUE_ERROR = {
    QUEUE_LIMIT_EXCEEDED            : -100,
    FILE_EXCEEDS_SIZE_LIMIT         : -110,
    ZERO_BYTE_FILE                  : -120,
    INVALID_FILETYPE                : -130
};
CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR = {
    HTTP_ERROR                      : -200,
    MISSING_UPLOAD_URL              : -210,
    IO_ERROR                        : -220,
    SECURITY_ERROR                  : -230,
    UPLOAD_LIMIT_EXCEEDED           : -240,
    UPLOAD_FAILED                   : -250,
    SPECIFIED_FILE_ID_NOT_FOUND     : -260,
    FILE_VALIDATION_FAILED          : -270,
    FILE_CANCELLED                  : -280,
    UPLOAD_STOPPED                  : -290
};
CQ.dam.endorsed.SWFUpload.FILE_STATUS = {
    QUEUED       : -1,
    IN_PROGRESS  : -2,
    ERROR        : -3,
    COMPLETE     : -4,
    CANCELLED    : -5
};


/* ***************** */
/* Instance Thingies */
/* ***************** */
// init is a private method that ensures that all the object settings are set, getting a default value if one was not assigned.

CQ.dam.endorsed.SWFUpload.prototype.initSettings = function (init_settings) {
    // Upload backend settings
    this.addSetting("upload_url",               init_settings.upload_url,               "");
    this.addSetting("file_post_name",           init_settings.file_post_name,           "Filedata");
    this.addSetting("post_params",              init_settings.post_params,              {});

    // File Settings
    this.addSetting("file_types",               init_settings.file_types,               "*.*");
    this.addSetting("file_types_description",   init_settings.file_types_description,   "All Files");
    this.addSetting("file_size_limit",          init_settings.file_size_limit,          "1024");
    this.addSetting("file_upload_limit",        init_settings.file_upload_limit,        "0");
    this.addSetting("file_queue_limit",         init_settings.file_queue_limit,         "0");

    // Flash Settings
    this.addSetting("flash_url",                init_settings.flash_url,                "swfupload.swf");
    this.addSetting("flash_width",              init_settings.flash_width,              "1px");
    this.addSetting("flash_height",             init_settings.flash_height,             "1px");
    this.addSetting("flash_color",              init_settings.flash_color,              "#FFFFFF");

    // Debug Settings
    this.addSetting("debug_enabled", init_settings.debug,  false);

    // Event Handlers
    this.flashReady_handler         = CQ.dam.endorsed.SWFUpload.flashReady; // This is a non-overrideable event handler
    this.swfUploadLoaded_handler    = this.retrieveSetting(init_settings.swfupload_loaded_handler,      CQ.dam.endorsed.SWFUpload.swfUploadLoaded);
    
    this.fileDialogStart_handler    = this.retrieveSetting(init_settings.file_dialog_start_handler,     CQ.dam.endorsed.SWFUpload.fileDialogStart);
    this.fileQueued_handler         = this.retrieveSetting(init_settings.file_queued_handler,           CQ.dam.endorsed.SWFUpload.fileQueued);
    this.fileQueueError_handler     = this.retrieveSetting(init_settings.file_queue_error_handler,      CQ.dam.endorsed.SWFUpload.fileQueueError);
    this.fileDialogComplete_handler = this.retrieveSetting(init_settings.file_dialog_complete_handler,  CQ.dam.endorsed.SWFUpload.fileDialogComplete);
    
    this.uploadStart_handler        = this.retrieveSetting(init_settings.upload_start_handler,          CQ.dam.endorsed.SWFUpload.uploadStart);
    this.uploadProgress_handler     = this.retrieveSetting(init_settings.upload_progress_handler,       CQ.dam.endorsed.SWFUpload.uploadProgress);
    this.uploadError_handler        = this.retrieveSetting(init_settings.upload_error_handler,          CQ.dam.endorsed.SWFUpload.uploadError);
    this.uploadSuccess_handler      = this.retrieveSetting(init_settings.upload_success_handler,        CQ.dam.endorsed.SWFUpload.uploadSuccess);
    this.uploadComplete_handler     = this.retrieveSetting(init_settings.upload_complete_handler,       CQ.dam.endorsed.SWFUpload.uploadComplete);

    this.debug_handler              = this.retrieveSetting(init_settings.debug_handler,                 CQ.dam.endorsed.SWFUpload.debug);

    // Other settings
    this.customSettings = this.retrieveSetting(init_settings.custom_settings, {});
};

// loadFlash is a private method that generates the HTML tag for the Flash
// It then adds the flash to the "target" or to the body and stores a
// reference to the flash element in "movieElement".
CQ.dam.endorsed.SWFUpload.prototype.loadFlash = function () {
    var html, target_element, container;

    // Make sure an element with the ID we are going to use doesn't already exist
    if (document.getElementById(this.movieName) !== null) {
        return false;
    }

    // Get the body tag where we will be adding the flash movie
    try {
        target_element = document.getElementsByTagName("body")[0];
        if (typeof(target_element) === "undefined" || target_element === null) {
            this.debug('Could not find the BODY element. SWFUpload failed to load.');
            return false;
        }
    } catch (ex) {
        return false;
    }

    // Append the container and load the flash
    container = document.createElement("div");
    container.style.width = this.getSetting("flash_width");
    container.style.height = this.getSetting("flash_height");

    target_element.appendChild(container);
    container.innerHTML = this.getFlashHTML();  // Using innerHTML is non-standard but the only sensible way to dynamically add Flash in IE (and maybe other browsers)
};

// Generates the embed/object tags needed to embed the flash in to the document
CQ.dam.endorsed.SWFUpload.prototype.getFlashHTML = function () {
    var html = "";

    // Create Mozilla Embed HTML
    if (navigator.plugins && navigator.mimeTypes && navigator.mimeTypes.length) {
        // Build the basic embed html
        html = '<embed type="application/x-shockwave-flash" src="' + this.getSetting("flash_url") + '" width="' + this.getSetting("flash_width") + '" height="' + this.getSetting("flash_height") + '"';
        html += ' id="' + this.movieName + '" name="' + this.movieName + '" ';
        html += 'bgcolor="' + this.getSetting("flash_color") + '" quality="high" menu="false" flashvars="';

        html += this.getFlashVars();

        html += '" />';

        // Create IE Object HTML
    } else {

        // Build the basic Object tag
        html = '<object id="' + this.movieName + '" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="' + this.getSetting("flash_width") + '" height="' + this.getSetting("flash_height") + '">';
        html += '<param name="movie" value="' + this.getSetting("flash_url") + '">';

        html += '<param name="bgcolor" value="' + this.getSetting("flash_color") + '" />';
        html += '<param name="quality" value="high" />';
        html += '<param name="menu" value="false" />';

        html += '<param name="flashvars" value="' + this.getFlashVars() + '" />';
        html += '</object>';
    }

    return html;
};

// This private method builds the parameter string that will be passed
// to flash.
CQ.dam.endorsed.SWFUpload.prototype.getFlashVars = function () {
    // Build a string from the post param object
    var param_string = this.buildParamString();

    // Build the parameter string
    var html = "";
    html += "movieName=" + encodeURIComponent(this.movieName);
    html += "&uploadURL=" + encodeURIComponent(this.getSetting("upload_url"));
    html += "&params=" + encodeURIComponent(param_string);
    html += "&filePostName=" + encodeURIComponent(this.getSetting("file_post_name"));
    html += "&fileTypes=" + encodeURIComponent(this.getSetting("file_types"));
    html += "&fileTypesDescription=" + encodeURIComponent(this.getSetting("file_types_description"));
    html += "&fileSizeLimit=" + encodeURIComponent(this.getSetting("file_size_limit"));
    html += "&fileUploadLimit=" + encodeURIComponent(this.getSetting("file_upload_limit"));
    html += "&fileQueueLimit=" + encodeURIComponent(this.getSetting("file_queue_limit"));
    html += "&debugEnabled=" + encodeURIComponent(this.getSetting("debug_enabled"));

    return html;
};

CQ.dam.endorsed.SWFUpload.prototype.getMovieElement = function () {
    if (typeof(this.movieElement) === "undefined" || this.movieElement === null) {
        this.movieElement = document.getElementById(this.movieName);

        // Fix IEs "Flash can't callback when in a form" issue (http://www.extremefx.com.ar/blog/fixing-flash-external-interface-inside-form-on-internet-explorer)
        // Removed because Revision 6 always adds the flash to the body (inside a containing div)
        // If you insist on adding the Flash file inside a Form then in IE you have to make you wait until the DOM is ready
        // and run this code to make the form's ID available from the window object so Flash and JavaScript can communicate.
        //if (typeof(window[this.movieName]) === "undefined" || window[this.moveName] !== this.movieElement) {
        //  window[this.movieName] = this.movieElement;
        //}
    }

    return this.movieElement;
};

CQ.dam.endorsed.SWFUpload.prototype.buildParamString = function () {
    var post_params = this.getSetting("post_params");
    var param_string_pairs = [];
    var i, value, name;

    // Retrieve the user defined parameters
    if (typeof(post_params) === "object") {
        for (name in post_params) {
            if (post_params.hasOwnProperty(name)) {
                if (typeof(post_params[name]) === "string") {
                    param_string_pairs.push(encodeURIComponent(name) + "=" + encodeURIComponent(post_params[name]));
                }
            }
        }
    }

    return param_string_pairs.join("&");
};

// Saves a setting.  If the value given is undefined or null then the default_value is used.
CQ.dam.endorsed.SWFUpload.prototype.addSetting = function (name, value, default_value) {
    if (typeof(value) === "undefined" || value === null) {
        this.settings[name] = default_value;
    } else {
        this.settings[name] = value;
    }

    return this.settings[name];
};

// Gets a setting.  Returns empty string if not found.
CQ.dam.endorsed.SWFUpload.prototype.getSetting = function (name) {
    if (typeof(this.settings[name]) === "undefined") {
        return "";
    } else {
        return this.settings[name];
    }
};

// Gets a setting, if the setting is undefined then return the default value
// This does not affect or use the interal setting object.
CQ.dam.endorsed.SWFUpload.prototype.retrieveSetting = function (value, default_value) {
    if (typeof(value) === "undefined" || value === null) {
        return default_value;
    } else {
        return value;
    }
};


// It loops through all the settings and displays
// them in the debug Console.
CQ.dam.endorsed.SWFUpload.prototype.displayDebugInfo = function () {
    var key, debug_message = "";

    debug_message += "----- SWFUPLOAD SETTINGS     ----\nID: " + this.moveName + "\n";

    debug_message += this.outputObject(this.settings);

    debug_message += "----- SWFUPLOAD SETTINGS END ----\n";
    debug_message += "\n";

    this.debug(debug_message);
};
CQ.dam.endorsed.SWFUpload.prototype.outputObject = function (object, prefix) {
    var output = "", key;

    if (typeof(prefix) !== "string") {
        prefix = "";
    }
    if (typeof(object) !== "object") {
        return "";
    }

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            if (typeof(object[key]) === "object") {
                output += (prefix + key + ": { \n" + this.outputObject(object[key], "\t" + prefix) + prefix + "}" + "\n");
            } else {
                output += (prefix + key + ": " + object[key] + "\n");
            }
        }
    }

    return output;
};

/* *****************************
    -- Flash control methods --
    Your UI should use these
    to operate SWFUpload
   ***************************** */

CQ.dam.endorsed.SWFUpload.prototype.selectFile = function () {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SelectFile) === "function") {
        try {
            movie_element.SelectFile();
        }
        catch (ex) {
            this.debug("Could not call SelectFile: " + ex);
        }
    } else {
        this.debug("Could not find Flash element");
    }

};

CQ.dam.endorsed.SWFUpload.prototype.selectFiles = function () {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SelectFiles) === "function") {
        try {
            movie_element.SelectFiles();
        }
        catch (ex) {
            this.debug("Could not call SelectFiles: " + ex);
        }
    } else {
        this.debug("Could not find Flash element");
    }

};


/* Start the upload.  If a file_id is specified that file is uploaded. Otherwise the first
 * file in the queue is uploaded.  If no files are in the queue then nothing happens.
 * This call uses setTimeout since Flash will be calling back in to JavaScript
 */
CQ.dam.endorsed.SWFUpload.prototype.startUpload = function (file_id) {
    var self = this;
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.StartUpload) === "function") {
        setTimeout(
            function () {
                try {
                    movie_element.StartUpload(file_id);
                }
                catch (ex) {
                    self.debug("Could not call StartUpload: " + ex);
                }
            }, 0
        );
    } else {
        this.debug("Could not find Flash element");
    }

};

/* Cancels a the file upload.  You must specify a file_id */
CQ.dam.endorsed.SWFUpload.prototype.cancelUpload = function (file_id) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.CancelUpload) === "function") {
        try {
            movie_element.CancelUpload(file_id);
        }
        catch (ex) {
            this.debug("Could not call CancelUpload: " + ex);
        }
    } else {
        this.debug("Could not find Flash element");
    }

};

// Stops the current upload.  The file is re-queued.  If nothing is currently uploading then nothing happens.
CQ.dam.endorsed.SWFUpload.prototype.stopUpload = function () {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.StopUpload) === "function") {
        try {
            movie_element.StopUpload();
        }
        catch (ex) {
            this.debug("Could not call StopUpload: " + ex);
        }
    } else {
        this.debug("Could not find Flash element");
    }

};

/* ************************
 * Settings methods
 *   These methods change the settings inside SWFUpload
 *   They shouldn't need to be called in a setTimeout since they
 *   should not call back from Flash to JavaScript (except perhaps in a Debug call)
 *   and some need to return data so setTimeout won't work.
 */

/* Gets the file statistics object.  It looks like this (where n = number):
    {
        files_queued: n,
        complete_uploads: n,
        upload_errors: n,
        uploads_cancelled: n,
        queue_errors: n
    }
*/
CQ.dam.endorsed.SWFUpload.prototype.getStats = function () {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.GetStats) === "function") {
        try {
            return movie_element.GetStats();
        }
        catch (ex) {
            this.debug("Could not call GetStats");
        }
    } else {
        this.debug("Could not find Flash element");
    }
};
CQ.dam.endorsed.SWFUpload.prototype.setStats = function (stats_object) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetStats) === "function") {
        try {
            movie_element.SetStats(stats_object);
        }
        catch (ex) {
            this.debug("Could not call SetStats");
        }
    } else {
        this.debug("Could not find Flash element");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setCredentials = function(name, password) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetCredentials) === "function") {
        try {
            return movie_element.SetCredentials(name, password);
        }
        catch (ex) {
            this.debug("Could not call SetCredentials");
        }
    } else {
        this.debug("Could not find Flash element");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.getFile = function (file_id) {
    var movie_element = this.getMovieElement();
            if (typeof(file_id) === "number") {
                if (movie_element !== null && typeof(movie_element.GetFileByIndex) === "function") {
                    try {
                        return movie_element.GetFileByIndex(file_id);
                    }
                    catch (ex) {
                        this.debug("Could not call GetFileByIndex");
                    }
                } else {
                    this.debug("Could not find Flash element");
                }
            } else {
                if (movie_element !== null && typeof(movie_element.GetFile) === "function") {
                    try {
                        return movie_element.GetFile(file_id);
                    }
                    catch (ex) {
                        this.debug("Could not call GetFile");
                    }
                } else {
                    this.debug("Could not find Flash element");
                }
            }
};

CQ.dam.endorsed.SWFUpload.prototype.addFileParam = function (file_id, name, value) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.AddFileParam) === "function") {
        try {
            return movie_element.AddFileParam(file_id, name, value);
        }
        catch (ex) {
            this.debug("Could not call AddFileParam");
        }
    } else {
        this.debug("Could not find Flash element");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.removeFileParam = function (file_id, name) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.RemoveFileParam) === "function") {
        try {
            return movie_element.RemoveFileParam(file_id, name);
        }
        catch (ex) {
            this.debug("Could not call AddFileParam");
        }
    } else {
        this.debug("Could not find Flash element");
    }

};

CQ.dam.endorsed.SWFUpload.prototype.setUploadURL = function (url) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetUploadURL) === "function") {
        try {
            this.addSetting("upload_url", url);
            movie_element.SetUploadURL(this.getSetting("upload_url"));
        }
        catch (ex) {
            this.debug("Could not call SetUploadURL");
        }
    } else {
        this.debug("Could not find Flash element in setUploadURL");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setPostParams = function (param_object) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetPostParams) === "function") {
        try {
            this.addSetting("post_params", param_object);
            movie_element.SetPostParams(this.getSetting("post_params"));
        }
        catch (ex) {
            this.debug("Could not call SetPostParams");
        }
    } else {
        this.debug("Could not find Flash element in SetPostParams");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setFileTypes = function (types, description) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetFileTypes) === "function") {
        try {
            this.addSetting("file_types", types);
            this.addSetting("file_types_description", description);
            movie_element.SetFileTypes(this.getSetting("file_types"), this.getSetting("file_types_description"));
        }
        catch (ex) {
            this.debug("Could not call SetFileTypes");
        }
    } else {
        this.debug("Could not find Flash element in SetFileTypes");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setFileSizeLimit = function (file_size_limit) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetFileSizeLimit) === "function") {
        try {
            this.addSetting("file_size_limit", file_size_limit);
            movie_element.SetFileSizeLimit(this.getSetting("file_size_limit"));
        }
        catch (ex) {
            this.debug("Could not call SetFileSizeLimit");
        }
    } else {
        this.debug("Could not find Flash element in SetFileSizeLimit");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setFileUploadLimit = function (file_upload_limit) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetFileUploadLimit) === "function") {
        try {
            this.addSetting("file_upload_limit", file_upload_limit);
            movie_element.SetFileUploadLimit(this.getSetting("file_upload_limit"));
        }
        catch (ex) {
            this.debug("Could not call SetFileUploadLimit");
        }
    } else {
        this.debug("Could not find Flash element in SetFileUploadLimit");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setFileQueueLimit = function (file_queue_limit) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetFileQueueLimit) === "function") {
        try {
            this.addSetting("file_queue_limit", file_queue_limit);
            movie_element.SetFileQueueLimit(this.getSetting("file_queue_limit"));
        }
        catch (ex) {
            this.debug("Could not call SetFileQueueLimit");
        }
    } else {
        this.debug("Could not find Flash element in SetFileQueueLimit");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setFilePostName = function (file_post_name) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetFilePostName) === "function") {
        try {
            this.addSetting("file_post_name", file_post_name);
            movie_element.SetFilePostName(this.getSetting("file_post_name"));
        }
        catch (ex) {
            this.debug("Could not call SetFilePostName");
        }
    } else {
        this.debug("Could not find Flash element in SetFilePostName");
    }
};

CQ.dam.endorsed.SWFUpload.prototype.setDebugEnabled = function (debug_enabled) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.SetDebugEnabled) === "function") {
        try {
            this.addSetting("debug_enabled", debug_enabled);
            movie_element.SetDebugEnabled(this.getSetting("debug_enabled"));
        }
        catch (ex) {
            this.debug("Could not call SetDebugEnabled");
        }
    } else {
        this.debug("Could not find Flash element in SetDebugEnabled");
    }
};

/* *******************************
    Internal Event Callers
    Don't override these! These event callers ensure that your custom event handlers
    are called safely and in order.
******************************* */

/* This is the callback method that the Flash movie will call when it has been loaded and is ready to go.
   Calling this or showUI() "manually" will bypass the Flash Detection built in to SWFUpload.
   Use a ui_function setting if you want to control the UI loading after the flash has loaded.
*/
CQ.dam.endorsed.SWFUpload.prototype.flashReady = function () {
    // Check that the movie element is loaded correctly with its ExternalInterface methods defined
    var movie_element = this.getMovieElement();
    if (movie_element === null || typeof(movie_element.StartUpload) !== "function") {
        this.debug("ExternalInterface methods failed to initialize.");
        return;
    }
    
    var self = this;
    if (typeof(self.flashReady_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.flashReady_handler(); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("flashReady_handler event not defined");
    }
};

/*
    Event Queue.  Rather can call events directly from Flash they events are
    are placed in a queue and then executed.  This ensures that each event is
    executed in the order it was called which is not guarenteed when calling
    setTimeout.  Out of order events was especially problematic in Safari.
*/
CQ.dam.endorsed.SWFUpload.prototype.executeNextEvent = function () {
    var  f = this.eventQueue.shift();
    if (typeof(f) === "function") {
        f();
    }
}

/* This is a chance to do something before the browse window opens */
CQ.dam.endorsed.SWFUpload.prototype.fileDialogStart = function () {
    var self = this;
    if (typeof(self.fileDialogStart_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.fileDialogStart_handler(); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("fileDialogStart event not defined");
    }
};


/* Called when a file is successfully added to the queue. */
CQ.dam.endorsed.SWFUpload.prototype.fileQueued = function (file) {
    var self = this;
    if (typeof(self.fileQueued_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.fileQueued_handler(file); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("fileQueued event not defined");
    }
};


/* Handle errors that occur when an attempt to queue a file fails. */
CQ.dam.endorsed.SWFUpload.prototype.fileQueueError = function (file, error_code, message) {
    var self = this;
    if (typeof(self.fileQueueError_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() {  self.fileQueueError_handler(file, error_code, message); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("fileQueueError event not defined");
    }
};

/* Called after the file dialog has closed and the selected files have been queued.
    You could call startUpload here if you want the queued files to begin uploading immediately. */
CQ.dam.endorsed.SWFUpload.prototype.fileDialogComplete = function (num_files_selected) {
    var self = this;
    if (typeof(self.fileDialogComplete_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.fileDialogComplete_handler(num_files_selected); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("fileDialogComplete event not defined");
    }
};

/* Gets called when a file upload is about to be started.  Return true to continue the upload. Return false to stop the upload.
    If you return false then uploadError and uploadComplete are called (like normal).
    
    This is a good place to do any file validation you need.
    */
CQ.dam.endorsed.SWFUpload.prototype.uploadStart = function (file) {
    var self = this;
    if (typeof(self.fileDialogComplete_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.returnUploadStart(self.uploadStart_handler(file)); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("uploadStart event not defined");
    }
};

/* Note: Internal use only.  This function returns the result of uploadStart to
    flash.  Since returning values in the normal way can result in Flash/JS circular
    call issues we split up the call in a Timeout.  This is transparent from the API
    point of view.
*/
CQ.dam.endorsed.SWFUpload.prototype.returnUploadStart = function (return_value) {
    var movie_element = this.getMovieElement();
    if (movie_element !== null && typeof(movie_element.ReturnUploadStart) === "function") {
        try {
            movie_element.ReturnUploadStart(return_value);
        }
        catch (ex) {
            this.debug("Could not call ReturnUploadStart");
        }
    } else {
        this.debug("Could not find Flash element in returnUploadStart");
    }
};



/* Called during upload as the file progresses. Use this event to update your UI. */
CQ.dam.endorsed.SWFUpload.prototype.uploadProgress = function (file, bytes_complete, bytes_total) {
    var self = this;
    if (typeof(self.uploadProgress_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.uploadProgress_handler(file, bytes_complete, bytes_total); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("uploadProgress event not defined");
    }
};

/* Called when an error occurs during an upload. Use error_code and the SWFUpload.UPLOAD_ERROR constants to determine
   which error occurred. The uploadComplete event is called after an error code indicating that the next file is
   ready for upload.  For files cancelled out of order the uploadComplete event will not be called. */
CQ.dam.endorsed.SWFUpload.prototype.uploadError = function (file, error_code, message) {
    var self = this;
    if (typeof(this.uploadError_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.uploadError_handler(file, error_code, message); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("uploadError event not defined");
    }
};

/* This gets called when a file finishes uploading and the server-side upload script has completed and returned a 200
status code. Any text returned by the server is available in server_data.
**NOTE: The upload script MUST return some text or the uploadSuccess and uploadComplete events will not fire and the
upload will become 'stuck'. */
CQ.dam.endorsed.SWFUpload.prototype.uploadSuccess = function (file, server_data) {
    var self = this;
    if (typeof(self.uploadSuccess_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.uploadSuccess_handler(file, server_data); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("uploadSuccess event not defined");
    }
};

/* uploadComplete is called when the file is uploaded or an error occurred and SWFUpload is ready to make the next upload.
   If you want the next upload to start to automatically you can call startUpload() from this event. */
CQ.dam.endorsed.SWFUpload.prototype.uploadComplete = function (file) {
    var self = this;
    if (typeof(self.uploadComplete_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.uploadComplete_handler(file); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.debug("uploadComplete event not defined");
    }
};

/* Called by SWFUpload JavaScript and Flash functions when debug is enabled. By default it writes messages to the
   internal debug console.  You can override this event and have messages written where you want. */
CQ.dam.endorsed.SWFUpload.prototype.debug = function (message) {
    var self = this;
    if (typeof(self.debug_handler) === "function") {
        this.eventQueue[this.eventQueue.length] = function() { self.debug_handler(message); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    } else {
        this.eventQueue[this.eventQueue.length] = function() { self.debugMessage(message); };
        setTimeout(function () { self.executeNextEvent();}, 0);
    }
};


/* **********************************
    Default Event Handlers.
    These event handlers are used by default if an overriding handler is
    not defined in the SWFUpload settings object.
    
    JS Note: even though these are defined on the SWFUpload object (rather than the prototype) they
    are attached (read: copied) to a SWFUpload instance and 'this' is given the proper context.
   ********************************** */

/* This is a special event handler that has no override in the settings.  Flash calls this when it has
   been loaded by the browser and is ready for interaction.  You should not override it.  If you need
   to do something with SWFUpload has loaded then use the swfupload_loaded_handler setting.
*/
CQ.dam.endorsed.SWFUpload.flashReady = function () {
    try {
        this.debug("Flash called back and is ready.");

        if (typeof(this.swfUploadLoaded_handler) === "function") {
            this.swfUploadLoaded_handler();
        }
    } catch (ex) {
        this.debug(ex);
    }
};

/* This is a chance to something immediately after SWFUpload has loaded.
   Like, hide the default/degraded upload form and display the SWFUpload form. */
CQ.dam.endorsed.SWFUpload.swfUploadLoaded = function () {
};

/* This is a chance to do something before the browse window opens */
CQ.dam.endorsed.SWFUpload.fileDialogStart = function () {
};


/* Called when a file is successfully added to the queue. */
CQ.dam.endorsed.SWFUpload.fileQueued = function (file) {
};


/* Handle errors that occur when an attempt to queue a file fails. */
CQ.dam.endorsed.SWFUpload.fileQueueError = function (file, error_code, message) {
    try {
        switch (error_code) {
        case CQ.dam.endorsed.SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
            this.debug("Error Code: File too big, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case CQ.dam.endorsed.SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
            this.debug("Error Code: Zero Byte File, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case CQ.dam.endorsed.SWFUpload.QUEUE_ERROR.QUEUE_LIMIT_EXCEEDED:
            this.debug("Error Code: Upload limit reached, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case CQ.dam.endorsed.SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
            this.debug("Error Code: File extension is not allowed, Message: " + message);
            break;
        default:
            this.debug("Error Code: Unhandled error occured. Errorcode: " + error_code);
        }
    } catch (ex) {
        this.debug(ex);
    }
};

/* Called after the file dialog has closed and the selected files have been queued.
    You could call startUpload here if you want the queued files to begin uploading immediately. */
CQ.dam.endorsed.SWFUpload.fileDialogComplete = function (num_files_selected) {
};

/* Gets called when a file upload is about to be started.  Return true to continue the upload. Return false to stop the upload.
    If you return false then the uploadError callback is called and then uploadComplete (like normal).
    
    This is a good place to do any file validation you need.
    
    This is the only function that cannot be called on a setTimeout because it must return a value to Flash.
    You SHOULD NOT make any calls in to Flash (e.i, changing settings, getting stats, etc).  Flash Player bugs prevent
    calls in to Flash from working reliably.
*/
CQ.dam.endorsed.SWFUpload.uploadStart = function (file) {
    return true;
};

// Called during upload as the file progresses
CQ.dam.endorsed.SWFUpload.uploadProgress = function (file, bytes_complete, bytes_total) {
    this.debug("File Progress: " + file.id + ", Bytes: " + bytes_complete + ". Total: " + bytes_total);
};

/* This gets called when a file finishes uploading and the upload script has completed and returned a 200 status code.  Any text returned by the
server is available in server_data.  The upload script must return some text or uploadSuccess will not fire (neither will uploadComplete). */
CQ.dam.endorsed.SWFUpload.uploadSuccess = function (file, server_data) {
};

/* This is called last.  The file is uploaded or an error occurred and SWFUpload is ready to make the next upload.
    If you want to automatically start the next file just call startUpload from here.
*/
CQ.dam.endorsed.SWFUpload.uploadComplete = function (file) {
};

// Called by SWFUpload JavaScript and Flash functions when debug is enabled.
// Override this method in your settings to call your own debug message handler
CQ.dam.endorsed.SWFUpload.debug = function (message) {
    if (this.getSetting("debug_enabled")) {
        this.debugMessage(message);
    }
};

/* Called when an upload occurs during upload.  For HTTP errors 'message' will contain the HTTP STATUS CODE */
CQ.dam.endorsed.SWFUpload.uploadError = function (file, error_code, message) {
    try {
        switch (errcode) {
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.SPECIFIED_FILE_ID_NOT_FOUND:
            this.debug("Error Code: File ID specified for upload was not found, Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.HTTP_ERROR:
            this.debug("Error Code: HTTP Error, File name: " + file.name + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.MISSING_UPLOAD_URL:
            this.debug("Error Code: No backend file, File name: " + file.name + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.IO_ERROR:
            this.debug("Error Code: IO Error, File name: " + file.name + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.SECURITY_ERROR:
            this.debug("Error Code: Security Error, File name: " + file.name + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED:
            this.debug("Error Code: Upload limit reached, File name: " + file.name + ", File size: " + file.size + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.UPLOAD_FAILED:
            this.debug("Error Code: Upload Initialization exception, File name: " + file.name + ", File size: " + file.size + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.FILE_VALIDATION_FAILED:
            this.debug("Error Code: uploadStart callback returned false, File name: " + file.name + ", File size: " + file.size + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.FILE_CANCELLED:
            this.debug("Error Code: The file upload was cancelled, File name: " + file.name + ", File size: " + file.size + ", Message: " + msg);
            break;
        case CQ.dam.endorsed.SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED:
            this.debug("Error Code: The file upload was stopped, File name: " + file.name + ", File size: " + file.size + ", Message: " + msg);
            break;
        default:
            this.debug("Error Code: Unhandled error occured. Errorcode: " + errcode);
        }
    } catch (ex) {
        this.debug(ex);
    }
};



/* **********************************
    Debug Console
    The debug console is a self contained, in page location
    for debug message to be sent.  The Debug Console adds
    itself to the body if necessary.

    The console is automatically scrolled as messages appear.
    
    You can override this console (to use FireBug's console for instance) by setting the debug event method to your own function
    that handles the debug message
   ********************************** */
CQ.dam.endorsed.SWFUpload.prototype.debugMessage = function (message) {
    var exception_message, exception_values;

    if (typeof(message) === "object" && typeof(message.name) === "string" && typeof(message.message) === "string") {
        exception_message = "";
        exception_values = [];
        for (var key in message) {
            exception_values.push(key + ": " + message[key]);
        }
        exception_message = exception_values.join("\n");
        exception_values = exception_message.split("\n");
        exception_message = "EXCEPTION: " + exception_values.join("\nEXCEPTION: ");
        CQ.dam.endorsed.SWFUpload.Console.writeLine(exception_message);
    } else {
        CQ.dam.endorsed.SWFUpload.Console.writeLine(message);
    }
};

CQ.dam.endorsed.SWFUpload.Console = {};
CQ.dam.endorsed.SWFUpload.Console.writeLine = function (message) {
    var console, documentForm;

    try {
        console = document.getElementById("CQ_dam_endorsed_SWFUpload_Console");

        if (!console) {
            documentForm = document.createElement("form");
            document.getElementsByTagName("body")[0].appendChild(documentForm);

            console = document.createElement("textarea");
            console.id = "CQ_dam_endorsed_SWFUpload_Console";
            console.style.fontFamily = "monospace";
            console.setAttribute("wrap", "off");
            console.wrap = "off";
            console.style.overflow = "auto";
            console.style.width = "700px";
            console.style.height = "350px";
            console.style.margin = "5px";
            documentForm.appendChild(console);
        }

        console.value += message + "\n";

        console.scrollTop = console.scrollHeight - console.clientHeight;
    } catch (ex) {
        //alert("Exception: " + ex.name + " Message: " + ex.message);
    }
};
// Create user extension namespace
//Ext.namespace('Ext.ux');

/**
 * @class CQ.dam.SwfUploadPanel
 * @extends CQ.Ext.grid.EditorGridPanel
 * @deprecated
 *
 * Makes a Panel to provide the ability to upload multiple files using the SwfUpload flash script.
 *
 * @author Stephan Wentz
 * @author Michael Giddens (Original author)
 * @website http://www.brainbits.net
 * @created 2008-02-26
 * @version 0.5
 * 
 * known_issues 
 *      - Progress bar used hardcoded width. Not sure how to make 100% in bbar
 *      - Panel requires width / height to be set.  Not sure why it will not fit
 *      - when panel is nested sometimes the column model is not always shown to fit until a file is added. Render order issue.
 *      
 * @constructor
 * @param {Object} config The config object
 */
CQ.dam.SwfUploadPanel = CQ.Ext.extend(CQ.Ext.grid.EditorGridPanel, {

    /**
     * @cfg {Object} strings
     * All strings used by Ext.ux.SwfUploadPanel
     */
    strings: {
        text_add: CQ.I18n.getMessage('Add File(s)'),
        text_upload: CQ.I18n.getMessage('Upload File(s)'),
        text_cancel: CQ.I18n.getMessage('Cancel Upload'),
        text_clear: CQ.I18n.getMessage('Clear Queue'),
        text_progressbar: CQ.I18n.getMessage('Tip: Click on a filename to change it'),
        text_remove: CQ.I18n.getMessage('Remove File'),
        text_remove_sure: CQ.I18n.getMessage('Are you sure you want to remove this file from the queue?'),
        text_error: CQ.I18n.getMessage('Error'),
        text_uploading: CQ.I18n.getMessage('Uploading file: {0} ({1} of {2})'),
        header_filename: CQ.I18n.getMessage('Filename'),
        header_size: CQ.I18n.getMessage('Size'),
        header_status: CQ.I18n.getMessage('Status'),
        status: {
            0: CQ.I18n.getMessage('Queued'),
            1: CQ.I18n.getMessage('Uploading...'),
            2: CQ.I18n.getMessage('Completed'),
            3: CQ.I18n.getMessage('Error'),
            4: CQ.I18n.getMessage('Canceled')
        },
        error_queue_exceeded: CQ.I18n.getMessage('The selected file(s) exceed(s) the maximum number of {0} queued files.'),
        error_queue_slots_0: CQ.I18n.getMessage('There is no slot left'),
        error_queue_slots_1: CQ.I18n.getMessage('There is only one slot left'),
        error_queue_slots_2: CQ.I18n.getMessage('There are only {0} slots left'),
        error_size_exceeded: CQ.I18n.getMessage('The size of the selected file(s) exceeds the allowed limit of {0}.'),
        error_zero_byte_file: CQ.I18n.getMessage('Zero byte file selected.'),
        error_invalid_filetype: CQ.I18n.getMessage('Invalid filetype selected.'),
        error_file_not_found: CQ.I18n.getMessage('File not found 404.'),
        error_security_error: CQ.I18n.getMessage('Security Error. Not allowed to post to different URL.')
    },
    
    /**
     * @cfg {Boolean} single_select
     * True to allow multiple file selections, false for single file selection.
     * Please note that this doesn't affect the number of allowed files in the queue. 
     * Use the {@link #file_queue_limit} parameter to change the allowed number of files in the queue. 
     */
    single_select: false,
    /**
     * @cfg {Boolean} confirm_delete
     * Show a confirmation box on deletion of queued files.
     */ 
    confirm_delete: true,
    /**
     * @cfg {String} file_types
     * Allowed file types for the File Selection Dialog. Use semi-colon as a seperator for multiple file-types.
     */ 
    file_types: "*.*",                   // Default allow all file types
    /**
     * @cfg {String} file_types
     * A text description that is displayed to the user in the File Browser dialog.
     */ 
    file_types_description: "All Files", // 
    /**
     * @cfg {String} file_size_limit
     * The file_size_limit setting defines the maximum allowed size of a file to be uploaded. 
     * This setting accepts a value and unit. Valid units are B, KB, MB and GB. If the unit is omitted default is KB. 
     * A value of 0 (zero) is interpretted as unlimited.
     */ 
    file_size_limit: "1048576",          // Default size limit 100MB
    /**
     * @cfg {String} file_upload_limit
     * Defines the number of files allowed to be uploaded by SWFUpload. 
     * This setting also sets the upper bound of the {@link #file_queue_limit} setting. 
     * The value of 0 (zero) is interpretted as unlimited.
     */ 
    file_upload_limit: "0",              // Default no upload limit
    /**
     * @cfg {String} file_queue_limit
     * Defines the number of unprocessed files allowed to be simultaneously queued.
     * The value of 0 (zero) is interpretted as unlimited.
     */ 
    file_queue_limit: "0",               // Default no queue limit
    /**
     * @cfg {String} file_post_name
     * The file_post_name allows you to set the value name used to post the file.
     */ 
    file_post_name: "Filedata",          // Default name
    /**
     * @cfg {String} flash_url
     * The full, absolute, or relative URL to the Flash Control swf file.
     */ 
    flash_url: "swfupload_f9.swf",       // Default url, relative to the page url
    /**
     * @cfg {Boolean} debug
     * A boolean value that defines whether the debug event handler should be fired.
     */ 
    debug: false,

    // standard grid parameters
    autoExpandColumn: 'name',
    enableColumnResize: false,
    enableColumnMove: false,

    // private
    upload_cancelled: false,
        
    // private
    initComponent: function() {

        // link the global SWFUpload to the local dam SWFUpload (which is a different version)
        // see #21852 - DAM Finder: SmartFile/Image won't work 
        SWFUpload = CQ.dam.endorsed.SWFUpload;

        this.addEvents(
            /**
             * @event swfUploadLoaded
             * Fires after the Flash object has been loaded
             * @param {Ext.grid.GridPanel} grid This grid
             */
            'swfUploadLoaded',
            /**
             * @event swfUploadLoaded
             * Fires after a file has been qeueud
             * @param {Ext.grid.GridPanel} grid This grid
             * @param {Object} file The file object that produced the error
             */
            'fileQueued',
            /**
             * @event fileUploadError
             * Fires after an upload has been stopped or cancelled
             * @param {Ext.grid.GridPanel} grid This grid
             * @param {Object} file The file object that produced the error
             * @param {String} code The error code
             * @param {String} message Supplemental error message
             */
            'fileUploadError',
            /**
             * @event fileUploadSuccess
             * Fires after an upload has been successfully uploaded
             * @param {Ext.grid.GridPanel} grid This grid
             * @param {Object} file The file object that has been uploaded
             * @param {Object} data The response data of the upload request
             */
            'fileUploadSuccess',
            /**
             * @event fileUploadComplete
             * Fires after the upload cycle for one file finished
             * @param {Ext.grid.GridPanel} grid This grid
             * @param {Object} file The file object that has been uploaded
             */
            'fileUploadComplete',
            /**
             * @event fileUploadComplete
             * Fires after the upload cycle for all files in the queue finished
             * @param {Ext.grid.GridPanel} grid This grid
             */
            'allUploadsComplete',
            /**
             * @event fileUploadComplete
             * Fires after one or more files have been removed from the queue
             * @param {Ext.grid.GridPanel} grid This grid
             */
            'removeFiles',
            /**
             * @event fileUploadComplete
             * Fires after all files have been removed from the queue
             * @param {Ext.grid.GridPanel} grid This grid
             */
            'removeAllFiles'
        );
        
        this.rec = CQ.Ext.data.Record.create([
             {name: 'name'},
             {name: 'size'},
             {name: 'id'},
             {name: 'type'},
             {name: 'creationdate', type: 'date', dateFormat: 'm/d/Y'},
             {name: 'status'}
        ]);
        
        this.store = new CQ.Ext.data.Store({
            reader: new CQ.Ext.data.JsonReader({
                  id: 'id'
             }, this.rec)
        });

        this.clicksToEdit = 1;
        
        this.columns = [{
            id:'name', 
            header: this.strings.header_filename,
            dataIndex: 'name',
            editor: new CQ.Ext.form.TextField({
                allowBlank: false,
                vtype: "name"
            })
        },{
            id:'size', 
            header: this.strings.header_size, 
            width: 80, 
            dataIndex: 'size', 
            renderer: this.formatBytes
        },{
            id:'status', 
            header: this.strings.header_status, 
            width: 80, 
            dataIndex: 'status', 
            renderer: this.formatStatus.createDelegate(this)
        }];
        
        this.sm = new CQ.Ext.grid.RowSelectionModel({
            singleSelect: this.single_select
        });

        this.suo = new SWFUpload({
            upload_url: this.upload_url,
            post_params: this.post_params,
            file_post_name: this.file_post_name,  
            file_size_limit: this.file_size_limit,
            file_queue_limit: this.file_queue_limit,
            file_types: this.file_types,
            file_types_description: this.file_types_description,
            file_upload_limit: this.file_upload_limit,
            flash_url: this.flash_url,   
    
            // Event Handler Settings
            swfupload_loaded_handler: this.swfUploadLoaded.createDelegate(this),
    
            file_dialog_start_handler: this.fileDialogStart.createDelegate(this),
            file_queued_handler: this.fileQueue.createDelegate(this),
            file_queue_error_handler: this.fileQueueError.createDelegate(this),
            file_dialog_complete_handler: this.fileDialogComplete.createDelegate(this),
            
//            upload_start_handler: this.uploadStart.createDelegate(this),
            upload_progress_handler: this.uploadProgress.createDelegate(this),
            upload_error_handler: this.uploadError.createDelegate(this), 
            upload_success_handler: this.uploadSuccess.createDelegate(this),
            upload_complete_handler: this.uploadComplete.createDelegate(this),
    
            debug: this.debug,
            debug_handler: this.debugHandler
        });

        this.progress_bar = new CQ.Ext.ProgressBar({
            text: this.strings.text_progressbar
//            width: this.width - 7
        }); 

        this.tbar = [{
            text: this.strings.text_add,
            iconCls: 'SwfUploadPanel_iconAdd',
            handler: function() {
                if (this.single_select) {
                    this.suo.selectFile();
                }
                else {
                    this.suo.selectFiles();
                }
            },
            scope: this
        }, '->', {
            text: this.strings.text_cancel,
            id: 'cancel',
            iconCls: 'SwfUploadPanel_iconCancel',
            handler: this.stopUpload,
            scope: this,
            hidden: true
        }, {
            text: this.strings.text_upload,
            iconCls: 'SwfUploadPanel_iconUpload',
            handler: this.startUpload,
            scope: this,
            hidden: true
        }, {
            text: this.strings.text_clear,
            iconCls: 'SwfUploadPanel_iconClear',
            handler: this.removeAllFiles,
            scope: this,
            hidden: true
        }];
        
        this.bbar = [
            this.progress_bar
        ];
        
        this.addListener({
            keypress: {
                fn: function(e) {
                    if (this.confirm_delete) {
                        if(e.getKey() == e.DELETE) {
                            CQ.Ext.MessageBox.confirm(this.strings.text_remove,this.strings.text_remove_sure, function(e) {
                                if (e == 'yes') {
                                    this.removeFiles();
                                }
                            }, this);
                        }   
                    } else {
                        this.removeFiles(this);
                    }
                },
                scope: this
            },
            
            // Prevent the default right click to show up in the grid.
            contextmenu: function(e) {
                e.stopEvent();
            },
            
            render: {
                fn: function(){
                    this.resizeProgressBar();
                    
                    this.cancelBtn = this.getTopToolbar().items.items[2];
                    this.uploadBtn = this.getTopToolbar().items.items[3];
                    this.clearBtn = this.getTopToolbar().items.items[4];
        
                    this.on('resize', this.resizeProgressBar, this);
                },
                scope: this
            }
        });
        

        CQ.dam.SwfUploadPanel.superclass.initComponent.call(this);
    },

    // private
    resizeProgressBar: function() {
        this.progress_bar.setWidth(this.getBottomToolbar().el.getWidth() - 5);
        CQ.Ext.fly(this.progress_bar.el.dom.firstChild.firstChild).applyStyles("height: 16px");
    },
    
    /**
     * SWFUpload debug handler
     * @param {Object} line
     */
    debugHandler: function(line) {
        //todo: debug conf seems not to work, therefore commented
//        console.log(line);
    },
    
    /**
     * internal debug method to log the states of the widget
     * @param {Object} msg
     */
    logState: function(msg) {
        //console.log(msg);
    },
    /**
     * Formats file status
     * @param {Integer} status
     * @return {String}
     */
    formatStatus: function(status) {
        return this.strings.status[status];
    },
    
    /**
     * Formats raw bytes into kB/mB/GB/TB
     * @param {Integer} bytes
     * @return {String}
     */
    formatBytes: function(size) {
        if (!size) {
            size = 0;
        }
        var suffix = ["B", "KB", "MB", "GB"];
        var result = size;
        var size = parseInt(size, 10);
        result = size + " " + suffix[0];
        var loop = 0;
        while (size / 1024 > 1) {
            size = size / 1024;
            loop++;
        }
        result = Math.round(size) + " " + suffix[loop];

        return result;

        if(isNaN(bytes)) {
            return ('');
        }

        var unit, val;

        if(bytes < 999) {
            unit = 'B';
            val = (!bytes && this.progressRequestCount >= 1) ? '~' : bytes;
        }   else if(bytes < 999999) {
            unit = 'kB';
            val = Math.round(bytes/1000);
        }   else if(bytes < 999999999)  {
            unit = 'MB';
            val = Math.round(bytes/100000) / 10;
        }   else if(bytes < 999999999999)   {
            unit = 'GB';
            val = Math.round(bytes/100000000) / 10;
        }   else    {
            unit = 'TB';
            val = Math.round(bytes/100000000000) / 10;
        }

        return (val + ' ' + unit);
    },

    /**
     * SWFUpload swfUploadLoaded event
     */
    swfUploadLoaded: function() {
        this.logState('SWFUPLOAD LOADED');

        this.fireEvent('swfUploadLoaded', this);
    },
        
    /**
     * SWFUpload fileDialogStart event
     */
    fileDialogStart: function() {
        this.logState('FILE DIALOG START');

    },
    
    /**
     * Add file to store / grid
     * SWFUpload fileQueue event
     * @param {file}
     * @return {}
     */
    fileQueue: function(file) {
        this.logState('FILE QUEUE');

        file.status = 0;
        r = new this.rec(file);
        r.id = file.id;
        r.data.name = CQ.Ext.form.VTypes.makeName(r.data.name);
        this.store.add(r);
        this.fireEvent('fileQueued', this, file);
    },

    /**
     * Error when file queue error occurs
     * SWFUpload fileQueue event
     * @param {Object} a
     * @param {Object} code
     * @param {Object} queue_remaining
     */
    fileQueueError: function(file, code, message) {
        this.logState('FILE QUEUE ERROR');

        switch (code) {
            case -100: 
                var slots;
                switch(message) {
                    case '0':
                        slots = this.strings.error_queue_slots_0;
                        break;
                    case '1':
                        slots = this.strings.error_queue_slots_1;
                        break;
                    default:
                        slots = String.format(this.strings.error_queue_slots_2, message);
                }
                CQ.Ext.MessageBox.alert(this.strings.text_error, String.format(this.strings.error_queue_exceeded + ' ' + slots, this.file_queue_limit));
                break;
                
            case -110:
                CQ.Ext.MessageBox.alert(this.strings.text_error, String.format(this.strings.error_size_exceeded, this.formatBytes(this.file_size_limit * 1024)));
                break;

            case -120:
                CQ.Ext.MessageBox.alert(this.strings.text_error, this.strings.error_zero_byte_file);
                break;

            case -130:
                CQ.Ext.MessageBox.alert(this.strings.text_error, this.strings.error_invalid_filetype);
                break;
        }
    },

    /**
     * SWFUpload fileDialogComplete event
     * @param {Object} file_count
     */
    fileDialogComplete: function(file_count) {
        this.logState('FILE DIALOG COMPLETE');

        if (file_count > 0) {
            this.uploadBtn.show();
            this.clearBtn.show();
        }
    },

    /**
     * SWFUpload uploadStart event
     * @param {Object} file
     */
    uploadStart: function(file) {
        this.logState('UPLOAD START');
        
        
    },
    
    /**
     * SWFUpload uploadProgress event
     * @param {Object} file
     * @param {Object} current_size
     * @param {Object} total_size
     */
    uploadProgress: function(file, bytes_completed, bytes_total) {
        this.logState('UPLOAD PROGRESS');
//        console.log("uploadProgress: ", bytes_completed);
        
        this.store.getById(file.id).set('status', 1);       
        this.store.getById(file.id).commit();
        this.progress_bar.updateProgress(bytes_completed/bytes_total, String.format(this.strings.text_uploading, file.name, this.formatBytes(bytes_completed), this.formatBytes(bytes_total)));
    },

    /**
     * SWFUpload uploadError event
     * Show notice when error occurs
     * @param {Object, Integer, Integer}
     * @return {}
     */
    uploadError: function(file, error, code) {
        this.logState('UPLOAD ERROR');

        switch (error) {
            case -200:  
                CQ.Ext.MessageBox.alert(this.strings.text_error, this.strings.error_file_not_found);
                break;
                
            case -230:  
                CQ.Ext.MessageBox.alert(this.strings.text_error, this.strings.error_security_error);
                break;
                
            case -290:
                this.store.getById(file.id).set('status', 4);
                this.store.getById(file.id).commit();
                break;
        }

        this.fireEvent('fileUploadError', this, file, error, code);
    },

    /**
     * SWFUpload uploadSuccess event
     * @param {Object} file
     * @param {Object} response
     */ 
    uploadSuccess: function(file, response) {
        this.logState('UPLOAD SUCCESS');
        this.logState("Copying file from :" + this.upload_url  + this.file_post_name.substring(1) + " to :" + this.post_params.damPath + "/" + file.name);
        var name = this.getStore().getAt(file.index).data.name;
        if (!name) name = file.name;

        // check if parent folder(s) exist and create them if needed
        this.checkFolder(this.post_params.damPath);

        var url = this.upload_url  + this.file_post_name.substring(1);
        url = CQ.HTTP.addParameter(url, CQ.Sling.OPERATION, "move");
        url = CQ.HTTP.addParameter(url, "_charset_", "utf-8");
        url = CQ.HTTP.addParameter(url, ":dest", this.post_params.damPath + "/" + name);
        
        var cResponse = CQ.HTTP.post(url);
        var upResponse = CQ.utils.HTTP.buildPostResponseFromHTML(response);

        this.logState("isOk(cResponse):" + CQ.utils.HTTP.isOk(cResponse) + "; isOk(upResponse):" + CQ.utils.HTTP.isOk(upResponse));

        var data = {};//CQ.Ext.decode(response); 
        if (CQ.utils.HTTP.isOk(cResponse) && CQ.utils.HTTP.isOk(upResponse)) {
            //this.store.remove(this.store.getById(file.id));
            this.store.getById(file.id).set('status', 2);
        } else {
            this.store.getById(file.id).set('status', 3);
            this.store.getById(file.id).commit();
            if (data.msg) {
                CQ.Ext.MessageBox.alert(this.strings.text_error, data.msg);
            }
        }


        this.fireEvent('fileUploadSuccess', this, file, data);
    },

    /**
     * SWFUpload uploadComplete event
     * @param {Object} file
     */
    uploadComplete: function(file) {
        this.logState('UPLOAD COMPLETE');

        this.progress_bar.reset();
        this.progress_bar.updateText(this.strings.text_progressbar);
        
        if(this.suo.getStats().files_queued && !this.upload_cancelled) {
            this.suo.startUpload();
        } else {
            this.fireEvent('fileUploadComplete', this, file);
            
            this.allUploadsComplete();
        }
        
    },
    
    allUploadsComplete: function() {
        this.cancelBtn.hide();
        
        this.fireEvent('allUploadsComplete', this);
    },
    
    /**
     * SWFUpload setPostParams method
     * @param {String} name
     * @param {String} value
     */
    addPostParam: function( name, value ) {
        this.suo.settings.post_params[name] = value;
        this.suo.setPostParams( this.suo.settings.post_params );
    },
        
    /**
     * Start file upload
     * SWFUpload startUpload method
     */
    startUpload: function(a, b, noCheck) {
        if (!noCheck) {
            // check if assets of the same name are existing
            var node = CQ.HTTP.eval(this.path + ".1.json");
            var conflictNames = [];
            this.getStore().each(function() {
                if (this.data.status === 0) {
                    // only check "queued" assets
                    if (node[this.data.name]) {
                        conflictNames.push(this.data.name);
                    }
                }
            });
            if (conflictNames.length > 0) {
                var path = this.damPath;
                CQ.Ext.Msg.confirm(
                    CQ.I18n.getMessage("Name Conflict"),
                    CQ.I18n.getMessage("Older assets of the same name already exist in this location.") +
                        "<br>" +
                        CQ.I18n.getMessage("Do you want to replace the assets?") +
                        "<br><br>" + conflictNames.join("<br>"),
                    function(btnId) {
                        if (btnId == "yes") {
                            for (var i = 0 ; i < conflictNames.length; i++) {
                                var n = conflictNames[i];
                                // remove on both locations immediately
                                var contentPath = path.replace("/var/dam", "/content/dam");
                                CQ.HTTP.post(path + "/" + n, null, {":operation": "delete"});
                                CQ.HTTP.post(contentPath + "/" + n + "/jcr:content", null, {":operation": "delete"});
                            }
                            this.startUpload("x", "x", true);
                        }
                    },
                    this
                );
                return;
            }
        }

        this.logState('START UPLOAD');

        this.cancelBtn.show();
        this.uploadBtn.hide();
        this.clearBtn.hide();
        
        this.upload_cancelled = false;
        
        this.suo.startUpload();
    },
    
    /**
     * SWFUpload stopUpload method
     * @param {Object} file
     */
    stopUpload: function(file) {
        this.logState('STOP UPLOAD');

        this.suo.stopUpload();
        
        this.upload_cancelled = true;
        
        this.getStore().each(function() {
            if (this.data.status == 1) {
                this.set('status', 0);
                this.commit();
            }
        });

        this.cancelBtn.hide();
        if (this.suo.getStats().files_queued > 0) {
            this.uploadBtn.show();
            this.clearBtn.show();
        }

        this.progress_bar.reset();
        this.progress_bar.updateText(this.strings.text_progressbar);

    },
    
    /**
     * Delete one or multiple rows
     * SWFUpload cancelUpload method
     */
    removeFiles: function() {
        this.logState('REMOVE FILES');

        var selRecords = this.getSelections();
        for (var i=0; i < selRecords.length; i++) {
            if (selRecords[i].data.status != 1) {
                this.suo.cancelUpload(selRecords[i].id);
                this.store.remove(selRecords[i]);
            }
        }
        
        if (this.suo.getStats().files_queued == 0) {
            this.uploadBtn.hide();
            this.clearBtn.hide();
        }
        
        this.fireEvent('removeFiles', this);
    },
    
    /**
     * Clear the Queue
     * SWFUpload cancelUpload method
     */
    removeAllFiles: function() {
        this.logState('REMOVE ALL');

        // mark all internal files as cancelled
        var files_left = this.suo.getStats().files_queued;

        while (files_left > 0) {
            this.suo.cancelUpload();
            files_left = this.suo.getStats().files_queued;
        }
        
        this.store.removeAll();
        
        this.cancelBtn.hide();
        this.uploadBtn.hide();
        this.clearBtn.hide();
        
        this.fireEvent('removeAllFiles', this);
    },

    getParentPath: function(path) {
        return path.substring(0, path.lastIndexOf("/"));
    },

    checkFolder: function(folderPath) {
        var status = CQ.HTTP.get(folderPath).status;
        if (status == "404") {
            var parent = this.getParentPath(folderPath);
            this.checkFolder(parent);
            var params = { "./jcr:primaryType":"nt:folder" };
            CQ.HTTP.post(folderPath,
                undefined,
                params
            );
        }
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
 * @class CQ.dam.AssetEditor
 * @extends CQ.Ext.Panel
 * The Asset Editor used in DAM Admin.
 * @constructor
 * Creates a new Asset Editor.
 * @param {Object} config The config object
 */
CQ.dam.AssetEditor = CQ.Ext.extend(CQ.Ext.Panel, {

    /**
     * @cfg {String} contentPath
     * A relative path that will be added to the path of the asset. The content
     * of the form will be read from and submitted to the composite path.
     * Defaults to "/jcr:content/metadata".
     */

    /**
     * @cfg {Object} infoPanel
     * The config for the panel located by default on the left hand side wrapping
     * the thumbnail and general informations. See {@link CQ.Ext.Panel} for config
     * options.
     */

    /**
     * @cfg {Number} thumbnailWidth
     * The width used for the request selectors. For a default CQ 5 installation
     * the possible values are 48 (48), 140 (100) and 319 (319) - in brackets the
     * according values for {@link #thumbnailHeight}. Defaults to 319.
     */

    /**
     * @cfg {Number} thumbnailHeight
     * The height used for the request selectors. For a default CQ 5 installation
     * the possible values are 48 (48), 100 (140) and 319 (319) - in brackets the
     * according values for {@link #thumbnailWidth}. Defaults to 319.
     */

    /**
     * @cfg {String} thumbnailServlet
     * The name of the servlet used for the request selector. Defaults to "thumb".
     */

    /**
     * @cfg {String} thumbnailExtension
     * The extension of the thumbnail. Defaults to "png".
     */

    /**
     * @cfg {Number} renditionsMaxSize
     * The maximum file size to render thumbnails in the renditions tab - mainly for
     * the original thumbnail. Files of a bigger size will be shown with an icon.
     * Defaults to "300000" (300 KB).
     */

    /**
     * @cfg {Object} tabPanel
     * The config for the tab panel located by default on the right hand side that
     * contains the sub assets, renditions etc. See {@link CQ.Ext.TabPanel} for config
     * options.
     */

    /**
     * @cfg {Object} formPanel
     * The config for the form panel located in the center. See {@link CQ.Ext.form.FormPanel}
     * for config options.
     */

    /**
     * @cfg {Components[]} formItems
     * The components resp. its configs that will be added to the {@link #formPanel}.
     */
     
     /**
     * @cfg {Boolean} readOnly
     * Open the editor in read only mode. Defaults to false.
     */
    

    /**
     * @cfg {Array} bbar
     * <p>The bottom toolbar of the center panel. This can be a {@link CQ.Ext.Toolbar} object,
     * a toolbar config, an array of {@link CQ.Ext.Button}/button configs or strings
     * to be added to the toolbar.</p>
     * <p>Strings may be {@link #AssetEditor.SAVE}, {@link #AssetEditor.RESET} or
     * " " for a {@link CQ.Ext.Toolbar.Spacer}, "-" for a {@link CQ.Ext.Toolbar.Separator} or "->"
     *  for a {@link CQ.Ext.Toolbar.Fill}.</p>
     * <p>The default bbar consists of {@link CQ.Ext.Toolbar.Fill}, {@link #AssetEditor.SAVE} and
     *  {@link #AssetEditor.RESET}.</p>
     * <pre><code>

bbar: [
    CQ.dam.AssetEditor.EDIT_IMAGE,
    "-",
    {
        text: "Custom Button",
        handler: ...
    },
    "->",
    CQ.dam.AssetEditor.SAVE,
    CQ.dam.AssetEditor.RESET,
]
       </code></pre>
     */

    /**
     * @cfg {Array} bbarWest
     * <p>The bottom toolbar of the west panel. This can be a {@link CQ.Ext.Toolbar} object,
     * a toolbar config, an array of {@link CQ.Ext.Button}/button configs or strings
     * to be added to the toolbar.</p>
     * <p>Strings may be {@link #AssetEditor.EDIT_IMAGE} or " " for a {@link CQ.Ext.Toolbar.Spacer},
     * "-" for a {@link CQ.Ext.Toolbar.Separator} or "->" for a {@link CQ.Ext.Toolbar.Fill}.</p>
     * <p>The default bbar consists of {@link #AssetEditor.REFRESH_INFO}, {@link CQ.Ext.Toolbar.Fill} and
     * {@link #AssetEditor.EDIT_IMAGE}.</p>
     * <pre><code>

bbarWest: [
     CQ.dam.AssetEditor.REFRESH_INFO
     "->",
     {
         text: "Custom Button",
         handler: ...
     },
     "-",
    CQ.dam.AssetEditor.EDIT_IMAGE
]
       </code></pre>
     */

    /**
     * @cfg {Array/String} tabs
     * An array of {@link CQ.Ext.Panel Panel} configs, an array of strings,
     * or a single string. Strings may be {@link #AssetEditor.SUBASSETS}, {@link #AssetEditor.RENDITIONS},
     * {@link #AssetEditor.VERSIONS} or {@link #AssetEditor.REFERENCES}.
     * <pre><code>
tabs: CQ.dam.AssetEditor.SUBASSETS

tabs: [
    CQ.dam.AssetEditor.SUBASSETS,
    CQ.dam.AssetEditor.RENDITIONS,
    {
        text: "Custom Button",
        handler: ...
    }
]

 tabs: [
     CQ.dam.AssetEditor.SUBASSETS,
     {
         xtype: "panel",
         html: "Custom Panel"
     }
 ]
       </code></pre>
     */
    tabs: [],

    /**
     * @cfg {Number} renditionsInitialTimeout
     * The initial time in ms to wait to check if new renditions have been
     * created after e.g. editing images. Defaults to 20000 (20 Sek.)
     * @since 5.4
     */
    renditionsInitialTimeout: 20000,

    /**
     * @cfg {Number} renditionsTimeout
     * The interval time in ms to check for new renditions after the initial
     * check. Defaults to 10000 (10 Sek.)
     * @since 5.4
     */
    renditionsTimeout: 10000,

    /**
     * @cfg {Boolean} denyRenditionModifications
     * True to hide the buttons "Upload Rendition" and "Delete Rendition" on
     * the renditions tab (defaults to false).
     * @since 5.4
     */
    denyRenditionModifications: false,

    /**
     * @cfg {Boolean} denyThumbnailUpload
     * True to hide the button "Overwrite Thumbnails" on the renditions tab (defaults to false).
     * @since 5.4
     */
    denyThumbnailUpload: false,
    
    /**
     * @cfg {Boolean} scene7
     * True to show the link Upload to Scene7 in the information panel (defaults to false).
     */
    scene7: false,


    /**
     * @property parentPath
     * The path of the parent of the asset (the folder).
     */

    /**
     * Loads the content from the specified path or {@link CQ.Ext.data.Store Store}.
     * @param {String/CQ.Ext.data.Store} content The path or store
     * @private
     */
    loadContent: function(content) {
        var store;
        if (!content) content = this.pathEncoded + this.contentPath;
        if (typeof(content) == "string") {
            var url = CQ.HTTP.externalize(content);
            store = new CQ.data.SlingStore({"url": url + CQ.Sling.SELECTOR_INFINITY + CQ.HTTP.EXTENSION_JSON});
        } else if (content instanceof CQ.Ext.data.Store) {
            store = content;
        }
        if (store) {
            store.load({
                callback: this.processRecords,
                scope: this
            });
        }
        else {
            this.hideLoadMask();
        }
    },

    /**
     * Processes the specified records. This method should only be used as
     * a callback by the component's store when loading content.
     * @param {CQ.Ext.data.Record[]} recs The records
     * @param {Object} opts (optional) The options, such as the scope
     * @param {Boolean} success True if retrieval of records was
     *        successful
     * @private
     */
    processRecords: function(recs, opts, success) {
        var rec;
        if (success) {
            rec = recs[0];
        } else {
            CQ.Log.warn("CQ.dam.AssetEditor#processRecords: retrieval of records unsuccessful");
            rec = new CQ.data.SlingRecord();
            rec.data = {};
        }
        CQ.Log.debug("CQ.dam.AssetEditor#processRecords: processing records for fields");
        var fields = CQ.Util.findFormFields(this.formPanel);
        for (var name in fields) {
            for (var i = 0; i < fields[name].length; i++) {
                try {
                    if (fields[name][i].processPath) {
                        CQ.Log.debug("CQ.dam.AssetEditor#processRecords: calling processPath of field '{0}'", [name]);
                        fields[name][i].processPath(this.path);
                    }
                    if (!fields[name][i].initialConfig.ignoreData) {
                        CQ.Log.debug("CQ.dam.AssetEditor#processRecords: calling processRecord of field '{0}'", [name]);
                        fields[name][i].processRecord(rec, this.path);
                    }
                }
                catch (e) {
                    CQ.Log.debug("CQ.dam.AssetEditor#processRecords: {0}", e.message);
                }
            }
        }
        this.hideLoadMask();
        this.fireEvent("loadcontent", this, recs, opts, success);
    },

    /**
     * Method to add multiple name/value pairs as hidden fields. Format:
     * <pre><code>
{
    "hidden1Name": "hidden1Value",
    "hidden2Name": "hidden2Value"
}
       </code></pre>
     * @param {Object} params The names and values for the hidden fields
     */
    addHidden: function(params) {
        for (var name in params) {
            var hidden = CQ.Util.build({
                "xtype": "hidden",
                "name": name,
                "value": params[name],
                "ignoreData": true
            });
            this.formPanel.add(hidden);
        }
        this.formPanel.doLayout();
    },

    /**
     * @private
     */
    ok: function() {
        var ae = this;
        var config = {
            "success": function() {
                // timeout required for modified date in info
                window.setTimeout(function() {
                    ae.refreshGrid();
                    delete ae.info;
                    ae.refreshInfo();
                    ae.loadContent();
                }, 600);
            },
            "failure": function(panel, action) {
                ae.hideLoadMask();
                ae.notify(action.result ? action.result.Message : "");
            }
        };

        if (this.form.isValid()) {
            if (this.fireEvent("beforesubmit", this) === false){
                return false;
            }
            this.showSaveMask();
            this.form.items.each(function(field) {
                // clear fields with emptyText so emptyText is not submitted
                if (field.emptyText && field.el.dom.value == field.emptyText) {
                    field.setRawValue("");
                }
            });
            var action = new CQ.form.SlingSubmitAction(this.form, config);
            this.form.doAction(action);
        } else {
            CQ.Ext.Msg.show({
                title:CQ.I18n.getMessage('Validation Failed'),
                msg: CQ.I18n.getMessage('Verify the values of the marked fields.'),
                buttons: CQ.Ext.Msg.OK,
                icon: CQ.Ext.Msg.ERROR
            });
        }
    },

    /**
     * Returns an array of configs for the buttons
     * @type {Object[]}
     * @private
     */
    getButtonsConfig: function(buttons) {
        var b = [];
        if (typeof buttons == "string") {
            // buttons: CQ.dam.AssetEditor.SAVE  =>  buttons: [ CQ.dam.AssetEditor.SAVE ]
            buttons = [buttons];
        }
        for (var i=0; i < buttons.length; i++) {
            if (typeof buttons[i] == "string") {

                // save button
                if (buttons[i] == CQ.dam.AssetEditor.SAVE) {
                    var saveButton = new CQ.Ext.Button({
                        "text": CQ.I18n.getMessage("Save"),
                        "disabled": this.readOnly,
                        "cls": "cq-btn-save",
                        "scope": this,
                        "minWidth": CQ.dam.themes.AssetEditor.MIN_BUTTON_WIDTH,
                        "handler": function(button) {
                            this.ok();
                        }
                    });
                    b.push(saveButton);
                }

                // reset button
                else if (buttons[i] == CQ.dam.AssetEditor.RESET) {
                    var resetButton = new CQ.Ext.Button({
                        "text": CQ.I18n.getMessage("Reset"),
                        "disabled": this.readOnly,
                        "cls": "cq-btn-reset",
                        "scope": this,
                        "minWidth": CQ.dam.themes.AssetEditor.MIN_BUTTON_WIDTH,
                        "handler": function(button) {
                            this.loadMask = new CQ.Ext.LoadMask(this.formPanel.body);
                            this.loadMask.show();
                            this.loadContent();
                        }
                    });
                    b.push(resetButton);
                }

                // refresh info panel button
                else if (buttons[i] == CQ.dam.AssetEditor.REFRESH_INFO) {
                    var refreshButton = new CQ.Ext.Button({
                        "tooltip": CQ.I18n.getMessage("Refresh"),
                        "tooltipType": "title",
                        "iconCls":"cq-siteadmin-refresh",
                        "scope": this,
                        "handler": function(button) {
                            var now = new Date().getTime();
                            var m = new CQ.Ext.LoadMask(this.infoPanel.body);
                            m.show();
                            delete this.info;
                            this.refreshInfo();
                            this.refreshThumbnail();
                            window.setTimeout(function(){m.hide();}, this.getTimeoutTime(now));
                        }
                    });
                    b.push(refreshButton);
              }

                // edit image button
                else if (buttons[i] == CQ.dam.AssetEditor.EDIT_IMAGE) {
                    if (this.isImage()) {
                        var editButton = new CQ.Ext.Button({
                            "text": CQ.I18n.getMessage("Edit..."),
                            "disabled": this.readOnly,
                            "cls": "cq-btn-edit",
                            "scope": this,
                            "minWidth": CQ.dam.themes.AssetEditor.MIN_BUTTON_WIDTH,
                            "handler": function() {
                                var config = CQ.WCM.getDialogConfig({
                                    "name": "./original",
                                    "xtype": "html5smartimage",
                                    "cropParameter": "./crop",
                                    "rotateParameter": "./rotate",
                                    "disableFlush": true
                                });

                                var ae = this;
                                config = CQ.Util.applyDefaults(config, {
                                    "title": CQ.I18n.getMessage("Image Editor"),
                                    "y": 50,
                                    "width": 480,
                                    "formUrl": this.pathEncoded + ".assetimage.html",
                                    "responseScope": this,
                                    "success": function() {
                                        this.refreshOriginal();
                                    },
                                    "failure": function(form, action) {
                                        this.notifyFromAction(action);
                                    }
                                });
                                var dialog = CQ.Util.build(config, true);
                                dialog.on("beforesubmit", function() {
                                    ae.showSaveMask();
                                });
                                dialog.loadContent(this.pathEncoded + "/jcr:content/renditions");
                                dialog.show();
                            }
                        });
                        b.push(editButton);
                    }
                }
                else {
                    b.push(buttons[i]);
                }
            }
            else {
                if(buttons[i]) {
                    if (typeof buttons[i].handler == "string") {
                        buttons[i].handler = eval(buttons[i].handler);
                    }

                    b.push(CQ.Util.applyDefaults(buttons[i], {
                        "minWidth": CQ.dam.themes.AssetEditor.MIN_BUTTON_WIDTH,
                        "scope": this
                    }));
                }
            }
        }
        return b;
    },

    /**
     * Returns the HTML for the thumbnail
     * @param {Boolean} force true to force to request the image from the server
     * @param {Object} config The config object (optional)
     * @private
     */
    getThumbnailHtml: function(force, config) {
        var c = config ? config : this;
        var r = this.getInfo("renditions");
        var ck;
        try {
            ck = r["cq5dam.thumbnail." + c.thumbnailHeight + "." + c.thumbnailWidth + ".png"].ck;
        }
        catch(e) {
            ck = new Date().getTime();
        }
        var url = CQ.HTTP.externalize(this.pathEncoded) + "." + c.thumbnailServlet + "." +
                  c.thumbnailHeight + "." + c.thumbnailWidth + "." + ck + "." + c.thumbnailExtension;
        var xpath = CQ.HTTP.externalize(CQ.shared.XSS.getXSSValue(CQ.HTTP.encodePath(c.path)));
        return '<a href="' + xpath + '" target="_blank" title="' + xpath + '"><img src="' + CQ.shared.XSS.getXSSValue(url) + '"></a>';
    },

    /**
     * Returns if the asset is of a GIF, PNG or JPEG image.
     * @param {String} name
     * @private
     */
    isImage: function(name) {
        name = name ? name.toLowerCase() : this.fileName.toLowerCase();
        var is = false;
        var ext = ["jpg", "gif", "png", "jpeg"];
        for (var i = 0; i < ext.length; i++) {
            if (name.lastIndexOf("." + ext[i]) == name.length - ext[i].length - 1) {
                is = true;
                break;
            }
        }
        return is;
    },

    /**
     * Returns info of the specified name.
     * @param {String} name
     * @param {boolean} force True to request the info from the server
     * @private
     */
    getInfo: function(name, force) {
        if (force || !this.info) {
            var url = this.pathEncoded + ".4.json";
            url = CQ.HTTP.noCaching(url);
            var info = CQ.HTTP.eval(url);

            // missing: file size: not available in info

            var meta = info["jcr:content"]["metadata"];

            var mod = "";
            try {
                mod = new Date(info["jcr:content"]["jcr:lastModified"]);
                mod = CQ.wcm.SiteAdmin.formatDate(mod);
            }
            catch (e) {}


            var dim = "";
            if (meta["tiff:ImageWidth"] && meta["tiff:ImageLength"]) {
                dim = meta["tiff:ImageWidth"] + " &times; " + meta["tiff:ImageLength"];
            }

            var renditions = info["jcr:content"]["renditions"];
            for (var rName in renditions) {
                try {
                    // use mod date of the thumbnails as cache killer
                    var m = renditions[rName]["jcr:content"]["jcr:lastModified"];
                    renditions[rName].ck = new Date(m).getTime();
                }
                catch (e) {
                    renditions[rName].ck = new Date().getTime();
                }
            }

            this.info = {
                "title": meta["dc:title"] ? meta["dc:title"] : "",
                "lastModified": mod,
                "dimensions": dim,
                "metadata": meta,
                "subassets": info.subassets,
                "renditions": renditions
            };
        }
        return this.info[name];
    },

    /**
     * Returns an array of configs for the tabs
     * @type {Object[]}
     * @private
     */
    getTabsConfig: function(tabs) {
        var t = [];
        if (typeof tabs == "string") {
            // tabs: CQ.dam.AssetEditor.SUBASSETS  =>  tabs: [ CQ.dam.AssetEditor.SUBASSETS ]
            tabs = [tabs];
        }

        for (var i=0; i < tabs.length; i++) {
            if (typeof tabs[i] == "string") {

                // sub assets
                if (tabs[i] == CQ.dam.AssetEditor.SUBASSETS) {
                    var panel = new CQ.Ext.Panel({
                        "autoScroll": true,
                        "title": CQ.I18n.getMessage("Sub Assets"),
                        "cls": "cq-asseteditor-subassets",
                        "footer": true,
                        "bbar": []
                    });

                    var info = this.getInfo("subassets");
                    if (!info) {
                        // no sub assets
                        continue;
                    }
                    // sort sub assets (sorting is not guaranteed)
                    // xy-1.pdf, xy-2.pdf ...
                    var subs = [];
                    for (var name in info) {
                        if (name.indexOf("jcr:") < 0) {
                            info[name].name = name;
                            subs.push(info[name]);
                        }
                    }
                    subs.sort(function(a, b) {
                        if (a.name.length == b.name.length) {
                            return a.name < b.name ? -1 : 1;
                        }
                        else {
                            return a.name.length - b.name.length;
                        }
                    });

                    for (var j = 0; j < subs.length; j++) {
                        var saPath = CQ.HTTP.externalize(this.path + "/subassets/" + subs[j].name);
                        panel.add({
                            "xtype": "static",
                            "html": '<div class="cq-asseteditor-substab-item" onclick="CQ.wcm.DamAdmin.openAsset(\'' + saPath + '\');">' +
                                        '<div class="cq-asseteditor-substab-thumbnail">' +
                                            '<img src="' + CQ.HTTP.encodePath(saPath) + '.thumb.100.140.png"><br>' +
                                         '</div>' +
                                         '&ndash; ' + (j + 1) + ' &ndash;' +
                                     '</div>'
                        });
                    }
                    t.push(panel);
                }

                // renditions
                else if (tabs[i] == CQ.dam.AssetEditor.RENDITIONS) {
                    this.renditionsStore = new CQ.Ext.data.SimpleStore({
                        autoLoad: false,
                        idProperty: "name",
                        fields: ["name", "path", "imgUrl"]
                    });

                    this.renditionsDataView = new CQ.Ext.DataView({
                        "multiSelect": false,
                        "singleSelect": true,
                        "emptyText": CQ.I18n.getMessage("No Renditions Available"),
                        "store": this.renditionsStore,
                        "overClass": "x-view-over",
                        "itemSelector": ".cq-asseteditor-renditions-item",
                        "assetEditor": this,
                        "tpl":new CQ.Ext.XTemplate(
                            '<tpl for=".">' +
                                '<div class="cq-asseteditor-renditions-item">' +
                                     '<div class="cq-asseteditor-renditionstab-thumbnail" style="background-image:url({imgUrl});"></div>' +
                                     '{name}' +
                                 '</div>' +
                            '</tpl>'
                         ),
                        "listeners": {
                            "dblclick": function(dv, index) {
                                CQ.shared.Util.open(dv.getStore().getAt(index).data.path);
                            },
                            "selectionchange": function() {
                                if (!this.readOnly && this.assetEditor.deleteRenditionButton) {
                                    var sel = this.getSelectedRecords();
                                    if (sel.length > 0) {
                                        this.assetEditor.deleteRenditionButton.enable();
                                    }
                                    else {
                                        this.assetEditor.deleteRenditionButton.disable();
                                    }
                                }
                            }
                        }
                    });

                    this.renditionsPanel = new CQ.Ext.Panel({
                        "autoScroll": true,
                        "title": CQ.I18n.getMessage("Renditions"),
                        "cls": "cq-asseteditor-renditions",
                        "bbar": [
                            {
                                "xtype": "button",
                                "tooltip": CQ.I18n.getMessage("Refresh Renditions"),
                                "tooltipType": "title",
                                "iconCls":"cq-siteadmin-refresh",
                                "scope": this,
                                "handler": function() {
                                    var now = new Date().getTime();
                                    var m = new CQ.Ext.LoadMask(this.renditionsPanel.body);
                                    m.show();
                                    delete this.info;
                                    this.refreshRenditions();
                                    window.setTimeout(function(){m.hide();}, this.getTimeoutTime(now));
                                }
                            },
                            "->"
                        ],
                        "items": this.renditionsDataView
                    });

                    if (!this.denyThumbnailUpload) {
                        this.renditionsPanel.getBottomToolbar().add({
                            "xtype": "button",
                            "text": CQ.I18n.getMessage("Thumbnail..."),
                            "disabled": this.readOnly,
                            "tooltip": CQ.I18n.getMessage("Overwrite the existing thumbnails"),
                            "tooltipType": "title",
                            "scope": this,
                            "handler": function() {
                                var config = CQ.WCM.getDialogConfig({
                                    "xtype": "panel",
                                    "items": {
                                        "name": "image",
                                        "xtype": "fileuploadfield",
                                        "fieldLabel": CQ.I18n.getMessage("Image File"),
                                        "fieldDescription": CQ.I18n.getMessage("Upload an image file to create new thumbnails. Existing thumbnails will be overwritten.")
                                    }
                                });
                                var ae = this;
                                config = CQ.Util.applyDefaults(config, {
                                    "title": CQ.I18n.getMessage("Overwrite Thumbnails"),
                                    "formUrl": this.pathEncoded + ".assetthumbnails.html",
                                    "success": function() {
                                        ae.refresh();
                                        ae.hideLoadMask();
                                    },
                                    "failure": function(form, action) {
                                        ae.notifyFromAction(action);
                                    },
                                    "height": 200,
                                    "fileUpload": true,
                                    "params": {
                                        "dimensions": "140,100/48,48/319,319"
                                    }
                                });
                                var dialog = CQ.Util.build(config, true);
                                dialog.on("beforesubmit", function() {
                                    ae.showSaveMask();
                                });
                                dialog.show();
                            }
                        });
                    }

                    if (!this.denyRenditionModifications) {
                        this.renditionsPanel.getBottomToolbar().add({
                            "xtype": "button",
                            "text": CQ.I18n.getMessage("Upload..."),
                            "disabled": this.readOnly,
                            "tooltip": CQ.I18n.getMessage("Add or overwrite a rendition"),
                            "tooltipType": "title",
                            "scope": this,
                            "handler": function() {
                                var sel = this.renditionsDataView.getSelectedRecords();
                                var config = CQ.WCM.getDialogConfig({
                                    "xtype": "panel",
                                    "items": [
                                        {
                                            "name": "./*",
                                            "xtype": "fileuploadfield",
                                            "fieldLabel": CQ.I18n.getMessage("File")
                                        },{
                                            "name": "name",
                                            "xtype": "textfield",
                                            "value": sel[0] ? sel[0].get("name") : "", // overwrite selected rendition
                                            "fieldLabel": CQ.I18n.getMessage("Rendition Name"),
                                            "fieldDescription": CQ.I18n.getMessage("Leave emtpy to use the file name.")
                                        }
                                    ]
                                });
                                var ae = this;
                                config = CQ.Util.applyDefaults(config, {
                                    "title": CQ.I18n.getMessage("Add Or Overwrite a Rendition"),
                                    "formUrl": this.pathEncoded + "/jcr:content/renditions",
                                    "success": function(form) {
                                        var name = form.findField("name").getValue();
                                        if (name == "original") {
                                            ae.refreshOriginal();
                                        }
                                        else if (name == "cq5dam.thumbnail." + ae.thumbnailHeight + "." + ae.thumbnailWidth + ".png") {
                                            delete ae.info;
                                            ae.refreshThumbnail();
                                            ae.refreshRenditions();
                                            ae.hideLoadMask();
                                        }
                                        else {
                                            delete ae.info;
                                            ae.refreshRenditions();
                                            ae.hideLoadMask();
                                        }
                                        if (name == "cq5dam.thumbnail.48.48.png") {
                                            // self-contained condition: possilbe in any case where name!="original"
                                            ae.refreshGrid();
                                        }
                                    },
                                    "failure": function(form, action) {
                                        ae.notifyFromAction(action);
                                    },
                                    "height": 200,
                                    "fileUpload": true
                                });
                                var dialog = CQ.Util.build(config, true);
                                dialog.on("beforesubmit", function() {
                                    ae.showSaveMask();
                                    var nameField = dialog.getField("name");
                                    var name = nameField.getValue();
                                    if (name == "original") {
                                        // auto-create a version
                                        CQ.HTTP.post(ae.pathEncoded + ".version.html", null, {
                                            "cmd": "createVersion",
                                            "label": "Before overwriting original, " + new Date().format("d-M-Y H.i")
                                        });
                                    }

                                    if (name) {
                                        dialog.getField("./*").setName("./" + name);
                                    }
                                    nameField.disable();
                                });
                                dialog.show();
                            }
                        },
                        this.deleteRenditionButton = new CQ.Ext.Button({
                            "text": CQ.I18n.getMessage("Delete"),
                            "disabled": true,
                            "tooltip": CQ.I18n.getMessage("Delete the selected rendition"),
                            "tooltipType": "title",
                            "scope": this,
                            "handler": function() {
                                var sel = this.renditionsDataView.getSelectedRecords();
                                if (sel[0] && sel[0].get("name") == "original") {
                                    CQ.Ext.Msg.alert("", CQ.I18n.getMessage("It is not possible to delete the selected rendition."));
                                    return;
                                }
                                CQ.Ext.Msg.show({
                                    "title": CQ.I18n.getMessage("Delete Rendition"),
                                    "msg": CQ.I18n.getMessage("Are you sure to delete the selected rendition?"),
                                    "buttons": CQ.Ext.Msg.YESNO,
                                    "icon": CQ.Ext.MessageBox.QUESTION,
                                    "fn": function(btnId) {
                                        if (btnId == "yes") {
                                            var m = new CQ.Ext.LoadMask(this.renditionsPanel.body);
                                            window.setTimeout(function(){m.show();}, 1);
                                            var sel = this.renditionsDataView.getSelectedRecords();
                                            CQ.HTTP.post(sel[0].get("path"), null, {
                                                "_charset_":"utf-8",
                                                ":operation": "delete"
                                            });
                                            delete this.info;
                                            this.refreshRenditions();
                                            window.setTimeout(function(){m.hide();}, 100);
                                        }
                                    },
                                    "scope":this
                                });

                            }
                        }));
                    }

                    this.refreshRenditions();
                    t.push(this.renditionsPanel);
                }

                // versions
                else if (tabs[i] == CQ.dam.AssetEditor.VERSIONS) {

                    this.versionsStore = new CQ.Ext.data.Store({
                        "isLoaded": false,
                        "proxy": new CQ.Ext.data.HttpProxy({ "url":this.pathEncoded + ".version.json", "method":"GET" }),
                        "reader": new CQ.Ext.data.JsonReader(
                            { "totalProperty": "results", "root":"versions", "id":"id" },
                            [ "version", "id", "label", "comment", "name", "title", "created", "deleted", "renditionsPath" ]
                        ),
                        "baseParams": { "_charset_":"utf-8" }
                    });

                    this.versionsDataView = new CQ.Ext.DataView({
                        "multiSelect": false,
                        "singleSelect": true,
                        "emptyText": CQ.I18n.getMessage("No Versions Available"),
                        "store": this.versionsStore,
                        "overClass": "x-view-over",
                        "itemSelector": ".cq-asseteditor-versions-item",
                        "assetEditor": this,
                        "tpl":new CQ.Ext.XTemplate(
                            '<tpl for=".">',
                                '<div class="cq-asseteditor-versions-item">',
                                    '<table><tr>',
                                    '<tpl if="renditionsPath">',
                                        '<td><img class="cq-asseteditor-versions-thumbnail" src="{thumbnail}"></td>',
                                    '</tpl>',
                                    '<td>',
                                    '<span class="cq-asseteditor-versions-label">{label}</span><br>',
                                    '{[CQ.I18n.getMessage("Version")]} {version}<br>',
                                    '{created}<br>',
                                    '</td></tr></table>',
                                    '<tpl if="comment">',
                                        '<div class="cq-asseteditor-versions-comment">{comment}</div>',
                                    '</tpl>',
                                '</div>',
                            '</tpl>'
                        ),
                        "prepareData": function(data) {
                            data.created = CQ.wcm.SiteAdmin.formatDate(data.created);
                            data.thumbnail = CQ.HTTP.externalize(data.renditionsPath) + "/cq5dam.thumbnail.48.48.png";
                            return data;
                        },
                        "scope": this,
                        "listeners": {
                            "selectionchange": function() {
                                if (!this.assetEditor.readOnly) {
                                    this.assetEditor.restoreVersionButton.enable();
                                }
                            }
                        }
                    });

                    this.restoreVersionButton = new CQ.Ext.Button({
                        "disabled": true,
                        "tooltip": CQ.I18n.getMessage("Restore the selected version"),
                        "tooltipType": "title",
                        "text": CQ.I18n.getMessage("Restore"),
                        "scope": this,
                        "handler": function() {
                            var id;
                            try {
                                id = this.versionsDataView.getSelectedRecords()[0].data.id;
                            }
                            catch (e) {
                                return;
                            }
                            var ae = this;
                            CQ.Ext.MessageBox.confirm(
                                CQ.I18n.getMessage("Restore Version"),
                                CQ.I18n.getMessage("Are you sure to restore the selected version?"),
                                function(button, text) {
                                    if (button == "yes") {
                                        ae.showLoadMask(CQ.I18n.getMessage("Restoring version..."));
                                        CQ.HTTP.post(ae.pathEncoded + ".version.html",
                                            function(o, success) {
                                                if (success) {
                                                    ae.loadContent();
                                                    ae.refresh();
                                                }
                                                ae.hideLoadMask();
                                            },
                                            {
                                                "cmd": "restoreVersion",
                                                "id": id
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    });

                    this.versionsPanel = new CQ.Ext.Panel({
                        "title": CQ.I18n.getMessage("Versions"),
                        "cls": "cq-asseteditor-versions",
                        "autoScroll": true,
                        "items": [
                            this.versionsDataView
                        ],
                        "bbar": [
                            {
                                "xtype": "button",
                                "tooltip": CQ.I18n.getMessage("Refresh Versions"),
                                "tooltipType": "title",
                                "iconCls":"cq-siteadmin-refresh",
                                "scope": this,
                                "handler": function() {
                                    var now = new Date().getTime();
                                    var m = new CQ.Ext.LoadMask(this.versionsPanel.body);
                                    m.show();
                                    this.versionsStore.load();
                                    window.setTimeout(function(){m.hide();}, this.getTimeoutTime(now));
                                }
                            },
                            "->",
                            {
                                "xtype": "button",
                                "tooltip": CQ.I18n.getMessage("Create a new version"),
                                "tooltipType": "title",
                                "text": CQ.I18n.getMessage("Create..."),
                                "disabled": this.readOnly,
                                "scope": this,
                                "handler": function() {
                                    var config = CQ.WCM.getDialogConfig({
                                        "xtype": "panel",
                                        "items": [
                                            {
                                            "name": "label",
                                            "xtype":"textfield",
                                            "vtype": "name",
                                            "fieldLabel":CQ.I18n.getMessage("Version Label")
                                            },
                                            {
                                            "name": "comment",
                                            "xtype":"textarea",
                                            "fieldLabel":CQ.I18n.getMessage("Comment")
                                            }
                                         ]
                                    });
                                    var ae = this;
                                    config = CQ.Util.applyDefaults(config, {
                                        "title": CQ.I18n.getMessage("Create Version"),
                                        "height": 250,
                                        "formUrl": this.pathEncoded + ".version.html",
                                        "success": function() {
                                            ae.versionsStore.reload();
                                            ae.hideLoadMask();
                                        },
                                        "failure": function(form, action) {
                                            ae.notifyFromAction(action);
                                        },
                                        "params": {
                                            "cmd":"createVersion"
                                        }
                                    });
                                    var dialog = CQ.Util.build(config, true);
                                    dialog.on("beforesubmit", function() {
                                        ae.showLoadMask(CQ.I18n.getMessage("Creating version..."));
                                    });
                                    dialog.show();
                                }
                            },
                            this.restoreVersionButton
                        ]
                    });
                    t.push(this.versionsPanel);
                }

                // references
                else if (tabs[i] == CQ.dam.AssetEditor.REFERENCES) {

                        var url = "/bin/wcm/references.json";
                        url += "?path=" + encodeURIComponent(this.path);
                        url = CQ.HTTP.noCaching(url);
                        this.referencesStore = new CQ.Ext.data.Store({
                            "isLoaded": false,
                            "proxy": new CQ.Ext.data.HttpProxy({ "url": url, "method":"GET" }),
                            "reader": new CQ.Ext.data.JsonReader(
                                { "totalProperty": "results", "root": "pages", "id": "path" },
                                [ "path", "title", "references" ]
                            ),
                            "baseParams": { "_charset_":"utf-8" }
                        });

                        this.referencesDataView = new CQ.Ext.DataView({
                            "multiSelect": false,
                            "singleSelect": true,
                            "emptyText": CQ.I18n.getMessage("No References"),
                            "store": this.referencesStore,
                            "itemSelector": ".cq-asseteditor-references-item",
                            "tpl":new CQ.Ext.XTemplate(
                                '<tpl for=".">',
                                    '<div class="cq-asseteditor-references-item" onclick="CQ.wcm.SiteAdmin.openPage(\'{path}\');">',
                                        '<span class="cq-asseteditor-references-title">{title} </span>',
                                        '<span class="cq-asseteditor-references-quantity">({quantity})</span><br>',
                                        '<span class="cq-asseteditor-references-path">{path}</span>',
                                    '</div>',
                                '</tpl>'
                            ),
                            "prepareData": function(data) {
                                data.quantity = data.references.length;
                                return data;
                            }
                        });


                        this.referencesPanel = new CQ.Ext.Panel({
                            "title": CQ.I18n.getMessage("References"),
                            "cls": "cq-asseteditor-references",
                            "items": [this.referencesDataView],
                            "bbar": [
                                {
                                    "xtype": "button",
                                    "tooltip": CQ.I18n.getMessage("Refresh References"),
                                    "tooltipType": "title",
                                    "iconCls":"cq-siteadmin-refresh",
                                    "scope": this,
                                    "handler": function() {
                                        var now = new Date().getTime();
                                        var m = new CQ.Ext.LoadMask(this.referencesPanel.body);
                                        m.show();
                                        this.referencesStore.load();
                                        window.setTimeout(function(){m.hide();}, this.getTimeoutTime(now));
                                    }
                                }
                            ]
                        });
                        t.push(this.referencesPanel);
                    }
            }
            else {
                if(tabs[i]) {
                    t.push(CQ.Util.applyDefaults(t[i], {
                    }));
                }
            }
        }
        return t;
    },

    /**
     * Refreshes the info, the thumbnail and the renditions panel as well as
     * the grid of the DAM Admin in background.
     * @private
     */
    refresh: function() {
        delete this.info;
        this.refreshInfo();
        this.refreshThumbnail();
        this.refreshRenditions();
        this.refreshGrid();
    },

    /**
     * Refreshes the info panel
     * @private
     */
    refreshInfo: function() {
        this.titleInfo.updateText(this.getInfo("title"));
        this.lastModifiedInfo.updateText(this.getInfo("lastModified"));
        if (this.dimensionsInfo) this.dimensionsInfo.updateHtml(this.getInfo("dimensions"));
    },

    /**
     * Refreshes the thumbnail
     * @private
     */
    refreshThumbnail: function() {
        this.thumbnail.updateHtml(this.getThumbnailHtml());
    },

    /**
     * Refreshes the console grid if its paths is the parent path of this asset.
     */
    refreshGrid: function() {
        var path = CQ.Ext.getCmp(window.CQ_SiteAdmin_id).getCurrentPath();
        if (path == this.parentPath) {
            CQ.Ext.getCmp(window.CQ_SiteAdmin_id + "-grid").getStore().reload();
        }
    },

    /**
     * Renders the renditions
     * @private
     */
    refreshRenditions: function() {
        if (!this.renditionsPanel) return;
        var data = [];
        var info = this.getInfo("renditions");
        for (var name in info) {
            if (name.indexOf("jcr:") < 0) {
                var imgUrl;
                var path = CQ.HTTP.externalize(this.pathEncoded + "/jcr:content/renditions/" + CQ.HTTP.encodePath(name), true);
                if (info[name]["jcr:content"][":jcr:data"] < this.renditionsMaxSize // image (file) size exceeds max size
                        && (
                            (name == "original" && this.isImage() // original of a web image
                            || this.isImage(name) // thumbnail of any file type
                        ))) {

                    path = CQ.HTTP.setParameter(path, CQ.utils.HTTP.PARAM_NO_CACHE, info[name].ck);
                    imgUrl = path;
                }
                else {
                    // rendition is not a web image (e.g. original of a PDF) or a very big web image
                    imgUrl = CQ.HTTP.externalize("/libs/cq/ui/widgets/themes/default/icons/48x48/document.png.thumb.100.140.png");
                    if (this.isImage()) {
                        // very big web image: could be modified > add cache killer
                        path = CQ.HTTP.setParameter(path, CQ.utils.HTTP.PARAM_NO_CACHE, info[name].ck);
                    }
                }
                data.push([name, path, CQ.shared.XSS.getXSSValue(imgUrl)]);
            }
        }
        this.renditionsStore.loadData(data);
    },

    refreshOriginal: function() {
        var ae = this;
        // short time out required until correct width and height are
        // delivered correctly
        window.setTimeout(function() {
            var formerCk;
            try {
                // use mod date of the thumbnails as cache killer
                var m = ae.getInfo("renditions")["cq5dam.thumbnail.48.48.png"]["jcr:content"]["jcr:lastModified"];
                formerCk = new Date(m).getTime();
            }
            catch (e) {
                formerCk = new Date().getTime();
            }
            delete ae.info;

            // update width, height and file size in info, form and admin grid
            // update versions
            var meta = ae.getInfo("metadata");
            var fields = CQ.Util.findFormFields(ae.formPanel);
            if (meta["tiff:ImageWidth"] && fields["./tiff:ImageWidth"]) fields["./tiff:ImageWidth"][0].setValue(meta["tiff:ImageWidth"]);
            if (meta["tiff:ImageLength"] && fields["./tiff:ImageLength"]) fields["./tiff:ImageLength"][0].setValue(meta["tiff:ImageLength"]);
            ae.refreshInfo();
            ae.versionsStore.reload();
            ae.hideLoadMask();
            ae.refreshGrid();

            // wait for the new thumbnails
            ae.waitForRenditions(true, formerCk);

        }, 1000);
    },

    /**
     * wait until the new renditions are build
     * @private
     */
    waitForRenditions: function(initialCall, formerCk, loadMaskR, loadMaskT) {
        // thumbnails are created in a workflow: wait until mod date changes
        var ae = this;
        if (initialCall) {
            // first call

            // mask renditions tab
            loadMaskR = new CQ.Ext.LoadMask(this.renditionsPanel.body, {
                "msg": CQ.I18n.getMessage("Processing renditions..."),
                "removeMask": true
            });
            loadMaskR.show();

            // mask thumbnail
            loadMaskT = new CQ.Ext.LoadMask(this.thumbnail.getEl(), {
                "msg": "&nbsp;",
                "removeMask": true
            });
            loadMaskT.show();



            this.renditionsTimeoutId = window.setTimeout(function() {
                ae.waitForRenditions(false, formerCk, loadMaskR, loadMaskT);
            }, this.renditionsInitialTimeout);
        }
        else {
            var url = this.pathEncoded + "/jcr:content/renditions/cq5dam.thumbnail.48.48.png/jcr:content.json";
            url = CQ.HTTP.noCaching(url);
            var tInfo = CQ.HTTP.eval(url);

            var ck;
            try {
                var m = tInfo["jcr:lastModified"];
                ck = new Date(m).getTime();
            }
            catch (e) {
                ck = new Date().getTime();
            }

            if (ck == formerCk) {
                this.renditionsTimeoutId = window.setTimeout(function() {
                    ae.waitForRenditions(false, formerCk, loadMaskR, loadMaskT);
                }, this.renditionsTimeout);
            }
            else {
                // new renditions available
                delete this.info;
                this.refreshRenditions();
                loadMaskR.hide();
                loadMaskT.hide();
                this.refreshThumbnail();
                this.refreshGrid();
            }
        }
    },

    /**
     * Shows the saving mask with the given message.
     * @param msg {String} The message (optional)
     */
    showSaveMask: function(msg) {
        this.showLoadMask(msg || CQ.I18n.getMessage("Saving..."));
    },

    /**
     * Shows the loading mask with the given message.
     * @param msg {String} The message (optional)
     */
    showLoadMask: function(msg) {
        // apply mask to this.body in order to be able to close a tab in case
        // the mask is unexpected not hidden
        this.loadMask = new CQ.Ext.LoadMask(this.body, {
            "msg": msg || CQ.I18n.getMessage("Loading...")
        });
        this.loadMask.show();
    },

    /**
     * Hides the loading mask
     */
    hideLoadMask: function() {
        if (this.loadMask) this.loadMask.hide();
    },

    /**
     * Hides the saving mask
     * @deprecated
     */
    hideSaveMask: function() {
        this.hideLoadMask();
    },


    // to avoid flickering display loading messages at least 600 ms
    getTimeoutTime: function(time) {
        var delta = new Date().getTime() - time;
        var min = 600;
        if (delta > min) return 1;
        return min - delta;
    },

    /**
     * Displays the specified error message and hides the load mask.
     * @param msg {String} The error message (optional)
     */
    notify: function(msg) {
        this.hideLoadMask();
        if (!msg) msg = CQ.I18n.getMessage("Unspecified error");
        CQ.Notification.notify(CQ.I18n.getMessage("Error"), msg);
    },

    /**
     * Displays the specified error message extractet from the HTML provided by
     * <code>action.response.responseText</code>.
     * @param action {object} The HTML response
     */
    notifyFromAction: function(action) {
        var msg;
        try {
            var response = CQ.HTTP.buildPostResponseFromHTML(action.response.responseText);
            msg = response.headers[CQ.HTTP.HEADER_MESSAGE];
        } catch(e) {
            CQ.Log.warn("CQ.dam.AssetEditor#notifyFromAction: " + e.message);
        }
        this.notify(msg);
    },

    /**
     * Applies readOnly cfg recursively to all items contained in the specified items.
     * @param items
     * @private
     */
    applyReadOnly: function(items) {
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i].items) {
                    // assuming is panel
                    this.applyReadOnly(items[i].item);
                }
                items[i].readOnly = true;
            }
            catch (e) {
                CQ.Log.warn("CQ.dam.AssetEditor#applyReadOnly: " + e.message);
            }
        }
    },

    constructor: function(config) {
        var ae = this;
        this.path = config.path;
        this.pathEncoded = CQ.HTTP.encodePath(this.path);
        if (config.path) {
            this.fileName = config.path.substring(config.path.lastIndexOf("/") + 1);
            this.parentPath = config.path.substring(0, config.path.lastIndexOf("/"));
        }
        this.readOnly = config.readOnly || !CQ.User.getCurrentUser().hasPermissionOn("modify", this.path);

        config = CQ.Util.applyDefaults(config, {
            "layout": "border",
            "closable": true,
            "header": false,
            "border": false,
            "cls": "cq-asseteditor",
            "contentPath": "/jcr:content/metadata",
            "title": CQ.shared.XSS.getXSSValue(CQ.shared.Util.ellipsis(this.fileName, 30)),
            "thumbnailWidth": 319,
            "thumbnailHeight": 319,
            "thumbnailServlet": "thumb",
            "thumbnailExtension": "png",
            "renditionsMaxSize": 300000,
            "bbar": [
                "->",
                CQ.dam.AssetEditor.SAVE,
                CQ.dam.AssetEditor.RESET
            ],
            "bbarWest": [
                CQ.dam.AssetEditor.REFRESH_INFO,
                "->",
                CQ.dam.AssetEditor.EDIT_IMAGE
            ],
            "tabs": [
                CQ.dam.AssetEditor.SUBASSETS,
                CQ.dam.AssetEditor.RENDITIONS,
                CQ.dam.AssetEditor.VERSIONS,
                CQ.dam.AssetEditor.REFERENCES
            ]
        });


        // ---------------------------------------------------------------------
        // info panel (west)
        // ---------------------------------------------------------------------

        var items = [];

        this.thumbnail = new CQ.Static({
            "cls": "cq-asseteditor-thumbnail",
            "html": this.getThumbnailHtml(false, config),
            "colspan": 2
        });
        items.push(this.thumbnail);

        this.titleInfo = new CQ.Static({
           "cls": "cq-asseteditor-title",
           "text": this.getInfo("title"),
           "colspan": 2
        });
        items.push(this.titleInfo);

        items.push(new CQ.Static({
            "cls": "infoLabel",
            "small": true,
            "text": CQ.I18n.getMessage("Name")
        }));
        items.push(new CQ.Static({
            "small": true,
            "right": true,
            "text": this.fileName
        }));

        if (config.assetInfo.size) {
            items.push(new CQ.Static({
                "cls": "infoLabel",
                "small": true,
                "text": CQ.I18n.getMessage("Size")
            }));
            this.sizeInfo = new CQ.Static({
                "small": true,
                "right": true,
                "text": CQ.Util.formatFileSize(config.assetInfo.size)
            });
            items.push(this.sizeInfo);
        }

        items.push(new CQ.Static({
            "cls": "infoLabel",
            "small": true,
            "text": CQ.I18n.getMessage("Modified")
        }));
        this.lastModifiedInfo = new CQ.Static({
            "small": true,
            "right": true,
            "text": config.assetInfo.lastModified ? CQ.wcm.SiteAdmin.formatDate(new Date(config.assetInfo.lastModified)) : ""
        });
        items.push(this.lastModifiedInfo);

        if (config.assetInfo.mime) {
            items.push(new CQ.Static({
                "cls": "infoLabel",
                "small": true,
                "text": CQ.I18n.getMessage("Type")
            }));
            this.typeInfo = new CQ.Static({
                "small": true,
                "right": true,
                "text": config.assetInfo.mime
            });
            items.push(this.typeInfo);
        }

        if (config.assetInfo.width && config.assetInfo.height) {
            items.push(new CQ.Static({
                "cls": "infoLabel",
                "small": true,
                "text": CQ.I18n.getMessage("Dimensions")
            }));
            this.dimensionsInfo = new CQ.Static({
                "small": true,
                "right": true,
                "html": config.assetInfo.width + ' &times; ' + config.assetInfo.height
            });
            items.push(this.dimensionsInfo);
        }

        items.push(new CQ.Static({
            "colspan": 2,
            "small": true,
            "right": true,
            "cls": "cq-asseteditor-download",
            "html": '<a href="' + CQ.HTTP.externalize(CQ.shared.XSS.getXSSValue(this.pathEncoded)) + '" target="_blank" title="' + CQ.shared.XSS.getXSSValue(this.path) + '">' + CQ.I18n.getMessage("Download") + '</a>'
        }));

		if(config.scene7) {
            items.push(new CQ.Static({
				"colspan": 2,
				"id": config.id + "-publishLink",
				"small": true,
				"right": true,
				"cls": "cq-asseteditor-download",
				"html": '<a onclick="CQ.scene7.triggerWorkflow(\'' + config.id + '\', \'' + CQ.HTTP.externalize(CQ.shared.XSS.getXSSValue(this.pathEncoded)) + '\', \'' + config.scene7Type + '\')">' + (this.info.metadata["dam:scene7ID"] ? CQ.I18n.getMessage("Re-publish to Scene7") : CQ.I18n.getMessage("Publish to Scene7")) + '</a>'
			}));
		}

        var w = config.thumbnailWidth + CQ.dam.themes.AssetEditor.WEST_PANEL_PADDING_WIDTH;
        var infoPanelConfig = CQ.Util.applyDefaults(config.infoPanel, {
            "xtype": "panel",
            "region": "west",
            "width": w < CQ.dam.themes.AssetEditor.WEST_PANEL_MIN_WIDTH ? CQ.dam.themes.AssetEditor.WEST_PANEL_MIN_WIDTH : w,
            "split": true,
            "collapsible":true,
            "collapseMode":"mini",
            "hideCollapseTool": true,
            "autoScroll": true,
            "margins":"5 0 5 5",
            "cls": "cq-asseteditor-west",
            "footer": true,
            "layout": "table",
            "layoutConfig": {
                columns: 2
            },
            "items": items,
            "bbar": this.getButtonsConfig(config.bbarWest)
        });
        this.infoPanel = CQ.Util.build(infoPanelConfig);

        // ---------------------------------------------------------------------
        // tab panel (east)
        // ---------------------------------------------------------------------

        this.renditionsMaxSize = config.renditionsMaxSize;
        this.denyThumbnailUpload = config.denyThumbnailUpload;
        this.denyRenditionModifications = config.denyRenditionModifications;

        var tabs = this.getTabsConfig(config.tabs);
        if (tabs.length > 0) {
            var tabPanelConfig = CQ.Util.applyDefaults(config.tabPanel, {
                "xtype": "tabpanel",
                "region": "east",
                "width": CQ.dam.themes.AssetEditor.EAST_PANEL_WIDTH,
                "split": true,
                "collapsible":true,
                "collapseMode":"mini",
                "hideCollapseTool": true,
                "margins":"5 5 5 0",
                "enableTabScroll": true,
                "cls": "cq-asseteditor-east",
                "activeTab": 0,
                "plain": true,
                "footer": false,
                "items": tabs,
                "listeners": {
                    "tabchange": function (tabpanel, panel) {
                        panel.doLayout();
                        if (panel == ae.versionsPanel) {
                            if (!ae.versionsStore.isLoaded) {
                                ae.versionsStore.reload();
                                ae.versionsStore.isLoaded = true;
                            }
                        }
                        else if (panel == ae.referencesPanel) {
                            if (!ae.referencesStore.isLoaded) {
                                ae.referencesStore.reload();
                                ae.referencesStore.isLoaded = true;
                            }
                        }

                    }
                }
            });
            this.tabPanel = CQ.Util.build(tabPanelConfig);
        }


        // ---------------------------------------------------------------------
        // form panel (center)
        // ---------------------------------------------------------------------

        if (this.readOnly) this.applyReadOnly(config.formItems);

        var formConfig = CQ.Util.applyDefaults(config.formPanel, {
            "region": "center",
            "items": config.formItems,
            "buttonAlign": "right",
            "autoScroll": true,
            "cls": "cq-asseteditor-center",
            "margins": this.tabPanel ? "5 0 5 0" : "5 5 5 0",
            "labelWidth": CQ.dam.themes.AssetEditor.LABEL_WIDTH,
            "defaults": {
//                "msgTarget": CQ.themes.Dialog.MSG_TARGET,
                "anchor": CQ.Ext.isIE6 ? "92%" : CQ.Ext.isIE7 ? "96%" : "100%",
                "stateful": false
            },
            "bbar": this.getButtonsConfig(config.bbar),
            "cleanUp": function() {
                // used in TagInputField when default namespace is undefined and 
                // a new label has been entered (bug 29859)
                ae.hideLoadMask();
            }
        });
        // delete the bbar cfg - otherwise would be used as buttons config for the main panel
        delete config.bbar;

        this.formPanel = new CQ.Ext.form.FormPanel(formConfig);
        this.form = this.formPanel.getForm();

        this.form.url = this.pathEncoded + config.contentPath + CQ.HTTP.EXTENSION_HTML;

        if (!config.params) {
            config.params = new Object();
        }
        if (config.params[CQ.Sling.CHARSET] == undefined) {
            config.params[CQ.Sling.CHARSET] = CQ.Dialog.DEFAULT_ENCODING;
        }
        if (config.params[CQ.Sling.STATUS] == undefined) {
            config.params[CQ.Sling.STATUS] = CQ.Sling.STATUS_BROWSER;
        }
        this.addHidden(config.params);

        config.items = [];
        config.items.push(this.infoPanel);
        if (this.tabPanel) config.items.push(this.tabPanel);
        config.items.push(this.formPanel);

        CQ.dam.AssetEditor.superclass.constructor.call(this, config);
    },

    initComponent: function(){
        CQ.dam.AssetEditor.superclass.initComponent.call(this);

        //todo: find out why some panels need an extra doLayout
        var ae = this;
        window.setTimeout(function() {
            ae.infoPanel.doLayout();
            ae.formPanel.doLayout(); // required for empty tag fields
            if (ae.tabPanel) ae.tabPanel.doLayout();
            try {
                //todo: does not work reliably in IE
                ae.loadMask = new CQ.Ext.LoadMask(ae.formPanel.body);
                ae.loadMask.show();
            }
            catch(e) {}
        }, 1);

        this.loadContent(); // call after building loadMask (loadContent will hide the mask)

        this.on("close", function() {
            // stop refreshing of renditions when closing the tab of this editor
            window.clearTimeout(this.renditionsTimeoutId);
        });
    }
    
    
});

CQ.Ext.reg("asseteditor", CQ.dam.AssetEditor);

/**
 * The value for {@link #bbar} to create the Save button.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.SAVE = "SAVE";

/**
 * The value for {@link #bbar} to create the Reset button.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.RESET = "RESET";

/**
 * The value for {@link #bbarWest} to create the Edit Image button. The button
 * is available for GIF, PNG and JPEG images only.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.EDIT_IMAGE = "EDIT_IMAGE";

/**
 * The value for {@link #bbarWest} to create the refresh button.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.REFRESH_INFO = "REFRESH_INFO";

/**
 * The value for {@link #tabs} to create the Sub Assets tab.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.SUBASSETS = "SUBASSETS";

/**
 * The value for {@link #tabs} to create the Renditions tab.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.RENDITIONS = "RENDITIONS";

/**
 * The value for {@link #tabs} to create the Versions tab.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.VERSIONS = "VERSIONS";

/**
 * The value for {@link #tabs} to create the References tab.
 * @static
 * @final
 * @type String
 */
CQ.dam.AssetEditor.REFERENCES = "REFERENCES";
CQ.dam.HealthChecker = CQ.Ext.extend(CQ.Ext.Viewport, {
    store: null,
    
    selModel: null,
    
    checkParam: "assets",

    constructor: function(config) {
        var checker = this;
    
        var columns = new CQ.Ext.grid.ColumnModel([
            new CQ.Ext.grid.RowNumberer(),
            {
                "header": CQ.I18n.getMessage("Type"),
                "dataIndex": "type",
                "width": 50,
                "renderer": function(value) {
                    if(value == "asset") {
                        return checker.checkParam == "assets" ? CQ.I18n.getMessage("Binary") : CQ.I18n.getMessage("Asset");
                    } else {
                        return CQ.I18n.getMessage("Folder");
                    }
                }
            },{
                "header": CQ.I18n.getMessage("Path"),
                "dataIndex": "path",
                "width": 250
            },{
                "header": CQ.I18n.getMessage("Status"),
                "dataIndex": "status",
                "width": 150,
                "renderer": function(value, metadata, record) {
                    var type = checker.checkParam == "assets" ? CQ.I18n.getMessage("Binary") : CQ.I18n.getMessage("Asset");
                    if(value == "missingInWorkflow") {
                        return CQ.I18n.getMessage("Asset is missing, but processed by workflow already");
                    } else if(record.get("type")== "asset") {
                        if(checker.checkParam == "assets") {
                            return CQ.I18n.getMessage("Asset is missing");
                        } else {
                            return CQ.I18n.getMessage("Binary is missing");
                        }
                    } else {
                        return CQ.I18n.getMessage("Folder is missing");
                    }
                }
            }
        ]);
    
        this.selModel = new CQ.Ext.grid.RowSelectionModel();
        
        this.store = new CQ.Ext.data.JsonStore({
            "proxy": new CQ.Ext.data.HttpProxy({
                "url": CQ.HTTP.externalize(CQ.dam.HealthChecker.HEALTH_CHECK_SERVLET),
                "method": "GET"
            }),
            "root": "assets",
            "fields": [{"name": "type"}, {"name": "path"}, {"name": "status"}],
            "listeners": {
                "load": function(store, records, options) {
                    if(store.getTotalCount() > 0) {
                        CQ.Ext.getCmp("cq-dam-healthchecker-sync").enable();
                        CQ.Ext.getCmp("cq-dam-healthchecker-delete").enable();
                    } else {
                        CQ.Ext.getCmp("cq-dam-healthchecker-sync").disable();
                        CQ.Ext.getCmp("cq-dam-healthchecker-delete"). disable();
                    }
                }
            }
        });

        CQ.dam.HealthChecker.superclass.constructor.call(this, {
            "id": "cq-dam-healthchecker",
            "layout": "border",
            "items": [{
                "id":"cq-dam-healthchecker-wrapper",
                "xtype":"panel",
                "region":"center",
                "layout":"border",
                "border":false,
                "items": [{
                    "id":"cq-header",
                    "xtype":"container",
                    "cls": "cq-damadmin-header",
                    "autoEl":"div",
                    "region":"north"
                },{
                    "xtype": "grid",
                    "id": "cq-dam-healthchecker-grid",
                    "region": "center",
                    "margins": "5 5 5 5",
                    "border": true,
                    "loadMask": true,
                    "stripeRows": true,
                    "colModel": columns,
                    "selModel": this.selModel,
                    "store": this.store,
                    "viewConfig": {
                        "forceFit": true
                    },
                    "tbar": [{
                        "text":    CQ.I18n.getMessage("Check Assets"),
                        "handler": this.performCheck.createDelegate(this, ["assets"])
                    },{
                        "text":    CQ.I18n.getMessage("Check Binaries"),
                        "handler": this.performCheck.createDelegate(this, ["binaries"])
                    },{
                        "xtype": "tbseparator"
                    },{
                        "id": "cq-dam-healthchecker-sync",
                        "text":    CQ.I18n.getMessage("Synchronize"),
                        "handler": this.performAction.createDelegate(this, ["sync"]),
                        "disabled": true
                    },{
                        "id": "cq-dam-healthchecker-delete",
                        "text":    CQ.I18n.getMessage("Delete"),
                        "handler": this.performAction.createDelegate(this, ["delete"]),
                        "disabled": true
                    },{
                        "xtype": "tbspacer",
                        "width": 50
                    }]
                }]
            }]
        });
    },
    
    performCheck: function(check) {
        this.store.load({
            "params": {
                "check": check
            }
        });
        this.checkParam = check;
    },
    
    performAction: function(action) {
        var grid = CQ.Ext.getCmp("cq-dam-healthchecker-grid");
        grid.loadMask.show();

        CQ.Ext.Ajax.request({
            "url": CQ.HTTP.externalize(CQ.dam.HealthChecker.HEALTH_CHECK_SERVLET),
            "params": {
                "check": this.checkParam,
                "action": action
            },
            "method": "POST",
            "success": function(response, options) {
                this.store.load({
                    "params": {
                        "check": this.checkParam
                    }
                });
            },
            "failure": function(response, options) {
                grid.loadMask.hide();
                CQ.Notification.notifyFromResponse(result);
            },
            "scope": this
        });
    }
});

CQ.dam.HealthChecker.HEALTH_CHECK_SERVLET = "/libs/dam/health_check.json";

CQ.Ext.reg("healthchecker", CQ.dam.HealthChecker);
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
 * @class CQ.dam.form.Metadata
 * @extends CQ.form.CompositeField
 * @since 5.3
 * <p>Metadata provides a set of fields to easily create a metadata field for the
 * Asset Editor.</p>
 * <p>It provides the following fields:</p><ul>
 * <li>Field Label<br>
 * The label displayed in the form</li>
 * <li>Namespace<br>
 * The namespaces part of the metadata name. The options are provided by /libs/dam/options/metadata and can be
 * overlayed in /apps/dam/options/metadata.</li>
 * <li>Local Part<br>
 * The local part of the metadata name. The options depend on the selected namespace and are provided by
 * the options (see namespace).</li>
 * <li>Qualified Name<br>
 * A read-only field that displays final metadata name.</li>
 * <li>Type<br>
 * The type of the metadata. The value depends on the selected local part and is provided by the options (see namespace).</li>
 * <li>Multi Value<br>
 * A checkbox to define if the metadata is a multi value propterty. The value depends on the selected local part and is
 * provided by the options (see namespace).</li>
 * @constructor
 * Creates a new Metadata.
 * @param {Object} config The config object
 */
CQ.dam.form.Metadata = CQ.Ext.extend(CQ.form.CompositeField, {

    /**
     * @cfg {String} labelParameter
     * Name of the field label property (defaults to "label").
     */
    labelParameter: "label",

    /**
     * @cfg {String} namespaceParameter
     * Name of the namespace property (defaults to "namespace").
     */
    namespaceParameter: "namespace",

    /**
     * @cfg {String} localPartParameter
     * Name of the local part property (defaults to "localPart").
     */
    localPartParameter: "localPart",

    /**
     * @cfg {String} qualifiedNameParameter
     * Name of the qualified name property (defaults to "qualifiedName").
     */
    qualifiedNameParameter: "qualifiedName",

    /**
     * @cfg {String} typeParameter
     * Name of the type property (defaults to "type").
     */
    typeParameter: "type",

    /**
     * @cfg {String} multivalueParameter
     * Name of the type property (defaults to "multivalue").
     */
    multivalueParameter: "multivalue",

    /**
     * @cfg {String} defaultNamespace
     * The default value of the namespace field (defaults to "dc" - Dublin Core).
     */
    defaultNamespace: "dc",

    /**
     * @cfg {String} defaultType
     * The default value of the type field (defaults to "String").
     */
    defaultType: "String",

    /**
     * @cfg {String} addFieldsToParent
     * Indicates if the fields should be added to the parent panel which
     * in dialog is the tab panel (defaults to true).
     */
    addFieldsToParent: true,

    /**
     * @cfg {String} url
     * <p>The URL where the options are requested from
     * (defaults to "/libs/dam/options/metadata.overlay.2.json").</p>
     * <p>Expected format:
     * <pre><code>
     * {
     *      ns1: {
     *          "jcr:title": "Namespace 1",
     *          "lp1": {
     *              "jcr:title": Local Part 1",
     *              "type": "String",
     *              "multivalue": false
     *          }
     * }
       </code></pre></p>
     */
    options: null,

    /**
     * @cfg {String} constraintFieldName
     * Name of the constraint field in the dialog. Defaults to "./constraintType".
     */
    constraintFieldName: "./constraintType",

    /**
     * @cfg {Object} constraintsMap
     * A map containing the constraints for certain metadata types. The key is
     * the type of the metadata. Defaults to:
     * <pre><code>
     * {
     *    "Date": "foundation/components/form/constraints/date",
     *    "Long": "foundation/components/form/constraints/numeric"
     * }
       </code></pre></p>
     */
    constraintsMap: {
        "Date": "foundation/components/form/constraints/date",
        "Long": "foundation/components/form/constraints/numeric"
    },

    // overriding CQ.form.CompositeField#processRecord
    processRecord: function(record, path) {
        if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
            var v = record.get(this.getName());

            if (v == undefined) {
                if (this.defaultNamespace) {
                    this.namespaceField.setValue(this.defaultNamespace);
                    this.localPartField.setOptions(this.getLocalPartOptions(this.defaultNamespace));
                    this.setType(this.defaultType);
                }
            }
            else {
                this.labelField.setValue(v.label);
                this.namespaceField.setValue(v.namespace);
                this.localPartField.setOptions(this.getLocalPartOptions(v.namespace));
                this.localPartField.setValue(v.localPart);
                this.setType(v.type);
                this.multivalueField.setValue(v.multivalue);
                this.setQualified();
            }


//            if (v == undefined && this.defaultValue != null) {
//                this.setValue(this.defaultValue);
//            }
//            else {
//                this.setValue(v);
//            }
            this.fireEvent('loadcontent', this, record, path);
        }
    },

    initComponent: function() {
        CQ.dam.form.Metadata.superclass.initComponent.call(this);
        this.localPartOptions = {};
        var nsOptions = [];
        if (typeof this.options == "string") {
            try {
                this.options = CQ.HTTP.eval(this.options);
                var regNs = CQ.HTTP.eval("/libs/dam/namespaces.json");
                this.regNamespaces = regNs.namespaces;
                for (var name in this.options) {
                    if (typeof this.options[name] == "object") {
                        //todo: check for metadata nodetype?
                        // ns is a namespace (otherwise property like jcr:title)
                        var title = this.options[name]["jcr:title"];
                        if (this.regNamespaces.indexOf(name) != -1) {
                            nsOptions.push({
                                "value": name,
                                "qtip": title ? title : ""
                            });
                        }
                    }
                }
            }
            catch (e) {
                CQ.Log.warn("CQ.WCM#getDialogConfig failed: " + e.message);
                this.options = {};
            }
        }
        else {
            //todo: cfg options as array resp. object?
        }

        var m = this;

        this.labelField = new CQ.Ext.form.TextField({
            "fieldLabel": "Field Label",
            "name": this.name + "/" + this.labelParameter,
            "ignoreData": true,
            "fieldDescription": CQ.I18n.getMessage("Leave empty to use the local part", [], "sample: 'dc:title' - 'dc' is the namespace, 'title' the localpart")
        });

        nsOptions.sort();
        nsOptions.sort(function(a, b) {
            var va = a.value.toLowerCase();
            var vb = b.value.toLowerCase();
            if (va < vb) {
                return -1;
            } else if (va == vb) {
                return 0;
            } else {
                return 1;
            }
        });

        this.namespaceField = new CQ.form.Selection({
            "fieldLabel": "Namespace",
            "name": this.name + "/" + this.namespaceParameter,
            "type": "select",
            "ignoreData": true,
            "options": nsOptions,
            "listeners": {
                "selectionchanged": {
                    "fn": m.changeNamespace,
                    "scope": m
                }
            }
        });

        this.localPartField = new CQ.form.Selection({
            "fieldLabel": "Local Part",
            "name": this.name + "/" + this.localPartParameter,
            "type": "combobox",
            "fieldDescription": CQ.I18n.getMessage("Select a namespace first to receive the accordant local parts" , [], "two select boxes; after selecting a namespace all possible local parts are loaded into the second select box"),
            "ignoreData": true,
            "allowBlank": false,
            "vtype": this.vtype,
            "listeners": {
                "selectionchanged": {
                    "fn": m.changeLocalPart,
                    "scope": m
                }
            }
        });

        this.qualifiedField = new CQ.Ext.form.TextField({
            "fieldLabel": "Qualified Name",
            "readOnly": true,
            "fieldDescription": CQ.I18n.getMessage("Generated from namespace and local part", [], "sample: 'dc:title' - 'dc' is the namespace, 'title' the localpart"),
            "ignoreData": true
        });

        this.typeField = new CQ.form.Selection({
            "fieldLabel": "Type",
            "name": this.name + "/" + this.typeParameter,
            "type": "select",
            "ignoreData": true,
            "options": [{
                    "value": "String",
                    "text": "String"
                },{
                    "value": "Long",
                    "text": "Number"
                },{
                    "value": "Date",
                    "text": "Date"
                },{
                    "value": "Boolean",
                    "text": "Boolean"
                }
            ],
            "listeners": {
                "selectionchanged": function() {
                    m.setConstraint(this.getValue());
                }
            }
        });

        this.multivalueField = new CQ.form.Selection({
            "fieldLabel": "",
            "name": this.name + "/" + this.multivalueParameter,
            "type": "checkbox",
            "ignoreData": true,
            "inputValue": "true",
            "boxLabel": CQ.I18n.getMessage("Property is multi value")
        });

    },

    // private
    afterRender : function(){
        CQ.dam.form.Metadata.superclass.afterRender.call(this);

        // add fields to the tab panel (layout issue)
        var panel = this.addFieldsToParent ? this.findParentByType("panel") : this;
        if (!panel) panel = this;
        panel.add(this.labelField);
        panel.add(this.namespaceField);
        panel.add(this.localPartField);
        panel.add(this.qualifiedField);
        panel.add(this.typeField);
        panel.add(this.multivalueField);
    },

    /**
     * Returns the selected namespace.
     * @type {String}
     */
    getNamespace: function() {
        return this.namespaceField.getValue();
    },

    /**
     * Returns the selected local part.
     * @type {String}
     */
    getLocalPart: function() {
        return this.localPartField.getValue();
    },

    /**
     * Returns the local parts of the specified namespace as options.
     * @param {String} namespace The name of the namespace
     * @private
     */
    getLocalPartOptions: function(namespace) {
        var o = [];
        if (this.localPartOptions[namespace]) {
            return this.localPartOptions[namespace];
        }
        else {
            var ns = this.options[namespace];
            if (ns) {
                for (var name in ns) {
                    if (typeof ns[name] == "object") {
                        //todo: check for metadata nodetype?
                        // lp is a local part (otherwise property like jcr:title)
                        var title = ns[name]["jcr:title"];
                        o.push({
                            "value": name,
                            "qtip": title ? title : ""
                        });
                    }
                }
                o.sort(function(a, b) {
                    var va = a.value.toLowerCase();
                    var vb = b.value.toLowerCase();
                    if (va < vb) {
                        return -1;
                    } else if (va == vb) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
                this.localPartOptions[namespace] = o;
            }
        }
        return o;
    },

    /**
     * @private
     */
    changeNamespace: function() {
        var o = this.getLocalPartOptions(this.getNamespace());
        this.localPartField.setOptions(o);
        this.setQualified();
    },

    /**
     * @private
     */
    changeLocalPart: function() {
        this.setQualified();
        try {
            var lp = this.options[this.getNamespace()][this.getLocalPart()];
            this.setType(lp["type"]);
            this.multivalueField.setValue(lp["multivalue"]);
        }
        catch (e) {
            // no accordant local part definition
        }
    },

    /**
     * Sets the qualified name by combining namespace and local part.
     * @private
     */
    setQualified: function() {
        var ns = this.getNamespace();
        var lp = this.getLocalPart();
        var value = "";
        if (lp) {
            if (ns) value = ns + ":" + lp;
            else value = lp;
        }
        //todo:escape name
        this.qualifiedField.setValue(value);
    },

    /**
     * Sets the value of the type field and the constraint field.
     * @private
     */
    setType: function(v) {
        this.typeField.setValue(v);
        this.setConstraint(v);
    },

    /**
     * Tries to find and set the constraint field according to the given type.
     * @private
     */
    setConstraint: function(type) {
        if (!this.constraintField) {
            try {
                var dialog = this.findParentByType("dialog");
                this.constraintField = dialog.getField(this.constraintFieldName);
            }
            catch (e) {
                // create dummy field
                this.constraintField = {
                    setValue: function() {}
                };
            }
        }
        if (this.constraintsMap[type]) {
            this.constraintField.setValue(this.constraintsMap[type]);
        }
        else {
            // clear constraint
            this.constraintField.setValue("");
        }
    },

    constructor : function(config) {
        this.hiddenField = new CQ.Ext.form.Hidden({
           "name": config.name
        });

        CQ.Ext.applyIf(config, {
            "options": "/libs/dam/options/metadata.overlay.2.json",
            "border": false,
            "hideLabel": true
        });


        CQ.dam.form.Metadata.superclass.constructor.call(this, config);
    }

});

CQ.Ext.reg("metadata", CQ.dam.form.Metadata);
