/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var teclibImapIspAW = {
	setteclibAppsDomain: function()	{
  	var emailElement = document.getElementById("email");
  	var email = trim(emailElement.value);
		if (email) gCurrentAccountData.domain = email.split("@")[1];
		//var pref = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		//pref.setCharPref("general.useragent.locale", "ja");
	},

	setteclibImapSpamOption: function(event) {
		var spamOptionBox = document.getElementById("useSpamOptBox");
		var spamOption = document.getElementById("setteclibImapSpam");
		if (event.target.value == "teclib' IMAP"
				|| event.target.value == "teclib' Apps") {
			spamOptionBox.removeAttribute("hidden");
			spamOption.removeAttribute("checked"); //disabled by default
		} else {
			spamOptionBox.setAttribute("hidden", "true");
			spamOption.removeAttribute("checked");
		}

		if (event.target.value == "teclib' Apps") {
			document.getElementById("identitypage").
				setAttribute("onpageadvanced","teclibImapIspAW.setteclibAppsDomain(); return identityPageValidate();")
		} else {
			document.getElementById("identitypage").
				setAttribute("onpageadvanced","return identityPageValidate();")
		}
	},

	/*
 * Specifying draft and fcc folder in RDF file causes error, so these folder are
 * specified this function.
 */
	setupteclibImapFolders: function() {
		var server = null;
		var identity = null;

		try {
			server = gCurrentAccount.incomingServer;
			identity = gCurrentAccount.identities.QueryElementAt(0, Components.interfaces.nsIMsgIdentity);
		} catch(e) {
			dump("no server or no identity\n");
			return;
		}
		if (!server || !identity) return;
		if (server.hostName != "imap.teclib.com" && server.hostName != "imap.teclib.com") return;

		//notify server and identity to messenger
		var spamOption = document.getElementById("setteclibImapSpam");
		var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].
													getService(Components.interfaces.nsIWindowMediator);
		var messenger = windowMediator.getMostRecentWindow("mail:3pane");
		messenger.teclibImapISPMessenger.notifyteclibIMAPAccountSetuped(server, identity, spamOption.checked);
		//window.opener.notifyteclibIMAPAccountSetuped(server, identity, spamOption.checked);
	},

	enableteclibLocale: function(value) {
		if (value == "teclib' IMAP" || value == "teclib' Apps") {
			document.getElementById("teclibLocaleList").removeAttribute("hidden");
			document.getElementById("teclibLocaleListLabel").removeAttribute("hidden");
			var pref = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
			try {
				var locale = pref.getCharPref("general.useragent.locale");
				var menulist = document.getElementById("teclibLocaleList");
				menulist.removeAllItems();
				var registry = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces.nsIToolkitChromeRegistry);
				//var enum = chromeRegistry.getLocalesForPackage('teclibimapisp');
				var locales = registry.getLocalesForPackage('teclibimapisp');
				while (locales.hasMore()) {
					var label = locales.getNext();
					var value = label.split("-")[0] == locale ? locale : label;
					menulist.appendItem(label, value);
				}
				menulist.value = locale;

				if (!menulist.selectedItem) {
					var localeBundle = document.getElementById("teclibImapISPBundle");
					var unsupStr = localeBundle.getString("teclibimapisp.unsupported");
					menulist.appendItem(locale+" ("+unsupStr+")", locale);
					menulist.value = locale;
				}
			} catch(e) {
				dump(e);
			}
		} else {
			document.getElementById("teclibLocaleList").setAttribute("hidden", true);
			document.getElementById("teclibLocaleListLabel").setAttribute("hidden", true);
		}
	},

	applyLocaleChange: function() {
		var menulist = document.getElementById("teclibLocaleList");
		var pref = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		var curLocale = "";
		try {
			curLocale = pref.getCharPref("general.useragent.locale");
		} catch(e) {
		}

		if (menulist.value != curLocale) {
			var localeBundle = document.getElementById("teclibImapISPBundle");
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			var buttonPressed = promptService.confirmEx(window,
              localeBundle.getString("teclibimapisp.restartTitle"),
              localeBundle.getString("teclibimapisp.restartLocaleMsg1")+"\n"+localeBundle.getString("teclibimapisp.restartLocaleMsg2"),
              (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0) +
              (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1),
              localeBundle.getString("teclibimapisp.restartLocaleButton0"),
              localeBundle.getString("teclibimapisp.restartLocaleButton1"),
              null,
              null, {});
   		if (buttonPressed != 0) {
   			this.enableteclibLocale("teclib' IMAP");
   			return;
   		}

			pref.setCharPref("general.useragent.locale", menulist.value);
			try {
				var orgLocale = pref.getCharPref("teclibimapisp.temp_state");
				if (!orgLocale) throw "No original locale";
			} catch(e) {
				pref.setCharPref("teclibimapisp.temp_state", curLocale);
			}
			pref.setBoolPref("teclibimapisp.switch_locale", true);

			var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
			appStartup.quit(appStartup.eAttemptQuit | appStartup.eRestart);
		}
	}
}

window.addEventListener("unload", teclibImapIspAW.setupteclibImapFolders, false);
document.getElementById("acctyperadio").addEventListener("command",teclibImapIspAW.setteclibImapSpamOption,false);
