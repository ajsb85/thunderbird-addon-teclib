/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var teclibImapISPMessenger = {
	pref: Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch),
	localeBundle: null,
	localeSwitching: false,

	notifyteclibIMAPAccountSetuped: function(server, identity, useSpam) {
		this.localeBundle = document.getElementById("teclibImapISPBundle");
		var folderSetupper = new teclibImapIspFolderSetupper(server, identity, useSpam, this);
		folderSetupper.registerToFolderListener();
		if (!folderSetupper.loginToteclibIMAPServer()) {
			alert(this.localeBundle.getString("teclibimapisp.folderSetFailed"));
		}

	  //pref.setIntPref("browser.cache.memory.capacity", 31457280);
	  this.pref.setIntPref("browser.cache.memory.capacity", 30720);
	  //pref.setBoolPref("mail.server.default.fetch_by_chunks", false);
	},

	notifyFolderSetupDone: function(succeed) {
		if (succeed) this.restartTB();
	},

	restartTB: function()	{
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		var buttonPressed = promptService.confirmEx(window,
              this.localeBundle.getString("teclibimapisp.restartTitle"),
              this.localeBundle.getString("teclibimapisp.restartMsg"),
              (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0) +
              (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1),
              this.localeBundle.getString("teclibimapisp.restartButton0"),
              this.localeBundle.getString("teclibimapisp.restartButton1"),
              null,
              null, {});
		if (buttonPressed != 0) return;
		var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
		appStartup.quit(appStartup.eAttemptQuit | appStartup.eRestart);
	},

	/*
	 * This function is invoked by the event listener.
	 */
	setupteclibIMAPStarredFolder: function(aEvent) {
		if (!aEvent) return;
		var document = aEvent.originalTarget;
		if (document.location && document.location.protocol == "chrome:") {
			var folderTree = document.getElementById("folderTree");
			if (!folderTree) return;

			var ds = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].
    										  createInstance(Components.interfaces.nsIRDFDataSource);
			var styleURI = "http://home.netscape.com/NC-rdf#Style";
			var styleProperty = RDF.GetResource(styleURI);
	  	var specialFolderProperty = RDF.GetResource("http://home.netscape.com/NC-rdf#SpecialFolder");
			var prefService = Components.classes["@mozilla.org/preferences-service;1"];
			prefService = prefService.getService();
			prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
			var pref = prefService.getBranch(null);

			var am = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
			var accounts = am.accounts;
			var accountsCount = accounts.Count();

			for (var i = 0; i < accountsCount; i++) {
				var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
				var server = account.incomingServer;
				if (!server) continue;
				var key = server.key;
				var uri = null;

				try {
					uri = pref.getCharPref("mail.server."+key+".teclibimap_starred");
				} catch(e) {
					uri = null;
				}
				if (uri) {
					ds.Assert(RDF.GetResource(uri), styleProperty, RDF.GetLiteral("gimap-starred"), true);
				}

				uri = null;
				try {
					uri = pref.getCharPref("mail.server."+key+".teclibimap_trash");
					server.QueryInterface(Components.interfaces.nsIImapIncomingServer);
					if (uri && server.deleteModel == 0) {
						ds.Assert(RDF.GetResource(uri), specialFolderProperty, RDF.GetLiteral("Trash"), true);
					}
				} catch(e) {
				}
			}

	  	folderTree.database.AddDataSource(ds);

			var bindings = folderTree.firstChild.firstChild.firstChild.nextSibling;
			var bind = bindings.appendChild(document.createElement("binding"));
	 		bind.setAttribute("subject", "?member");
	 		bind.setAttribute("predicate", styleURI);
	 		bind.setAttribute("object", "?style");

		 	var cell = document.getElementById("folderNameCell");
		  cell.setAttribute("properties", cell.getAttribute("properties") + " style-?style");

		  var cacheSize = -1;
		  try {
		  	cacheSize = pref.getIntPref("browser.cache.memory.capacity");
		  } catch(e) {
		  	cacheSize = -1;
		  }

		  /* Set browser.cache.memory.capacity
		   * Tthe value has changed to 30720.
		   * If old value, 31457280, is used, it is automatically changed.
		   */
		  var stat = 0;
	 	  try {
		  	stat = pref.getIntPref("teclibimapisp.mig_stat");
		  } catch(e) {
		  	stat = 0;
		  }

		  if (stat == 0) pref.setIntPref("teclibimapisp.mig_stat", 1);
		  if (stat != 1 && (cacheSize == -1 || cacheSize == 31457280)) pref.setIntPref("browser.cache.memory.capacity", 30720);

		  var wizFunc = function() {
				try {
					var switchLocale = pref.getBoolPref("teclibimapisp.switch_locale");
					pref.clearUserPref("teclibimapisp.switch_locale");
					if (switchLocale) {
						setTimeout(MsgAccountWizard, 100);
						window.addEventListener("unload",teclibImapISPMessenger.finalize,false);
					}
				} catch(e) {
				}
			}
			setTimeout(wizFunc, 1000);
		}
	},

	finalize: function() {
		var prefService = Components.classes["@mozilla.org/preferences-service;1"];
		prefService = prefService.getService();
		prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
		var pref = prefService.getBranch(null);

		try {
			var switching = pref.getBoolPref("teclibimapisp.switch_locale");
			if (switching) return;
		} catch(e) {
		}

		try {
			var orgLocale = pref.getCharPref("teclibimapisp.temp_state");
			if (orgLocale) {
				pref.setCharPref("general.useragent.locale", orgLocale);
				pref.clearUserPref("teclibimapisp.temp_state");
			}
		} catch(e) {
		}
	}
}

