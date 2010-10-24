/// <reference path="chrome-api-vsdoc.js" />
/// <reference path="jquery-1.4.2.js" />
/// <reference path="mailaccount.class.js" />

/* Extensions to the local storage class for object storage */
Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function (key) {
    return this.getItem(key) && JSON.parse(this.getItem(key));
}

function sortlist(lb) {
    var arrTexts = new Array();
    for (i = 0; i < lb.length; i++) {
        arrTexts[i] = lb.options[i].text + ':' + lb.options[i].value + ':' + lb.options[i].selected;
    }
    arrTexts.sort(charOrdA);
    for (i = 0; i < lb.length; i++) {
        var el = arrTexts[i].split(':');
        lb.options[i].text = el[0];
        lb.options[i].value = el[1];
        lb.options[i].selected = (el[2] == "true") ? true : false;
    }
}

function charOrdA(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
}

// Saves options to localStorage.
var boolIdArray = new Array("hide_count",
                            "check_all",
                            "check_priority",
//"force_ssl",
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
        localStorage["gc_" + id] = value;

        console.log("saved: " + id + " as " + value);
    }

    var iconRadios = document.forms[0].icon_set;
    for (var i in iconRadios) {
        if (iconRadios[i].checked) {
            localStorage["gc_icon_set"] = iconRadios[i].value;
            break;
        }
    }

    var previewRadios = document.forms[0].preview_setting;
    for (var i in previewRadios) {
        if (previewRadios[i].checked) {
            localStorage["gc_preview_setting"] = previewRadios[i].value;
            break;
        }
    }

    delete localStorage["gc_poll"];
    delete localStorage["gc_accounts"];

    localStorage["gc_poll"] = parseInt(document.getElementById("poll").value);
    localStorage["gc_language"] = document.getElementById("languages").value;

    if (accounts.length > 0) {
        localStorage.setObject("gc_accounts", accounts);
    }

    var backgroundPage = chrome.extension.getBackgroundPage();
    backgroundPage.init();
}

// Restores input states to saved values from localStorage.
function restore_options() {
    showContent(0);

    for (var i in boolIdArray) {
        var id = boolIdArray[i];
        var value = localStorage["gc_" + id];

        if (value == "true") {
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

    var iconRadios = document.forms[0].icon_set;
    var iconFound = false;
    for (var i in iconRadios) {
        if (iconRadios[i].value == localStorage["gc_icon_set"]) {
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
        if (previewRadios[i].value == localStorage["gc_preview_setting"]) {
            previewRadios[i].checked = true;
            break;
        }
    }

    if (localStorage["gc_poll"] != null) {
        document.getElementById("poll_" + localStorage["gc_poll"]).selected = true;
    }

    accounts = localStorage.getObject("gc_accounts");
    if (accounts == null) {
        accounts = new Array();
    }

    var langSel = document.getElementById("languages");
    for (var i in languages) {
        langSel.add(new Option(languages[i].what, languages[i].id), languages[i].id);
    }
    langSel.value = localStorage["gc_language"];

    sortlist(langSel);

    var acc_sel = document.getElementById("accounts");
    for (var i in accounts) {
        if (accounts[i] == null || accounts[i].domain == null)
            break;
        acc_sel.add(new Option(accounts[i].domain), null);
    }

    //chrome.extension.getBackgroundPage().getLabels("https://mail.google.com/mail/", loadLabels);
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