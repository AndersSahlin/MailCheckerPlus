/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="jquery-1.4.2.js" />
/// <reference path="mailaccount.class.js" />
/// <reference path="utility.js" />
/// <reference path="settings.js" />

var backgroundPage = chrome.extension.getBackgroundPage();
var Settings = backgroundPage.getSettings();

$(restore_options);

var boolIdArray = new Array("hide_count",
                            "showfull_read",
                            "check_gmail_off",
                            "open_tabs",
                            "archive_read",
                            "no_mailto",
                            "sound_off",
                            "animate_off", 
                            "show_notification");
var accounts;

function save_options() {
   for (var i in boolIdArray) {
      var id = boolIdArray[i];
      var element = document.getElementById(id);
      var value = element.checked;
      Settings.store(id, value);

      console.log("saved: " + id + " as " + value);
   }

   var iconRadios = document.forms[0].icon_set;
   for (var i in iconRadios) {
      if (iconRadios[i].checked) {
         Settings.store("icon_set", iconRadios[i].value);
         break;
      }
   }

   var previewRadios = document.forms[0].preview_setting;
   for (var i in previewRadios) {
      if (previewRadios[i].checked) {
         Settings.store("preview_setting", Number(previewRadios[i].value));
         break;
      }
   }

   Settings.store("poll", parseInt(document.getElementById("poll").value));
   Settings.store("dn_timeout", parseInt(document.getElementById("dn_timeout").value));
   Settings.store("language", document.getElementById("languages").value);
   Settings.store("check_label", document.getElementById("check_label").value);
   Settings.store("open_label", document.getElementById("open_label").value);

   Settings.store("accounts", accounts);

   Settings.store("sn_audio", document.getElementById("sn_audio").value);
   if (Settings.read("sn_audio") == "custom") {
	   try {
	      Settings.store("sn_audio_raw", document.getElementById("sn_audio_enc").value);
	   } catch (e) {
	      console.error(e);
		   alert("Could not save notification sound in storage. Please select a smaller audio file!");   
	   }
   } else {
      Settings.store("sn_audio_raw", null);
   }

   backgroundPage.reloadSettings();
}

// Restores input states to saved values from stored settings.
function restore_options() {
   showContent(0);

   for (var i in boolIdArray) {
      var id = boolIdArray[i];
      var value = Settings.read(id);

      if (value === true) {
         var element = document.getElementById(id);
         element.checked = true;
      }

      console.log("restored: " + id + " as " + value);
   }

   spawnIconRow("set1", "Default");
   spawnIconRow("set2", "Default Grey");
   spawnIconRow("set3", "Default White");
   spawnIconRow("set11", "Native");
   spawnIconRow("set12", "Native Grey");
   spawnIconRow("set8", "Gmail Glossy");
   spawnIconRow("set9", "Gmail Mini");
   spawnIconRow("set10", "Gmail Monochrome");
   spawnIconRow("set4", "Alternative 1");
   spawnIconRow("set5", "Alternative 2");
   spawnIconRow("set6", "Chromified Classic");
   spawnIconRow("set7", "Chromified Grey");
   spawnIconRow("set13", "OSX");

   var iconRadios = document.forms[0].icon_set;
   var iconFound = false;
   for (var i in iconRadios) {
      if (iconRadios[i].value == Settings.read("icon_set")) {
         iconRadios[i].checked = true;
         iconFound = true;
         break;
      }
   }
   if (!iconFound) {
      iconRadios[0].checked = true;
   }

   var previewRadios = document.forms[0].preview_setting;
   for (var i in previewRadios) {
      if (previewRadios[i].value == Number(Settings.read("preview_setting"))) {
         previewRadios[i].checked = true;
         break;
      }
   }

   document.getElementById("poll_" + Settings.read("poll")).selected = true;
   document.getElementById("dn_timeout_" + Settings.read("dn_timeout")).selected = true;
   document.getElementById("check_label_" + Settings.read("check_label")).selected = true;
   document.getElementById("open_label_" + Settings.read("open_label")).selected = true;

   accounts = Settings.read("accounts");
   if (accounts == null) {
      accounts = new Array();
   }

   var langSel = document.getElementById("languages");
   for (var i in languages) {
      langSel.add(new Option(languages[i].what, languages[i].id), languages[i].id);
   }
   langSel.value = Settings.read("language");
   sortlist(langSel);

   var acc_sel = document.getElementById("accounts");
   for (var i in accounts) {
      if (accounts[i] == null || accounts[i].domain == null)
         break;
      acc_sel.add(new Option(accounts[i].domain), null);
   }

   $('#sn_audio').val(Settings.read("sn_audio"));
   $('#sn_audio_enc').val(Settings.read("sn_audio_raw"));
   
   $('#sn_audio').change(function () {
      if (this.value == "custom") {
         $('#sn_audio_src').show();
      } else {
         $('#sn_audio_src').hide();
      }
   });

   if (Settings.read("sn_audio") != "custom") {
      $('#sn_audio_src').hide();
   }
}

function loadLabels(labels) {
    $(labels).each(function (i) {
        $("#labels")[0].add(new Option(labels[i]));
    });
}

function showContent(contentId) {
    $('.content').each(function (index) {
        if (!($(this).hasClass('invisible')))
            $(this).addClass('invisible');

        if (index == contentId)
            $(this).removeClass('invisible');
    });

    $('ul.menu > li > a').each(function (index) {
        $(this).removeClass('active');

        if (index == contentId)
            $(this).addClass('active');
    });
}