window.addEventListener("load",teclibImapISPMessenger.setupteclibIMAPStarredFolder,true);

//Folder setupper
function teclibImapIspFolderSetupper(server, identity, useSpam, owner)
{
	this.server = server;
	this.identity = identity;
	this.useSpam = useSpam;
	this.owner = owner;
	this.pref = Components.classes['@mozilla.org/preferences;1'].
								getService(Components.interfaces.nsIPrefBranch);
	this.localeBundle = document.getElementById("teclibImapISPBundle");
	this.draftName = this.localeBundle.getString("teclibimapisp.draftFolder");
	this.fccName = this.localeBundle.getString("teclibimapisp.fccFolder");
	this.spamName = this.localeBundle.getString("teclibimapisp.spamFolder");
	this.starredName = this.localeBundle.getString("teclibimapisp.starredFolder");
	this.trashName = null;

	this.setDraft = false;
	this.setFcc = false;
	this.setSpam = false;
	this.setStarred = false;
	this.setTrash = false;
}

teclibImapIspFolderSetupper.prototype.registerToFolderListener = function()
{
	Components.classes["@mozilla.org/messenger/services/session;1"].
		getService(Components.interfaces.nsIMsgMailSession).
		AddFolderListener(this, Components.interfaces.nsIFolderListener.event);
}

teclibImapIspFolderSetupper.prototype.isSetupDone = function()
{
	return this.setDraft &&
				 this.setFcc &&
				 this.setSpam &&
				 this.setStarred &&
				 this.setTrash;
}

//inherit from folder listener
teclibImapIspFolderSetupper.prototype.OnItemAdded = function(parentItem, item, view) {
}
teclibImapIspFolderSetupper.prototype.OnItemRemoved = function(parentItem, item, view) {
}
teclibImapIspFolderSetupper.prototype.OnItemPropertyChanged = function(item, property, oldValue, newValue) {
}
teclibImapIspFolderSetupper.prototype.OnItemIntPropertyChanged = function(item, property, oldValue, newValue) {
}
teclibImapIspFolderSetupper.prototype.OnItemBoolPropertyChanged = function(item, property, oldValue, newValue) {
}
teclibImapIspFolderSetupper.prototype.OnItemUnicharPropertyChanged = function(item, property, oldValue, newValue){
}
teclibImapIspFolderSetupper.prototype.OnItemPropertyFlagChanged = function(item, property, oldFlag, newFlag) {
}

teclibImapIspFolderSetupper.prototype.OnItemEvent = function(folder, event)
{
	if (folder.server != this.server.QueryInterface(Components.interfaces.nsIMsgIncomingServer)) return;

	var eventType = event.toString();
 	if (eventType != "FolderCreateCompleted") return;
	var msgFolder = folder.QueryInterface(Components.interfaces.nsIMsgFolder);
	var parentFolder = msgFolder.parent;
	if (!parentFolder) return;

	//teclib' folder for UK and Germany is [teclib' Mail]
	if (parentFolder.isServer) {
		var key = this.server.key;
		if (!this.trashName) this.trashName = nsPreferences.copyUnicharPref("mail.server."+key+".trash_folder_name","");
		//server = server.QueryInterface(Components.interfaces.nsIImapIncomingServer);
		if (!this.trashName) this.trashName = this.server.trashFolderName;

		var msgFolderName = msgFolder.name;
		if (msgFolderName == "[teclib']" || msgFolderName == "[teclib' Mail]") {
			var teclibFolderName = this.draftName.split("/").shift();
			if (teclibFolderName != msgFolderName) {
				this.draftName = this.draftName.replace(teclibFolderName,msgFolderName);
				this.fccName = this.fccName.replace(teclibFolderName,msgFolderName);
				this.spamName = this.spamName.replace(teclibFolderName,msgFolderName);
				this.starredName = this.starredName.replace(teclibFolderName,msgFolderName);
    		this.trashName = this.trashName.replace(teclibFolderName,msgFolderName);
				nsPreferences.setUnicharPref("mail.server."+key+".trash_folder_name",this.trashName);
			}
			//server.setCharAttribute("trashFolderName",trashName);
		}
		return;
	}

	var folderName = msgFolder.parent.name + "/" +msgFolder.name;
	if (folderName == this.draftName) {
		dump("set draft\n");
		this.identity.draftFolder = msgFolder.URI;
		this.identity.draftsFolderPickerMode = 1;
		this.setDraft = true;
	} else if (folderName == this.fccName) {
		dump("set fcc\n");
		this.identity.fccFolder = msgFolder.URI;
		this.identity.fccFolderPickerMode = 1;
		this.setFcc = true;
	} else if (folderName == this.spamName) {
		dump("set spam\n");
 		var key = this.server.key;
 		var setting = this.server.spamSettings;

 		pref.setCharPref("mail.server."+key+".spamActionTargetAccount",this.server.serverURI);
		//setting.actionTargetAccount = server.serverURI;
	  pref.setCharPref("mail.server."+key+".spamActionTargetFolder",msgFolder.URI);
	  //setting.actionTargetFolder = uri;
	  pref.setIntPref("mail.server."+key+".moveTargetMode",1);
	  //setting.moveTargetMode = 1;
	  pref.setBoolPref("mail.server."+key+".moveOnSpam",true);
	  //setting.moveOnSpam = true;
		pref.setBoolPref("mail.server."+key+".purgeSpam",false);
	  //setting.purge = false;
		if (this.useSpam) pref.setIntPref("mail.server."+key+".spamLevel",100);
		else this.pref.setIntPref("mail.server."+key+".spamLevel",0);
    setting.initialize(this.server);
		this.setSpam = true;
	} else if (folderName == this.starredName) {
		dump("set starred\n");
		var key = this.server.key;
		var uri = msgFolder.URI;
		this.pref.setCharPref("mail.server."+key+".teclibimap_starred", uri);
		this.setStarred = true;
	} else if (folderName == this.trashName) {
		dump("set trash\n");
 		var key = this.server.key;
		this.pref.setCharPref("mail.server."+key+".teclibimap_trash",msgFolder.URI);
		this.setTrash = true;
	}

	if (this.isSetupDone()) {
		dump("remove listener\n");
     		Components.classes["@mozilla.org/messenger/services/session;1"]
         			.getService(Components.interfaces.nsIMsgMailSession)
   	    			.RemoveFolderListener(this);
	}
}

teclibImapIspFolderSetupper.prototype.loginToteclibIMAPServer = function()
{
	//var inboxFolder = server.rootFolder;
	var inboxFolder = GetInboxFolder(this.server);
	if (!inboxFolder) return false;

	//if (!inboxFolder) inboxFolder = server.rootFolder;

	//get new messages to login and search all folders
	this.server.getNewMessages(inboxFolder, msgWindow, this);
	return true;
}

//inherit from URL Listener
teclibImapIspFolderSetupper.prototype.OnStartRunningUrl = function(url) {
}

teclibImapIspFolderSetupper.prototype.OnStopRunningUrl = function(url,exitCode) {
	var stat = false;
	if (!this.isSetupDone()) {
		alert(this.localeBundle.getString("teclibimapisp.folderSetFailed"));
		dump("remove listener\n");
	  Components.classes["@mozilla.org/messenger/services/session;1"]
        			.getService(Components.interfaces.nsIMsgMailSession)
   	    			.RemoveFolderListener(this);
   	 stat = false;
	} else {
		stat = true;
	}

	var owner = this.owner;
	var func = function() {
		owner.notifyFolderSetupDone(stat);
	}
	setTimeout(func,1000);
}