function spawnIconRow(value, description) {
    var selectionElement = document.getElementById("icon_selection");
    selectionElement.innerHTML += '<span><input type="radio" name="icon_set" value="' + value + '" id="icon_set' + value + '" /><label for="icon_set' + value + '"><img src="icons/' + value + '/not_logged_in.png" /><img src="icons/' + value + '/no_new.png" /><img src="icons/' + value + '/new.png" /> <small>' + description + '</small></span></label><br />';
}

function add_account() {
    var newacc_domain = prompt("Enter the domain name for your GAFYD account." +
        "\n\nDo not enter anything but the domain name!" +
        "\n\nIf your mail adress is <yourname@yourdomain.com>, simply enter \"yourdomain.com\""
        , "yourdomain.com");

    if (newacc_domain != null && newacc_domain != "" && newacc_domain != "yourdomain.com") {
        document.getElementById("check_gmail_off").checked = "true";
        accounts.push({ "domain": newacc_domain });

        var acc_sel = document.getElementById("accounts");
        acc_sel.add(new Option(newacc_domain), null);
        //acc_sel.size = accounts.length + 1;        
    }
}

function remove_account() {
    var acc_sel = document.getElementById("accounts");
    var acc_todel;

    if (acc_sel.selectedIndex > -1 && acc_sel.options[acc_sel.selectedIndex] != null) {
        acc_todel = acc_sel.options[acc_sel.selectedIndex];

        for (var i in accounts) {
            if (accounts[i].domain == acc_todel.text) {
                console.log("removing account: " + accounts[i].domain);
                accounts.splice(i, 1);
                break;
            }
        }
        acc_sel.remove(acc_sel.selectedIndex);
        //acc_sel.size = accounts.length + 1;
    }
}

function add_label() {
    var newlabel = prompt("Enter the name of the label." +
    "\n\nDo not enter anything but the label name!");

    if (newlabel != null && newlabel != "" && newlabel != "yourdomain.com") {
        //accounts.push({"label":newlabel}); 

        var labels_sel = document.getElementById("labels");
        labels_sel.add(new Option(newlabel), null);
        labels_sel.size = accounts.length + 1;
    }
}

function remove_label() {
    var labels_sel = document.getElementById("labels");
    var label_todel;

    if (labels_sel.selectedIndex > -1 && labels_sel.options[labels_sel.selectedIndex] != null) {
        label_todel = labels_sel.options[labels_sel.selectedIndex];

        for (var i in accounts) {
            if (accounts[i].domain == label_todel.text) {
                console.log("removing account: " + accounts[i].domain);
                accounts.splice(i, 1);
                break;
            }
        }
        labels_sel.remove(labels_sel.selectedIndex);
        labels_sel.size = accounts.length + 1;
    }
}

function requestUserPermission() {
    try {
        var checkboxUserPermission = document.getElementById('show_notification');
        if (checkboxUserPermission.checked) {
            if (checkUserPermission())
                return;

            if (typeof webkitNotifications != "undefined") {
                webkitNotifications.requestPermission(function () {
                    var permissionGranted = checkUserPermission();
                    checkboxUserPermission.checked = permissionGranted;
                });
            }
        }
    } catch (e) { checkboxUserPermission.checked = false; }
}

function checkUserPermission() {
    try {
        return (webkitNotifications.checkPermission() == 0);
    } catch (e) { return false; }
  }


function toggleCheckBox(checkboxId, checked) {
   if (checked) {
      document.getElementById(checkboxId).checked = !checked;
   }
}

function handleAudioFile(fileList) {
   var file = fileList[0];
   var fileReader = new FileReader();

   fileReader.onloadend = function () {
	   try {
		   localStorage["temp"] = this.result;
	   } catch(e) {
		   alert("The file you have chosen is too large, please select a shorter sound alert.");
		   return;
	   } finally {		   
		   localStorage["temp"] = null;
		   delete localStorage["temp"];
	   }		
	   
      $('#sn_audio_enc').val(this.result);
	   
	   
	  $('#submit').val('Save &amp; Reload');
	  $('#submit').removeAttr('disabled');
   }

   fileReader.onabort = fileReader.onerror = function () {
      switch (this.error.code) {
         case FileError.NOT_FOUND_ERR:
            alert("File not found!");
            break;
         case FileError.SECURITY_ERR:
            alert("Security error!");
            break;
         case FileError.NOT_READABLE_ERR:
            alert("File not readable!");
            break;
         case FileError.ENCODING_ERR:
            alert("Encoding error in file!");
            break;
         default:
            alert("An error occured while reading the file!");
            break;
      }
	  
	  $('#submit').val('Save &amp; Reload');
	  $('#submit').removeAttr('disabled');
   }

   $('#submit').val('Processing...');
   $('#submit').attr('disabled', 'disabled');
   
   fileReader.readAsDataURL(file);
}

function playNotificationSound() {
   var source;

   if (document.getElementById("sn_audio").value == "custom") {
      if (document.getElementById("sn_audio_enc").value) {
         source = document.getElementById("sn_audio_enc").value;
      } else {
         source = Settings.read("sn_audio_raw");
      }
   } else {
      source = document.getElementById("sn_audio").value;
   }

   try {
      var audioElement = new Audio();
      audioElement.src = source;
      audioElement.play();
   } catch (e) {
      console.error(e);
   }
}